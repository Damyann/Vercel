import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getGoogleAuth } from '../lib/auth.js';
import { verifyToken } from '../lib/jwt.js';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔐 JWT проверка
  const token   = req.headers.authorization?.replace('Bearer ', '');
  const decoded = verifyToken(token);
  const userName = decoded?.user;
  if (!userName) {
    return res.status(401).json({ error: 'Невалиден или изтекъл токен' });
  }

  const { calendarSelections } = req.body;
  if (!calendarSelections) {
    return res.status(400).json({ error: 'Missing calendarSelections' });
  }

  try {
    const auth   = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;
    const zone = 'Europe/Sofia';
    const now  = DateTime.now().setZone(zone);

    // ⏳ Проверка на времевия интервал
    const timer = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!C2:D2'
    });
    const [startStr,endStr] = timer.data.values?.[0] || [];
    const start = DateTime.fromFormat(startStr,'M/d/yyyy',{zone});
    const end   = DateTime.fromFormat(endStr,'M/d/yyyy',{zone});
    if (!start.isValid||!end.isValid||now<start||now>end) {
      return res.status(403).json({ error:'Времето за подаване е изтекло или не е започнало' });
    }

    // 🔍 Намираме реда на потребителя
    const nameRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId, range:'Заявки!B8:B50'
    });
    const rowIdx = (nameRes.data.values||[])
      .findIndex(r=>r[0]?.trim().toLowerCase()===userName);
    if (rowIdx===-1) return res.status(404).json({ error:'Името не е намерено в листа' });
    const sheetRow = 8+rowIdx;

    // Дали записваме всичко
    const saveAll = (await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId, range:'Месец!P3'
    })).data.values?.[0]?.[0]?.toLowerCase()==='true';

    // Строим масива за дните + цветови заявки
    const values   = [];
    const requests = [];
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const realSheetId = meta.data.sheets.find(s=>s.properties.title==='Заявки').properties.sheetId;

    for (let day=1; day<=31; day++) {
      const val     = calendarSelections[day];
      const pinned  = calendarSelections[`pin-${day}`];
      const hasVal  = typeof val==='string' && val.trim()!=='';
      const colIdx  = 11+(day-1);  // L = 11
      let should=false, red=false;

      if (saveAll) { should=true; red=pinned&&hasVal; }
      else if (hasVal) {
        if (val.toUpperCase()==='PH') should=true;
        else if (pinned) { should=true; red=true; }
      }

      values.push(should ? val||'' : '');

      if (should) {
        requests.push({
          repeatCell:{
            range:{
              sheetId: realSheetId,
              startRowIndex: sheetRow-1,
              endRowIndex:   sheetRow,
              startColumnIndex: colIdx,
              endColumnIndex:   colIdx+1
            },
            cell:{
              userEnteredFormat:{
                textFormat:{
                  foregroundColor: red
                    ? { red:1, green:0, blue:0 }
                    : { red:0, green:0, blue:0 }
                }
              }
            },
            fields:'userEnteredFormat.textFormat.foregroundColor'
          }
        });
      }
    }

    // 📝 Запис на дните
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range:`Заявки!L${sheetRow}:AP${sheetRow}`,
      valueInputOption:'USER_ENTERED',
      requestBody:{ values:[values] }
    });

    // 🧩 Екстри
    const extras = [
      calendarSelections.nightCount||'',
      '',                               // E
      calendarSelections.shiftType||'',
      '',                               // G
      calendarSelections.extraShift||'',
      '',                               // I
      now.toFormat('yyyy-MM-dd')        // J
    ];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range:`Заявки!D${sheetRow}:J${sheetRow}`,
      valueInputOption:'USER_ENTERED',
      requestBody:{ values:[extras] }
    });

    // 🎨 Цветове
    if (requests.length) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody:{ requests }
      });
    }

    res.status(200).json({ success:true });
  } catch (err) {
    console.error('getSave error:', err);
    res.status(500).json({ error:'Internal server error' });
  }
}

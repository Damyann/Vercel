import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getGoogleAuth } from '../lib/auth.js';
import { validateSession } from '../lib/sessions.js';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔐 Валидираме токена
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userName = validateSession(token);
  if (!userName) {
    return res.status(401).json({ error: 'Невалиден или липсващ токен' });
  }

  const { calendarSelections } = req.body;
  if (!calendarSelections) {
    return res.status(400).json({ error: 'Missing calendarSelections' });
  }

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;
    const zone = 'Europe/Sofia';
    const now = DateTime.now().setZone(zone);

    // ⏳ Проверка на времеви интервал
    const timerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!C2:D2',
    });
    const [startStr, endStr] = timerRes.data.values?.[0] || [];
    const start = DateTime.fromFormat(startStr, 'M/d/yyyy', { zone });
    const end = DateTime.fromFormat(endStr, 'M/d/yyyy', { zone });

    if (!start.isValid || !end.isValid || now < start || now > end) {
      return res.status(403).json({ error: 'Времето за подаване е изтекло или не е започнало' });
    }

    // 🔍 Данни за листа "Заявки"
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const targetSheet = meta.data.sheets.find(s => s.properties.title === 'Заявки');
    if (!targetSheet) throw new Error('Лист „Заявки“ не е намерен');
    const realSheetId = targetSheet.properties.sheetId;

    // 🔎 Откриване на ред по име
    const nameRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Заявки!B8:B50',
    });
    const nameRows = nameRes.data.values || [];
    const rowIndex = nameRows.findIndex(row => row[0]?.trim().toLowerCase() === userName.trim().toLowerCase());
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Името не е намерено в листа' });
    }
    const sheetRow = 8 + rowIndex;

    // 🔁 Проверка дали записваме всичко или само важните
    const saveAllRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!P3',
    });
    const saveAll = (saveAllRes.data.values?.[0]?.[0]?.toLowerCase() === 'true');

    const values = [];
    const requests = [];

    for (let day = 1; day <= 31; day++) {
      const val = calendarSelections[day];
      const pinned = calendarSelections[`pin-${day}`];
      const hasValue = typeof val === 'string' && val.trim() !== '';
      const colIndex = 11 + (day - 1); // L е 11

      let shouldSave = false;
      let useRed = false;

      if (saveAll) {
        shouldSave = true;
        useRed = pinned && hasValue;
      } else if (hasValue) {
        if (val.toUpperCase() === 'PH') {
          shouldSave = true;
        } else if (pinned) {
          shouldSave = true;
          useRed = true;
        }
      }

      values.push(shouldSave ? val || '' : '');

      if (shouldSave) {
        requests.push({
          repeatCell: {
            range: {
              sheetId: realSheetId,
              startRowIndex: sheetRow - 1,
              endRowIndex: sheetRow,
              startColumnIndex: colIndex,
              endColumnIndex: colIndex + 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  foregroundColor: useRed
                    ? { red: 1, green: 0, blue: 0 }
                    : { red: 0, green: 0, blue: 0 },
                },
              },
            },
            fields: 'userEnteredFormat.textFormat.foregroundColor',
          },
        });
      }
    }

    // 📝 Записване на дните
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Заявки!L${sheetRow}:AP${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] },
    });

    // 🧩 Екстри
    const extras = [
      calendarSelections.nightCount || '',
      '', // празно за колона E
      calendarSelections.shiftType || '',
      '', // празно за G
      calendarSelections.extraShift || '',
      '', // празно за I
      now.toFormat('yyyy-MM-dd'),
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Заявки!D${sheetRow}:J${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [extras] },
    });

    // 🎨 Цветове
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests },
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('getSave error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

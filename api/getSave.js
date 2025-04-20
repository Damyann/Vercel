import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getGoogleAuth } from '../lib/auth.js';
import { verifyToken } from '../lib/jwt.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
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
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;
    const zone = 'Europe/Sofia';
    const now = DateTime.now().setZone(zone);

    const timerRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!C2:D2'
    });
    const [startStr, endStr] = timerRes.data.values?.[0] || [];
    const start = DateTime.fromFormat(startStr, 'M/d/yyyy', { zone });
    const end = DateTime.fromFormat(endStr, 'M/d/yyyy', { zone });
    if (!start.isValid || !end.isValid || now < start || now > end) {
      return res.status(403).json({ error: 'Времето за подаване е изтекло или не е започнало' });
    }

    const saveAllRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!P3'
    });
    const saveAll = (saveAllRes.data.values?.[0]?.[0] || '').toString().toLowerCase() === 'true';

    const pinData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!O2:O3'
    });
    const pinLimit = parseInt(pinData.data.values?.[0]?.[0]) || 0;
    const pinLimitEnabled = pinData.data.values?.[1]?.[0]?.toLowerCase() === 'true';

    const disabledRaw = (await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!T2:U32'
    })).data.values || [];
    const disabledDays = disabledRaw
      .filter(r => r[1]?.toLowerCase() !== 'true')
      .map(r => parseInt(r[0]))
      .filter(Number.isFinite);

    for (const day of disabledDays) {
      if (calendarSelections[day]) {
        return res.status(400).json({
          error: `Ден ${day} е заключен и не може да се променя`
        });
      }
    }

    const [optsRes, nightRes, shiftRes, extraRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!Q2:R11' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!E2:I3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!J2:M3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!N3' })
    ]);

    const allowedOptions = (optsRes.data.values || [])
      .filter(r => r[1]?.toLowerCase() === 'true')
      .map(r => r[0]);
    const nightCounts = (nightRes.data.values?.[0] || [])
      .filter((_, i) => nightRes.data.values?.[1]?.[i]?.toLowerCase() === 'true')
      .map(v => v.toString());
    const shiftTypes = (shiftRes.data.values?.[0] || [])
      .filter((_, i) => shiftRes.data.values?.[1]?.[i]?.toLowerCase() === 'true')
      .map(v => v.toString());
    const extraEnabled = extraRes.data.values?.[0]?.[0]?.toLowerCase() === 'true';
    const extraValues = extraEnabled ? ['Да', 'Не'] : [];

    const nc = calendarSelections.nightCount?.toString();
    if (!nightCounts.includes(nc)) {
      return res.status(400).json({ error: 'Невалиден брой нощни' });
    }
    const st = calendarSelections.shiftType?.toString();
    if (!shiftTypes.includes(st)) {
      return res.status(400).json({ error: 'Невалиден тип смени' });
    }
    const es = calendarSelections.extraShift?.toString() || '';
    if (es && !extraValues.includes(es)) {
      return res.status(400).json({ error: 'Невалиден избор за екстра смени' });
    }

    let pinnedCount = 0;
    for (const [key, val] of Object.entries(calendarSelections)) {
      if (/^pin-\d+$/.test(key) && val) pinnedCount++;
      if (!/^\d+$/.test(key)) continue;
      if (val && !allowedOptions.includes(val)) {
        return res.status(400).json({ error: `Невалидна опция за ден ${key}` });
      }
    }

    if (pinLimitEnabled && pinnedCount > pinLimit) {
      return res.status(400).json({
        error: `Надхвърлен лимит за важни дати: ${pinnedCount} > ${pinLimit}`
      });
    }

    const namesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Заявки!B8:B50'
    });
    const rowIdx = (namesRes.data.values || [])
      .findIndex(r => r[0]?.trim().toLowerCase() === userName);
    if (rowIdx === -1) {
      return res.status(404).json({ error: 'Потребителят не е намерен' });
    }
    const sheetRow = 8 + rowIdx;

    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const realSheetId = meta.data.sheets.find(s => s.properties.title === 'Заявки').properties.sheetId;

    const valuesArr = [];
    const requests = [];

    for (let day = 1; day <= 31; day++) {
      const val = calendarSelections[day] || '';
      const pinned = Boolean(calendarSelections[`pin-${day}`]);
      const hasVal = val.trim() !== '';
      const colIdx = 11 + (day - 1); // L = 11

      let should = false;
      if (hasVal) {
        should = saveAll ? true : (val.toUpperCase() === 'PH' || pinned);
      }

      valuesArr.push(should ? val : '');

      const isRed = pinned && hasVal;
      requests.push({
        repeatCell: {
          range: {
            sheetId: realSheetId,
            startRowIndex: sheetRow - 1,
            endRowIndex: sheetRow,
            startColumnIndex: colIdx,
            endColumnIndex: colIdx + 1
          },
          cell: {
            userEnteredFormat: {
              textFormat: {
                foregroundColor: isRed
                  ? { red: 1, green: 0, blue: 0 }
                  : { red: 0, green: 0, blue: 0 }
              }
            }
          },
          fields: 'userEnteredFormat.textFormat.foregroundColor'
        }
      });
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Заявки!L${sheetRow}:AP${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [valuesArr] }
    });

    const extras = [
      calendarSelections.nightCount || '',
      '',
      calendarSelections.shiftType || '',
      '',
      calendarSelections.extraShift || '',
      '',
      DateTime.now().setZone(zone).toFormat('yyyy-MM-dd')
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Заявки!D${sheetRow}:J${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [extras] }
    });

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests }
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('getSave error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

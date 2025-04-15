import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const { name, calendarSelections } = req.body;

  if (!name || !calendarSelections) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    const credentials = process.env.GOOGLE_CREDENTIALS_BASE64
      ? JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8'))
      : JSON.parse(
          await import('fs').then(fs =>
            fs.promises.readFile(new URL('../secrets/zaqvki-8d41b171a08f.json', import.meta.url), 'utf8')
          )
        );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const targetSheet = spreadsheetMeta.data.sheets.find(sheet => sheet.properties.title === 'Заявки');
    if (!targetSheet) throw new Error('Лист „Заявки“ не е намерен!');
    const realSheetId = targetSheet.properties.sheetId;

    const p3Res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!P3'
    });
    const saveAll = (p3Res.data.values?.[0]?.[0]?.toLowerCase() === 'true');

    const namesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Заявки!B8:B50'
    });
    const nameRows = namesRes.data.values || [];
    const lowerName = name.trim().toLowerCase();
    const rowIndex = nameRows.findIndex(row => row[0]?.trim().toLowerCase() === lowerName);
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Името не е намерено в листа' });
    }

    const sheetRow = 8 + rowIndex;
    const values = [];
    const requests = [];

    for (let day = 1; day <= 31; day++) {
      const val = calendarSelections[day];
      const pinned = calendarSelections[`pin-${day}`];
      const colIndex = 11 + day - 1;

      let shouldSave = false;
      let useRed = false;

      if (saveAll) {
        shouldSave = true;
        useRed = !!pinned;
      } else {
        if (pinned) {
          shouldSave = true;
          useRed = true;
        } else if (val && val.toUpperCase() === 'PH') {
          shouldSave = true;
          useRed = false;
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
              endColumnIndex: colIndex + 1
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  foregroundColor: useRed
                    ? { red: 1, green: 0, blue: 0 }
                    : { red: 0, green: 0, blue: 0 }
                }
              }
            },
            fields: 'userEnteredFormat.textFormat.foregroundColor'
          }
        });
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Заявки!L${sheetRow}:AP${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] }
    });

    const extras = [
      calendarSelections.nightCount || '',
      '', // празно за E
      calendarSelections.shiftType || '',
      '', // празно за G
      calendarSelections.extraShift || '',
      '', // празно за I
      DateTime.now().setZone('Europe/Sofia').toFormat('yyyy-MM-dd')
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Заявки!D${sheetRow}:J${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [extras] }
    });

    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests }
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('getSave error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

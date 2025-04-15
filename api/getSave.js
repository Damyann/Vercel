import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

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
    for (let day = 1; day <= 31; day++) {
      const val = calendarSelections[day];
      const pinned = calendarSelections[`pin-${day}`];

      if (saveAll) {
        values.push(val || '');
      } else {
        if ((pinned || (val && val.toUpperCase() === 'PH'))) {
          values.push(val || '');
        } else {
          values.push('');
        }
      }
    }

    const updateRes = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Заявки!L${sheetRow}:AP${sheetRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values]
      }
    });

    return res.status(200).json({ success: true, updated: updateRes.data });
  } catch (err) {
    console.error('getSave error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

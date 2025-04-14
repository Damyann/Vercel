import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const credentialsPath = path.join(__dirname, '..', 'secrets', 'zaqvki-8d41b171a08f.json');

  const { name, calendarSelections } = req.body;

  if (!name || !calendarSelections) {
    return res.status(400).json({ error: 'Missing data' });
  }

  try {
    // Зареждаме service account credentials
    const auth = new google.auth.GoogleAuth({
      keyFile: credentialsPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // 1. Проверка дали да се записва всичко (Месец!P3)
    const p3Res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!P3'
    });

    const saveAll = (p3Res.data.values?.[0]?.[0]?.toLowerCase() === 'true');

    // 2. Намираме реда с името (в Заявки!B8:B50)
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

    // 3. Подготовка на стойностите
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

    // 4. Запис в диапазона L:AP
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

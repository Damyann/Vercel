import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';
import fs from 'fs/promises';

export default async function getTimer(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Подготвяме __dirname (ESM съвместимост)
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // 2. Зареждаме credentials от .env (base64) или локално .json
    const credentials = process.env.GOOGLE_CREDENTIALS_BASE64
      ? JSON.parse(
          Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8')
        )
      : JSON.parse(
          await fs.readFile(
            path.join(__dirname, '../secrets/zaqvki-8d41b171a08f.json'),
            'utf8'
          )
        );

    // 3. Инициализация на Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // 4. Spreadsheet ID
    const sheetId = process.env.SHEET_ID || process.env.SPREADSHEET_ID;
    if (!sheetId) {
      return res.status(500).json({ error: 'Missing SHEET_ID in environment' });
    }

    // 5. Извличаме C2 и D2 от лист "Месец"
    const timerData = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!C2:D2'
    });

    const [startStr, endStr] = timerData.data.values?.[0] || [];
    const zone = 'Europe/Sofia';

    const start = DateTime.fromFormat(startStr, 'M/d/yyyy', { zone });
    const end = DateTime.fromFormat(endStr, 'M/d/yyyy', { zone });
    const now = DateTime.now().setZone(zone);

    if (!start.isValid || !end.isValid) {
      return res.status(400).json({ error: 'Невалиден формат на датите в C2:D2' });
    }

    // 6. Определяме статуса на периода
    if (now < start) {
      return res.json({
        status: 'waiting',
        startsIn: start.diff(now).toMillis()
      });
    }

    if (now > end) {
      return res.json({
        status: 'closed',
        message: 'Заявките са затворени'
      });
    }

    return res.json({
      status: 'open',
      remaining: end.diff(now).toMillis()
    });
  } catch (err) {
    console.error('getTimer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

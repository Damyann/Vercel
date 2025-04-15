import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { DateTime } from 'luxon';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8')
      ),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

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

    if (now < start) {
      return res.status(200).json({ status: 'waiting', startsIn: start.diff(now).toMillis() });
    } else if (now > end) {
      return res.status(200).json({ status: 'closed' });
    } else {
      return res.status(200).json({ status: 'open', remaining: end.diff(now).toMillis() });
    }
  } catch (err) {
    console.error('getTimer error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 

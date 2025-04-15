import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const credentials = process.env.GOOGLE_CREDENTIALS_BASE64
      ? JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8'))
      : JSON.parse(
          await import('fs').then(fs =>
            fs.promises.readFile(new URL('../secrets/zaqvki-8d41b171a08f.json', import.meta.url), 'utf8')
          )
        );

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const [nightData, shiftData, extraData] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!E2:I3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!J2:M3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!N3' })
    ]);

    const nightCounts = nightData.data.values?.[0]?.filter(Boolean) || [];
    const shiftTypes = shiftData.data.values?.[0]?.filter(Boolean) || [];
    const extraEnabled = extraData.data.values?.[0]?.[0]?.toLowerCase() === 'true';

    return res.status(200).json({
      nightCounts,
      shiftTypes,
      extraEnabled
    });

  } catch (err) {
    console.error('getOptions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

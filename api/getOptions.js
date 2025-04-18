import { google } from 'googleapis';
import { getGoogleAuth } from '../lib/auth.js';
import { validateSession } from '../lib/sessions.js';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔐 Проверка на токен
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userName = validateSession(token);
  if (!userName) {
    return res.status(401).json({ error: 'Невалиден или липсващ токен' });
  }

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const [nightRes, shiftRes, extraRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!E2:I3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!J2:M3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!N3' })
    ]);

    const nightCounts = (nightRes.data.values?.[0] || []).filter((label, i) =>
      label && nightRes.data.values?.[1]?.[i]?.toLowerCase() === 'true'
    );

    const shiftTypes = (shiftRes.data.values?.[0] || []).filter((label, i) =>
      label && shiftRes.data.values?.[1]?.[i]?.toLowerCase() === 'true'
    );

    const extraEnabled = extraRes.data.values?.[0]?.[0]?.toLowerCase() === 'true';

    return res.status(200).json({ nightCounts, shiftTypes, extraEnabled });
  } catch (err) {
    console.error('getOptions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

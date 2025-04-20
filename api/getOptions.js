import { google } from 'googleapis';
import { getGoogleAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth   = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const [night, shift, extra] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!E2:I3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!J2:M3' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Месец!N3' })
    ]);

    const nightCounts = (night.data.values?.[0] || []).filter(
      (v, i) => v && night.data.values?.[1]?.[i]?.toLowerCase() === 'true'
    );
    const shiftTypes = (shift.data.values?.[0] || []).filter(
      (v, i) => v && shift.data.values?.[1]?.[i]?.toLowerCase() === 'true'
    );
    const extraEnabled = extra.data.values?.[0]?.[0]?.toLowerCase() === 'true';

    res.status(200).json({ nightCounts, shiftTypes, extraEnabled });
  } catch (err) {
    console.error('getOptions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

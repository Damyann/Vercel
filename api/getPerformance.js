import { google } from 'googleapis';
import { getGoogleAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 1) Read user from query
  const userParam = req.query.user;
  if (!userParam) {
    return res.status(400).json({ success: false, error: 'Missing user parameter' });
  }
  const userName = userParam.trim().toLowerCase();

  try {
    const auth   = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // 2) Month & year
    const meta = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!A3:B3'
    });
    const [yearStr, monthName] = meta.data.values?.[0] || [];
    const year = parseInt(yearStr, 10);
    if (!year || !monthName) {
      return res.status(400).json({ success: false, error: 'Invalid month/year data' });
    }

    // 3) Days in month
    const monthIndex = [
      'януари','февруари','март','април','май','юни',
      'юли','август','септември','октомври','ноември','декември'
    ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // 4) Medal thresholds
    const ranges = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!B5:B6'
    });
    const [goldRaw, silverRaw] = (ranges.data.values || []).map(r => r[0]);
    const parseRange = str => {
      const [a,b] = (str||'').split('-').map(s=>parseInt(s.trim(),10));
      return [a, isNaN(b) ? a : b];
    };
    const [goldStart, goldEnd]     = parseRange(goldRaw);
    const [silverStart, silverEnd] = parseRange(silverRaw);

    // 5) All scores & find this user
    const scoresRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Scoreboard!C8:U50'
    });
    let userScore = null;
    const allScores = [];
    for (const row of scoresRes.data.values || []) {
      const name  = row[0]?.trim().toLowerCase();
      const score = parseFloat(row[18]);
      if (!isNaN(score)) {
        allScores.push(score);
        if (name === userName) {
          userScore = score;
        }
      }
    }
    if (userScore === null) {
      return res.status(404).json({ success:false, error:'User not found' });
    }

    // 6) Determine medal
    const uniqueDesc = Array.from(new Set(allScores)).sort((a,b)=>b-a);
    const rank = uniqueDesc.indexOf(userScore) + 1;
    let medalType = 'none';
    if (rank >= goldStart && rank <= goldEnd)       medalType = 'gold';
    else if (rank >= silverStart && rank <= silverEnd) medalType = 'silver';

    // 7) Bonuses
    const [aValsRes, u5Res] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Performance!A5:A6' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Актуален-Scoreboard!U5' })
    ]);
    const a5 = parseFloat(aValsRes.data.values?.[0]?.[0])||0;
    const a6 = parseFloat(aValsRes.data.values?.[1]?.[0])||0;
    const u5 = parseFloat(u5Res.data.values?.[0]?.[0])||1;

    let finalScore = userScore * u5;
    if (medalType === 'gold')   finalScore += a5;
    else if (medalType === 'silver') finalScore += a6;

    // 8) Daily values
    const monthlyRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Monthly!B3:BN3'
    });
    const row = monthlyRes.data.values?.[0] || [];
    const dailyValues = Array.from({ length: daysInMonth }, (_, i) =>
      row[4 + i*2]?.toString().trim() || '--'
    );

    // 9) Respond
    return res.status(200).json({
      success:     true,
      year,
      monthName,
      daysInMonth,
      score:      userScore,
      medalType,
      finalScore,
      dailyValues
    });
  } catch (err) {
    console.error('getPerformance error:', err);
    return res.status(500).json({ success:false, error:'Server error loading performance' });
  }
}

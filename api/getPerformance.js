import { google } from 'googleapis';
import { getGoogleAuth } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const period = req.query.period;

  // 👉 Ако искаме само имената на бутоните
  if (period === 'meta') {
    try {
      const auth = await getGoogleAuth();
      const sheets = google.sheets({ version: 'v4', auth });
      const sheetId = process.env.SHEET_ID;

      const metaRes = await sheets.spreadsheets.values.batchGet({
        spreadsheetId: sheetId,
        ranges: ['Performance!B3', 'Performance!E3']
      });

      const beforeLabel = metaRes.data.valueRanges?.[0]?.values?.[0]?.[0] || '';
      const nowLabel    = metaRes.data.valueRanges?.[1]?.values?.[0]?.[0] || '';

      return res.status(200).json({
        success: true,
        beforeLabel,
        nowLabel
      });
    } catch (err) {
      console.error('getPerformance meta error:', err);
      return res.status(500).json({ success: false, error: 'Failed to load month labels' });
    }
  }

  // 👉 Обичайна performance логика
  const userParam = req.query.user;
  if (!userParam) {
    return res.status(400).json({ success: false, error: 'Missing user parameter' });
  }
  const userName = userParam.trim().toLowerCase();

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // 1) Month & year → D3:E3
    const meta = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!D3:E3'
    });
    const [yearStr, monthName] = meta.data.values?.[0] || [];
    const year = parseInt(yearStr, 10);
    if (!year || !monthName) {
      return res.status(400).json({ success: false, error: 'Invalid month/year data' });
    }

    // 2) Days in month
    const monthIndex = [
      'януари','февруари','март','април','май','юни',
      'юли','август','септември','октомври','ноември','декември'
    ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // 3) Medal thresholds → E5:E6
    const medalRangeRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!E5:E6'
    });
    const [goldRaw, silverRaw] = (medalRangeRes.data.values || []).map(r => r[0]);
    const parseRange = str => {
      const [a, b] = (str || '').split('-').map(s => parseInt(s.trim(), 10));
      return [a, isNaN(b) ? a : b];
    };
    const [goldStart, goldEnd]     = parseRange(goldRaw);
    const [silverStart, silverEnd] = parseRange(silverRaw);

    // 4) All scores & find this user
    const scoresRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Scoreboard!C8:U50'
    });
    let userScore = null;
    const allScores = [];
    for (const row of scoresRes.data.values || []) {
      const name = row[0]?.trim().toLowerCase();
      const score = parseFloat(row[18]);
      if (!isNaN(score)) {
        allScores.push(score);
        if (name === userName) {
          userScore = score;
        }
      }
    }
    if (userScore === null) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // 5) Determine medal
    const uniqueDesc = Array.from(new Set(allScores)).sort((a, b) => b - a);
    const rank = uniqueDesc.indexOf(userScore) + 1;
    let medalType = 'none';
    if (rank >= goldStart && rank <= goldEnd) medalType = 'gold';
    else if (rank >= silverStart && rank <= silverEnd) medalType = 'silver';

    // 6) Bonuses → D5:D6
    const [bonusRes, multiplierRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Performance!D5:D6' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Актуален-Scoreboard!U5' })
    ]);
    const goldBonus   = parseFloat(bonusRes.data.values?.[0]?.[0]) || 0;
    const silverBonus = parseFloat(bonusRes.data.values?.[1]?.[0]) || 0;
    const multiplier  = parseFloat(multiplierRes.data.values?.[0]?.[0]) || 1;

    let finalScore = userScore * multiplier;
    if (medalType === 'gold') finalScore += goldBonus;
    else if (medalType === 'silver') finalScore += silverBonus;

    // 7) Daily values
    const monthlyRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Monthly!B3:BN3'
    });
    const row = monthlyRes.data.values?.[0] || [];
    const dailyValues = Array.from({ length: daysInMonth }, (_, i) =>
      row[4 + i * 2]?.toString().trim() || '--'
    );

    // 8) Respond
    return res.status(200).json({
      success: true,
      year,
      monthName,
      daysInMonth,
      score: userScore,
      medalType,
      finalScore,
      dailyValues
    });
  } catch (err) {
    console.error('getPerformance error:', err);
    return res.status(500).json({ success: false, error: 'Server error loading performance' });
  }
}

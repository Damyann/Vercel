import { google } from 'googleapis';
import { validateSession } from '../lib/sessions.js';
import { getGoogleAuth } from '../lib/auth.js';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔐 Валидация на токен
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userName = validateSession(token);
  if (!userName) {
    return res.status(401).json({ success: false, error: 'Невалиден токен' });
  }

  try {
    const auth = await getGoogleAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    const sheetId = process.env.SHEET_ID;

    const { data: perfMeta } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!A3:B3',
    });

    const row = perfMeta.values?.[0] || [];
    const year = parseInt(row[0]);
    const monthName = row[1]?.trim();

    if (isNaN(year) || !monthName) {
      return res.status(400).json({ success: false, error: 'Невалидна година или месец.' });
    }

    const monthIndex = [
      'Януари','Февруари','Март','Април','Май','Юни',
      'Юли','Август','Септември','Октомври','Ноември','Декември'
    ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const { data: rangeData } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!B5:B6',
    });

    const [goldText = '', silverText = ''] = rangeData.values?.map(r => r[0]) || [];

    const parseRange = txt => {
      if (!txt) return [NaN, NaN];
      const [a, b] = txt.split('-').map(v => parseInt(v.trim()));
      return [a, isNaN(b) ? a : b];
    };

    const [goldStart, goldEnd] = parseRange(goldText);
    const [silverStart, silverEnd] = parseRange(silverText);

    const { data: scoreData } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Scoreboard!C8:U50',
    });

    let userScore = null;
    const allScores = [];

    scoreData.values?.forEach(row => {
      const name = row[0]?.trim().toLowerCase();
      const score = parseFloat(row[18]); // U колона
      if (!isNaN(score)) {
        allScores.push(score);
        if (name === userName) userScore = score;
      }
    });

    if (userScore === null) {
      return res.status(404).json({ success: false, error: 'Потребителят не е намерен.' });
    }

    const sorted = [...new Set(allScores)].sort((a, b) => b - a);
    const userRank = sorted.indexOf(userScore) + 1;

    let medalType = 'none';
    if (userRank >= goldStart && userRank <= goldEnd) {
      medalType = 'gold';
    } else if (userRank >= silverStart && userRank <= silverEnd) {
      medalType = 'silver';
    }

    const [aVals, u5Val] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Performance!A5:A6',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: 'Актуален-Scoreboard!U5',
      }),
    ]);

    const a5 = parseFloat(aVals.data.values?.[0]?.[0]) || 0;
    const a6 = parseFloat(aVals.data.values?.[1]?.[0]) || 0;
    const u5 = parseFloat(u5Val.data.values?.[0]?.[0]) || 1;

    let finalScore = userScore * u5;
    if (userRank >= goldStart && userRank <= goldEnd) {
      finalScore += a5;
    } else if (userRank >= silverStart && userRank <= silverEnd) {
      finalScore += a6;
    }

    const { data: monthlyData } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Monthly!B3:BN3',
    });

    let dailyValues = Array(31).fill('--');
    if (monthlyData?.values?.length) {
      const matchRow = monthlyData.values[0];

      const dayColumnIndexes = Array.from({ length: 31 }, (_, i) => 4 + i * 2);
      dailyValues = dayColumnIndexes.map(index => {
        const val = matchRow[index];
        return val?.toString().trim() || '--';
      });
    }

    return res.status(200).json({
      success: true,
      year,
      monthName,
      monthIndex,
      daysInMonth,
      score: userScore,
      medalType,
      finalScore,
      dailyValues,
    });

  } catch (err) {
    console.error('getPerformance error:', err);
    return res.status(500).json({ success: false, error: 'Грешка при зареждане.' });
  }
}

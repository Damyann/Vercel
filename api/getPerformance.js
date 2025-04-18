import { google } from 'googleapis';
import { validateSession } from '../lib/sessions.js';
import { getGoogleAuth } from '../lib/auth.js';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 🔐 Проверка на токен
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userName = validateSession(token);
  if (!userName) {
    return res.status(401).json({ success: false, error: 'Невалиден токен' });
  }

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // 📅 Извличаме текущ месец и година
    const metaRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!A3:B3',
    });
    const [yearStr, monthName] = metaRes.data.values?.[0] || [];
    const year = parseInt(yearStr);
    if (!year || !monthName) {
      return res.status(400).json({ success: false, error: 'Невалидни данни за месец/година' });
    }

    const monthIndex = [
      'Януари', 'Февруари', 'Март', 'Април', 'Май', 'Юни',
      'Юли', 'Август', 'Септември', 'Октомври', 'Ноември', 'Декември'
    ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // 🥇 Граници за злато и сребро
    const rangesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!B5:B6',
    });
    const [goldRaw, silverRaw] = rangesRes.data.values?.map(r => r[0]) || [];

    const parseRange = (text) => {
      const [from, to] = (text || '').split('-').map(s => parseInt(s.trim()));
      return [from, isNaN(to) ? from : to];
    };

    const [goldStart, goldEnd] = parseRange(goldRaw);
    const [silverStart, silverEnd] = parseRange(silverRaw);

    // 📊 Извличане на резултати от Scoreboard
    const scoreRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Scoreboard!C8:U50',
    });

    const allScores = [];
    let userScore = null;

    for (const row of scoreRes.data.values || []) {
      const name = row[0]?.trim().toLowerCase();
      const score = parseFloat(row[18]); // колона U
      if (!isNaN(score)) {
        allScores.push(score);
        if (name === userName.toLowerCase()) {
          userScore = score;
        }
      }
    }

    if (userScore === null) {
      return res.status(404).json({ success: false, error: 'Потребителят не е намерен.' });
    }

    const sorted = [...new Set(allScores)].sort((a, b) => b - a);
    const rank = sorted.indexOf(userScore) + 1;

    let medalType = 'none';
    if (rank >= goldStart && rank <= goldEnd) medalType = 'gold';
    else if (rank >= silverStart && rank <= silverEnd) medalType = 'silver';

    // 💰 Надбавки
    const [aVals, u5Val] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Performance!A5:A6' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Актуален-Scoreboard!U5' }),
    ]);

    const a5 = parseFloat(aVals.data.values?.[0]?.[0]) || 0;
    const a6 = parseFloat(aVals.data.values?.[1]?.[0]) || 0;
    const u5 = parseFloat(u5Val.data.values?.[0]?.[0]) || 1;

    let finalScore = userScore * u5;
    if (medalType === 'gold') finalScore += a5;
    else if (medalType === 'silver') finalScore += a6;

    // 🗓️ Данни по дни
    const monthly = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Monthly!B3:BN3',
    });

    const matchRow = monthly.data.values?.[0] || [];
    const dailyValues = Array.from({ length: 31 }, (_, i) => {
      const val = matchRow[4 + i * 2];
      return val?.toString().trim() || '--';
    });

    return res.status(200).json({
      success: true,
      year,
      monthName,
      monthIndex,
      daysInMonth,
      score: userScore,
      medalType,
      finalScore,
      dailyValues
    });

  } catch (err) {
    console.error('getPerformance error:', err);
    return res.status(500).json({ success: false, error: 'Грешка при зареждане.' });
  }
}

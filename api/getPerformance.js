import { google } from 'googleapis';
import { getGoogleAuth } from '../lib/auth.js';
import { verifyToken } from '../lib/jwt.js';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 🔐 JWT проверка
  const token   = req.headers.authorization?.replace('Bearer ', '');
  const decoded = verifyToken(token);
  const userName = decoded?.user;
  if (!userName) {
    return res.status(401).json({ success: false, error: 'Невалиден или изтекъл токен' });
  }

  try {
    const auth   = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Месец / година
    const meta = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!A3:B3'
    });
    const [yearStr, monthName] = meta.data.values?.[0] || [];
    const year = parseInt(yearStr);
    if (!year || !monthName) {
      return res.status(400).json({ success: false, error: 'Невалидни данни за месец/година' });
    }

    const monthIndex = [
      'Януари','Февруари','Март','Април','Май','Юни',
      'Юли','Август','Септември','Октомври','Ноември','Декември'
    ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // Граници за медали
    const ranges = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!B5:B6'
    });
    const [goldRaw, silverRaw] = ranges.data.values?.map(r => r[0]) || [];
    const parseRange = str => {
      const [a,b] = (str||'').split('-').map(s=>parseInt(s.trim()));
      return [a, isNaN(b)?a:b];
    };
    const [goldStart,goldEnd] = parseRange(goldRaw);
    const [silverStart,silverEnd] = parseRange(silverRaw);

    // Всички точки
    const scores = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Scoreboard!C8:U50'
    });

    let userScore=null;
    const all = [];

    for (const r of scores.data.values||[]) {
      const name  = r[0]?.trim().toLowerCase();
      const score = parseFloat(r[18]);
      if (!isNaN(score)) {
        all.push(score);
        if (name===userName) userScore=score;
      }
    }
    if (userScore===null) {
      return res.status(404).json({ success:false, error:'Потребителят не е намерен.' });
    }

    const sorted = [...new Set(all)].sort((a,b)=>b-a);
    const rank = sorted.indexOf(userScore)+1;
    let medal='none';
    if (rank>=goldStart && rank<=goldEnd) medal='gold';
    else if (rank>=silverStart && rank<=silverEnd) medal='silver';

    // Надбавки
    const [aVals,u5Val] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range:'Performance!A5:A6' }),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range:'Актуален-Scoreboard!U5' })
    ]);
    const a5 = parseFloat(aVals.data.values?.[0]?.[0])||0;
    const a6 = parseFloat(aVals.data.values?.[1]?.[0])||0;
    const u5 = parseFloat(u5Val.data.values?.[0]?.[0])||1;

    let final = userScore*u5;
    if (medal==='gold')   final+=a5;
    else if (medal==='silver') final+=a6;

    // Данни по дни
    const monthly = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Monthly!B3:BN3'
    });
    const row = monthly.data.values?.[0] || [];
    const dailyValues = Array.from({length:31},(_,i)=>{
      const v=row[4+i*2];
      return v?.toString().trim()||'--';
    });

    res.status(200).json({
      success:true,
      year, monthName, monthIndex, daysInMonth,
      score:userScore, medalType:medal, finalScore:final, dailyValues
    });
  } catch (err) {
    console.error('getPerformance error:', err);
    res.status(500).json({ success:false, error:'Грешка при зареждане.' });
  }
}

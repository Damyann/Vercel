import { google } from 'googleapis';

export default async function (req, res) {

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userName = req.headers['x-user-name']?.trim().toLowerCase();
  if (!userName) {
    return res.status(400).json({ error: 'Missing user name' });
  }

  try {
    /* ──────────────────────── Google auth ─────────────────────── */
    const auth = new google.auth.GoogleAuth({
      credentials: await getCredentials(),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const client  = await auth.getClient();
    const sheets  = google.sheets({ version: 'v4', auth: client });
    const sheetId = process.env.SHEET_ID;

    /* ───────────────────── Месец + година ─────────────────────── */
    const { data: perfMeta } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!A3:B3',
    });
    const row       = perfMeta.values?.[0] || [];
    const year      = parseInt(row[0]);
    const monthName = row[1]?.trim();

    if (isNaN(year) || !monthName) {
      return res.status(400).json({ success: false, error: 'Невалидна година или месец.' });
    }

    const monthIndex = [
      'Януари','Февруари','Март','Април','Май','Юни',
      'Юли','Август','Септември','Октомври','Ноември','Декември'
    ].findIndex(m => m.toLowerCase() === monthName.toLowerCase());
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    /* ─────────── Диапазони за медали: B5 (gold) и B6 (silver) ────────── */
    const { data: rangeData } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Performance!B5:B6',
    });
    const [goldText = '', silverText = ''] = rangeData.values?.map(r => r[0]) || [];

    const parseRange = txt => {
      if (!txt) return [NaN, NaN];
      const [a, b] = txt.split('-').map(v => parseInt(v.trim()));
      return [a, isNaN(b) ? a : b];         // „7“ → 7‑7
    };

    const [goldStart,   goldEnd]   = parseRange(goldText);
    const [silverStart, silverEnd] = parseRange(silverText);

    /* ───────────── Данни от „Актуален‑Scoreboard“ ─────────────── */
    const { data: scoreData } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Актуален-Scoreboard!C8:U50',
    });

    let userScore = null;
    const allScores = [];

    scoreData.values?.forEach(row => {
      const name  = row[0]?.trim().toLowerCase();
      const score = parseFloat(row[18]);           // U‑колоната (индекс 18)
      if (!isNaN(score)) {
        allScores.push(score);
        if (name === userName) userScore = score;
      }
    });

    if (userScore === null) {
      return res.status(404).json({ success: false, error: 'Потребителят не е намерен.' });
    }

    /* ────────────── Определяне на ранга и медала ───────────────── */
    const sorted   = [...new Set(allScores)].sort((a, b) => b - a); // уникални, низходящо
    const userRank = sorted.indexOf(userScore) + 1;                 // 1‑based

    let medalType = 'none';
    if (userRank >= goldStart && userRank <= goldEnd) {
      medalType = 'gold';
    } else if (userRank >= silverStart && userRank <= silverEnd) {
      medalType = 'silver';
    }

    /* ────────────────────── Отговор към клиента ────────────────── */
    return res.status(200).json({
      success: true,
      year,
      monthName,
      monthIndex,
      daysInMonth,
      score: userScore,
      medalType,                 // 'gold' | 'silver' | 'none'
    });

  } catch (err) {
    console.error('getPerformance error:', err);
    return res.status(500).json({ success: false, error: 'Грешка при зареждане.' });
  }
}

/* ─────────────────── Helper за service‑account JSON ─────────────────── */
async function getCredentials() {
  if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    const decoded = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
  const fs   = await import('fs/promises');
  const path = new URL('../secrets/zaqvki-8d41b171a08f.json', import.meta.url);
  const json = await fs.readFile(path, 'utf8');
  return JSON.parse(json);
}

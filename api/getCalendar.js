import { google } from 'googleapis';
import { getGoogleAuth } from '../lib/auth.js';
import { validateSession } from '../lib/sessions.js';

const monthMap = {
  'януари': 1, 'февруари': 2, 'март': 3, 'април': 4,
  'май': 5, 'юни': 6, 'юли': 7, 'август': 8,
  'септември': 9, 'октомври': 10, 'ноември': 11, 'декември': 12
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  const userName = validateSession(token);
  if (!userName) {
    return res.status(401).json({ error: 'Невалиден или липсващ токен' });
  }

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    // Вземаме година и месец от A2 и B2
    const [yearStr, rawMonth] = (await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!A2:B2'
    })).data.values?.[0] || [];

    const year = parseInt(yearStr);
    const monthKey = rawMonth?.trim().toLowerCase();
    const month = monthMap[monthKey];
    const monthName = rawMonth?.charAt(0).toUpperCase() + rawMonth?.slice(1).toLowerCase();

    if (!year || !month || !monthName) {
      return res.status(400).json({ error: 'Невалидни данни за месец/година' });
    }

    // Опции (Q2:R11)
    const options = (await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!Q2:R11'
    })).data.values?.filter(r => r[1]?.toLowerCase() === 'true').map(r => r[0]) || [];

    // Тегла (Q2:S11)
    const weightsRaw = (await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!Q2:S11'
    })).data.values || [];

    const weights = {};
    for (const row of weightsRaw) {
      const label = row[0];
      const weight = parseFloat(row[2]);
      if (label && !isNaN(weight)) weights[label] = weight;
    }

    // Ограничение за pin бутони (O2:O3)
    const pinLimitData = (await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!O2:O3'
    })).data.values || [];

    const pinLimit = parseInt(pinLimitData?.[0]?.[0]) || 0;
    const pinLimitEnabled = pinLimitData?.[1]?.[0]?.toLowerCase() === 'true';

    // Забранени дни (T2:U32)
    const disabledRaw = (await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!T2:U32'
    })).data.values || [];

    const disabledDays = disabledRaw
      .filter(r => r[1]?.toLowerCase() !== 'true')
      .map(r => parseInt(r[0]))
      .filter(n => !isNaN(n));

    return res.status(200).json({
      year,
      month,
      monthName,
      options,
      weights,
      pinLimit,
      pinLimitEnabled,
      disabledDays
    });
  } catch (err) {
    console.error('getCalendar error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

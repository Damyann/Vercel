import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGoogleAuth } from '../lib/auth.js';
import { validateSession } from '../lib/sessions.js';

const monthMap = {
  'януари': 1, 'февруари': 2, 'март': 3, 'април': 4,
  'май': 5, 'юни': 6, 'юли': 7, 'август': 8,
  'септември': 9, 'октомври': 10, 'ноември': 11, 'декември': 12
};

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔐 Валидираме токен
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userName = validateSession(token);
  if (!userName) {
    return res.status(401).json({ error: 'Невалиден или липсващ токен' });
  }

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const dateRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!A2:B2'
    });

    const values = dateRes.data.values?.[0] || [];
    const year = parseInt(values[0]);
    const rawMonth = values[1]?.trim();
    const monthKey = rawMonth?.toLowerCase();
    const month = monthMap[monthKey];
    const monthName = rawMonth?.charAt(0).toUpperCase() + rawMonth?.slice(1).toLowerCase();

    if (!year || !month || !monthName) {
      return res.status(400).json({ error: 'Невалидни данни за месец/година' });
    }

    const optionsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!Q2:R11'
    });

    const options = (optionsRes.data.values || [])
      .filter(r => r[1]?.toLowerCase() === 'true')
      .map(r => r[0]);

    const weightsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!Q2:S11'
    });

    const weights = {};
    (weightsRes.data.values || []).forEach(row => {
      const label = row[0];
      const weight = parseFloat(row[2]);
      if (label && !isNaN(weight)) weights[label] = weight;
    });

    const pinLimitRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!O2:O3'
    });

    const pinLimitVals = pinLimitRes.data.values || [];
    const pinLimit = parseInt(pinLimitVals?.[0]?.[0]) || 0;
    const pinLimitEnabled = pinLimitVals?.[1]?.[0]?.toLowerCase() === 'true';

    const disabledRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Месец!T2:U32'
    });

    const disabledDays = (disabledRes.data.values || [])
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

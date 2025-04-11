import fetch from 'node-fetch';

const monthMap = {
  'януари': 1, 'февруари': 2, 'март': 3, 'април': 4,
  'май': 5, 'юни': 6, 'юли': 7, 'август': 8,
  'септември': 9, 'октомври': 10, 'ноември': 11, 'декември': 12
};

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.API_KEY;

  try {
    // 1. Извличане на година и месец
    const dateRange = 'Месец!A2:B2';
    const dateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(dateRange)}?key=${apiKey}`;
    const dateRes = await fetch(dateUrl);
    const dateData = await dateRes.json();
    const values = dateData.values?.[0];

    if (!values || values.length < 2) {
      return res.status(400).json({ error: 'Missing calendar data' });
    }

    const year = parseInt(values[0]);
    const monthNameRaw = values[1].trim().toLowerCase();
    const month = monthMap[monthNameRaw];
    const monthName = values[1].trim();

    if (isNaN(year) || !month) {
      return res.status(400).json({ error: 'Invalid calendar data' });
    }

    // 2. Валидни опции
    const optionsRange = 'Месец!Q2:R11';
    const optionsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(optionsRange)}?key=${apiKey}`;
    const optionsRes = await fetch(optionsUrl);
    const optionsData = await optionsRes.json();
    const rows = optionsData.values || [];

    const options = rows
      .filter(row => row[1]?.toLowerCase() === 'true')
      .map(row => row[0]);

    // 3. Тежести
    const weightsRange = 'Месец!Q2:S11';
    const weightsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(weightsRange)}?key=${apiKey}`;
    const weightsRes = await fetch(weightsUrl);
    const weightsData = await weightsRes.json();
    const weightRows = weightsData.values || [];

    const weights = {};
    weightRows.forEach(row => {
      const label = row[0];
      const parsedValue = parseFloat(row[2]);
      const weight = isNaN(parsedValue) ? 1 : parsedValue;
      if (label) {
        weights[label] = weight;
      }
    });

    // 4. Pin лимит
    const pinLimitRange = 'Месец!O2:O3';
    const pinLimitUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(pinLimitRange)}?key=${apiKey}`;
    const pinLimitRes = await fetch(pinLimitUrl);
    const pinLimitData = await pinLimitRes.json();
    const pinLimitValues = pinLimitData.values || [];

    const pinLimit = parseInt(pinLimitValues?.[0]?.[0]) || 0;
    const pinLimitEnabled = pinLimitValues?.[1]?.[0]?.toLowerCase() === 'true';

    // 5. Деактивирани дни (TRUE = активен, FALSE = неактивен)
    const restrictionRange = 'Месец!T2:U32';
    const restrictionUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(restrictionRange)}?key=${apiKey}`;
    const restrictionRes = await fetch(restrictionUrl);
    const restrictionData = await restrictionRes.json();
    const restrictionRows = restrictionData.values || [];

    const disabledDays = restrictionRows
      .filter(r => r[1]?.toLowerCase() !== 'true')
      .map(r => parseInt(r[0]))
      .filter(n => !isNaN(n));

    return res.status(200).json({
      year, month, monthName, options,
      weights, pinLimit, pinLimitEnabled,
      disabledDays
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

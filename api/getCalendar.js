import fetch from 'node-fetch';

const monthMap = {
  'януари': 1,
  'февруари': 2,
  'март': 3,
  'април': 4,
  'май': 5,
  'юни': 6,
  'юли': 7,
  'август': 8,
  'септември': 9,
  'октомври': 10,
  'ноември': 11,
  'декември': 12
};

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.API_KEY;

  try {
    // 📅 Вземаме година и месец от A2:B2
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
    const iconUrl = '/images/Pin.png'; 

    if (isNaN(year) || !month) {
      return res.status(400).json({ error: 'Invalid calendar data' });
    }

    // ✅ Вземаме Q2:Q11 (опции) и R2:R11 (допуснати/не)
    const optionsRange = 'Месец!Q2:R11';
    const optionsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(optionsRange)}?key=${apiKey}`;
    const optionsRes = await fetch(optionsUrl);
    const optionsData = await optionsRes.json();
    const rows = optionsData.values || [];

    // 🔐 Филтрираме само позволените
    const options = rows
      .filter(row => row[1]?.toLowerCase() === 'true') // R колоната
      .map(row => row[0]) // Q колоната

    return res.status(200).json({
      year,
      month,
      monthName,
      iconUrl,
      options
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

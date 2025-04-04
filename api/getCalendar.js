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
  const range = 'Месец!A2:B2';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const values = data.values?.[0];
    if (!values || values.length < 2) {
      return res.status(400).json({ error: 'Missing calendar data' });
    }

    const year = parseInt(values[0]);
    const monthName = values[1].trim().toLowerCase();
    const month = monthMap[monthName];

    if (isNaN(year) || !month) {
      return res.status(400).json({ error: 'Invalid calendar data' });
    }

    // Връщаме календарната информация за година и месец
    return res.status(200).json({ year, month });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

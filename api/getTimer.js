import { DateTime } from 'luxon';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.API_KEY;
  const range = 'Месец!C2:D2';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const values = data.values?.[0];

    if (!values || values.length < 2) {
      return res.status(400).json({ error: 'Missing timer data' });
    }

    function parseDate(str) {
      if (str.includes('/')) {
        const [m, d, y] = str.split('/').map(Number);
        return DateTime.fromObject({ year: y, month: m, day: d }).setZone('Europe/Sofia').startOf('day').toJSDate(); // Софийско време + начало на ден
      } else if (str.includes('.')) {
        const [d, m, y] = str.split('.').map(Number);
        return DateTime.fromObject({ year: y, month: m, day: d }).setZone('Europe/Sofia').startOf('day').toJSDate(); // Софийско време + начало на ден
      }
      return null;
    }

    const start = parseDate(values[0]);
    const end = parseDate(values[1]);
    const now = DateTime.now().setZone('Europe/Sofia').startOf('minute').toJSDate(); // Текущото време в Софийско време, закръглено до минута

    if (!start || !end || isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (now < start || now > end) {
      return res.status(200).json({
        status: 'closed',
        message: 'Заявките са затворени'
      });
    }

    return res.status(200).json({
      status: 'open',
      remaining: end - now // Изчисляваме остатъчното време
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

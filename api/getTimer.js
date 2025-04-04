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
      return res.status(400).json({ error: 'Invalid timer data' });
    }

    const [m, d, y] = values[0].split('/');
    const [d2, m2, y2] = values[1].split('/');

    const start = DateTime.fromObject({ year: y, month: m, day: d }).setZone('Europe/Sofia').toJSDate();
    const end = DateTime.fromObject({ year: y2, month: m2, day: d2 }).setZone('Europe/Sofia').toJSDate();
    const now = new Date();

    if (isNaN(start) || isNaN(end)) {
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
      remaining: end - now
    });

  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

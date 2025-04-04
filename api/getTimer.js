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

    const start = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    const end = new Date(`${y2}-${m2.padStart(2, '0')}-${d2.padStart(2, '0')}`);
    const now = new Date();

    const nowUTC = new Date(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
      now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()
    );

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    if (nowUTC < start || nowUTC > end) {
      return res.status(200).json({
        status: 'closed',
        message: 'Заявките са затворени'
      });
    }

    return res.status(200).json({
      status: 'open',
      remaining: end - nowUTC
    });

  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}

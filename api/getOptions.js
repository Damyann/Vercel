import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.API_KEY;

  const ranges = {
    nights: 'Месец!E2:I3',
    shifts: 'Месец!J2:M3',
    extra: 'Месец!N3',
  };

  const makeUrl = (range) =>
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  try {
    // 1. Брой нощни
    const nightRes = await fetch(makeUrl(ranges.nights));
    const nightData = await nightRes.json();
    const nightRows = nightData.values || [[], []];

    const nightCounts = nightRows[0]
      .map((val, i) => nightRows[1]?.[i]?.toLowerCase() === 'true' ? val : null)
      .filter(v => v !== null);

    // 2. Вид смени
    const shiftRes = await fetch(makeUrl(ranges.shifts));
    const shiftData = await shiftRes.json();
    const shiftRows = shiftData.values || [[], []];

    const shiftTypes = shiftRows[0]
      .map((val, i) => shiftRows[1]?.[i]?.toLowerCase() === 'true' ? val : null)
      .filter(v => v !== null);

    // 3. Екстра смени
    const extraRes = await fetch(makeUrl(ranges.extra));
    const extraData = await extraRes.json();
    const extraEnabled = extraData.values?.[0]?.[0]?.toLowerCase() === 'true';

    return res.status(200).json({
      nightCounts,
      shiftTypes,
      extraEnabled
    });

  } catch (err) {
    console.error('getOptions error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

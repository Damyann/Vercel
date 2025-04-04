import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email } = req.body;

  // Проверка за празни полета
  if (!name || !email) {
    return res.status(200).json({ success: false, error: 'Моля, попълнете и двете полета' });
  }

  const sheetId = process.env.SHEET_ID;
  const apiKey = process.env.API_KEY;
  const range = 'Заявки!B8:C50';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const rows = data.values || [];

    const inputName = name?.trim().toLowerCase() || '';
    const inputEmail = email?.trim().toLowerCase() || '';
    const match = rows.find(row => row[0]?.trim().toLowerCase() === inputName);

    if (match && match[1]?.trim().toLowerCase() === inputEmail) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(200).json({ success: false, error: 'Грешни данни. Моля, опитайте отново!' });
    }

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Вътрешна грешка' });
  }
}

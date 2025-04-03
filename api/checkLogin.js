export default async function (req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { name, email } = req.body;
  
    if (!name || !email) {
      return res.status(400).json({ error: 'Моля, попълнете и двете полета' });
    }
  
    const sheetId = process.env.SHEET_ID;
    const apiKey = process.env.API_KEY;
    const range = 'Заявки!B8:C50';
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`;
  
    try {
      const response = await fetch(url);
      if (!response.ok) {
        return res.status(500).json({ error: 'Грешка при достъп до Google Sheets.' });
      }
  
      const data = await response.json();
      const rows = data.values || [];
  
      const inputName = name.trim().toLowerCase();
      const inputEmail = email.trim().toLowerCase();
  
      const match = rows.find(row => row[0]?.trim().toLowerCase() === inputName);
  
      if (!match || match[1]?.trim().toLowerCase() !== inputEmail) {
        return res.status(400).json({ error: 'Грешни данни. Моля, опитайте отново!' });
      }
  
      return res.status(200).json({ message: 'Вписването е успешно!' });
  
    } catch {
      return res.status(500).json({ error: 'Вътрешна грешка' });
    }
  }
  
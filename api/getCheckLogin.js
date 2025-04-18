import { google } from 'googleapis';
import { signToken } from '../lib/jwt.js';          // 🆕
import { getGoogleAuth } from '../lib/auth.js';     // ✔ остава

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Липсва име или имейл' });
  }

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.SHEET_ID;

    const { data } = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Заявки!B8:C50',
    });

    const inputName = name.trim().toLowerCase();
    const inputEmail = email.trim().toLowerCase();

    const match = (data.values || []).find(
      r => r[0]?.trim().toLowerCase() === inputName &&
           r[1]?.trim().toLowerCase() === inputEmail
    );

    if (match) {
      // 🆕  подписан JWT вместо in‑memory session
      const token = signToken({ user: inputName });
      return res.status(200).json({ success: true, token });
    } else {
      return res.status(401).json({ error: 'Невалидно име или имейл' });
    }
  } catch (err) {
    console.error('getCheckLogin error:', err);
    return res.status(500).json({ error: 'Вътрешна грешка при удостоверяване' });
  }
}

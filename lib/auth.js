import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

export async function getGoogleAuth() {
  const credentials = process.env.GOOGLE_CREDENTIALS_BASE64
    ? JSON.parse(Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf8'))
    : JSON.parse(
        await fs.readFile(
          path.join(path.dirname(fileURLToPath(import.meta.url)), '../secrets/zaqvki-8d41b171a08f.json'),
          'utf8'
        )
      );

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

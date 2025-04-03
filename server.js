import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import checkLogin from './api/checkLogin.js';

dotenv.config();

const app = express();
const port = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Защитен бекенд (ще се извиква от script.js, но не е достъпен като код)
app.post('/api/checkLogin', checkLogin);

app.listen(port, () => {
  console.log(`Сървърът работи на http://localhost:${port}`);
});

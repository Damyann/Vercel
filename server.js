import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Импортираме сървърните API функции
import checkLogin from './api/checkLogin.js';
import getTimer from './api/getTimer.js';
import getCalendar from './api/getCalendar.js';
import getOptions from './api/getOptions.js';
import getSave from './api/getSave.js'; // ✅ НОВО - записване в Sheets

dotenv.config();

const app = express();
const port = 3000;

// Разпознаване на __dirname с ES-модули
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API маршрути
app.post('/api/checkLogin', checkLogin);
app.get('/api/getTimer', getTimer);
app.get('/api/getCalendar', getCalendar);
app.get('/api/getOptions', getOptions);
app.post('/api/getSave', getSave); // ✅ добавен POST маршрут

// Catch-all за SPA (Vue/React-style навигация)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Стартиране
app.listen(port, () => {
  console.log(`🚀 Сървърът работи локално на: http://localhost:${port}`);
});

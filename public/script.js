import { renderCalendar } from './calendar.js';
import { fetchPerformanceData, renderPerformanceCalendar } from './performance.js';

const preloadData = {
  calendar:    null,
  options:     null,
  timer:       null,
  performance: null
};

let timerPromise;
let calendarPromise;
let performancePromise;

const form         = document.getElementById('loginForm');
const notification = document.getElementById('notification');
const mainContent  = document.querySelector('.main-content');

// 1. При DOMContentLoaded – стартираме fetch за таймер и календар, без да променяме UI
window.addEventListener('DOMContentLoaded', () => {
  timerPromise = fetch('/api/getTimer')
    .then(res => res.json())
    .then(data => {
      preloadData.timer = data;
      sessionStorage.setItem('timerData', JSON.stringify(data));
      const el = document.getElementById('countdown-timer');
      if (data.status === 'closed') {
        el.innerHTML = data.message;
        el.classList.add('closed');
        window.closedState = true;
      } else {
        window.closedState = false;
      }
    })
    .catch(err => console.warn('Неуспешно зареждане на таймера:', err));

  calendarPromise = fetch('/api/getCalendar')
    .then(res => {
      if (!res.ok) throw new Error(res.status);
      return res.json();
    })
    .then(data => {
      preloadData.calendar = data;
      sessionStorage.setItem('calendarData', JSON.stringify(data));
    })
    .catch(err => console.warn('Неуспешно зареждане на календара:', err));
});

// 2. При submit – правим логин, изчакваме calendarPromise, стартираме pre‑fetch на performance, и после показваме панела
form.addEventListener('submit', async e => {
  e.preventDefault();

  const submitBtn = form.querySelector('.submit-button');
  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = '<img src="/images/walking.gif" class="walking-icon" alt="loading">';
  submitBtn.classList.add('loading');

  const name  = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  try {
    const res    = await fetch('/api/getCheckLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const result = await res.json();

    if (res.ok && result.token) {
      // Запазване на токена и displayName
      sessionStorage.setItem('sessionToken', result.token);
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      sessionStorage.setItem('displayName', displayName);

      // Изчакваме календара
      try {
        await calendarPromise;
      } catch {
        showNotification('Неуспешно зареждане на календара. Опитайте по-късно.');
        submitBtn.innerHTML = originalHTML;
        submitBtn.classList.remove('loading');
        return;
      }

      // Pre‑fetch на performance данните
      const userParam = sessionStorage.getItem('displayName').trim().toLowerCase();
      performancePromise = fetchPerformanceData(userParam)
        .then(data => preloadData.performance = data)
        .catch(err => console.warn('Неуспешно зареждане на performance:', err));

      // Скриваме формата и показваме After‑Login панела
      form.classList.add('slide-out');
      setTimeout(() => {
        form.style.display = 'none';
        showAfterLoginPanel(preloadData.calendar);
      }, 600);

    } else {
      showNotification(result.error || 'Невалидни данни');
      submitBtn.innerHTML = originalHTML;
      submitBtn.classList.remove('loading');
    }
  } catch (err) {
    console.error('Login error:', err);
    showNotification('Грешка при вписване.');
    submitBtn.innerHTML = originalHTML;
    submitBtn.classList.remove('loading');
  }
});

// 3. Показване на After‑Login панела
function showAfterLoginPanel(calData) {
  if (!calData) {
    showNotification('Неуспешно зареждане на календара.');
    return;
  }

  // Изчистваме main-content
  while (mainContent.firstChild) {
    mainContent.removeChild(mainContent.firstChild);
  }

  const displayName  = sessionStorage.getItem('displayName') || '';
  const greetingText = `Здравей, ${displayName}!`;

  const panel = document.createElement('div');
  panel.className = 'afterlogin-panel';
  panel.innerHTML = `
    <h2>${greetingText}</h2>
    <p>Какво ще желаете?</p>
    <div class="afterlogin-buttons">
      <button class="btn-performance">Performance</button>
      <button class="btn-calendar">Заявка</button>
    </div>
  `;
  mainContent.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('show'));

  const calBtn  = panel.querySelector('.btn-calendar');
  const perfBtn = panel.querySelector('.btn-performance');

  // Calendar бутон
  if (window.closedState) {
    calBtn.disabled = true;
    calBtn.title = 'Заявките са затворени.';
  } else {
    calBtn.addEventListener('click', () => {
      panel.remove();
      renderCalendar(
        calData.year,
        calData.month,
        calData.monthName,
        calData.options,
        calData.weights,
        calData.pinLimit,
        calData.pinLimitEnabled,
        calData.disabledDays || []
      );
    });
  }

  // Performance бутон – НЕ махаме панела, докато не е готово
  perfBtn.addEventListener('click', async () => {
    perfBtn.disabled = true;

    let perfData;
    try {
      perfData = await performancePromise;
      if (!perfData || !perfData.success) {
        throw new Error(perfData?.error || 'Грешка');
      }
    } catch {
      showNotification('Неуспешно зареждане на Performance данните.');
      perfBtn.disabled = false;
      return;
    }

    panel.remove();
    renderPerformanceCalendar(perfData);
  });
}

// 4. Fetch на опциите при натискане на „Продължи“ (summary)
document.addEventListener('click', async e => {
  if (e.target.matches('#summary-panel .submit-button')) {
    try {
      const resOpts = await fetch('/api/getOptions');
      if (resOpts.ok) {
        const optsData = await resOpts.json();
        preloadData.options = optsData;
        sessionStorage.setItem('optionsData', JSON.stringify(optsData));
      }
    } catch (err) {
      console.error('Грешка при fetch на опциите:', err);
    }
  }
});

// Помощна функция за нотификации
function showNotification(msg) {
  notification.textContent = msg;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

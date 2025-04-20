import { renderCalendar } from './calendar.js';
import { fetchPerformanceData, renderPerformanceCalendar } from './performance.js';

const preloadData = {
  calendar: null,
  options: null,
  timer: null,
  performance: null
};

let calendarPromise;
let performancePromise;

const form = document.getElementById('loginForm');
const notification = document.getElementById('notification');
const mainContent = document.querySelector('.main-content');

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

form.addEventListener('submit', async e => {
  e.preventDefault();
  const submitBtn = form.querySelector('.submit-button');
  const originalHTML = submitBtn.innerHTML;
  submitBtn.innerHTML = '<img src="/images/walking.gif" class="walking-icon" alt="loading">';
  submitBtn.classList.add('loading');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  try {
    const res = await fetch('/api/getCheckLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
    const result = await res.json();

    if (res.ok && result.token) {
      sessionStorage.setItem('sessionToken', result.token);
      const displayName = name.charAt(0).toUpperCase() + name.slice(1);
      sessionStorage.setItem('displayName', displayName);

      try {
        await calendarPromise;
      } catch {
        showNotification('Неуспешно зареждане на календара. Опитайте по-късно.');
        submitBtn.innerHTML = originalHTML;
        submitBtn.classList.remove('loading');
        return;
      }

      const userParam = displayName.trim().toLowerCase();
      performancePromise = fetchPerformanceData(userParam)
        .then(data => preloadData.performance = data)
        .catch(err => console.warn('Неуспешно зареждане на performance:', err));

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

function showAfterLoginPanel(calData) {
  if (!calData) {
    showNotification('Неуспешно зареждане на календара.');
    return;
  }

  while (mainContent.firstChild) {
    mainContent.removeChild(mainContent.firstChild);
  }

  const displayName = sessionStorage.getItem('displayName') || '';
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

  const calBtn = panel.querySelector('.btn-calendar');
  const perfBtn = panel.querySelector('.btn-performance');

  const timerData = sessionStorage.getItem('timerData');
  const isClosed = timerData ? JSON.parse(timerData).status !== 'open' : true;

  if (isClosed) {
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

  perfBtn.addEventListener('click', async () => {
    perfBtn.disabled = true;
    try {
      const res = await fetch('/api/getPerformance?period=meta');
      const meta = await res.json();
      if (!meta.success) throw new Error(meta.error || 'Грешка при зареждане');
      panel.remove();
      renderPerformanceChoicePanel(meta);
    } catch (err) {
      showNotification('Неуспешно зареждане на данни за месец');
      console.error(err);
      perfBtn.disabled = false;
    }
  });
}

function renderPerformanceChoicePanel(meta) {
  const container = document.createElement('div');
  container.id = 'performance-choose-panel';
  container.className = 'login-form';
  container.innerHTML = `
    <h2>Кой месец те вълнува?</h2>
    <div class="choose-buttons">
      <button class="choose-before-btn">${meta.beforeLabel}</button>
      <button class="choose-now-btn">${meta.nowLabel}</button>
    </div>
  `;
  mainContent.appendChild(container);
  requestAnimationFrame(() => container.classList.add('show'));

  const nowBtn = container.querySelector('.choose-now-btn');
  const beforeBtn = container.querySelector('.choose-before-btn');

  nowBtn.onclick = async () => {
    try {
      const data = await performancePromise;
      container.remove();
      renderPerformanceCalendar(data);
    } catch (err) {
      showNotification('Грешка при зареждане на performance');
      console.error(err);
    }
  };

  beforeBtn.onclick = async () => {
    try {
      const user = (sessionStorage.getItem('displayName') || '').toLowerCase();
      const data = await fetchPerformanceData(user, 'previous');
      container.remove();
      renderPerformanceCalendar(data);
    } catch (err) {
      showNotification('Грешка при зареждане на предишен месец');
      console.error(err);
    }
  };
}

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

function showNotification(msg) {
  notification.textContent = msg;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}
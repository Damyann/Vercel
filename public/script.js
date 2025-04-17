import { renderCalendar } from './calendar.js';
import { showWorkPreferencesPanel } from './options.js';

sessionStorage.clear();

const preloadData = {
  calendar: null,
  options: null,
  timer: null
};

const preloadPromises = [
  fetch('/api/getCalendar')
    .then(res => res.json())
    .then(data => {
      preloadData.calendar = data;
      sessionStorage.setItem('calendarData', JSON.stringify(data));
    })
    .catch(err => console.warn('⚠️ Грешка при зареждане на календара:', err)),

  fetch('/api/getOptions')
    .then(res => res.json())
    .then(data => {
      preloadData.options = data;
      sessionStorage.setItem('optionsData', JSON.stringify(data));
    })
    .catch(err => console.warn('⚠️ Грешка при зареждане на опциите:', err)),

  fetch('/api/getTimer')
    .then(res => res.json())
    .then(data => {
      preloadData.timer = data;
      sessionStorage.setItem('timerData', JSON.stringify(data));
    })
    .catch(err => console.warn('⚠️ Грешка при зареждане на таймера:', err))
];

const form = document.getElementById('loginForm');
const notification = document.getElementById('notification');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const submitButton = form.querySelector('.submit-button');
  const originalButtonHTML = submitButton.innerHTML;
  submitButton.innerHTML = '<img src="/images/walking.gif" class="walking-icon" alt="loading">';
  submitButton.classList.add('loading');

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  try {
    const response = await fetch('/api/checkLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      localStorage.setItem('userName', result.name);
      await Promise.all(preloadPromises);
      const calendarData = preloadData.calendar || JSON.parse(sessionStorage.getItem('calendarData'));

      form.classList.add('slide-out');

      setTimeout(() => {
        form.style.display = 'none';
        showAfterLoginPanel(result.name, calendarData);
      }, 600);

    } else if (result.error) {
      showNotification(result.error);
      submitButton.innerHTML = originalButtonHTML;
      submitButton.classList.remove('loading');
    }
  } catch (err) {
    console.error('Login error:', err);
    showNotification('Възникна грешка при изпращането.');
    submitButton.innerHTML = originalButtonHTML;
    submitButton.classList.remove('loading');
  }
});

function showAfterLoginPanel(name, calendarData) {
  const container = document.querySelector('.main-content');

  const afterBox = document.createElement('div');
  afterBox.className = 'afterlogin-panel';

  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  afterBox.innerHTML = `
    <h2>Здравей, ${nameCapitalized}!</h2>
    <p>Какво ще желаете?</p>
    <div class="afterlogin-buttons">
      <button class="btn-performance">Performance</button>
      <button class="btn-calendar">Заявка</button>
    </div>
  `;

  container.appendChild(afterBox);

  requestAnimationFrame(() => {
    afterBox.classList.add('show');
  });

  const calendarBtn = afterBox.querySelector('.btn-calendar');

  if (window.closedState) {
    calendarBtn.disabled = true;
    calendarBtn.classList.add('disabled');
    calendarBtn.title = 'Заявките са временно затворени.';
  } else {
    calendarBtn.addEventListener('click', () => {
      afterBox.remove();
      renderCalendar(
        calendarData.year,
        calendarData.month,
        name,
        calendarData.monthName,
        calendarData.options,
        calendarData.weights,
        calendarData.pinLimit,
        calendarData.pinLimitEnabled,
        calendarData.disabledDays || []
      );
    });
  }
}

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}


import { renderPerformanceCalendar } from './performance.js';

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-performance')) {
    renderPerformanceCalendar();
  }
});
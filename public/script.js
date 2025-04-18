import { renderCalendar } from './calendar.js';
import { showWorkPreferencesPanel } from './options.js';
import { renderPerformanceCalendar } from './performance.js';

const preloadData = {
  calendar: null,
  options: null
};

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
    const response = await fetch('/api/getCheckLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });

    const result = await response.json();

    if (response.ok && result.token) {
      sessionStorage.setItem('sessionToken', result.token);

      const preloadPromises = [
        fetch('/api/getCalendar', {
          headers: { Authorization: `Bearer ${result.token}` }
        })
          .then(res => res.json())
          .then(data => {
            preloadData.calendar = data;
            sessionStorage.setItem('calendarData', JSON.stringify(data));
          }),

        fetch('/api/getOptions', {
          headers: { Authorization: `Bearer ${result.token}` }
        })
          .then(res => res.json())
          .then(data => {
            preloadData.options = data;
            sessionStorage.setItem('optionsData', JSON.stringify(data));
          })
      ];

      await Promise.all(preloadPromises);
      const calendarData = preloadData.calendar || JSON.parse(sessionStorage.getItem('calendarData'));

      form.classList.add('slide-out');

      setTimeout(() => {
        form.style.display = 'none';
        showAfterLoginPanel(calendarData);
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

function showAfterLoginPanel(calendarData) {
  const container = document.querySelector('.main-content');

  const afterBox = document.createElement('div');
  afterBox.className = 'afterlogin-panel';

  afterBox.innerHTML = `
    <h2>Здравей!</h2>
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

  afterBox.querySelector('.btn-calendar').addEventListener('click', () => {
    afterBox.remove();
    renderCalendar(
      calendarData.year,
      calendarData.month,
      calendarData.monthName,
      calendarData.options,
      calendarData.weights,
      calendarData.pinLimit,
      calendarData.pinLimitEnabled,
      calendarData.disabledDays || []
    );
  });

  afterBox.querySelector('.btn-performance').addEventListener('click', () => {
    afterBox.remove();
    renderPerformanceCalendar();
  });
}

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

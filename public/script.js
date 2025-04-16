import { renderCalendar } from './calendar.js';
import { showWorkPreferencesPanel } from './options.js';

sessionStorage.clear();

// 📥 Предварително зареждаме ВСИЧКИ нужни данни от Google Sheets
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

  if (window.closedState) {
    const timer = document.getElementById('countdown-timer');
    timer.classList.add('flash');
    setTimeout(() => timer.classList.remove('flash'), 800);
    showNotification('Не се опитвай да изпращаш заявка извън указаното време.');
    return;
  }

  const submitButton = form.querySelector('.submit-button');
  const originalButtonHTML = submitButton.innerHTML;
  submitButton.innerHTML = '<div class="walking-icon"></div>';
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

      // 🕒 Изчакваме ВСИЧКИ preload заявки да са завършили
      await Promise.all(preloadPromises);

      const calendarData = preloadData.calendar || JSON.parse(sessionStorage.getItem('calendarData'));

      if (calendarData && calendarData.year && calendarData.month) {
        const existingCalendar = document.getElementById('calendar');
        if (existingCalendar) existingCalendar.remove();

        setTimeout(() => {
          form.style.display = 'none';
          renderCalendar(
            calendarData.year,
            calendarData.month,
            result.name,
            calendarData.monthName,
            calendarData.options,
            calendarData.weights,
            calendarData.pinLimit,
            calendarData.pinLimitEnabled,
            calendarData.disabledDays || []
          );
        }, 1500);
        
      } else {
        showNotification('Грешка при зареждането на календара.');
        submitButton.innerHTML = originalButtonHTML;
        submitButton.classList.remove('loading');
      }
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

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

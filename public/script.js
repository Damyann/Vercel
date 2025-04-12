import { renderCalendar } from './calendar.js';
import { showWorkPreferencesPanel } from './options.js';

// Изчистваме sessionStorage при зареждане на страницата
sessionStorage.clear();

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
  const originalButtonText = submitButton.textContent;
  submitButton.textContent = 'Вписваване';
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
      localStorage.setItem('userName', name); 

      form.style.display = 'none';

      const existingCalendar = document.getElementById('calendar');
      if (existingCalendar) existingCalendar.remove();

      const res = await fetch('/api/getCalendar');
      const calendarData = await res.json();

      if (res.ok) {
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
      } else if (calendarData.error) {
        showNotification(calendarData.error);
      }
    } else if (result.error) {
      showNotification(result.error);
      submitButton.textContent = originalButtonText;
      submitButton.classList.remove('loading');
    }
  } catch {
    showNotification('Възникна грешка при изпращането.');
    submitButton.textContent = originalButtonText;
    submitButton.classList.remove('loading');
  }
});

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

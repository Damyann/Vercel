import { renderCalendar } from './calendar.js';

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
      form.style.display = 'none';

      // Премахваме стария календар, ако съществува
      const existingCalendar = document.getElementById('calendar');
      if (existingCalendar) {
        existingCalendar.remove();
      }

      // Получаваме календара от API-то
      const res = await fetch('/api/getCalendar');
      const calendarData = await res.json();

      if (res.ok) {
        // Проверяваме, ако вече има рендериран календар, не добавяме нов
        const existingCalendarCheck = document.getElementById('calendar');
        if (!existingCalendarCheck) {
          renderCalendar(calendarData.year, calendarData.month, name);
        }
      } else if (calendarData.error) {
        showNotification(calendarData.error);
      }
    } else if (result.error) {
      showNotification(result.error);
    }
  } catch {
    showNotification('Възникна грешка при изпращането.');
  }
});

function showNotification(message) {
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

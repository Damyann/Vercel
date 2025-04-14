// Функция за създаване на колоните с опции
import { renderCalendar } from './calendar.js';

let isPanelTransitioning = false;

function createOptionColumn(title, optionValues, group) {
  let html = `<div class="option-column"><h3>${title}</h3><div class="option-list">`;

  for (const opt of optionValues) {
    const id = `${group}-${opt}`;
    html += `
      <input type="radio" name="${group}" id="${id}" value="${opt}">
      <label for="${id}">${opt}</label>
    `;
  }

  html += '</div></div>';
  return html;
}

// Главната функция за показване на панела с опции
export async function showWorkPreferencesPanel(userName) {
  if (document.getElementById('work-preferences-panel') || isPanelTransitioning) {
    return;
  }

  isPanelTransitioning = true;

  const response = await fetch('/api/getOptions');
  const options = await response.json();

  const container = document.querySelector('.main-content');
  const oldCalendar = document.getElementById('calendar');
  const oldSummary = document.getElementById('summary-panel');

  if (oldCalendar) oldCalendar.classList.add('slide-out-left');
  if (oldSummary) oldSummary.classList.add('slide-out-left');

  const panel = document.createElement('div');
  panel.id = 'work-preferences-panel';
  panel.classList.add('slide-in');

  const nameCapitalized = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();

  panel.innerHTML = `
    <h2>Здравей, ${nameCapitalized}!</h2>
    <p>Моля изберете начина си на работа.</p>
    <div class="options-columns">
      ${createOptionColumn('Брой нощни:', options.nightCounts, 'night')}
      ${createOptionColumn('Вид смени:', options.shiftTypes, 'shift')}
      ${options.extraEnabled ? createOptionColumn('Екстра смени:', ['Да', 'Не'], 'extra') : ''}
    </div>
    <div class="options-buttons">
      <button class="back-button">Назад</button>
      <button class="swap-button">Изпрати</button>
    </div>
  `;

  container.appendChild(panel);

  const backButton = panel.querySelector('.back-button');
  const continueButton = panel.querySelector('.swap-button');

  backButton.addEventListener('click', () => {
    if (isPanelTransitioning) return;
    isPanelTransitioning = true;

    const selectedOptions = {
      night: document.querySelector('input[name="night"]:checked')?.value,
      shift: document.querySelector('input[name="shift"]:checked')?.value,
      extra: document.querySelector('input[name="extra"]:checked')?.value
    };

    panel.classList.add('slide-out-left');

    const handleAnimationEnd = () => {
      panel.remove();
      const cachedCalendarData = sessionStorage.getItem('calendarData');

      if (cachedCalendarData) {
        const calendarData = JSON.parse(cachedCalendarData);

        const calendarContainer = document.createElement('div');
        calendarContainer.id = 'calendar';
        calendarContainer.classList.add('slide-in');
        document.querySelector('.main-content').appendChild(calendarContainer);

        renderCalendar(
          calendarData.year,
          calendarData.month,
          userName,
          calendarData.monthName,
          calendarData.options,
          calendarData.weights,
          calendarData.pinLimit,
          calendarData.pinLimitEnabled,
          calendarData.disabledDays || []
        );

        sessionStorage.setItem('selectedOptions', JSON.stringify(selectedOptions));
      } else {
        fetch('/api/getCalendar')
          .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
          })
          .then(calendarData => {
            sessionStorage.setItem('calendarData', JSON.stringify(calendarData));

            const calendarContainer = document.createElement('div');
            calendarContainer.id = 'calendar';
            calendarContainer.classList.add('slide-in');
            document.querySelector('.main-content').appendChild(calendarContainer);

            renderCalendar(
              calendarData.year,
              calendarData.month,
              userName,
              calendarData.monthName,
              calendarData.options,
              calendarData.weights,
              calendarData.pinLimit,
              calendarData.pinLimitEnabled,
              calendarData.disabledDays || []
            );

            sessionStorage.setItem('selectedOptions', JSON.stringify(selectedOptions));
          })
          .catch(error => {
            console.error('Error:', error);
            showNotification('Възникна грешка при зареждането на календара.');
          });
      }

      isPanelTransitioning = false;
    };

    panel.addEventListener('animationend', handleAnimationEnd, { once: true });
    setTimeout(handleAnimationEnd, 500);
  });

  continueButton.addEventListener('click', async () => {
    if (isPanelTransitioning) return;
    isPanelTransitioning = true;

    const calendarSelections = JSON.parse(sessionStorage.getItem('calendarSelections') || '{}');
    const name = localStorage.getItem('userName');

    if (!name) {
      showNotification('Липсва потребителско име. Опитайте отново.');
      isPanelTransitioning = false;
      return;
    }

    try {
      const res = await fetch('/api/getSave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, calendarSelections })
      });

      const result = await res.json();
      if (result.success) {
        showNotification('Успешно записано!', 'success');
      } else {
        showNotification(result.error || 'Грешка при запис.');
      }
    } catch (err) {
      console.error('save error:', err);
      showNotification('Възникна грешка при свързване със сървъра.');
    }

    isPanelTransitioning = false;
  });

  if (oldCalendar) oldCalendar.remove();
  if (oldSummary) oldSummary.remove();

  isPanelTransitioning = false;
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  setTimeout(() => notification.className = 'notification', 3000);
}

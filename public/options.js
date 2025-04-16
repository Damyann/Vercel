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

export async function showWorkPreferencesPanel(userName) {
  if (document.getElementById('work-preferences-panel') || isPanelTransitioning) return;
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
          .then(res => res.json())
          .then(calendarData => {
            sessionStorage.setItem('calendarData', JSON.stringify({
              ...calendarData,
              disabledDays: calendarData.disabledDays || []
            }));
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
          .catch(() => showNotification('Възникна грешка при зареждането на календара.'));
      }

      isPanelTransitioning = false;
    };

    panel.addEventListener('animationend', handleAnimationEnd, { once: true });
    setTimeout(handleAnimationEnd, 500);
  });

  continueButton.addEventListener('click', async () => {
    if (isPanelTransitioning) return;
    isPanelTransitioning = true;

    const nightSelected = document.querySelector('input[name="night"]:checked');
    const shiftSelected = document.querySelector('input[name="shift"]:checked');

    if (!nightSelected || !shiftSelected) {
      showNotification('Моля изберете Брой нощни и Вид смени преди да продължите.', 'error');
      isPanelTransitioning = false;
      return;
    }

    const calendarSelections = JSON.parse(sessionStorage.getItem('calendarSelections') || '{}');
    calendarSelections.nightCount = nightSelected.value;
    calendarSelections.shiftType = shiftSelected.value;
    calendarSelections.extraShift = document.querySelector('input[name="extra"]:checked')?.value || '';

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

      await res.json();

      const calendarData = JSON.parse(sessionStorage.getItem('calendarData')) || {};
      const { monthName = '–', disabledDays = [] } = calendarData;

      const preview = document.createElement('div');
      preview.id = 'save-calendar';
      preview.classList.add('slide-in');

      const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      const month = calendarData.month || new Date().getMonth() + 1;
      const daysInMonth = new Date(new Date().getFullYear(), month, 0).getDate();

      let gridHTML = '';
      for (let i = 1; i <= daysInMonth; i++) {
        const value = calendarSelections[i] || '--';
        const isRed = calendarSelections[`pin-${i}`];
        const isLocked = disabledDays.includes(i);

        const date = new Date(new Date().getFullYear(), month - 1, i);
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;

        gridHTML += `
          <div class="save-calendar-cell${isRed ? ' red' : ''}${isLocked ? ' locked' : ''}${isWeekend ? ' weekend' : ''}">
            <div class="day">${i}</div>
            <div class="value">${value}</div>
            ${isLocked ? '<span class="lock">🔒</span>' : ''}
          </div>
        `;
      }

      preview.innerHTML = `
        <h2 class="calendar-greeting">${nameCapitalized}, Вие изпратихте следната заявка</h2>
        <div class="calendar-month-banner">
          <span class="calendar-month-name">${monthName}</span>
          <span id="calendar-limit-display" style="visibility: hidden;">&nbsp;</span>
        </div>
        <div class="save-calendar-grid">
          ${gridHTML}
        </div>
        <div class="save-footer">
          <button class="save-ok-button">ОК</button>
        </div>
      `;

      container.innerHTML = '';
      container.appendChild(preview);

      const okButton = preview.querySelector('.save-ok-button');
      okButton.addEventListener('click', () => {
        preview.remove();
        location.reload();
      });
    } catch (err) {
      console.error('Save error:', err);
      showNotification('Възникна грешка при свързване със сървъра.', 'error');
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

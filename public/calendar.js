// ✅ calendar.js
import { showWorkPreferencesPanel } from './options.js';

export function renderCalendar(year, month, userName, monthName, options, weights, pinLimit, pinLimitEnabled, disabledDays = []) {
  const container = document.createElement('div');
  container.id = 'calendar';

  const greeting = document.createElement('div');
  greeting.className = 'calendar-greeting';
  greeting.textContent = `Здравей, ${userName.charAt(0).toUpperCase() + userName.slice(1)}. Моля, изберете датите, които са от значение за Вас.`;

  const monthBanner = document.createElement('div');
  monthBanner.className = 'calendar-month-banner';

  const name = document.createElement('span');
  name.className = 'calendar-month-name';
  name.textContent = monthName;

  const pinCounter = document.createElement('span');
  pinCounter.id = 'calendar-limit-display';
  pinCounter.textContent = pinLimitEnabled ? `Важни дати: 0 / ${pinLimit}` : '';

  monthBanner.appendChild(name);
  monthBanner.appendChild(pinCounter);

  const daysInMonth = new Date(year, month, 0).getDate();
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  const updatePinCount = () => {
    const totalPinned = document.querySelectorAll('.calendar-pin-button.pinned').length;
    if (pinLimitEnabled) {
      pinCounter.textContent = `Важни дати: ${totalPinned} / ${pinLimit}`;
      pinCounter.classList.toggle('limit-reached', totalPinned >= pinLimit);
    }
  };

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    const currentDate = new Date(year, month - 1, d);
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      cell.classList.add('weekend');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = d;

    if (disabledDays.includes(d)) {
      cell.classList.add('disabled-day');
      const lock = document.createElement('div');
      lock.className = 'calendar-lock';
      lock.textContent = '🔒';
      cell.appendChild(dayNumber);
      cell.appendChild(lock);
      grid.appendChild(cell);
      continue;
    }

    const select = document.createElement('select');
    select.className = 'calendar-select';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '--';
    select.appendChild(emptyOption);
    options.forEach(optionText => {
      const option = document.createElement('option');
      option.value = optionText;
      option.textContent = optionText;
      select.appendChild(option);
    });

    const pinButton = document.createElement('button');
    pinButton.className = 'calendar-pin-button';
    pinButton.textContent = '📌';
    pinButton.dataset.pinned = 'false';

    pinButton.addEventListener('click', (e) => {
      e.preventDefault();
      const cell = pinButton.closest('.calendar-cell');
      const currentlyPinned = document.querySelectorAll('.calendar-pin-button.pinned').length;
      const isPinned = pinButton.dataset.pinned === 'true';

      if (!isPinned && pinLimitEnabled && currentlyPinned >= pinLimit) return;
      if (select.value.trim().toUpperCase() === 'PH') return;

      pinButton.dataset.pinned = isPinned ? 'false' : 'true';
      pinButton.textContent = isPinned ? '📌' : '✔';
      pinButton.classList.toggle('pinned', !isPinned);
      cell.classList.toggle('pinned-cell', !isPinned);

      updatePinCount();
    });

    select.addEventListener('change', () => {
      const value = select.value.trim().toUpperCase();
      if (value === 'PH') {
        pinButton.dataset.pinned = 'false';
        pinButton.textContent = '🔒';
        pinButton.classList.remove('pinned');
        cell.classList.remove('pinned-cell');
        updatePinCount();
      } else {
        pinButton.textContent = '📌';
      }
    });

    cell.appendChild(dayNumber);
    cell.appendChild(select);
    cell.appendChild(pinButton);
    grid.appendChild(cell);
  }

  container.appendChild(greeting);
  container.appendChild(monthBanner);
  container.appendChild(grid);
  document.querySelector('.main-content').appendChild(container);

  renderSummary({ shifts: 0, total: 0, night: 0, day: 0, vacation: 0 }, userName); // 👈 винаги показваме панела

  init(weights, userName);
  updatePinCount();
}

function getSelectedValues() {
  return Array.from(document.querySelectorAll('.calendar-cell:not(.disabled-day) .calendar-select'))
    .map(s => s.value.trim())
    .filter(v => v !== '');
}

function updateSummary(weights, userName) {
  const selected = getSelectedValues();

  let shiftSum = 0, realShifts = 0, phCount = 0;

  selected.forEach(val => {
    const normalized = val.toUpperCase();
    const weight = weights[normalized] ?? 1;
    if (normalized === 'PH') {
      shiftSum += weight;
      phCount++;
    } else {
      shiftSum += weight;
      realShifts += weight;
    }
  });

  let total = realShifts <= 22
    ? realShifts + phCount
    : 22 + (realShifts - 22) * 1.5 + phCount;

  const night = selected.filter(v => ['7+23', '15+23', '2', '23'].includes(v)).length;
  const day = selected.filter(v => ['7+15', '7+23', '7', '1', '15'].includes(v)).length;
  const vacation = selected.filter(v => ['отпуск', 'ph'].includes(v.toLowerCase())).length;

  renderSummary({ shifts: shiftSum, total, night, day, vacation }, userName);
}

function renderSummary(summary, userName) {
  const existing = document.getElementById('summary-panel');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'summary-panel';
  panel.innerHTML = `
    <div>Смени: ${summary.shifts}</div>
    <div>Нощни: ${summary.night}</div>
    <div>Отпуск: ${summary.vacation}</div>
    <div>Тотал: ${summary.total}</div>
    <div>Дневни: ${summary.day}</div>
    <div><button class="submit-button">Продължи</button></div>
  `;

  panel.querySelector('.submit-button').addEventListener('click', () => {
    showWorkPreferencesPanel(userName);
  });

  document.querySelector('.main-content').appendChild(panel);
}

function init(weights, userName) {
  setTimeout(() => {
    document.querySelectorAll('.calendar-select').forEach(select => {
      select.addEventListener('change', () => updateSummary(weights, userName));
    });
  }, 50);
}
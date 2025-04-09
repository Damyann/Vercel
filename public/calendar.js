export function renderCalendar(year, month, userName, monthName, options, weights) {
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

  monthBanner.appendChild(name);

  const daysInMonth = new Date(year, month, 0).getDate();
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

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

    // Добавяне на бутона за закрепване, който работи чрез CSS класове
    const pinButton = document.createElement('button');
    pinButton.className = 'calendar-pin-button';
    pinButton.textContent = '📌';
    pinButton.dataset.pinned = 'false';
    pinButton.addEventListener('click', (e) => {
      e.preventDefault();
      if (pinButton.dataset.pinned === 'true') {
        pinButton.dataset.pinned = 'false';
        pinButton.textContent = '📌';
        pinButton.classList.remove('pinned');
      } else {
        pinButton.dataset.pinned = 'true';
        pinButton.textContent = '✔';
        pinButton.classList.add('pinned');
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

  init(weights);
}

function getSelectedValues() {
  const selects = document.querySelectorAll('.calendar-select');
  return Array.from(selects)
    .map(s => s.value.trim())
    .filter(v => v !== '');
}

function updateSummary(weights) {
  const selected = getSelectedValues();

  let shiftSum = 0;
  let realShifts = 0;
  let phCount = 0;

  selected.forEach(val => {
    const normalized = val.trim().toUpperCase();
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

  const nightSet = new Set(['7+23', '15+23', '2', '23']);
  const night = selected.filter(v => nightSet.has(v)).length;

  const daySet = new Set(['7+15', '7+23', '7', '1', '15']);
  const day = selected.filter(v => daySet.has(v)).length;

  const vacation = selected.filter(v => {
    const val = v.toLowerCase();
    return val === 'отпуск' || val === 'ph';
  }).length;
  
  const summary = {
    shifts: Math.round(shiftSum * 100) / 100,
    total: Math.round(total * 100) / 100,
    night,
    day,
    vacation
  };

  renderSummary(summary);
}

function renderSummary(summary) {
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

  document.querySelector('.main-content').appendChild(panel);
}

function init(weights) {
  setTimeout(() => {
    document.querySelectorAll('.calendar-select').forEach(select => {
      select.addEventListener('change', () => updateSummary(weights));
    });
    updateSummary(weights);
  }, 0);
}

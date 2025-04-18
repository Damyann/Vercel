export function renderCalendar(year, month, monthName, options, weights, pinLimit, pinLimitEnabled, disabledDays = []) {
  // Премахваме евентуално стар календар
  document.getElementById('calendar')?.remove();

  const container = document.createElement('div');
  container.id = 'calendar';

  // Greeting
  const greeting = document.createElement('div');
  greeting.className = 'calendar-greeting';
  greeting.textContent = 'Моля, изберете датите, които са от значение за Вас.';

  // Header banner
  const monthBanner = document.createElement('div');
  monthBanner.className = 'calendar-month-banner';
  const nameEl = document.createElement('span');
  nameEl.className = 'calendar-month-name';
  nameEl.textContent = monthName;
  const pinCounter = document.createElement('span');
  pinCounter.id = 'calendar-limit-display';
  pinCounter.textContent = pinLimitEnabled ? `Важни дати: 0 / ${pinLimit}` : '';

  monthBanner.append(nameEl, pinCounter);

  // Grid container
  const daysInMonth = new Date(year, month, 0).getDate();
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Вземаме предишните селекции
  const saved = JSON.parse(sessionStorage.getItem('calendarSelections') || '{}');

  // Функция за ъпдейт на броя pin-ове
  function updatePinCount() {
    const pinnedCount = document.querySelectorAll('.calendar-pin-button.pinned').length;
    if (pinLimitEnabled) {
      pinCounter.textContent = `Важни дати: ${pinnedCount} / ${pinLimit}`;
      pinCounter.classList.toggle('limit-reached', pinnedCount >= pinLimit);
    }
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    const dateObj = new Date(year, month - 1, d);
    if (dateObj.getDay() === 0 || dateObj.getDay() === 6) {
      cell.classList.add('weekend');
    }

    const dayNum = document.createElement('div');
    dayNum.className = 'calendar-day-number';
    dayNum.textContent = d;

    if (disabledDays.includes(d)) {
      cell.classList.add('disabled-day');
      const lock = document.createElement('div');
      lock.className = 'calendar-lock';
      lock.textContent = '🔒';
      cell.append(dayNum, lock);
      grid.appendChild(cell);
      continue;
    }

    // Select
    const select = document.createElement('select');
    select.className = 'calendar-select';
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '--';
    select.appendChild(emptyOpt);

    options.forEach(optText => {
      const opt = document.createElement('option');
      opt.value = optText;
      opt.textContent = optText;
      select.appendChild(opt);
    });

    if (saved[d]) select.value = saved[d];

    // Pin button
    const pinBtn = document.createElement('button');
    pinBtn.className = 'calendar-pin-button';
    pinBtn.textContent = saved[`pin-${d}`] ? '✔' : '📌';
    pinBtn.dataset.pinned = saved[`pin-${d}`] ? 'true' : 'false';
    if (saved[`pin-${d}`]) {
      pinBtn.classList.add('pinned');
      cell.classList.add('pinned-cell');
    }

    pinBtn.addEventListener('click', () => {
      const isPinned = pinBtn.dataset.pinned === 'true';
      const currentPins = document.querySelectorAll('.calendar-pin-button.pinned').length;
      if (!isPinned && pinLimitEnabled && currentPins >= pinLimit) return;
      if (select.value.trim().toUpperCase() === 'PH') return;

      pinBtn.dataset.pinned = isPinned ? 'false' : 'true';
      pinBtn.textContent = isPinned ? '📌' : '✔';
      pinBtn.classList.toggle('pinned');
      cell.classList.toggle('pinned-cell');

      const sel = JSON.parse(sessionStorage.getItem('calendarSelections') || '{}');
      sel[`pin-${d}`] = !isPinned;
      sessionStorage.setItem('calendarSelections', JSON.stringify(sel));

      updatePinCount();
      updateSummary(weights);
    });

    select.addEventListener('change', () => {
      const sel = JSON.parse(sessionStorage.getItem('calendarSelections') || '{}');
      sel[d] = select.value.trim().toUpperCase();
      sessionStorage.setItem('calendarSelections', JSON.stringify(sel));
      updateSummary(weights);
    });

    cell.append(dayNum, select, pinBtn);
    grid.appendChild(cell);
  }

  container.append(greeting, monthBanner, grid);
  document.querySelector('.main-content').appendChild(container);

  updateSummary(weights);
  init(weights);
  updatePinCount();
}

function getSelectedValues() {
  return Array.from(document.querySelectorAll('.calendar-select'))
    .map(s => s.value.trim())
    .filter(v => v !== '');
}

function renderSummary({ shifts, total, night, day, vacation }) {
  document.getElementById('summary-panel')?.remove();

  const panel = document.createElement('div');
  panel.id = 'summary-panel';
  panel.style.display = 'grid';
  panel.style.gridTemplateColumns = 'repeat(3,1fr)';
  panel.style.rowGap = '20px';
  panel.style.columnGap = '10px';
  panel.style.boxSizing = 'border-box';
  panel.style.fontWeight = 'bold';

  [
    ['Смени:', shifts],
    ['Нощни:', night],
    ['Отпуск:', vacation],
    ['Тотал:', total],
    ['Дневни:', day],
  ].forEach(([label, val]) => {
    const block = document.createElement('div');
    block.textContent = `${label} ${val}`;
    panel.appendChild(block);
  });

  const btn = document.createElement('button');
  btn.className = 'submit-button';
  btn.textContent = 'Продължи';
  btn.addEventListener('click', () => import('./options.js').then(m => m.showWorkPreferencesPanel()));

  panel.appendChild(btn);
  document.querySelector('.main-content').appendChild(panel);
}

function updateSummary(weights) {
  const vals = getSelectedValues();
  let shiftSum = 0, real = 0, ph = 0;
  vals.forEach(v => {
    const w = weights[v.toUpperCase()] || 1;
    if (v.toUpperCase() === 'PH') { ph++; shiftSum += w; }
    else { real += w; shiftSum += w; }
  });
  const total = real <= 22 ? real + ph : 22 + (real - 22) * 1.5 + ph;
  const night = vals.filter(v => ['7+23','15+23','2','23'].includes(v)).length;
  const day = vals.filter(v => ['7+15','7+23','7','1','15'].includes(v)).length;
  const vacation = vals.filter(v => ['OTПУСК','PH'].includes(v.toUpperCase())).length;

  renderSummary({ shifts: shiftSum, total, night, day, vacation });
}

function init(weights) {
  setTimeout(() => {
    document.querySelectorAll('.calendar-select').forEach(s => {
      s.addEventListener('change', () => updateSummary(weights));
    });
  }, 50);
}

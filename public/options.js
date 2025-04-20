import { renderCalendar } from './calendar.js';

let isPanelTransitioning = false;

// Създаваме колоните с опции безопасно
function createOptionColumn(title, optionValues, group) {
  const container = document.createElement('div');
  container.className = 'option-column';

  const heading = document.createElement('h3');
  heading.textContent = title;
  container.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'option-list';

  for (const opt of optionValues) {
    const id = `${group}-${opt}`;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = group;
    input.id = id;
    input.value = opt;

    const label = document.createElement('label');
    label.setAttribute('for', id);
    label.textContent = opt;

    list.append(input, label);
  }

  container.appendChild(list);
  return container;
}

export async function showWorkPreferencesPanel() {
  if (document.getElementById('work-preferences-panel') || isPanelTransitioning) return;
  isPanelTransitioning = true;

  // Викаме публично endpoint-а без Authorization header
  const resOptions = await fetch('/api/getOptions');
  const options = await resOptions.json();

  const container = document.querySelector('.main-content');
  const oldCalendar = document.getElementById('calendar');
  const oldSummary = document.getElementById('summary-panel');

  oldCalendar?.classList.add('slide-out-left');
  oldSummary?.classList.add('slide-out-left');

  const panel = document.createElement('div');
  panel.id = 'work-preferences-panel';
  panel.classList.add('slide-in');

  const title = document.createElement('h2');
  title.textContent = 'Здравей!';
  const prompt = document.createElement('p');
  prompt.textContent = 'Моля изберете начина си на работа.';

  const columns = document.createElement('div');
  columns.className = 'options-columns';
  columns.append(
    createOptionColumn('Брой нощни:', options.nightCounts, 'night'),
    createOptionColumn('Вид смени:', options.shiftTypes, 'shift'),
    ...(options.extraEnabled
      ? [createOptionColumn('Екстра смени:', ['Да', 'Не'], 'extra')]
      : [])
  );

  const btnRow = document.createElement('div');
  btnRow.className = 'options-buttons';
  const backBtn = document.createElement('button');
  backBtn.className = 'back-button';
  backBtn.textContent = 'Назад';
  const sendBtn = document.createElement('button');
  sendBtn.className = 'swap-button';
  sendBtn.textContent = 'Изпрати';
  btnRow.append(backBtn, sendBtn);

  panel.append(title, prompt, columns, btnRow);
  container.appendChild(panel);

  backBtn.addEventListener('click', () => {
    // валидация за "Назад"
    isPanelTransitioning = false;
  });

  sendBtn.addEventListener('click', async () => {
    const token = sessionStorage.getItem('sessionToken'); // нужно само за getSave

    // Валидация на избор
    const nightVal = document.querySelector('input[name="night"]:checked')?.value;
    const shiftVal = document.querySelector('input[name="shift"]:checked')?.value;
    if (!nightVal || !shiftVal) {
      showNotification('Моля изберете Брой нощни и Вид смени преди да продължите.', 'error');
      return;
    }

    // Подготвяме обект със селекциите
    const calendarSelections = JSON.parse(sessionStorage.getItem('calendarSelections') || '{}');
    calendarSelections.nightCount = nightVal;
    calendarSelections.shiftType = shiftVal;
    calendarSelections.extraShift = document.querySelector('input[name="extra"]:checked')?.value || '';

    try {
      // Записваме в бекенд (тук все още е с Authorization)
      const res = await fetch('/api/getSave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ calendarSelections })
      });
      await res.json();

      // Изчистване на cache-a на селекциите
      sessionStorage.removeItem('calendarSelections');
      sessionStorage.removeItem('selectedOptions');

      // Зареждаме metadata за preview
      const calendarData = JSON.parse(sessionStorage.getItem('calendarData') || '{}');
      const monthName = calendarData.monthName || '–';
      const disabledDays = calendarData.disabledDays || [];
      const daysInMonth = new Date(calendarData.year, calendarData.month, 0).getDate();

      // Създаваме preview контейнера
      const preview = document.createElement('div');
      preview.id = 'save-calendar';
      preview.classList.add('slide-in');

      // Heading
      const heading = document.createElement('h2');
      heading.className = 'calendar-greeting';
      heading.textContent = 'Вие изпратихте следната заявка';

      // Banner
      const banner = document.createElement('div');
      banner.className = 'calendar-month-banner';
      const mName = document.createElement('span');
      mName.className = 'calendar-month-name';
      mName.textContent = monthName;
      banner.appendChild(mName);

      // Grid
      const grid = document.createElement('div');
      grid.className = 'save-calendar-grid';

      for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'save-calendar-cell';

        // Уикенд
        const date = new Date(calendarData.year, calendarData.month - 1, i);
        if (date.getDay() === 0 || date.getDay() === 6) {
          cell.classList.add('weekend');
        }

        // Заключени дни
        if (disabledDays.includes(i)) {
          cell.classList.add('locked');
        }

        // Пиннати (червено)
        const isPinned = calendarSelections[`pin-${i}`];
        const hasValue = calendarSelections[i] && calendarSelections[i] !== '--';
        if (isPinned && hasValue) {
          cell.classList.add('red');
        }

        const dayEl = document.createElement('div');
        dayEl.className = 'day';
        dayEl.textContent = i;

        const valEl = document.createElement('div');
        valEl.className = 'value';
        valEl.textContent = calendarSelections[i] || '--';

        if (disabledDays.includes(i)) {
          const lockIcon = document.createElement('span');
          lockIcon.className = 'lock';
          lockIcon.textContent = '🔒';
          cell.append(dayEl, valEl, lockIcon);
        } else {
          cell.append(dayEl, valEl);
        }

        grid.appendChild(cell);
      }

      // Footer с OК бутон
      const footer = document.createElement('div');
      footer.className = 'save-footer';
      const okBtn = document.createElement('button');
      okBtn.className = 'save-ok-button';
      okBtn.textContent = 'ОК';
      footer.appendChild(okBtn);

      // Сглобяване на preview
      preview.append(heading, banner, grid, footer);
      container.innerHTML = '';
      container.append(preview, createOptionsSummary(calendarSelections));

      // ОК бутон рестарт
      okBtn.addEventListener('click', () => {
        sessionStorage.clear();
        location.reload();
      });

    } catch (err) {
      showNotification('Възникна грешка при свързване със сървъра.', 'error');
    }

    isPanelTransitioning = false;
  });

  oldCalendar?.remove();
  oldSummary?.remove();
  isPanelTransitioning = false;
}

function createOptionsSummary(calendarSelections) {
  const optionsPanel = document.createElement('div');
  optionsPanel.id = 'save-options';
  optionsPanel.className = 'save-options-panel';

  const row = document.createElement('div');
  row.className = 'save-options-row';

  [['Брой нощни:', calendarSelections.nightCount],
   ['Вид смени:', calendarSelections.shiftType],
   ['Екстра смени:', calendarSelections.extraShift]]
    .forEach(([labelText, val]) => {
      const block = document.createElement('div');
      block.className = 'save-options-block';
      const label = document.createElement('div');
      label.className = 'label';
      label.textContent = labelText;
      const value = document.createElement('div');
      value.className = 'value';
      value.textContent = val || '-';
      block.append(label, value);
      row.appendChild(block);
    });

  optionsPanel.appendChild(row);
  return optionsPanel;
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  setTimeout(() => (notification.className = 'notification'), 3000);
}

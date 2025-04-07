export function renderCalendar(year, month, userName, monthName, iconUrl, options) {
  const container = document.createElement('div');
  container.id = 'calendar';

  const greeting = document.createElement('div');
  greeting.className = 'calendar-greeting';
  greeting.textContent = `Здравей, ${userName.charAt(0).toUpperCase() + userName.slice(1)}. Моля, изберете датите, които са от значение за Вас.`;

  // Месец + икона
  const monthBanner = document.createElement('div');
  monthBanner.className = 'calendar-month-banner';

  const pin = document.createElement('img');
  pin.src = iconUrl;
  pin.alt = 'икона';
  pin.className = 'calendar-month-pin';

  const name = document.createElement('span');
  name.className = 'calendar-month-name';
  name.textContent = monthName;

  monthBanner.appendChild(pin);
  monthBanner.appendChild(name);

  // Създаваме дните с падащо меню
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

    // Цифрата на деня
    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = d;

    // Създаваме падащото меню
    const select = document.createElement('select');
    select.className = 'calendar-select';

    // Добавяме празна опция по подразбиране
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '--';
    select.appendChild(emptyOption);

    // Добавяме реалните опции
    options.forEach(optionText => {
      const option = document.createElement('option');
      option.value = optionText;
      option.textContent = optionText;
      select.appendChild(option);
    });

    cell.appendChild(dayNumber);
    cell.appendChild(select);
    grid.appendChild(cell);
  }

  container.appendChild(greeting);
  container.appendChild(monthBanner);
  container.appendChild(grid);
  document.querySelector('.main-content').appendChild(container);
}

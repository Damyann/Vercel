export function renderCalendar(year, month, userName) {
    const container = document.createElement('div');
    container.id = 'calendar';
    container.style.marginTop = '10px';
    container.style.padding = '10px 5px';
  
    const greeting = document.createElement('div');
    greeting.className = 'calendar-greeting';
  
    const nameCapitalized = userName.charAt(0).toUpperCase() + userName.slice(1);
    greeting.textContent = `Здравей, ${nameCapitalized}. Моля, изберете датите, които са от значение за Вас.`;
  
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
  
      cell.textContent = d;
      grid.appendChild(cell);
    }
  
    container.appendChild(greeting);
    container.appendChild(grid);
    document.querySelector('.main-content').appendChild(container);
  }
  
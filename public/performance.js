export async function renderPerformanceCalendar() {
  try {
    const res = await fetch('/api/getPerformance', {
      headers: {
        'x-user-name': localStorage.getItem('userName') || '',
      }
    });

    const data = await res.json();

    if (!data.success) {
      alert('❌ Грешка при зареждане на календара.');
      return;
    }

    const { monthName, daysInMonth, score, isTopRanked } = data;

    const container = document.querySelector('.main-content');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'performance-calendar';

    // Заглавие
    const heading = document.createElement('h2');
    heading.className = 'performance-greeting';
    heading.textContent = 'Performance';

    // Банер
    const banner = document.createElement('div');
    banner.className = 'performance-month-banner';

    // Месец
    const monthEl = document.createElement('span');
    monthEl.className = 'performance-month-name';
    monthEl.textContent = monthName;

    // Точки
    const scoreEl = document.createElement('span');
    scoreEl.className = 'performance-score-badge';

    // Добавяме купа ако е в класирането
    if (isTopRanked) {
      scoreEl.innerHTML = '🏆 ' + (score ?? '');
    } else {
      scoreEl.textContent = score ?? '';
    }

    // Банер сборка
    banner.appendChild(monthEl);
    banner.appendChild(scoreEl);

    // Календар
    const grid = document.createElement('div');
    grid.className = 'performance-grid';

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'performance-cell';

      const number = document.createElement('div');
      number.className = 'performance-day-number';
      number.textContent = d;

      cell.appendChild(number);
      grid.appendChild(cell);
    }

    wrapper.appendChild(heading);
    wrapper.appendChild(banner);
    wrapper.appendChild(grid);
    container.appendChild(wrapper);

  } catch (err) {
    console.error('⚠️ Грешка при renderPerformanceCalendar:', err);
  }
}

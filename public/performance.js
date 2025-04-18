export async function renderPerformanceCalendar() {
  try {
    const token = sessionStorage.getItem('sessionToken');

    const res = await fetch('/api/getPerformance', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (!data.success) {
      alert('❌ Грешка при зареждане на календара.');
      return;
    }

    const { monthName, daysInMonth, score, medalType, finalScore, dailyValues } = data;

    const container = document.querySelector('.main-content');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'performance-calendar';

    const heading = document.createElement('h2');
    heading.className = 'performance-greeting';
    heading.textContent = 'Performance';

    const banner = document.createElement('div');
    banner.className = 'performance-month-banner';

    const monthEl = document.createElement('span');
    monthEl.className = 'performance-month-name';
    monthEl.textContent = monthName;

    const scoreEl = document.createElement('span');
    scoreEl.className = 'performance-score-badge';

    let medalSrc = '';
    if (medalType === 'gold') medalSrc = '/images/golden-medal.svg';
    else if (medalType === 'silver') medalSrc = '/images/silver-medal.svg';

    if (medalSrc) {
      scoreEl.innerHTML = `<img src="${medalSrc}" alt="Медал" class="medal-icon"> ${score ?? ''} т.`;
    } else {
      scoreEl.textContent = `${score ?? ''} т.`;
    }

    const adjustedEl = document.createElement('span');
    adjustedEl.className = 'performance-score-badge';
    adjustedEl.textContent = `${Math.round(finalScore)} лв`;

    banner.appendChild(monthEl);
    banner.appendChild(scoreEl);
    banner.appendChild(adjustedEl);

    const grid = document.createElement('div');
    grid.className = 'performance-grid';

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'performance-cell';

      const number = document.createElement('div');
      number.className = 'performance-day-number';
      number.textContent = d;

      const dataEl = document.createElement('div');
      dataEl.className = 'performance-day-data';
      const rawValue = dailyValues?.[d - 1];
      dataEl.textContent = rawValue && rawValue !== '' ? rawValue : '--';

      cell.appendChild(number);
      cell.appendChild(dataEl);
      grid.appendChild(cell);
    }

    wrapper.appendChild(heading);
    wrapper.appendChild(banner);
    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  } catch (err) {
    console.error('⚠️ renderPerformanceCalendar error:', err);
  }
}

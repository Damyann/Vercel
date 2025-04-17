/**
 * Рендира месечния performance‑календар
 * – взема данни от /api/getPerformance
 * – показва златен, сребърен или без медал според ранга
 */
export async function renderPerformanceCalendar() {
  try {
    /* ─────────────────── API заявка ─────────────────── */
    const res = await fetch('/api/getPerformance', {
      headers: {
        'x-user-name': localStorage.getItem('userName') || '',
      },
    });

    const data = await res.json();
    if (!data.success) {
      alert('❌ Грешка при зареждане на календара.');
      return;
    }

    const { monthName, daysInMonth, score, medalType } = data;

    /* ────────────────── Подготовка на DOM ────────────────── */
    const container = document.querySelector('.main-content');
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.id = 'performance-calendar';

    /* Заглавие */
    const heading = document.createElement('h2');
    heading.className = 'performance-greeting';
    heading.textContent = 'Performance';

    /* Банер с месец + точки */
    const banner = document.createElement('div');
    banner.className = 'performance-month-banner';

    const monthEl = document.createElement('span');
    monthEl.className = 'performance-month-name';
    monthEl.textContent = monthName;

    const scoreEl = document.createElement('span');
    scoreEl.className = 'performance-score-badge';

    /* ───── Медал според класа ───── */
    let medalSrc = '';
    if (medalType === 'gold') {
      medalSrc = '/images/golden-medal.svg';
    } else if (medalType === 'silver') {
      medalSrc = '/images/silver-medal.svg';
    }

    if (medalSrc) {
      scoreEl.innerHTML =
        `<img src="${medalSrc}" alt="Медал" class="medal-icon"> ` +
        `${score ?? ''} т.`;
    } else {
      scoreEl.textContent = `${score ?? ''} т.`;
    }

    /* Сглобяване на банера */
    banner.appendChild(monthEl);
    banner.appendChild(scoreEl);

    /* Календарна решетка */
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

    /* Финален рендер */
    wrapper.appendChild(heading);
    wrapper.appendChild(banner);
    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  } catch (err) {
    console.error('⚠️ renderPerformanceCalendar error:', err);
  }
}

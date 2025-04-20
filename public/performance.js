export async function fetchPerformanceData(userParam, period = 'now') {
  const url = `/api/getPerformance?user=${encodeURIComponent(userParam)}${period === 'previous' ? '&period=previous' : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Неуспешно зареждане на данните');
  }
  return data;
}

export function renderPerformanceCalendar(data) {
  const {
    monthName,
    daysInMonth,
    score,
    medalType,
    finalScore,
    dailyValues
  } = data;

  const container = document.querySelector('.main-content');
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'performance-calendar';

  const h2 = document.createElement('h2');
  h2.className = 'performance-greeting';
  h2.textContent = 'Performance';
  wrapper.appendChild(h2);

  const banner = document.createElement('div');
  banner.className = 'performance-month-banner';

  const monthEl = document.createElement('span');
  monthEl.className = 'performance-month-name';
  monthEl.textContent = monthName;
  banner.appendChild(monthEl);

  const scoreEl = document.createElement('span');
  scoreEl.className = 'performance-score-badge';
  if (medalType === 'gold' || medalType === 'silver') {
    const img = document.createElement('img');
    img.src = medalType === 'gold'
      ? '/images/golden-medal.svg'
      : '/images/silver-medal.svg';
    img.alt = 'Медал';
    img.className = 'medal-icon';
    scoreEl.appendChild(img);
  }
  scoreEl.appendChild(document.createTextNode(` ${score} т.`));
  banner.appendChild(scoreEl);

  const finalEl = document.createElement('span');
  finalEl.className = 'performance-score-badge';
  finalEl.textContent = `${Math.round(finalScore)} лв`;
  banner.appendChild(finalEl);

  wrapper.appendChild(banner);

  const grid = document.createElement('div');
  grid.className = 'performance-grid';

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'performance-cell';

    const num = document.createElement('div');
    num.className = 'performance-day-number';
    num.textContent = d;
    cell.appendChild(num);

    const val = document.createElement('div');
    val.className = 'performance-day-data';
    val.textContent = dailyValues[d - 1] || '--';
    cell.appendChild(val);

    grid.appendChild(cell);
  }

  wrapper.appendChild(grid);
  container.appendChild(wrapper);
}

/**
 * performance.js
 * 
 * Този файл разделя fetch и render на два метода:
 *  - fetchPerformanceData(user)   – прави заявка към /api/getPerformance?user=...
 *  - renderPerformanceCalendar(data) – рендерира календара веднага от вече заредените данни
 */

/**
 * Заявка за данните за performance.
 * @param {string} userParam – потребителското име (малки букви)
 * @returns {Promise<object>} – JSON от API-то, или хвърля грешка
 */
export async function fetchPerformanceData(userParam) {
  const res = await fetch(`/api/getPerformance?user=${encodeURIComponent(userParam)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Неуспешно зареждане на данните');
  }
  return data;
}

/**
 * Рендерира performance календара спрямо вече заредените data.
 * @param {object} data – обект с полета monthName, daysInMonth, score, medalType, finalScore, dailyValues
 */
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
  // Изчистваме старото съдържание без innerHTML
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'performance-calendar';

  // Заглавие
  const h2 = document.createElement('h2');
  h2.className = 'performance-greeting';
  h2.textContent = 'Performance';
  wrapper.appendChild(h2);

  // Банер
  const banner = document.createElement('div');
  banner.className = 'performance-month-banner';

  // Име на месец
  const monthEl = document.createElement('span');
  monthEl.className = 'performance-month-name';
  monthEl.textContent = monthName;
  banner.appendChild(monthEl);

  // Суров резултат + медал
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

  // Финален резултат
  const finalEl = document.createElement('span');
  finalEl.className = 'performance-score-badge';
  finalEl.textContent = `${Math.round(finalScore)} лв`;
  banner.appendChild(finalEl);

  wrapper.appendChild(banner);

  // Решетка с дни
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

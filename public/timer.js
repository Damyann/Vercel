const timerEl = document.createElement('div');
timerEl.id = 'countdown-timer';
timerEl.innerHTML = '<span class="loading">Зареждане...</span>';
document.body.appendChild(timerEl);

function formatRemaining(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / (3600 * 24));
  const h = Math.floor((s % (3600 * 24)) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}д ${h}ч ${m}м ${sec}с`;
}

window.closedState = false;

(async () => {
  try {
    const res = await fetch('/api/getTimer');
    const data = await res.json();

    if (!res.ok || data.status === 'closed') {
      window.closedState = true;
      timerEl.innerHTML = data.message || 'Заявките са затворени';
      timerEl.classList.add('closed');
      return;
    }

    let remaining = data.remaining;
    timerEl.innerHTML = 'Оставащо време:<br><span class="value">--д --ч --м --с</span>';
    const valueSpan = timerEl.querySelector('.value');

    const update = () => {
      if (remaining <= 0) {
        valueSpan.textContent = 'Времето изтече!';
        clearInterval(interval);
        window.closedState = true;
        timerEl.innerHTML = 'Заявките са затворени';
        timerEl.classList.add('closed');
      } else {
        valueSpan.textContent = formatRemaining(remaining);
        remaining -= 1000;
      }
    };

    update();
    const interval = setInterval(update, 1000);
  } catch {
    window.closedState = true;
    timerEl.innerHTML = 'Грешка при таймера';
    timerEl.classList.add('closed');
  }
})();

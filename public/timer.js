(() => {
  const timerEl = document.getElementById('countdown-timer');
  if (!timerEl) return;

  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  timerEl.innerHTML = 'Оставащо време:';
  timerEl.appendChild(valueSpan);

  function formatRemaining(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}д ${h}ч ${m}м ${sec}с`;
  }

  fetch('/api/getTimer')
    .then(res => res.json().then(data => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      sessionStorage.setItem('timerData', JSON.stringify(data));
      window.closedState = data.status !== 'open';

      if (!ok || !data || data.status !== 'open') {
        timerEl.classList.add('closed');
        timerEl.textContent = 'Заявките са затворени';
        return;
      }

      let remaining = data.remaining;
      const update = () => {
        if (remaining <= 0) {
          clearInterval(interval);
          timerEl.classList.add('closed');
          timerEl.textContent = 'Заявките са затворени';
          window.closedState = true;
        } else {
          valueSpan.textContent = formatRemaining(remaining);
          remaining -= 1000;
        }
      };

      update();
      const interval = setInterval(update, 1000);
    })
    .catch(() => {
      timerEl.classList.add('closed');
      timerEl.textContent = 'Грешка при таймера';
      window.closedState = true;
    });
})();

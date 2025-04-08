(() => {
  const timerEl = document.getElementById('countdown-timer');
  const valueSpan = timerEl.querySelector('.value');

  function formatRemaining(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / (3600 * 24));
    const h = Math.floor((s % (3600 * 24)) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}д ${h}ч ${m}м ${sec}с`;
  }

  window.closedState = false;

  fetch('/api/getTimer')
    .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
    .then(({ ok, data }) => {
      if (!ok || data.status === 'closed') {
        window.closedState = true;
        timerEl.innerHTML = data.message || 'Заявките са затворени';
        timerEl.classList.add('closed');
        return;
      }

      let remaining = data.remaining;
      valueSpan.textContent = '--д --ч --м --с';

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
    })
    .catch(() => {
      window.closedState = true;
      timerEl.innerHTML = 'Грешка при таймера';
      timerEl.classList.add('closed');
    });
})();

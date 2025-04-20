(() => {
  const timerEl = document.getElementById('countdown-timer');
  if (!timerEl) return;

  const valueSpan = timerEl.querySelector('.value');
  if (!valueSpan) return;

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
      // Ако няма период или е затворен
      if (!ok || data.status === 'closed') {
        timerEl.classList.add('closed');
        // изчистваме стария span
        valueSpan.textContent = '';
        // показваме само съобщението
        timerEl.textContent = data.message || 'Заявките са затворени';
        return;
      }

      // статус open
      let remaining = data.remaining;
      const update = () => {
        if (remaining <= 0) {
          clearInterval(interval);
          timerEl.classList.add('closed');
          timerEl.textContent = 'Заявките са затворени';
        } else {
          valueSpan.textContent = formatRemaining(remaining);
          remaining -= 1000;
        }
      };

      // първоначален ъпдейт и стартиране на интервал
      update();
      const interval = setInterval(update, 1000);
    })
    .catch(() => {
      timerEl.classList.add('closed');
      valueSpan.textContent = '';
      timerEl.textContent = 'Грешка при таймера';
    });
})();

const form = document.getElementById('loginForm');
const notification = document.getElementById('notification');

form.addEventListener('submit', async (e) => {
  if (window.closedState) {
    e.preventDefault();

    const timer = document.getElementById('countdown-timer');
    timer.classList.add('flash');
    setTimeout(() => timer.classList.remove('flash'), 800);

    notification.textContent = 'Не се опитвай да изпращаш заявка извън указаното време.';
    notification.classList.add('show');

    setTimeout(() => notification.classList.remove('show'), 3000);
    return;
  }

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  if (!name || !email) {
    notification.textContent = 'Моля, попълнете и двете полета';
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
    return;
  }

  try {
    const response = await fetch('/api/checkLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });

    const result = await response.json();

    if (response.ok) {
      notification.textContent = result.message;
    } else {
      notification.textContent = result.error;
    }

    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  } catch {
    notification.textContent = 'Възникна грешка при изпращането.';
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
  }
});

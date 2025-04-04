const form = document.getElementById('loginForm');
const notification = document.getElementById('notification');

form.addEventListener('submit', async (e) => {
  e.preventDefault();  // Прекъсваме стандартното поведение на формата

  if (window.closedState) {
    // Ако заявките са затворени
    const timer = document.getElementById('countdown-timer');
    timer.classList.add('flash');
    setTimeout(() => timer.classList.remove('flash'), 800);

    notification.textContent = 'Не се опитвай да изпращаш заявка извън указаното време.';
    notification.classList.add('show');

    setTimeout(() => notification.classList.remove('show'), 3000);
    return;  // Спираме изпращането на формата
  }

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();

  // Проверяваме дали има попълнени полета
  if (!name || !email) {
    notification.textContent = 'Моля, попълнете и двете полета';
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
    return;  // Спираме изпращането на формата
  }

  try {
    // Изпращаме заявка за влизане
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
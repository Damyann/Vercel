document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
  
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
  
    const response = await fetch('/api/checkLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email })
    });
  
    const result = await response.json();
  
    const notification = document.getElementById('notification');
    notification.textContent = result.message || result.error || 'Възникна грешка.';
    notification.className = 'notification show ' + (response.ok ? 'success' : '');
    setTimeout(() => notification.classList.remove('show'), 3000);
  });
  
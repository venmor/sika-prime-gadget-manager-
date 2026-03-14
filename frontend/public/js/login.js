/*
 * Client‑side script for the login page.
 *
 * Handles submission of the login form, sends the credentials to the
 * backend and, on success, redirects to the inventory page. On
 * authentication failure it displays an error message to the user.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const errorEl = document.getElementById('login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.style.display = 'none';
    const username = form.querySelector('[name="username"]').value;
    const password = form.querySelector('[name="password"]').value;
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Login failed');
      }
      // On success redirect to inventory page
      window.location.href = 'index.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    }
  });
});
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
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    submitButton.disabled = true;
    const identifier = form.querySelector('[name="identifier"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier, password })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Login failed');
      }
      const data = await response.json();
      // On success redirect to inventory page
      window.location.href = data.mustChangePassword ? '/users.html?tab=password' : '/index.html';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitButton.disabled = false;
    }
  });
});

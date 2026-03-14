/*
 * Script for handling logout across the application.
 *
 * Attaches a click handler to an element with ID `logout-link`. When
 * triggered the script sends a POST request to /api/logout, clears
 * the session on the server and redirects the user back to the login
 * page. All fetch requests include credentials to ensure the session
 * cookie is transmitted.
 */

document.addEventListener('DOMContentLoaded', () => {
  const logoutLink = document.getElementById('logout-link');
  if (!logoutLink) return;
  logoutLink.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (err) {
      console.error(err);
    }
    window.location.href = 'login.html';
  });
});
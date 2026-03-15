/*
 * Shared authentication helpers for protected pages.
 *
 * Provides a small fetch wrapper that redirects to the login page on
 * unauthorized responses and wires up the logout link when present.
 */

function redirectToLogin() {
  window.location.href = '/login.html';
}

let currentUserPromise = null;

async function fetchWithAuth(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'include',
    ...options
  });

  if (response.status === 401) {
    redirectToLogin();
    throw new Error('Unauthorized');
  }

  return response;
}

async function getCurrentUser({ force = false } = {}) {
  if (!currentUserPromise || force) {
    currentUserPromise = (async () => {
      const response = await fetchWithAuth('/api/session');
      if (!response.ok) {
        throw new Error('Failed to fetch current session');
      }

      const data = await response.json();
      return data.user;
    })();
  }

  return currentUserPromise;
}

window.appAuth = {
  fetchWithAuth,
  getCurrentUser,
  redirectToLogin
};

document.addEventListener('DOMContentLoaded', () => {
  const logoutLink = document.getElementById('logout-link');
  if (!logoutLink) return;

  logoutLink.addEventListener('click', async (event) => {
    event.preventDefault();
    try {
      await fetchWithAuth('/api/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    redirectToLogin();
  });
});

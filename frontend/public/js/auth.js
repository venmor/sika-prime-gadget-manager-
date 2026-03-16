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

function setupKeyboardAwareViewport() {
  const body = document.body;
  if (!body) {
    return;
  }

  const visualViewport = window.visualViewport;
  let baselineHeight = visualViewport?.height || window.innerHeight;

  function isEditableField(element) {
    return Boolean(
      element
      && element.matches(
        'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select, [contenteditable="true"]'
      )
    );
  }

  function syncViewportState() {
    const currentHeight = visualViewport?.height || window.innerHeight;
    const activeElement = document.activeElement;
    const keyboardFocused = isEditableField(activeElement);

    if (!keyboardFocused) {
      baselineHeight = Math.max(baselineHeight, currentHeight);
      body.classList.remove('viewport--keyboard-open');
      return;
    }

    const keyboardOpen = baselineHeight - currentHeight > 120;
    body.classList.toggle('viewport--keyboard-open', keyboardOpen);
  }

  function resetBaseline() {
    baselineHeight = visualViewport?.height || window.innerHeight;
    syncViewportState();
  }

  window.addEventListener('focusin', () => {
    requestAnimationFrame(syncViewportState);
  });

  window.addEventListener('focusout', () => {
    window.setTimeout(resetBaseline, 120);
  });

  visualViewport?.addEventListener('resize', syncViewportState);
  window.addEventListener('orientationchange', () => {
    window.setTimeout(resetBaseline, 180);
  });
}

function setupMobileCollapsibles() {
  const drawers = Array.from(document.querySelectorAll('details[data-mobile-collapsible]'));
  if (!drawers.length) {
    return;
  }

  const mobileQuery = window.matchMedia('(max-width: 760px)');

  function syncDrawers() {
    const isMobile = mobileQuery.matches;

    drawers.forEach((drawer) => {
      if (isMobile) {
        if (!drawer.dataset.mobileCollapsedReady) {
          drawer.open = false;
          drawer.dataset.mobileCollapsedReady = 'true';
        }
        return;
      }

      drawer.open = true;
    });
  }

  syncDrawers();

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', syncDrawers);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(syncDrawers);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupKeyboardAwareViewport();
  setupMobileCollapsibles();

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

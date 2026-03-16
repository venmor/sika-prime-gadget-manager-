(() => {
  const STORAGE_KEY = 'sika-prime-theme';
  const THEMES = new Set(['light', 'dark', 'system']);
  const root = document.documentElement;
  const systemQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  function createQuickToggle({ className, target }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.dataset.themeToggle = target;
    return button;
  }

  function ensureQuickToggles() {
    const nav = document.querySelector('body > header nav');

    if (nav && !nav.querySelector('[data-theme-toggle="nav"]')) {
      nav.append(createQuickToggle({
        className: 'theme-quick-toggle theme-quick-toggle--nav',
        target: 'nav'
      }));
    }

    const loginHeader = document.querySelector('.login-card__header');

    if (loginHeader && !loginHeader.querySelector('[data-theme-toggle="login"]')) {
      loginHeader.append(createQuickToggle({
        className: 'theme-quick-toggle theme-quick-toggle--login',
        target: 'login'
      }));
    }
  }

  function getStoredPreference() {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return THEMES.has(value) ? value : 'system';
    } catch (error) {
      return 'system';
    }
  }

  function getResolvedTheme(preference) {
    if (preference === 'system') {
      return systemQuery && systemQuery.matches ? 'dark' : 'light';
    }

    return THEMES.has(preference) ? preference : 'light';
  }

  function setRootTheme(preference) {
    const resolvedTheme = getResolvedTheme(preference);
    root.dataset.themePreference = preference;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
    return resolvedTheme;
  }

  function writePreference(preference) {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch (error) {
      // Ignore storage failures and keep applying the theme for this session.
    }
  }

  function formatStatus(preference, resolvedTheme) {
    if (preference === 'system') {
      return `Following your device setting. Currently using ${resolvedTheme} mode.`;
    }

    return `${preference.charAt(0).toUpperCase()}${preference.slice(1)} mode is active on this device.`;
  }

  function getQuickToggleTarget(resolvedTheme) {
    return resolvedTheme === 'dark' ? 'light' : 'dark';
  }

  function formatQuickToggleLabel(nextTheme) {
    return nextTheme === 'dark' ? 'Use dark' : 'Use light';
  }

  function syncControls() {
    const preference = root.dataset.themePreference || getStoredPreference();
    const resolvedTheme = root.dataset.theme || getResolvedTheme(preference);
    const quickToggleTarget = getQuickToggleTarget(resolvedTheme);

    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const isActive = button.dataset.themeChoice === preference;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('[data-theme-status]').forEach((node) => {
      node.textContent = formatStatus(preference, resolvedTheme);
    });

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.dataset.nextTheme = quickToggleTarget;
      button.textContent = formatQuickToggleLabel(quickToggleTarget);
      button.setAttribute('aria-label', `Switch to ${quickToggleTarget} mode`);
      button.setAttribute('title', `Switch to ${quickToggleTarget} mode`);
      button.style.setProperty(
        '--theme-toggle-icon',
        quickToggleTarget === 'dark' ? 'var(--icon-moon)' : 'var(--icon-sun)'
      );
    });
  }

  function applyTheme(preference, { persist = true } = {}) {
    const nextPreference = THEMES.has(preference) ? preference : 'system';

    if (persist) {
      writePreference(nextPreference);
    }

    const resolvedTheme = setRootTheme(nextPreference);
    syncControls();

    window.dispatchEvent(new CustomEvent('sika-theme-change', {
      detail: {
        preference: nextPreference,
        theme: resolvedTheme
      }
    }));

    return resolvedTheme;
  }

  function bindThemeButtons() {
    ensureQuickToggles();

    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      if (button.dataset.themeBound === 'true') {
        return;
      }

      button.dataset.themeBound = 'true';
      button.addEventListener('click', () => {
        applyTheme(button.dataset.themeChoice);
      });
    });

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      if (button.dataset.themeBound === 'true') {
        return;
      }

      button.dataset.themeBound = 'true';
      button.addEventListener('click', () => {
        const preference = root.dataset.themePreference || getStoredPreference();
        const resolvedTheme = root.dataset.theme || getResolvedTheme(preference);
        applyTheme(getQuickToggleTarget(resolvedTheme));
      });
    });

    syncControls();
  }

  function handleSystemChange() {
    if ((root.dataset.themePreference || getStoredPreference()) === 'system') {
      setRootTheme('system');
      syncControls();
    }
  }

  const initialPreference = getStoredPreference();
  setRootTheme(initialPreference);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindThemeButtons, { once: true });
  } else {
    bindThemeButtons();
  }

  if (systemQuery) {
    if (typeof systemQuery.addEventListener === 'function') {
      systemQuery.addEventListener('change', handleSystemChange);
    } else if (typeof systemQuery.addListener === 'function') {
      systemQuery.addListener(handleSystemChange);
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    const nextPreference = getStoredPreference();
    setRootTheme(nextPreference);
    syncControls();
  });

  window.sikaTheme = {
    applyTheme,
    getPreference: () => root.dataset.themePreference || getStoredPreference(),
    getTheme: () => root.dataset.theme || getResolvedTheme(getStoredPreference())
  };
})();

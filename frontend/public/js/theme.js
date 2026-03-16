(() => {
  const STORAGE_KEY = 'sika-prime-theme';
  const THEMES = new Set(['light', 'dark', 'system']);
  const root = document.documentElement;
  const systemQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

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

  function syncControls() {
    const preference = root.dataset.themePreference || getStoredPreference();
    const resolvedTheme = root.dataset.theme || getResolvedTheme(preference);

    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const isActive = button.dataset.themeChoice === preference;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    document.querySelectorAll('[data-theme-status]').forEach((node) => {
      node.textContent = formatStatus(preference, resolvedTheme);
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
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      if (button.dataset.themeBound === 'true') {
        return;
      }

      button.dataset.themeBound = 'true';
      button.addEventListener('click', () => {
        applyTheme(button.dataset.themeChoice);
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

(function attachAppUtils(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.SikaPrimeAppUtils = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function normalizeText(value, fallback = '') {
    if (value == null) {
      return fallback;
    }

    const normalized = String(value).trim();
    return normalized || fallback;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function formatLabel(value, { fallback = '-' } = {}) {
    if (!value) {
      return fallback;
    }

    return String(value)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function toNumber(value, fallback = 0) {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  function formatCurrency(value, { fallback = 'K0.00', currency = 'K' } = {}) {
    const parsedValue = Number.parseFloat(value);
    return Number.isFinite(parsedValue) ? `${currency}${parsedValue.toFixed(2)}` : fallback;
  }

  function formatDate(value, { fallback = '-', locale = 'en-ZM' } = {}) {
    if (!value) {
      return fallback;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return fallback;
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(parsedDate);
  }

  function setMessage(element, type, message) {
    if (!element) {
      return;
    }

    element.hidden = false;
    element.textContent = message;
    element.className = `page-message page-message--${type}`;
  }

  function clearMessage(element) {
    if (!element) {
      return;
    }

    element.hidden = true;
    element.textContent = '';
    element.className = 'page-message';
  }

  function createMessenger(element) {
    return {
      clear() {
        clearMessage(element);
      },
      show(message, type = 'info') {
        setMessage(element, type, message);
      }
    };
  }

  async function parseErrorResponse(response, fallbackMessage) {
    try {
      const data = await response.json();
      return data?.error || fallbackMessage;
    } catch (error) {
      return fallbackMessage;
    }
  }

  function compareStrings(left, right) {
    return String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }

  function normalizeSearchValue(value) {
    return normalizeText(value).toLowerCase();
  }

  function capitalize(value) {
    const normalized = normalizeText(value);
    return normalized ? `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}` : '';
  }

  return {
    capitalize,
    clearMessage,
    compareStrings,
    createMessenger,
    escapeHtml,
    formatCurrency,
    formatDate,
    formatLabel,
    normalizeSearchValue,
    normalizeText,
    parseErrorResponse,
    setMessage,
    toNumber
  };
});

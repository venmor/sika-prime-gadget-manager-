(function attachAdCardModule(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.SikaPrimeAdCard = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function normalizeText(value) {
    if (value == null) {
      return '';
    }

    return String(value).trim();
  }

  function escapeHtml(value) {
    return normalizeText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatAdLabel(value) {
    if (!value) {
      return '';
    }

    return String(value)
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function getAdEyebrow(gadget) {
    const typeLabel = formatAdLabel(gadget.type);
    return typeLabel ? `${typeLabel} Offer` : 'Featured Gadget';
  }

  function getAdSubtitle(gadget) {
    const parts = [];

    if (gadget.brand) {
      parts.push(gadget.brand);
    }

    if (gadget.type) {
      parts.push(formatAdLabel(gadget.type));
    }

    return parts.join(' · ') || 'Sika Prime gadget offer';
  }

  function getAdSpecs(gadget) {
    const specs = [];
    const pushSpec = (label, value) => {
      const normalized = normalizeText(value);
      if (normalized) {
        specs.push({ label, value: normalized });
      }
    };

    if (gadget.type === 'laptop') {
      pushSpec('CPU', gadget.laptop_processor);
      pushSpec('RAM', gadget.laptop_ram);
      pushSpec('ROM', gadget.laptop_storage);
      pushSpec('Battery', gadget.laptop_battery_hours);
      pushSpec('GPU', gadget.laptop_graphics);
    } else if (gadget.type === 'phone') {
      pushSpec('OS', gadget.phone_os);
      pushSpec('RAM', gadget.phone_ram);
      pushSpec('Storage', gadget.phone_storage);
      pushSpec('Battery', gadget.phone_battery);
      pushSpec('Model', gadget.model);
    } else if (gadget.type === 'other') {
      pushSpec('Type', formatAdLabel(gadget.type));
      pushSpec('Details', gadget.other_specs);
    }

    if (specs.length < 4) {
      pushSpec('Type', formatAdLabel(gadget.type));
    }

    if (specs.length < 4) {
      pushSpec('Status', formatAdLabel(gadget.status));
    }

    return specs.slice(0, 4);
  }

  function getDisplayPrice(gadget) {
    if (gadget.list_price == null || gadget.list_price === '') {
      return 'Ask for price';
    }

    const parsedValue = Number.parseFloat(gadget.list_price);
    if (Number.isNaN(parsedValue)) {
      return escapeHtml(gadget.list_price);
    }

    return `K${parsedValue.toFixed(2)}`;
  }

  function buildSpecsMarkup(specs) {
    if (!specs.length) {
      return '';
    }

    return `
      <div class="card--ad__details">
        <div class="card--ad__spec-panel">
          <h4>Key Specs</h4>
          <div class="card--ad__spec-list">
            ${specs.map((spec) => `
              <div class="card--ad__spec-item">
                <span>${escapeHtml(spec.label)}</span>
                <strong>${escapeHtml(spec.value)}</strong>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function buildAdMarkup(gadget, options = {}) {
    const extraText = normalizeText(options.extraText);
    const logoSrc = normalizeText(options.logoSrc) || '/images/sika-prime-logo.png';
    const titleText = normalizeText(gadget.model) || normalizeText(gadget.name) || 'Featured Gadget';
    const subtitleText = getAdSubtitle(gadget);
    const imageSrc = normalizeText(gadget.image_path);
    const specsMarkup = buildSpecsMarkup(getAdSpecs(gadget));
    const footerMarkup = extraText
      ? `
        <div class="card--ad__footer card--ad__footer--note">
          <div class="card--ad__footer-note">${escapeHtml(extraText)}</div>
        </div>
      `
      : '';

    return `
      <div class="card--ad__shell">
        <div class="card--ad__topline">
          <div class="card--ad__eyebrow">${escapeHtml(getAdEyebrow(gadget))}</div>
          <div class="card--ad__brandlock">
            <img class="card--ad__logo" src="${escapeHtml(logoSrc)}" alt="Sika Prime Loans">
            <div class="card--ad__brandtext">Sika Prime Loans</div>
          </div>
        </div>

        <div class="card--ad__body">
          <div class="card--ad__copy">
            <div class="card--ad__headline">
              <div class="brand">${escapeHtml(titleText)}</div>
              <div class="model">${escapeHtml(subtitleText)}</div>
            </div>

            <div class="price">
              <span class="price__label">Price</span>
              <strong class="price__value">${escapeHtml(getDisplayPrice(gadget))}</strong>
            </div>

            ${specsMarkup}
          </div>

          <div class="card--ad__visual">
            ${imageSrc
              ? `
                <div class="card--ad__visual-media">
                  <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(normalizeText(gadget.name) || titleText)}">
                </div>
              `
              : `
                <div class="card--ad__visual-media card--ad__visual-media--placeholder">
                  <div class="card--ad__placeholder">Product image coming soon</div>
                </div>
              `}
          </div>
        </div>

        ${footerMarkup}
      </div>
    `;
  }

  function applyRenderedCardLayout(container) {
    if (!container?.classList) {
      return;
    }

    container.classList.remove(
      'card--ad--image-landscape',
      'card--ad--image-portrait',
      'card--ad--image-balanced'
    );

    const image = container.querySelector('.card--ad__visual img');
    if (!image) {
      return;
    }

    const syncLayoutClass = () => {
      if (!image.naturalWidth || !image.naturalHeight) {
        return;
      }

      const ratio = image.naturalWidth / image.naturalHeight;
      if (ratio >= 1.18) {
        container.classList.add('card--ad--image-landscape');
      } else if (ratio <= 0.84) {
        container.classList.add('card--ad--image-portrait');
      } else {
        container.classList.add('card--ad--image-balanced');
      }
    };

    if (image.complete) {
      syncLayoutClass();
      return;
    }

    image.addEventListener('load', syncLayoutClass, { once: true });
  }

  function renderAdCard(container, gadget, options = {}) {
    if (!container) {
      return null;
    }

    container.innerHTML = buildAdMarkup(gadget, options);
    applyRenderedCardLayout(container);
    return container.firstElementChild;
  }

  return {
    applyRenderedCardLayout,
    buildAdMarkup,
    formatAdLabel,
    getAdEyebrow,
    getAdSpecs,
    getAdSubtitle,
    getDisplayPrice,
    renderAdCard
  };
});

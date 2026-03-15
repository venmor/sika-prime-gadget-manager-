/*
 * Client-side logic for the Add Gadget form.
 *
 * The add/edit page supports three device families: PC/Laptop, Phone,
 * and Other Device. This script swaps the specification fields based on
 * the selected type, keeps the recovery summary panel updated, and saves
 * the record to the backend with FormData so uploaded images still work.
 */

document.addEventListener('DOMContentLoaded', () => {
  const { fetchWithAuth } = window.appAuth;
  const form = document.getElementById('gadget-form');
  const typeSelector = document.getElementById('type-selector');
  const specContainer = document.getElementById('spec-container');
  const messageEl = document.getElementById('form-message');
  const submitButton = form.querySelector('button[type="submit"]');
  const recoveryInput = form.querySelector('[name="cost_price"]');
  const plannedPriceInput = form.querySelector('[name="list_price"]');
  const summaryRecovery = document.getElementById('summary-recovery-target');
  const summaryListPrice = document.getElementById('summary-list-price');
  const summaryVariance = document.getElementById('summary-variance');
  const summaryVarianceLabel = document.getElementById('summary-variance-label');
  const summaryNote = document.getElementById('summary-note');
  const defaultSubmitLabel = submitButton.textContent;

  const TYPE_CONFIG = {
    laptop: {
      title: 'Laptop details',
      description: 'Add the main laptop specs.',
      fields: [
        {
          name: 'processor',
          label: 'CPU',
          placeholder: 'e.g. Intel Core i5 7th Gen'
        },
        {
          name: 'ram',
          label: 'RAM',
          placeholder: 'e.g. 16 GB'
        },
        {
          name: 'storage',
          label: 'ROM / Storage',
          placeholder: 'e.g. 512 GB SSD'
        },
        {
          name: 'battery_hours',
          label: 'Battery Hrs',
          placeholder: 'e.g. 6 hours'
        },
        {
          name: 'graphics',
          label: 'Graphics',
          placeholder: 'Optional GPU details'
        }
      ]
    },
    phone: {
      title: 'Phone details',
      description: 'Add the main phone specs.',
      fields: [
        {
          name: 'os',
          label: 'Operating System',
          placeholder: 'e.g. Android 14, iOS 17'
        },
        {
          name: 'ram',
          label: 'RAM',
          placeholder: 'e.g. 8 GB'
        },
        {
          name: 'storage',
          label: 'Phone Storage',
          placeholder: 'e.g. 256 GB'
        },
        {
          name: 'battery',
          label: 'Battery',
          placeholder: 'e.g. 5000 mAh'
        },
        {
          name: 'screen_size',
          label: 'Screen Size',
          placeholder: 'Optional display size'
        },
        {
          name: 'camera',
          label: 'Camera',
          placeholder: 'Optional camera details'
        }
      ]
    },
    other: {
      title: 'Other device details',
      description: 'Describe the key specs here.',
      fields: [
        {
          name: 'other_specs',
          label: 'Extra Specs',
          placeholder: 'List the main specs, accessories, and condition notes.',
          type: 'textarea',
          fullWidth: true
        }
      ]
    }
  };

  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');

  function showMessage(message, variant = 'info') {
    messageEl.textContent = message;
    messageEl.className = `page-message page-message--${variant}`;
    messageEl.hidden = false;
  }

  function clearMessage() {
    messageEl.hidden = true;
    messageEl.textContent = '';
    messageEl.className = 'page-message';
  }

  function formatCurrency(value) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? `K${parsed.toFixed(2)}` : 'K0.00';
  }

  function updateSummary() {
    const recovery = Number.parseFloat(recoveryInput.value);
    const plannedPrice = Number.parseFloat(plannedPriceInput.value);
    const hasRecovery = Number.isFinite(recovery);
    const hasPlannedPrice = Number.isFinite(plannedPrice);

    summaryRecovery.textContent = hasRecovery ? `K${recovery.toFixed(2)}` : 'K0.00';
    summaryListPrice.textContent = hasPlannedPrice ? `K${plannedPrice.toFixed(2)}` : 'K0.00';

    if (hasRecovery && hasPlannedPrice) {
      const variance = plannedPrice - recovery;
      const label = variance >= 0 ? 'Expected gain' : 'Expected shortfall';
      summaryVarianceLabel.textContent = label;
      summaryVariance.textContent = `${variance < 0 ? '-' : ''}K${Math.abs(variance).toFixed(2)}`;
      summaryNote.textContent = 'Final profit or loss is set when the sale is saved.';
      return;
    }

    summaryVarianceLabel.textContent = 'Difference';
    summaryVariance.textContent = 'K0.00';
    summaryNote.textContent = 'Add recovery and list price to see the difference.';
  }

  function buildField(field, value = '') {
    const wrapper = document.createElement('label');
    wrapper.className = `spec-group${field.fullWidth ? ' field-span-full' : ''}`;

    const label = document.createElement('span');
    label.textContent = field.label;
    wrapper.appendChild(label);

    let control;
    if (field.type === 'textarea') {
      control = document.createElement('textarea');
      control.rows = 5;
    } else {
      control = document.createElement('input');
      control.type = field.inputType || 'text';
    }

    control.name = field.name;
    control.placeholder = field.placeholder || '';
    control.value = value || '';
    wrapper.appendChild(control);

    if (field.hint) {
      const hint = document.createElement('span');
      hint.className = 'field-hint';
      hint.textContent = field.hint;
      wrapper.appendChild(hint);
    }

    return wrapper;
  }

  function renderSpecFields(type, gadget = null) {
    specContainer.innerHTML = '';
    if (!type || !TYPE_CONFIG[type]) {
      return;
    }

    const config = TYPE_CONFIG[type];
    const intro = document.createElement('div');
    intro.className = 'spec-intro field-span-full';

    const introTitle = document.createElement('strong');
    introTitle.textContent = config.title;
    const introText = document.createElement('p');
    introText.textContent = config.description;
    intro.appendChild(introTitle);
    intro.appendChild(introText);
    specContainer.appendChild(intro);

    config.fields.forEach((field) => {
      let value = '';
      if (gadget) {
        if (type === 'laptop') {
          value = gadget[`laptop_${field.name}`] || '';
        } else if (type === 'phone') {
          value = gadget[`phone_${field.name}`] || '';
        } else {
          value = gadget[field.name] || '';
        }
      }

      specContainer.appendChild(buildField(field, value));
    });
  }

  async function prefillForm(id) {
    try {
      clearMessage();
      const response = await fetchWithAuth(`/api/gadgets/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch gadget');
      }

      const gadget = await response.json();
      form.querySelector('[name="name"]').value = gadget.name || '';
      form.querySelector('[name="type"]').value = gadget.type || '';
      form.querySelector('[name="brand"]').value = gadget.brand || '';
      form.querySelector('[name="model"]').value = gadget.model || '';
      form.querySelector('[name="cost_price"]').value = gadget.cost_price ?? '';
      form.querySelector('[name="list_price"]').value = gadget.list_price ?? '';
      form.querySelector('[name="description"]').value = gadget.description || '';

      renderSpecFields(gadget.type, gadget);
      updateSummary();
    } catch (err) {
      if (err.message === 'Unauthorized') {
        return;
      }

      console.error(err);
      showMessage('Unable to load this gadget for editing.', 'error');
    }
  }

  typeSelector.addEventListener('change', (event) => {
    renderSpecFields(event.target.value);
  });

  recoveryInput.addEventListener('input', updateSummary);
  plannedPriceInput.addEventListener('input', updateSummary);

  if (editId) {
    prefillForm(editId);
  } else {
    renderSpecFields(typeSelector.value);
    updateSummary();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    clearMessage();

    try {
      const url = editId ? `/api/gadgets/${editId}` : '/api/gadgets';
      const method = editId ? 'PUT' : 'POST';
      const response = await fetchWithAuth(url, {
        method,
        body: formData
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save gadget');
      }

      await response.json();
      showMessage(editId ? 'Changes saved.' : 'Gadget saved.', 'success');
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 500);
    } catch (err) {
      if (err.message === 'Unauthorized') {
        return;
      }

      console.error(err);
      showMessage(err.message, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = defaultSubmitLabel;
    }
  });
});

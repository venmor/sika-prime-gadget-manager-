/*
 * Client‑side logic for the Add Gadget form.
 *
 * This script listens for changes to the gadget type select element and
 * dynamically generates specification fields for laptops or phones. When
 * the form is submitted it collects all form data, including uploaded
 * images, into a FormData object and sends it to the backend via fetch.
 */

document.addEventListener('DOMContentLoaded', () => {
  const typeSelector = document.getElementById('type-selector');
  const specContainer = document.getElementById('spec-container');
  const form = document.getElementById('gadget-form');

  // Keep track of whether we're editing an existing gadget
  const params = new URLSearchParams(window.location.search);
  const editId = params.get('id');

  // Render specification fields whenever the gadget type changes
  typeSelector.addEventListener('change', (event) => {
    const type = event.target.value;
    renderSpecFields(type);
  });

  /**
   * Clears the specification container and appends fields based on the type.
   *
   * @param {string} type - The selected gadget type.
   */
  function renderSpecFields(type) {
    specContainer.innerHTML = '';
    if (!type) return;
    let fields = [];
    if (type === 'laptop') {
      fields = [
        { name: 'processor', label: 'Processor' },
        { name: 'ram', label: 'RAM' },
        { name: 'storage', label: 'Storage' },
        { name: 'screen_size', label: 'Screen Size' },
        { name: 'graphics', label: 'Graphics' }
      ];
    } else if (type === 'phone') {
      fields = [
        { name: 'os', label: 'Operating System' },
        { name: 'ram', label: 'RAM' },
        { name: 'storage', label: 'Storage' },
        { name: 'screen_size', label: 'Screen Size' },
        { name: 'camera', label: 'Camera' },
        { name: 'battery', label: 'Battery' }
      ];
    }
    fields.forEach(field => {
      const wrapper = document.createElement('div');
      wrapper.className = 'spec-group';
      const label = document.createElement('label');
      label.textContent = field.label;
      const input = document.createElement('input');
      input.type = 'text';
      input.name = field.name;
      wrapper.appendChild(label);
      wrapper.appendChild(input);
      specContainer.appendChild(wrapper);
    });
  }

  /**
   * Prefill the form if editing an existing gadget.
   */
  async function prefillForm(id) {
    try {
      const response = await fetch(`/api/gadgets/${id}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch gadget');
      const gadget = await response.json();
      // Populate basic fields
      form.querySelector('[name="name"]').value = gadget.name || '';
      form.querySelector('[name="type"]').value = gadget.type || '';
      form.querySelector('[name="brand"]').value = gadget.brand || '';
      form.querySelector('[name="model"]').value = gadget.model || '';
      form.querySelector('[name="cost_price"]').value = gadget.cost_price || '';
      form.querySelector('[name="description"]').value = gadget.description || '';
      // Render spec fields based on type
      renderSpecFields(gadget.type);
      // Fill spec inputs
      if (gadget.type === 'laptop') {
        form.querySelector('[name="processor"]').value = gadget.laptop_processor || '';
        form.querySelector('[name="ram"]').value = gadget.laptop_ram || '';
        form.querySelector('[name="storage"]').value = gadget.laptop_storage || '';
        form.querySelector('[name="screen_size"]').value = gadget.laptop_screen_size || '';
        form.querySelector('[name="graphics"]').value = gadget.laptop_graphics || '';
      } else if (gadget.type === 'phone') {
        form.querySelector('[name="os"]').value = gadget.phone_os || '';
        form.querySelector('[name="ram"]').value = gadget.phone_ram || '';
        form.querySelector('[name="storage"]').value = gadget.phone_storage || '';
        form.querySelector('[name="screen_size"]').value = gadget.phone_screen_size || '';
        form.querySelector('[name="camera"]').value = gadget.phone_camera || '';
        form.querySelector('[name="battery"]').value = gadget.phone_battery || '';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // If editing, prefill the form
  if (editId) {
    prefillForm(editId);
  }

  // Submit handler – send form data to the backend
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      // Determine method and URL based on whether editing
      const url = editId ? `/api/gadgets/${editId}` : '/api/gadgets';
      const method = editId ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save gadget');
      }
      await response.json();
      // Redirect after success
      window.location.href = 'index.html';
    } catch (err) {
      alert(err.message);
    }
  });
});
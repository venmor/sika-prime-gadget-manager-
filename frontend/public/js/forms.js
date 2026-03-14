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

  // Submit handler – send form data to the backend
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      const response = await fetch('/api/gadgets', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save gadget');
      }
      // Optionally parse returned JSON
      await response.json();
      // Redirect back to inventory after successful creation
      window.location.href = 'index.html';
    } catch (err) {
      alert(err.message);
    }
  });
});
/*
 * JavaScript for the inventory listing page.
 *
 * Fetches gadget data from the backend, renders cards in the grid,
 * and adds interactive handlers for editing and deleting items. Also
 * supports filtering by type, status and search text.
 */

document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('gadget-list');
  const searchInput = document.getElementById('search');
  const filterType = document.getElementById('filter-type');
  const filterStatus = document.getElementById('filter-status');
  const filterBtn = document.getElementById('filter-btn');

  // Load gadgets when the page loads
  fetchGadgets();

  // Attach filter button handler
  filterBtn.addEventListener('click', () => {
    fetchGadgets();
  });

  /**
   * Fetch gadgets from the API with current filter values
   */
  async function fetchGadgets() {
    try {
      const params = new URLSearchParams();
      if (filterType.value) params.append('type', filterType.value);
      if (filterStatus.value) params.append('status', filterStatus.value);
      if (searchInput.value) params.append('search', searchInput.value.trim());
      const url = '/api/gadgets' + (params.toString() ? `?${params.toString()}` : '');
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch gadgets');
      const data = await response.json();
      renderGadgets(data);
    } catch (err) {
      console.error(err);
      alert('Unable to fetch gadgets');
    }
  }

  /**
   * Render a list of gadgets into cards
   *
   * @param {Array} gadgets
   */
  function renderGadgets(gadgets) {
    listContainer.innerHTML = '';
    if (!gadgets || gadgets.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = 'No gadgets found.';
      listContainer.appendChild(msg);
      return;
    }
    gadgets.forEach(gadget => {
      const card = document.createElement('div');
      card.className = 'card';

      // Image or placeholder
      if (gadget.image_path) {
        const img = document.createElement('img');
        img.src = gadget.image_path;
        img.alt = gadget.name;
        card.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'no-image';
        placeholder.textContent = 'No image';
        card.appendChild(placeholder);
      }

      const nameEl = document.createElement('h3');
      nameEl.textContent = gadget.name;
      card.appendChild(nameEl);

      const brandModel = document.createElement('p');
      const brand = gadget.brand || '';
      const model = gadget.model || '';
      brandModel.textContent = [brand, model].filter(Boolean).join(' ');
      card.appendChild(brandModel);

      const statusEl = document.createElement('p');
      statusEl.textContent = `Status: ${gadget.status}`;
      card.appendChild(statusEl);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'actions';
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'edit';
      editBtn.addEventListener('click', () => {
        window.location.href = `add-gadget.html?id=${gadget.id}`;
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'delete';
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this gadget?')) {
          try {
          const resp = await fetch(`/api/gadgets/${gadget.id}`, { method: 'DELETE', credentials: 'include' });
            if (!resp.ok) throw new Error('Delete failed');
            // Reload list after deletion
            fetchGadgets();
          } catch (err) {
            console.error(err);
            alert('Failed to delete gadget');
          }
        }
      });
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(actions);

      listContainer.appendChild(card);
    });
  }
});
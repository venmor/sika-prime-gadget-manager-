/*
 * JavaScript for the inventory listing page.
 *
 * Fetches gadget data from the backend, renders cards in the grid,
 * and adds interactive handlers for editing and deleting items. Also
 * supports filtering by type, status and search text.
 */

document.addEventListener('DOMContentLoaded', () => {
  const { fetchWithAuth } = window.appAuth || {};
  const { createMessenger, formatCurrency, formatLabel } = window.SikaPrimeAppUtils || {};

  if (!fetchWithAuth || !createMessenger || !formatCurrency || !formatLabel) {
    console.error('Shared app helpers are not available on the inventory page.');
    return;
  }

  const listContainer = document.getElementById('gadget-list');
  const messageEl = document.getElementById('inventory-message');
  const statTotal = document.getElementById('stat-total');
  const statAvailable = document.getElementById('stat-available');
  const statSold = document.getElementById('stat-sold');
  const statPriced = document.getElementById('stat-priced');
  const heroTotalCount = document.getElementById('hero-total-count');
  const heroAvailableCount = document.getElementById('hero-available-count');
  const heroSoldCount = document.getElementById('hero-sold-count');
  const searchInput = document.getElementById('search');
  const filterType = document.getElementById('filter-type');
  const filterStatus = document.getElementById('filter-status');
  const filterBtn = document.getElementById('filter-btn');
  const message = createMessenger(messageEl);

  function updateStats(gadgets) {
    const total = gadgets.length;
    const available = gadgets.filter((gadget) => gadget.status === 'available').length;
    const sold = gadgets.filter((gadget) => gadget.status === 'sold').length;
    const priced = gadgets.filter((gadget) => gadget.list_price != null).length;

    statTotal.textContent = String(total);
    statAvailable.textContent = String(available);
    statSold.textContent = String(sold);
    statPriced.textContent = String(priced);
    heroTotalCount.textContent = `${total} items`;
    heroAvailableCount.textContent = `${available} available`;
    heroSoldCount.textContent = `${sold} sold`;
  }

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
      message.clear();
      const params = new URLSearchParams();
      if (filterType.value) params.append('type', filterType.value);
      if (filterStatus.value) params.append('status', filterStatus.value);
      if (searchInput.value) params.append('search', searchInput.value.trim());
      const url = '/api/gadgets' + (params.toString() ? `?${params.toString()}` : '');
      const response = await fetchWithAuth(url);
      if (!response.ok) throw new Error('Failed to fetch gadgets');
      const data = await response.json();
      updateStats(data);
      renderGadgets(data);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      console.error(err);
      message.show('Unable to load gadgets right now.', 'error');
    }
  }

  /**
   * Render a list of gadgets into cards
   *
   * @param {Array} gadgets
   */
  function renderGadgets(gadgets) {
    listContainer.innerHTML = '';
    listContainer.classList.remove('card-container--empty');

    if (!gadgets || gadgets.length === 0) {
      listContainer.classList.add('card-container--empty');
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <strong>No matching gadgets</strong>
        <span>Try new filters or add one.</span>
      `;
      listContainer.appendChild(emptyState);
      return;
    }

    gadgets.forEach(gadget => {
      const card = document.createElement('article');
      card.className = `card ${gadget.status === 'sold' ? 'card--sold' : 'card--available'}`;

      const media = document.createElement('div');
      media.className = 'card__media';
      const typeBadge = document.createElement('span');
      typeBadge.className = 'card__type-badge';
      typeBadge.textContent = formatLabel(gadget.type);
      media.appendChild(typeBadge);

      if (gadget.image_path) {
        const img = document.createElement('img');
        img.src = gadget.image_path;
        img.alt = gadget.name;
        media.appendChild(img);
      } else {
        const placeholder = document.createElement('div');
        placeholder.className = 'no-image';
        placeholder.textContent = 'No photo';
        media.appendChild(placeholder);
      }
      card.appendChild(media);

      const content = document.createElement('div');
      content.className = 'card__content';

      const eyebrow = document.createElement('div');
      eyebrow.className = 'card__eyebrow';
      const status = document.createElement('span');
      status.className = `status-pill ${gadget.status === 'sold' ? 'status-pill--sold' : 'status-pill--available'}`;
      status.textContent = formatLabel(gadget.status);
      eyebrow.appendChild(status);

      const priceBadge = document.createElement('span');
      priceBadge.className = 'card__price';
      const hasListPrice = Number.isFinite(Number.parseFloat(gadget.list_price));
      priceBadge.textContent = formatCurrency(gadget.list_price, { fallback: 'On request' });
      if (!hasListPrice) {
        priceBadge.classList.add('card__price--muted');
      }
      eyebrow.appendChild(priceBadge);
      content.appendChild(eyebrow);

      const nameEl = document.createElement('h3');
      nameEl.className = 'card__title';
      nameEl.textContent = gadget.name;
      content.appendChild(nameEl);

      const brandModel = document.createElement('p');
      brandModel.className = 'card__subtitle';
      const brand = gadget.brand || '';
      const model = gadget.model || '';
      brandModel.textContent = [brand, model].filter(Boolean).join(' ') || 'Brand or model missing';
      content.appendChild(brandModel);

      const meta = document.createElement('div');
      meta.className = 'card__meta';
      const typeRow = document.createElement('div');
      typeRow.className = 'card__meta-row';
      typeRow.innerHTML = `<span>Type</span><strong>${formatLabel(gadget.type)}</strong>`;
      meta.appendChild(typeRow);
      const costRow = document.createElement('div');
      costRow.className = 'card__meta-row';
      costRow.innerHTML = `<span>Recovery</span><strong>${formatCurrency(gadget.cost_price, { fallback: 'Not set' })}</strong>`;
      meta.appendChild(costRow);
      content.appendChild(meta);
      card.appendChild(content);

      // Actions
      const actions = document.createElement('div');
      actions.className = 'card__actions';
      const viewBtn = document.createElement('button');
      viewBtn.className = 'card__action card__action--primary';
      viewBtn.textContent = 'Open';
      viewBtn.addEventListener('click', () => {
        window.location.href = `/gadget-detail.html?id=${gadget.id}`;
      });
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Edit';
      editBtn.className = 'card__action card__action--secondary';
      editBtn.addEventListener('click', () => {
        window.location.href = `/add-gadget.html?id=${gadget.id}`;
      });
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.className = 'card__action card__action--danger';
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Delete this gadget?')) {
          try {
            const resp = await fetchWithAuth(`/api/gadgets/${gadget.id}`, { method: 'DELETE' });
            if (!resp.ok) throw new Error('Delete failed');
            // Reload list after deletion
            message.show('Gadget deleted.', 'success');
            fetchGadgets();
          } catch (err) {
            if (err.message === 'Unauthorized') return;
            console.error(err);
            message.show('Could not delete gadget.', 'error');
          }
        }
      });
      actions.appendChild(viewBtn);
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(actions);

      listContainer.appendChild(card);
    });
  }
});

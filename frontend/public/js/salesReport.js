document.addEventListener('DOMContentLoaded', () => {
  const { fetchWithAuth } = window.appAuth || {};
  const {
    clearMessage,
    escapeHtml,
    formatCurrency,
    formatDate,
    formatLabel,
    parseErrorResponse,
    setMessage,
    toNumber
  } = window.SikaPrimeAppUtils || {};

  if (
    !fetchWithAuth
    || !clearMessage
    || !escapeHtml
    || !formatCurrency
    || !formatDate
    || !formatLabel
    || !parseErrorResponse
    || !setMessage
    || !toNumber
  ) {
    console.error('Shared app helpers are not available on the sales report page.');
    return;
  }

  const salesTable = document.getElementById('sales-table');
  const salesTableBody = salesTable?.querySelector('tbody');
  const salesMessage = document.getElementById('sales-message');
  const salesTableShell = salesTable?.closest('.table-shell');

  const deletedItemsTable = document.getElementById('deleted-items-table');
  const deletedItemsTableBody = deletedItemsTable?.querySelector('tbody');
  const deletedItemsMessage = document.getElementById('deleted-items-message');
  const deletedItemsTableShell = deletedItemsTable?.closest('.table-shell');

  const salesCountEl = document.getElementById('sales-count');
  const salesRevenueEl = document.getElementById('sales-revenue');
  const salesAverageProfitEl = document.getElementById('sales-average-profit');
  const salesTotalProfitEl = document.getElementById('sales-total-profit');
  const salesDeletedCountEl = document.getElementById('sales-deleted-count');

  deletedItemsTableBody?.addEventListener('click', handleDeletedItemAction);
  loadSalesReport();

  async function loadSalesReport() {
    clearMessage(salesMessage);
    clearMessage(deletedItemsMessage);

    try {
      const [salesResponse, deletedItemsResponse] = await Promise.all([
        fetchWithAuth('/api/sales'),
        fetchWithAuth('/api/gadgets/deleted-history')
      ]);

      if (!salesResponse.ok) {
        throw new Error(await parseErrorResponse(salesResponse, 'Could not load sales.'));
      }

      if (!deletedItemsResponse.ok) {
        throw new Error(await parseErrorResponse(deletedItemsResponse, 'Could not load deleted items.'));
      }

      const [sales, deletedItems] = await Promise.all([
        salesResponse.json(),
        deletedItemsResponse.json()
      ]);

      updateSummaryCards(sales, deletedItems);
      renderSalesTable(sales);
      renderDeletedItemsTable(deletedItems);
    } catch (error) {
      console.error(error);
      updateSummaryCards([], []);
      renderFailureState(error.message || 'Could not load sales data.');
    }
  }

  function renderFailureState(message) {
    setMessage(salesMessage, 'error', message);
    setMessage(deletedItemsMessage, 'error', message);

    if (salesTableShell) {
      salesTableShell.hidden = true;
    }

    if (deletedItemsTableShell) {
      deletedItemsTableShell.hidden = true;
    }
  }

  function renderSalesTable(sales) {
    if (!salesTableBody || !salesTableShell) {
      return;
    }

    if (!sales.length) {
      salesTableBody.innerHTML = '';
      salesTableShell.hidden = true;
      setMessage(salesMessage, 'info', 'No sales yet.');
      return;
    }

    clearMessage(salesMessage);
    salesTableShell.hidden = false;
    salesTableBody.innerHTML = sales.map((sale, index) => renderSaleRow(sale, index)).join('');
  }

  function renderDeletedItemsTable(items) {
    if (!deletedItemsTableBody || !deletedItemsTableShell) {
      return;
    }

    if (!items.length) {
      deletedItemsTableBody.innerHTML = '';
      deletedItemsTableShell.hidden = true;
      setMessage(
        deletedItemsMessage,
        'info',
        'No deleted items yet.'
      );
      return;
    }

    clearMessage(deletedItemsMessage);
    deletedItemsTableShell.hidden = false;
    deletedItemsTableBody.innerHTML = items
      .map((item, index) => renderDeletedItemRow(item, index))
      .join('');
  }

  async function handleDeletedItemAction(event) {
    const restoreButton = event.target.closest('[data-action="restore-gadget"]');
    if (!restoreButton) {
      return;
    }

    const gadgetId = restoreButton.dataset.gadgetId;
    if (!gadgetId) {
      return;
    }

    const originalLabel = restoreButton.textContent;
    restoreButton.disabled = true;
    restoreButton.textContent = 'Restoring...';

    try {
      const response = await fetchWithAuth(`/api/gadgets/${gadgetId}/restore`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Could not restore gadget.'));
      }

      const result = await response.json();
      const restoredName = getProductDisplayName(result.gadget || {});
      await loadSalesReport();
      setMessage(
        deletedItemsMessage,
        'success',
        `${restoredName} restored to inventory.`
      );
    } catch (error) {
      console.error(error);
      setMessage(
        deletedItemsMessage,
        'error',
        error.message || 'Could not restore gadget.'
      );
    } finally {
      restoreButton.disabled = false;
      restoreButton.textContent = originalLabel;
    }
  }

  function updateSummaryCards(sales, deletedItems) {
    const totalRevenue = sales.reduce((sum, sale) => sum + toNumber(sale.selling_price), 0);
    const totalProfit = sales.reduce((sum, sale) => sum + getProfitValue(sale), 0);
    const averageProfit = sales.length ? totalProfit / sales.length : 0;

    if (salesCountEl) {
      salesCountEl.textContent = String(sales.length);
    }

    if (salesRevenueEl) {
      salesRevenueEl.textContent = formatCurrency(totalRevenue);
    }

    if (salesAverageProfitEl) {
      salesAverageProfitEl.textContent = formatCurrency(averageProfit);
      salesAverageProfitEl.classList.toggle('numeric-cell--negative', averageProfit < 0);
      salesAverageProfitEl.classList.toggle('numeric-cell--positive', averageProfit > 0);
    }

    if (salesTotalProfitEl) {
      salesTotalProfitEl.textContent = formatCurrency(totalProfit);
      salesTotalProfitEl.classList.toggle('numeric-cell--negative', totalProfit < 0);
      salesTotalProfitEl.classList.toggle('numeric-cell--positive', totalProfit > 0);
    }

    if (salesDeletedCountEl) {
      salesDeletedCountEl.textContent = String(deletedItems.length);
    }
  }

  function renderSaleRow(sale, index) {
    const displayName = getProductDisplayName({
      name: sale.gadget_name,
      brand: sale.brand,
      model: sale.model
    });
    const isDeleted = Boolean(sale.deleted_at);
    const typeLabel = formatLabel(sale.gadget_type);
    const buyerName = sale.buyer_name ? escapeHtml(sale.buyer_name) : 'Not captured';
    const recoveryTarget = toNumber(sale.recovery_target);
    const sellingPrice = toNumber(sale.selling_price);
    const profit = getProfitValue(sale);
    const profitClass =
      profit < 0 ? 'numeric-cell numeric-cell--negative' : profit > 0
        ? 'numeric-cell numeric-cell--positive'
        : 'numeric-cell';

    const statusBadge = isDeleted
      ? '<span class="status-pill status-pill--deleted">Deleted</span>'
      : '<span class="status-pill status-pill--active">In inventory</span>';
    const statusNote = isDeleted
      ? `<small class="audit-note">Deleted by ${escapeHtml(sale.deleted_by || 'Unknown user')} - ${escapeHtml(formatDate(sale.deleted_at))}</small>`
      : '<small class="audit-note">Still in inventory.</small>';

    return `
      <tr class="${isDeleted ? 'table-row--deleted' : ''}">
        <td data-label="No.">${index + 1}</td>
        <td data-label="Gadget">
          <div class="cell-stack">
            <strong>${escapeHtml(displayName)}</strong>
            <span>${escapeHtml(typeLabel)}</span>
          </div>
        </td>
        <td data-label="Buyer">
          <div class="cell-stack">
            <strong>${buyerName}</strong>
            <small>Sale #${escapeHtml(String(sale.id ?? index + 1))}</small>
          </div>
        </td>
        <td class="numeric-cell" data-label="Recovery">${escapeHtml(formatCurrency(recoveryTarget))}</td>
        <td class="numeric-cell" data-label="Sale">${escapeHtml(formatCurrency(sellingPrice))}</td>
        <td class="${profitClass}" data-label="Profit / Loss">${escapeHtml(formatCurrency(profit))}</td>
        <td data-label="Status">
          ${statusBadge}
          ${statusNote}
        </td>
        <td class="date-cell" data-label="Date Sold">${escapeHtml(formatDate(sale.sold_at))}</td>
      </tr>
    `;
  }

  function renderDeletedItemRow(item, index) {
    const displayName = getProductDisplayName(item);
    const recoveryTarget = toNumber(item.cost_price);
    const statusLabel = 'Deleted';
    const statusNote = item.status
      ? `Last status: ${formatLabel(item.status)}`
      : 'Removed from inventory';

    return `
      <tr class="table-row--deleted">
        <td data-label="No.">${index + 1}</td>
        <td data-label="Gadget">
          <div class="cell-stack">
            <strong>${escapeHtml(displayName)}</strong>
            <span>${escapeHtml(item.name || 'Inventory record')}</span>
          </div>
        </td>
        <td data-label="Type">${escapeHtml(formatLabel(item.type))}</td>
        <td data-label="Status">
          <span class="status-pill status-pill--deleted">${escapeHtml(statusLabel)}</span>
          <small class="audit-note">${escapeHtml(statusNote)}</small>
        </td>
        <td class="numeric-cell" data-label="Recovery">${escapeHtml(formatCurrency(recoveryTarget))}</td>
        <td data-label="Deleted By">${escapeHtml(item.deleted_by || 'Unknown user')}</td>
        <td class="date-cell" data-label="Deleted At">${escapeHtml(formatDate(item.deleted_at))}</td>
        <td data-label="Action">
          <button
            type="button"
            class="table-action table-action--restore"
            data-action="restore-gadget"
            data-gadget-id="${escapeHtml(String(item.id))}"
          >
            Restore
          </button>
        </td>
      </tr>
    `;
  }

  function getProductDisplayName(item) {
    const primary = [item.brand, item.model].filter(Boolean).join(' ').trim();
    const fallback = item.name || 'Deleted item';
    return primary || fallback;
  }

  function getProfitValue(sale) {
    if (sale.profit != null && sale.profit !== '') {
      return toNumber(sale.profit);
    }

    return toNumber(sale.selling_price) - toNumber(sale.recovery_target);
  }
});

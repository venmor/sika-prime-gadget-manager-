/*
 * JavaScript to fetch and display sales data in the sales report page.
 *
 * This script retrieves a list of recorded sales from the backend and
 * populates a table with details such as gadget name, buyer, selling
 * price, profit and sale date. If no sales are present a message is
 * displayed to inform the user.
 */

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.querySelector('#sales-table tbody');
  const salesTable = document.getElementById('sales-table');
  const messageEl = document.getElementById('sales-message');

  loadSales();

  /**
   * Fetch sales records from the API and render them into the table.
   */
  async function loadSales() {
    try {
      const response = await fetch('/api/sales', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch sales');
      const data = await response.json();
      if (!data || data.length === 0) {
        messageEl.textContent = 'No sales recorded.';
        messageEl.style.display = 'block';
        salesTable.style.display = 'none';
        return;
      }
      renderSales(data);
    } catch (err) {
      console.error(err);
      messageEl.textContent = 'Unable to load sales report.';
      messageEl.style.display = 'block';
      salesTable.style.display = 'none';
    }
  }

  /**
   * Render the sales data into table rows.
   *
   * @param {Array} sales
   */
  function renderSales(sales) {
    tableBody.innerHTML = '';
    sales.forEach((sale, index) => {
      const row = document.createElement('tr');
      // Index
      const idxCell = document.createElement('td');
      idxCell.textContent = index + 1;
      row.appendChild(idxCell);
      // Gadget name (brand/model or name)
      const gadgetCell = document.createElement('td');
      const parts = [];
      if (sale.brand) parts.push(sale.brand);
      if (sale.model) parts.push(sale.model);
      const gadgetName = parts.filter(Boolean).join(' ') || sale.gadget_name;
      gadgetCell.textContent = gadgetName;
      row.appendChild(gadgetCell);
      // Buyer
      const buyerCell = document.createElement('td');
      buyerCell.textContent = sale.buyer_name || '—';
      row.appendChild(buyerCell);
      // Selling price
      const priceCell = document.createElement('td');
      priceCell.textContent = parseFloat(sale.selling_price).toFixed(2);
      row.appendChild(priceCell);
      // Profit
      const profitCell = document.createElement('td');
      profitCell.textContent = parseFloat(sale.profit).toFixed(2);
      row.appendChild(profitCell);
      // Date sold
      const dateCell = document.createElement('td');
      const dateObj = new Date(sale.sold_at);
      // Format date as YYYY-MM-DD for consistency
      const iso = dateObj.toISOString().split('T')[0];
      dateCell.textContent = iso;
      row.appendChild(dateCell);
      tableBody.appendChild(row);
    });
  }
});
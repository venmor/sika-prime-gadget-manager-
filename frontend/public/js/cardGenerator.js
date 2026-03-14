/*
 * Client‑side logic for the gadget detail page and advertisement card generation.
 *
 * This script fetches a single gadget by ID from the backend, renders its
 * detailed information on the page, and builds a branded advertisement card
 * preview. When the user clicks the "Generate Ad Card" button the preview
 * card is converted into a PNG using html2canvas and downloaded.
 */

document.addEventListener('DOMContentLoaded', () => {
  const detailSection = document.getElementById('gadget-details');
  const previewCard = document.getElementById('ad-card-preview');
  const generateBtn = document.getElementById('generate-ad');

  // Parse the ID from the query string
  const params = new URLSearchParams(window.location.search);
  const gadgetId = params.get('id');

  if (!gadgetId) {
    detailSection.textContent = 'No gadget selected.';
    generateBtn.disabled = true;
    return;
  }

  // Fetch gadget details and render them on the page
  fetchGadget(gadgetId);

  /**
   * Fetch a single gadget by ID from the API and populate the detail section.
   *
   * @param {string} id - Gadget ID to fetch.
   */
  async function fetchGadget(id) {
    try {
      const response = await fetch(`/api/gadgets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch gadget details');
      const gadget = await response.json();
      renderDetails(gadget);
    } catch (err) {
      console.error(err);
      detailSection.textContent = 'Unable to load gadget details.';
      generateBtn.disabled = true;
    }
  }

  /**
   * Render the gadget information into the detail section and build the
   * advertisement card preview. This function creates DOM elements to
   * display the gadget’s image, name, brand, model, type, specs and
   * description. It also constructs a hidden preview card that will
   * be converted to an image when the user clicks the generate button.
   *
   * @param {Object} gadget - The gadget object returned from the API.
   */
  function renderDetails(gadget) {
    detailSection.innerHTML = '';

    // Image or placeholder
    let imgEl;
    if (gadget.image_path) {
      imgEl = document.createElement('img');
      imgEl.src = gadget.image_path;
      imgEl.alt = gadget.name;
      imgEl.style.width = '100%';
      imgEl.style.maxWidth = '400px';
      imgEl.style.borderRadius = '4px';
      imgEl.style.marginBottom = '1rem';
      detailSection.appendChild(imgEl);
    }

    // Basic info
    const title = document.createElement('h2');
    title.textContent = gadget.name || '';
    detailSection.appendChild(title);

    const brandModel = document.createElement('p');
    const parts = [];
    if (gadget.brand) parts.push(gadget.brand);
    if (gadget.model) parts.push(gadget.model);
    brandModel.textContent = parts.join(' ');
    detailSection.appendChild(brandModel);

    const type = document.createElement('p');
    type.textContent = `Type: ${gadget.type}`;
    detailSection.appendChild(type);

    const status = document.createElement('p');
    status.textContent = `Status: ${gadget.status}`;
    detailSection.appendChild(status);

    const cost = document.createElement('p');
    if (gadget.cost_price !== undefined && gadget.cost_price !== null) {
      cost.textContent = `Cost Price: K${gadget.cost_price}`;
      detailSection.appendChild(cost);
    }

    // Specifications
    const specsHeader = document.createElement('h3');
    specsHeader.textContent = 'Specifications';
    detailSection.appendChild(specsHeader);
    const specsList = document.createElement('ul');
    specsList.style.listStyle = 'disc';
    specsList.style.paddingLeft = '1.5rem';

    if (gadget.type === 'laptop') {
      if (gadget.laptop_processor) addSpec('Processor', gadget.laptop_processor);
      if (gadget.laptop_ram) addSpec('RAM', gadget.laptop_ram);
      if (gadget.laptop_storage) addSpec('Storage', gadget.laptop_storage);
      if (gadget.laptop_screen_size) addSpec('Screen Size', gadget.laptop_screen_size);
      if (gadget.laptop_graphics) addSpec('Graphics', gadget.laptop_graphics);
    } else if (gadget.type === 'phone') {
      if (gadget.phone_os) addSpec('Operating System', gadget.phone_os);
      if (gadget.phone_ram) addSpec('RAM', gadget.phone_ram);
      if (gadget.phone_storage) addSpec('Storage', gadget.phone_storage);
      if (gadget.phone_screen_size) addSpec('Screen Size', gadget.phone_screen_size);
      if (gadget.phone_camera) addSpec('Camera', gadget.phone_camera);
      if (gadget.phone_battery) addSpec('Battery', gadget.phone_battery);
    }

    detailSection.appendChild(specsList);

    // Description
    if (gadget.description) {
      const descHeader = document.createElement('h3');
      descHeader.textContent = 'Description';
      detailSection.appendChild(descHeader);
      const descPara = document.createElement('p');
      descPara.textContent = gadget.description;
      detailSection.appendChild(descPara);
    }

    // Helper to add specification line
    function addSpec(label, value) {
      const li = document.createElement('li');
      li.textContent = `${label}: ${value}`;
      specsList.appendChild(li);
    }

    // Build the advertisement card preview
    buildAdCard(gadget);
  }

  /**
   * Construct the advertisement card preview based on the gadget data.
   * The preview card is hidden by default (display: none) until the
   * user triggers generation; this function populates its contents.
   *
   * @param {Object} gadget - The gadget object.
   */
  function buildAdCard(gadget) {
    previewCard.innerHTML = '';
    // Brand line
    const brandEl = document.createElement('div');
    brandEl.className = 'brand';
    brandEl.textContent = gadget.brand || gadget.name || 'Gadget';
    previewCard.appendChild(brandEl);
    // Model line
    const modelEl = document.createElement('div');
    modelEl.className = 'model';
    modelEl.textContent = gadget.model || '';
    previewCard.appendChild(modelEl);
    // Optional tagline / description snippet
    if (gadget.description) {
      const tagline = document.createElement('div');
      tagline.className = 'tagline';
      tagline.textContent = gadget.description;
      tagline.style.marginTop = '0.5rem';
      tagline.style.fontStyle = 'italic';
      tagline.style.color = '#666';
      tagline.style.fontSize = '0.9rem';
      previewCard.appendChild(tagline);
    }
    // Image preview if available
    if (gadget.image_path) {
      const img = document.createElement('img');
      img.src = gadget.image_path;
      img.alt = gadget.name;
      img.style.width = '100%';
      img.style.maxHeight = '200px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '4px';
      img.style.marginTop = '0.5rem';
      previewCard.appendChild(img);
    }
    // Price – advertise the cost price for now; could be updated after sale
    if (gadget.cost_price !== undefined && gadget.cost_price !== null) {
      const priceEl = document.createElement('div');
      priceEl.className = 'price';
      priceEl.textContent = `K${gadget.cost_price}`;
      previewCard.appendChild(priceEl);
    }
    // Initially hide the preview; only show when user clicks generate
    previewCard.style.display = 'none';
  }

  // Listen for the generate button click to create the PNG and download it
  generateBtn.addEventListener('click', () => {
    // Unhide the preview card so that html2canvas can render it
    previewCard.style.display = 'block';
    // Use a timeout to ensure the browser renders the card before capturing
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(previewCard, { backgroundColor: null });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        // Use brand and model to name the downloaded file
        const parts = [];
        if (previewCard.querySelector('.brand')) parts.push(previewCard.querySelector('.brand').textContent.trim());
        if (previewCard.querySelector('.model')) parts.push(previewCard.querySelector('.model').textContent.trim());
        const filename = parts.filter(Boolean).join('_').replace(/\s+/g, '_') || 'ad_card';
        link.href = dataUrl;
        link.download = `${filename}.png`;
        link.click();
      } catch (err) {
        console.error(err);
        alert('Failed to generate advertisement card');
      }
    }, 50);
  });
});
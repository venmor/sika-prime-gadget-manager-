/*
 * Client-side logic for the gadget detail page and advertisement export.
 *
 * This script fetches a single gadget by ID from the backend, renders its
 * detailed information on the page, and builds a branded advertisement card
 * preview. When the user clicks the export button the backend renders the
 * same ad component through Playwright and returns a PNG download.
 */

document.addEventListener('DOMContentLoaded', () => {
  const { fetchWithAuth } = window.appAuth;
  const { renderAdCard } = window.SikaPrimeAdCard;
  const detailSection = document.getElementById('gadget-details');
  const previewCard = document.getElementById('ad-card-preview');
  const previewSection = document.getElementById('ad-preview-section');
  const generateBtn = document.getElementById('generate-ad');
  const previewGenerateBtn = document.getElementById('preview-generate-ad');
  const mobileGenerateBtn = document.getElementById('mobile-generate-ad');
  const messageEl = document.getElementById('detail-message');
  const extraTextInput = document.getElementById('ad-extra-text');
  const previewMobileQuery = window.matchMedia('(max-width: 760px)');

  // Elements for sale functionality
  const saleForm = document.getElementById('sale-form');
  const saleInfo = document.getElementById('sale-info');
  const mobileSaveSaleBtn = document.getElementById('mobile-save-sale');
  let currentGadget = null;
  const processedImageCache = new Map();
  const desktopExportLabel = generateBtn?.textContent || 'Export Poster PNG';
  const previewExportLabel = previewGenerateBtn?.textContent || 'Export Poster PNG';
  const mobileExportLabel = mobileGenerateBtn?.textContent || 'Export Poster';
  const exportButtons = [generateBtn, previewGenerateBtn, mobileGenerateBtn].filter(Boolean);

  function setPreviewOpenState(isOpen) {
    document.body.classList.toggle('detail-preview-open', Boolean(isOpen));
  }

  function syncPreviewMode() {
    if (!previewSection) {
      return;
    }

    if (!previewMobileQuery.matches) {
      previewSection.open = true;
    }

    setPreviewOpenState(previewSection.open && previewMobileQuery.matches);
  }

  function setExportButtonState({ disabled, state = 'idle' } = {}) {
    exportButtons.forEach((button) => {
      if (typeof disabled === 'boolean') {
        button.disabled = disabled;
      }

      if (state === 'preparing') {
        button.textContent = 'Preparing...';
      } else if (state === 'exporting') {
        button.textContent = 'Exporting...';
      } else if (button === generateBtn) {
        button.textContent = desktopExportLabel;
      } else if (button === previewGenerateBtn) {
        button.textContent = previewExportLabel;
      } else {
        button.textContent = mobileExportLabel;
      }
    });
  }

  function syncSaleButton({ sold = false } = {}) {
    if (!mobileSaveSaleBtn) {
      return;
    }

    const disabled = sold || !saleForm;
    mobileSaveSaleBtn.hidden = disabled;
    mobileSaveSaleBtn.disabled = disabled;
  }

  if (previewSection) {
    syncPreviewMode();
    previewSection.addEventListener('toggle', () => {
      setPreviewOpenState(previewSection.open && previewMobileQuery.matches);
    });
  }

  if (typeof previewMobileQuery.addEventListener === 'function') {
    previewMobileQuery.addEventListener('change', syncPreviewMode);
  } else if (typeof previewMobileQuery.addListener === 'function') {
    previewMobileQuery.addListener(syncPreviewMode);
  }

  setExportButtonState({ disabled: true });
  syncSaleButton({ sold: true });

  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function getPixelOffset(x, y, width) {
    return ((y * width) + x) * 4;
  }

  function getLuminance(r, g, b) {
    return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
  }

  function getColorDistance(red, green, blue, target) {
    return Math.sqrt(
      ((red - target.r) ** 2) +
      ((green - target.g) ** 2) +
      ((blue - target.b) ** 2)
    );
  }

  function loadImageForAd(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function analyzeBorderBackground(data, width, height) {
    const samples = [];
    const step = Math.max(1, Math.floor(Math.min(width, height) / 48));

    function samplePixel(x, y) {
      const offset = getPixelOffset(x, y, width);
      const alpha = data[offset + 3];
      if (alpha < 200) {
        return;
      }

      samples.push({
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2]
      });
    }

    for (let x = 0; x < width; x += step) {
      samplePixel(x, 0);
      samplePixel(x, height - 1);
    }

    for (let y = 0; y < height; y += step) {
      samplePixel(0, y);
      samplePixel(width - 1, y);
    }

    if (samples.length < 24) {
      return null;
    }

    const totals = samples.reduce((accumulator, sample) => ({
      r: accumulator.r + sample.r,
      g: accumulator.g + sample.g,
      b: accumulator.b + sample.b
    }), { r: 0, g: 0, b: 0 });

    const average = {
      r: totals.r / samples.length,
      g: totals.g / samples.length,
      b: totals.b / samples.length
    };

    const averageLuminance = getLuminance(average.r, average.g, average.b);
    const averageDistance = samples.reduce((total, sample) => (
      total + getColorDistance(sample.r, sample.g, sample.b, average)
    ), 0) / samples.length;
    const brightSampleRatio = samples.filter((sample) => (
      getLuminance(sample.r, sample.g, sample.b) > 214
    )).length / samples.length;

    if (averageLuminance < 214 || averageDistance > 34 || brightSampleRatio < 0.72) {
      return null;
    }

    return {
      average,
      threshold: Math.max(24, Math.min(58, averageDistance * 1.8 + 18)),
      minimumLuminance: Math.max(188, averageLuminance - 26)
    };
  }

  function removeLightBackdrop(canvas) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const imageData = context.getImageData(0, 0, width, height);
    const { data } = imageData;
    const background = analyzeBorderBackground(data, width, height);

    if (!background) {
      return false;
    }

    const queue = [];
    const visited = new Uint8Array(width * height);
    let removedPixels = 0;

    function markIfBackground(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
      }

      const position = (y * width) + x;
      if (visited[position]) {
        return;
      }
      visited[position] = 1;

      const offset = getPixelOffset(x, y, width);
      const alpha = data[offset + 3];
      if (alpha < 180) {
        return;
      }

      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const luminance = getLuminance(red, green, blue);
      const distance = getColorDistance(red, green, blue, background.average);

      if (distance <= background.threshold && luminance >= background.minimumLuminance) {
        queue.push([x, y]);
      }
    }

    for (let x = 0; x < width; x += 1) {
      markIfBackground(x, 0);
      markIfBackground(x, height - 1);
    }

    for (let y = 0; y < height; y += 1) {
      markIfBackground(0, y);
      markIfBackground(width - 1, y);
    }

    while (queue.length) {
      const [x, y] = queue.pop();
      const offset = getPixelOffset(x, y, width);
      if (data[offset + 3] === 0) {
        continue;
      }

      data[offset + 3] = 0;
      removedPixels += 1;

      markIfBackground(x + 1, y);
      markIfBackground(x - 1, y);
      markIfBackground(x, y + 1);
      markIfBackground(x, y - 1);
    }

    if (removedPixels === 0) {
      return false;
    }

    context.putImageData(imageData, 0, 0);
    return removedPixels > ((width * height) * 0.02);
  }

  function trimCanvasToSubject(canvas, paddingRatio = 0.08) {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const { data } = context.getImageData(0, 0, width, height);
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[getPixelOffset(x, y, width) + 3];
        if (alpha <= 12) {
          continue;
        }

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX === -1 || maxY === -1) {
      return { canvas, trimmed: false };
    }

    if (minX === 0 && minY === 0 && maxX === width - 1 && maxY === height - 1) {
      return { canvas, trimmed: false };
    }

    const padding = Math.round(Math.max(maxX - minX + 1, maxY - minY + 1) * paddingRatio);
    const sourceX = Math.max(0, minX - padding);
    const sourceY = Math.max(0, minY - padding);
    const sourceWidth = Math.min(width - sourceX, (maxX - minX + 1) + (padding * 2));
    const sourceHeight = Math.min(height - sourceY, (maxY - minY + 1) + (padding * 2));
    const trimmedCanvas = createCanvas(sourceWidth, sourceHeight);

    trimmedCanvas
      .getContext('2d')
      .drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);

    return { canvas: trimmedCanvas, trimmed: true };
  }

  async function buildAdReadyImage(rawSrc) {
    if (!rawSrc) {
      return rawSrc;
    }

    const image = await loadImageForAd(rawSrc);
    const maxEdge = 960;
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
    const workingCanvas = createCanvas(width, height);
    const context = workingCanvas.getContext('2d', { willReadFrequently: true });

    context.drawImage(image, 0, 0, width, height);

    const backgroundRemoved = removeLightBackdrop(workingCanvas);
    const { canvas: trimmedCanvas, trimmed } = trimCanvasToSubject(
      workingCanvas,
      backgroundRemoved ? 0.1 : 0.04
    );

    if (!backgroundRemoved && !trimmed) {
      return rawSrc;
    }

    const dataUrl = trimmedCanvas.toDataURL('image/png');
    return dataUrl.length <= (4 * 1024 * 1024) ? dataUrl : rawSrc;
  }

  async function prepareAdImage(gadget) {
    if (!gadget?.image_path) {
      return '';
    }

    if (gadget.ad_processed_image_path) {
      return gadget.ad_processed_image_path;
    }

    let pendingImage = processedImageCache.get(gadget.image_path);
    if (!pendingImage) {
      pendingImage = buildAdReadyImage(gadget.image_path)
        .catch(() => gadget.image_path);
      processedImageCache.set(gadget.image_path, pendingImage);
    }

    const processedImagePath = await pendingImage;
    gadget.ad_processed_image_path = processedImagePath;
    return processedImagePath;
  }

  function getAdRenderableGadget(gadget) {
    if (!gadget) {
      return gadget;
    }

    return gadget.ad_processed_image_path
      ? { ...gadget, image_path: gadget.ad_processed_image_path }
      : gadget;
  }

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

  // Parse the ID from the query string
  const params = new URLSearchParams(window.location.search);
  const gadgetId = params.get('id');

  if (!gadgetId) {
    detailSection.textContent = 'Pick a gadget.';
    setExportButtonState({ disabled: true });
    syncSaleButton({ sold: true });
    return;
  }

  // Fetch gadget details and render them on the page
  fetchGadget(gadgetId);

  extraTextInput.addEventListener('input', async () => {
    if (!currentGadget) {
      return;
    }

    buildAdCard(currentGadget);
    previewCard.style.display = 'block';
  });

  /**
   * Fetch a single gadget by ID from the API and populate the detail section.
   *
   * @param {string} id - Gadget ID to fetch.
   */
  async function fetchGadget(id) {
    try {
      clearMessage();
      const response = await fetchWithAuth(`/api/gadgets/${id}`);
      if (!response.ok) throw new Error('Failed to fetch gadget details');
      const gadget = await response.json();
      currentGadget = gadget;
      renderDetails(gadget);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      console.error(err);
      detailSection.textContent = 'Could not load gadget.';
      setExportButtonState({ disabled: true });
      syncSaleButton({ sold: true });
      showMessage('Could not load gadget.', 'error');
    }
  }

  /**
   * Render the gadget information into the detail section and build the
   * advertisement card preview. This function creates DOM elements to
   * display the gadget's image, name, brand, model, type, specs and
   * description. It also constructs a hidden preview card that will
   * be converted to an image when the user clicks the generate button.
   *
   * @param {Object} gadget - The gadget object returned from the API.
   */
  function renderDetails(gadget) {
    detailSection.innerHTML = '';

    const shell = document.createElement('div');
    shell.className = 'gadget-detail';

    const metrics = document.createElement('div');
    metrics.className = 'metric-inline';
    const typeChip = document.createElement('span');
    typeChip.className = 'metric-chip';
    typeChip.textContent = `Type: ${formatLabel(gadget.type)}`;
    const statusChip = document.createElement('span');
    statusChip.className = `status-pill ${gadget.status === 'sold' ? 'status-pill--sold' : 'status-pill--available'}`;
    statusChip.textContent = formatLabel(gadget.status);
    metrics.appendChild(typeChip);
    metrics.appendChild(statusChip);
    shell.appendChild(metrics);

    const hero = document.createElement('div');
    hero.className = 'gadget-detail__hero';

    const media = document.createElement('div');
    media.className = 'gadget-detail__media';
    if (gadget.image_path) {
      const imgEl = document.createElement('img');
      imgEl.src = gadget.image_path;
      imgEl.alt = gadget.name;
      media.appendChild(imgEl);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'gadget-detail__placeholder';
      placeholder.textContent = 'No photo yet';
      media.appendChild(placeholder);
    }
    hero.appendChild(media);

    const summary = document.createElement('div');
    summary.className = 'gadget-detail__summary';

    const title = document.createElement('h2');
    title.className = 'gadget-detail__title';
    title.textContent = gadget.name || gadget.model || 'Gadget';
    summary.appendChild(title);

    const subline = document.createElement('p');
    subline.className = 'gadget-detail__subline';
    subline.textContent = [gadget.brand, gadget.model].filter(Boolean).join(' / ') || `Type: ${formatLabel(gadget.type)}`;
    summary.appendChild(subline);

    let priceValue = 'Price on request';
    if (gadget.list_price !== undefined && gadget.list_price !== null) {
      priceValue = `K${Number.parseFloat(gadget.list_price).toFixed(2)}`;
    }

    let recoveryValue = 'Not set';
    if (gadget.cost_price !== undefined && gadget.cost_price !== null) {
      recoveryValue = `K${Number.parseFloat(gadget.cost_price).toFixed(2)}`;
    }

    const overview = document.createElement('div');
    overview.className = 'gadget-detail__overview';
    [
      { label: 'Category', value: formatLabel(gadget.type) },
      { label: 'Brand', value: gadget.brand || 'Not provided' },
      { label: 'Model', value: gadget.model || gadget.name || 'Not provided' },
      { label: 'Recovery', value: recoveryValue },
      { label: 'Status', value: formatLabel(gadget.status || 'available') },
      { label: 'Price', value: priceValue, accent: true }
    ].forEach((item) => {
      const stat = createDetailStat(item.label, item.value);
      if (item.accent) {
        stat.classList.add('gadget-detail__stat--price');
      }
      overview.appendChild(stat);
    });

    summary.appendChild(overview);
    hero.appendChild(summary);
    shell.appendChild(hero);

    const isSold = Boolean(gadget.status && gadget.status.toLowerCase() === 'sold');
    setExportButtonState({ disabled: isSold });
    syncSaleButton({ sold: isSold });

    const infoGrid = document.createElement('div');
    infoGrid.className = 'gadget-detail__info-grid';

    const specsSection = document.createElement('section');
    specsSection.className = 'gadget-detail__panel gadget-detail__panel--specs';
    const specsHeader = document.createElement('h3');
    specsHeader.textContent = 'Specs';
    specsSection.appendChild(specsHeader);
    const specsList = document.createElement('ul');
    specsList.className = 'gadget-detail__spec-list';

    if (gadget.type === 'laptop') {
      if (gadget.laptop_processor) addSpec('CPU', gadget.laptop_processor);
      if (gadget.laptop_ram) addSpec('RAM', gadget.laptop_ram);
      if (gadget.laptop_storage) addSpec('ROM / Storage', gadget.laptop_storage);
      if (gadget.laptop_battery_hours) addSpec('Battery Hrs', gadget.laptop_battery_hours);
      if (gadget.laptop_graphics) addSpec('Graphics', gadget.laptop_graphics);
    } else if (gadget.type === 'phone') {
      if (gadget.phone_os) addSpec('Operating System', gadget.phone_os);
      if (gadget.phone_ram) addSpec('RAM', gadget.phone_ram);
      if (gadget.phone_storage) addSpec('Phone Storage', gadget.phone_storage);
      if (gadget.phone_battery) addSpec('Battery', gadget.phone_battery);
      if (gadget.phone_screen_size) addSpec('Screen Size', gadget.phone_screen_size);
      if (gadget.phone_camera) addSpec('Camera', gadget.phone_camera);
    } else if (gadget.other_specs) {
      addSpec('Extra Specs', gadget.other_specs);
    }

    specsSection.appendChild(specsList);
    infoGrid.appendChild(specsSection);

    if (gadget.description) {
      const descSection = document.createElement('section');
      descSection.className = 'gadget-detail__panel gadget-detail__panel--description';
      const descHeader = document.createElement('h3');
      descHeader.textContent = 'Notes';
      descSection.appendChild(descHeader);
      const descPara = document.createElement('p');
      descPara.className = 'gadget-detail__description';
      descPara.textContent = gadget.description;
      descSection.appendChild(descPara);
      infoGrid.appendChild(descSection);
    }

    shell.appendChild(infoGrid);

    detailSection.appendChild(shell);

    function createDetailStat(label, value) {
      const stat = document.createElement('div');
      stat.className = 'gadget-detail__stat';
      const statLabel = document.createElement('span');
      statLabel.textContent = label;
      const statValue = document.createElement('strong');
      statValue.textContent = value;
      stat.appendChild(statLabel);
      stat.appendChild(statValue);
      return stat;
    }

    function addSpec(label, value) {
      const li = document.createElement('li');
      const specLabel = document.createElement('span');
      specLabel.textContent = label;
      const specValue = document.createElement('strong');
      specValue.textContent = value;
      li.appendChild(specLabel);
      li.appendChild(specValue);
      specsList.appendChild(li);
    }

    function formatLabel(value) {
      if (!value) return 'Not provided';
      return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    }

    // Build the advertisement card preview
    buildAdCard(gadget);
    prepareAdImage(gadget)
      .then((processedImagePath) => {
        if (!processedImagePath || !currentGadget || currentGadget.id !== gadget.id) {
          return;
        }

        buildAdCard(currentGadget);
      })
      .catch((error) => {
        console.warn('Unable to prepare ad image preview:', error);
      });

    // If the gadget is already sold, hide the sale form and display a notice
    if (isSold) {
      if (saleForm) saleForm.style.display = 'none';
      if (saleInfo) {
        saleInfo.style.display = 'block';
        saleInfo.textContent = 'This gadget is already sold.';
      }
      showMessage('This gadget is already sold.', 'info');
    }
  }

  /**
   * Construct the advertisement card preview based on the gadget data.
   * The preview card is hidden by default (display: none) until the
   * user triggers generation; this function populates its contents.
   *
   * @param {Object} gadget - The gadget object.
   */
  function buildAdCard(gadget) {
    const adGadget = getAdRenderableGadget(gadget);
    previewCard.innerHTML = '';
    previewCard.classList.add('card--ad--preview');
    previewCard.classList.remove('card--ad--export');
    renderAdCard(previewCard, adGadget, {
      extraText: extraTextInput.value.trim()
    });
    previewCard.style.display = 'block';
  }

  async function handleAdExport() {
    if (!currentGadget || !currentGadget.id) {
      showMessage('Load a gadget before exporting the ad.', 'error');
      return;
    }

    if (previewSection) {
      previewSection.open = true;
    }

    setExportButtonState({ disabled: true, state: 'preparing' });

    try {
      clearMessage();
      buildAdCard(currentGadget);
      const processedImageDataUrl = await prepareAdImage(currentGadget);
      buildAdCard(currentGadget);
      setExportButtonState({ disabled: true, state: 'exporting' });
      const response = await fetchWithAuth('/api/ads/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          gadgetId: currentGadget.id,
          extraText: extraTextInput.value.trim(),
          processedImageDataUrl: processedImageDataUrl && processedImageDataUrl.startsWith('data:image/')
            ? processedImageDataUrl
            : ''
        })
      });

      if (!response.ok) {
        let errorMessage = '';
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const payload = await response.json().catch(() => ({}));
          errorMessage = payload.error || '';
        } else {
          const text = await response.text().catch(() => '');
          errorMessage = text.trim();
        }

        if (!errorMessage && response.status === 404) {
          errorMessage = 'Export endpoint unavailable. Restart the backend server and try again.';
        }

        if (!errorMessage && response.status >= 500) {
          errorMessage = 'Backend export failed. Check the backend terminal for the Playwright error.';
        }

        throw new Error(errorMessage || `Failed to export advertisement card (HTTP ${response.status}).`);
      }

      const blob = await response.blob();
      const link = document.createElement('a');
      const fallbackName = (currentGadget.model || currentGadget.name || 'ad_card').replace(/\s+/g, '_');
      const disposition = response.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = filenameMatch ? filenameMatch[1] : `${fallbackName}.png`;
      const objectUrl = URL.createObjectURL(blob);

      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      if (err.message === 'Unauthorized') return;
      console.error(err);
      if (err instanceof TypeError) {
        showMessage('Backend unavailable. Restart the server and try exporting again.', 'error');
        return;
      }
      showMessage(err.message || 'Failed to export advertisement card.', 'error');
    } finally {
      setExportButtonState({
        disabled: Boolean(currentGadget?.status && currentGadget.status.toLowerCase() === 'sold')
      });
    }
  }

  if (generateBtn) {
    generateBtn.addEventListener('click', handleAdExport);
  }

  if (previewGenerateBtn) {
    previewGenerateBtn.addEventListener('click', handleAdExport);
  }

  if (mobileGenerateBtn) {
    mobileGenerateBtn.addEventListener('click', handleAdExport);
  }

  // Handle sale form submission
  if (saleForm) {
    saleForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      // Collect form values
      const sellingPrice = saleForm.querySelector('[name="selling_price"]').value;
      const buyerName = saleForm.querySelector('[name="buyer_name"]').value;
      const saleDate = saleForm.querySelector('[name="sale_date"]').value;
      if (!sellingPrice || !saleDate) {
        showMessage('Enter a sale price and date.', 'error');
        return;
      }
      try {
        clearMessage();
        const payload = {
          gadgetId: parseInt(gadgetId, 10),
          selling_price: parseFloat(sellingPrice),
          sold_at: saleDate,
          buyer_name: buyerName || null
        };
        const response = await fetchWithAuth('/api/sales', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Could not save sale');
        }
        const data = await response.json();
        // Hide form and show profit information
        saleForm.style.display = 'none';
        saleInfo.style.display = 'block';
        const delta = data.profit != null ? parseFloat(data.profit) : 0;
        const varianceLabel = delta >= 0 ? 'Gain' : 'Loss';
        saleInfo.innerHTML = `<p>Sale saved.</p><p>${varianceLabel}: K${Math.abs(delta).toFixed(2)}</p>`;
        // Update status text to sold
        const statusEl = detailSection.querySelector('.status-pill');
        if (statusEl) {
          statusEl.textContent = 'Sold';
          statusEl.className = 'status-pill status-pill--sold';
        }
        if (currentGadget) {
          currentGadget.status = 'sold';
        }
        setExportButtonState({ disabled: true });
        syncSaleButton({ sold: true });
        showMessage('Sale saved.', 'success');
      } catch (err) {
        if (err.message === 'Unauthorized') return;
        console.error(err);
        showMessage(err.message, 'error');
      }
    });
  }
});

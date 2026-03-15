const fs = require('fs');
const path = require('path');

const adCard = require('../../frontend/public/js/adCard');

const gadgetDetailCssPath = path.join(__dirname, '..', '..', 'frontend', 'public', 'css', 'gadget-detail.css');

let browserPromise;
let cachedStyles;

function buildExportError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getStyles() {
  if (!cachedStyles) {
    const baseStyles = fs.readFileSync(gadgetDetailCssPath, 'utf8');
    cachedStyles = `${baseStyles}

      body.ad-export-page {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 32px;
        background: #eef3f9;
      }

      .ad-export-stage {
        width: 1080px;
        max-width: 1080px;
        margin: 0 auto;
      }

      #ad-export-card {
        width: 1080px;
        margin: 0 auto;
      }
    `;
  }

  return cachedStyles;
}

function absolutizeResourcePath(resourcePath, baseUrl) {
  if (!resourcePath) {
    return null;
  }

  try {
    return new URL(resourcePath, baseUrl).toString();
  } catch (error) {
    return null;
  }
}

function buildExportDocument({ gadget, extraText, baseUrl }) {
  const logoSrc = absolutizeResourcePath('/images/sika-prime-logo.png', baseUrl);
  const exportGadget = {
    ...gadget,
    image_path: absolutizeResourcePath(gadget.image_path, baseUrl)
  };

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sika Prime Ad Export</title>
    <style>${getStyles()}</style>
  </head>
  <body class="ad-export-page">
    <main class="ad-export-stage">
      <section id="ad-export-card" class="card card--ad card--ad--export">
        ${adCard.buildAdMarkup(exportGadget, {
          extraText,
          logoSrc
        })}
      </section>
    </main>
  </body>
</html>`;
}

async function loadPlaywright() {
  try {
    return require('playwright');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw buildExportError(
        'Playwright is not installed yet. Run `cd backend && npm install` to enable ad export.',
        503
      );
    }

    throw error;
  }
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = loadPlaywright()
      .then(({ chromium }) => chromium.launch({
        headless: true,
        chromiumSandbox: false,
        args: ['--disable-setuid-sandbox']
      }))
      .catch((error) => {
        browserPromise = null;
        if (error.message && error.message.includes('Executable doesn\'t exist')) {
          throw buildExportError(
            'Playwright browser binaries are missing. Run `cd backend && npx playwright install chromium`.',
            503
          );
        }
        throw error;
      });
  }

  return browserPromise;
}

async function waitForAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (error) {
        // Ignore font readiness failures and continue with the screenshot.
      }
    }

    const images = Array.from(document.images);
    await Promise.all(images.map((image) => {
      if (image.complete && image.naturalWidth > 0) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        image.addEventListener('load', resolve, { once: true });
        image.addEventListener('error', resolve, { once: true });
      });
    }));
  });
}

async function applyExportCardLayout(page) {
  await page.evaluate(() => {
    const container = document.getElementById('ad-export-card');
    const image = container?.querySelector('.card--ad__visual img');

    if (!container || !image || !image.naturalWidth || !image.naturalHeight) {
      return;
    }

    container.classList.remove(
      'card--ad--image-landscape',
      'card--ad--image-portrait',
      'card--ad--image-balanced'
    );

    const ratio = image.naturalWidth / image.naturalHeight;
    if (ratio >= 1.18) {
      container.classList.add('card--ad--image-landscape');
      return;
    }

    if (ratio <= 0.84) {
      container.classList.add('card--ad--image-portrait');
      return;
    }

    container.classList.add('card--ad--image-balanced');
  });
}

async function exportAdCard({ gadget, extraText, baseUrl }) {
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: {
      width: 1200,
      height: 1600
    },
    deviceScaleFactor: 1
  });

  try {
    const documentMarkup = buildExportDocument({ gadget, extraText, baseUrl });
    await page.setContent(documentMarkup, { waitUntil: 'load' });
    await waitForAssets(page);
    await applyExportCardLayout(page);
    await page.waitForTimeout(100);
    const cardLocator = page.locator('#ad-export-card');
    return await cardLocator.screenshot({ type: 'png' });
  } finally {
    await page.close();
  }
}

module.exports = {
  buildExportDocument,
  exportAdCard
};

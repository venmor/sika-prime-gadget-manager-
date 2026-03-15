const Gadget = require('../models/Gadget');
const adExportService = require('../services/adExportService');

function buildValidationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value) {
  if (value == null) {
    return '';
  }

  return String(value).trim();
}

function parseGadgetId(value) {
  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedValue)) {
    throw buildValidationError('Valid gadgetId is required');
  }

  return parsedValue;
}

function normalizeProcessedImageDataUrl(value) {
  const normalizedValue = normalizeText(value);
  if (!normalizedValue) {
    return '';
  }

  if (!/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(normalizedValue)) {
    throw buildValidationError('Processed image payload must be a valid image data URL');
  }

  if (normalizedValue.length > 10 * 1024 * 1024) {
    throw buildValidationError('Processed image payload is too large');
  }

  return normalizedValue;
}

function buildBaseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function buildFilename(gadget) {
  const rawValue = normalizeText(gadget.model) || normalizeText(gadget.name) || 'ad_card';
  return rawValue
    .replace(/[^a-z0-9_-]+/gi, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'ad_card';
}

async function exportAdPng(req, res) {
  try {
    const gadgetId = parseGadgetId(req.body.gadgetId);
    const extraText = normalizeText(req.body.extraText).slice(0, 220);
    const processedImageDataUrl = normalizeProcessedImageDataUrl(req.body.processedImageDataUrl);
    const gadget = await Gadget.findById(gadgetId);

    if (!gadget) {
      throw buildValidationError('Gadget not found', 404);
    }

    const pngBuffer = await adExportService.exportAdCard({
      gadget: processedImageDataUrl
        ? { ...gadget, image_path: processedImageDataUrl }
        : gadget,
      extraText,
      baseUrl: buildBaseUrl(req)
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="${buildFilename(gadget)}.png"`);
    res.setHeader('Content-Length', pngBuffer.length);
    return res.send(pngBuffer);
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({
      error: error.message || 'Failed to export ad'
    });
  }
}

module.exports = {
  exportAdPng
};

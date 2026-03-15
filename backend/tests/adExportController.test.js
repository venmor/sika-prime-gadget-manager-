process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');

const adExportController = require('../controllers/adExportController');
const Gadget = require('../models/Gadget');
const adExportService = require('../services/adExportService');
const { assertJson, createResponse } = require('./helpers');

function createBinaryResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    send(payload) {
      this.body = payload;
      return this;
    }
  };
}

test('exportAdPng validates gadget id', async () => {
  const req = {
    body: {},
    protocol: 'http',
    get() {
      return 'localhost:3000';
    }
  };
  const res = createResponse();

  await adExportController.exportAdPng(req, res);

  assertJson(res, 400, { error: 'Valid gadgetId is required' });
});

test('exportAdPng returns 404 when the gadget does not exist', async (t) => {
  t.mock.method(Gadget, 'findById', async () => null);
  const req = {
    body: { gadgetId: '404' },
    protocol: 'http',
    get() {
      return 'localhost:3000';
    }
  };
  const res = createResponse();

  await adExportController.exportAdPng(req, res);

  assertJson(res, 404, { error: 'Gadget not found' });
});

test('exportAdPng rejects invalid processed image payloads', async () => {
  const req = {
    body: {
      gadgetId: '9',
      processedImageDataUrl: 'not-a-data-url'
    },
    protocol: 'http',
    get() {
      return 'localhost:3000';
    }
  };
  const res = createResponse();

  await adExportController.exportAdPng(req, res);

  assertJson(res, 400, { error: 'Processed image payload must be a valid image data URL' });
});

test('exportAdPng sends a png attachment when export succeeds', async (t) => {
  const buffer = Buffer.from('png-export');
  let exportedGadget;
  t.mock.method(Gadget, 'findById', async () => ({
    id: 9,
    name: 'HP ProBook',
    model: '960 G8',
    image_path: '/uploads/raw-image.jpg'
  }));
  t.mock.method(adExportService, 'exportAdCard', async ({ gadget }) => {
    exportedGadget = gadget;
    return buffer;
  });

  const req = {
    body: {
      gadgetId: '9',
      extraText: 'Finance available',
      processedImageDataUrl: 'data:image/png;base64,cHJldmlldy1pbWFnZQ=='
    },
    protocol: 'http',
    get() {
      return 'localhost:3000';
    }
  };
  const res = createBinaryResponse();

  await adExportController.exportAdPng(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/png');
  assert.match(res.headers['content-disposition'], /960_G8\.png/);
  assert.equal(res.body, buffer);
  assert.equal(exportedGadget.image_path, 'data:image/png;base64,cHJldmlldy1pbWFnZQ==');
});

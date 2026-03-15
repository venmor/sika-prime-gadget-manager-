process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

const test = require('node:test');

const salesController = require('../controllers/salesController');
const Sale = require('../models/Sale');
const { assertJson, createResponse } = require('./helpers');

test('recordSale creates a sale and returns profit', async (t) => {
  t.mock.method(Sale, 'create', async () => ({ saleId: 4, profit: 275.5 }));
  const req = {
    body: {
      gadgetId: '7',
      selling_price: '975.50',
      sold_at: '2026-03-14',
      buyer_name: 'Charlie'
    }
  };
  const res = createResponse();

  await salesController.recordSale(req, res);

  assertJson(res, 201, { saleId: 4, profit: 275.5 });
});

test('recordSale rejects duplicate sales', async (t) => {
  t.mock.method(Sale, 'create', async () => {
    throw new Error('Gadget has already been sold');
  });
  const req = {
    body: {
      gadgetId: '7',
      selling_price: '975.50'
    }
  };
  const res = createResponse();

  await salesController.recordSale(req, res);

  assertJson(res, 409, { error: 'Gadget has already been sold' });
});

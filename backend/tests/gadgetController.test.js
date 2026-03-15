process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');

const gadgetController = require('../controllers/gadgetController');
const Gadget = require('../models/Gadget');
const LaptopSpec = require('../models/LaptopSpec');
const PhoneSpec = require('../models/PhoneSpec');
const db = require('../config/db');
const { assertJson, createConnectionMock, createResponse } = require('./helpers');

test('createGadget validates required fields', async () => {
  const req = {
    body: {
      type: 'laptop',
      cost_price: '1000'
    }
  };
  const res = createResponse();

  await gadgetController.createGadget(req, res);

  assertJson(res, 400, { error: 'Name is required' });
});

test('createGadget saves gadget and specs inside a transaction', async (t) => {
  const connection = createConnectionMock();
  t.mock.method(db.pool, 'getConnection', async () => connection);
  t.mock.method(Gadget, 'create', async () => 17);
  t.mock.method(Gadget, 'findById', async () => ({ id: 17, name: 'ProBook', type: 'laptop', list_price: 1800 }));
  t.mock.method(PhoneSpec, 'removeByGadgetId', async () => {});
  t.mock.method(LaptopSpec, 'update', async () => false);
  const createSpecMock = t.mock.method(LaptopSpec, 'create', async () => 1);

  const req = {
    body: {
      name: 'ProBook',
      type: 'laptop',
      brand: 'HP',
      model: '450',
      cost_price: '1200',
      list_price: '1800',
      processor: 'i5'
    },
    file: { filename: 'photo.png' }
  };
  const res = createResponse();

  await gadgetController.createGadget(req, res);

  assert.equal(connection.beginTransactionCalled, true);
  assert.equal(connection.commitCalled, true);
  assert.equal(connection.releaseCalled, true);
  assert.equal(connection.rollbackCalled, false);
  assert.equal(createSpecMock.mock.calls.length, 1);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id, 17);
});

test('updateGadget removes stale specs when gadget type changes', async (t) => {
  const connection = createConnectionMock();
  t.mock.method(db.pool, 'getConnection', async () => connection);
  t.mock.method(Gadget, 'findById', async (id) => {
    if (id === 9) {
      return { id: 9, type: 'laptop', status: 'available' };
    }
    return { id: 9, type: 'phone', status: 'available', list_price: 900 };
  });
  t.mock.method(Gadget, 'update', async () => true);
  const removeLaptopMock = t.mock.method(LaptopSpec, 'removeByGadgetId', async () => {});
  t.mock.method(PhoneSpec, 'update', async () => false);
  const createPhoneMock = t.mock.method(PhoneSpec, 'create', async () => 1);

  const req = {
    params: { id: '9' },
    body: {
      name: 'Galaxy',
      type: 'phone',
      cost_price: '500',
      list_price: '900',
      os: 'Android'
    }
  };
  const res = createResponse();

  await gadgetController.updateGadget(req, res);

  assert.equal(connection.commitCalled, true);
  assert.equal(removeLaptopMock.mock.calls.length, 1);
  assert.equal(createPhoneMock.mock.calls.length, 1);
  assert.equal(res.statusCode, 200);
});

test('createGadget accepts other devices and skips typed spec inserts', async (t) => {
  const connection = createConnectionMock();
  t.mock.method(db.pool, 'getConnection', async () => connection);
  t.mock.method(Gadget, 'create', async () => 22);
  t.mock.method(Gadget, 'findById', async () => ({
    id: 22,
    name: 'Bluetooth Speaker',
    type: 'other',
    other_specs: 'Rechargeable battery, Type-C charging'
  }));
  const removeLaptopMock = t.mock.method(LaptopSpec, 'removeByGadgetId', async () => {});
  const removePhoneMock = t.mock.method(PhoneSpec, 'removeByGadgetId', async () => {});
  const createLaptopMock = t.mock.method(LaptopSpec, 'create', async () => 1);
  const createPhoneMock = t.mock.method(PhoneSpec, 'create', async () => 1);

  const req = {
    body: {
      name: 'Bluetooth Speaker',
      type: 'other',
      cost_price: '450',
      other_specs: 'Rechargeable battery, Type-C charging'
    }
  };
  const res = createResponse();

  await gadgetController.createGadget(req, res);

  assert.equal(connection.commitCalled, true);
  assert.equal(removeLaptopMock.mock.calls.length, 1);
  assert.equal(removePhoneMock.mock.calls.length, 1);
  assert.equal(createLaptopMock.mock.calls.length, 0);
  assert.equal(createPhoneMock.mock.calls.length, 0);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.type, 'other');
});

test('getGadgetById returns 404 for missing gadgets', async (t) => {
  t.mock.method(Gadget, 'findById', async () => null);
  const req = { params: { id: '404' } };
  const res = createResponse();

  await gadgetController.getGadgetById(req, res);

  assertJson(res, 404, { error: 'Gadget not found' });
});

test('deleteGadget returns 404 when nothing is deleted', async (t) => {
  t.mock.method(Gadget, 'delete', async () => false);
  const req = { params: { id: '99' } };
  const res = createResponse();

  await gadgetController.deleteGadget(req, res);

  assertJson(res, 404, { error: 'Gadget not found' });
});

test('deleteGadget records the deleting username for audit history', async (t) => {
  const deleteMock = t.mock.method(Gadget, 'delete', async () => true);
  const req = {
    params: { id: '12' },
    session: {
      user: {
        username: 'auditor.admin'
      }
    }
  };
  const res = createResponse();

  await gadgetController.deleteGadget(req, res);

  assert.equal(deleteMock.mock.calls[0].arguments[0], 12);
  assert.equal(deleteMock.mock.calls[0].arguments[1], 'auditor.admin');
  assertJson(res, 200, { message: 'Gadget deleted', deletedBy: 'auditor.admin' });
});

test('restoreGadget restores a deleted gadget back into inventory', async (t) => {
  const restoreMock = t.mock.method(Gadget, 'restore', async () => true);
  t.mock.method(Gadget, 'findById', async () => ({
    id: 12,
    name: 'EliteBook',
    status: 'available'
  }));
  const req = { params: { id: '12' } };
  const res = createResponse();

  await gadgetController.restoreGadget(req, res);

  assert.equal(restoreMock.mock.calls[0].arguments[0], 12);
  assertJson(res, 200, {
    message: 'Gadget restored',
    gadget: {
      id: 12,
      name: 'EliteBook',
      status: 'available'
    }
  });
});

test('restoreGadget returns 404 when the deleted gadget is not found', async (t) => {
  t.mock.method(Gadget, 'restore', async () => false);
  const req = { params: { id: '500' } };
  const res = createResponse();

  await gadgetController.restoreGadget(req, res);

  assertJson(res, 404, { error: 'Deleted gadget not found' });
});

process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');

const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');
const User = require('../models/User');
const { createResponse, assertJson } = require('./helpers');

test('login authenticates a valid user by username', async (t) => {
  const passwordHash = await bcrypt.hash('secret123', 4);
  t.mock.method(User, 'findByIdentifier', async () => ({
    id: 4,
    email: 'admin@example.com',
    username: 'admin',
    full_name: 'Admin User',
    role: 'admin',
    must_change_password: 0,
    password_hash: passwordHash
  }));
  const updateLastLoginMock = t.mock.method(User, 'updateLastLogin', async () => {});

  const req = {
    body: { identifier: 'admin', password: 'secret123' },
    session: {}
  };
  const res = createResponse();

  await authController.login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateLastLoginMock.mock.calls.length, 1);
  assert.deepEqual(req.session.user, {
    id: 4,
    email: 'admin@example.com',
    username: 'admin',
    fullName: 'Admin User',
    role: 'admin',
    mustChangePassword: false
  });
  assert.equal(res.body.mustChangePassword, false);
});

test('login authenticates a valid user by email and returns password-change status', async (t) => {
  const passwordHash = await bcrypt.hash('secret123', 4);
  t.mock.method(User, 'findByIdentifier', async () => ({
    id: 9,
    email: 'staff@example.com',
    username: 'staff.user',
    full_name: 'Staff User',
    role: 'staff',
    must_change_password: 1,
    password_hash: passwordHash
  }));
  t.mock.method(User, 'updateLastLogin', async () => {});

  const req = {
    body: { identifier: 'staff@example.com', password: 'secret123' },
    session: {}
  };
  const res = createResponse();

  await authController.login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.mustChangePassword, true);
});

test('login rejects invalid credentials', async (t) => {
  const passwordHash = await bcrypt.hash('secret123', 4);
  t.mock.method(User, 'findByIdentifier', async () => ({
    id: 4,
    email: 'admin@example.com',
    username: 'admin',
    full_name: 'Admin User',
    role: 'admin',
    must_change_password: 0,
    password_hash: passwordHash
  }));

  const req = {
    body: { identifier: 'admin', password: 'wrong-password' },
    session: {}
  };
  const res = createResponse();

  await authController.login(req, res);

  assertJson(res, 401, { error: 'Invalid credentials' });
});

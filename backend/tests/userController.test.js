process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_USER = process.env.DB_USER || 'test';
process.env.DB_NAME = process.env.DB_NAME || 'test';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');

const bcrypt = require('bcryptjs');
const userController = require('../controllers/userController');
const User = require('../models/User');
const { createResponse, assertJson } = require('./helpers');

test('createUser creates a new team member with admin audit info', async (t) => {
  const createMock = t.mock.method(User, 'create', async () => 22);
  t.mock.method(User, 'findById', async () => ({
    id: 22,
    email: 'martha@example.com',
    username: 'martha',
    full_name: 'Martha Phiri',
    role: 'staff',
    must_change_password: 1,
    is_active: 1,
    created_by: 'admin.master',
    created_at: '2026-03-15 10:00:00'
  }));

  const req = {
    body: {
      fullName: 'Martha Phiri',
      username: 'martha',
      email: 'martha@example.com',
      role: 'staff',
      password: 'TempPass123'
    },
    session: {
      user: {
        username: 'admin.master'
      }
    }
  };
  const res = createResponse();

  await userController.createUser(req, res);

  assert.equal(createMock.mock.calls.length, 1);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.user.username, 'martha');
  assert.equal(res.body.user.mustChangePassword, true);
});

test('changeOwnPassword rejects an incorrect current password', async (t) => {
  const passwordHash = await bcrypt.hash('CorrectPass123', 4);
  t.mock.method(User, 'findById', async () => ({
    id: 9,
    password_hash: passwordHash
  }));

  const req = {
    body: {
      currentPassword: 'WrongPass123',
      newPassword: 'NewPass123'
    },
    session: {
      user: {
        id: 9,
        username: 'martha'
      }
    }
  };
  const res = createResponse();

  await userController.changeOwnPassword(req, res);

  assertJson(res, 401, { error: 'Current password is incorrect' });
});

test('resetUserPassword marks the target user for password change', async (t) => {
  t.mock.method(User, 'findById', async () => ({
    id: 5,
    email: 'staff@example.com',
    username: 'staff.user',
    full_name: 'Staff User',
    role: 'staff',
    must_change_password: 1,
    is_active: 1
  }));
  const resetMock = t.mock.method(User, 'resetPassword', async () => true);

  const req = {
    params: { id: '5' },
    body: { newPassword: 'ResetPass123' },
    session: {
      user: {
        username: 'admin.master',
        role: 'admin'
      }
    }
  };
  const res = createResponse();

  await userController.resetUserPassword(req, res);

  assert.equal(resetMock.mock.calls.length, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.mustChangePassword, true);
});

test('updateUserRole promotes a staff user to admin', async (t) => {
  let readCount = 0;
  t.mock.method(User, 'findById', async () => {
    readCount += 1;
    return {
      id: 5,
      email: 'staff@example.com',
      username: 'staff.user',
      full_name: 'Staff User',
      role: readCount === 1 ? 'staff' : 'admin',
      must_change_password: 0,
      is_active: 1
    };
  });
  const updateMock = t.mock.method(User, 'update', async () => true);

  const req = {
    params: { id: '5' },
    body: { role: 'admin' },
    session: {
      user: {
        id: 1,
        username: 'admin.master',
        role: 'admin'
      }
    }
  };
  const res = createResponse();

  await userController.updateUserRole(req, res);

  assert.equal(updateMock.mock.calls.length, 1);
  assert.deepEqual(updateMock.mock.calls[0].arguments, [5, { role: 'admin' }]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user.role, 'admin');
});

test('updateUserRole blocks an admin from removing their own admin permission', async (t) => {
  t.mock.method(User, 'findById', async () => ({
    id: 1,
    email: 'admin@example.com',
    username: 'admin.master',
    full_name: 'Admin User',
    role: 'admin',
    must_change_password: 0,
    is_active: 1
  }));
  const updateMock = t.mock.method(User, 'update', async () => true);

  const req = {
    params: { id: '1' },
    body: { role: 'staff' },
    session: {
      user: {
        id: 1,
        username: 'admin.master',
        role: 'admin'
      }
    }
  };
  const res = createResponse();

  await userController.updateUserRole(req, res);

  assert.equal(updateMock.mock.calls.length, 0);
  assertJson(res, 400, {
    error: 'Use another admin account to change your own admin permission'
  });
});

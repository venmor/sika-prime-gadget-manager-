const bcrypt = require('bcryptjs');

const User = require('../models/User');
const {
  buildValidationError,
  normalizeText,
  parseIntegerId,
  sendErrorResponse
} = require('../utils/controllerHelpers');

const PASSWORD_MIN_LENGTH = 8;
const ALLOWED_ROLES = new Set(['admin', 'staff']);

function validatePassword(value, fieldName = 'Password') {
  const password = normalizeText(value);
  if (!password || password.length < PASSWORD_MIN_LENGTH) {
    throw buildValidationError(`${fieldName} must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  return password;
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.full_name || null,
    role: user.role,
    mustChangePassword: Boolean(user.must_change_password),
    isActive: Boolean(user.is_active),
    lastLoginAt: user.last_login_at || null,
    createdBy: user.created_by || null,
    createdAt: user.created_at || null
  };
}

async function listUsers(req, res) {
  try {
    const users = await User.listAll();
    res.json(users.map(sanitizeUser));
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to fetch users');
  }
}

async function createUser(req, res) {
  try {
    const email = normalizeText(req.body.email);
    const username = normalizeText(req.body.username);
    const fullName = normalizeText(req.body.fullName);
    const role = normalizeText(req.body.role) || 'staff';
    const password = validatePassword(req.body.password, 'Temporary password');

    if (!email) {
      throw buildValidationError('Email is required');
    }

    if (!username) {
      throw buildValidationError('Username is required');
    }

    if (!ALLOWED_ROLES.has(role)) {
      throw buildValidationError('Role must be admin or staff');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = await User.create({
      email,
      username,
      full_name: fullName,
      password_hash: passwordHash,
      role,
      must_change_password: true,
      created_by: req.session.user.username
    });
    const user = await User.findById(userId);
    res.status(201).json({
      message: 'User created successfully',
      user: sanitizeUser(user)
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email or username is already in use' });
    }
    return sendErrorResponse(res, error, 'Failed to create user');
  }
}

async function resetUserPassword(req, res) {
  try {
    const userId = parseIntegerId(req.params.id, 'Invalid user id');

    const newPassword = validatePassword(req.body.newPassword, 'New password');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.resetPassword(userId, passwordHash, { mustChangePassword: true });
    const updatedUser = await User.findById(userId);
    res.json({
      message: 'Password reset successfully',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to reset password');
  }
}

async function updateUserRole(req, res) {
  try {
    const userId = parseIntegerId(req.params.id, 'Invalid user id');

    const role = normalizeText(req.body.role);
    if (!ALLOWED_ROLES.has(role)) {
      throw buildValidationError('Role must be admin or staff');
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sessionUser = req.session?.user || {};
    const isSelfUpdate = (
      (sessionUser.id && sessionUser.id === user.id) ||
      (sessionUser.username && sessionUser.username === user.username)
    );

    if (isSelfUpdate) {
      return res.status(400).json({
        error: 'Use another admin account to change your own admin permission'
      });
    }

    if (user.role === role) {
      return res.json({
        message: `${user.full_name || user.username} is already ${role === 'admin' ? 'an admin' : 'staff'}`,
        user: sanitizeUser(user)
      });
    }

    await User.update(userId, { role });
    const updatedUser = await User.findById(userId);

    res.json({
      message: `${updatedUser.full_name || updatedUser.username} is now ${role === 'admin' ? 'an admin' : 'staff'}`,
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update user role');
  }
}

async function changeOwnPassword(req, res) {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser?.id) {
      return res.status(400).json({
        error: 'Password change is only available for database-backed users'
      });
    }

    const currentPassword = normalizeText(req.body.currentPassword);
    const newPassword = validatePassword(req.body.newPassword, 'New password');

    if (!currentPassword) {
      throw buildValidationError('Current password is required');
    }

    const user = await User.findById(sessionUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const matches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await User.resetPassword(user.id, passwordHash, { mustChangePassword: false });
    const updatedUser = await User.findById(user.id);

    req.session.user = {
      ...req.session.user,
      mustChangePassword: false
    };

    res.json({
      message: 'Password updated successfully',
      user: sanitizeUser(updatedUser)
    });
  } catch (error) {
    sendErrorResponse(res, error, 'Failed to update password');
  }
}

module.exports = {
  changeOwnPassword,
  createUser,
  listUsers,
  resetUserPassword,
  updateUserRole,
  sanitizeUser
};

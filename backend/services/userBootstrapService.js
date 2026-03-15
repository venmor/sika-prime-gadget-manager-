const User = require('../models/User');

function getBootstrapAdminConfig() {
  const username = process.env.ADMIN_USERNAME?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const email = process.env.ADMIN_EMAIL?.trim() || null;

  if (!username || !passwordHash) {
    return null;
  }

  return {
    username,
    passwordHash,
    email
  };
}

function isMissingUsersTableError(error) {
  return error?.code === 'ER_NO_SUCH_TABLE';
}

async function ensureBootstrapAdminUser() {
  const config = getBootstrapAdminConfig();
  if (!config) {
    return;
  }

  try {
    const existingAdmin = await User.findByIdentifier(config.username);
    if (existingAdmin) {
      return;
    }

    await User.create({
      email: config.email,
      username: config.username,
      full_name: 'System Administrator',
      password_hash: config.passwordHash,
      role: 'admin',
      must_change_password: false,
      created_by: 'system'
    });
    console.log(`Bootstrap admin user created for "${config.username}".`);
  } catch (error) {
    if (isMissingUsersTableError(error)) {
      console.warn('Users table is missing; skipping bootstrap admin creation until migrations are applied.');
      return;
    }

    if (error?.code === 'ER_DUP_ENTRY') {
      return;
    }

    throw error;
  }
}

module.exports = {
  ensureBootstrapAdminUser,
  getBootstrapAdminConfig,
  isMissingUsersTableError
};

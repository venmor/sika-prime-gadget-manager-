const User = require('../models/User');
const { getBootstrapAdminConfig, isMissingUsersTableError } = require('./userBootstrapService');

function buildSessionUser(user) {
  return {
    id: user.id ?? null,
    email: user.email || null,
    username: user.username,
    fullName: user.full_name || null,
    role: user.role || 'staff',
    mustChangePassword: Boolean(user.must_change_password)
  };
}

function matchesBootstrapAdmin(user, bootstrapAdmin) {
  if (!user || !bootstrapAdmin) {
    return false;
  }

  return (
    user.username === bootstrapAdmin.username ||
    (bootstrapAdmin.email && user.email === bootstrapAdmin.email)
  );
}

async function hydrateSessionUser(req) {
  const currentUser = req.session?.user;
  if (!currentUser?.username && !currentUser?.email) {
    return null;
  }

  try {
    let dbUser = null;

    if (currentUser.id) {
      dbUser = await User.findById(currentUser.id);
    }

    if (!dbUser) {
      const identifier = currentUser.email || currentUser.username;
      dbUser = await User.findByIdentifier(identifier);
    }

    if (dbUser) {
      const bootstrapAdmin = getBootstrapAdminConfig();
      if (matchesBootstrapAdmin(dbUser, bootstrapAdmin)) {
        const nextFields = {};

        if (dbUser.role !== 'admin') {
          nextFields.role = 'admin';
        }

        if (dbUser.must_change_password) {
          nextFields.must_change_password = 0;
        }

        if (bootstrapAdmin.email && dbUser.email !== bootstrapAdmin.email) {
          nextFields.email = bootstrapAdmin.email;
        }

        if (Object.keys(nextFields).length > 0) {
          await User.update(dbUser.id, nextFields);
          dbUser = await User.findById(dbUser.id);
        }
      }

      const sessionUser = buildSessionUser(dbUser);
      req.session.user = sessionUser;
      return sessionUser;
    }
  } catch (error) {
    if (!isMissingUsersTableError(error)) {
      throw error;
    }
  }

  const bootstrapAdmin = getBootstrapAdminConfig();
  if (!bootstrapAdmin) {
    return currentUser;
  }

  const matchesCurrentBootstrapAdmin = matchesBootstrapAdmin(currentUser, bootstrapAdmin);

  if (matchesCurrentBootstrapAdmin) {
    try {
      const createdUserId = await User.create({
        email: bootstrapAdmin.email,
        username: bootstrapAdmin.username,
        full_name: currentUser.fullName || 'System Administrator',
        password_hash: bootstrapAdmin.passwordHash,
        role: 'admin',
        must_change_password: false,
        created_by: 'system'
      });
      const createdUser = await User.findById(createdUserId);
      if (createdUser) {
        const sessionUser = buildSessionUser(createdUser);
        req.session.user = sessionUser;
        return sessionUser;
      }
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        const existingUser = await User.findByIdentifier(bootstrapAdmin.username);
        if (existingUser) {
          const sessionUser = buildSessionUser(existingUser);
          req.session.user = sessionUser;
          return sessionUser;
        }
      } else if (!isMissingUsersTableError(error)) {
        throw error;
      }
    }

    const sessionUser = {
      id: null,
      email: bootstrapAdmin.email,
      username: bootstrapAdmin.username,
      fullName: currentUser.fullName || 'System Administrator',
      role: 'admin',
      mustChangePassword: false
    };
    req.session.user = sessionUser;
    return sessionUser;
  }

  return currentUser;
}

module.exports = {
  buildSessionUser,
  hydrateSessionUser
};

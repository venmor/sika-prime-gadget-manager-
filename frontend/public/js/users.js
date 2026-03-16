document.addEventListener('DOMContentLoaded', async () => {
  const { fetchWithAuth, getCurrentUser } = window.appAuth || {};
  const {
    capitalize,
    clearMessage,
    compareStrings,
    escapeHtml,
    formatDate,
    normalizeSearchValue,
    parseErrorResponse,
    setMessage
  } = window.SikaPrimeAppUtils || {};

  if (
    !fetchWithAuth
    || !getCurrentUser
    || !capitalize
    || !clearMessage
    || !compareStrings
    || !escapeHtml
    || !formatDate
    || !normalizeSearchValue
    || !parseErrorResponse
    || !setMessage
  ) {
    console.error('Shared app helpers are not available on the users page.');
    return;
  }

  const pageMessage = document.getElementById('users-page-message');
  const passwordMessage = document.getElementById('password-message');
  const createUserMessage = document.getElementById('create-user-message');
  const userListMessage = document.getElementById('user-list-message');
  const credentialCopyMessage = document.getElementById('credential-copy-message');

  const accountName = document.getElementById('account-name');
  const accountUsername = document.getElementById('account-username');
  const accountEmail = document.getElementById('account-email');
  const accountRole = document.getElementById('account-role');
  const currentUserRole = document.getElementById('current-user-role');
  const currentUserSummary = document.getElementById('current-user-summary');
  const mustChangeBadge = document.getElementById('must-change-badge');

  const adminPanel = document.getElementById('admin-panel');
  const changePasswordForm = document.getElementById('change-password-form');
  const createUserForm = document.getElementById('create-user-form');
  const userList = document.getElementById('user-list');
  const usersTableShell = document.getElementById('users-table-shell');
  const userSearch = document.getElementById('user-search');
  const userRoleFilter = document.getElementById('user-role-filter');
  const usersVisibleCount = document.getElementById('users-visible-count');
  const sortButtons = Array.from(document.querySelectorAll('.users-table__sort'));
  const credentialHandoff = document.getElementById('credential-handoff');
  const handoffUsername = document.getElementById('handoff-username');
  const handoffPassword = document.getElementById('handoff-password');

  const state = {
    currentUser: null,
    users: [],
    latestCreatedCredentials: null,
    searchQuery: '',
    roleFilter: 'all',
    sortKey: 'name',
    sortDirection: 'asc',
    activeResetUserId: null
  };

  changePasswordForm?.addEventListener('submit', handleChangePassword);
  createUserForm?.addEventListener('submit', handleCreateUser);
  userList?.addEventListener('submit', handleResetPassword);
  userList?.addEventListener('click', handleUserRowClick);
  credentialHandoff?.addEventListener('click', handleCredentialCopy);
  userSearch?.addEventListener('input', handleTableControlChange);
  userRoleFilter?.addEventListener('change', handleTableControlChange);
  sortButtons.forEach((button) => button.addEventListener('click', handleSortChange));

  await initializePage();

  async function initializePage() {
    clearMessage(pageMessage);

    try {
      const user = await getCurrentUser({ force: true });
      state.currentUser = user;
      renderCurrentUser(user);

      const urlParams = new URLSearchParams(window.location.search);
      const showPasswordPrompt = urlParams.get('tab') === 'password' || user.mustChangePassword;
      if (showPasswordPrompt) {
        setMessage(
          pageMessage,
          'info',
          user.mustChangePassword
            ? 'Update your password to continue.'
            : 'You can update your password here.'
        );
      }

      if (user.role === 'admin') {
        adminPanel.hidden = false;
        await loadUsers();
      } else {
        adminPanel.hidden = true;
        if (!showPasswordPrompt) {
          setMessage(
            pageMessage,
            'info',
            'You can change your own password here.'
          );
        }
      }

      if (!user.id && changePasswordForm) {
        changePasswordForm.querySelectorAll('input, button').forEach((element) => {
          element.disabled = true;
        });
        setMessage(
          passwordMessage,
          'info',
          'This admin account is managed from environment settings.'
        );
      }
    } catch (error) {
      console.error(error);
      setMessage(pageMessage, 'error', error.message || 'Could not load this page.');
    }
  }

  async function loadUsers() {
    clearMessage(userListMessage);

    try {
      const response = await fetchWithAuth('/api/users');
      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Could not load users.'));
      }

      state.users = await response.json();
      applyUserTableState();
    } catch (error) {
      console.error(error);
      setMessage(userListMessage, 'error', error.message || 'Could not load users.');
      state.users = [];
      applyUserTableState();
    }
  }

  function renderCurrentUser(user) {
    const displayName = user.fullName || user.username || 'Signed in user';

    accountName.textContent = displayName;
    accountUsername.textContent = user.username || '-';
    accountEmail.textContent = user.email || 'No email assigned';
    accountRole.textContent = formatRole(user.role);
    currentUserRole.textContent = `${formatRole(user.role)} access`;
    currentUserSummary.textContent = user.mustChangePassword
      ? 'Password update needed.'
      : 'You can change your password here.';
    mustChangeBadge.hidden = !user.mustChangePassword;
  }

  function applyUserTableState() {
    const filteredUsers = getVisibleUsers();
    const hasSourceUsers = state.users.length > 0;
    const emptyMessage = hasSourceUsers ? 'No users match the current view.' : 'No users yet.';

    renderUsers(filteredUsers, emptyMessage);
    updateVisibleCount(filteredUsers.length, state.users.length);
    updateSortButtons();
  }

  function getVisibleUsers() {
    const query = normalizeSearchValue(state.searchQuery);
    const roleFilter = state.roleFilter;

    return [...state.users]
      .filter((user) => {
        if (roleFilter !== 'all' && String(user.role || '').toLowerCase() !== roleFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        const haystack = [
          user.fullName,
          user.username,
          user.email
        ]
          .map(normalizeSearchValue)
          .join(' ');

        return haystack.includes(query);
      })
      .sort(compareUsers);
  }

  function renderUsers(users, emptyMessage = 'No users yet.') {
    if (!userList) {
      return;
    }

    if (!users.length) {
      if (usersTableShell) {
        usersTableShell.hidden = false;
      }
      userList.innerHTML = `
        <tr>
          <td colspan="7">
            <div class="empty-state">${escapeHtml(emptyMessage)}</div>
          </td>
        </tr>
      `;
      return;
    }

    if (usersTableShell) {
      usersTableShell.hidden = false;
    }

    userList.innerHTML = users.map((user) => renderUserRow(user)).join('');
  }

  function handleTableControlChange() {
    state.searchQuery = userSearch?.value || '';
    state.roleFilter = userRoleFilter?.value || 'all';
    applyUserTableState();
  }

  function handleSortChange(event) {
    const sortButton = event.currentTarget;
    const sortKey = sortButton?.dataset.sortKey;

    if (!sortKey) {
      return;
    }

    if (state.sortKey === sortKey) {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortKey = sortKey;
      state.sortDirection = getDefaultSortDirection(sortKey);
    }

    applyUserTableState();
  }

  function renderUserRow(user) {
    const displayName = user.fullName || user.username;
    const roleClass = user.role === 'admin' ? 'role-pill role-pill--admin' : 'role-pill role-pill--staff';
    const resetHint = user.mustChangePassword
      ? 'Reset on next sign-in.'
      : 'Password active.';
    const isCurrentUser = Boolean(state.currentUser && state.currentUser.id === user.id);
    const nextRole = user.role === 'admin' ? 'staff' : 'admin';
    const roleActionLabel = user.role === 'admin' ? 'Remove Admin' : 'Make Admin';
    const roleActionHint = user.role === 'admin'
      ? 'This user can manage team access.'
      : 'Give this user admin access.';
    const actionTitle = isCurrentUser
      ? 'Use another admin account to change your own role.'
      : roleActionHint;

    return `
      <tr class="user-row${isCurrentUser ? ' user-row--current' : ''}">
        <td data-label="User">
          <div class="user-row__identity">
            <strong class="user-row__name">${escapeHtml(displayName)}</strong>
            <span class="user-row__meta">${escapeHtml(isCurrentUser ? 'Current user' : 'Team member')}</span>
          </div>
        </td>
        <td class="user-row__cell" data-label="Username">${escapeHtml(user.username || '-')}</td>
        <td class="user-row__cell" data-label="Email">${escapeHtml(user.email || 'No email assigned')}</td>
        <td data-label="Role">
          <div class="${roleClass}">${escapeHtml(formatRole(user.role))}</div>
        </td>
        <td class="user-row__cell" data-label="Last Login">${escapeHtml(formatDate(user.lastLoginAt, { fallback: 'Not recorded' }))}</td>
        <td data-label="Security">
          <div class="user-row__security">
            <strong>${escapeHtml(resetHint)}</strong>
            <span>${escapeHtml(user.mustChangePassword ? 'User will update after login.' : 'No reset pending.')}</span>
          </div>
        </td>
        <td data-label="Actions">
          <div class="user-row__actions">
            <div class="user-row__action-bar">
              <button
                type="button"
                class="secondary-action secondary-action--role"
                data-role-user-id="${escapeHtml(String(user.id))}"
                data-next-role="${escapeHtml(nextRole)}"
                title="${escapeHtml(actionTitle)}"
                ${isCurrentUser ? 'disabled' : ''}
              >
                ${escapeHtml(roleActionLabel)}
              </button>
              <button
                type="button"
                class="secondary-action secondary-action--role user-row__reset-toggle"
                data-toggle-reset-user-id="${escapeHtml(String(user.id))}"
                aria-expanded="${state.activeResetUserId === user.id ? 'true' : 'false'}"
              >
                Reset Password
              </button>
            </div>
            <form
              class="user-row__reset${state.activeResetUserId === user.id ? ' user-row__reset--open' : ''}"
              data-user-id="${escapeHtml(String(user.id))}"
              ${state.activeResetUserId === user.id ? '' : 'hidden'}
            >
              <input
                type="password"
                name="newPassword"
                minlength="8"
                placeholder="Temp password"
                aria-label="Temporary password"
                required
              >
              <button type="button" class="secondary-action user-row__reset-cancel" data-cancel-reset-user-id="${escapeHtml(String(user.id))}">
                Cancel
              </button>
              <button type="submit" class="table-action">Reset Password</button>
            </form>
          </div>
        </td>
      </tr>
    `;
  }

  function compareUsers(leftUser, rightUser) {
    if (state.sortKey === 'lastLogin') {
      return compareLastLogin(leftUser, rightUser);
    }

    const direction = state.sortDirection === 'desc' ? -1 : 1;
    const leftValue = getSortValue(leftUser, state.sortKey);
    const rightValue = getSortValue(rightUser, state.sortKey);

    if (typeof leftValue === 'number' && typeof rightValue === 'number') {
      if (leftValue === rightValue) {
        return compareStrings(getDisplayName(leftUser), getDisplayName(rightUser));
      }

      return (leftValue - rightValue) * direction;
    }

    const comparison = compareStrings(String(leftValue), String(rightValue));
    if (comparison !== 0) {
      return comparison * direction;
    }

    return compareStrings(getDisplayName(leftUser), getDisplayName(rightUser));
  }

  function compareLastLogin(leftUser, rightUser) {
    const leftTime = leftUser.lastLoginAt ? Date.parse(leftUser.lastLoginAt) : Number.NaN;
    const rightTime = rightUser.lastLoginAt ? Date.parse(rightUser.lastLoginAt) : Number.NaN;
    const leftMissing = !Number.isFinite(leftTime);
    const rightMissing = !Number.isFinite(rightTime);

    if (leftMissing && rightMissing) {
      return compareStrings(getDisplayName(leftUser), getDisplayName(rightUser));
    }

    if (leftMissing) {
      return 1;
    }

    if (rightMissing) {
      return -1;
    }

    return state.sortDirection === 'asc'
      ? leftTime - rightTime
      : rightTime - leftTime;
  }

  function getSortValue(user, sortKey) {
    switch (sortKey) {
      case 'username':
        return normalizeSearchValue(user.username || '');
      case 'email':
        return normalizeSearchValue(user.email || '');
      case 'role':
        return user.role === 'admin' ? 1 : 0;
      case 'security':
        return user.mustChangePassword ? 0 : 1;
      case 'name':
      default:
        return normalizeSearchValue(getDisplayName(user));
    }
  }

  function updateVisibleCount(visibleCount, totalCount) {
    if (!usersVisibleCount) {
      return;
    }

    usersVisibleCount.textContent = visibleCount === totalCount
      ? `${totalCount} users`
      : `${visibleCount} of ${totalCount} users`;
  }

  function updateSortButtons() {
    sortButtons.forEach((button) => {
      const isActive = button.dataset.sortKey === state.sortKey;
      const direction = isActive ? state.sortDirection : 'none';
      const headerCell = button.closest('th');

      button.dataset.direction = direction;
      button.setAttribute(
        'aria-label',
        isActive
          ? `${button.textContent.trim()} sorted ${state.sortDirection === 'asc' ? 'ascending' : 'descending'}`
          : `Sort by ${button.textContent.trim()}`
      );

      if (headerCell) {
        headerCell.setAttribute(
          'aria-sort',
          isActive ? (state.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'
        );
      }
    });
  }

  async function handleChangePassword(event) {
    event.preventDefault();
    clearMessage(passwordMessage);

    const formData = new FormData(changePasswordForm);
    const currentPassword = String(formData.get('currentPassword') || '');
    const newPassword = String(formData.get('newPassword') || '');
    const confirmPassword = String(formData.get('confirmPassword') || '');

    if (newPassword !== confirmPassword) {
      setMessage(passwordMessage, 'error', 'New password and confirmation must match.');
      return;
    }

    const submitButton = changePasswordForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetchWithAuth('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Could not update password.'));
      }

      const result = await response.json();
      state.currentUser = {
        ...state.currentUser,
        mustChangePassword: false
      };
      renderCurrentUser(state.currentUser);
      changePasswordForm.reset();
      setMessage(passwordMessage, 'success', result.message || 'Password updated.');
      clearMessage(pageMessage);
    } catch (error) {
      console.error(error);
      setMessage(passwordMessage, 'error', error.message || 'Could not update password.');
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    clearMessage(createUserMessage);
    clearMessage(credentialCopyMessage);

    const submitButton = createUserForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const formData = new FormData(createUserForm);
      const payload = {
        fullName: String(formData.get('fullName') || '').trim(),
        username: String(formData.get('username') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        role: String(formData.get('role') || 'staff'),
        password: String(formData.get('password') || '')
      };

      const response = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Could not create user.'));
      }

      const result = await response.json();
      state.latestCreatedCredentials = {
        username: payload.username,
        password: payload.password,
        email: payload.email,
        fullName: result.user.fullName || payload.fullName || payload.username
      };
      createUserForm.reset();
      setMessage(
        createUserMessage,
        'success',
        `${result.user.fullName || result.user.username} added.`
      );
      renderCredentialHandoff();
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(createUserMessage, 'error', error.message || 'Could not create user.');
    } finally {
      submitButton.disabled = false;
    }
  }

  function renderCredentialHandoff() {
    if (!credentialHandoff || !state.latestCreatedCredentials) {
      return;
    }

    handoffUsername.value = state.latestCreatedCredentials.username;
    handoffPassword.value = state.latestCreatedCredentials.password;
    credentialHandoff.hidden = false;
  }

  async function handleCredentialCopy(event) {
    const copyButton = event.target.closest('[data-copy-target]');
    if (!copyButton || !state.latestCreatedCredentials) {
      return;
    }

    const copyTarget = copyButton.dataset.copyTarget;
    const textToCopy = buildCopyPayload(copyTarget);
    if (!textToCopy) {
      return;
    }

    const originalText = copyButton.textContent;
    copyButton.disabled = true;

    try {
      await copyToClipboard(textToCopy);
      setMessage(
        credentialCopyMessage,
        'success',
        copyTarget === 'both'
          ? 'Sign-in details copied.'
          : `${capitalize(copyTarget)} copied.`
      );
      copyButton.textContent = 'Copied';
    } catch (error) {
      console.error(error);
      setMessage(credentialCopyMessage, 'error', 'Could not copy details. Copy them manually.');
    } finally {
      window.setTimeout(() => {
        copyButton.disabled = false;
        copyButton.textContent = originalText;
      }, 900);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();
    const form = event.target.closest('.user-row__reset');
    if (!form) {
      return;
    }

    clearMessage(userListMessage);
    const userId = form.dataset.userId;
    const passwordInput = form.querySelector('input[name="newPassword"]');
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
      const response = await fetchWithAuth(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passwordInput.value })
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Could not reset password.'));
      }

      const result = await response.json();
      state.activeResetUserId = null;
      form.reset();
      setMessage(
        userListMessage,
        'success',
        `${result.user.fullName || result.user.username} must change the password on next sign-in.`
      );
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(userListMessage, 'error', error.message || 'Could not reset password.');
    } finally {
      submitButton.disabled = false;
    }
  }

  async function handleUserRowClick(event) {
    const resetToggleButton = event.target.closest('[data-toggle-reset-user-id]');
    if (resetToggleButton) {
      const userId = Number.parseInt(resetToggleButton.dataset.toggleResetUserId || '', 10);
      state.activeResetUserId = state.activeResetUserId === userId ? null : userId;
      applyUserTableState();
      if (state.activeResetUserId === userId) {
        window.requestAnimationFrame(() => {
          const resetInput = userList?.querySelector(`.user-row__reset[data-user-id="${userId}"] input[name="newPassword"]`);
          resetInput?.focus();
        });
      }
      return;
    }

    const resetCancelButton = event.target.closest('[data-cancel-reset-user-id]');
    if (resetCancelButton) {
      state.activeResetUserId = null;
      applyUserTableState();
      return;
    }

    const roleButton = event.target.closest('[data-role-user-id]');
    if (!roleButton) {
      return;
    }

    clearMessage(userListMessage);
    const userId = roleButton.dataset.roleUserId;
    const nextRole = roleButton.dataset.nextRole;
    if (!userId || !nextRole) {
      return;
    }

    const originalText = roleButton.textContent;
    roleButton.disabled = true;
    roleButton.textContent = 'Saving...';

    try {
      const response = await fetchWithAuth(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole })
      });

      if (!response.ok) {
        throw new Error(await parseErrorResponse(response, 'Could not update role.'));
      }

      const result = await response.json();
      setMessage(
        userListMessage,
        'success',
        result.message || `${result.user.fullName || result.user.username} updated.`
      );
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(userListMessage, 'error', error.message || 'Could not update role.');
      roleButton.disabled = false;
      roleButton.textContent = originalText;
    }
  }

  function formatRole(role) {
    return role === 'admin' ? 'Admin' : 'Staff';
  }

  function getDisplayName(user) {
    return user.fullName || user.username || 'User';
  }

  function getDefaultSortDirection(sortKey) {
    return sortKey === 'lastLogin' ? 'desc' : 'asc';
  }

  function buildCopyPayload(target) {
    const credentials = state.latestCreatedCredentials;
    if (!credentials) {
      return '';
    }

    if (target === 'username') {
      return credentials.username;
    }

    if (target === 'password') {
      return credentials.password;
    }

    if (target === 'both') {
      return [
        `Username: ${credentials.username}`,
        `Temporary Password: ${credentials.password}`,
        credentials.email ? `Email: ${credentials.email}` : null,
        'Change this temporary password after the first sign-in.'
      ]
        .filter(Boolean)
        .join('\n');
    }

    return '';
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helperInput = document.createElement('textarea');
    helperInput.value = text;
    helperInput.setAttribute('readonly', '');
    helperInput.style.position = 'absolute';
    helperInput.style.left = '-9999px';
    document.body.appendChild(helperInput);
    helperInput.select();
    document.execCommand('copy');
    document.body.removeChild(helperInput);
  }

});

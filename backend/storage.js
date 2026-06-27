const fs = require('fs');
const { LINKS_DB, ADMIN_USERS_DB, PASSWORDS_DB } = require('./config');

function ensureLinksFile() {
  if (!fs.existsSync(LINKS_DB)) {
    fs.writeFileSync(LINKS_DB, JSON.stringify([], null, 2));
  }
}

function ensureAdminUsersFile() {
  if (!fs.existsSync(ADMIN_USERS_DB)) {
    fs.writeFileSync(ADMIN_USERS_DB, JSON.stringify([], null, 2));
  }
}

function ensurePasswordsFile() {
  if (!fs.existsSync(PASSWORDS_DB)) {
    fs.writeFileSync(PASSWORDS_DB, JSON.stringify([], null, 2));
  }
}

function normalizeAdminUsername(name) {
  return String(name || '').trim().replace(/^@/, '').toLowerCase();
}

function normalizeRequest(request) {
  return {
    id: request.id || `${request.userId || 'unknown'}-${request.requestedAt || Date.now()}`,
    userId: String(request.userId || ''),
    username: request.username || '',
    firstName: request.firstName || '',
    lastName: request.lastName || '',
    requestedAt: request.requestedAt || new Date().toISOString(),
    verifiedInBase: Boolean(request.verifiedInBase),
    matchedBy: request.matchedBy || '',
    joinDecision: request.joinDecision || '',
  };
}

function sanitizeName(value) {
  return String(value || '').replace(/\s+#\d+$/, '');
}

function normalizeLink(link, index) {
  const requests = Array.isArray(link.requests)
    ? link.requests.map(normalizeRequest)
    : Array.isArray(link.joinRequests)
      ? link.joinRequests.map(normalizeRequest)
      : [];
  const sequence = Number(link.sequence || index + 1);
  const rawName = link.name || link.displayName || 'Без назви';
  const name = sanitizeName(rawName);
  const url = link.url || link.inviteLink || '';

  return {
    id: link.id || Date.now() + index,
    sequence,
    name,
    displayName: sanitizeName(link.displayName || name),
    url,
    inviteLink: link.inviteLink || url,
    addedBy: link.addedBy || 'AdminPanel',
    createdBy: link.createdBy || 'Testing comment',
    createdByComment: link.createdByComment || '',
    status: link.status || 'active',
    createdAt: link.createdAt || link.date || new Date().toISOString(),
    createdAtText: link.createdAtText || link.date || new Date().toLocaleString(),
    requestCount: Number(link.requestCount || requests.length),
    requests,
  };
}

function readLinks() {
  ensureLinksFile();
  const rawData = fs.readFileSync(LINKS_DB, 'utf8');
  const parsed = rawData ? JSON.parse(rawData) : [];
  const normalized = Array.isArray(parsed) ? parsed.map(normalizeLink) : [];
  normalized.sort((a, b) => a.sequence - b.sequence);
  return normalized;
}

function writeLinks(links) {
  ensureLinksFile();
  fs.writeFileSync(LINKS_DB, JSON.stringify(links, null, 2));
}

function readAdminUsers() {
  ensureAdminUsersFile();
  const raw = fs.readFileSync(ADMIN_USERS_DB, 'utf8');
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed : [];
}

function writeAdminUsers(users) {
  ensureAdminUsersFile();
  fs.writeFileSync(ADMIN_USERS_DB, JSON.stringify(users, null, 2));
}

function readPasswords() {
  ensurePasswordsFile();
  const raw = fs.readFileSync(PASSWORDS_DB, 'utf8');
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed) ? parsed : [];
}

function writePasswords(passwords) {
  ensurePasswordsFile();
  fs.writeFileSync(PASSWORDS_DB, JSON.stringify(passwords, null, 2));
}

function normalizePassword(password) {
  return String(password || '').trim();
}

function addPassword(entry) {
  const passwords = readPasswords();
  const normalizedPassword = normalizePassword(entry.password);
  if (!normalizedPassword) return null;

  const exists = passwords.some((item) => item.password === normalizedPassword);
  if (exists) return null;

  const record = {
    id: String(entry.id || Date.now()),
    password: normalizedPassword,
    createdAt: new Date().toISOString(),
  };

  passwords.push(record);
  writePasswords(passwords);
  return record;
}

function removePassword(passwordId) {
  const passwords = readPasswords();
  const filtered = passwords.filter((item) => String(item.id) !== String(passwordId));
  if (filtered.length === passwords.length) return null;
  writePasswords(filtered);
  return true;
}

function isPasswordValid(password) {
  const normalized = normalizePassword(password);
  if (!normalized) return false;
  const passwords = readPasswords();
  return passwords.some((item) => item.password === normalized);
}

function deserializePasswords() {
  return readPasswords();
}

function addAdminUser(entry) {
  const users = readAdminUsers();
  const normalizedUsername = normalizeAdminUsername(entry.username);
  const normalized = {
    id: String(entry.id || normalizedUsername || Date.now()),
    username: normalizedUsername,
  };

  if (!normalized.username) {
    return null;
  }

  const exists = users.some((user) => user.id === normalized.id || user.username === normalized.username);
  if (exists) {
    return null;
  }

  users.push(normalized);
  writeAdminUsers(users);
  return normalized;
}

function removeAdminUser(adminId) {
  const users = readAdminUsers();
  const filtered = users.filter((user) => String(user.id) !== String(adminId));
  if (filtered.length === users.length) {
    return null;
  }
  writeAdminUsers(filtered);
  return true;
}

function nextSequence(links) {
  return links.reduce((max, link) => Math.max(max, Number(link.sequence || 0)), 0) + 1;
}

function normalizeInviteUrl(inviteUrl) {
  return String(inviteUrl || '').trim().replace(/\/+$/, '');
}

function findLinkByInviteUrl(links, inviteUrl) {
  const normalizedInviteUrl = normalizeInviteUrl(inviteUrl);
  return links.find((link) =>
    normalizeInviteUrl(link.inviteLink) === normalizedInviteUrl ||
    normalizeInviteUrl(link.url) === normalizedInviteUrl
  );
}

function userExistsOnAnyLink(links, userId) {
  const userIdString = String(userId || '');
  return links.some((link) =>
    link.requests?.some((request) => request.userId === userIdString)
  );
}

function findUserLink(links, userId) {
  const userIdString = String(userId || '');
  for (const link of links) {
    const request = link.requests?.find((r) => r.userId === userIdString);
    if (request) {
      return { link, request };
    }
  }
  return null;
}

function removeUserFromAllLinks(links, userId) {
  const userIdString = String(userId || '');
  links.forEach((link) => {
    link.requests = link.requests?.filter((r) => r.userId !== userIdString) || [];
    link.requestCount = link.requests.length;
  });
}

function recordJoinRequest({ inviteUrl, user, requestedAt, verifiedInBase = false, matchedBy = null, joinDecision = '' }) {
  const links = readLinks();
  const targetLink = findLinkByInviteUrl(links, inviteUrl);

  if (!targetLink) {
    return null;
  }

  const username = user?.username ? `@${user.username}` : '';
  const fallbackName = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
  const displayName = username || fallbackName || `ID ${user?.id || 'unknown'}`;
  
  // Перевіряємо чи користувач вже записаний де-небудь
  const existingUserLink = findUserLink(links, user?.id);
  
  // Видаляємо користувача зі всіх силок (для переносу на нову)
  removeUserFromAllLinks(links, user?.id);
  
  // Додаємо на нову силку, передаємо результат перевірки
  targetLink.requests.unshift(normalizeRequest({
    id: `${user?.id || 'unknown'}-${Date.now()}`,
    userId: user?.id,
    username: displayName,
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    requestedAt: requestedAt || new Date().toISOString(),
    verifiedInBase: Boolean(verifiedInBase),
    matchedBy: matchedBy || null,
    joinDecision: joinDecision || '',
  }));

  targetLink.requestCount = targetLink.requests.length;
  targetLink.status = 'active';

  writeLinks(links);
  
  return {
    updatedLink: normalizeLink(targetLink, targetLink.sequence - 1),
    wasMoved: existingUserLink !== null,
    previousLink: existingUserLink?.link?.displayName || null,
  };
}

function deleteLink(linkId) {
  const links = readLinks();
  const linkIdString = String(linkId);
  console.log(`deleteLink called with ID: ${linkIdString}`);
  console.log(`All links before delete:`, links.map(l => ({ id: l.id, idType: typeof l.id, name: l.name })));
  
  const filteredLinks = links.filter((link) => String(link.id) !== linkIdString);
  
  if (filteredLinks.length === links.length) {
    console.warn(`Link not found: ${linkIdString}`);
    return null;
  }
  
  console.log(`Link found and deleted. Before: ${links.length}, After: ${filteredLinks.length}`);
  writeLinks(filteredLinks);
  return true;
}

module.exports = {
  ensureLinksFile,
  ensureAdminUsersFile,
  ensurePasswordsFile,
  readLinks,
  writeLinks,
  readAdminUsers,
  writeAdminUsers,
  readPasswords,
  writePasswords,
  addPassword,
  removePassword,
  isPasswordValid,
  addAdminUser,
  removeAdminUser,
  normalizeAdminUsername,
  nextSequence,
  recordJoinRequest,
  userExistsOnAnyLink,
  findUserLink,
  removeUserFromAllLinks,
  deleteLink,
};

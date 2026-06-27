const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { DATABASE_PATH } = require('./config');

async function findUserInDatabase(user) {
  const db = await open({ filename: DATABASE_PATH, driver: sqlite3.Database });
  const userId = String(user?.id || '').trim();
  const usernameRaw = String(user?.username || '').trim();
  const username = usernameRaw.toLowerCase();
  const usernameNoAt = username.replace(/^@/, '');

  // Try lookup by exact user_id first
  if (userId) {
    try {
      const byId = await db.get(`SELECT * FROM messages WHERE user_id = ? LIMIT 1`, [userId]);
      if (byId) {
        await db.close();
        return { found: true, matchedBy: 'user_id', row: byId };
      }
    } catch (e) {
      console.error('DB lookup by user_id failed', e);
    }
  }

  // Try lookup by username (without @), exact then LIKE
  if (usernameNoAt) {
    try {
      const byUsername = await db.get(`SELECT * FROM messages WHERE LOWER(username) = ? LIMIT 1`, [usernameNoAt]);
      if (byUsername) {
        await db.close();
        return { found: true, matchedBy: 'username', row: byUsername };
      }

      const byUsernameLike = await db.get(`SELECT * FROM messages WHERE LOWER(username) LIKE ? LIMIT 1`, [`%${usernameNoAt}%`]);
      if (byUsernameLike) {
        await db.close();
        return { found: true, matchedBy: 'username_like', row: byUsernameLike };
      }
    } catch (e) {
      console.error('DB lookup by username failed', e);
    }
  }

  // Try numeric id fallback (some rows may store numeric values)
  const numericId = parseInt(userId, 10);
  if (!isNaN(numericId)) {
    try {
      const byNumId = await db.get(`SELECT * FROM messages WHERE user_id = ? LIMIT 1`, [numericId]);
      if (byNumId) {
        await db.close();
        return { found: true, matchedBy: 'user_id_numeric', row: byNumId };
      }
    } catch (e) {
      console.error('DB lookup by numeric id failed', e);
    }
  }

  await db.close();
  return { found: false, matchedBy: null, row: null };
}

module.exports = {
  findUserInDatabase,
};

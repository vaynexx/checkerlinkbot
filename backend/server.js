const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const fs = require("fs");
const path = require("path");
const { BOT_TOKEN, CHANNEL_ID, OWNER_IDS } = require("./config");
const { ensureLinksFile, readLinks, writeLinks, readAdminUsers, addAdminUser, removeAdminUser, normalizeAdminUsername, readPasswords, writePasswords, addPassword, removePassword, isPasswordValid, nextSequence, deleteLink } = require("./storage");

// Запускаємо Telegram-бота разом із бекендом, щоб обробляти заявки у канал
require("./bot");

console.log(`Backend config loaded. BOT_TOKEN set: ${Boolean(BOT_TOKEN)}, CHANNEL_ID: ${CHANNEL_ID}`);

const app = express();
console.log('server cwd:', process.cwd(), 'server file:', __filename);
app.use((req, res, next) => {
    console.log('[HTTP]', req.method, req.originalUrl);
    next();
});
app.use(cors());
app.use(express.json());

const AVATAR_DIR = path.join(__dirname, "avatars");
const FRONTEND_DIR = path.join(__dirname, "../frontend/dist");

app.use("/avatars", express.static(AVATAR_DIR));
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR);

// Serve frontend static files
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
  // SPA fallback: serve index.html for unknown routes
  app.get(/.*/, (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(FRONTEND_DIR, "index.html"));
    }
  });
}

ensureLinksFile();

function getOwnerIdFromRequest(req) {
    return String(req.headers['x-owner-id'] || req.body?.ownerId || req.query?.ownerId || '').trim();
}

function isOwnerIdValid(ownerId) {
    return OWNER_IDS.map(String).includes(String(ownerId).trim());
}

function getAccessKeyFromRequest(req) {
    return String(req.headers['x-access-key'] || req.body?.accessKey || req.query?.accessKey || '').trim();
}

function isAccessKeyValid(accessKey) {
    return isPasswordValid(accessKey);
}

function accessOnly(req, res, next) {
    const ownerId = getOwnerIdFromRequest(req);
    const accessKey = getAccessKeyFromRequest(req);

    if (isOwnerIdValid(ownerId) || isAccessKeyValid(accessKey)) {
        req.accessKey = accessKey;
        next();
        return;
    }

    return res.status(403).json({ error: 'Forbidden' });
}

function ownerOnly(req, res, next) {
    const ownerId = getOwnerIdFromRequest(req);
    if (!isOwnerIdValid(ownerId)) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    req.ownerId = ownerId;
    next();
}

ensureLinksFile();

let db;

async function initDB() {
    db = await open({ filename: "./database.db", driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT, user_id TEXT, first_name TEXT, last_name TEXT,
            avatar_path TEXT, reg_year TEXT, photo_date TEXT,
            chat_title TEXT, chat_id TEXT, text TEXT, date TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_user_id ON messages(user_id);
    `);
}

// --- API МАРШРУТИ ---

app.get("/api/search", accessOnly, async (req, res) => {
        const raw = req.query.q?.trim();
        if (!raw) return res.status(400).json({ error: "Empty query" });

        // Keep original entered query for logs
        console.log('[SEARCH] query received:', raw);

        const q = raw.replace(/^@/, '');
        let rows = [];

        try {
            // If query is numeric, try search by user_id first
            if (/^\d+$/.test(q)) {
                rows = await db.all("SELECT * FROM messages WHERE user_id = ? ORDER BY id DESC", [q]);
            }

            // If nothing found yet, try username exact and LIKE (case-insensitive)
            if (!rows.length) {
                const lower = q.toLowerCase();
                rows = await db.all(
                    "SELECT * FROM messages WHERE LOWER(username) = ? OR LOWER(username) LIKE ? ORDER BY id DESC",
                    [lower, `%${lower}%`]
                );
            }

            // As a fallback, try matching by chat_id or other heuristics if needed
            if (!rows.length && /^\d+$/.test(q)) {
                rows = await db.all("SELECT * FROM messages WHERE chat_id = ? ORDER BY id DESC", [q]);
            }
        } catch (err) {
            console.error('[SEARCH] DB error:', err);
            return res.status(500).json({ error: 'DB error' });
        }

        console.log('[SEARCH] rows found:', rows.length);
        if (!rows.length) return res.json({ found: false });

        const first = rows[0];
        return res.json({ found: true, ...first, chatsList: [...new Set(rows.map(r => r.chat_title))], messages: rows });
});

app.post('/api/admin/verify-owner', (req, res) => {
    const ownerId = getOwnerIdFromRequest(req);
    if (!ownerId) {
        return res.status(400).json({ error: 'Owner ID is required' });
    }

    if (!isOwnerIdValid(ownerId)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
    const password = String(req.body?.password || '').trim();
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    if (!isPasswordValid(password)) {
        return res.status(403).json({ error: 'Invalid password' });
    }

    res.json({ ok: true });
});

app.post('/api/auth/verify', (req, res) => {
    const password = String(req.body?.password || '').trim();
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    if (!isPasswordValid(password)) {
        return res.status(403).json({ error: 'Invalid password' });
    }

    res.json({ ok: true });
});

app.get('/api/admin/passwords', ownerOnly, (req, res) => {
    res.json(readPasswords());
});

app.post('/api/admin/passwords', ownerOnly, (req, res) => {
    const entry = req.body;
    if (!entry || !entry.password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    const added = addPassword(entry);
    if (!added) {
        return res.status(409).json({ error: 'Password already exists or invalid data' });
    }

    res.status(201).json(added);
});

app.delete('/api/admin/passwords/:id', ownerOnly, (req, res) => {
    const removed = removePassword(req.params.id);
    if (!removed) {
        return res.status(404).json({ error: 'Password not found' });
    }
    res.json({ success: true });
});

app.get('/api/admin/users', ownerOnly, (req, res) => {
    res.json(readAdminUsers());
});

app.post('/api/admin/users', ownerOnly, (req, res) => {
    const username = String(req.body?.username || '').trim();
    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const added = addAdminUser({ username });
    if (!added) {
        return res.status(409).json({ error: 'User already exists or invalid username' });
    }

    res.status(201).json(added);
});

app.delete('/api/admin/users/:id', ownerOnly, (req, res) => {
    const removed = removeAdminUser(req.params.id);
    if (!removed) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true });
});

app.get('/api/admin/links', accessOnly, (req, res) => {
    const ownerId = getOwnerIdFromRequest(req);
    const accessKey = getAccessKeyFromRequest(req);
    const isOwner = isOwnerIdValid(ownerId);
    
    let links = readLinks();
    
    // Owner sees all links; regular users see only their own or old links without creator info
    if (!isOwner && accessKey) {
        links = links.filter(link => {
            // Show link if created by this access key
            if (link.createdByAccessKey === accessKey) return true;
            // Show link if it's a truly legacy link (no creator info at all)
            if (!link.createdByAccessKey && !link.createdByOwnerId) return true;
            return false;
        });
    }
    
    res.json(links);
});

app.delete('/api/admin/links/:id', accessOnly, (req, res) => {
    try {
        const linkId = req.params.id;
        console.log(`Deleting link with ID: ${linkId}`);
        
        const links = readLinks();
        console.log(`Current links IDs: ${links.map(l => l.id).join(', ')}`);
        
        const result = deleteLink(linkId);
        console.log(`Delete result: ${result}`);
        
        if (!result) {
            console.warn(`Link with ID ${linkId} not found`);
            return res.status(404).json({ error: 'Link not found' });
        }
        
        res.json({ success: true, message: 'Link deleted' });
    } catch (error) {
        console.error('❌ Error deleting link:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/admin/links/:id', accessOnly, (req, res) => {
    const link = readLinks().find((entry) => String(entry.id) === String(req.params.id));

    if (!link) {
        return res.status(404).json({ error: 'Link not found' });
    }

    res.json(link);
});

app.get('/api/check-chat', async (req, res) => {
    try {
        const chatResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${CHANNEL_ID}`);
        const chatPayload = await chatResponse.json();

        const adminsResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatAdministrators?chat_id=${CHANNEL_ID}`);
        const adminsPayload = await adminsResponse.json();

        res.json({
            channelId: CHANNEL_ID,
            chat: chatPayload,
            administrators: adminsPayload,
        });
    } catch (error) {
        console.error('Error checking chat:', error);
        res.status(500).json({ error: error.message || 'Chat check failed' });
    }
});

async function createJoinRequestLink(name) {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: CHANNEL_ID,
            name,
            creates_join_request: true,
        }),
    });

    const payload = await response.json();
    console.log('Telegram createChatInviteLink response:', payload);

    if (!payload.ok) {
        const details = JSON.stringify({
            chat_id: CHANNEL_ID,
            name,
            creates_join_request: true,
            response: payload,
        }, null, 2);
        throw new Error(`Telegram API error: ${payload.description || 'unknown'}. Details: ${details}`);
    }

    return payload.result;
}

app.post('/api/create-link', accessOnly, async (req, res) => {
    console.log('Create-link request body:', req.body);
    const cleanName = String(req.body?.name || '').trim();
    const creatorName = String(req.body?.creatorName || '').trim();
    const creatorComment = String(req.body?.creatorComment || '').trim();
    const ownerId = getOwnerIdFromRequest(req);
    const accessKey = req.accessKey;

    if (!cleanName) {
        return res.status(400).json({ error: 'Name is required' });
    }

    const adminUsers = readAdminUsers();
    const normalizedCreator = normalizeAdminUsername(creatorName);
    const allowedByAdminList = adminUsers.some((user) => normalizeAdminUsername(user.username) === normalizedCreator);
    const allowedByOwner = isOwnerIdValid(ownerId);
    const allowedByAccessKey = Boolean(accessKey);

    if (!allowedByOwner && !allowedByAdminList && !allowedByAccessKey) {
        return res.status(403).json({ error: 'Creator is not an allowed admin user' });
    }

    try {
        const links = readLinks();
        const sequence = nextSequence(links);
        const displayName = cleanName;
        const result = await createJoinRequestLink(displayName);

        const newEntry = {
            id: Date.now(),
            sequence,
            name: cleanName,
            displayName,
            url: result.invite_link,
            inviteLink: result.invite_link,
            addedBy: allowedByOwner ? 'Owner' : allowedByAccessKey ? 'AccessUser' : 'AdminUser',
            createdBy: creatorName,
            createdByComment: creatorComment,
            createdByAccessKey: accessKey || null,
            createdByOwnerId: ownerId || null,
            status: 'active',
            requestCount: 0,
            requests: [],
            createdAt: new Date().toISOString(),
            createdAtText: new Date().toLocaleString(),
        };

        writeLinks([...links, newEntry]);

        res.status(201).json(newEntry);
    } catch (error) {
        console.error('❌ Telegram API error:', error.message);

        res.status(500).json({
            error: 'Помилка Telegram: ' + (error.errorMessage || error.message)
        });
    }
});

initDB().then(async () => {
    console.log("✅ Сервер та бот активні.");
    app.listen(5000, () => console.log(`🚀 Сервер: http://localhost:5000`));
});
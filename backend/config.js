const path = require('path');

// Для Railway: використовувати /app/data для persistent storage
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : __dirname;

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN || '8611102772:AAFvBrJiX1DKGxjkSKEP9AIToPvQY63BpQY',
  CHANNEL_ID: process.env.CHANNEL_ID || '-1003919624231',
  // Тепер канали зберігаються як об'єкт
  CHANNELS: {
    channel1: { id: '-1003922806245', name: 'Канал №1' },
    channel2: { id: '-100123456789', name: 'Канал №2' }, // Замініть на реальні ID
    channel3: { id: '-100987654321', name: 'Канал №3' }  // Замініть на реальні ID
  },
  DATABASE_PATH: path.join(DATA_DIR, 'database.db'),
  LINKS_DB: path.join(DATA_DIR, 'links.json'),
  ADMIN_USERS_DB: path.join(DATA_DIR, 'adminUsers.json'),
  PASSWORDS_DB: path.join(DATA_DIR, 'passwords.json'),
  OWNER_IDS: [8335140994, 5694828046],
};
const { Telegraf } = require('telegraf');
const { Markup } = require('telegraf');
const { BOT_TOKEN, CHANNELS } = require('./config');
const { readLinks, recordJoinRequest, userExistsOnAnyLink, findUserLink } = require('./storage');
const { findUserInDatabase } = require('./userLookup');

const bot = new Telegraf(BOT_TOKEN);

function buildLinksMenu(links) {
    if (!links.length) {
        return { text: 'Поки що немає створених закритих посилань.', markup: null };
    }

    const buttons = links.map((link) => [
        Markup.button.callback(`${link.sequence}. ${link.displayName} (${link.requestCount || 0})`, `link_${link.id}`),
    ]);

    return {
        text: 'Ось усі створені посилання. Натисни на будь-яке, щоб подивитися заявки.',
        markup: Markup.inlineKeyboard([
            ...buttons,
            [Markup.button.callback('🔄 Оновити список', 'links_refresh')],
        ]),
    };
}

function formatLinkDetails(link) {
    const requests = link.requests || [];
    const usersList = requests.length
        ? requests.map((request, index) => `${index + 1}. ${request.username || 'Без username'}`).join('\n')
        : 'Поки що заявок немає.';

    return [
        `Назва: ${link.displayName}`,
        `Посилання: ${link.url}`,
        `Заявок: ${link.requestCount || 0}`,
        '',
        'Список користувачів:',
        usersList,
    ].join('\n');
}

bot.on('chat_join_request', async (ctx) => {
    const joinRequest = ctx.update.chat_join_request;
    const inviteUrl = joinRequest.invite_link?.invite_link || joinRequest.invite_link?.url || '';
    const databaseCheck = await findUserInDatabase(joinRequest.from);
    const joinDecision = databaseCheck.found ? 'approved' : 'declined';

    console.log('chat_join_request received:', {
        chatId: joinRequest.chat?.id,
        userId: joinRequest.from?.id,
        username: joinRequest.from?.username,
        inviteUrl,
        verifiedInDatabase: databaseCheck.found,
        matchedBy: databaseCheck.matchedBy,
    });

    // DO NOT auto-approve or auto-decline join requests here.
    // Keep them pending so admins can manually review and decide.
    try {
        await ctx.answerChatJoinRequest(joinRequest.from.id, false).catch(() => {});
    } catch (err) {
        // answerChatJoinRequest may not be necessary; ignore errors
    }

    const result = recordJoinRequest({
        inviteUrl,
        user: joinRequest.from,
        requestedAt: joinRequest.date ? new Date(joinRequest.date * 1000).toISOString() : new Date().toISOString(),
        verifiedInBase: databaseCheck.found,
        matchedBy: databaseCheck.matchedBy,
        joinDecision,
    });

    if (!result) {
        console.warn('Join request did not match any saved invite link:', inviteUrl);
    } else {
        const { updatedLink, wasMoved, previousLink } = result;
        if (wasMoved) {
            console.log(`🔄 Переміщення: ${updatedLink.requests[0]?.username || 'unknown'} - з "${previousLink}" → "${updatedLink.displayName}"`);
        } else {
            console.log(`✅ Нова заявка: ${updatedLink.displayName} -> ${updatedLink.requests[0]?.username || 'unknown'} (${joinDecision})`);
        }
        try {
            const req = updatedLink.requests[0];
            const foundText = databaseCheck.found ? `✅ Найден в базе (${databaseCheck.matchedBy})` : '❌ Не найден в базе';
            const message = [
                `Заявка на вступление: <b>${updatedLink.displayName}</b>`,
                `Пользователь: ${req.username || (joinRequest.from.username ? '@' + joinRequest.from.username : 'ID ' + joinRequest.from.id)}`,
                `ID: ${joinRequest.from.id}`,
                `${foundText}`,
                `Решение: ${joinDecision}`,
                `Время: ${new Date(req.requestedAt || Date.now()).toLocaleString()}`,
            ].join('\n');

            const targetChannelId = joinRequest.chat.id; 
await ctx.telegram.sendMessage(targetChannelId, message, { parse_mode: 'HTML' });
        } catch (err) {
            console.error('Ошибка отправки уведомления о заявке:', err);
        }
    }
});

// Меню вибору каналу
const buildChannelMenu = () => {
    const buttons = Object.entries(CHANNELS).map(([key, ch]) => [
        Markup.button.callback(ch.name, `select_ch_${key}`)
    ]);
    return Markup.inlineKeyboard(buttons);
};

bot.start((ctx) => ctx.reply('Виберіть канал:', buildChannelMenu()));
bot.command('links', (ctx) => ctx.reply('Виберіть канал:', buildChannelMenu()));

// Обробка вибору каналу
bot.action(/select_ch_(.+)/, async (ctx) => {
    const channelKey = ctx.match[1];
    const channelId = CHANNELS[channelKey].id;
    
    const links = readLinks().filter(l => l.channelId === channelId);
    const { text, markup } = buildLinksMenu(links);
    
    // Додаємо кнопку повернення
    const newKeyboard = markup ? [...markup.inline_keyboard, [Markup.button.callback('⬅️ До каналів', 'back_to_channels')]] : [[Markup.button.callback('⬅️ До каналів', 'back_to_channels')]];
    
    await ctx.editMessageText(text, { reply_markup: { inline_keyboard: newKeyboard } });
});

bot.action('back_to_channels', async (ctx) => {
    await ctx.editMessageText('Виберіть канал:', buildChannelMenu());
});

bot.action('links_refresh', async (ctx) => {
    // Тут логіка оновлення (можна додати збереження поточного каналу в сесію)
    await ctx.answerCbQuery('Оновлено (поверніться до списку каналів для актуалізації)');
});

bot.action(/link_(.+)/, async (ctx) => {
    const linkId = ctx.match[1];
    const link = readLinks().find((entry) => String(entry.id) === String(linkId));

    if (!link) {
        await ctx.answerCbQuery('Посилання не знайдено');
        return;
    }

    const detailsKeyboard = Markup.inlineKeyboard([
        [Markup.button.callback('⬅️ Назад до списку', 'back_to_channels')],
    ]);

    await ctx.editMessageText(formatLinkDetails(link), detailsKeyboard);
    await ctx.answerCbQuery();
});

// Запуск бота
bot.launch().then(() => {
    console.log('Бот успішно запущений!');
}).catch((err) => {
    console.error('Помилка запуску бота:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
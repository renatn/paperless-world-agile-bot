const result = require('dotenv').config();
if (result.error) {
  throw result.error
}

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: true });

let sprintId = 'Безбумажный мир. Спринт №5';
let processed = {};
const storage = {};
storage[sprintId] = {};

const username = from => `[${from.username}] ${from.first_name} ${from.last_name}`;

const vote = (userId, username, choice, comment = '') => {
    console.info(`User ${username} vote :)`);

    storage[sprintId][userId] = {
        state: 'VOTE',
        choice,
        comment,
        username     
    };
};

const comment = (userId, message) => {
    const x = storage[sprintId][userId].comment; 
    storage[sprintId][userId].comment = x + '\n' + message;
};


bot.onText(/\/start/, (msg) => {
    console.log(msg);
    bot.sendMessage(msg.chat.id, sprintId, {
        reply_markup: {
            keyboard: [
                [':) встреча прошла хорошо'], 
                [':| встреча могла бы пройти лучше'], 
                [':( встреча прошла плохо']
            ],
            one_time_keyboard: true
        }
    });
    processed[msg.from.id] = true;
});


bot.onText(/\/sprint (.+)/, (msg, match) => {
    const sprint = match[1];
    sprintId = sprint;
    processed[msg.from.id] = true;
    bot.sendMessage(msg.chat.id, 'Новый спринт: ${sprintId}');
});

bot.onText(/\/stats/, (msg, match) => {
    const sprint = storage[sprintId];
    const table = Object.keys(sprint).map(uid => {
        const user = sprint[uid];
        return `${user.username} проголосовал ${user.choice} - ${user.comment} `;
    });

    bot.sendMessage(msg.chat.id, JSON.stringify(table));
});


bot.onText(/:\)*/, msg => {
    vote(msg.from.id, username(msg.from), ':)');
    bot.sendMessage(msg.chat.id, "Почему?");

    console.log(storage);
});

bot.on('message', (msg) => {
    if (processed[msg.from.id]) {
        console.log('Skip message');
        processed[msg.from.id] = false;
        return;
    }

    const x = storage[sprintId][msg.from.id];
    if (!x) {
        console.log(`User ${username(msg.from)} has not vote yet`);
        return;
    }
    comment(msg.from.id, msg.text);

    bot.sendMessage(msg.chat.id, "Спасибо!");

    console.log(storage);
});
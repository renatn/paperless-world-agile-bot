const result = require('dotenv').config();
if (result.error) {
  throw result.error
}

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;


const myFormat = printf(info => {
  return `${info.timestamp} ${info.level}: ${info.message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    myFormat
  ),
  transports: [
    new transports.Console(),    
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

const TelegramBot = require('node-telegram-bot-api');
const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, { polling: true });

let sprintId = 'Безбумажный мир. Спринт №5';
let eventId = 'Stand Up';
let processed = {};
const storage = {};
storage[sprintId] = {};

const users = [];

const username = from => `[${from.username}] ${from.first_name} ${from.last_name}`;

const vote = (userId, username, choice, comment = '') => {
    logger.info(`User ${username} vote ${choice}`);

    const x = storage[sprintId][userId];
    if (x) {
        return;
    }

    storage[sprintId][userId] = {
        state: 'VOTE',
        choice,
        comment,
        username     
    };
};

const comment = (userId, message) => {
    const x = storage[sprintId][userId]; 
    x.comment = x.comment + '\n' + message;
    x.state = 'COMMENT';
};


bot.onText(/\/start/, (msg) => {
    logger.info(JSON.stringify(msg));
    
    const x = storage[sprintId][msg.from.id];
    if (x) {
        logger.info(`User ${username(msg.from)} already voted`);
        bot.sendMessage(msg.chat.id, 'Братан ты уже голосовал, дождись следующей церемонии');
        return;
    }
   
    bot.sendMessage(msg.chat.id, `${sprintId}. Как прошла церемония: *${eventId}*?`, {
        parse_mode: 'Markdown',
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

    const x = storage[sprintId];
    Object.keys(x).forEach(uid => {
        const user = storage[sprintId][uid];
        bot.sendMessage(uid, `Новая церемония ${sprint}, время голосовать!`, {
            parse_mode: 'Markdown',
            reply_markup: {
                keyboard: [
                    [':) встреча прошла хорошо'], 
                    [':| встреча могла бы пройти лучше'], 
                    [':( встреча прошла плохо']
                ],
                one_time_keyboard: true
            }
            
        });
    });

    sprintId = sprint;
    storage[sprintId] = {};
    bot.sendMessage(msg.chat.id, `Новый спринт: ${sprintId}`);
});

bot.onText(/\/stats/, (msg, match) => {
    const sprint = storage[sprintId];
    const table = Object.keys(sprint).map(uid => {
        const user = sprint[uid];
        return `${user.username} проголосовал ${user.choice} - ${user.comment} `;
    });

    bot.sendMessage(msg.chat.id, JSON.stringify(table));
});


bot.onText(/:\).+/, msg => {
    vote(msg.from.id, username(msg.from), ':)');
    bot.sendMessage(msg.chat.id, 'Здорово! Хорошего дня!');
});


bot.onText(/:\|.+/, msg => {
    vote(msg.from.id, username(msg.from), ':|');
    bot.sendMessage(msg.chat.id, "Прокомментируешь?");
});

bot.onText(/:\(.+/, msg => {
    vote(msg.from.id, username(msg.from), ':(');
    bot.sendMessage(msg.chat.id, "Что пошло не так?");
});


bot.on('message', (msg) => {
    const x = storage[sprintId][msg.from.id];
    if (!x || x.state === 'COMMENT') {
        logger.info(`User ${username(msg.from)} has not vote yet`);
        return;
    }


    comment(msg.from.id, msg.text);

    bot.sendMessage(msg.chat.id, "Спасибо!");

    logger.info(JSON.stringify(storage));
});
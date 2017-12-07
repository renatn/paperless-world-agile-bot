const config = require('dotenv').config();

if (config.error) {
  throw config.error;
}

const { logger } = require('./logger');
const storage = require('./storage');


const keyboard = [
  [':) встреча прошла хорошо 😀 '],
  [':| встреча могла бы пройти лучше 😐'],
  [':( встреча прошла плохо 💩'],
];

const username = from => `[${from.username}] ${from.first_name} ${from.last_name}`;

const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY, {
  onlyFirstMatch: true,
  polling: {
    autoStart: false,
  },
});

let activeEventId = null;


const isGodMode = userId => (userId === 78986164 || userId === 368589191);

const handleUnknowUser = msg => (unknown) => {
  if (unknown) {
    logger.info(`New user ${msg.from.first_name}`);
    return storage.storeUser(msg.from);
  }
  if (!activeEventId) {
    throw new Error('Воу воу воу, братан, я сообщу когда надо будет голосовать');
  }
  return '';
};

const handleAlreadyVotedUser = msg => (already) => {
  if (already) {
    logger.info(`User ${username(msg.from)} already voted`);
    throw new Error('Братан ты уже голосовал, дождись следующей церемонии');
  }
};

const handleDatabaseConnect = (connected) => {
  if (connected) {
    logger.info('Bot start polling...');
    storage.getActiveEventId().then((eventId) => {
      activeEventId = eventId;
      bot.startPolling();
    });
  } else {
    logger.info('Bot stop polling!');
    bot.stopPolling();
  }
};

const handleChangeActiveEvent = (eventId) => {
  activeEventId = eventId;
  logger.info(`Acitve Event ID ${activeEventId}`);
};

const notifyUsers = (msg, eventName) => (users) => {
  logger.info(`Новая церемония ${eventName}`);
  users.filter(user => user.id !== msg.from.id).forEach((user) => {
    bot.sendMessage(user.id, `Новая церемония *${eventName}*, время голосовать!`, {
      parse_mode: 'Markdown',
      reply_markup: {
        keyboard,
        one_time_keyboard: true,
      },
    });
  });
};


storage.connect(handleDatabaseConnect);

const handleStartCommand = msg => (event) => {
  let godmode = '';
  if (isGodMode(msg.from.id)) {
    godmode = '*[GOD MODE]* ';
  }

  bot.sendMessage(msg.chat.id, `${godmode}${msg.from.first_name}, как прошла церемония: *${event.name}*?`, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard,
      one_time_keyboard: true,
    },
  });
};

const handleStatsCommand = msg => (event) => {
  storage.getEventVotes(activeEventId).then((votes) => {
    let result = `*${event.name}*\n---\n`;
    votes.forEach((vote) => {
      result += `*${vote.username}* проголосовал *${vote.choice}* > ${vote.comment} \n`;
    });
    bot.sendMessage(msg.chat.id, result, { parse_mode: 'Markdown' });
  });
};


bot.onText(/\/start/, (msg) => {
  logger.info(JSON.stringify(msg));

  storage.isUnknownUser(msg.from.id).then(handleUnknowUser(msg))
    .then(() => storage.isUserAlreadyVoted(activeEventId, msg.from.id))
    .then(handleAlreadyVotedUser(msg))
    .then(() => storage.getEventById(activeEventId))
    .then(handleStartCommand(msg))
    .catch((e) => {
      bot.sendMessage(msg.chat.id, e.message);
    });
});


bot.onText(/\/event (.+)/, (msg, match) => {
  const eventName = match[1];

  return storage
    .storeEvent(eventName)
    .then(handleChangeActiveEvent)
    .then(storage.getUsers)
    .then(notifyUsers(msg, eventName));
});

bot.onText(/\/stats/, (msg) => {
  storage.getEventById(activeEventId).then(handleStatsCommand(msg));
});


bot.onText(/:\).+/, (msg) => {
  storage.storeVote(activeEventId, msg.from, ':)');
  bot.sendMessage(msg.chat.id, 'Здорово! Хорошего дня!', {
    reply_markup: {
      hide_keyboard: true,
    },
  });
});


bot.onText(/:\|.+/, (msg) => {
  storage.storeVote(activeEventId, msg.from, ':|');
  bot.sendMessage(msg.chat.id, 'Прокомментируешь?', {
    reply_markup: {
      hide_keyboard: true,
    },
  });
});

bot.onText(/:\(.+/, (msg) => {
  storage.storeVote(activeEventId, msg.from, ':(');
  bot.sendMessage(msg.chat.id, 'Что пошло не так?', {
    reply_markup: {
      hide_keyboard: true,
    },
  });
});

bot.onText(/.+/, (msg) => {
  storage.isUserAlreadyVoted(activeEventId, msg.from.id).then((x) => {
    if (!x) {
      return;
    }
    storage.storeComment(activeEventId, msg.from.id, msg.text);
    bot.sendMessage(msg.chat.id, 'Записал!');
  });
});

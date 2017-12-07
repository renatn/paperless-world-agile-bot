const { createLogger, format, transports } = require('winston');

const { combine, timestamp, printf } = format;


const myFormat = printf(info => `${info.timestamp} ${info.level}: ${info.message}`);

exports.logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    myFormat,
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
  ],
});

const env = require('./env');

let logger;
try {
  const pino = require('pino');
  logger = pino({
    level: env.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'password',
        '*.password',
        'token',
        '*.token',
      ],
      censor: '[REDACTED]',
    },
  });
} catch (e) {
  const noop = () => {};
  logger = {
    info: env.isTest ? noop : console.log.bind(console),
    warn: env.isTest ? noop : console.warn.bind(console),
    error: env.isTest ? noop : console.error.bind(console),
    debug: env.isTest ? noop : console.debug.bind(console),
    child: () => logger,
  };
}

module.exports = logger;

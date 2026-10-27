import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  level: (process.env.LOG_LEVEL || 'info') as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent',
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
  redact: ['req.headers.authorization'],
});

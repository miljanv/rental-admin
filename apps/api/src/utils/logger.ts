import { env } from '../config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const minimumLevel: LogLevel = env.isProduction ? 'info' : 'debug';

const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause ? { cause: serializeError(error.cause) } : {}),
    };
  }

  return { value: String(error) };
};

const write = (level: LogLevel, message: string, context?: Record<string, unknown>): void => {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minimumLevel] || env.isTest) {
    return;
  }

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ?? {}),
  };

  const line = env.isProduction ? JSON.stringify(entry) : `[${level}] ${message}`;
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;

  stream.write(`${line}\n`);

  if (!env.isProduction && context && Object.keys(context).length > 0) {
    stream.write(`${JSON.stringify(context, null, 2)}\n`);
  }
};

/**
 * Minimal structured logger. Errors are always logged with their full stack on
 * the server, even when the client only receives a generic message.
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    write('error', message, {
      ...(context ?? {}),
      ...(error !== undefined ? { error: serializeError(error) } : {}),
    }),
};

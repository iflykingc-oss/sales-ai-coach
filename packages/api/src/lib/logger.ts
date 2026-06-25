/**
 * Structured logger for the API server.
 *
 * In development: human-readable colored output.
 * In production: JSON lines for log aggregation (ELK, Datadog, etc.).
 */

const isProd = process.env.NODE_ENV === 'production';

function timestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, msg: string, meta?: Record<string, unknown>): string {
  if (isProd) {
    return JSON.stringify({ level, msg, time: timestamp(), ...meta });
  }
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp()}] [${level.toUpperCase()}] ${msg}${metaStr}`;
}

export const logger = {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (!isProd) console.debug(formatMessage('debug', msg, meta));
  },

  info(msg: string, meta?: Record<string, unknown>) {
    console.log(formatMessage('info', msg, meta));
  },

  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(formatMessage('warn', msg, meta));
  },

  error(msg: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const errMeta = error instanceof Error
      ? { error: error.message, stack: error.stack, ...meta }
      : { error: String(error), ...meta };
    console.error(formatMessage('error', msg, errMeta));
  },

  /** Create a child logger with pre-set context fields */
  child(context: Record<string, unknown>) {
    return {
      debug: (msg: string, meta?: Record<string, unknown>) => logger.debug(msg, { ...context, ...meta }),
      info: (msg: string, meta?: Record<string, unknown>) => logger.info(msg, { ...context, ...meta }),
      warn: (msg: string, meta?: Record<string, unknown>) => logger.warn(msg, { ...context, ...meta }),
      error: (msg: string, error?: Error | unknown, meta?: Record<string, unknown>) => logger.error(msg, error, { ...context, ...meta }),
    };
  },
};

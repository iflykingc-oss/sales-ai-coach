/**
 * Simple logger for legacy Vercel serverless functions.
 * In production: JSON lines for log aggregation.
 * In development: human-readable output.
 */

const isProd = process.env.NODE_ENV === 'production';

function formatMessage(level, msg, meta) {
  if (isProd) {
    return JSON.stringify({ level, msg, time: new Date().toISOString(), ...meta });
  }
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${msg}${metaStr}`;
}

module.exports = {
  debug(msg, meta) {
    if (!isProd) console.debug(formatMessage('debug', msg, meta));
  },
  info(msg, meta) {
    console.log(formatMessage('info', msg, meta));
  },
  warn(msg, meta) {
    console.warn(formatMessage('warn', msg, meta));
  },
  error(msg, error, meta) {
    const errMeta = error instanceof Error
      ? { error: error.message, stack: error.stack, ...meta }
      : { error: String(error), ...meta };
    console.error(formatMessage('error', msg, errMeta));
  },
};

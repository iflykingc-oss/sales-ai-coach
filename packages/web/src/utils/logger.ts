/**
 * Production-safe logger.
 *
 * In development all levels emit to the console.
 * In production only errors are forwarded (to Sentry once integrated).
 */

const isDev = import.meta.env.DEV;

function formatArgs(msg: string, ...args: unknown[]): [string, ...unknown[]] {
  return [msg, ...args];
}

export const logger = {
  debug(msg: string, ...args: unknown[]) {
    if (isDev) console.debug(...formatArgs(msg, ...args));
  },

  info(msg: string, ...args: unknown[]) {
    if (isDev) console.info(...formatArgs(msg, ...args));
  },

  warn(msg: string, ...args: unknown[]) {
    if (isDev) console.warn(...formatArgs(msg, ...args));
  },

  /** Always logs; in production also reports to Sentry when available. */
  error(msg: string, ...args: unknown[]) {
    console.error(...formatArgs(msg, ...args));
    // Sentry integration point — uncomment when @sentry/react is installed:
    // if (!isDev) captureException(args[0] instanceof Error ? args[0] : new Error(msg));
  },
};

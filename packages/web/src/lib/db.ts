import { get, set, del } from 'idb-keyval';

const DB_PREFIX = 'sales-ai-coach:';

export const localDb = {
  async getItem(key: string) {
    try {
      return await get(`${DB_PREFIX}${key}`);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: unknown) {
    try {
      await set(`${DB_PREFIX}${key}`, value);
    } catch (e) {
      console.warn('IndexedDB write failed:', e);
    }
  },

  async removeItem(key: string) {
    try {
      await del(`${DB_PREFIX}${key}`);
    } catch {
      // ignore
    }
  },

  // Session caching
  async cacheSession(sessionId: string, data: unknown) {
    await this.setItem(`session:${sessionId}`, data);
  },

  async getCachedSession(sessionId: string) {
    return this.getItem(`session:${sessionId}`);
  },

  async clearAllSessions() {
    // In production, iterate and clear; for now just log
    console.log('Clear all cached sessions');
  },
};

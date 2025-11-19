import { RedisClient } from './RedisClient.js';

export class RedisStore {
  constructor(options = {}) {
    this.client = new RedisClient(options);
    this.prefix = options.prefix || 'xbet';
  }

  async connect() {
    try {
      await this.client.connect();
    } catch (err) {
      console.error('[redis] 连接失败:', err.message);
      throw err;
    }
  }

  buildKey(kind) {
    return `${this.prefix}:${kind}`;
  }

  async save(kind, id, payload) {
    if (!this.client.connected) return;
    const key = this.buildKey(kind);
    const field = String(id);
    const value = JSON.stringify(payload);
    try {
      await this.client.command('HSET', key, field, value);
    } catch (err) {
      console.warn('[redis] 写入失败', key, field, err.message);
    }
  }

  async close() {
    this.client.quit();
  }
}

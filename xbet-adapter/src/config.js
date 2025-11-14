import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(resolve(path), 'utf-8'));
  } catch {
    return {};
  }
}

const defaultConfig = {
  endpoint: process.env.XBET_ENDPOINT || 'wss://gw.xbetbot.com/?lang=zh-CN',
  token: process.env.XBET_TOKEN || '',
  username: process.env.XBET_USERNAME || '',
  password: process.env.XBET_PASSWORD || '',
  subscriptions: ['matches', 'odds', 'live'],
  heartbeatIntervalMs: Number(process.env.XBET_HEARTBEAT_MS || 30000),
  redis: {
    enabled: process.env.REDIS_ENABLED === '1' || process.env.REDIS_HOST,
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: Number(process.env.REDIS_DB || 0),
    prefix: process.env.REDIS_PREFIX || 'xbet'
  },
  internalWs: {
    enabled: process.env.INTERNAL_WS_ENABLED === '1',
    port: Number(process.env.INTERNAL_WS_PORT || 18081)
  },
  dashboard: {
    enabled: process.env.DASHBOARD_ENABLED === '1',
    port: Number(process.env.DASHBOARD_PORT || 18082),
    title: process.env.DASHBOARD_TITLE || 'XBet 数据监控',
    publicDir: process.env.DASHBOARD_DIR || './public/dashboard'
  }
};

const fileConfig = loadJson('./config.json');
export const config = Object.assign({}, defaultConfig, fileConfig);

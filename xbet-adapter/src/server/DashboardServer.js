import http from 'node:http';
import { EventEmitter } from 'node:events';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, normalize, resolve } from 'node:path';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIR = resolve(__dirname, '..', '..', 'public', 'dashboard');

export class DashboardServer extends EventEmitter {
  constructor({ port = 18082, store, title = 'XBet 数据监控', publicDir, meta = {} } = {}) {
    super();
    this.port = port;
    this.store = store;
    this.title = title;
    this.meta = meta;
    this.staticDir = publicDir ? resolve(process.cwd(), publicDir) : DEFAULT_PUBLIC_DIR;
    this.server = null;
    this.sseClients = new Set();
    this.storeListeners = new Map();
    this.pingTimer = null;
  }

  async start() {
    if (!this.store) {
      throw new Error('DashboardServer 需要 DataStore');
    }
    if (this.server) return;
    this.#attachStoreListeners();
    this.server = http.createServer((req, res) => this.#handleRequest(req, res));
    await new Promise((resolvePromise, rejectPromise) => {
      this.server.once('error', (err) => {
        this.emit('error', err);
        rejectPromise(err);
      });
      this.server.listen(this.port, () => {
        this.emit('listening', this.port);
        resolvePromise();
      });
    });
    this.#startPing();
  }

  stop() {
    for (const [event, handler] of this.storeListeners) {
      this.store.off(event, handler);
    }
    this.storeListeners.clear();

    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();

    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  #handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);
    if (req.method === 'GET' && url.pathname === '/api/meta') {
      this.#sendJson(res, this.#buildMeta());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/snapshot') {
      this.#sendJson(res, this.store.snapshot());
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      this.#handleSse(req, res);
      return;
    }
    if (req.method === 'OPTIONS') {
      this.#handleOptions(res);
      return;
    }
    this.#serveStatic(url.pathname, res).catch((err) => {
      this.emit('error', err);
      if (!res.headersSent) {
        this.#sendNotFound(res);
      } else {
        res.end();
      }
    });
  }

  #handleOptions(res) {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '600',
    });
    res.end();
  }

  #handleSse(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    this.sseClients.add(res);
    req.on('close', () => {
      this.sseClients.delete(res);
    });
    // 立即发送一次快照，方便前端初始化
    this.#writeEvent(res, 'snapshot', this.store.snapshot());
  }

  #writeEvent(res, event, payload) {
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (err) {
      this.emit('error', err);
    }
  }

  #broadcast(event, payload) {
    const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(frame);
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  #startPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }
    this.pingTimer = setInterval(() => {
      this.#broadcast('ping', { ts: Date.now() });
    }, 25000);
  }

  async #serveStatic(pathname, res) {
    let relativePath = pathname;
    if (relativePath === '/' || !relativePath) {
      relativePath = '/index.html';
    }
    const safeRelative = normalize(relativePath).replace(/^(\.\.[/\\])+/g, '');
    let filePath = resolve(this.staticDir, '.' + safeRelative);
    if (!filePath.startsWith(this.staticDir)) {
      this.#sendNotFound(res);
      return;
    }
    try {
      let stats = await fs.stat(filePath);
      if (stats.isDirectory()) {
        filePath = join(filePath, 'index.html');
        stats = await fs.stat(filePath);
      }
      const ext = extname(filePath).toLowerCase();
      const type = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': type,
        'Access-Control-Allow-Origin': '*',
      });
      createReadStream(filePath).pipe(res);
    } catch (err) {
      if (safeRelative !== '/index.html') {
        await this.#serveStatic('/index.html', res);
        return;
      }
      if (!res.headersSent) {
        this.#sendNotFound(res);
      } else {
        res.end();
      }
      if (err.code !== 'ENOENT') {
        this.emit('error', err);
      }
    }
  }

  #sendJson(res, data) {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify(data));
  }

  #sendNotFound(res) {
    res.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  #buildMeta() {
    return {
      title: this.title,
      port: this.port,
      datasets: Object.keys(this.store.datasets),
      counts: this.store.getCounts ? this.store.getCounts() : {},
      lastUpdateTs: this.store.lastUpdateTs,
      ...this.meta,
    };
  }

  #attachStoreListeners() {
    for (const kind of Object.keys(this.store.datasets)) {
      const eventName = `update:${kind}`;
      const handler = (payload) => this.#broadcast('update', { kind, payload });
      this.store.on(eventName, handler);
      this.storeListeners.set(eventName, handler);
    }
  }
}

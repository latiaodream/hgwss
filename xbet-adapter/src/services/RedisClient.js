import net from 'node:net';
import { EventEmitter } from 'node:events';

export class RedisClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.host = options.host || '127.0.0.1';
    this.port = options.port || 6379;
    this.password = options.password || '';
    this.db = typeof options.db === 'number' ? options.db : 0;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.queue = [];
    this.connecting = false;
    this.connected = false;
  }

  async connect() {
    if (this.connected || this.connecting) return;
    this.connecting = true;
    await new Promise((resolve, reject) => {
      const sock = net.createConnection({ host: this.host, port: this.port }, async () => {
        this.socket = sock;
        this.connected = true;
        this.connecting = false;
        sock.on('data', (chunk) => this.#onData(chunk));
        sock.on('error', (err) => this.emit('error', err));
        sock.on('close', () => {
          this.connected = false;
          this.emit('close');
        });
        try {
          if (this.password) {
            await this.command('AUTH', this.password);
          }
          if (this.db) {
            await this.command('SELECT', this.db);
          }
          this.emit('ready');
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      sock.on('error', reject);
    });
  }

  async command(cmd, ...args) {
    if (!this.connected) {
      await this.connect();
    }
    return new Promise((resolve, reject) => {
      const payload = this.#encodeCommand(cmd, ...args);
      this.queue.push({ resolve, reject });
      this.socket.write(payload, (err) => {
        if (err) {
          const pending = this.queue.pop();
          pending?.reject(err);
        }
      });
    });
  }

  quit() {
    if (this.socket) {
      this.socket.end();
      this.socket = null;
    }
  }

  #encodeCommand(cmd, ...args) {
    const parts = [cmd, ...args];
    let resp = `*${parts.length}\r\n`;
    for (const part of parts) {
      const buf = Buffer.from(String(part));
      resp += `$${buf.length}\r\n${buf}\r\n`;
    }
    return Buffer.from(resp, 'utf-8');
  }

  #onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const result = this.#parseRESP(this.buffer);
      if (!result) break;
      this.buffer = this.buffer.slice(result.bytesConsumed);
      const pending = this.queue.shift();
      if (!pending) continue;
      if (result.type === 'error') {
        pending.reject(new Error(result.value));
      } else {
        pending.resolve(result.value);
      }
    }
  }

  #parseRESP(buffer, offset = 0) {
    if (buffer.length - offset < 1) return null;
    const type = buffer[offset];
    const crlf = buffer.indexOf('\r\n', offset);
    if (crlf === -1) return null;
    const line = buffer.toString('utf-8', offset + 1, crlf);
    switch (type) {
      case 43: // '+'' simple string
        return { type: 'string', value: line, bytesConsumed: crlf - offset + 2 };
      case 45: // '-'
        return { type: 'error', value: line, bytesConsumed: crlf - offset + 2 };
      case 58: // ':' integer
        return { type: 'integer', value: Number(line), bytesConsumed: crlf - offset + 2 };
      case 36: { // '$' bulk string
        const length = Number(line);
        if (length === -1) {
          return { type: 'bulk', value: null, bytesConsumed: crlf - offset + 2 };
        }
        const start = crlf + 2;
        const end = start + length;
        if (buffer.length < end + 2) return null;
        const value = buffer.slice(start, end);
        return { type: 'bulk', value: value.toString('utf-8'), bytesConsumed: end - offset + 2 };
      }
      case 42: { // '*'
        const count = Number(line);
        let idx = crlf + 2;
        const items = [];
        for (let i = 0; i < count; i++) {
          const parsed = this.#parseRESP(buffer, idx);
          if (!parsed) return null;
          items.push(parsed.value);
          idx += parsed.bytesConsumed;
        }
        return { type: 'array', value: items, bytesConsumed: idx - offset };
      }
      default:
        throw new Error(`Unknown RESP type: ${String.fromCharCode(type)}`);
    }
  }
}

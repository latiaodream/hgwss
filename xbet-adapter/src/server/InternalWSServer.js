import { EventEmitter } from 'node:events';

export class InternalWSServer extends EventEmitter {
  constructor({ server, port, store }) {
    super();
    this.store = store;
    this.server = null;
    this.clients = new Set();
    this.options = { port, server };
  }

  async start() {
    const { WebSocketServer } = await import('ws');
    this.server = new WebSocketServer(this.options);
    this.server.on('connection', (socket) => this.#handleConnection(socket));
    this.server.on('error', (err) => this.emit('error', err));

    this.store.on('update:matches', (payload) => this.broadcast({ type: 'matches', payload }));
    this.store.on('update:odds', (payload) => this.broadcast({ type: 'odds', payload }));
    this.store.on('update:live', (payload) => this.broadcast({ type: 'live', payload }));
  }

  #handleConnection(socket) {
    socket.subscriptions = new Set();
    socket.send(JSON.stringify({ type: 'welcome', message: 'connected' }));

    socket.on('message', (raw) => this.#handleClientMessage(socket, raw));
    socket.on('close', () => this.clients.delete(socket));
    socket.on('error', (err) => this.emit('clientError', err));

    this.clients.add(socket);
    this.emit('clientConnected', this.clients.size);
  }

  #handleClientMessage(socket, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (err) {
      socket.send(JSON.stringify({ type: 'error', message: 'invalid JSON' }));
      return;
    }

    switch (msg?.command) {
      case 'subscribe':
        this.#handleSubscribe(socket, msg.kinds || []);
        break;
      case 'unsubscribe':
        this.#handleUnsubscribe(socket, msg.kinds || []);
        break;
      case 'snapshot':
        this.#handleSnapshot(socket, msg.kinds || []);
        break;
      default:
        socket.send(JSON.stringify({ type: 'error', message: 'unknown command' }));
    }
  }

  #handleSubscribe(socket, kinds) {
    kinds.forEach((kind) => socket.subscriptions.add(kind));
    socket.send(JSON.stringify({ type: 'subscribed', kinds: Array.from(socket.subscriptions) }));
  }

  #handleUnsubscribe(socket, kinds) {
    kinds.forEach((kind) => socket.subscriptions.delete(kind));
    socket.send(JSON.stringify({ type: 'unsubscribed', kinds: Array.from(socket.subscriptions) }));
  }

  #handleSnapshot(socket, kinds) {
    const snapshot = this.store.snapshot(kinds);
    socket.send(JSON.stringify({ type: 'snapshot', data: snapshot }));
  }

  broadcast(message) {
    const json = JSON.stringify({ type: 'update', data: message });
    for (const socket of this.clients) {
      if (socket.readyState !== socket.OPEN) continue;
      if (socket.subscriptions.size && !socket.subscriptions.has(message.type)) continue;
      socket.send(json);
    }
  }

  stop() {
    for (const socket of this.clients) {
      socket.terminate();
    }
    this.clients.clear();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }
}

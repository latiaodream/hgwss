import { EventEmitter } from 'node:events';

export class DataStore extends EventEmitter {
  constructor(options = {}) {
    super();
    this.datasets = {
      matches: new Map(),
      odds: new Map(),
      live: new Map(),
    };
    this.lastUpdateTs = null;
    this.redisStore = options.redisStore || null;
  }

  handleMessage(message) {
    if (!message || message.typ !== 3) return;
    const kind = message.kind || 'unknown';
    const data = message.data;
    const store = this.datasets[kind];
    if (store) {
      this.#storeMap(store, data, kind);
      this.emit(`update:${kind}`, data);
    } else {
      this.emit('update:unknown', message);
    }
    this.lastUpdateTs = Date.now();
  }

  #storeMap(store, payload, kind) {
    if (!payload) return;
    const id = payload.id ?? payload.gid ?? payload.key;
    if (id === undefined) {
      this.emit('warn', 'Payload missing id', payload);
      return;
    }
    store.set(id, payload);
    if (this.redisStore) {
      this.redisStore.save(kind, id, payload);
    }
  }

  snapshot(kinds) {
    return this.#buildSnapshot(kinds);
  }

  #buildSnapshot(targetKinds) {
    const kinds = Array.isArray(targetKinds) && targetKinds.length
      ? targetKinds
      : Object.keys(this.datasets);
    const snapshot = {
      counts: {},
      lastUpdateTs: this.lastUpdateTs,
    };
    for (const kind of kinds) {
      const map = this.datasets[kind];
      if (!map) continue;
      snapshot[kind] = Array.from(map.values());
      snapshot.counts[kind] = map.size;
    }
    return snapshot;
  }

  getCounts() {
    const counts = {};
    for (const [kind, map] of Object.entries(this.datasets)) {
      counts[kind] = map.size;
    }
    return counts;
  }
}

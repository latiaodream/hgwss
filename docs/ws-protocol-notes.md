# Crown Scraper WebSocket – Reverse Engineering Notes

> Snapshot of the current reconstruction work on `b.xbetbot.com`’s WebSocket stack.  
> These notes are being updated as the opcode / payload table gets decoded.

## Overall Flow

1. `src/index.ts` creates `we = new Ol({ url: Ia(Ml[...] ), params: { lang, token } })`.
2. `Ol.open()` performs:
   - URL query assembly from `this.params`.
   - Native `WebSocket` connect.
   - `crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])`.
   - Export public key → 65 bytes, append DataView timestamp → 73-byte handshake frame.
   - Send frame via `client.send`.
   - Register RC4 contexts `oc`/`ic` once server response arrives.

3. Every frame (both tx/rx) goes through `Ge()` – an RC4 implementation that accepts either:
   - A key (Uint8Array) → returns `{ i, j, s[256] }` state (when third arg omitted).
   - A state + payload → returns XOR’d payload.

4. After RC4 decrypt, bytes are fed to `_0x22a50b` (exported as `bD` in `modsDSp2y6.js`).
   - `bD` configures a DagCBOR reader (`const n = rC(opts)`, `const a = new Do(bytes, n)`).
   - Tokens are emitted to `lC.step` which pushes `[seq, opcode, payload]` tuples into `ret`.
   - Meaning: the “protocol” is RC4 + DagCBOR, not ad-hoc JSON.

5. `_0x330f88` (export `Si`) performs the reverse: it takes `{ op, payload }`, serialises with the same DagCBOR helpers and feeds into `Ge` for encryption before `send`.

## Confirmed Functions (from `tmp_vendor.js`)

| Alias (main bundle) | Real export | Purpose |
|---------------------|-------------|---------|
| `_0x22a50b`         | `bD`        | RC4-decrypted bytes → DagCBOR decoder → `[seq, opcode, payload]`. |
| `_0x330f88`         | `Si`        | Builds DagCBOR writer (`js`) with options `Ky` + overrides (dcbor / cde). Used to encode outbound payloads. |
| `Ge`                | `Ge`        | RC4 key scheduling & stream cipher. Handles both init (key → state) and XOR phases. |
| `lt`                | `lt`        | Helper to merge params (`lang`, `token`, etc.) before handshake. |
| `Ia`                | `Ia`        | Domain mapper for `b.xbetbot.com` → `gw.xbetbot.com` (switches subdomain + protocol). |

## Handshake Frame (observed in `Ol.open`)

```
Uint8Array(73) [
  0x04,
  ... 64 bytes of P-256 uncompressed public key,
  BigInt64 timestamp (DataView setBigInt64 at offset 0x41, big-endian)
]
```

Server reply is handled in the same listener:
- RC4 decrypt skipped on first frame (just raw CBOR).
- Uses `crypto.subtle.importKey('raw', reply[0:65], 'ECDH', true, [])` and `deriveBits` with our private key.
- Derived bits → `this.key` (32 bytes).
- Initializes RC4 contexts: `this.oc = Ge(this.key)`, `this.ic = Ge(this.key)`.

## Current Todo Map

1. **Opcode catalogue** – need to finish labelling the cases inside `lC.step` (login, subscribe, heartbeat, odds update, etc.).
2. **Payload structures** – for each opcode, capture the DagCBOR layout so Node client can map them to JS objects.
3. **Node prototype** – once the above is documented, implement:
   - ECDH handshake (Web Crypto or `@noble/curves`).
   - RC4 (reuse the `Ge` logic).
   - DagCBOR encode/decode (can import the same helpers from `modsDSp2y6.js` or port `Do/js` stack).

This file is to keep a running log; updated snapshots will capture the opcode map once decoding is complete.


# WebSocket 协议示例 Payload

## 一、消息格式

### 1.1 基本结构

```
WebSocket 消息 = RC4 加密(CBOR 编码(数据))
```

**处理流程**:
1. 接收 WebSocket 二进制消息
2. RC4 解密 (使用协商的密钥)
3. CBOR 解码 (使用 bD 函数)
4. 得到 JavaScript 对象

### 1.2 RC4 解密

```javascript
// 假设已经协商了 RC4 密钥
const rc4Key = new Uint8Array([...]); // 从握手获取

function rc4Decrypt(encrypted, key) {
  // RC4 算法实现
  const S = new Uint8Array(256);
  const K = new Uint8Array(256);
  
  // 初始化
  for (let i = 0; i < 256; i++) {
    S[i] = i;
    K[i] = key[i % key.length];
  }
  
  // 打乱
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + K[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }
  
  // 解密
  const decrypted = new Uint8Array(encrypted.length);
  let i = 0, j = 0;
  for (let k = 0; k < encrypted.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    const t = (S[i] + S[j]) % 256;
    decrypted[k] = encrypted[k] ^ S[t];
  }
  
  return decrypted;
}

// 使用
ws.onmessage = (event) => {
  const encrypted = new Uint8Array(event.data);
  const decrypted = rc4Decrypt(encrypted, rc4Key);
  const data = bD(decrypted);  // CBOR 解码
  console.log('Received:', data);
};
```

## 二、常见消息类型

### 2.1 登录成功

**CBOR 十六进制**:
```
A3                    # Map(3)
   63                 # UTF8(3)
      747970          # "typ"
   00                 # 0 (登录响应)
   64                 # UTF8(4)
      64617461        # "data"
   A2                 # Map(2)
      62              # UTF8(2)
         6964         # "id"
      19 1234         # uint16(4660)
      64              # UTF8(4)
         6e616d65     # "name"
      68              # UTF8(8)
         75736572313233 # "user123"
   63                 # UTF8(3)
      736967          # "sig"
   58 20              # bytes(32)
      [32 bytes signature]
```

**解码后**:
```javascript
{
  typ: 0,  // 登录响应
  data: {
    id: 4660,
    name: "user123"
  },
  sig: Uint8Array(32) [...]  // 签名
}
```

**Opcode 序列**:
```
[5, 3, 3, 0, 1]           // Map(3)
[3, 3, "typ", 1, 3]       // key: "typ"
[0, 0, 0, 5, 0]           // value: 0
[3, 4, "data", 9, 4]      // key: "data"
[5, 2, 2, 14, 1]          // Map(2)
[3, 2, "id", 15, 2]       // key: "id"
[0, 25, 4660, 18, 2]      // value: 4660
[3, 4, "name", 21, 4]     // key: "name"
[3, 8, "user123", 26, 8]  // value: "user123"
[3, 3, "sig", 35, 3]      // key: "sig"
[2, 24, Uint8Array(32), 39, 32]  // value: bytes(32)
```

### 2.2 订阅完整数据

**CBOR 十六进制**:
```
A2                    # Map(2)
   63                 # UTF8(3)
      747970          # "typ"
   01                 # 1 (订阅)
   64                 # UTF8(4)
      64617461        # "data"
   84                 # Array(4)
      63              # UTF8(3)
         6D6174636865 # "matches"
      63              # UTF8(3)
         6F646473     # "odds"
      63              # UTF8(3)
         6C697665     # "live"
      63              # UTF8(3)
         736574       # "set"
```

**解码后**:
```javascript
{
  typ: 1,  // 订阅请求
  data: ["matches", "odds", "live", "set"]
}
```

### 2.3 心跳

**CBOR 十六进制**:
```
A1                    # Map(1)
   63                 # UTF8(3)
      747970          # "typ"
   02                 # 2 (心跳)
```

**解码后**:
```javascript
{
  typ: 2  // 心跳
}
```

**Opcode 序列**:
```
[5, 1, 1, 0, 1]       // Map(1)
[3, 3, "typ", 1, 3]   // key: "typ"
[0, 2, 2, 5, 0]       // value: 2
```

### 2.4 赔率更新

**CBOR 十六进制**:
```
A3                    # Map(3)
   63                 # UTF8(3)
      747970          # "typ"
   03                 # 3 (数据推送)
   64                 # UTF8(4)
      6B696E64        # "kind"
   64                 # UTF8(4)
      6F646473        # "odds"
   64                 # UTF8(4)
      64617461        # "data"
   A3                 # Map(3)
      62              # UTF8(2)
         6964         # "id"
      19 1234         # uint16(4660)
      63              # UTF8(3)
         6F6464       # "odd"
      FA 40490FDB     # float32(3.14159)
      62              # UTF8(2)
         7473         # "ts"
      1A 65A1B2C3     # uint32(1705054915)
```

**解码后**:
```javascript
{
  typ: 3,      // 数据推送
  kind: "odds",
  data: {
    id: 4660,
    odd: 3.14159,
    ts: 1705054915
  }
}
```

**Opcode 序列**:
```
[5, 3, 3, 0, 1]                // Map(3)
[3, 3, "typ", 1, 3]            // key: "typ"
[0, 3, 3, 5, 0]                // value: 3
[3, 4, "kind", 9, 4]           // key: "kind"
[3, 4, "odds", 14, 4]          // value: "odds"
[3, 4, "data", 19, 4]          // key: "data"
[5, 3, 3, 24, 1]               // Map(3)
[3, 2, "id", 25, 2]            // key: "id"
[0, 25, 4660, 28, 2]           // value: 4660
[3, 3, "odd", 31, 3]           // key: "odd"
[7, 26, 3.14159, 35, 4]        // value: float32
[3, 2, "ts", 40, 2]            // key: "ts"
[0, 26, 1705054915, 43, 4]     // value: uint32
```

## 三、Node.js 实现示例

### 3.1 完整的客户端示例

```javascript
const WebSocket = require('ws');

// RC4 解密函数
function rc4Decrypt(encrypted, key) {
  const S = new Uint8Array(256);
  const K = new Uint8Array(256);

  for (let i = 0; i < 256; i++) {
    S[i] = i;
    K[i] = key[i % key.length];
  }

  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + S[i] + K[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
  }

  const decrypted = new Uint8Array(encrypted.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < encrypted.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    const t = (S[i] + S[j]) % 256;
    decrypted[k] = encrypted[k] ^ S[t];
  }

  return decrypted;
}

// CBOR 解码器 (简化版)
class CBORDecoder {
  constructor(buffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    this.offset = 0;
  }

  decode() {
    return this.decodeItem();
  }

  decodeItem() {
    const byte = this.buffer[this.offset++];
    const mt = byte >> 5;
    const ai = byte & 31;

    let value = ai;

    // 读取额外数据
    if (ai === 24) {
      value = this.view.getUint8(this.offset);
      this.offset += 1;
    } else if (ai === 25) {
      value = this.view.getUint16(this.offset, false);
      this.offset += 2;
    } else if (ai === 26) {
      value = this.view.getUint32(this.offset, false);
      this.offset += 4;
    } else if (ai === 27) {
      value = Number(this.view.getBigUint64(this.offset, false));
      this.offset += 8;
    }

    // 根据主类型处理
    switch (mt) {
      case 0: // 正整数
        return value;

      case 1: // 负整数
        return -1 - value;

      case 2: // 字节串
        const bytes = this.buffer.slice(this.offset, this.offset + value);
        this.offset += value;
        return bytes;

      case 3: // UTF-8 字符串
        const str = Buffer.from(
          this.buffer.slice(this.offset, this.offset + value)
        ).toString('utf8');
        this.offset += value;
        return str;

      case 4: // 数组
        const arr = [];
        for (let i = 0; i < value; i++) {
          arr.push(this.decodeItem());
        }
        return arr;

      case 5: // Map
        const obj = {};
        for (let i = 0; i < value; i++) {
          const key = this.decodeItem();
          const val = this.decodeItem();
          obj[key] = val;
        }
        return obj;

      case 6: // Tag
        const tag = value;
        const content = this.decodeItem();
        // 处理特殊 Tag
        if (tag === 0) return new Date(content);
        if (tag === 1) return new Date(content * 1000);
        return { tag, content };

      case 7: // 简单值/浮点数
        if (ai === 20) return false;
        if (ai === 21) return true;
        if (ai === 22) return null;
        if (ai === 23) return undefined;
        if (ai === 25) {
          // float16 (简化处理)
          const f16 = this.view.getUint16(this.offset - 2, false);
          return this.decodeFloat16(f16);
        }
        if (ai === 26) {
          return this.view.getFloat32(this.offset - 4, false);
        }
        if (ai === 27) {
          return this.view.getFloat64(this.offset - 8, false);
        }
        return value;
    }
  }

  decodeFloat16(value) {
    const sign = (value & 0x8000) >> 15;
    const exp = (value & 0x7C00) >> 10;
    const frac = value & 0x03FF;

    if (exp === 0) {
      return (sign ? -1 : 1) * Math.pow(2, -14) * (frac / 1024);
    } else if (exp === 31) {
      return frac ? NaN : (sign ? -Infinity : Infinity);
    }

    return (sign ? -1 : 1) * Math.pow(2, exp - 15) * (1 + frac / 1024);
  }
}

// WebSocket 客户端
class BettingClient {
  constructor(url, rc4Key) {
    this.url = url;
    this.rc4Key = rc4Key;
    this.ws = null;
  }

  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.on('open', () => {
      console.log('Connected');
      this.login();
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });

    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

    this.ws.on('close', () => {
      console.log('Disconnected');
    });
  }

  handleMessage(data) {
    const encrypted = new Uint8Array(data);
    const decrypted = rc4Decrypt(encrypted, this.rc4Key);
    const decoder = new CBORDecoder(decrypted);
    const message = decoder.decode();

    console.log('Received:', message);

    // 根据消息类型处理
    switch (message.typ) {
      case 0: // 登录响应
        console.log('Login success:', message.data);
        this.subscribe();
        break;

      case 1: // 订阅响应
        console.log('Subscribed:', message.data);
        break;

      case 2: // 心跳响应
        console.log('Heartbeat');
        break;

      case 3: // 数据推送
        this.handleDataPush(message);
        break;
    }
  }

  send(data) {
    const encoder = new CBOREncoder();
    const encoded = encoder.encode(data);
    const encrypted = rc4Encrypt(encoded, this.rc4Key);
    this.ws.send(encrypted);
  }

  login() {
    this.send({
      typ: 0,
      data: {
        username: 'user123',
        password: 'pass123'
      }
    });
  }

  subscribe() {
    this.send({
      typ: 1,
      data: ['matches', 'odds', 'live']
    });
  }

  heartbeat() {
    this.send({ typ: 2 });
  }

  handleDataPush(message) {
    if (message.kind === 'odds') {
      console.log('Odds update:', message.data);
    } else if (message.kind === 'matches') {
      console.log('Match update:', message.data);
    }
  }
}

// 使用示例
const rc4Key = new Uint8Array([/* 从握手获取 */]);
const client = new BettingClient('wss://example.com/ws', rc4Key);
client.connect();

// 定时心跳
setInterval(() => {
  client.heartbeat();
}, 30000);
```

## 四、测试用例

### 4.1 基本类型测试

```javascript
// 测试整数
const testInt = new Uint8Array([0x00]);  // 0
const testInt2 = new Uint8Array([0x18, 0x64]);  // 100
const testInt3 = new Uint8Array([0x19, 0x03, 0xE8]);  // 1000

// 测试字符串
const testStr = new Uint8Array([
  0x63,  // UTF8(3)
  0x66, 0x6F, 0x6F  // "foo"
]);

// 测试数组
const testArr = new Uint8Array([
  0x83,  // Array(3)
  0x01,  // 1
  0x02,  // 2
  0x03   // 3
]);

// 测试 Map
const testMap = new Uint8Array([
  0xA2,  // Map(2)
  0x61, 0x61,  // "a"
  0x01,        // 1
  0x61, 0x62,  // "b"
  0x02         // 2
]);
```

### 4.2 完整消息测试

```javascript
// 登录消息
const loginMsg = {
  typ: 0,
  data: { username: 'test', password: 'pass' }
};

// 订阅消息
const subMsg = {
  typ: 1,
  data: ['matches', 'odds']
};

// 心跳消息
const heartbeatMsg = { typ: 2 };
```



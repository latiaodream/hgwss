# XBet WebSocket 协议分析

## 1. 核心类：Ol (WebSocket RPC Client)

### 1.1 构造函数
```javascript
class Ol {
  constructor(config = {}) {
    if (!config.url) throw new Error('需要 url');
    this.url = config.url;
    this.delay = 0;
    this.timeout = config.timeout || 20 * 1000;  // 默认 20 秒
    this.params = config.params || {};
    this.reqs = new Map();  // 存储待响应的请求
    this.reqId = 0;         // 自增请求 ID
    this.authenticated = true;
    this.connect();
  }
}
```

### 1.2 握手流程 (open 方法)

1. **建立 WebSocket 连接**
   ```javascript
   this.client = new WebSocket(url);
   this.client.binaryType = 'arraybuffer';
   ```

2. **生成 ECDH 密钥对**
   ```javascript
   const keyPair = await crypto.subtle.generateKey(
     { name: 'ECDH', namedCurve: 'P-256' },
     true,
     ['deriveBits']
   );
   ```

3. **发送客户端 Hello (73 字节)**
   ```javascript
   const clientHello = new Uint8Array(0x49);  // 73 字节
   // [0-64]: 客户端公钥 (65 字节，未压缩格式)
   // [65-72]: 时间戳 (8 字节 BigInt)
   clientHello.set(new Uint8Array(await crypto.subtle.exportKey('raw', keyPair.publicKey)), 0);
   new DataView(clientHello.buffer).setBigInt64(0x41, BigInt(Date.now()));
   this.client.send(clientHello);
   ```

4. **接收服务器 Hello，派生共享密钥**
   ```javascript
   // 服务器返回 65+ 字节（包含服务器公钥）
   const serverPublicKey = await crypto.subtle.importKey(
     'raw',
     serverHello.slice(0, 65),
     { name: 'ECDH', namedCurve: 'P-256' },
     false,
     []
   );
   
   // 派生共享密钥
   const sharedSecret = new Uint8Array(await crypto.subtle.deriveBits(
     { name: 'ECDH', public: serverPublicKey },
     keyPair.privateKey,
     256
   ));
   ```

5. **初始化 RC4 加密/解密上下文**
   ```javascript
   this.ic = Ge(sharedSecret);  // 输入流密码 (input cipher)
   this.oc = Ge(sharedSecret);  // 输出流密码 (output cipher)
   ```

### 1.3 RPC 请求机制 (request 方法)

```javascript
request(opcode, payload, timeout) {
  return new Promise(resolve => {
    const reqId = ++this.reqId & 0xffffffff;  // 自增 ID，32 位循环
    timeout = timeout ?? this.timeout;
    
    let timer = null;
    if (timeout > 0) {
      timer = setTimeout(() => {
        this.reqs.delete(reqId);
        resolve([1, 'err_timeout']);
      }, timeout);
    }
    
    // 存储请求上下文: [reqId, opcode, payload, resolve, timer, sent]
    const req = [reqId, opcode, payload || {}, resolve, timer, false];
    this.reqs.set(reqId, req);
    
    if (this.reqs.size === 1 && this.key) {
      this.send(req);
    }
  });
}
```

### 1.4 发送消息 (send 方法)

```javascript
send(req) {
  const [reqId, opcode, payload] = req.slice(0, 3);
  
  // 编码为 DAG-CBOR: [reqId, opcode, payload]
  let encoded = encodeDagCbor([reqId, opcode, payload]);
  
  // RC4 加密
  if (!this.oc) {
    this.oc = Ge(this.key);
  }
  encoded = Ge(this.oc, encoded);
  
  // 发送二进制帧
  this.client.send(encoded);
  req[5] = true;  // 标记为已发送
}
```

### 1.5 接收消息处理

```javascript
onMessage(event) {
  let data = new Uint8Array(event.data);
  
  // RC4 解密
  data = Ge(this.ic, data);
  
  // DAG-CBOR 解码: [reqId, error, result]
  const [reqId, err, result] = decodeDagCbor(data);
  
  // 查找对应的请求
  const req = this.reqs.get(reqId);
  if (req) {
    const [, , , resolve, timer] = req;
    if (timer) clearTimeout(timer);
    this.reqs.delete(reqId);
    
    // 返回 [status, data]
    // status: 0=成功, 1=错误
    resolve(err ? [1, err] : [0, result]);
  }
}
```

## 2. Opcode 列表

从代码中提取的 opcode 常量定义（约在 1130 行附近）：

| Opcode | 常量名 | 十进制 | 用途 | Payload 结构 | 返回值结构 |
|--------|--------|--------|------|--------------|------------|
| 0x1 | jl | 1 | 长轮询 (Poll) | `cursor` (number) | `[[opcode, [[nextCursor, data], ...]], ...]` |
| 0x5 | Ct | 5 | 取消/心跳 | 待确认 | `{ status: 0 }` |
| 0x7 | Dl | 7 | 获取用户信息 | `{}` | `{ mid, token, email, ... }` |
| 0xb | Pl | 11 | 获取赛事/盘口列表 | 待确认 | 赛事数组 |
| 0x17 | $t | 23 | 获取历史数据 | `{ from, to }` | 历史记录数组 |

### 2.1 详细调用分析

#### Opcode 0x7 (Dl) - 获取用户信息

**调用位置**：登录后立即调用
```javascript
const [status, userInfo] = await we.request(Dl);
if (status === 0) {
  // userInfo 包含:
  // - mid: 用户 ID
  // - token: 会话令牌
  // - email: 邮箱
  // - uid: 用户唯一标识
  // - role: 角色 (主账号/子账号)
  // - gold: 金币余额
  // - CUSD: 美元余额
  // - CNY: 人民币余额
}
```

**Payload**: `{}`（空对象）

**返回值示例**:
```json
{
  "mid": "m000000000001",
  "uid": "user123",
  "token": "session_token_here",
  "email": "user@example.com",
  "role": "master",
  "gold": 100000,
  "CUSD": 50000,
  "CNY": 200000
}
```

#### Opcode 0xb (Pl) - 获取赛事/盘口列表

**调用位置**：进入游戏页面时
```javascript
const [status, events] = await we.request(Pl);
if (status === 0) {
  // events 是赛事数组，每个赛事包含:
  // - gid: 赛事 ID
  // - sport: 运动类型 (足球/篮球等)
  // - league: 联赛名称
  // - teams: 队伍信息
  // - odds: 赔率数据
  // - status: 赛事状态 (pre/live/settled)
}
```

**Payload**: 可能包含过滤条件（待确认）

**返回值示例**:
```json
[
  {
    "gid": "12345",
    "sport": "soccer",
    "league": "英超",
    "teams": ["曼联", "利物浦"],
    "odds": {
      "1x2": [2.5, 3.2, 2.8],
      "handicap": [-0.5, 1.95, 0.5, 1.85]
    },
    "status": "live"
  }
]
```

#### Opcode 0x1 (jl) - 长轮询

**调用位置**：持续轮询获取实时更新
```javascript
const [status, updates] = await we.request(jl, cursor, 0);
if (status === 0) {
  // updates 格式: [[opcode, [[nextCursor, payload], ...]], ...]
  // 每个 update 包含:
  // - opcode: 更新类型
  // - nextCursor: 下次轮询使用的游标
  // - payload: 具体更新数据
}
```

**Payload**: `cursor` (number) - 上次返回的游标，首次为 0

**返回值示例**:
```json
[
  [3, [[12345, {"gid": "123", "odds": {...}}]]],
  [4, [[12346, {"gid": "456", "score": [1, 0]}]]]
]
```

#### Opcode 0x17 ($t) - 获取历史数据

**调用位置**：查看历史记录时
```javascript
const [status, history] = await we.request($t, { from, to });
if (status === 0) {
  // history 是历史记录数组
}
```

**Payload**:
```json
{
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-01-31T23:59:59Z"
}
```

**返回值**: 历史记录数组（具体结构待确认）

#### Opcode 0x5 (Ct) - 取消/心跳

**调用位置**：取消订单或保持连接
```javascript
const [status, result] = await we.request(Ct, payload);
if (status === 0) {
  // 操作成功
}
```

**Payload**: 待确认（可能包含订单 ID 等）

**返回值**:
```json
{
  "status": 0
}
```

## 3. 消息格式总结

### 3.1 请求格式
```
[reqId, opcode, payload]
```
- `reqId`: 32 位自增整数
- `opcode`: 操作码 (1, 5, 7, 11, 23, ...)
- `payload`: 参数对象（可以是空对象 `{}`）

### 3.2 响应格式
```
[reqId, error, result]
```
- `reqId`: 对应请求的 ID
- `error`: 错误信息（成功时为 `null`）
- `result`: 返回数据（错误时为 `null`）

### 3.3 编码流程
1. `DagCbor.encode([reqId, opcode, payload])` → 二进制
2. `RC4.encrypt(二进制)` → 加密二进制
3. `WebSocket.send(加密二进制)`

### 3.4 解码流程
1. `WebSocket.onmessage` → 接收加密二进制
2. `RC4.decrypt(加密二进制)` → 二进制
3. `DagCbor.decode(二进制)` → `[reqId, error, result]`

## 4. Node.js 实现要点

### 4.1 需要修改的文件
- `src/client/XbetClient.js`: 实现新的 RPC 机制
- `src/services/DataStore.js`: 适配新的数据结构

### 4.2 关键改动
1. **移除旧的 `typ: 0/1/2` 消息格式**
2. **实现 `request(opcode, payload, timeout)` 方法**
3. **维护 `reqs` Map 存储待响应请求**
4. **实现自增 `reqId` 机制**
5. **修改消息编码为 `[reqId, opcode, payload]`**
6. **修改消息解码为 `[reqId, error, result]`**

### 4.3 示例代码框架

```javascript
class XbetClient extends EventEmitter {
  constructor(config) {
    super();
    this.reqs = new Map();
    this.reqId = 0;
    // ... 其他初始化
  }

  async request(opcode, payload = {}, timeout = 20000) {
    return new Promise((resolve) => {
      const reqId = ++this.reqId & 0xffffffff;

      let timer = null;
      if (timeout > 0) {
        timer = setTimeout(() => {
          this.reqs.delete(reqId);
          resolve([1, 'err_timeout']);
        }, timeout);
      }

      const req = [reqId, opcode, payload, resolve, timer, false];
      this.reqs.set(reqId, req);

      this.#sendRequest(req);
    });
  }

  #sendRequest(req) {
    const [reqId, opcode, payload] = req;
    const message = [reqId, opcode, payload];
    this.send(message);
    req[5] = true;
  }

  #handleDecodedMessage(message) {
    const [reqId, error, result] = message;
    const req = this.reqs.get(reqId);

    if (req) {
      const [, , , resolve, timer] = req;
      if (timer) clearTimeout(timer);
      this.reqs.delete(reqId);

      resolve(error ? [1, error] : [0, result]);
    }
  }
}
```

## 5. 下一步行动

1. ✅ 梳理协议结构
2. ⏳ 修改 `XbetClient.js` 实现新协议
3. ⏳ 测试连接和基本 RPC 调用
4. ⏳ 实现各个 opcode 的高级封装
5. ⏳ 更新 Dashboard 显示新数据结构



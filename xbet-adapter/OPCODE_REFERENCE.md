# XBet WebSocket Opcode 完整参考

## 从前端代码提取的所有 Opcode

基于 `BvC2gKzY6q.js` 的分析，以下是所有已识别的 opcode：

## 客户端请求 Opcode (Client → Server)

### 0x1 - 长轮询 (Poll)
- **常量名**: `jl`
- **用途**: 持续轮询获取实时更新（赔率变化、比分更新等）
- **Payload**: `cursor` (number) - 游标位置，首次为 0
- **返回**: `[[opcode, [[nextCursor, data], ...]], ...]`
- **调用示例**:
  ```javascript
  const [status, updates] = await client.request(0x1, 0);
  ```

### 0x5 - 取消/心跳
- **常量名**: `Ct`
- **用途**: 取消订单或发送心跳保持连接
- **Payload**: 可能包含订单 ID 或为空
- **返回**: `{ status: 0 }`
- **调用示例**:
  ```javascript
  const [status, result] = await client.request(0x5, {});
  ```

### 0x7 - 获取用户信息
- **常量名**: `Dl`
- **用途**: 获取当前登录用户的详细信息
- **Payload**: `{}`
- **返回**: 用户对象
  ```json
  {
    "mid": "m000000000001",
    "uid": "user123",
    "token": "...",
    "email": "user@example.com",
    "role": "master",
    "gold": 100000,
    "CUSD": 50000,
    "CNY": 200000
  }
  ```
- **调用示例**:
  ```javascript
  const [status, user] = await client.request(0x7, {});
  ```

### 0xb - 获取赛事列表
- **常量名**: `Pl`
- **用途**: 获取可用的赛事和盘口列表
- **Payload**: 可能包含过滤条件（sport, league 等）
- **返回**: 赛事数组
- **调用示例**:
  ```javascript
  const [status, events] = await client.request(0xb, {});
  ```

### 0x17 - 获取历史数据
- **常量名**: `$t`
- **用途**: 查询历史记录（投注记录、结算记录等）
- **Payload**: 
  ```json
  {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z"
  }
  ```
- **返回**: 历史记录数组
- **调用示例**:
  ```javascript
  const [status, history] = await client.request(0x17, { from, to });
  ```

## 服务器推送 Opcode (Server → Client)

以下是通过长轮询 (0x1) 返回的更新类型：

### 0x3 - 赔率更新
- **数据结构**:
  ```json
  {
    "gid": "12345",
    "odds": {
      "1x2": [2.5, 3.2, 2.8],
      "handicap": [-0.5, 1.95, 0.5, 1.85]
    }
  }
  ```

### 0x4 - 比分更新
- **数据结构**:
  ```json
  {
    "gid": "12345",
    "score": [1, 0],
    "time": "45:00"
  }
  ```

### 0x6 - 赛事状态变化
- **数据结构**:
  ```json
  {
    "gid": "12345",
    "status": "live" | "settled" | "canceled"
  }
  ```

## 错误码

从代码中提取的错误码常量：

| 错误码 | 常量名 | 含义 |
|--------|--------|------|
| `err_timeout` | - | 请求超时 |
| `err_closed` | - | 连接已关闭 |
| `err_unauth` | - | 未授权 |
| `err_user_a` | - | 用户账号问题 |
| `err_user_c` | - | 用户凭证问题 |
| `err_set_pw` | - | 设置密码失败 |
| `err_wallet` | - | 钱包错误 |
| `err_proxy` | - | 代理错误 |
| `err_url` | - | URL 错误 |
| `err_init_a` | - | 初始化账号失败 |
| `err_init_p` | - | 初始化代理失败 |
| `err_enable` | - | 启用失败 |

## 完整的请求/响应流程

### 1. 连接建立
```
Client → Server: WebSocket Upgrade Request
Server → Client: 101 Switching Protocols
```

### 2. ECDH 握手
```
Client → Server: [65字节公钥 + 8字节时间戳] (73字节，未加密)
Server → Client: [65字节公钥 + ...] (65+字节，未加密)
```

### 3. 派生 RC4 密钥
```
sharedSecret = ECDH(clientPrivateKey, serverPublicKey)
ic = RC4(sharedSecret)  // 输入流
oc = RC4(sharedSecret)  // 输出流
```

### 4. RPC 请求
```
Client → Server: RC4.encrypt(DagCbor.encode([reqId, opcode, payload]))
Server → Client: RC4.decrypt(DagCbor.decode([reqId, error, result]))
```

## 典型使用场景

### 场景 1: 登录后初始化
```javascript
// 1. 获取用户信息
const [s1, user] = await client.request(0x7, {});

// 2. 获取赛事列表
const [s2, events] = await client.request(0xb, {});

// 3. 开始长轮询
let cursor = 0;
while (true) {
  const [s3, updates] = await client.request(0x1, cursor);
  if (s3 === 0) {
    // 处理更新
    for (const [opcode, items] of updates) {
      for (const [nextCursor, data] of items) {
        cursor = nextCursor;
        // 处理 data
      }
    }
  }
  await sleep(1000);
}
```

### 场景 2: 查询历史
```javascript
const [status, history] = await client.request(0x17, {
  from: '2024-01-01T00:00:00Z',
  to: '2024-01-31T23:59:59Z'
});
```

### 场景 3: 心跳保持
```javascript
setInterval(async () => {
  const [status] = await client.request(0x5, {});
  if (status !== 0) {
    console.error('心跳失败');
  }
}, 30000);  // 每 30 秒
```


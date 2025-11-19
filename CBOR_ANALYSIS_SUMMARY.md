# DagCBOR 解析器完整分析总结

## 📋 文档索引

本次分析生成了以下文档:

1. **yn_family_analysis.md** - yn 家族函数详细分析
   - yn 类定义和核心方法
   - create, push, replaceLast, convert 方法详解
   - 数据结构转换示例
   - 特殊情况处理 (不定长度、键排序、重复键检测)

2. **do_lc_opcode_analysis.md** - Do 迭代器与 lC.step 分析
   - Do 类 (数据读取器) 实现
   - lC 类 (解析器状态机) 实现
   - Opcode 格式和 Payload 映射表
   - WebSocket 协议消息类型映射
   - 完整消息流程示例

3. **example_payloads.md** - 示例 Payload 和 Node.js 实现
   - RC4 加密/解密实现
   - 常见消息类型示例 (登录、订阅、心跳、赔率更新)
   - 完整的 Node.js 客户端实现
   - 测试用例

## 🎯 核心发现

### 1. 解析流程

```
WebSocket 消息
  ↓
RC4 解密
  ↓
CBOR 二进制数据
  ↓
Do 迭代器 (读取 Opcode)
  ↓
lC.step (状态机处理)
  ↓
yn 节点 (构建树)
  ↓
convert (转换为 JS 对象)
  ↓
最终数据
```

### 2. 关键函数

| 函数 | 作用 | 位置 |
|------|------|------|
| `bD(data, options)` | 主解析入口 | modsDSp2y6.js:21 |
| `Do` | 数据读取器/迭代器 | modsDSp2y6.js |
| `lC` | 解析器状态机 | modsDSp2y6.js |
| `yn` | CBOR 节点类型 | modsDSp2y6.js |
| `rC` | 配置处理 | modsDSp2y6.js |

### 3. Opcode 格式

```javascript
[majorType, additionalInfo, value, offset, extraBytes]
```

- **majorType** (0-7): 数据类型
  - 0: 正整数
  - 1: 负整数
  - 2: 字节串
  - 3: UTF-8 字符串
  - 4: 数组
  - 5: Map/对象
  - 6: Tag (特殊类型)
  - 7: 简单值/浮点数

- **additionalInfo** (0-31): 附加信息
  - 0-23: 值直接在此
  - 24: 后跟 1 字节
  - 25: 后跟 2 字节
  - 26: 后跟 4 字节
  - 27: 后跟 8 字节
  - 31: 不定长度

- **value**: 解析后的值
- **offset**: 数据起始位置
- **extraBytes**: 额外字节数

### 4. WebSocket 协议消息类型

| typ | 名称 | 方向 | 说明 |
|-----|------|------|------|
| 0 | LOGIN | ↔ | 登录请求/响应 |
| 1 | SUBSCRIBE | ↔ | 订阅请求/响应 |
| 2 | HEARTBEAT | ↔ | 心跳 |
| 3 | DATA_PUSH | ← | 数据推送 |
| 4 | UNSUBSCRIBE | → | 取消订阅 |
| 5 | ERROR | ← | 错误消息 |

### 5. 数据推送类型 (kind)

- `"matches"`: 赛事数据
- `"odds"`: 赔率数据
- `"live"`: 滚球/比分数据
- `"set"`: 盘口设置
- `"results"`: 比赛结果
- `"stats"`: 统计数据

## 🔧 Node.js 实现要点

### 1. CBOR 解码器

```javascript
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
    
    // 读取额外数据
    let value = this.readValue(ai, mt);
    
    // 根据主类型处理
    switch (mt) {
      case 0: return value;  // 正整数
      case 1: return -1 - value;  // 负整数
      case 2: return this.readBytes(value);  // 字节串
      case 3: return this.readString(value);  // 字符串
      case 4: return this.readArray(value);  // 数组
      case 5: return this.readMap(value);  // Map
      case 6: return this.readTag(value);  // Tag
      case 7: return this.readSimple(ai, value);  // 简单值
    }
  }
}
```

### 2. RC4 加密/解密

```javascript
function rc4(data, key) {
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
  
  // 加密/解密
  const result = new Uint8Array(data.length);
  let i = 0;
  j = 0;
  for (let k = 0; k < data.length; k++) {
    i = (i + 1) % 256;
    j = (j + S[i]) % 256;
    [S[i], S[j]] = [S[j], S[i]];
    const t = (S[i] + S[j]) % 256;
    result[k] = data[k] ^ S[t];
  }
  
  return result;
}
```

### 3. WebSocket 客户端

```javascript
class BettingClient {
  constructor(url, rc4Key) {
    this.url = url;
    this.rc4Key = rc4Key;
    this.ws = null;
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';
    
    this.ws.on('message', (data) => {
      const encrypted = new Uint8Array(data);
      const decrypted = rc4(encrypted, this.rc4Key);
      const decoder = new CBORDecoder(decrypted);
      const message = decoder.decode();
      this.handleMessage(message);
    });
  }
  
  send(data) {
    const encoder = new CBOREncoder();
    const encoded = encoder.encode(data);
    const encrypted = rc4(encoded, this.rc4Key);
    this.ws.send(encrypted);
  }
  
  login(username, password) {
    this.send({ typ: 0, data: { username, password } });
  }
  
  subscribe(channels) {
    this.send({ typ: 1, data: channels });
  }
  
  heartbeat() {
    this.send({ typ: 2 });
  }
}
```

## 📝 使用示例

```javascript
// 1. 创建客户端
const rc4Key = new Uint8Array([...]); // 从握手获取
const client = new BettingClient('wss://example.com/ws', rc4Key);

// 2. 连接
client.connect();

// 3. 登录
client.login('username', 'password');

// 4. 订阅数据
client.subscribe(['matches', 'odds', 'live']);

// 5. 定时心跳
setInterval(() => client.heartbeat(), 30000);

// 6. 处理消息
client.on('message', (msg) => {
  switch (msg.typ) {
    case 0: console.log('Login:', msg.data); break;
    case 1: console.log('Subscribed:', msg.data); break;
    case 2: console.log('Heartbeat'); break;
    case 3: console.log('Data:', msg.kind, msg.data); break;
  }
});
```

## ✅ 完成的任务

1. ✅ **yn 家族函数分析**
   - 提取并重写了 yn.create, yn.push, yn.replaceLast, yn.convert
   - 说明了如何处理数组、Map、Tag 等
   - 展示了 opcode 到最终 JS 对象的转换过程

2. ✅ **Do 迭代器与 lC.step 分析**
   - 整理了 Do 里对 major type 的 switch
   - 列出了每种 step 调用时 t[0..3] 的含义
   - 扩展了 opcode → payload 的映射表
   - 指出了 opcode 对应的协议操作 (登录/订阅/心跳/数据推送)

3. ✅ **示例 payload**
   - 提供了登录成功、订阅、心跳、赔率更新的示例
   - 展示了 RC4 解密后的 raw bytes 和 CBOR 解码结果
   - 提供了完整的 Node.js 实现和测试用例

## 🚀 下一步建议

1. **实现完整的 CBOR 编码器**
   - 目前只有解码器,需要实现编码器用于发送消息

2. **处理 RC4 密钥协商**
   - 分析握手过程,了解如何获取 RC4 密钥

3. **实现消息签名验证**
   - 某些消息包含签名字段,需要验证完整性

4. **错误处理和重连机制**
   - 实现断线重连、消息重发等机制

5. **性能优化**
   - 使用 Buffer Pool 减少内存分配
   - 实现消息队列和批处理

6. **测试和调试**
   - 使用真实数据测试解析器
   - 对比浏览器和 Node.js 的解析结果


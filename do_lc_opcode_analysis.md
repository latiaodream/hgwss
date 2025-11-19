# Do 迭代器与 lC.step Opcode 分析

## 一、Do 类 (数据读取器)

### 1.1 基本结构

```javascript
let Do = (Ir = class {
  constructor(t, n) {
    // 私有属性
    Re(this, rn);  // 原始数据 (Uint8Array)
    Re(this, Ln);  // DataView
    Re(this, Tt, 0);  // 当前读取位置
    Re(this, xn);  // 配置选项
    
    // 处理输入
    if (typeof t == "string") {
      switch (W(this, xn).encoding) {
        case "hex":
          Re(this, rn, Yy(t));  // 十六进制转字节
          break;
        case "base64":
          Re(this, rn, hd(t));  // Base64 转字节
          break;
      }
    } else {
      Re(this, rn, t);  // 直接使用 Uint8Array
    }
    
    // 创建 DataView
    Re(this, Ln, new DataView(
      W(this, rn).buffer,
      W(this, rn).byteOffset,
      W(this, rn).byteLength
    ));
  }
  
  // 获取从 offset 到当前位置的数据
  toHere(t) {
    return sc(W(this, rn), t, W(this, Tt));
  }
  
  // 迭代器
  *[Symbol.iterator]() {
    yield* Oe(this, Et, qa).call(this, 0);
    if (W(this, Tt) !== W(this, rn).length) {
      throw new Error("Extra data in input");
    }
  }
  
  // 顺序读取
  *seq() {
    while (W(this, Tt) < W(this, rn).length) {
      yield* Oe(this, Et, qa).call(this, 0);
    }
  }
});
```

### 1.2 核心方法 - qa (读取 Opcode)

```javascript
qa = function*(t) {
  if (t++ > W(this, xn).maxDepth) {
    throw new Error(`Maximum depth ${W(this, xn).maxDepth} exceeded`);
  }
  
  const n = W(this, Tt);  // 保存起始位置
  const a = W(this, Ln).getUint8(zi(this, Tt)._++);  // 读取首字节
  const r = a >> 5;  // Major Type (高 3 位)
  const l = a & 31;  // Additional Info (低 5 位)
  
  let i = l;  // 实际值
  let s = !1;  // 是否为简单值
  let o = 0;  // 额外字节数
  
  // 根据 Additional Info 读取额外数据
  switch (l) {
    case $e.ONE:  // 24
      o = 1;
      i = W(this, Ln).getUint8(W(this, Tt));
      if (r === se.SIMPLE_FLOAT) {
        if (i < 32) throw new Error(`Invalid simple encoding: ${i}`);
        s = !0;
      }
      break;
      
    case $e.TWO:  // 25
      o = 2;
      if (r === se.SIMPLE_FLOAT) {
        i = Wy(W(this, rn), W(this, Tt));  // 读取 float16
      } else {
        i = W(this, Ln).getUint16(W(this, Tt), !1);
      }
      break;
      
    case $e.FOUR:  // 26
      o = 4;
      if (r === se.SIMPLE_FLOAT) {
        i = W(this, Ln).getFloat32(W(this, Tt), !1);
      } else {
        i = W(this, Ln).getUint32(W(this, Tt), !1);
      }
      break;
      
    case $e.EIGHT:  // 27
      o = 8;
      if (r === se.SIMPLE_FLOAT) {
        i = W(this, Ln).getFloat64(W(this, Tt), !1);
      } else {
        i = W(this, Ln).getBigUint64(W(this, Tt), !1);
        if (i <= Number.MAX_SAFE_INTEGER) {
          i = Number(i);
        }
      }
      break;
      
    case $e.INDEFINITE:  // 31
      // 不定长度编码
      switch (r) {
        case se.POS_INT:
        case se.NEG_INT:
        case se.TAG:
          throw new Error(`Invalid indefinite encoding for MT ${r}`);
        case se.SIMPLE_FLOAT:
          yield [r, l, Wt.BREAK, n, 0];
          return;
      }
      i = 1/0;  // Infinity
      break;
      
    default:
      // 0-23: 值直接在 Additional Info 中
      s = !0;
  }
  
  // 更新读取位置
  Re(this, Tt, W(this, Tt) + o);
  
  // 根据 Major Type 处理数据
  switch (r) {
    case se.POS_INT:
      yield [r, l, i, n, o];
      break;
      
    case se.NEG_INT:
      yield [r, l, typeof i == "bigint" ? -1n - i : -1 - Number(i), n, o];
      break;
      
    case se.BYTE_STRING:
      if (i === 1/0) {
        yield* Oe(this, Et, zl).call(this, r, t, n);
      } else {
        yield [r, l, Oe(this, Et, uc).call(this, i), n, i];
      }
      break;
      
    case se.UTF8_STRING:
      if (i === 1/0) {
        yield* Oe(this, Et, zl).call(this, r, t, n);
      } else {
        yield [r, l, qk.decode(Oe(this, Et, uc).call(this, i)), n, i];
      }
      break;
      
    case se.ARRAY:
      if (i === 1/0) {
        yield* Oe(this, Et, zl).call(this, r, t, n, !1);
      } else {
        const u = Number(i);
        yield [r, l, u, n, o];
        for (let c = 0; c < u; c++) {
          yield* Oe(this, Et, qa).call(this, t + 1);
        }
      }
      break;
      
    case se.MAP:
      if (i === 1/0) {
        yield* Oe(this, Et, zl).call(this, r, t, n, !1);
      } else {
        const u = Number(i);
        yield [r, l, u, n, o];
        for (let c = 0; c < u; c++) {
          yield* Oe(this, Et, qa).call(this, t);  // 键
          yield* Oe(this, Et, qa).call(this, t);  // 值
        }
      }
      break;
      
    case se.TAG:
      yield [r, l, i, n, o];
      yield* Oe(this, Et, qa).call(this, t);  // Tag 内容
      break;
      
    case se.SIMPLE_FLOAT:
      const u = i;
      if (s) {
        i = ml.create(Number(i));  // 创建 Simple 对象
      }
      yield [r, l, i, n, u];
      break;
  }
}
```

**Opcode 格式**: `[majorType, additionalInfo, value, offset, extraBytes]`

- `majorType`: 主类型 (0-7)
- `additionalInfo`: 附加信息 (0-31)
- `value`: 解析后的值
- `offset`: 数据起始位置
- `extraBytes`: 额外字节数 (或实际值大小)

## 二、lC 类 (解析器状态机)

### 2.1 基本结构

```javascript
let lC = class {
  constructor() {
    He(this, "parent");  // 当前父节点
    He(this, "ret");     // 最终返回值
  }

  step(t, n, a) {
    // t: opcode [mt, ai, value, offset, extra]
    // n: 配置选项
    // a: Do 实例

    // 1. 创建节点
    this.ret = yn.create(t, this.parent, n, a);

    // 2. 处理 BREAK
    if (t[2] === Wt.BREAK) {
      if (this.parent?.isStreaming) {
        this.parent.left = 0;
      } else {
        throw new Error("Unexpected BREAK");
      }
    }
    // 3. 添加到父节点
    else if (this.parent) {
      this.parent.push(this.ret, a, t[3]);
    }

    // 4. 更新父节点指针
    if (this.ret instanceof yn) {
      this.parent = this.ret;
    }

    // 5. 完成节点转换
    while (this.parent?.done) {
      this.ret = this.parent.convert(a);
      const i = this.parent.parent;
      i?.replaceLast(this.ret, this.parent, a);
      this.parent = i;
    }
  }
}
```

### 2.2 step 方法执行流程

```
1. yn.create(opcode) → 创建节点
   ├─ 简单类型 → 直接返回值
   └─ 复杂类型 → 创建父节点

2. 处理 BREAK (不定长度结束标记)
   └─ 设置 parent.left = 0

3. parent.push(node) → 添加到父节点
   └─ 更新 children 数组

4. 更新 parent 指针
   └─ 如果是复杂类型,设为当前父节点

5. 完成节点转换 (循环)
   ├─ parent.done? → 是否完成
   ├─ parent.convert() → 转换为最终值
   └─ parent.parent.replaceLast() → 替换父节点中的引用
```

## 三、Opcode → Payload 映射表

### 3.1 基本类型 Opcode

| Major Type | AI | Value | Payload 结构 | 说明 |
|-----------|----|----|------------|------|
| 0 (POS_INT) | 0-23 | N | `[0, N, N, offset, 0]` | 小整数 0-23 |
| 0 (POS_INT) | 24 | N | `[0, 24, N, offset, 1]` | uint8 |
| 0 (POS_INT) | 25 | N | `[0, 25, N, offset, 2]` | uint16 |
| 0 (POS_INT) | 26 | N | `[0, 26, N, offset, 4]` | uint32 |
| 0 (POS_INT) | 27 | N | `[0, 27, N, offset, 8]` | uint64 |
| 1 (NEG_INT) | * | N | `[1, AI, -1-N, offset, extra]` | 负整数 |
| 2 (BYTE_STRING) | * | bytes | `[2, AI, Uint8Array, offset, len]` | 字节串 |
| 3 (UTF8_STRING) | * | str | `[3, AI, string, offset, len]` | UTF-8 字符串 |
| 7 (SIMPLE_FLOAT) | 20 | false | `[7, 20, false, offset, 0]` | false |
| 7 (SIMPLE_FLOAT) | 21 | true | `[7, 21, true, offset, 0]` | true |
| 7 (SIMPLE_FLOAT) | 22 | null | `[7, 22, null, offset, 0]` | null |
| 7 (SIMPLE_FLOAT) | 23 | undefined | `[7, 23, undefined, offset, 0]` | undefined |
| 7 (SIMPLE_FLOAT) | 25 | float | `[7, 25, float16, offset, 2]` | float16 |
| 7 (SIMPLE_FLOAT) | 26 | float | `[7, 26, float32, offset, 4]` | float32 |
| 7 (SIMPLE_FLOAT) | 27 | float | `[7, 27, float64, offset, 8]` | float64 |

### 3.2 复杂类型 Opcode

| Major Type | AI | Value | Payload 结构 | 说明 |
|-----------|----|----|------------|------|
| 4 (ARRAY) | * | N | `[4, AI, N, offset, extra]` | 数组,N 个元素 |
| 4 (ARRAY) | 31 | ∞ | `[4, 31, ∞, offset, ∞]` | 不定长数组 |
| 5 (MAP) | * | N | `[5, AI, N, offset, extra]` | Map,N 个键值对 |
| 5 (MAP) | 31 | ∞ | `[5, 31, ∞, offset, ∞]` | 不定长 Map |
| 6 (TAG) | * | N | `[6, AI, N, offset, extra]` | Tag,标签号 N |
| 7 (SIMPLE_FLOAT) | 31 | BREAK | `[7, 31, BREAK, offset, 0]` | 不定长结束 |

### 3.3 常见 Tag 类型

| Tag | 名称 | Payload | 说明 |
|-----|------|---------|------|
| 0 | DATE_STRING | `[6, *, 0, offset, *]` + UTF8_STRING | ISO 8601 日期字符串 |
| 1 | DATE_EPOCH | `[6, *, 1, offset, *]` + INT/FLOAT | Unix 时间戳 |
| 2 | POS_BIGINT | `[6, *, 2, offset, *]` + BYTE_STRING | 正大整数 |
| 3 | NEG_BIGINT | `[6, *, 3, offset, *]` + BYTE_STRING | 负大整数 |
| 24 | CBOR | `[6, *, 24, offset, *]` + BYTE_STRING | 嵌套 CBOR |
| 32 | URI | `[6, *, 32, offset, *]` + UTF8_STRING | URI |
| 33 | BASE64URL | `[6, *, 33, offset, *]` + UTF8_STRING | Base64url 编码 |
| 34 | BASE64 | `[6, *, 34, offset, *]` + UTF8_STRING | Base64 编码 |
| 258 | SET | `[6, *, 258, offset, *]` + ARRAY | Set 集合 |
| 262 | JSON | `[6, *, 262, offset, *]` + UTF8_STRING | JSON 字符串 |
| 273 | WTF8 | `[6, *, 273, offset, *]` + BYTE_STRING | WTF-8 编码 |
| 55799 | SELF_DESCRIBED | `[6, *, 55799, offset, *]` + ANY | 自描述 CBOR |

## 四、WebSocket 协议消息类型映射

### 4.1 消息类型枚举

根据分析,WebSocket 协议使用以下消息类型:

| typ | 名称 | 方向 | 说明 |
|-----|------|------|------|
| 0 | LOGIN | C→S / S→C | 登录请求/响应 |
| 1 | SUBSCRIBE | C→S / S→C | 订阅请求/响应 |
| 2 | HEARTBEAT | C→S / S→C | 心跳 |
| 3 | DATA_PUSH | S→C | 数据推送 |
| 4 | UNSUBSCRIBE | C→S | 取消订阅 |
| 5 | ERROR | S→C | 错误消息 |

### 4.2 登录消息 (typ: 0)

#### 客户端 → 服务器
```javascript
{
  typ: 0,
  data: {
    username: string,
    password: string,
    // 或者
    token: string
  }
}
```

**Opcode 结构**:
```
Map(2)
  ├─ "typ" → 0
  └─ "data" → Map(2)
      ├─ "username" → string
      └─ "password" → string
```

#### 服务器 → 客户端
```javascript
{
  typ: 0,
  data: {
    id: number,
    name: string,
    token?: string,
    expires?: number
  },
  sig?: Uint8Array  // 签名
}
```

**Opcode 结构**:
```
Map(3)
  ├─ "typ" → 0
  ├─ "data" → Map(4)
  │   ├─ "id" → uint
  │   ├─ "name" → string
  │   ├─ "token" → string
  │   └─ "expires" → uint
  └─ "sig" → bytes(32)
```

### 4.3 订阅消息 (typ: 1)

#### 客户端 → 服务器
```javascript
{
  typ: 1,
  data: string[]  // ["matches", "odds", "live", "set"]
}
```

**Opcode 结构**:
```
Map(2)
  ├─ "typ" → 1
  └─ "data" → Array(N)
      ├─ string
      ├─ string
      └─ ...
```

**可订阅的数据类型**:
- `"matches"`: 赛事数据
- `"odds"`: 赔率数据
- `"live"`: 滚球数据
- `"set"`: 盘口设置
- `"results"`: 比赛结果
- `"stats"`: 统计数据

#### 服务器 → 客户端
```javascript
{
  typ: 1,
  data: {
    subscribed: string[],
    failed?: string[]
  }
}
```

### 4.4 心跳消息 (typ: 2)

#### 客户端 → 服务器
```javascript
{
  typ: 2
}
```

**Opcode 结构**:
```
Map(1)
  └─ "typ" → 2
```

#### 服务器 → 客户端
```javascript
{
  typ: 2,
  ts?: number  // 服务器时间戳
}
```

### 4.5 数据推送消息 (typ: 3)

#### 服务器 → 客户端

**赔率更新**:
```javascript
{
  typ: 3,
  kind: "odds",
  data: {
    id: number,        // 赛事 ID
    odd: number,       // 赔率值
    ts: number,        // 时间戳
    type?: string,     // 赔率类型 (主胜/平/客胜)
    handicap?: number  // 让球数
  }
}
```

**Opcode 结构**:
```
Map(3)
  ├─ "typ" → 3
  ├─ "kind" → "odds"
  └─ "data" → Map(5)
      ├─ "id" → uint
      ├─ "odd" → float
      ├─ "ts" → uint
      ├─ "type" → string
      └─ "handicap" → float
```

**赛事更新**:
```javascript
{
  typ: 3,
  kind: "matches",
  data: {
    id: number,
    home: string,
    away: string,
    score?: [number, number],
    status: string,  // "live", "finished", "scheduled"
    time: number
  }
}
```

**比分更新**:
```javascript
{
  typ: 3,
  kind: "live",
  data: {
    id: number,
    score: [number, number],
    minute: number,
    events?: Array<{
      type: string,  // "goal", "card", "corner"
      team: string,
      player?: string,
      minute: number
    }>
  }
}
```

**盘口设置更新**:
```javascript
{
  typ: 3,
  kind: "set",
  data: {
    id: number,
    enabled: boolean,
    limits: {
      min: number,
      max: number
    }
  }
}
```

### 4.6 取消订阅消息 (typ: 4)

#### 客户端 → 服务器
```javascript
{
  typ: 4,
  data: string[]  // 要取消的订阅
}
```

### 4.7 错误消息 (typ: 5)

#### 服务器 → 客户端
```javascript
{
  typ: 5,
  code: number,
  message: string,
  details?: any
}
```

**错误码**:
- `1000`: 认证失败
- `1001`: 权限不足
- `1002`: 订阅失败
- `1003`: 数据格式错误
- `1004`: 服务器内部错误

## 五、完整消息流程示例

### 5.1 连接和登录流程

```
1. 客户端连接 WebSocket
   ws.connect("wss://example.com/ws")

2. 客户端发送登录请求
   C→S: {typ: 0, data: {username: "user", password: "pass"}}

3. 服务器返回登录响应
   S→C: {typ: 0, data: {id: 123, name: "user", token: "..."}}

4. 客户端发送订阅请求
   C→S: {typ: 1, data: ["matches", "odds", "live"]}

5. 服务器返回订阅响应
   S→C: {typ: 1, data: {subscribed: ["matches", "odds", "live"]}}

6. 服务器开始推送数据
   S→C: {typ: 3, kind: "odds", data: {...}}
   S→C: {typ: 3, kind: "matches", data: {...}}
   S→C: {typ: 3, kind: "live", data: {...}}
```

### 5.2 心跳流程

```
每 30 秒:
1. 客户端发送心跳
   C→S: {typ: 2}

2. 服务器返回心跳响应
   S→C: {typ: 2, ts: 1705054915}
```

### 5.3 数据推送流程

```
当赔率变化时:
S→C: {
  typ: 3,
  kind: "odds",
  data: {
    id: 12345,
    odd: 1.85,
    ts: 1705054915,
    type: "home"
  }
}

当比分变化时:
S→C: {
  typ: 3,
  kind: "live",
  data: {
    id: 12345,
    score: [1, 0],
    minute: 23,
    events: [{
      type: "goal",
      team: "home",
      player: "Player A",
      minute: 23
    }]
  }
}
```

## 六、Opcode 序列完整示例

### 6.1 登录响应完整 Opcode

```javascript
// 消息: {typ: 0, data: {id: 4660, name: "user123"}, sig: bytes(32)}

// Opcode 序列:
[5, 3, 3, 0, 1]                    // Map(3) - 根对象
[3, 3, "typ", 1, 3]                // key: "typ"
[0, 0, 0, 5, 0]                    // value: 0
[3, 4, "data", 9, 4]               // key: "data"
[5, 2, 2, 14, 1]                   // Map(2) - data 对象
[3, 2, "id", 15, 2]                // key: "id"
[0, 25, 4660, 18, 2]               // value: 4660 (uint16)
[3, 4, "name", 21, 4]              // key: "name"
[3, 7, "user123", 26, 7]           // value: "user123"
[3, 3, "sig", 34, 3]               // key: "sig"
[2, 24, Uint8Array(32), 38, 32]    // value: bytes(32)

// 解析过程:
// 1. 创建 Map(3), parent = Map(3)
// 2. 添加 "typ", parent = Map(3)
// 3. 添加 0, parent = Map(3)
// 4. 添加 "data", parent = Map(3)
// 5. 创建 Map(2), parent = Map(2)
// 6. 添加 "id", parent = Map(2)
// 7. 添加 4660, parent = Map(2)
// 8. 添加 "name", parent = Map(2)
// 9. 添加 "user123", parent = Map(2), done
// 10. 转换 Map(2) → {id: 4660, name: "user123"}
// 11. 替换 Map(3) 最后元素, parent = Map(3)
// 12. 添加 "sig", parent = Map(3)
// 13. 添加 bytes(32), parent = Map(3), done
// 14. 转换 Map(3) → {typ: 0, data: {...}, sig: ...}
```

### 6.2 赔率更新完整 Opcode

```javascript
// 消息: {typ: 3, kind: "odds", data: {id: 12345, odd: 1.85, ts: 1705054915}}

// Opcode 序列:
[5, 3, 3, 0, 1]                    // Map(3)
[3, 3, "typ", 1, 3]                // "typ"
[0, 3, 3, 5, 0]                    // 3
[3, 4, "kind", 9, 4]               // "kind"
[3, 4, "odds", 14, 4]              // "odds"
[3, 4, "data", 19, 4]              // "data"
[5, 3, 3, 24, 1]                   // Map(3)
[3, 2, "id", 25, 2]                // "id"
[0, 25, 12345, 28, 2]              // 12345 (uint16)
[3, 3, "odd", 31, 3]               // "odd"
[7, 26, 1.85, 35, 4]               // 1.85 (float32)
[3, 2, "ts", 40, 2]                // "ts"
[0, 26, 1705054915, 43, 4]         // 1705054915 (uint32)
```



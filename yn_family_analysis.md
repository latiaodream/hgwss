# yn 家族函数完整分析

## 一、yn 类定义 (Node 类型)

### 1.1 基本结构

从 `modsDSp2y6.js` 中提取的 `yn` 类定义:

```javascript
let yn = (ta = class {
  constructor(t, n, a, r) {
    // 核心属性
    this.parent = a;      // 父节点
    this.mt = t[0];       // Major Type (0-7)
    this.ai = t[1];       // Additional Info
    this.left = n;        // 剩余子元素数量
    this.offset = t[3];   // 数据偏移量
    this.count = 0;       // 已处理子元素数量
    this.children = [];   // 子元素数组
    this.depth = 0;       // 嵌套深度
    
    // 私有属性
    Re(this, zt, r);      // 配置选项
    Re(this, Qn, null);   // 用于 Map 的键排序/去重
    
    // 设置深度
    if (a) this.depth = a.depth + 1;
    
    // 对于 MAP 类型,初始化键数组
    if (this.mt === se.MAP && (r.sortKeys || r.rejectDuplicateKeys)) {
      Re(this, Qn, []);
    }
    
    // 检查是否拒绝流式编码
    if (r.rejectStreaming && this.ai === $e.INDEFINITE) {
      throw new Error("Streaming not supported");
    }
  }
  
  // 判断是否为流式编码
  get isStreaming() {
    return this.left === 1/0;  // Infinity
  }
  
  // 判断是否完成
  get done() {
    return this.left === 0;
  }
  
  // ... 其他方法见下文
});
```

### 1.2 Major Types (mt)

```javascript
const se = {
  POS_INT: 0,        // 正整数
  NEG_INT: 1,        // 负整数
  BYTE_STRING: 2,    // 字节串
  UTF8_STRING: 3,    // UTF-8 字符串
  ARRAY: 4,          // 数组
  MAP: 5,            // Map/对象
  TAG: 6,            // 标签
  SIMPLE_FLOAT: 7    // 简单值/浮点数
};
```

### 1.3 Additional Info (ai)

```javascript
const $e = {
  ZERO: 0,           // 值在 0-23 之间
  ONE: 24,           // 后跟 1 字节
  TWO: 25,           // 后跟 2 字节
  FOUR: 26,          // 后跟 4 字节
  EIGHT: 27,         // 后跟 8 字节
  INDEFINITE: 31     // 不定长度
};
```

## 二、yn 家族核心方法

### 2.1 yn.create() - 创建节点

```javascript
static create(t, n, a, r) {
  const [l, i, s, o] = t;  // [mt, ai, value, offset]
  
  switch (l) {
    case se.POS_INT:
    case se.NEG_INT:
      // 处理整数
      let u = s;
      if (a.convertUnsafeIntsToFloat && u >= Ys.MIN && u <= Ys.MAX) {
        u = Number(s);
      }
      return a.boxed ? Gl(u, r.toHere(o)) : u;
      
    case se.SIMPLE_FLOAT:
      // 处理浮点数和简单值
      if (i > $e.ONE) {
        // 浮点数
        if (a.rejectFloats) throw new Error(`Unwanted float: ${s}`);
        return a.boxed ? Gl(s, r.toHere(o)) : s;
      } else {
        // 简单值 (true, false, null, undefined)
        if (a.rejectSimple && s instanceof ml) {
          throw new Error(`Invalid simple value: ${s}`);
        }
        return s;
      }
      
    case se.BYTE_STRING:
    case se.UTF8_STRING:
      // 处理字符串
      if (s === 1/0) {
        // 不定长度字符串,创建父节点
        return new a.ParentType(t, 1/0, n, a);
      }
      return a.boxed ? Gl(s, r.toHere(o)) : s;
      
    case se.ARRAY:
      // 创建数组节点
      return new a.ParentType(t, s, n, a);
      
    case se.MAP:
      // 创建 Map 节点 (子元素数量 * 2)
      return new a.ParentType(t, s * 2, n, a);
      
    case se.TAG:
      // 创建标签节点
      const u = new a.ParentType(t, 1, n, a);
      u.children = new Be(s);  // Be 是 Tag 类
      return u;
  }
  
  throw new TypeError(`Invalid major type: ${l}`);
}
```

**功能说明**:
- 根据 opcode 创建不同类型的节点
- 对于简单类型(整数、字符串),直接返回值
- 对于复杂类型(数组、Map、Tag),创建父节点用于后续填充子元素
- 处理不定长度编码

### 2.2 yn.push() - 添加子元素

```javascript
push(t, n, a) {
  // 添加子元素到 children 数组
  this.children.push(t);
  
  // 如果是 MAP 且需要排序/去重,保存原始编码
  if (W(this, Qn)) {
    const r = Us(t) || n.toHere(a);  // 获取原始字节
    W(this, Qn).push(r);
  }
  
  // 减少剩余计数并返回
  return --this.left;
}
```

**功能说明**:
- 将子元素添加到 `children` 数组
- 对于 Map 类型,同时保存键的原始编码(用于排序/去重)
- 返回剩余子元素数量

### 2.3 yn.replaceLast() - 替换最后一个子元素

```javascript
replaceLast(t, n, a) {
  let r, l = -1/0;

  if (this.children instanceof Be) {
    // Tag 类型,替换 contents
    l = 0;
    r = this.children.contents;
    this.children.contents = t;
  } else {
    // 其他类型,替换数组最后一个元素
    l = this.children.length - 1;
    r = this.children[l];
    this.children[l] = t;
  }

  // 更新 Map 的键编码
  if (W(this, Qn)) {
    const i = Us(t) || a.toHere(n.offset);
    W(this, Qn)[l] = i;
  }

  return r;  // 返回被替换的元素
}
```

**功能说明**:
- 替换最后添加的子元素
- 用于处理 Tag 类型(Tag 包裹其他值)
- 更新 Map 的键编码数组

### 2.4 yn.convert() - 转换为最终结果

```javascript
convert(t) {
  let n;

  switch (this.mt) {
    case se.ARRAY:
      // 数组直接返回 children
      n = this.children;
      break;

    case se.MAP:
      // Map 需要特殊处理
      const a = Oe(this, io, Jy).call(this);  // 调用 Jy 方法

      // 检查键排序
      if (W(this, zt).sortKeys) {
        let r;
        for (const l of a) {
          if (r && W(this, zt).sortKeys(r, l) >= 0) {
            throw new Error(`Duplicate or out of order key: "0x${l[2]}"`);
          }
          r = l;
        }
      }

      // 检查重复键
      else if (W(this, zt).rejectDuplicateKeys) {
        const r = new Set;
        for (const [l, i, s] of a) {
          const o = mn(s);  // 转换为十六进制字符串
          if (r.has(o)) {
            throw new Error(`Duplicate key: "0x${o}"`);
          }
          r.add(o);
        }
      }

      // 创建对象或 Map
      n = W(this, zt).createObject(a, W(this, zt));
      break;

    case se.BYTE_STRING:
      // 合并字节串
      return bk(this.children);

    case se.UTF8_STRING:
      // 合并字符串
      const a = this.children.join("");
      n = W(this, zt).boxed ? Gl(a, t.toHere(this.offset)) : a;
      break;

    case se.TAG:
      // 解码 Tag
      n = this.children.decode(W(this, zt));
      break;

    default:
      throw new TypeError(`Invalid mt on convert: ${this.mt}`);
  }

  // 保存原始编码
  if (W(this, zt).saveOriginal && n && typeof n == "object") {
    pi(n, t.toHere(this.offset));
  }

  return n;
}
```

**功能说明**:
- 将节点转换为最终的 JavaScript 对象
- 数组: 直接返回 children 数组
- Map: 转换为 Object 或 Map,检查键排序/去重
- 字符串: 合并分段字符串
- Tag: 调用 Tag 的 decode 方法
- 可选保存原始 CBOR 编码

### 2.5 Jy 方法 - Map 转换辅助

```javascript
Jy = function() {
  const t = this.children;
  const n = t.length;

  if (n % 2) {
    throw new Error("Missing map value");
  }

  const a = new Array(n / 2);

  if (W(this, Qn)) {
    // 有键编码,构建 [key, value, keyBytes] 三元组
    for (let r = 0; r < n; r += 2) {
      a[r >> 1] = [t[r], t[r + 1], W(this, Qn)[r]];
    }
  } else {
    // 无键编码,构建 [key, value, emptyBytes] 三元组
    for (let r = 0; r < n; r += 2) {
      a[r >> 1] = [t[r], t[r + 1], Jk];  // Jk = new Uint8Array(0)
    }
  }

  return a;
}
```

**功能说明**:
- 将 Map 的 children 数组转换为键值对数组
- 每个元素是 `[key, value, keyBytes]` 三元组
- `keyBytes` 用于键排序和去重检查

## 三、数据结构转换示例

### 3.1 简单类型转换

#### 整数
```javascript
// Opcode: [0, 5, 5, 0, 0]
yn.create([0, 5, 5, 0], null, options, reader)
// → 返回: 5
```

#### 字符串
```javascript
// Opcode: [3, 3, "foo", 0, 3]
yn.create([3, 3, "foo", 0], null, options, reader)
// → 返回: "foo"
```

#### 布尔值
```javascript
// Opcode: [7, 21, true, 0, 0]
yn.create([7, 21, true, 0], null, options, reader)
// → 返回: true
```

### 3.2 数组转换

```javascript
// CBOR: [1, 2, 3]
// Opcode 序列:
// [4, 3, 3, 0, 1]  → 创建数组节点 (3 个元素)
// [0, 1, 1, 2, 0]  → 添加 1
// [0, 2, 2, 3, 0]  → 添加 2
// [0, 3, 3, 4, 0]  → 添加 3

// 步骤 1: 创建数组节点
const arrayNode = yn.create([4, 3, 3, 0], null, options, reader);
// arrayNode = yn { mt: 4, left: 3, children: [] }

// 步骤 2-4: 添加元素
arrayNode.push(1, reader, 2);  // left = 2
arrayNode.push(2, reader, 3);  // left = 1
arrayNode.push(3, reader, 4);  // left = 0 (done)

// 步骤 5: 转换
const result = arrayNode.convert(reader);
// result = [1, 2, 3]
```

### 3.3 Map 转换

```javascript
// CBOR: {a: 1, b: 2}
// Opcode 序列:
// [5, 2, 2, 0, 1]     → 创建 Map 节点 (2 个键值对 = 4 个子元素)
// [3, 1, "a", 2, 1]   → 添加键 "a"
// [0, 1, 1, 4, 0]     → 添加值 1
// [3, 1, "b", 5, 1]   → 添加键 "b"
// [0, 2, 2, 7, 0]     → 添加值 2

// 步骤 1: 创建 Map 节点
const mapNode = yn.create([5, 2, 2, 0], null, options, reader);
// mapNode = yn { mt: 5, left: 4, children: [] }

// 步骤 2-5: 添加键值对
mapNode.push("a", reader, 2);  // left = 3
mapNode.push(1, reader, 4);    // left = 2
mapNode.push("b", reader, 5);  // left = 1
mapNode.push(2, reader, 7);    // left = 0 (done)

// 步骤 6: 转换
const result = mapNode.convert(reader);
// result = {a: 1, b: 2}
```

### 3.4 Tag 转换

```javascript
// CBOR: Tag(1, 1609459200)  → Date
// Opcode 序列:
// [6, 1, 1, 0, 1]           → 创建 Tag 节点 (标签号 1)
// [0, 26, 1609459200, 2, 4] → 添加时间戳

// 步骤 1: 创建 Tag 节点
const tagNode = yn.create([6, 1, 1, 0], null, options, reader);
// tagNode = yn { mt: 6, left: 1, children: Be(1) }

// 步骤 2: 添加内容
tagNode.push(1609459200, reader, 2);  // left = 0

// 步骤 3: 转换
const result = tagNode.convert(reader);
// result = new Date(1609459200 * 1000)
```

### 3.5 嵌套结构转换

```javascript
// CBOR: {users: [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}]}
// Opcode 序列:
// [5, 1, 1, 0, 1]           → Map(1)
// [3, 5, "users", 2, 5]     → key: "users"
// [4, 2, 2, 8, 1]           → Array(2)
// [5, 2, 2, 10, 1]          → Map(2)
// [3, 2, "id", 12, 2]       → key: "id"
// [0, 1, 1, 15, 0]          → value: 1
// [3, 4, "name", 16, 4]     → key: "name"
// [3, 5, "Alice", 21, 5]    → value: "Alice"
// [5, 2, 2, 27, 1]          → Map(2)
// [3, 2, "id", 29, 2]       → key: "id"
// [0, 2, 2, 32, 0]          → value: 2
// [3, 4, "name", 33, 4]     → key: "name"
// [3, 3, "Bob", 38, 3]      → value: "Bob"

// 解析过程 (使用栈):
// 1. 创建 Map(1), parent = Map(1)
// 2. 添加 "users", parent = Map(1)
// 3. 创建 Array(2), parent = Array(2)
// 4. 创建 Map(2), parent = Map(2)
// 5. 添加 "id", parent = Map(2)
// 6. 添加 1, parent = Map(2)
// 7. 添加 "name", parent = Map(2)
// 8. 添加 "Alice", parent = Map(2), done
// 9. 转换 Map(2) → {id: 1, name: "Alice"}
// 10. 替换 Array(2) 最后元素, parent = Array(2)
// 11. 创建 Map(2), parent = Map(2)
// 12. 添加 "id", parent = Map(2)
// 13. 添加 2, parent = Map(2)
// 14. 添加 "name", parent = Map(2)
// 15. 添加 "Bob", parent = Map(2), done
// 16. 转换 Map(2) → {id: 2, name: "Bob"}
// 17. 替换 Array(2) 最后元素, parent = Array(2), done
// 18. 转换 Array(2) → [{id: 1, name: "Alice"}, {id: 2, name: "Bob"}]
// 19. 替换 Map(1) 最后元素, parent = Map(1), done
// 20. 转换 Map(1) → {users: [...]}
```

## 四、特殊情况处理

### 4.1 不定长度编码

```javascript
// CBOR: [_ 1, 2, 3]  (不定长数组)
// Opcode 序列:
// [4, 31, ∞, 0, 0]        → Array(∞)
// [0, 1, 1, 2, 0]         → 1
// [0, 2, 2, 3, 0]         → 2
// [0, 3, 3, 4, 0]         → 3
// [7, 31, BREAK, 5, 0]    → BREAK

// 处理:
const arrayNode = yn.create([4, 31, Infinity, 0], null, options, reader);
// arrayNode.isStreaming = true
// arrayNode.left = Infinity

arrayNode.push(1, reader, 2);  // left = Infinity
arrayNode.push(2, reader, 3);  // left = Infinity
arrayNode.push(3, reader, 4);  // left = Infinity

// 遇到 BREAK
if (arrayNode.isStreaming) {
  arrayNode.left = 0;  // 标记完成
}

const result = arrayNode.convert(reader);
// result = [1, 2, 3]
```

### 4.2 Map 键排序

```javascript
// 配置
const options = {
  sortKeys: (a, b) => {
    // a, b 是 [key, value, keyBytes] 三元组
    const aBytes = a[2];
    const bBytes = b[2];

    // 按字节序比较
    for (let i = 0; i < Math.min(aBytes.length, bBytes.length); i++) {
      if (aBytes[i] !== bBytes[i]) {
        return aBytes[i] - bBytes[i];
      }
    }
    return aBytes.length - bBytes.length;
  }
};

// 如果键不按顺序,抛出错误
```

### 4.3 重复键检测

```javascript
// 配置
const options = {
  rejectDuplicateKeys: true
};

// CBOR: {a: 1, a: 2}  (重复键)
// 转换时会抛出错误: "Duplicate key: 0x6161"
```

## 五、总结

### 5.1 yn 家族方法总结

| 方法 | 功能 | 返回值 |
|------|------|--------|
| `yn.create()` | 根据 opcode 创建节点 | 简单值或 yn 实例 |
| `yn.push()` | 添加子元素 | 剩余子元素数量 |
| `yn.replaceLast()` | 替换最后一个子元素 | 被替换的元素 |
| `yn.convert()` | 转换为最终 JS 对象 | Array/Object/其他 |

### 5.2 Opcode → JS 对象映射

| Opcode MT | 最终结构 | 示例 |
|-----------|---------|------|
| 0 (POS_INT) | Number | `5` |
| 1 (NEG_INT) | Number | `-5` |
| 2 (BYTE_STRING) | Uint8Array | `Uint8Array([1,2,3])` |
| 3 (UTF8_STRING) | String | `"hello"` |
| 4 (ARRAY) | Array | `[1, 2, 3]` |
| 5 (MAP) | Object/Map | `{a: 1, b: 2}` |
| 6 (TAG) | 特殊对象 | `Date`, `BigInt`, etc. |
| 7 (SIMPLE_FLOAT) | Boolean/null/Number | `true`, `null`, `3.14` |



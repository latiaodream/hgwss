# DagCBOR 解析器详细分析

## 1. 核心函数定义

### 1.1 bD 函数（主解析函数）

**位置：** `modsDSp2y6.js` 第 21 行

```javascript
function bD(e,t={}){
    const n=rC(t),           // 处理配置选项
    a=new Do(e,n),           // 创建数据读取器
    r=new lC;                // 创建解析器实例
    for(const l of a)        // 遍历数据
        r.step(l,n,a);       // 逐步解析
    return r.ret             // 返回解析结果
}
```

**功能：**
- 主解析入口函数
- 接收二进制数据和配置选项
- 返回解析后的 JavaScript 对象

### 1.2 lC 类（解析器状态机）

```javascript
let lC=class{
    constructor(){
        He(this,"parent");   // 父节点
        He(this,"ret")       // 返回值
    }
    
    step(t,n,a){
        var r,l;
        // 1. 创建节点
        if(this.ret=yn.create(t,this.parent,n,a),
           t[2]===Wt.BREAK)
            // 2. 处理 BREAK 标记
            if((r=this.parent)!=null&&r.isStreaming)
                this.parent.left=0;
            else throw new Error("Unexpected BREAK");
        else 
            // 3. 添加到父节点
            this.parent&&this.parent.push(this.ret,a,t[3]);
        
        // 4. 处理父子关系
        for(this.ret instanceof yn&&(this.parent=this.ret);
            (l=this.parent)!=null&&l.done;){
            this.ret=this.parent.convert(a);
            const i=this.parent.parent;
            i==null||i.replaceLast(this.ret,this.parent,a),
            this.parent=i
        }
    }
};
```

**功能：**
- 维护解析状态
- 处理嵌套结构（数组、Map）
- 管理父子节点关系

## 2. 数据格式

### 2.1 Opcode 结构

每个 opcode 是一个数组 `[majorType, additionalInfo, value, offset]`：

```javascript
t[0] - Major type (0-7)
t[1] - Additional info (0-31)
t[2] - Value (实际值或 Wt.BREAK)
t[3] - Offset (数据偏移量)
```

### 2.2 Major Types

```javascript
const se={
    POS_INT:0,        // 正整数
    NEG_INT:1,        // 负整数
    BYTE_STRING:2,    // 字节串
    UTF8_STRING:3,    // UTF-8 字符串
    ARRAY:4,          // 数组
    MAP:5,            // Map
    TAG:6,            // 标签
    SIMPLE_FLOAT:7    // 简单值/浮点数
}
```

### 2.3 Additional Info

```javascript
const $e={
    ZERO:0,           // 值在 0-23 之间，直接编码
    ONE:24,           // 后跟 1 字节
    TWO:25,           // 后跟 2 字节
    FOUR:26,          // 后跟 4 字节
    EIGHT:27,         // 后跟 8 字节
    INDEFINITE:31     // 不定长度（流式）
}
```

## 3. Opcode Payload 结构表

| Major Type | Additional Info | Payload 字段 | 字段类型 | 描述 |
|-----------|----------------|------------|---------|------|
| 0 (POS_INT) | 0-23 | value | Number | 值直接编码在 AI 中 |
| 0 (POS_INT) | 24 | value | uint8 | 1 字节无符号整数 |
| 0 (POS_INT) | 25 | value | uint16 | 2 字节无符号整数 |
| 0 (POS_INT) | 26 | value | uint32 | 4 字节无符号整数 |
| 0 (POS_INT) | 27 | value | uint64 | 8 字节无符号整数 |
| 1 (NEG_INT) | 0-27 | value | Number/BigInt | -1 - value |
| 2 (BYTE_STRING) | 0-27 | length, data | Number, Uint8Array | 字节串长度和数据 |
| 2 (BYTE_STRING) | 31 | chunks | Array<Uint8Array> | 不定长字节串（流式） |
| 3 (UTF8_STRING) | 0-27 | length, data | Number, String | 字符串长度和数据 |
| 3 (UTF8_STRING) | 31 | chunks | Array<String> | 不定长字符串（流式） |
| 4 (ARRAY) | 0-27 | length, items | Number, Array | 数组长度和元素 |
| 4 (ARRAY) | 31 | items | Array | 不定长数组（流式） |
| 5 (MAP) | 0-27 | length, pairs | Number, Map | Map 大小和键值对 |
| 5 (MAP) | 31 | pairs | Map | 不定长 Map（流式） |
| 6 (TAG) | 0-27 | tag, content | Number, Any | 标签编号和内容 |
| 7 (SIMPLE_FLOAT) | 0-19 | value | Boolean/Null | 简单值 |
| 7 (SIMPLE_FLOAT) | 20-23 | value | Boolean/Null/Undefined | false/true/null/undefined |
| 7 (SIMPLE_FLOAT) | 25 | value | float16 | 半精度浮点数 |
| 7 (SIMPLE_FLOAT) | 26 | value | float32 | 单精度浮点数 |
| 7 (SIMPLE_FLOAT) | 27 | value | float64 | 双精度浮点数 |
| 7 (SIMPLE_FLOAT) | 31 | BREAK | Symbol | 流式结束标记 |

## 4. Tag Types

```javascript
const tt={
    DATE_STRING:0,          // 日期字符串
    DATE_EPOCH:1,           // Unix 时间戳
    POS_BIGINT:2,           // 正大整数
    NEG_BIGINT:3,           // 负大整数
    CBOR:24,                // 嵌套 CBOR
    URI:32,                 // URI
    BASE64URL:33,           // Base64URL 编码
    BASE64:34,              // Base64 编码
    SET:258,                // Set 集合
    JSON:262,               // JSON 数据
    WTF8:273,               // WTF-8 字符串
    REGEXP:21066,           // 正则表达式
    SELF_DESCRIBED:55799    // 自描述 CBOR
}
```

## 5. 解析流程

```
输入: Uint8Array 二进制数据
  ↓
bD(data, options)
  ↓
1. rC(options) - 处理配置
  ↓
2. new Do(data, config) - 创建数据读取器
  ↓
3. new lC() - 创建解析器
  ↓
4. for (item of dataReader)
     parser.step(item, config, dataReader)
     ↓
     4.1 yn.create() - 创建节点
     4.2 检查 BREAK
     4.3 parent.push() - 添加到父节点
     4.4 parent.convert() - 转换数据
  ↓
5. return parser.ret
  ↓
输出: JavaScript 对象
```

## 6. 下一步

### 6.1 需要进一步分析的部分

1. **yn.create()** - 节点创建逻辑
2. **yn.convert()** - 数据转换逻辑
3. **Do 类** - 数据读取器实现
4. **rC()** - 配置处理函数

### 6.2 Node.js 实现建议

基于以上分析，可以实现一个简化的解析器：

```javascript
class SimpleDagCBORParser {
    parse(data) {
        const reader = new DataReader(data);
        const parser = new Parser();
        
        for (const item of reader) {
            parser.step(item);
        }
        
        return parser.result;
    }
}
```


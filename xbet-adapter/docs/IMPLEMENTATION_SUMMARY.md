# 账号分配功能实现总结

## 📋 实现概述

本次实现为 `XbetClient` 类添加了 `assignAccount` 方法，用于通过 RPC 协议（Opcode: `0x4`）将账号分配给用户。

## 🔍 逆向分析结果

### 从浏览器代码中提取的信息

通过分析混淆后的浏览器 JavaScript 代码（`tmp_main.beauty.js`），我们发现了以下关键信息：

#### 1. RPC Opcode
```javascript
i: 0x4  // 分配账号的操作码
```

#### 2. Payload 结构
```javascript
{
  uid: string,      // 账号ID
  usr: string,      // 用户名（可能需要加密）
  pwd: string,      // 密码（可能需要加密）
  attr: number,     // 属性标志（默认: 1）
  remark: string,   // 备注信息（默认: ''）
  share: number,    // 分享标志（默认: 0）
  email?: string    // 邮箱（可选）
}
```

#### 3. 关键代码片段

从 `function la` 中提取的 payload 构造代码：

```javascript
_0x4bd772['value'] = {
  'usr': _0x219d57[_0xdf9d0e(0x75f)](_0x3bb717),
  'pwd': _0x219d57[_0xdf9d0e(0x312)](_0x572c11),
  'attr': 0x1,
  'remark': '',
  'share': 0x0
}
```

字段名映射：
```javascript
'TWpen': 'uid'
'ASEvA': _0xdf9d0e(0x660)  // 'usr'
'elGyn': _0xdf9d0e(0x720)  // 'pwd'
'fHKYP': 'email'
'rgJPe': _0xdf9d0e(0x5d9)  // 'remark'
'CmHvq': _0xdf9d0e(0x3c5)  // 'attr'
```

## 🛠️ 实现细节

### 1. 修改的文件

#### `src/client/XbetClient.js`

**添加的 Opcode 常量：**
```javascript
const OPCODES = {
  POLL: 0x1,
  ASSIGN_ACCOUNT: 0x4,  // 新增
  HEARTBEAT: 0x5,
  USER_INFO: 0x7,
  EVENTS: 0xb,
  HISTORY: 0x17,
};
```

**新增的方法：**
```javascript
async assignAccount(accountId, username, password, options = {}, timeout) {
  const payload = {
    uid: accountId,
    usr: username,
    pwd: password,
    attr: options.attr ?? 1,
    remark: options.remark ?? '',
    share: options.share ?? 0,
  };

  if (options.email) {
    payload.email = options.email;
  }

  return await this.#call(OPCODES.ASSIGN_ACCOUNT, payload, timeout);
}
```

### 2. 新增的文件

1. **`examples/assign-account.js`** - 使用示例
2. **`docs/ASSIGN_ACCOUNT.md`** - 详细文档
3. **`test/assign-account.test.js`** - 单元测试
4. **`docs/IMPLEMENTATION_SUMMARY.md`** - 本文档

### 3. 更新的文件

- **`README.md`** - 添加了账号分配功能的说明和示例

## 📝 API 文档

### 方法签名

```typescript
async assignAccount(
  accountId: string,
  username: string,
  password: string,
  options?: {
    email?: string,
    remark?: string,
    attr?: number,
    share?: number
  },
  timeout?: number
): Promise<any>
```

### 参数说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `accountId` | `string` | ✅ | - | 账号ID |
| `username` | `string` | ✅ | - | 用户名 |
| `password` | `string` | ✅ | - | 密码 |
| `options.email` | `string` | ⭕ | - | 邮箱地址 |
| `options.remark` | `string` | ⭕ | `''` | 备注信息 |
| `options.attr` | `number` | ⭕ | `1` | 属性标志 |
| `options.share` | `number` | ⭕ | `0` | 分享标志 |
| `timeout` | `number` | ⭕ | `20000` | 超时时间（毫秒） |

## 🚀 使用方法

### 基本用法

```javascript
import { XbetClient } from './src/client/XbetClient.js';
import { config } from './src/config.js';

const client = new XbetClient(config);
await client.connect();

// 等待认证
await new Promise((resolve) => {
  client.once('authenticated', resolve);
});

// 分配账号
const result = await client.assignAccount(
  'account123',
  'testuser',
  'testpass123'
);
```

### 完整示例

```bash
node examples/assign-account.js
```

## ⚠️ 注意事项

1. **加密问题**: 
   - 浏览器代码中 `usr` 和 `pwd` 可能经过加密处理
   - 当前实现直接传递明文，可能需要根据实际情况添加加密逻辑

2. **认证要求**:
   - 必须在认证完成后才能调用 `assignAccount`
   - 建议监听 `authenticated` 事件

3. **错误处理**:
   - 方法会抛出异常，需要使用 try-catch 捕获
   - 超时会返回 `err_timeout` 错误

4. **批量操作**:
   - 批量分配时建议添加延迟，避免请求过快

## 🔬 测试

### 运行单元测试

```bash
npm test test/assign-account.test.js
```

### 运行示例

```bash
node examples/assign-account.js
```

## 📚 相关文档

- [账号分配功能文档](./ASSIGN_ACCOUNT.md)
- [XbetClient API 文档](./XBET_CLIENT.md)
- [主 README](../README.md)

## 🎯 下一步

1. **验证加密需求**: 确认 `usr` 和 `pwd` 是否需要加密
2. **测试实际环境**: 在真实环境中测试功能
3. **完善错误处理**: 添加更详细的错误码和错误信息
4. **性能优化**: 如果需要批量操作，考虑添加批量接口


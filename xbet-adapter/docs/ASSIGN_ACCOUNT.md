# 分配账号功能文档

## 📋 概述

`assignAccount` 方法用于将账号分配给用户。该方法通过 RPC 调用（Opcode: `0x4`）与服务器通信。

## 🔧 方法签名

```javascript
async assignAccount(accountId, username, password, options = {}, timeout)
```

### 参数说明

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `accountId` | `string` | ✅ | 账号ID (uid) |
| `username` | `string` | ✅ | 用户名 (usr) |
| `password` | `string` | ✅ | 密码 (pwd) |
| `options` | `object` | ⭕ | 可选参数对象 |
| `options.email` | `string` | ⭕ | 邮箱地址 |
| `options.remark` | `string` | ⭕ | 备注信息（默认: `''`） |
| `options.attr` | `number` | ⭕ | 属性标志（默认: `1`） |
| `options.share` | `number` | ⭕ | 分享标志（默认: `0`） |
| `timeout` | `number` | ⭕ | 超时时间（毫秒，默认: `20000`） |

### 返回值

- **类型**: `Promise<any>`
- **说明**: 返回服务器响应的分配结果

### 异常

- 如果 RPC 调用失败（status !== 0），会抛出错误
- 如果超时，会抛出 `err_timeout` 错误

## 📝 Payload 结构

发送到服务器的 payload 结构如下：

```javascript
{
  uid: string,      // 账号ID
  usr: string,      // 用户名
  pwd: string,      // 密码
  attr: number,     // 属性（默认: 1）
  remark: string,   // 备注（默认: ''）
  share: number,    // 分享标志（默认: 0）
  email?: string    // 邮箱（可选）
}
```

## 💡 使用示例

### 示例 1: 基本用法

```javascript
import { XbetClient } from './src/client/XbetClient.js';
import { config } from './src/config.js';

const client = new XbetClient(config);
await client.connect();

// 等待认证完成
await new Promise((resolve) => {
  client.once('authenticated', resolve);
});

// 分配账号
const result = await client.assignAccount(
  'account123',      // 账号ID
  'testuser',        // 用户名
  'testpass123'      // 密码
);

console.log('分配成功:', result);
```

### 示例 2: 包含可选参数

```javascript
const result = await client.assignAccount(
  'account456',
  'testuser2',
  'testpass456',
  {
    email: 'test@example.com',
    remark: '测试账号',
    attr: 1,
    share: 0
  },
  30000  // 30秒超时
);
```

### 示例 3: 批量分配

```javascript
const accounts = [
  { uid: 'acc001', usr: 'user001', pwd: 'pass001' },
  { uid: 'acc002', usr: 'user002', pwd: 'pass002' },
  { uid: 'acc003', usr: 'user003', pwd: 'pass003' },
];

for (const account of accounts) {
  try {
    const result = await client.assignAccount(
      account.uid,
      account.usr,
      account.pwd,
      { remark: '批量分配' }
    );
    console.log(`分配成功: ${account.uid}`, result);
  } catch (err) {
    console.error(`分配失败: ${account.uid}`, err.message);
  }
}
```

### 示例 4: 错误处理

```javascript
try {
  const result = await client.assignAccount(
    'account789',
    'testuser3',
    'testpass789'
  );
  console.log('分配成功:', result);
} catch (err) {
  if (err.message.includes('err_timeout')) {
    console.error('请求超时');
  } else if (err.message.includes('Opcode 0x4 failed')) {
    console.error('分配失败:', err.message);
  } else {
    console.error('未知错误:', err);
  }
}
```

## 🚀 运行示例

```bash
# 运行完整示例
node examples/assign-account.js
```

## 📌 注意事项

1. **认证要求**: 调用 `assignAccount` 前必须先完成认证
2. **超时设置**: 建议根据网络情况调整超时时间
3. **错误处理**: 务必捕获并处理可能的异常
4. **批量操作**: 批量分配时建议添加延迟，避免请求过快
5. **密码安全**: 密码应该在传输前进行加密（如果服务器要求）

## 🔍 调试

启用调试日志：

```javascript
client.on('raw', (message) => {
  console.log('[debug] 原始消息:', message);
});

client.on('error', (err) => {
  console.error('[debug] 错误:', err);
});
```

## 📚 相关文档

- [XbetClient API 文档](./XBET_CLIENT.md)
- [RPC 协议说明](./RPC_PROTOCOL.md)
- [错误码参考](./ERROR_CODES.md)


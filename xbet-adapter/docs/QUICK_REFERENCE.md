# 账号分配功能 - 快速参考

## 🚀 一分钟上手

```javascript
import { XbetClient } from './src/client/XbetClient.js';
import { config } from './src/config.js';

const client = new XbetClient(config);
await client.connect();

// 等待认证
await new Promise((resolve) => client.once('authenticated', resolve));

// 分配账号
const result = await client.assignAccount('acc123', 'user123', 'pass123');
console.log('成功:', result);
```

## 📋 方法签名

```javascript
client.assignAccount(accountId, username, password, options?, timeout?)
```

## 🔧 参数速查

| 参数 | 类型 | 必填 | 默认值 |
|------|------|------|--------|
| `accountId` | string | ✅ | - |
| `username` | string | ✅ | - |
| `password` | string | ✅ | - |
| `options.email` | string | ⭕ | - |
| `options.remark` | string | ⭕ | `''` |
| `options.attr` | number | ⭕ | `1` |
| `options.share` | number | ⭕ | `0` |
| `timeout` | number | ⭕ | `20000` |

## 💡 常用示例

### 基本分配
```javascript
await client.assignAccount('acc001', 'user001', 'pass001');
```

### 带邮箱和备注
```javascript
await client.assignAccount('acc002', 'user002', 'pass002', {
  email: 'user@example.com',
  remark: '测试账号'
});
```

### 自定义超时
```javascript
await client.assignAccount('acc003', 'user003', 'pass003', {}, 30000);
```

### 批量分配
```javascript
const accounts = [
  { uid: 'acc001', usr: 'user001', pwd: 'pass001' },
  { uid: 'acc002', usr: 'user002', pwd: 'pass002' },
];

for (const acc of accounts) {
  try {
    await client.assignAccount(acc.uid, acc.usr, acc.pwd);
    console.log(`✅ ${acc.uid}`);
  } catch (err) {
    console.error(`❌ ${acc.uid}:`, err.message);
  }
}
```

## ⚠️ 常见错误

### 1. 未认证
```
Error: RC4 尚未初始化
```
**解决**: 等待 `authenticated` 事件

### 2. 超时
```
Error: Opcode 0x4 failed: err_timeout
```
**解决**: 增加 timeout 参数

### 3. 参数错误
```
Error: Opcode 0x4 failed: invalid_params
```
**解决**: 检查参数格式

## 🔍 调试技巧

### 启用调试日志
```javascript
client.on('raw', (msg) => console.log('[raw]', msg));
client.on('error', (err) => console.error('[error]', err));
```

### 检查连接状态
```javascript
console.log('已认证:', client.authenticated);
console.log('RC4 就绪:', !!client.rc4);
```

## 📦 完整示例

```bash
# 运行示例
node examples/assign-account.js

# 运行测试
npm test test/assign-account.test.js
```

## 📚 详细文档

- [完整文档](./ASSIGN_ACCOUNT.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
- [主 README](../README.md)

## 🎯 Payload 结构

发送到服务器的数据：

```javascript
{
  uid: "account123",      // 账号ID
  usr: "testuser",        // 用户名
  pwd: "testpass123",     // 密码
  attr: 1,                // 属性
  remark: "",             // 备注
  share: 0,               // 分享标志
  email: "test@ex.com"    // 邮箱（可选）
}
```

## 🔐 RPC 详情

- **Opcode**: `0x4`
- **Method**: `ASSIGN_ACCOUNT`
- **Protocol**: DAG-CBOR over RC4-encrypted WebSocket
- **Timeout**: 20 秒（默认）

## ✅ 检查清单

使用前确认：

- [ ] 已安装依赖 (`npm install`)
- [ ] 已配置 `config.json`
- [ ] 已连接到服务器 (`client.connect()`)
- [ ] 已完成认证 (`authenticated` 事件)
- [ ] 参数格式正确
- [ ] 已添加错误处理

## 🆘 获取帮助

遇到问题？

1. 查看 [完整文档](./ASSIGN_ACCOUNT.md)
2. 查看 [示例代码](../examples/assign-account.js)
3. 启用调试日志
4. 检查网络连接
5. 验证配置文件

---

**提示**: 这是一个快速参考，详细信息请查看完整文档。


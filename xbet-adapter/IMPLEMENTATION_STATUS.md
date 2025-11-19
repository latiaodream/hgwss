# XBet 新协议实现状态

## ✅ 已完成的工作

### 1. 协议分析文档
- ✅ `PROTOCOL_ANALYSIS.md` - 完整的协议结构分析
  - class Ol 的实现细节
  - 握手流程 (ECDH + RC4)
  - RPC 请求/响应机制
  - 消息编码/解码流程
  
- ✅ `OPCODE_REFERENCE.md` - Opcode 完整参考
  - 所有已识别的 opcode 列表
  - 每个 opcode 的用途、payload 和返回值
  - 典型使用场景示例
  - 错误码列表

### 2. 代码修改

#### `src/client/XbetClient.js` - 已添加新协议支持

**新增功能**:
- ✅ `reqs` Map - 存储待响应的 RPC 请求
- ✅ `reqId` - 自增请求 ID (32 位循环)
- ✅ `request(opcode, payload, timeout)` - 核心 RPC 方法
- ✅ `#sendRequest(req)` - 发送 RPC 请求
- ✅ `#handleDecodedMessage(message)` - 处理 RPC 响应 `[reqId, error, result]`

**高级 API**:
- ✅ `getUserInfo()` - 获取用户信息 (Opcode 0x7)
- ✅ `getEvents(filter)` - 获取赛事列表 (Opcode 0xb)
- ✅ `poll(cursor)` - 长轮询 (Opcode 0x1)
- ✅ `getHistory(from, to)` - 获取历史数据 (Opcode 0x17)
- ✅ `heartbeat(payload)` - 发送心跳 (Opcode 0x5)

**兼容性**:
- ✅ 保留旧协议的 `typ: 0/1/2` 处理逻辑
- ✅ 向后兼容旧的 `send()` 和 `subscribe()` 方法

### 3. 测试脚本
- ✅ `test-new-protocol.js` - 新协议测试脚本
  - 测试所有 RPC 调用
  - 监听所有事件
  - 自动化测试流程

## ⏳ 待完成的工作

### 1. 修复 XbetClient.js 中的 `#handleDecodedMessage` 方法
**问题**: 由于文件编码问题，无法直接替换旧的消息处理逻辑

**解决方案**:
```bash
# 方案 A: 手动编辑
# 打开 src/client/XbetClient.js
# 找到 #handleDecodedMessage 方法 (约 259 行)
# 替换为 PROTOCOL_ANALYSIS.md 中的新实现

# 方案 B: 使用备份重新创建
mv src/client/XbetClient.js.backup src/client/XbetClient.js.old
# 然后手动合并新旧代码
```

**需要修改的部分** (259-303 行):
- 添加 RPC 响应处理: `if (Array.isArray(message) && message.length === 3)`
- 查找并 resolve 对应的请求
- 处理服务器推送消息
- 保留旧协议兼容性

### 2. 测试新协议
```bash
cd xbet-adapter
node test-new-protocol.js
```

**预期结果**:
- 握手成功
- 收到服务器确认 (可能是数字 0)
- 成功调用 getUserInfo (0x7)
- 成功调用 getEvents (0xb)
- 成功发送心跳 (0x5)
- 成功进行长轮询 (0x1)

**可能的问题**:
- 如果仍然收到 1005/1006 断开，说明 payload 结构不对
- 需要根据实际响应调整 opcode 和 payload

### 3. 完善 Opcode 映射
根据测试结果，补充以下信息:
- 每个 opcode 的确切 payload 结构
- 返回值的详细字段说明
- 错误码的完整列表

### 4. 更新 DataStore
`src/services/DataStore.js` 需要适配新的数据结构:
- 解析新协议的赛事数据
- 解析新协议的用户数据
- 解析新协议的历史数据

### 5. 更新 Dashboard
`src/server/DashboardServer.js` 和前端需要:
- 显示新协议的数据
- 添加 RPC 调用监控
- 显示请求/响应统计

## 📋 Opcode 快速参考

| Opcode | 十进制 | 用途 | 方法 |
|--------|--------|------|------|
| 0x1 | 1 | 长轮询 | `client.poll(cursor)` |
| 0x5 | 5 | 心跳/取消 | `client.heartbeat()` |
| 0x7 | 7 | 获取用户信息 | `client.getUserInfo()` |
| 0xb | 11 | 获取赛事列表 | `client.getEvents()` |
| 0x17 | 23 | 获取历史数据 | `client.getHistory(from, to)` |

## 🔧 调试技巧

### 1. 查看原始消息
```javascript
client.on('raw', (message) => {
  console.log('原始消息:', message);
});
```

### 2. 查看请求/响应
```javascript
client.on('requestSent', ({ reqId, opcode, payload }) => {
  console.log(`请求: ID=${reqId}, Opcode=0x${opcode.toString(16)}`);
});

client.on('requestSuccess', ({ reqId, result }) => {
  console.log(`成功: ID=${reqId}, Result=`, result);
});

client.on('requestError', ({ reqId, error }) => {
  console.error(`失败: ID=${reqId}, Error=`, error);
});
```

### 3. 查看服务器推送
```javascript
client.on('push', ({ reqId, error, result }) => {
  console.log('服务器推送:', { reqId, error, result });
});
```

## 📝 下一步行动计划

1. **立即执行**:
   - [ ] 修复 `XbetClient.js` 中的 `#handleDecodedMessage` 方法
   - [ ] 运行 `test-new-protocol.js` 测试
   - [ ] 根据测试结果调整代码

2. **短期目标** (1-2 天):
   - [ ] 完善所有 opcode 的 payload 结构
   - [ ] 实现长轮询的持续监听
   - [ ] 更新 DataStore 适配新数据

3. **中期目标** (3-7 天):
   - [ ] 更新 Dashboard 显示新数据
   - [ ] 添加 RPC 调用监控
   - [ ] 编写完整的测试用例

4. **长期目标** (1-2 周):
   - [ ] 完全移除旧协议代码
   - [ ] 优化性能和错误处理
   - [ ] 编写完整的文档

## 🐛 已知问题

1. **文件编码问题**: `XbetClient.js` 中的注释包含特殊字符，导致 str-replace-editor 无法正常工作
   - **解决方案**: 手动编辑或使用其他工具

2. **Opcode 不完整**: 目前只识别了 5 个 opcode，可能还有更多
   - **解决方案**: 继续分析前端 JS，补充完整列表

3. **Payload 结构未确认**: 大部分 opcode 的 payload 结构是推测的
   - **解决方案**: 通过实际测试确认

## 📚 参考资料

- `PROTOCOL_ANALYSIS.md` - 协议详细分析
- `OPCODE_REFERENCE.md` - Opcode 完整参考
- `har.md` - 浏览器抓包数据
- `BvC2gKzY6q.js` - 前端源代码 (混淆)


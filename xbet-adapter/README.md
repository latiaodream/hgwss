# XBet Adapter

🚀 轻量级 XBet WebSocket 适配器服务

## 📋 功能特性

- ✅ 连接 XBet 平台获取实时赛事数据
- ✅ 支持订阅：赛事 (matches)、赔率 (odds)、实时比分 (live)
- ✅ **账号分配功能** (assignAccount) - 支持将账号分配给用户
- ✅ 提供内部 WebSocket 服务供其他系统订阅
- ✅ 提供 Dashboard 监控面板查看实时数据
- ✅ 可选 Redis 存储支持
- ✅ 自动重连和心跳保活
- ✅ PM2 进程管理

## 🔧 技术栈

- Node.js 18+ (ES Module)
- WebSocket (ws)
- Redis (可选)
- PM2 进程管理

## 📦 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置服务

编辑 `config.json`：

```json
{
  "endpoint": "wss://gw.xbetbot.com/?lang=zh-CN",
  "token": "你的Token",
  "username": "你的用户名",
  "password": "你的密码",
  "email": "可选：邮箱",
  "code": "可选：验证码",
  "deviceIdFile": ".xbet-device-id",
  "userAgent": "Mozilla/5.0 ...",
  "subscriptions": ["matches", "odds", "live"],
  "heartbeatIntervalMs": 30000,
  "origin": "https://b.xbetbot.com",
  "wsHeaders": {
    "user-agent": "Mozilla/5.0 ...",
    "accept-language": "en,en-US;q=0.9",
    "cache-control": "no-cache",
    "pragma": "no-cache"
  },
  "redis": {
    "enabled": false
  },
  "internalWs": {
    "enabled": true,
    "port": 18081
  },
  "dashboard": {
    "enabled": true,
    "port": 18082
  }
}
```

> ⚠️ 如果需要模拟浏览器环境，请将浏览器抓包到的 `Origin` 及其他 Header 填入 `origin`/`wsHeaders`，否则服务器可能在认证后立即断开。
>
> 💾 `deviceIdFile` 会在首次运行时生成 `.xbet-device-id` 文件并复用其中的设备 ID，与官方页面的 `localStorage` 行为保持一致。如需重新生成，删除该文件即可。

### 3. 启动服务

**开发模式：**
```bash
npm run dev
```

**生产模式：**
```bash
npm start
```

**使用 PM2：**
```bash
pm2 start ecosystem.config.cjs
```

## 🚀 宝塔部署

详细的宝塔部署指南请查看：[BAOTA-DEPLOY.md](./BAOTA-DEPLOY.md)

**一键部署：**
```bash
bash deploy-baota.sh
```

## 🔌 访问地址

- **Dashboard**: http://localhost:18082
- **WebSocket**: ws://localhost:18081

## 📊 WebSocket 客户端示例

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:18081');

ws.on('open', () => {
  console.log('已连接');
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('收到数据:', message);
});
```

## 🎯 账号分配功能

XbetClient 现在支持账号分配功能，可以将账号分配给用户。

### 快速示例

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
  'testpass123',     // 密码
  {
    email: 'test@example.com',  // 可选：邮箱
    remark: '测试账号'           // 可选：备注
  }
);

console.log('分配成功:', result);
```

### 运行示例

```bash
# 运行账号分配示例
node examples/assign-account.js
```

### 详细文档

查看完整的账号分配功能文档：[docs/ASSIGN_ACCOUNT.md](./docs/ASSIGN_ACCOUNT.md)

## 🛠️ 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs xbet-adapter

# 重启服务
pm2 restart xbet-adapter

# 停止服务
pm2 stop xbet-adapter
```

## 📝 配置说明

| 配置项 | 说明 | 必填 |
|--------|------|------|
| endpoint | XBet WebSocket 地址 | ✅ |
| token | API Token | ✅ |
| username | 用户名 | ✅ |
| password | 密码 | ✅ |
| origin | WebSocket 握手使用的 Origin（如 `https://b.xbetbot.com`） | ⭕ |
| wsHeaders | 额外的握手 Header（可复刻浏览器信息） | ⭕ |
| subscriptions | 订阅类型 | ✅ |
| heartbeatIntervalMs | 心跳间隔(毫秒) | ⭕ |
| redis.enabled | 启用 Redis | ⭕ |
| internalWs.enabled | 启用内部 WebSocket | ⭕ |
| dashboard.enabled | 启用 Dashboard | ⭕ |

## 📄 许可证

ISC

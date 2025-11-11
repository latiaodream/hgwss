# 外汇交易平台开发文档

## 1. 项目概述

### 1.1 项目背景
开发一个类似 my.xm.com 的综合性外汇交易平台，为交易者提供实时行情、交易执行、账户管理等一站式服务。

### 1.2 项目目标
- 提供实时外汇行情数据
- 支持多种订单类型（市价单、挂单、止损止盈）
- 完整的账户资金管理
- 交易历史记录和报表分析
- 多设备支持（Web、移动端）
- 高可用性和低延迟

### 1.3 目标用户
- 个人外汇交易者
- 机构投资者
- 量化交易团队

## 2. 功能需求

### 2.1 用户管理模块

#### 2.1.1 用户注册
- 邮箱/手机号注册
- 实名认证（KYC）
- 邮箱验证
- 密码强度要求
- 用户协议和风险提示

#### 2.1.2 用户登录
- 邮箱/手机号/用户名登录
- 密码登录
- 双因素认证（2FA）
- 记住登录状态
- 登录日志记录

#### 2.1.3 账户管理
- 个人信息管理
- 密码修改
- 安全设置（2FA、API密钥）
- 账户状态查询
- 账户等级/会员体系

### 2.2 交易功能模块

#### 2.2.1 行情展示
- **实时报价**
  - 货币对列表（主要货币对、交叉货币对、稀有货币对）
  - 买入价/卖出价（Bid/Ask）
  - 点差显示
  - 涨跌幅百分比
  - 24小时最高/最低价
  
- **图表分析**
  - K线图（1分钟、5分钟、15分钟、1小时、4小时、日线、周线、月线）
  - 技术指标（MA、MACD、RSI、布林带等）
  - 画线工具
  - 多图表对比
  
- **市场深度**
  - 订单簿（Order Book）
  - 市场深度可视化

#### 2.2.2 交易执行
- **订单类型**
  - 市价单（Market Order）
  - 限价单（Limit Order）
  - 止损单（Stop Loss）
  - 止盈单（Take Profit）
  - OCO订单（One-Cancels-Other）
  
- **交易操作**
  - 开仓（买入/卖出）
  - 平仓
  - 修改订单
  - 取消订单
  - 批量操作
  
- **交易参数**
  - 手数（Lot Size）
  - 杠杆倍数（1:1 到 1:1000）
  - 止损点数
  - 止盈点数
  - 交易注释

#### 2.2.3 持仓管理
- 当前持仓列表
- 持仓盈亏（浮动盈亏、已实现盈亏）
- 持仓详情（开仓价、当前价、盈亏、保证金）
- 持仓修改（修改止损止盈）
- 部分平仓

#### 2.2.4 订单历史
- 历史订单查询
- 订单详情
- 订单导出（CSV、Excel）
- 筛选和排序（按时间、货币对、盈亏等）

### 2.3 资金管理模块

#### 2.3.1 账户资金
- 账户余额
- 可用保证金
- 已用保证金
- 净值
- 保证金比例
- 账户权益曲线

#### 2.3.2 充值
- 多种充值方式（银行卡、电子钱包、加密货币）
- 充值记录
- 充值状态查询
- 充值限额管理

#### 2.3.3 提现
- 提现申请
- 提现方式选择
- 提现记录
- 提现审核流程
- 提现限额管理

#### 2.3.4 资金流水
- 交易流水
- 充值提现流水
- 手续费明细
- 利息/库存费记录
- 资金报表

### 2.4 风险管理模块

#### 2.4.1 风险控制
- 保证金比例监控
- 强制平仓（Margin Call）
- 风险提示
- 最大持仓限制
- 单笔交易限额

#### 2.4.2 止损止盈
- 自动止损止盈
- 追踪止损（Trailing Stop）
- 部分平仓止损

### 2.5 报表与分析模块

#### 2.5.1 交易报表
- 日/周/月/年报表
- 盈亏统计
- 胜率统计
- 平均盈亏比
- 最大回撤

#### 2.5.2 账户分析
- 账户净值曲线
- 资金曲线
- 持仓分析
- 交易时间分布
- 货币对偏好分析

#### 2.5.3 市场分析
- 市场新闻
- 经济日历
- 分析师观点
- 市场情绪指标

### 2.6 其他功能

#### 2.6.1 通知系统
- 订单执行通知
- 风险预警通知
- 系统公告
- 邮件/短信通知

#### 2.6.2 多语言支持
- 中文、英文、日文等多语言
- 时区设置

#### 2.6.3 移动端
- 响应式设计
- 移动App（iOS/Android）
- 推送通知

## 3. 技术架构

### 3.1 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                     前端层                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Web端    │  │ 移动端   │  │ 管理后台 │            │
│  │ React/Vue│  │ React    │  │ React    │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS/WSS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    API网关层                              │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Nginx / Kong / API Gateway                     │  │
│  │  - 负载均衡                                      │  │
│  │  - 限流                                          │  │
│  │  - 认证                                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    应用服务层                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 用户服务 │  │ 交易服务 │  │ 行情服务 │            │
│  │ User    │  │ Trading  │  │ Market   │            │
│  │ Service │  │ Service  │  │ Service  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 资金服务 │  │ 通知服务 │  │ 报表服务 │            │
│  │ Payment │  │ Notify   │  │ Report   │            │
│  │ Service │  │ Service  │  │ Service  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    数据层                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ PostgreSQL│ │ Redis    │  │ MongoDB  │            │
│  │ 主数据库  │ │ 缓存/队列 │ │ 日志/分析 │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│  ┌──────────┐  ┌──────────┐                          │
│  │ InfluxDB │  │ RabbitMQ │                          │
│  │ 时序数据  │  │ 消息队列 │                          │
│  └──────────┘  └──────────┘                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   外部服务层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │ 行情数据 │  │ 支付网关 │  │ 短信/邮件│            │
│  │ Provider│  │ Payment  │  │ Service  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 3.2 技术选型

#### 3.2.1 前端技术栈
- **框架**: React 18+ / Vue 3+
- **状态管理**: Redux / Zustand / Pinia
- **UI组件库**: Ant Design / Element Plus / Material-UI
- **图表库**: TradingView Charting Library / ECharts / Lightweight Charts
- **WebSocket**: Socket.io-client / ws
- **构建工具**: Vite / Webpack
- **移动端**: React Native / Flutter

#### 3.2.2 后端技术栈
- **语言**: Node.js (TypeScript) / Go / Java
- **框架**: 
  - Node.js: NestJS / Express
  - Go: Gin / Echo
  - Java: Spring Boot
- **API**: RESTful API + WebSocket
- **认证**: JWT / OAuth 2.0
- **消息队列**: RabbitMQ / Kafka
- **任务调度**: Bull / Celery

#### 3.2.3 数据库
- **关系型数据库**: PostgreSQL (主数据库)
- **缓存**: Redis (缓存、会话、限流)
- **时序数据库**: InfluxDB (行情数据、指标数据)
- **文档数据库**: MongoDB (日志、分析数据)
- **搜索引擎**: Elasticsearch (日志搜索)

#### 3.2.4 基础设施
- **容器化**: Docker / Kubernetes
- **反向代理**: Nginx
- **监控**: Prometheus + Grafana
- **日志**: ELK Stack (Elasticsearch + Logstash + Kibana)
- **CI/CD**: Jenkins / GitLab CI / GitHub Actions

### 3.3 核心服务设计

#### 3.3.1 用户服务 (User Service)
- 用户注册/登录
- 用户信息管理
- 权限管理
- 会话管理

#### 3.3.2 交易服务 (Trading Service)
- 订单处理
- 持仓管理
- 风险控制
- 交易执行引擎

#### 3.3.3 行情服务 (Market Service)
- 实时行情推送
- 历史数据查询
- K线数据生成
- 市场深度数据

#### 3.3.4 资金服务 (Payment Service)
- 账户余额管理
- 充值处理
- 提现处理
- 资金流水记录

#### 3.3.5 通知服务 (Notification Service)
- 站内通知
- 邮件通知
- 短信通知
- 推送通知

#### 3.3.6 报表服务 (Report Service)
- 交易报表生成
- 数据分析
- 统计计算

## 4. 数据库设计

### 4.1 核心表结构

#### 4.1.1 用户表 (users)
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, frozen, closed
    kyc_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
    kyc_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_status ON users(status);
```

#### 4.1.2 账户表 (accounts)
```sql
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_type VARCHAR(20) DEFAULT 'standard', -- standard, premium, vip
    balance DECIMAL(20, 2) DEFAULT 0,
    equity DECIMAL(20, 2) DEFAULT 0,
    margin DECIMAL(20, 2) DEFAULT 0,
    free_margin DECIMAL(20, 2) DEFAULT 0,
    margin_level DECIMAL(10, 2),
    leverage INTEGER DEFAULT 100,
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_account_number ON accounts(account_number);
```

#### 4.1.3 订单表 (orders)
```sql
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    symbol VARCHAR(20) NOT NULL, -- EURUSD, GBPUSD, etc.
    order_type VARCHAR(20) NOT NULL, -- market, limit, stop, stop_limit
    direction VARCHAR(10) NOT NULL, -- buy, sell
    volume DECIMAL(10, 2) NOT NULL, -- lot size
    open_price DECIMAL(20, 5),
    close_price DECIMAL(20, 5),
    stop_loss DECIMAL(20, 5),
    take_profit DECIMAL(20, 5),
    current_price DECIMAL(20, 5),
    swap DECIMAL(20, 2) DEFAULT 0, -- 库存费
    commission DECIMAL(20, 2) DEFAULT 0,
    profit DECIMAL(20, 2) DEFAULT 0,
    status VARCHAR(20) NOT NULL, -- pending, open, closed, cancelled
    open_time TIMESTAMP,
    close_time TIMESTAMP,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_account_id ON orders(account_id);
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_open_time ON orders(open_time);
CREATE INDEX idx_orders_order_id ON orders(order_id);
```

#### 4.1.4 持仓表 (positions)
```sql
CREATE TABLE positions (
    id BIGSERIAL PRIMARY KEY,
    position_id VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    order_id BIGINT NOT NULL REFERENCES orders(id),
    symbol VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- buy, sell
    volume DECIMAL(10, 2) NOT NULL,
    open_price DECIMAL(20, 5) NOT NULL,
    current_price DECIMAL(20, 5),
    stop_loss DECIMAL(20, 5),
    take_profit DECIMAL(20, 5),
    swap DECIMAL(20, 2) DEFAULT 0,
    profit DECIMAL(20, 2) DEFAULT 0,
    margin DECIMAL(20, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'open', -- open, closed
    open_time TIMESTAMP NOT NULL,
    close_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_positions_user_id ON positions(user_id);
CREATE INDEX idx_positions_account_id ON positions(account_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_positions_status ON positions(status);
```

#### 4.1.5 资金流水表 (transactions)
```sql
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    type VARCHAR(20) NOT NULL, -- deposit, withdraw, trade, commission, swap, bonus
    amount DECIMAL(20, 2) NOT NULL,
    balance_before DECIMAL(20, 2),
    balance_after DECIMAL(20, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
    related_order_id BIGINT REFERENCES orders(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
```

#### 4.1.6 充值表 (deposits)
```sql
CREATE TABLE deposits (
    id BIGSERIAL PRIMARY KEY,
    deposit_id VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    amount DECIMAL(20, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50), -- bank_transfer, credit_card, crypto, etc.
    payment_provider VARCHAR(50),
    transaction_hash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deposits_user_id ON deposits(user_id);
CREATE INDEX idx_deposits_status ON deposits(status);
```

#### 4.1.7 提现表 (withdrawals)
```sql
CREATE TABLE withdrawals (
    id BIGSERIAL PRIMARY KEY,
    withdrawal_id VARCHAR(50) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    account_id BIGINT NOT NULL REFERENCES accounts(id),
    amount DECIMAL(20, 2) NOT NULL,
    fee DECIMAL(20, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_account VARCHAR(255), -- 收款账户信息
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, rejected, cancelled
    reject_reason TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX idx_withdrawals_status ON withdrawals(status);
```

#### 4.1.8 行情数据表 (market_data)
```sql
-- 使用时序数据库 InfluxDB 存储行情数据
-- 或使用 PostgreSQL 的分区表

CREATE TABLE market_data (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    bid DECIMAL(20, 5) NOT NULL,
    ask DECIMAL(20, 5) NOT NULL,
    spread DECIMAL(10, 5),
    high DECIMAL(20, 5),
    low DECIMAL(20, 5),
    volume BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_market_data_symbol_time ON market_data(symbol, timestamp);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp);

-- 按月分区
CREATE TABLE market_data_2024_01 PARTITION OF market_data
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

#### 4.1.9 K线数据表 (candles)
```sql
CREATE TABLE candles (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL, -- M1, M5, M15, H1, H4, D1, W1, MN1
    open_time TIMESTAMP NOT NULL,
    open_price DECIMAL(20, 5) NOT NULL,
    high_price DECIMAL(20, 5) NOT NULL,
    low_price DECIMAL(20, 5) NOT NULL,
    close_price DECIMAL(20, 5) NOT NULL,
    volume BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, timeframe, open_time)
);

CREATE INDEX idx_candles_symbol_timeframe_time ON candles(symbol, timeframe, open_time);
```

### 4.2 关系图

```
users (1) ──< (N) accounts
accounts (1) ──< (N) orders
accounts (1) ──< (N) positions
accounts (1) ──< (N) transactions
accounts (1) ──< (N) deposits
accounts (1) ──< (N) withdrawals
orders (1) ──< (1) positions
```

## 5. API 设计

### 5.1 认证 API

#### 5.1.1 用户注册
```
POST /api/v1/auth/register
Request:
{
  "username": "string",
  "email": "string",
  "password": "string",
  "phone": "string",
  "referral_code": "string" // 可选
}

Response:
{
  "code": 200,
  "message": "注册成功",
  "data": {
    "user_id": 123,
    "email": "user@example.com"
  }
}
```

#### 5.1.2 用户登录
```
POST /api/v1/auth/login
Request:
{
  "email": "string",
  "password": "string",
  "two_factor_code": "string" // 可选，2FA验证码
}

Response:
{
  "code": 200,
  "message": "登录成功",
  "data": {
    "token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600,
    "user": {
      "id": 123,
      "username": "string",
      "email": "string"
    }
  }
}
```

#### 5.1.3 刷新Token
```
POST /api/v1/auth/refresh
Request:
{
  "refresh_token": "string"
}

Response:
{
  "code": 200,
  "data": {
    "token": "new_jwt_token",
    "expires_in": 3600
  }
}
```

### 5.2 账户 API

#### 5.2.1 获取账户信息
```
GET /api/v1/account/info
Headers:
  Authorization: Bearer {token}

Response:
{
  "code": 200,
  "data": {
    "account_id": 123,
    "account_number": "12345678",
    "balance": 10000.00,
    "equity": 10050.00,
    "margin": 50.00,
    "free_margin": 9950.00,
    "margin_level": 20100.00,
    "leverage": 100,
    "currency": "USD"
  }
}
```

#### 5.2.2 获取持仓列表
```
GET /api/v1/account/positions
Headers:
  Authorization: Bearer {token}
Query:
  symbol: string (可选)
  status: string (可选，open/closed)

Response:
{
  "code": 200,
  "data": {
    "positions": [
      {
        "position_id": "12345",
        "symbol": "EURUSD",
        "direction": "buy",
        "volume": 0.1,
        "open_price": 1.08500,
        "current_price": 1.08600,
        "profit": 10.00,
        "margin": 108.50,
        "open_time": "2024-01-01T10:00:00Z"
      }
    ],
    "total": 1
  }
}
```

### 5.3 交易 API

#### 5.3.1 下单
```
POST /api/v1/trading/order
Headers:
  Authorization: Bearer {token}

Request:
{
  "symbol": "EURUSD",
  "order_type": "market", // market, limit, stop
  "direction": "buy", // buy, sell
  "volume": 0.1,
  "stop_loss": 1.08000, // 可选
  "take_profit": 1.09000, // 可选
  "comment": "string" // 可选
}

Response:
{
  "code": 200,
  "message": "订单已提交",
  "data": {
    "order_id": "12345",
    "status": "pending"
  }
}
```

#### 5.3.2 修改订单
```
PUT /api/v1/trading/order/{order_id}
Headers:
  Authorization: Bearer {token}

Request:
{
  "stop_loss": 1.08100, // 可选
  "take_profit": 1.09100 // 可选
}

Response:
{
  "code": 200,
  "message": "订单已修改",
  "data": {
    "order_id": "12345"
  }
}
```

#### 5.3.3 平仓
```
POST /api/v1/trading/close/{position_id}
Headers:
  Authorization: Bearer {token}

Request:
{
  "volume": 0.1 // 可选，不传则全部平仓
}

Response:
{
  "code": 200,
  "message": "平仓成功",
  "data": {
    "position_id": "12345",
    "close_price": 1.08600,
    "profit": 10.00
  }
}
```

#### 5.3.4 取消订单
```
DELETE /api/v1/trading/order/{order_id}
Headers:
  Authorization: Bearer {token}

Response:
{
  "code": 200,
  "message": "订单已取消"
}
```

#### 5.3.5 获取订单历史
```
GET /api/v1/trading/orders/history
Headers:
  Authorization: Bearer {token}
Query:
  symbol: string (可选)
  status: string (可选)
  start_date: string (可选)
  end_date: string (可选)
  page: integer (默认1)
  limit: integer (默认20)

Response:
{
  "code": 200,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

### 5.4 行情 API

#### 5.4.1 获取货币对列表
```
GET /api/v1/market/symbols
Response:
{
  "code": 200,
  "data": {
    "symbols": [
      {
        "symbol": "EURUSD",
        "name": "Euro/US Dollar",
        "category": "major",
        "digits": 5,
        "point": 0.00001,
        "min_lot": 0.01,
        "max_lot": 100,
        "lot_step": 0.01,
        "margin_required": 1000
      }
    ]
  }
}
```

#### 5.4.2 获取实时报价
```
GET /api/v1/market/quote/{symbol}
Response:
{
  "code": 200,
  "data": {
    "symbol": "EURUSD",
    "bid": 1.08500,
    "ask": 1.08505,
    "spread": 0.5,
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

#### 5.4.3 获取K线数据
```
GET /api/v1/market/candles/{symbol}
Query:
  timeframe: string (M1, M5, M15, H1, H4, D1, W1, MN1)
  start_time: string (ISO 8601)
  end_time: string (ISO 8601)
  limit: integer (默认1000)

Response:
{
  "code": 200,
  "data": {
    "symbol": "EURUSD",
    "timeframe": "H1",
    "candles": [
      {
        "open_time": "2024-01-01T10:00:00Z",
        "open": 1.08500,
        "high": 1.08600,
        "low": 1.08400,
        "close": 1.08550,
        "volume": 1000
      }
    ]
  }
}
```

### 5.5 WebSocket API

#### 5.5.1 连接
```
WSS /ws/v1/market
```

#### 5.5.2 订阅行情
```javascript
// 发送订阅消息
{
  "action": "subscribe",
  "channels": ["quote.EURUSD", "quote.GBPUSD"]
}

// 接收行情数据
{
  "channel": "quote.EURUSD",
  "data": {
    "symbol": "EURUSD",
    "bid": 1.08500,
    "ask": 1.08505,
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

#### 5.5.3 订阅账户更新
```javascript
// 发送订阅消息
{
  "action": "subscribe",
  "channels": ["account.update"]
}

// 接收账户更新
{
  "channel": "account.update",
  "data": {
    "balance": 10000.00,
    "equity": 10050.00,
    "margin": 50.00
  }
}
```

#### 5.5.4 订阅持仓更新
```javascript
// 发送订阅消息
{
  "action": "subscribe",
  "channels": ["position.update"]
}

// 接收持仓更新
{
  "channel": "position.update",
  "data": {
    "position_id": "12345",
    "current_price": 1.08600,
    "profit": 10.00
  }
}
```

### 5.6 资金 API

#### 5.6.1 充值
```
POST /api/v1/payment/deposit
Headers:
  Authorization: Bearer {token}

Request:
{
  "amount": 1000.00,
  "currency": "USD",
  "payment_method": "bank_transfer"
}

Response:
{
  "code": 200,
  "data": {
    "deposit_id": "12345",
    "amount": 1000.00,
    "status": "pending",
    "payment_info": {
      "bank_name": "string",
      "account_number": "string"
    }
  }
}
```

#### 5.6.2 提现
```
POST /api/v1/payment/withdraw
Headers:
  Authorization: Bearer {token}

Request:
{
  "amount": 500.00,
  "currency": "USD",
  "payment_method": "bank_transfer",
  "payment_account": "string"
}

Response:
{
  "code": 200,
  "data": {
    "withdrawal_id": "12345",
    "amount": 500.00,
    "fee": 5.00,
    "status": "pending"
  }
}
```

#### 5.6.3 获取资金流水
```
GET /api/v1/payment/transactions
Headers:
  Authorization: Bearer {token}
Query:
  type: string (可选)
  start_date: string (可选)
  end_date: string (可选)
  page: integer (默认1)
  limit: integer (默认20)

Response:
{
  "code": 200,
  "data": {
    "transactions": [...],
    "pagination": {...}
  }
}
```

## 6. 安全性设计

### 6.1 数据加密
- **传输加密**: 全站HTTPS/WSS
- **存储加密**: 密码使用bcrypt/argon2哈希，敏感数据AES加密
- **数据库加密**: 敏感字段加密存储

### 6.2 认证与授权
- **JWT Token**: 访问令牌和刷新令牌机制
- **双因素认证**: TOTP (Time-based One-Time Password)
- **API密钥**: 支持API交易，密钥权限控制
- **权限控制**: RBAC (Role-Based Access Control)

### 6.3 防护措施
- **SQL注入防护**: 参数化查询，ORM使用
- **XSS防护**: 输入验证和输出转义
- **CSRF防护**: CSRF Token验证
- **DDoS防护**: 限流、CDN、WAF
- **暴力破解防护**: 登录失败次数限制，IP封禁

### 6.4 合规性
- **KYC/AML**: 实名认证，反洗钱检查
- **数据隐私**: GDPR合规，用户数据保护
- **审计日志**: 关键操作记录
- **监管报告**: 交易报告生成

## 7. 性能优化

### 7.1 数据库优化
- 索引优化
- 查询优化
- 读写分离
- 分库分表（按用户ID或时间）
- 缓存热点数据

### 7.2 缓存策略
- Redis缓存用户信息、账户信息
- 行情数据缓存
- API响应缓存
- CDN静态资源缓存

### 7.3 消息队列
- 异步处理订单
- 异步发送通知
- 异步生成报表
- 削峰填谷

### 7.4 实时数据
- WebSocket连接池管理
- 行情数据压缩
- 增量更新
- 多级缓存

## 8. 监控与运维

### 8.1 监控指标
- **系统指标**: CPU、内存、磁盘、网络
- **应用指标**: QPS、响应时间、错误率
- **业务指标**: 订单量、交易量、用户数
- **行情指标**: 延迟、数据完整性

### 8.2 日志管理
- 结构化日志
- 日志分级（DEBUG、INFO、WARN、ERROR）
- 日志聚合和分析
- 告警机制

### 8.3 告警
- 系统异常告警
- 业务异常告警
- 行情数据异常告警
- 安全事件告警

## 9. 开发计划

### 9.1 第一阶段：基础功能（2-3个月）
- [ ] 用户注册/登录系统
- [ ] 账户管理基础功能
- [ ] 基础交易功能（市价单）
- [ ] 简单行情展示
- [ ] 基础资金管理

### 9.2 第二阶段：核心功能（2-3个月）
- [ ] 完整交易功能（挂单、止损止盈）
- [ ] 实时行情推送
- [ ] K线图表
- [ ] 持仓管理
- [ ] 订单历史

### 9.3 第三阶段：高级功能（2-3个月）
- [ ] 技术指标
- [ ] 交易报表和分析
- [ ] 移动端App
- [ ] 多语言支持
- [ ] 高级风险管理

### 9.4 第四阶段：优化与扩展（持续）
- [ ] 性能优化
- [ ] 安全加固
- [ ] 新功能开发
- [ ] 用户体验优化

## 10. 测试计划

### 10.1 单元测试
- 业务逻辑测试
- 工具函数测试
- 覆盖率目标：80%+

### 10.2 集成测试
- API接口测试
- 数据库操作测试
- 第三方服务集成测试

### 10.3 性能测试
- 压力测试
- 负载测试
- 并发测试
- 延迟测试

### 10.4 安全测试
- 渗透测试
- 漏洞扫描
- 安全审计

## 11. 部署方案

### 11.1 环境要求
- **生产环境**: 
  - 服务器：4核8G以上
  - 数据库：主从复制，SSD存储
  - 缓存：Redis集群
  - 负载均衡：Nginx/HAProxy

### 11.2 部署流程
1. 代码构建和打包
2. 数据库迁移
3. 服务部署
4. 健康检查
5. 灰度发布

### 11.3 备份策略
- 数据库每日全量备份
- 增量备份（每小时）
- 备份保留30天
- 异地备份

## 12. 参考资料

### 12.1 行业标准
- MT4/MT5协议参考
- FIX协议（金融信息交换协议）
- OANDA API文档
- Interactive Brokers API文档

### 12.2 技术文档
- TradingView Charting Library
- WebSocket协议规范
- JWT认证规范
- RESTful API设计规范

## 13. 注意事项

1. **监管合规**: 确保符合当地金融监管要求
2. **数据安全**: 用户资金和交易数据安全是重中之重
3. **系统稳定性**: 交易系统需要7x24小时稳定运行
4. **低延迟**: 行情和交易执行需要极低延迟
5. **可扩展性**: 系统需要支持未来业务扩展
6. **用户体验**: 界面友好，操作便捷
7. **风险控制**: 完善的保证金和风险控制机制

---

**文档版本**: v1.0  
**最后更新**: 2024-01-01  
**维护者**: 开发团队


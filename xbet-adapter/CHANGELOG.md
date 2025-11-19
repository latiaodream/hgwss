# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **账号分配功能** (`assignAccount` method)
  - 新增 `ASSIGN_ACCOUNT` opcode (0x4)
  - 支持将账号分配给用户
  - 支持可选参数：email, remark, attr, share
  - 支持自定义超时时间
  - 完整的错误处理和异常抛出

### Documentation
- 新增 `docs/ASSIGN_ACCOUNT.md` - 账号分配功能详细文档
- 新增 `docs/IMPLEMENTATION_SUMMARY.md` - 实现总结文档
- 新增 `docs/QUICK_REFERENCE.md` - 快速参考指南
- 更新 `README.md` - 添加账号分配功能说明

### Examples
- 新增 `examples/assign-account.js` - 账号分配功能示例
  - 基本用法示例
  - 完整参数示例
  - 批量分配示例
  - 错误处理示例

### Tests
- 新增 `test/assign-account.test.js` - 单元测试
  - 基本 payload 构造测试
  - 可选参数处理测试
  - 默认值测试
  - 错误传递测试

### Changed
- 更新 `src/client/XbetClient.js`
  - 添加 `ASSIGN_ACCOUNT` 到 OPCODES 常量
  - 实现 `assignAccount` 方法

## [1.0.0] - 2024-01-XX

### Added
- 初始版本发布
- WebSocket 连接和认证
- 实时数据订阅（matches, odds, live）
- 内部 WebSocket 服务
- Dashboard 监控面板
- Redis 存储支持
- 自动重连和心跳保活
- PM2 进程管理
- 宝塔部署支持

### Features
- P256 ECDH 密钥交换
- RC4 加密通信
- DAG-CBOR 编解码
- RPC 请求/响应机制
- 轮询更新机制
- 数据存储和快照

### Documentation
- README.md - 项目说明
- BAOTA-DEPLOY.md - 宝塔部署指南
- 配置文件示例

---

## 版本说明

### 版本号规则

- **主版本号 (Major)**: 不兼容的 API 变更
- **次版本号 (Minor)**: 向下兼容的功能新增
- **修订号 (Patch)**: 向下兼容的问题修正

### 变更类型

- **Added**: 新增功能
- **Changed**: 功能变更
- **Deprecated**: 即将废弃的功能
- **Removed**: 已移除的功能
- **Fixed**: 问题修复
- **Security**: 安全性修复

---

## 贡献指南

如果你想为这个项目做出贡献，请：

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

---

## 许可证

ISC License - 详见 LICENSE 文件


# 宝塔面板更新指南 (Baota Update Guide)

本指南将帮助您在宝塔面板上更新 `crown-scraper-service` 服务。

## 前置条件

*   您已经登录到宝塔面板。
*   您已经配置好了 Git（或者您可以手动上传代码）。
*   服务已经通过 PM2 运行。

## 更新步骤

### 1. 打开终端

在宝塔面板左侧菜单中点击“终端”，输入服务器密码登录。

### 2. 进入项目目录

```bash
cd /www/wwwroot/您的项目目录/crown-scraper-service
# 例如：
# cd /www/wwwroot/bclogin-system/crown-scraper-service
```

### 3. 拉取最新代码

如果您使用了 Git：

```bash
git pull
```

如果您是手动上传，请确保覆盖了旧文件（特别是 `src` 目录）。

### 4. 安装依赖（可选）

如果 `package.json` 有变动，建议运行：

```bash
npm install
```

### 5. 重新编译

由于项目使用 TypeScript，更新代码后必须重新编译：

```bash
npm run build
```

> **注意**：如果编译报错，请检查是否安装了 TypeScript。如果没有，可以尝试运行 `npm install typescript -g`。

### 6. 重启服务

使用 PM2 重启服务以应用更改：

```bash
npm run pm2:restart
# 或者直接使用 pm2 命令
# pm2 restart crown-scraper
```

### 7. 验证更新

查看日志确保服务正常运行且没有报错：

```bash
npm run pm2:logs
# 或者
# pm2 logs crown-scraper
```

## 常见问题

### Q: 编译时提示 `tsc: command not found`
A: 您需要全局安装 TypeScript：
```bash
npm install -g typescript
```

### Q: 更新后服务无法启动
A: 检查日志 `pm2 logs crown-scraper`，通常是配置问题或代码错误。如果是数据库连接失败，请检查 `.env` 文件配置。

### Q: 如何回滚？
A: 如果使用 Git，可以回退到上一个版本：
```bash
git reset --hard HEAD^
npm run build
npm run pm2:restart
```

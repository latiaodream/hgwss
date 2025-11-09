# 服务器更新指南

## ❌ 问题：编译错误

你在服务器上遇到了 TypeScript 编译错误：

```
error TS18048: 'markets.full.handicapLines' is possibly 'undefined'.
```

这是因为服务器上的代码是旧版本，GitHub 上的代码已经修复了这个问题。

## ✅ 解决方法（三选一）

### 方法一：拉取最新代码（推荐）⭐

这是最简单的方法，直接从 GitHub 拉取最新代码：

```bash
cd /www/wwwroot/wss.aibcbot.top

# 拉取最新代码
git pull origin main

# 重新编译和部署
bash fix-and-deploy.sh
```

**如果遇到 "error: Your local changes would be overwritten by merge"：**

```bash
# 保存本地修改
git stash

# 拉取最新代码
git pull origin main

# 恢复本地修改（如果需要）
git stash pop

# 重新编译和部署
bash fix-and-deploy.sh
```

### 方法二：删除重新克隆

如果 git pull 有问题，可以删除重新克隆：

```bash
cd /www/wwwroot

# 备份 .env 文件（重要！）
cp wss.aibcbot.top/.env /tmp/.env.backup

# 删除旧目录
rm -rf wss.aibcbot.top

# 重新克隆
git clone https://github.com/latiaodream/hgwss.git wss.aibcbot.top

# 恢复 .env 文件
cp /tmp/.env.backup wss.aibcbot.top/.env

# 进入目录
cd wss.aibcbot.top

# 一键部署
bash baota-deploy.sh
```

### 方法三：手动修复代码

如果无法访问 GitHub，可以手动修复代码：

```bash
cd /www/wwwroot/wss.aibcbot.top

# 编辑文件
nano src/scrapers/CrownScraper.ts
```

找到以下 4 行并修改：

**第 375 行：**
```typescript
// 修改前
if (hdp !== null) {

// 修改后
if (hdp !== null && markets.full?.handicapLines) {
```

**第 387 行：**
```typescript
// 修改前
if (hdp !== null) {

// 修改后
if (hdp !== null && markets.full?.overUnderLines) {
```

**第 405 行：**
```typescript
// 修改前
if (hdp !== null) {

// 修改后
if (hdp !== null && markets.half?.handicapLines) {
```

**第 417 行：**
```typescript
// 修改前
if (hdp !== null) {

// 修改后
if (hdp !== null && markets.half?.overUnderLines) {
```

保存并退出：
- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

然后重新编译和部署：

```bash
bash fix-and-deploy.sh
```

## 🔍 验证修复

修复后，应该看到：

```bash
✅ 编译成功
✅ 服务重启成功
✅ 服务状态：online
```

检查服务状态：

```bash
bash check-status.sh
```

查看日志：

```bash
pm2 logs crown-scraper
```

## 📝 完整的修复后代码

修复后的代码应该是这样的：

```typescript
// 全场让球
if (game.RATIO_R || game.RATIO_RH || game.RATIO_RC) {
  const hdp = this.parseHandicap(game.RATIO_R || game.STRONG);
  if (hdp !== null && markets.full?.handicapLines) {  // ✅ 添加了 && markets.full?.handicapLines
    markets.full.handicapLines.push({
      hdp,
      home: this.parseOddsValue(game.RATIO_RH) || 0,
      away: this.parseOddsValue(game.RATIO_RC) || 0,
    });
  }
}

// 全场大小球
if (game.RATIO_O || game.RATIO_OUH || game.RATIO_OUC) {
  const hdp = this.parseHandicap(game.RATIO_O);
  if (hdp !== null && markets.full?.overUnderLines) {  // ✅ 添加了 && markets.full?.overUnderLines
    markets.full.overUnderLines.push({
      hdp,
      over: this.parseOddsValue(game.RATIO_OUH) || 0,
      under: this.parseOddsValue(game.RATIO_OUC) || 0,
    });
  }
}

// 半场让球
if (game.RATIO_HR || game.RATIO_HRH || game.RATIO_HRC) {
  const hdp = this.parseHandicap(game.RATIO_HR || game.HSTRONG);
  if (hdp !== null && markets.half?.handicapLines) {  // ✅ 添加了 && markets.half?.handicapLines
    markets.half.handicapLines.push({
      hdp,
      home: this.parseOddsValue(game.RATIO_HRH) || 0,
      away: this.parseOddsValue(game.RATIO_HRC) || 0,
    });
  }
}

// 半场大小球
if (game.RATIO_HO || game.RATIO_HOUH || game.RATIO_HOUC) {
  const hdp = this.parseHandicap(game.RATIO_HO);
  if (hdp !== null && markets.half?.overUnderLines) {  // ✅ 添加了 && markets.half?.overUnderLines
    markets.half.overUnderLines.push({
      hdp,
      over: this.parseOddsValue(game.RATIO_HOUH) || 0,
      under: this.parseOddsValue(game.RATIO_HOUC) || 0,
    });
  }
}
```

## 🎯 推荐方法

**最推荐：方法一（git pull）**
- ✅ 最简单
- ✅ 保留 Git 历史
- ✅ 可以随时更新

**备选：方法二（重新克隆）**
- ✅ 确保代码最新
- ⚠️ 需要备份 .env

**最后选择：方法三（手动修复）**
- ⚠️ 容易出错
- ⚠️ 无法获取其他更新
- ✅ 不需要网络访问 GitHub

## 🆘 如果还有问题

1. 查看完整错误日志：
   ```bash
   npm run build
   ```

2. 检查 Node.js 版本：
   ```bash
   node --version  # 应该 >= 16.0.0
   ```

3. 重新安装依赖：
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

4. 查看服务日志：
   ```bash
   pm2 logs crown-scraper --err
   ```

## 📞 获取帮助

如果以上方法都不行，请提供以下信息：

1. Node.js 版本：`node --version`
2. npm 版本：`npm --version`
3. 完整错误日志：`npm run build 2>&1 | tee build-error.log`
4. Git 状态：`git status`

祝你修复顺利！🚀


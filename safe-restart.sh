#!/bin/bash

# 安全重启脚本 - 确保旧进程完全退出后再启动新进程

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔄 安全重启皇冠数据抓取服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. 检查 PM2 进程
echo ""
echo "1️⃣ 检查 PM2 进程..."
if pm2 list | grep -q "crown-scraper"; then
    echo "✅ 找到 crown-scraper 进程"
    
    # 2. 优雅停止进程
    echo ""
    echo "2️⃣ 优雅停止进程（等待账号登出）..."
    pm2 stop crown-scraper
    
    # 等待 5 秒确保登出完成
    echo "⏳ 等待 5 秒确保账号登出..."
    sleep 5
    
    # 3. 删除进程
    echo ""
    echo "3️⃣ 删除旧进程..."
    pm2 delete crown-scraper
else
    echo "⚠️ 未找到 crown-scraper 进程"
fi

# 4. 检查并删除 PID 文件
echo ""
echo "4️⃣ 检查 PID 文件..."
if [ -f "crown-scraper.pid" ]; then
    OLD_PID=$(cat crown-scraper.pid)
    echo "⚠️ 找到旧的 PID 文件: $OLD_PID"
    rm -f crown-scraper.pid
    echo "✅ 已删除 PID 文件"
else
    echo "✅ 没有旧的 PID 文件"
fi

# 5. 启动新进程
echo ""
echo "5️⃣ 启动新进程..."
pm2 start ecosystem.config.js

# 6. 保存 PM2 配置
echo ""
echo "6️⃣ 保存 PM2 配置..."
pm2 save

# 7. 显示状态
echo ""
echo "7️⃣ 服务状态："
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pm2 status

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ 安全重启完成！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 查看日志："
echo "   pm2 logs crown-scraper"
echo ""
echo "🔍 检查状态："
echo "   bash check-status.sh"
echo ""


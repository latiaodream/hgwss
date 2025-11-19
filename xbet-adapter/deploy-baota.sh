#!/bin/bash

# XBet Adapter 宝塔部署脚本
# 使用方法: bash deploy-baota.sh

set -e

echo "=========================================="
echo "  XBet Adapter 宝塔部署脚本"
echo "=========================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未安装 Node.js"
    echo "请先在宝塔面板安装 Node.js 版本管理器，并安装 Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未安装 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm -v)"
echo ""

# 创建日志目录
echo "📁 创建日志目录..."
mkdir -p logs
echo "✅ 日志目录已创建"
echo ""

# 安装依赖
echo "📦 安装依赖..."
npm install
echo "✅ 依赖安装完成"
echo ""

# 检查配置文件
if [ ! -f "config.json" ]; then
    echo "⚠️  警告: config.json 不存在"
    echo "请根据 config.json.example 创建配置文件"
    echo ""
fi

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 PM2..."
    npm install -g pm2
    echo "✅ PM2 安装完成"
else
    echo "✅ PM2 已安装: $(pm2 -v)"
fi
echo ""

# 停止旧进程
echo "🛑 停止旧进程..."
pm2 stop xbet-adapter 2>/dev/null || echo "没有运行中的进程"
pm2 delete xbet-adapter 2>/dev/null || echo "没有需要删除的进程"
echo ""

# 启动服务
echo "🚀 启动服务..."
pm2 start ecosystem.config.cjs
echo ""

# 保存 PM2 配置
echo "💾 保存 PM2 配置..."
pm2 save
echo ""

# 设置开机自启动
echo "🔄 设置开机自启动..."
pm2 startup | tail -n 1 | bash || echo "请手动执行上面的命令设置开机自启动"
echo ""

# 显示状态
echo "=========================================="
echo "  部署完成！"
echo "=========================================="
echo ""
pm2 status
echo ""
echo "📊 Dashboard 地址: http://你的服务器IP:18082"
echo "🔌 WebSocket 地址: ws://你的服务器IP:18081"
echo ""
echo "常用命令:"
echo "  查看日志: pm2 logs xbet-adapter"
echo "  查看状态: pm2 status"
echo "  重启服务: pm2 restart xbet-adapter"
echo "  停止服务: pm2 stop xbet-adapter"
echo ""


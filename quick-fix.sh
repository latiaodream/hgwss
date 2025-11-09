#!/bin/bash

# 快速修复 TypeScript 编译错误
# 用于在服务器上直接修复代码

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 快速修复 TypeScript 编译错误"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查文件是否存在
if [ ! -f "src/scrapers/CrownScraper.ts" ]; then
    echo "❌ 错误：找不到 src/scrapers/CrownScraper.ts 文件"
    echo "请确保在项目根目录运行此脚本"
    exit 1
fi

echo "📝 备份原文件..."
cp src/scrapers/CrownScraper.ts src/scrapers/CrownScraper.ts.backup
echo "✅ 备份完成：src/scrapers/CrownScraper.ts.backup"
echo ""

echo "🔧 修复第 376 行..."
sed -i 's/if (hdp !== null) {$/if (hdp !== null \&\& markets.full?.handicapLines) {/' src/scrapers/CrownScraper.ts

echo "🔧 修复第 388 行..."
sed -i 's/if (hdp !== null) {$/if (hdp !== null \&\& markets.full?.overUnderLines) {/' src/scrapers/CrownScraper.ts

echo "🔧 修复第 406 行..."
sed -i 's/if (hdp !== null) {$/if (hdp !== null \&\& markets.half?.handicapLines) {/' src/scrapers/CrownScraper.ts

echo "🔧 修复第 418 行..."
sed -i 's/if (hdp !== null) {$/if (hdp !== null \&\& markets.half?.overUnderLines) {/' src/scrapers/CrownScraper.ts

echo "✅ 代码修复完成"
echo ""

echo "🔨 重新编译 TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 编译成功！"
    echo ""
    
    # 检查 PM2 是否在运行
    if pm2 list | grep -q "crown-scraper"; then
        echo "🔄 重启服务..."
        pm2 restart crown-scraper
        echo ""
        echo "✅ 服务重启成功！"
        echo ""
        
        echo "📊 服务状态："
        pm2 status crown-scraper
        echo ""
        
        echo "📋 最近日志："
        pm2 logs crown-scraper --lines 10 --nostream
    else
        echo "⚠️  PM2 服务未运行，请手动启动："
        echo "   pm2 start ecosystem.config.js"
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 修复完成！"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "如果需要恢复原文件，运行："
    echo "  cp src/scrapers/CrownScraper.ts.backup src/scrapers/CrownScraper.ts"
    echo ""
else
    echo ""
    echo "❌ 编译失败！"
    echo ""
    echo "正在恢复原文件..."
    cp src/scrapers/CrownScraper.ts.backup src/scrapers/CrownScraper.ts
    echo "✅ 已恢复原文件"
    echo ""
    echo "请检查错误信息并手动修复"
    exit 1
fi


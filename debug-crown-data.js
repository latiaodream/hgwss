/**
 * 调试脚本：检查皇冠数据存储情况
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'crown_scraper',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function checkCrownData() {
  console.log('='.repeat(60));
  console.log('🔍 检查皇冠数据存储情况');
  console.log('='.repeat(60));

  try {
    // 1. 检查数据库连接
    console.log('\n1️⃣ 检查数据库连接...');
    await pool.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');

    // 2. 检查表是否存在
    console.log('\n2️⃣ 检查 crown_matches 表...');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'crown_matches'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('❌ crown_matches 表不存在！');
      return;
    }
    console.log('✅ crown_matches 表存在');

    // 3. 统计各类型赛事数量
    console.log('\n3️⃣ 统计赛事数量...');
    const countResult = await pool.query(`
      SELECT 
        show_type,
        COUNT(*) as count,
        MAX(updated_at) as last_update
      FROM crown_matches
      GROUP BY show_type
      ORDER BY show_type;
    `);

    if (countResult.rows.length === 0) {
      console.log('⚠️ 数据库中没有任何皇冠赛事数据！');
    } else {
      console.log('\n赛事统计:');
      countResult.rows.forEach(row => {
        console.log(`  ${row.show_type.padEnd(10)} : ${row.count} 场 (最后更新: ${row.last_update})`);
      });
    }

    // 4. 查看最近的赛事
    console.log('\n4️⃣ 查看最近的赛事 (每种类型 3 场)...');
    const recentMatches = await pool.query(`
      SELECT 
        gid,
        show_type,
        league,
        team_home,
        team_away,
        match_time,
        updated_at
      FROM crown_matches
      ORDER BY updated_at DESC
      LIMIT 10;
    `);

    if (recentMatches.rows.length === 0) {
      console.log('⚠️ 没有找到任何赛事');
    } else {
      console.log('\n最近更新的赛事:');
      recentMatches.rows.forEach((match, index) => {
        console.log(`\n  ${index + 1}. [${match.show_type}] ${match.league}`);
        console.log(`     ${match.team_home} vs ${match.team_away}`);
        console.log(`     比赛时间: ${match.match_time}`);
        console.log(`     更新时间: ${match.updated_at}`);
        console.log(`     GID: ${match.gid}`);
      });
    }

    // 5. 检查是否有今天的赛事
    console.log('\n5️⃣ 检查今天的赛事...');
    const todayMatches = await pool.query(`
      SELECT COUNT(*) as count
      FROM crown_matches
      WHERE match_time >= CURRENT_DATE
        AND match_time < CURRENT_DATE + INTERVAL '1 day';
    `);
    console.log(`今天的赛事数量: ${todayMatches.rows[0].count}`);

    // 6. 检查数据更新频率
    console.log('\n6️⃣ 检查数据更新频率...');
    const updateCheck = await pool.query(`
      SELECT 
        show_type,
        MAX(updated_at) as last_update,
        EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) / 60 as minutes_ago
      FROM crown_matches
      GROUP BY show_type;
    `);

    if (updateCheck.rows.length > 0) {
      console.log('\n数据更新情况:');
      updateCheck.rows.forEach(row => {
        const minutesAgo = Math.floor(row.minutes_ago);
        const status = minutesAgo < 5 ? '✅' : minutesAgo < 30 ? '⚠️' : '❌';
        console.log(`  ${status} ${row.show_type.padEnd(10)} : ${minutesAgo} 分钟前更新`);
      });
    }

    // 7. 诊断建议
    console.log('\n7️⃣ 诊断建议:');
    const totalCount = countResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    if (totalCount === 0) {
      console.log('❌ 数据库中没有数据，可能的原因:');
      console.log('   1. 服务刚启动，还没有抓取到数据');
      console.log('   2. 抓取器登录失败');
      console.log('   3. 数据库保存失败');
      console.log('   4. useDatabase 设置为 false');
      console.log('\n建议操作:');
      console.log('   1. 检查服务日志: pm2 logs crown-scraper');
      console.log('   2. 检查登录状态: curl http://localhost:10089/api/status');
      console.log('   3. 重启服务: pm2 restart crown-scraper');
    } else if (updateCheck.rows.some(row => row.minutes_ago > 30)) {
      console.log('⚠️ 数据更新不及时，可能的原因:');
      console.log('   1. 抓取器暂停或出错');
      console.log('   2. 网络连接问题');
      console.log('   3. 账号被封禁');
      console.log('\n建议操作:');
      console.log('   1. 检查服务状态: pm2 status');
      console.log('   2. 查看错误日志: pm2 logs crown-scraper --err');
      console.log('   3. 重启服务: pm2 restart crown-scraper');
    } else {
      console.log('✅ 数据存储正常，更新及时');
    }

  } catch (error) {
    console.error('\n❌ 检查失败:', error.message);
    console.error('\n可能的原因:');
    console.error('  1. 数据库连接失败 (检查 .env 配置)');
    console.error('  2. 数据库未初始化 (运行 npm run init-db)');
    console.error('  3. 权限不足');
  } finally {
    await pool.end();
  }
}

// 运行检查
checkCrownData().catch(console.error);


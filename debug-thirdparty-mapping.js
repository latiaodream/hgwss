/**
 * 调试第三方数据映射问题
 * 检查为什么第三方赔率显示英文而不是中文
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:10089';

async function debugMapping() {
  console.log('🔍 调试第三方数据映射\n');
  console.log('========================================\n');

  try {
    // 1. 获取第三方数据
    console.log('1️⃣ 获取 iSports 数据...');
    const isportsRes = await axios.get(`${BASE_URL}/api/thirdparty/isports`);
    
    if (!isportsRes.data.success) {
      console.log('❌ 获取 iSports 数据失败:', isportsRes.data.error);
      return;
    }

    const matches = isportsRes.data.data;
    console.log(`✅ 获取到 ${matches.length} 场比赛\n`);

    if (matches.length === 0) {
      console.log('⚠️  没有比赛数据');
      return;
    }

    // 2. 检查前 5 场比赛的映射情况
    console.log('2️⃣ 检查前 5 场比赛的映射情况:\n');
    
    for (let i = 0; i < Math.min(5, matches.length); i++) {
      const match = matches[i];
      console.log(`比赛 ${i + 1}:`);
      console.log(`  联赛: ${match.league_name_cn} (${match.league_name_en})`);
      console.log(`  主队: ${match.team_home_cn} (${match.team_home_en})`);
      console.log(`  客队: ${match.team_away_cn} (${match.team_away_en})`);
      
      // 检查是否是中文
      const isLeagueChinese = /[\u4e00-\u9fa5]/.test(match.league_name_cn);
      const isHomeChinese = /[\u4e00-\u9fa5]/.test(match.team_home_cn);
      const isAwayChinese = /[\u4e00-\u9fa5]/.test(match.team_away_cn);
      
      console.log(`  联赛是否中文: ${isLeagueChinese ? '✅' : '❌'}`);
      console.log(`  主队是否中文: ${isHomeChinese ? '✅' : '❌'}`);
      console.log(`  客队是否中文: ${isAwayChinese ? '✅' : '❌'}`);
      console.log('');
    }

    // 3. 检查映射数据
    console.log('\n3️⃣ 检查映射数据:\n');
    
    // 检查球队映射
    const teamMappingRes = await axios.get(`${BASE_URL}/api/mapping/teams`);
    if (teamMappingRes.data.success) {
      const teamMappings = teamMappingRes.data.data || [];
      const withCrownCn = teamMappings.filter(m => m.crown_cn && m.crown_cn.trim() !== '');
      console.log(`  球队映射总数: ${teamMappings.length}`);
      console.log(`  有 crown_cn 的映射: ${withCrownCn.length}`);
      console.log(`  没有 crown_cn 的映射: ${teamMappings.length - withCrownCn.length}`);
      
      if (withCrownCn.length > 0) {
        console.log(`\n  示例（有 crown_cn 的映射）:`);
        for (let i = 0; i < Math.min(3, withCrownCn.length); i++) {
          const m = withCrownCn[i];
          console.log(`    ${m.isports_en} -> ${m.crown_cn}`);
        }
      }
    }

    // 检查联赛映射
    const leagueMappingRes = await axios.get(`${BASE_URL}/api/league-mapping`);
    if (leagueMappingRes.data.success) {
      const leagueMappings = leagueMappingRes.data.data || [];
      const withCrownCn = leagueMappings.filter(m => m.crown_cn && m.crown_cn.trim() !== '');
      console.log(`\n  联赛映射总数: ${leagueMappings.length}`);
      console.log(`  有 crown_cn 的映射: ${withCrownCn.length}`);
      console.log(`  没有 crown_cn 的映射: ${leagueMappings.length - withCrownCn.length}`);
      
      if (withCrownCn.length > 0) {
        console.log(`\n  示例（有 crown_cn 的映射）:`);
        for (let i = 0; i < Math.min(3, withCrownCn.length); i++) {
          const m = withCrownCn[i];
          console.log(`    ${m.isports_en} -> ${m.crown_cn}`);
        }
      }
    }

    // 4. 诊断建议
    console.log('\n========================================');
    console.log('📋 诊断结果:\n');
    
    const allChinese = matches.slice(0, 5).every(m => 
      /[\u4e00-\u9fa5]/.test(m.league_name_cn) &&
      /[\u4e00-\u9fa5]/.test(m.team_home_cn) &&
      /[\u4e00-\u9fa5]/.test(m.team_away_cn)
    );
    
    if (allChinese) {
      console.log('✅ 映射工作正常！所有数据都显示中文。');
    } else {
      console.log('❌ 映射未生效或部分生效。');
      console.log('\n可能的原因:');
      console.log('1. 映射数据中的 crown_cn 字段为空');
      console.log('2. iSports 的英文名与映射表中的 isports_en 不匹配');
      console.log('3. 缓存未更新（尝试重启服务）');
      console.log('\n建议操作:');
      console.log('1. 检查映射表，确保 crown_cn 字段有值');
      console.log('2. 导入正确的映射数据（包含 crown_cn）');
      console.log('3. 重启服务: pm2 restart crown-scraper');
    }

  } catch (error) {
    console.error('❌ 调试失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 服务未启动，请先启动服务');
    }
  }
}

debugMapping();


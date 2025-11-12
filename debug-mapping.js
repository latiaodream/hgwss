/**
 * 调试映射数据
 */

const axios = require('axios');

async function debugMapping() {
  console.log('🔍 调试映射数据');
  console.log('========================================\n');

  try {
    // 1. 检查球队映射
    console.log('1️⃣ 检查球队映射:');
    console.log('----------------------------------------');
    const teamRes = await axios.get('http://localhost:10089/api/mapping/teams');
    
    if (teamRes.data.success) {
      const teams = teamRes.data.data;
      console.log(`✅ 总共 ${teams.length} 条球队映射\n`);
      
      // 统计有 crown_cn 的数量
      const withCrown = teams.filter(t => t.crown_cn && t.crown_cn.trim() !== '');
      const withoutCrown = teams.filter(t => !t.crown_cn || t.crown_cn.trim() === '');
      
      console.log(`📊 统计:`);
      console.log(`   - 有 crown_cn: ${withCrown.length} 条`);
      console.log(`   - 无 crown_cn: ${withoutCrown.length} 条\n`);
      
      // 显示前 5 条有 crown_cn 的数据
      if (withCrown.length > 0) {
        console.log('📝 前 5 条有 crown_cn 的映射:');
        withCrown.slice(0, 5).forEach((t, i) => {
          console.log(`   ${i + 1}. ${t.isports_en} (${t.isports_cn}) -> ${t.crown_cn}`);
        });
        console.log('');
      }
      
      // 显示前 5 条无 crown_cn 的数据
      if (withoutCrown.length > 0) {
        console.log('⚠️  前 5 条无 crown_cn 的映射:');
        withoutCrown.slice(0, 5).forEach((t, i) => {
          console.log(`   ${i + 1}. ${t.isports_en} (${t.isports_cn}) -> [空]`);
        });
        console.log('');
      }
    } else {
      console.log('❌ 获取球队映射失败:', teamRes.data.error);
    }
    
    // 2. 检查联赛映射
    console.log('\n2️⃣ 检查联赛映射:');
    console.log('----------------------------------------');
    const leagueRes = await axios.get('http://localhost:10089/api/league-mapping/leagues');
    
    if (leagueRes.data.success) {
      const leagues = leagueRes.data.data;
      console.log(`✅ 总共 ${leagues.length} 条联赛映射\n`);
      
      // 统计有 crown_cn 的数量
      const withCrown = leagues.filter(l => l.crown_cn && l.crown_cn.trim() !== '');
      const withoutCrown = leagues.filter(l => !l.crown_cn || l.crown_cn.trim() === '');
      
      console.log(`📊 统计:`);
      console.log(`   - 有 crown_cn: ${withCrown.length} 条`);
      console.log(`   - 无 crown_cn: ${withoutCrown.length} 条\n`);
      
      // 显示前 5 条有 crown_cn 的数据
      if (withCrown.length > 0) {
        console.log('📝 前 5 条有 crown_cn 的映射:');
        withCrown.slice(0, 5).forEach((l, i) => {
          console.log(`   ${i + 1}. ${l.isports_en} (${l.isports_cn}) -> ${l.crown_cn}`);
        });
        console.log('');
      }
      
      // 显示前 5 条无 crown_cn 的数据
      if (withoutCrown.length > 0) {
        console.log('⚠️  前 5 条无 crown_cn 的映射:');
        withoutCrown.slice(0, 5).forEach((l, i) => {
          console.log(`   ${i + 1}. ${l.isports_en} (${l.isports_cn}) -> [空]`);
        });
        console.log('');
      }
    } else {
      console.log('❌ 获取联赛映射失败:', leagueRes.data.error);
    }
    
    // 3. 测试一场比赛的映射
    console.log('\n3️⃣ 测试实际比赛映射:');
    console.log('----------------------------------------');
    const matchRes = await axios.get('http://localhost:10089/api/thirdparty/isports');
    
    if (matchRes.data.success && matchRes.data.data.length > 0) {
      const match = matchRes.data.data[0];
      console.log('📝 第一场比赛:');
      console.log(`   联赛: ${match.league_name_en} -> ${match.league_name_cn}`);
      console.log(`   主队: ${match.team_home_en} -> ${match.team_home_cn}`);
      console.log(`   客队: ${match.team_away_en} -> ${match.team_away_cn}`);
      console.log('');
      
      // 检查是否还是英文
      const isEnglish = (str) => /^[a-zA-Z\s]+$/.test(str);
      
      if (isEnglish(match.league_name_cn)) {
        console.log('⚠️  联赛名称还是英文，说明没有映射成功');
      } else {
        console.log('✅ 联赛名称已映射为中文');
      }
      
      if (isEnglish(match.team_home_cn)) {
        console.log('⚠️  主队名称还是英文，说明没有映射成功');
      } else {
        console.log('✅ 主队名称已映射为中文');
      }
      
      if (isEnglish(match.team_away_cn)) {
        console.log('⚠️  客队名称还是英文，说明没有映射成功');
      } else {
        console.log('✅客队名称已映射为中文');
      }
    } else {
      console.log('❌ 获取比赛数据失败');
    }
    
    // 4. 总结
    console.log('\n========================================');
    console.log('💡 诊断建议:\n');
    
    const teamRes2 = await axios.get('http://localhost:10089/api/mapping/teams');
    const leagueRes2 = await axios.get('http://localhost:10089/api/league-mapping/leagues');
    
    const teamsWithCrown = teamRes2.data.data?.filter(t => t.crown_cn && t.crown_cn.trim() !== '').length || 0;
    const leaguesWithCrown = leagueRes2.data.data?.filter(l => l.crown_cn && l.crown_cn.trim() !== '').length || 0;
    
    if (teamsWithCrown === 0 && leaguesWithCrown === 0) {
      console.log('❌ 问题: 所有映射的 crown_cn 都是空的！');
      console.log('\n解决方案:');
      console.log('1. 导出球队/联赛 Excel');
      console.log('2. 在 Excel 中填写 crown_cn 列（皇冠的中文名称）');
      console.log('3. 重新导入 Excel');
      console.log('4. 或者使用匹配功能自动关联皇冠数据');
    } else if (teamsWithCrown < 10 || leaguesWithCrown < 5) {
      console.log('⚠️  问题: crown_cn 数据太少！');
      console.log(`   - 球队映射有 crown_cn: ${teamsWithCrown} 条`);
      console.log(`   - 联赛映射有 crown_cn: ${leaguesWithCrown} 条`);
      console.log('\n建议: 继续填写更多的 crown_cn 数据');
    } else {
      console.log('✅ 映射数据看起来正常');
      console.log(`   - 球队映射有 crown_cn: ${teamsWithCrown} 条`);
      console.log(`   - 联赛映射有 crown_cn: ${leaguesWithCrown} 条`);
      console.log('\n如果前端还是显示英文，可能是:');
      console.log('1. 缓存问题 - 重启服务试试');
      console.log('2. 匹配逻辑问题 - 检查 isports_en 是否完全匹配');
      console.log('3. 前端缓存 - 刷新浏览器（Ctrl+F5）');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 服务未启动，请先启动服务:');
      console.log('   pm2 restart crown-scraper');
      console.log('   或');
      console.log('   npm start');
    }
  }
}

debugMapping();


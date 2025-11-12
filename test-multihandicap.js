/**
 * 测试多盘口数据
 * 用于检查 iSportsAPI 是否返回了多盘口数据
 */

const axios = require('axios');

async function testMultiHandicap() {
  try {
    console.log('正在获取 iSportsAPI 数据...\n');
    
    const response = await axios.get('http://localhost:10089/api/thirdparty/isports');
    const data = response.data;

    if (!data.success) {
      console.error('❌ API 请求失败:', data.error);
      return;
    }

    const matches = data.data;
    console.log(`✅ 获取到 ${matches.length} 场赛事\n`);

    // 统计多盘口数据
    let totalHandicapLines = 0;
    let totalTotalsLines = 0;
    let matchesWithMultiHandicap = 0;
    let matchesWithMultiTotals = 0;

    matches.forEach((match, index) => {
      const handicapLines = match.odds?.handicap || [];
      const totalsLines = match.odds?.totals || [];

      totalHandicapLines += handicapLines.length;
      totalTotalsLines += totalsLines.length;

      if (handicapLines.length > 1) {
        matchesWithMultiHandicap++;
      }

      if (totalsLines.length > 1) {
        matchesWithMultiTotals++;
      }

      // 显示前 5 场有多盘口的赛事
      if ((handicapLines.length > 1 || totalsLines.length > 1) && index < 5) {
        console.log(`\n📊 赛事 ${index + 1}: ${match.team_home_cn || match.team_home_en} vs ${match.team_away_cn || match.team_away_en}`);
        console.log(`   联赛: ${match.league_name_cn || match.league_name_en}`);
        console.log(`   状态: ${match.status}`);
        
        if (handicapLines.length > 0) {
          console.log(`   让球盘 (${handicapLines.length} 个):`);
          handicapLines.forEach((h, i) => {
            console.log(`     ${i + 1}. 盘口: ${h.handicap_line}, 主队: ${h.home_odds}, 客队: ${h.away_odds}, Index: ${h.handicap_index}`);
          });
        }

        if (totalsLines.length > 0) {
          console.log(`   大小球 (${totalsLines.length} 个):`);
          totalsLines.forEach((t, i) => {
            console.log(`     ${i + 1}. 盘口: ${t.total_line}, 大: ${t.over_odds}, 小: ${t.under_odds}, Index: ${t.handicap_index}`);
          });
        }
      }
    });

    console.log('\n\n📈 统计信息:');
    console.log(`   总赛事数: ${matches.length}`);
    console.log(`   总让球盘数: ${totalHandicapLines}`);
    console.log(`   总大小球数: ${totalTotalsLines}`);
    console.log(`   有多让球盘的赛事: ${matchesWithMultiHandicap} (${(matchesWithMultiHandicap / matches.length * 100).toFixed(1)}%)`);
    console.log(`   有多大小球的赛事: ${matchesWithMultiTotals} (${(matchesWithMultiTotals / matches.length * 100).toFixed(1)}%)`);
    console.log(`   平均每场让球盘数: ${(totalHandicapLines / matches.length).toFixed(2)}`);
    console.log(`   平均每场大小球数: ${(totalTotalsLines / matches.length).toFixed(2)}`);

    if (matchesWithMultiHandicap === 0 && matchesWithMultiTotals === 0) {
      console.log('\n⚠️  警告: 没有发现多盘口数据！');
      console.log('   可能的原因:');
      console.log('   1. iSportsAPI 当前没有返回多盘口数据');
      console.log('   2. 皇冠（Company ID = 3）没有提供多盘口');
      console.log('   3. 数据解析有问题');
    } else {
      console.log('\n✅ 多盘口数据正常！');
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('   响应状态:', error.response.status);
      console.error('   响应数据:', error.response.data);
    }
  }
}

// 运行测试
testMultiHandicap();


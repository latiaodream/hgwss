/**
 * 简化版 get_game_more 测试脚本
 * 直接在服务器上运行，测试不同的请求策略
 */

import { CrownScraper } from './src/scrapers/CrownScraper';
import { AccountConfig } from './src/types';
import logger from './src/utils/logger';

import * as xml2js from 'xml2js';

// 强制使用 hga026.com 作为域名
process.env.CROWN_API_BASE_URL = 'https://hga026.com';
process.env.CROWN_SITE_URL = 'https://hga026.com';

async function testGameMoreStrategies() {
  console.log('========================================');
  console.log('开始测试 get_game_more 风控策略');
  console.log('========================================\n');

  const LOOPS = parseInt(process.env.PREHEAT_LOOPS || '16');
  const LOOP_DELAY_MS = parseInt(process.env.PREHEAT_DELAY_MS || '12000');
  const EXTRA_WAIT_MS = parseInt(process.env.DELAY_AFTER_PREHEAT_MS || '5000');
  const DO_VISIT_FT = process.env.VISIT_FT_BROWSE === '1';
  const SKIP_FT_ORDER_VIEW = process.env.SKIP_FT_ORDER_VIEW === '1';

  // 测试账号
  const testAccount: AccountConfig = {
    username: 'WjeLaA68i0',
    password: 'I0FQsaTFFUHg',
    showType: 'live',
  };

  const scraper = new CrownScraper(testAccount);

  try {
    // 步骤1：登录
    console.log('步骤1：登录账号...');
    const loginSuccess = await scraper.login();
    if (!loginSuccess) {
      console.error('❌ 登录失败，测试终止');
      return;
    }
    console.log('✅ 登录成功\n');

    // 步骤2：获取赛事列表
    console.log('步骤2：获取赛事列表...');
    const matches = await scraper.fetchMatches();
    if (matches.length === 0) {
      console.error('❌ 没有可用的赛事，测试终止');
      return;
    }
    console.log(`✅ 获取到 ${matches.length} 场赛事\n`);

    // 选择第一场赛事进行测试
    const testMatch = matches[0];
    console.log('测试赛事信息:');
    console.log(`  GID: ${testMatch.gid}`);
    console.log(`  联赛: ${testMatch.league}`);
    console.log(`  主队: ${testMatch.home}`);
    console.log(`  客队: ${testMatch.away}\n`);
    // 安全策略：可配置预热
    console.log(`先执行安全策略：预热 ${Math.round((LOOPS*LOOP_DELAY_MS)/1000)}s + 列表浏览 ${LOOPS} 次 + filter=Main`);
    for (let i = 0; i < LOOPS; i++) {
      await delay(LOOP_DELAY_MS);
      await scraper.fetchMatches();
      console.log(`预热浏览 ${i + 1}/${LOOPS}`);
    }
    await delay(EXTRA_WAIT_MS);

    if (!SKIP_FT_ORDER_VIEW) {
      console.log('模拟下注预览（FT_order_view）...');
      await (scraper as any).fetchMatchOdds(testMatch.gid);
      await delay(3000);
    }

    await testGetGameMoreSafe(scraper, testMatch, `安全策略：预热${Math.round((LOOPS*LOOP_DELAY_MS)/1000)}s + filter=Main${SKIP_FT_ORDER_VIEW ? '' : ' + FT_order_view预热'}`);

    // 为避免触发风控，先结束本次测试
    await scraper.logout();
    return;


    // 策略测试
    const strategies = [
      {
        name: '策略1: 立即请求（基线）',
        delayBefore: 0,
        delayAfter: 10000,
      },
      {
        name: '策略2: 等待5秒后请求',
        delayBefore: 5000,
        delayAfter: 10000,
      },
      {
        name: '策略3: 等待10秒后请求',
        delayBefore: 10000,
        delayAfter: 10000,
      },
      {
        name: '策略4: 等待15秒后请求',
        delayBefore: 15000,
        delayAfter: 10000,
      },
    ];

    const results: any[] = [];

    for (const strategy of strategies) {
      console.log(`\n========================================`);
      console.log(`测试: ${strategy.name}`);
      console.log(`========================================`);

      if (strategy.delayBefore > 0) {
        console.log(`等待 ${strategy.delayBefore / 1000} 秒...`);
        await delay(strategy.delayBefore);
      }

      const result = await testGetGameMore(scraper, testMatch, strategy.name);
      results.push(result);

      if (strategy.delayAfter > 0) {
        console.log(`冷却 ${strategy.delayAfter / 1000} 秒...`);
        await delay(strategy.delayAfter);
      }
    }

    // 输出测试结果汇总
    console.log('\n\n========================================');
    console.log('测试结果汇总');
    console.log('========================================\n');

    results.forEach((result, index) => {
      console.log(`测试 ${index + 1}: ${result.strategy}`);
      console.log(`  成功: ${result.success ? '✅' : '❌'}`);
      console.log(`  触发风控: ${result.hasCheckEMNU ? '❌ 是' : '✅ 否'}`);
      console.log(`  响应时间: ${result.responseTime}ms`);
      console.log(`  盘口数量: ${result.marketCount}`);
      if (result.error) {
        console.log(`  错误: ${result.error}`);
      }
      console.log('');
    });

    // 登出
    await scraper.logout();
    console.log('✅ 测试完成');

  } catch (error: any) {
    console.error('❌ 测试异常:', error.message);
  }
}

async function testGetGameMore(scraper: any, match: any, strategyName: string): Promise<any> {
  const result = {
    strategy: strategyName,
    success: false,
    hasCheckEMNU: false,
    responseTime: 0,
    marketCount: 0,
    error: null as any,
  };

  try {
    const startTime = Date.now();

    // 调用内部方法获取多盘口数据
    // 注意：这里需要访问 CrownScraper 的私有方法，可能需要修改
    const moreMarkets = await (scraper as any).fetchMoreMarkets(match);

    result.responseTime = Date.now() - startTime;

    if (moreMarkets && moreMarkets.length > 0) {
      result.success = true;
      result.marketCount = moreMarkets.length;
      console.log(`✅ 成功获取多盘口数据，共 ${moreMarkets.length} 个盘口`);
    } else {
      console.log(`⚠️  响应为空或格式异常`);
    }

  } catch (error: any) {
    result.error = error.message;

    // 检查是否触发风控
    if (error.message && (
      error.message.includes('CheckEMNU') ||
      error.message.includes('风险') ||
      error.message.includes('异常')
    )) {
      result.hasCheckEMNU = true;
      console.log(`❌ 触发风控：CheckEMNU`);
    } else {
      console.log(`❌ 请求失败: ${error.message}`);
    }
  }

  return result;
}


async function testGetGameMoreSafe(scraper: any, match: any, strategyName: string): Promise<any> {
  const result = {
    strategy: strategyName,
    success: false,
    hasCheckEMNU: false,
    responseTime: 0,
    marketCount: 0,
    error: null as any,
  };

  try {
    const client = (scraper as any).client;
    const uid = (scraper as any).uid;
    const version = (scraper as any).version;
    const baseUrl = (scraper as any).baseUrl || 'https://hga026.com';

    const lid = match.lid || match.raw?.game?.LID || match.raw?.game?.lid || match.raw?.LID || match.raw?.lid;
    const ecid = match.raw?.game?.ECID || match.raw?.game?.ecid || match.raw?.league?.ECID || match.raw?.league?.ecid || match.raw?.ECID || match.raw?.ecid;
    const gid = match.gid || match.raw?.game?.GID || match.raw?.game?.gid || match.raw?.GID || match.raw?.gid;

    const params = new URLSearchParams({
      uid,
      ver: version,
      langx: 'zh-cn',
      p: 'get_game_more',
      gtype: 'FT',
      showtype: 'live',
      ltype: '3',
      isRB: 'Y',
      from: 'game_more',
      mode: 'NORMAL',
      filter: 'Main',
      ts: Date.now().toString(),
    });
    if (lid) params.set('lid', String(lid));
    if (ecid) params.set('ecid', String(ecid));
    if (gid) params.set('gid', String(gid));

    // 先实际访问一次 FT_browse 页面，获取页面级 Cookie 再发 more
    if (process.env.VISIT_FT_BROWSE === '1') {
      await client.get(`/app/member/FT_browse/index.php?rtype=re&langx=zh-cn`, {
        headers: {
          'Accept-Language': 'zh-CN,zh;q=0.9',
        },
      });
      await delay(parseInt(process.env.DELAY_AFTER_FT_MS || '2500'));
    }

    const start = Date.now();
    const resp = await (scraper as any).postTransform(params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${baseUrl}/app/member/FT_browse/index.php?rtype=re&langx=zh-cn`,
        'Origin': baseUrl,
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cookie': (scraper as any).cookies,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    result.responseTime = Date.now() - start;

    const text = typeof resp.data === 'string' ? resp.data : '';
    if (text.includes('CheckEMNU')) {
      result.hasCheckEMNU = true;
      console.log('❌ 触发风控：CheckEMNU');
      return result;
    }

    const parser = new xml2js.Parser({ explicitArray: false });
    const doc = await parser.parseStringPromise(text);
    const sr: any = doc.serverresponse || doc;
    const games = sr?.game || [];
    const list = Array.isArray(games) ? games : [games];

    if (list.length > 0) {
      result.success = true;
      result.marketCount = list.length;
      console.log(`✅ 成功获取多盘口数据，共 ${list.length} 个盘口`);
    } else {
      console.log('⚠️  响应为空或格式异常');
    }
  } catch (e: any) {
    result.error = e?.message || String(e);
    console.log(`❌ 请求失败: ${result.error}`);
  }

  return result;
}


function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
testGameMoreStrategies().catch(console.error);


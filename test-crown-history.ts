/**
 * 测试抓取皇冠历史赛事
 */

import { CrownScraper } from './src/scrapers/CrownScraper';
import { AccountConfig } from './src/types';
import logger from './src/utils/logger';

async function testHistoryMatches() {
  // 使用测试账号
  const account: AccountConfig = {
    username: 'cppzuqx4',
    password: 'aa112211',
    showType: 'early',
  };

  const scraper = new CrownScraper(account);

  try {
    // 登录
    logger.info('开始登录...');
    const loginSuccess = await scraper.login();
    if (!loginSuccess) {
      logger.error('登录失败');
      return;
    }

    logger.info('登录成功！');

    // 测试不同的日期参数
    const dates = [
      '', // 默认（当前）
      '2024-11-05', // 一周前
      '2024-11-01', // 本月初
      '2024-11-12', // 今天
      '2024-11-13', // 明天
      '2024-11-20', // 下周
    ];

    for (const date of dates) {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`测试日期: ${date || '默认（当前）'}`);
      logger.info('='.repeat(60));

      try {
        // 调用 fetchMatches 方法，传入日期参数
        const matches = await scraper.fetchMatches(date);
        logger.info(`抓取到 ${matches.length} 场赛事`);

        if (matches.length > 0) {
          logger.info('前 3 场赛事:');
          matches.slice(0, 3).forEach((match: any) => {
            logger.info(`  - ${match.league_zh}: ${match.home_team_zh} vs ${match.away_team_zh} (${match.match_time})`);
          });
        }
      } catch (error: any) {
        logger.error(`抓取失败: ${error.message}`);
      }

      // 等待 2 秒避免请求过快
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 登出
    await scraper.logout();
    logger.info('\n测试完成！');

  } catch (error: any) {
    logger.error('测试失败:', error.message);
  }
}

testHistoryMatches();


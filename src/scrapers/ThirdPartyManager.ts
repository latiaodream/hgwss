/**
 * 第三方 API 管理器
 * 
 * 功能：
 * - 管理 iSportsAPI 和 Odds-API.io 两个抓取器
 * - 协调数据抓取和更新
 * - 提供统一的数据访问接口
 */

import { ISportsAPIScraper, ISportsMatch } from './ISportsAPIScraper';
import { OddsAPIScraper, OddsAPIMatch } from './OddsAPIScraper';
import logger from '../utils/logger';

export interface ThirdPartyData {
  isports: ISportsMatch[];
  oddsapi: OddsAPIMatch[];
  last_update: {
    isports: string;
    oddsapi: string;
  };
}

export class ThirdPartyManager {
  private isportsScraper: ISportsAPIScraper;
  private oddsapiScraper: OddsAPIScraper;
  private fetchInterval: number;
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(
    isportsApiKey: string,
    oddsapiApiKey: string,
    fetchIntervalSeconds: number = 60
  ) {
    this.isportsScraper = new ISportsAPIScraper(isportsApiKey);
    this.oddsapiScraper = new OddsAPIScraper(oddsapiApiKey);
    this.fetchInterval = fetchIntervalSeconds * 1000;

    logger.info('[ThirdPartyManager] 初始化完成');
  }

  /**
   * 启动定时抓取
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[ThirdPartyManager] 已经在运行中');
      return;
    }

    this.isRunning = true;
    logger.info(`[ThirdPartyManager] 启动定时抓取，间隔 ${this.fetchInterval / 1000} 秒`);

    // 立即执行一次
    this.fetchAll().catch(error => {
      logger.error('[ThirdPartyManager] 初始抓取失败:', error);
    });

    // 设置定时任务
    this.intervalId = setInterval(() => {
      this.fetchAll().catch(error => {
        logger.error('[ThirdPartyManager] 定时抓取失败:', error);
      });
    }, this.fetchInterval);
  }

  /**
   * 停止定时抓取
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[ThirdPartyManager] 未在运行中');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isRunning = false;
    logger.info('[ThirdPartyManager] 已停止定时抓取');
  }

  /**
   * 抓取所有数据
   */
  async fetchAll(): Promise<ThirdPartyData> {
    logger.info('[ThirdPartyManager] 开始抓取所有数据...');

    const startTime = Date.now();

    try {
      // 并行抓取两个 API 的数据
      const [isportsMatches, oddsapiMatches] = await Promise.allSettled([
        this.isportsScraper.fetchAllMatches(),
        this.oddsapiScraper.fetchAllMatches(),
      ]);

      const data: ThirdPartyData = {
        isports: isportsMatches.status === 'fulfilled' ? isportsMatches.value : [],
        oddsapi: oddsapiMatches.status === 'fulfilled' ? oddsapiMatches.value : [],
        last_update: {
          isports: new Date().toISOString(),
          oddsapi: new Date().toISOString(),
        },
      };

      const duration = Date.now() - startTime;
      logger.info(
        `[ThirdPartyManager] 抓取完成 (${duration}ms): ` +
        `iSports ${data.isports.length} 场, ` +
        `OddsAPI ${data.oddsapi.length} 场`
      );

      return data;
    } catch (error: any) {
      logger.error('[ThirdPartyManager] 抓取失败:', error.message);
      throw error;
    }
  }

  /**
   * 只抓取 iSportsAPI 数据
   */
  async fetchISports(): Promise<ISportsMatch[]> {
    try {
      logger.info('[ThirdPartyManager] 抓取 iSportsAPI 数据...');
      const matches = await this.isportsScraper.fetchAllMatches();
      logger.info(`[ThirdPartyManager] iSportsAPI 抓取完成: ${matches.length} 场`);
      return matches;
    } catch (error: any) {
      logger.error('[ThirdPartyManager] iSportsAPI 抓取失败:', error.message);
      throw error;
    }
  }

  /**
   * 只抓取 Odds-API.io 数据
   */
  async fetchOddsAPI(): Promise<OddsAPIMatch[]> {
    try {
      logger.info('[ThirdPartyManager] 抓取 Odds-API.io 数据...');
      const matches = await this.oddsapiScraper.fetchAllMatches();
      logger.info(`[ThirdPartyManager] Odds-API.io 抓取完成: ${matches.length} 场`);
      return matches;
    } catch (error: any) {
      logger.error('[ThirdPartyManager] Odds-API.io 抓取失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取缓存的所有数据
   */
  getCachedData(): ThirdPartyData {
    return {
      isports: this.isportsScraper.getMatchesCache(),
      oddsapi: this.oddsapiScraper.getMatchesCache(),
      last_update: {
        isports: new Date().toISOString(),
        oddsapi: new Date().toISOString(),
      },
    };
  }

  /**
   * 获取 iSportsAPI 缓存数据
   */
  getISportsCachedData(): ISportsMatch[] {
    return this.isportsScraper.getMatchesCache();
  }

  /**
   * 获取 Odds-API.io 缓存数据
   */
  getOddsAPICachedData(): OddsAPIMatch[] {
    return this.oddsapiScraper.getMatchesCache();
  }

  /**
   * 根据 ID 获取 iSportsAPI 赛事
   */
  getISportsMatchById(matchId: string): ISportsMatch | undefined {
    return this.isportsScraper.getMatchById(matchId);
  }

  /**
   * 根据 ID 获取 Odds-API.io 赛事
   */
  getOddsAPIMatchById(matchId: string): OddsAPIMatch | undefined {
    return this.oddsapiScraper.getMatchById(matchId);
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    isRunning: boolean;
    fetchInterval: number;
    isportsCount: number;
    oddsapiCount: number;
  } {
    return {
      isRunning: this.isRunning,
      fetchInterval: this.fetchInterval,
      isportsCount: this.isportsScraper.getMatchesCache().length,
      oddsapiCount: this.oddsapiScraper.getMatchesCache().length,
    };
  }
}


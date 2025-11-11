/**
 * iSportsAPI 数据抓取器
 * 
 * 功能：
 * - 抓取 iSportsAPI 的足球赛事数据
 * - 只抓取皇冠（Crown, Company ID = 3）的赔率
 * - 只抓取滚球、今日、明日的赛事
 * - 支持让球盘、独赢盘、大小球
 */

import axios, { AxiosInstance } from 'axios';
import logger from '../utils/logger';

export interface ISportsMatch {
  match_id: string;
  league_id: string;
  league_name_cn: string;
  league_name_en: string;
  team_home_cn: string;
  team_home_en: string;
  team_away_cn: string;
  team_away_en: string;
  match_time: string;
  status: 'live' | 'today' | 'tomorrow';
  score_home?: number;
  score_away?: number;
  odds: {
    handicap?: {
      home_odds: number;
      away_odds: number;
      handicap_line: number;
    };
    moneyline?: {
      home_odds: number;
      draw_odds: number;
      away_odds: number;
    };
    totals?: {
      over_odds: number;
      under_odds: number;
      total_line: number;
    };
  };
  last_update: string;
}

export class ISportsAPIScraper {
  private apiKey: string;
  private baseUrl: string = 'http://api.isportsapi.com/sport';
  private client: AxiosInstance;
  private crownCompanyId: number = 3; // 皇冠的 Company ID
  private matchesCache: Map<string, ISportsMatch> = new Map();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info('[ISportsAPI] 初始化完成');
  }

  /**
   * 获取所有赛事（滚球、今日、明日）
   */
  async fetchAllMatches(): Promise<ISportsMatch[]> {
    try {
      const [liveMatches, todayMatches, tomorrowMatches] = await Promise.all([
        this.fetchLiveMatches(),
        this.fetchTodayMatches(),
        this.fetchTomorrowMatches(),
      ]);

      const allMatches = [...liveMatches, ...todayMatches, ...tomorrowMatches];
      
      // 更新缓存
      allMatches.forEach(match => {
        this.matchesCache.set(match.match_id, match);
      });

      logger.info(`[ISportsAPI] 抓取完成: 滚球 ${liveMatches.length}, 今日 ${todayMatches.length}, 明日 ${tomorrowMatches.length}`);
      
      return allMatches;
    } catch (error: any) {
      logger.error('[ISportsAPI] 抓取失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取滚球赛事
   */
  async fetchLiveMatches(): Promise<ISportsMatch[]> {
    try {
      // API 文档: https://www.isportsapi.com/docs.html?id=223&lang=en
      // 获取滚球赛事列表
      const response = await this.client.get('/football/schedule/live', {
        params: {
          token: this.apiKey,
          company_id: this.crownCompanyId,
        },
      });

      if (response.data.code !== 200) {
        throw new Error(`API 返回错误: ${response.data.msg}`);
      }

      const matches = this.parseMatches(response.data.data || [], 'live');
      logger.info(`[ISportsAPI] 滚球赛事: ${matches.length} 场`);
      
      return matches;
    } catch (error: any) {
      logger.error('[ISportsAPI] 获取滚球赛事失败:', error.message);
      return [];
    }
  }

  /**
   * 获取今日赛事
   */
  async fetchTodayMatches(): Promise<ISportsMatch[]> {
    try {
      const today = this.getDateString(0);
      const response = await this.client.get('/football/schedule/date', {
        params: {
          token: this.apiKey,
          company_id: this.crownCompanyId,
          date: today,
        },
      });

      if (response.data.code !== 200) {
        throw new Error(`API 返回错误: ${response.data.msg}`);
      }

      const matches = this.parseMatches(response.data.data || [], 'today');
      logger.info(`[ISportsAPI] 今日赛事: ${matches.length} 场`);
      
      return matches;
    } catch (error: any) {
      logger.error('[ISportsAPI] 获取今日赛事失败:', error.message);
      return [];
    }
  }

  /**
   * 获取明日赛事
   */
  async fetchTomorrowMatches(): Promise<ISportsMatch[]> {
    try {
      const tomorrow = this.getDateString(1);
      const response = await this.client.get('/football/schedule/date', {
        params: {
          token: this.apiKey,
          company_id: this.crownCompanyId,
          date: tomorrow,
        },
      });

      if (response.data.code !== 200) {
        throw new Error(`API 返回错误: ${response.data.msg}`);
      }

      const matches = this.parseMatches(response.data.data || [], 'tomorrow');
      logger.info(`[ISportsAPI] 明日赛事: ${matches.length} 场`);
      
      return matches;
    } catch (error: any) {
      logger.error('[ISportsAPI] 获取明日赛事失败:', error.message);
      return [];
    }
  }

  /**
   * 解析赛事数据
   */
  private parseMatches(data: any[], status: 'live' | 'today' | 'tomorrow'): ISportsMatch[] {
    const matches: ISportsMatch[] = [];

    for (const item of data) {
      try {
        const match: ISportsMatch = {
          match_id: String(item.id || item.match_id),
          league_id: String(item.league_id),
          league_name_cn: item.league_name_cn || item.league_name || '',
          league_name_en: item.league_name_en || item.league_name || '',
          team_home_cn: item.home_team_cn || item.home_team || '',
          team_home_en: item.home_team_en || item.home_team || '',
          team_away_cn: item.away_team_cn || item.away_team || '',
          team_away_en: item.away_team_en || item.away_team || '',
          match_time: item.match_time || item.time || '',
          status,
          score_home: item.score_home,
          score_away: item.score_away,
          odds: this.parseOdds(item.odds || item),
          last_update: new Date().toISOString(),
        };

        matches.push(match);
      } catch (error: any) {
        logger.warn(`[ISportsAPI] 解析赛事失败: ${error.message}`);
      }
    }

    return matches;
  }

  /**
   * 解析赔率数据
   */
  private parseOdds(oddsData: any): ISportsMatch['odds'] {
    const odds: ISportsMatch['odds'] = {};

    // 让球盘 (Handicap / Asian Handicap)
    if (oddsData.handicap || oddsData.ah) {
      const hc = oddsData.handicap || oddsData.ah;
      odds.handicap = {
        home_odds: parseFloat(hc.home_odds || hc.home || 0),
        away_odds: parseFloat(hc.away_odds || hc.away || 0),
        handicap_line: parseFloat(hc.handicap || hc.line || 0),
      };
    }

    // 独赢盘 (Moneyline / 1X2)
    if (oddsData.moneyline || oddsData.ml || oddsData['1x2']) {
      const ml = oddsData.moneyline || oddsData.ml || oddsData['1x2'];
      odds.moneyline = {
        home_odds: parseFloat(ml.home_odds || ml.home || ml['1'] || 0),
        draw_odds: parseFloat(ml.draw_odds || ml.draw || ml.x || 0),
        away_odds: parseFloat(ml.away_odds || ml.away || ml['2'] || 0),
      };
    }

    // 大小球 (Totals / Over/Under)
    if (oddsData.totals || oddsData.ou) {
      const ou = oddsData.totals || oddsData.ou;
      odds.totals = {
        over_odds: parseFloat(ou.over_odds || ou.over || 0),
        under_odds: parseFloat(ou.under_odds || ou.under || 0),
        total_line: parseFloat(ou.total || ou.line || 0),
      };
    }

    return odds;
  }

  /**
   * 获取日期字符串 (YYYYMMDD)
   */
  private getDateString(daysOffset: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}${month}${day}`;
  }

  /**
   * 获取缓存的赛事
   */
  getMatchesCache(): ISportsMatch[] {
    return Array.from(this.matchesCache.values());
  }

  /**
   * 根据 ID 获取赛事
   */
  getMatchById(matchId: string): ISportsMatch | undefined {
    return this.matchesCache.get(matchId);
  }
}


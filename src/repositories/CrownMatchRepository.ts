/**
 * 皇冠赛事数据库操作
 */

import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface CrownMatch {
  gid: string;
  show_type: string;
  league?: string;
  team_home?: string;
  team_away?: string;
  match_time?: string;
  handicap?: number;
  handicap_home?: number;
  handicap_away?: number;
  over_under?: number;
  over?: number;
  under?: number;
  home_win?: number;
  draw?: number;
  away_win?: number;
  strong?: string;
  more?: string;
  raw_data?: any;
  created_at?: string;
  updated_at?: string;
}

export class CrownMatchRepository {
  /**
   * 获取所有赛事
   */
  async findAll(showType?: string): Promise<CrownMatch[]> {
    try {
      let query = 'SELECT * FROM crown_matches';
      const params: any[] = [];

      if (showType) {
        query += ' WHERE show_type = $1';
        params.push(showType);
      }

      query += ' ORDER BY match_time ASC';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error: any) {
      logger.error('[CrownMatchRepository] 获取所有赛事失败:', error.message);
      throw error;
    }
  }

  async paginate(options: {
    showType?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: CrownMatch[]; total: number }> {
    const { showType, search } = options;
    const page = Math.max(options.page || 1, 1);
    const pageSize = Math.min(Math.max(options.pageSize || 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const whereClauses: string[] = [];
    const params: any[] = [];

    if (showType) {
      whereClauses.push(`show_type = $${params.length + 1}`);
      params.push(showType);
    }

    if (search) {
      const placeholder = `$${params.length + 1}`;
      whereClauses.push(`(league ILIKE ${placeholder} OR team_home ILIKE ${placeholder} OR team_away ILIKE ${placeholder})`);
      params.push(`%${search}%`);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const dataQuery = `
      SELECT * FROM crown_matches
      ${whereSql}
      ORDER BY match_time DESC NULLS LAST
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `;

    const countQuery = `SELECT COUNT(*) as total FROM crown_matches ${whereSql}`;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, params),
      pool.query(dataQuery, [...params, pageSize, offset]),
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  /**
   * 根据 GID 获取赛事
   */
  async findByGid(gid: string): Promise<CrownMatch | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM crown_matches WHERE gid = $1',
        [gid]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('[CrownMatchRepository] 根据 GID 获取赛事失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建或更新赛事
   */
  async upsert(match: CrownMatch): Promise<CrownMatch> {
    try {
      const result = await pool.query(
        `INSERT INTO crown_matches (
          gid, show_type, league, team_home, team_away, match_time,
          handicap, handicap_home, handicap_away,
          over_under, over, under,
          home_win, draw, away_win,
          strong, more, raw_data, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        ON CONFLICT (gid) DO UPDATE SET
          show_type = EXCLUDED.show_type,
          league = EXCLUDED.league,
          team_home = EXCLUDED.team_home,
          team_away = EXCLUDED.team_away,
          match_time = EXCLUDED.match_time,
          handicap = EXCLUDED.handicap,
          handicap_home = EXCLUDED.handicap_home,
          handicap_away = EXCLUDED.handicap_away,
          over_under = EXCLUDED.over_under,
          over = EXCLUDED.over,
          under = EXCLUDED.under,
          home_win = EXCLUDED.home_win,
          draw = EXCLUDED.draw,
          away_win = EXCLUDED.away_win,
          strong = EXCLUDED.strong,
          more = EXCLUDED.more,
          raw_data = EXCLUDED.raw_data,
          updated_at = EXCLUDED.updated_at
        RETURNING *`,
        [
          match.gid,
          match.show_type,
          match.league,
          match.team_home,
          match.team_away,
          match.match_time,
          match.handicap,
          match.handicap_home,
          match.handicap_away,
          match.over_under,
          match.over,
          match.under,
          match.home_win,
          match.draw,
          match.away_win,
          match.strong,
          match.more,
          JSON.stringify(match.raw_data),
          match.created_at || new Date().toISOString(),
          new Date().toISOString(),
        ]
      );
      return result.rows[0];
    } catch (error: any) {
      logger.error('[CrownMatchRepository] 创建或更新赛事失败:', error.message);
      throw error;
    }
  }

  /**
   * 批量创建或更新赛事
   */
  async upsertBatch(matches: CrownMatch[]): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let count = 0;
      for (const match of matches) {
        await client.query(
          `INSERT INTO crown_matches (
            gid, show_type, league, team_home, team_away, match_time,
            handicap, handicap_home, handicap_away,
            over_under, over, under,
            home_win, draw, away_win,
            strong, more, raw_data, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (gid) DO UPDATE SET
            show_type = EXCLUDED.show_type,
            league = EXCLUDED.league,
            team_home = EXCLUDED.team_home,
            team_away = EXCLUDED.team_away,
            match_time = EXCLUDED.match_time,
            handicap = EXCLUDED.handicap,
            handicap_home = EXCLUDED.handicap_home,
            handicap_away = EXCLUDED.handicap_away,
            over_under = EXCLUDED.over_under,
            over = EXCLUDED.over,
            under = EXCLUDED.under,
            home_win = EXCLUDED.home_win,
            draw = EXCLUDED.draw,
            away_win = EXCLUDED.away_win,
            strong = EXCLUDED.strong,
            more = EXCLUDED.more,
            raw_data = EXCLUDED.raw_data,
            updated_at = EXCLUDED.updated_at`,
          [
            match.gid,
            match.show_type,
            match.league,
            match.team_home,
            match.team_away,
            match.match_time,
            match.handicap,
            match.handicap_home,
            match.handicap_away,
            match.over_under,
            match.over,
            match.under,
            match.home_win,
            match.draw,
            match.away_win,
            match.strong,
            match.more,
            JSON.stringify(match.raw_data),
            match.created_at || new Date().toISOString(),
            new Date().toISOString(),
          ]
        );
        count++;
      }

      await client.query('COMMIT');
      return count;
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('[CrownMatchRepository] 批量创建或更新赛事失败:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 替换指定类型的所有赛事
   * 先删除该类型的旧数据，再插入新的赛事列表
   */
  /**
   * 替换指定类型的所有赛事
   * 先删除该类型的旧数据，再插入新的赛事列表
   * 优化：使用 UNNEST 进行批量插入，大幅减少数据库交互次数
   */
  async replaceByShowType(showType: string, matches: CrownMatch[]): Promise<number> {
    if (matches.length === 0) {
      // 如果没有数据，直接删除旧数据即可
      try {
        const result = await pool.query('DELETE FROM crown_matches WHERE show_type = $1', [showType]);
        return 0;
      } catch (error: any) {
        logger.error(`[CrownMatchRepository] 清空 ${showType} 赛事失败:`, error.message);
        throw error;
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. 删除旧数据
      await client.query('DELETE FROM crown_matches WHERE show_type = $1', [showType]);

      // 2. 准备批量插入的数据
      // 将对象数组转换为列数组，以便使用 UNNEST
      const gids = matches.map(m => m.gid);
      const showTypes = matches.map(m => m.show_type || showType);
      const leagues = matches.map(m => m.league);
      const teamHomes = matches.map(m => m.team_home);
      const teamAways = matches.map(m => m.team_away);
      const matchTimes = matches.map(m => m.match_time);
      const handicaps = matches.map(m => m.handicap);
      const handicapHomes = matches.map(m => m.handicap_home);
      const handicapAways = matches.map(m => m.handicap_away);
      const overUnders = matches.map(m => m.over_under);
      const overs = matches.map(m => m.over);
      const unders = matches.map(m => m.under);
      const homeWins = matches.map(m => m.home_win);
      const draws = matches.map(m => m.draw);
      const awayWins = matches.map(m => m.away_win);
      const strongs = matches.map(m => m.strong);
      const mores = matches.map(m => m.more);
      const rawDatas = matches.map(m => JSON.stringify(m.raw_data));
      const createdAts = matches.map(m => m.created_at || new Date().toISOString());
      const updatedAts = matches.map(() => new Date().toISOString());

      // 3. 批量插入
      // 使用 UNNEST 将数组解压为行，然后插入
      const query = `
        INSERT INTO crown_matches (
          gid, show_type, league, team_home, team_away, match_time,
          handicap, handicap_home, handicap_away,
          over_under, over, under,
          home_win, draw, away_win,
          strong, more, raw_data, created_at, updated_at
        )
        SELECT * FROM UNNEST(
          $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[],
          $7::numeric[], $8::numeric[], $9::numeric[],
          $10::numeric[], $11::numeric[], $12::numeric[],
          $13::numeric[], $14::numeric[], $15::numeric[],
          $16::text[], $17::text[], $18::jsonb[], $19::timestamp[], $20::timestamp[]
        )
        ON CONFLICT (gid) DO UPDATE SET
          show_type = EXCLUDED.show_type,
          league = EXCLUDED.league,
          team_home = EXCLUDED.team_home,
          team_away = EXCLUDED.team_away,
          match_time = EXCLUDED.match_time,
          handicap = EXCLUDED.handicap,
          handicap_home = EXCLUDED.handicap_home,
          handicap_away = EXCLUDED.handicap_away,
          over_under = EXCLUDED.over_under,
          over = EXCLUDED.over,
          under = EXCLUDED.under,
          home_win = EXCLUDED.home_win,
          draw = EXCLUDED.draw,
          away_win = EXCLUDED.away_win,
          strong = EXCLUDED.strong,
          more = EXCLUDED.more,
          raw_data = EXCLUDED.raw_data,
          updated_at = EXCLUDED.updated_at
      `;

      await client.query(query, [
        gids, showTypes, leagues, teamHomes, teamAways, matchTimes,
        handicaps, handicapHomes, handicapAways,
        overUnders, overs, unders,
        homeWins, draws, awayWins,
        strongs, mores, rawDatas, createdAts, updatedAts
      ]);

      await client.query('COMMIT');
      return matches.length;
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error(`[CrownMatchRepository] 批量重置 ${showType} 赛事失败:`, error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 删除旧赛事（超过指定天数）
   */
  async deleteOldMatches(days: number): Promise<number> {
    try {
      const result = await pool.query(
        `DELETE FROM crown_matches 
         WHERE match_time < NOW() - INTERVAL '${days} days'`
      );
      return result.rowCount || 0;
    } catch (error: any) {
      logger.error('[CrownMatchRepository] 删除旧赛事失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  async getStatistics(): Promise<{
    total: number;
    live: number;
    today: number;
    early: number;
  }> {
    try {
      const result = await pool.query(
        `SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE show_type = 'live') as live,
           COUNT(*) FILTER (WHERE show_type = 'today') as today,
           COUNT(*) FILTER (WHERE show_type = 'early') as early
         FROM crown_matches`
      );
      return {
        total: parseInt(result.rows[0].total),
        live: parseInt(result.rows[0].live),
        today: parseInt(result.rows[0].today),
        early: parseInt(result.rows[0].early),
      };
    } catch (error: any) {
      logger.error('[CrownMatchRepository] 获取统计信息失败:', error.message);
      throw error;
    }
  }
}

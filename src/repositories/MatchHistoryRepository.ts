import { pool } from '../config/database';
import { logger } from '../utils/logger';

export interface MatchHistory {
  id?: string;
  match_id: string;
  source: 'crown' | 'isports' | 'oddsapi';
  snapshot_date: string; // YYYY-MM-DD
  data: any;
  created_at?: string;
}

export class MatchHistoryRepository {
  async insert(history: MatchHistory): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO match_history (match_id, source, snapshot_date, data)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (match_id, source, snapshot_date)
         DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
        [history.match_id, history.source, history.snapshot_date, JSON.stringify(history.data)]
      );
    } catch (error: any) {
      logger.error('[MatchHistoryRepository] 插入历史记录失败:', error.message);
      throw error;
    }
  }

  async bulkInsert(records: MatchHistory[]): Promise<number> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const history of records) {
        await client.query(
          `INSERT INTO match_history (match_id, source, snapshot_date, data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (match_id, source, snapshot_date)
           DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
          [history.match_id, history.source, history.snapshot_date, JSON.stringify(history.data)]
        );
      }
      await client.query('COMMIT');
      return records.length;
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('[MatchHistoryRepository] 批量插入历史记录失败:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  async findByDate(
    snapshotDate: string,
    source?: 'crown' | 'isports' | 'oddsapi',
    offset: number = 0,
    limit: number = 50
  ): Promise<MatchHistory[]> {
    try {
      let query = `SELECT * FROM match_history WHERE snapshot_date = $1`;
      const params: any[] = [snapshotDate];
      let paramIndex = 2;
      if (source) {
        query += ` AND source = $${paramIndex++}`;
        params.push(source);
      }
      query += ` ORDER BY created_at ASC OFFSET $${paramIndex++} LIMIT $${paramIndex}`;
      params.push(offset);
      params.push(limit);
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error: any) {
      logger.error('[MatchHistoryRepository] 查询历史记录失败:', error.message);
      throw error;
    }
  }

  async countByDate(snapshotDate: string, source?: 'crown' | 'isports' | 'oddsapi'): Promise<number> {
    try {
      let query = `SELECT COUNT(*) FROM match_history WHERE snapshot_date = $1`;
      const params: any[] = [snapshotDate];
      if (source) {
        query += ` AND source = $2`;
        params.push(source);
      }
      const result = await pool.query(query, params);
      return parseInt(result.rows[0].count, 10);
    } catch (error: any) {
      logger.error('[MatchHistoryRepository] 统计历史记录失败:', error.message);
      throw error;
    }
  }
}

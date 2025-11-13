import logger from '../utils/logger';
import { CrownMatchRepository } from '../repositories/CrownMatchRepository';
import { ThirdpartyMatchRepository } from '../repositories/ThirdpartyMatchRepository';
import { MatchHistoryRepository } from '../repositories/MatchHistoryRepository';

export class MatchHistoryService {
  private interval?: NodeJS.Timeout;
  private lastSnapshotDate?: string;
  private readonly snapshotIntervalMs: number;

  constructor(
    private crownRepo = new CrownMatchRepository(),
    private thirdRepo = new ThirdpartyMatchRepository(),
    private historyRepo = new MatchHistoryRepository(),
    snapshotIntervalHours: number = 1
  ) {
    this.snapshotIntervalMs = snapshotIntervalHours * 60 * 60 * 1000;
  }

  start(): void {
    this.takeSnapshotIfNeeded(true).catch(error =>
      logger.error('[MatchHistoryService] 初始快照失败:', error)
    );

    this.interval = setInterval(() => {
      this.takeSnapshotIfNeeded().catch(error =>
        logger.error('[MatchHistoryService] 定时快照失败:', error)
      );
    }, this.snapshotIntervalMs);

    logger.info('[MatchHistoryService] 已启动，间隔 %d 小时', this.snapshotIntervalMs / 3600000);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
      logger.info('[MatchHistoryService] 已停止');
    }
  }

  private async takeSnapshotIfNeeded(force: boolean = false): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    if (!force && this.lastSnapshotDate === today) {
      return;
    }

    await this.recordDailySnapshot(today);
    this.lastSnapshotDate = today;
  }

  private async recordDailySnapshot(snapshotDate: string): Promise<void> {
    logger.info(`[MatchHistoryService] 开始记录 ${snapshotDate} 的赛事快照...`);

    const [crownMatches, thirdpartyMatches] = await Promise.all([
      this.crownRepo.findAll(),
      this.thirdRepo.findAll(),
    ]);

    const records = [
      ...crownMatches.map(match => ({
        match_id: match.gid,
        source: 'crown' as const,
        snapshot_date: snapshotDate,
        data: match,
      })),
      ...thirdpartyMatches.map(match => ({
        match_id: match.id,
        source: 'isports' as const,
        snapshot_date: snapshotDate,
        data: match,
      })),
    ];

    if (records.length === 0) {
      logger.info('[MatchHistoryService] 没有可记录的赛事');
      return;
    }

    await this.historyRepo.bulkInsert(records);
    logger.info('[MatchHistoryService] 已记录 %d 场赛事', records.length);
  }
}

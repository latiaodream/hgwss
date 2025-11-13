import { Router, Request, Response } from 'express';
import { MatchHistoryRepository } from '../repositories/MatchHistoryRepository';
import logger from '../utils/logger';

const router = Router();
const historyRepository = new MatchHistoryRepository();

router.get('/daily', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const sourceParam = req.query.source as string | undefined;
    const source = sourceParam === 'crown' || sourceParam === 'isports' || sourceParam === 'oddsapi'
      ? sourceParam
      : undefined;

    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize as string) || 50, 1), 200);
    const offset = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      historyRepository.findByDate(date, source as any, offset, pageSize),
      historyRepository.countByDate(date, source as any),
    ]);

    res.json({
      success: true,
      data: records,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    });
  } catch (error: any) {
    logger.error('[API] 获取历史赛事失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

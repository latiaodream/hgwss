/**
 * 第三方 API 数据路由
 */

import { Router, Request, Response } from 'express';
import { ThirdPartyManager } from '../scrapers/ThirdPartyManager';
import logger from '../utils/logger';

const router = Router();

// 全局 ThirdPartyManager 实例（将在 index.ts 中初始化）
let thirdPartyManager: ThirdPartyManager | null = null;

/**
 * 设置 ThirdPartyManager 实例
 */
export function setThirdPartyManager(manager: ThirdPartyManager) {
  thirdPartyManager = manager;
}

/**
 * GET /api/thirdparty/isports
 * 获取 iSportsAPI 数据
 */
router.get('/isports', async (req: Request, res: Response) => {
  try {
    if (!thirdPartyManager) {
      return res.status(503).json({
        success: false,
        error: '第三方服务未初始化',
      });
    }

    const { status, refresh } = req.query;

    // 如果需要刷新数据
    if (refresh === 'true' || refresh === '1') {
      await thirdPartyManager.fetchISports();
    }

    let matches = thirdPartyManager.getISportsCachedData();

    // 按状态筛选
    if (status && typeof status === 'string') {
      matches = matches.filter(m => m.status === status);
    }

    res.json({
      success: true,
      data: matches,
      count: matches.length,
      source: 'iSportsAPI',
    });
  } catch (error: any) {
    logger.error('[API] 获取 iSportsAPI 数据失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/thirdparty/odds-api
 * 获取 Odds-API.io 数据
 */
router.get('/odds-api', async (req: Request, res: Response) => {
  try {
    if (!thirdPartyManager) {
      return res.status(503).json({
        success: false,
        error: '第三方服务未初始化',
      });
    }

    const { status, refresh } = req.query;

    // 如果需要刷新数据
    if (refresh === 'true' || refresh === '1') {
      await thirdPartyManager.fetchOddsAPI();
    }

    let matches = thirdPartyManager.getOddsAPICachedData();

    // 按状态筛选
    if (status && typeof status === 'string') {
      matches = matches.filter(m => m.status === status);
    }

    res.json({
      success: true,
      data: matches,
      count: matches.length,
      source: 'Odds-API.io',
    });
  } catch (error: any) {
    logger.error('[API] 获取 Odds-API.io 数据失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/thirdparty/all
 * 获取所有第三方数据
 */
router.get('/all', async (req: Request, res: Response) => {
  try {
    if (!thirdPartyManager) {
      return res.status(503).json({
        success: false,
        error: '第三方服务未初始化',
      });
    }

    const { refresh } = req.query;

    // 如果需要刷新数据
    if (refresh === 'true' || refresh === '1') {
      await thirdPartyManager.fetchAll();
    }

    const data = thirdPartyManager.getCachedData();

    res.json({
      success: true,
      data,
      count: {
        isports: data.isports.length,
        oddsapi: data.oddsapi.length,
        total: data.isports.length + data.oddsapi.length,
      },
    });
  } catch (error: any) {
    logger.error('[API] 获取所有第三方数据失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/thirdparty/status
 * 获取第三方服务状态
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    if (!thirdPartyManager) {
      return res.status(503).json({
        success: false,
        error: '第三方服务未初始化',
      });
    }

    const status = thirdPartyManager.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error('[API] 获取服务状态失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/thirdparty/refresh
 * 手动刷新所有数据
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    if (!thirdPartyManager) {
      return res.status(503).json({
        success: false,
        error: '第三方服务未初始化',
      });
    }

    const data = await thirdPartyManager.fetchAll();

    res.json({
      success: true,
      data,
      count: {
        isports: data.isports.length,
        oddsapi: data.oddsapi.length,
        total: data.isports.length + data.oddsapi.length,
      },
      message: '数据刷新成功',
    });
  } catch (error: any) {
    logger.error('[API] 刷新数据失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;


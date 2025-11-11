/**
 * 球队名称映射管理 API 路由
 */

import { Router, Request, Response } from 'express';
import { MappingManager } from '../utils/MappingManager';
import logger from '../utils/logger';

const router = Router();
const mappingManager = new MappingManager();

/**
 * GET /api/mapping/teams
 * 获取所有映射
 */
router.get('/teams', (req: Request, res: Response) => {
  try {
    const { search, league, verified, minConfidence } = req.query;

    let mappings = mappingManager.getAllMappings();

    // 搜索
    if (search && typeof search === 'string') {
      mappings = mappingManager.searchMappings(search);
    }

    // 按联赛筛选
    if (league && typeof league === 'string') {
      mappings = mappingManager.filterByLeague(league);
    }

    // 按验证状态筛选
    if (verified !== undefined) {
      const isVerified = verified === 'true' || verified === '1';
      mappings = mappings.filter(m => m.verified === isVerified);
    }

    // 按置信度筛选
    if (minConfidence && typeof minConfidence === 'string') {
      const min = parseFloat(minConfidence);
      if (!isNaN(min)) {
        mappings = mappings.filter(m => m.match_confidence >= min);
      }
    }

    res.json({
      success: true,
      data: mappings,
      count: mappings.length,
    });
  } catch (error: any) {
    logger.error('[API] 获取映射失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/mapping/teams/:id
 * 获取单个映射
 */
router.get('/teams/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mapping = mappingManager.getMappingById(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: '映射不存在',
      });
    }

    res.json({
      success: true,
      data: mapping,
    });
  } catch (error: any) {
    logger.error('[API] 获取映射失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mapping/teams
 * 创建新映射
 */
router.post('/teams', (req: Request, res: Response) => {
  try {
    const { crown, isports, odds_api, match_confidence, verified } = req.body;

    if (!crown || !isports || !odds_api) {
      return res.status(400).json({
        success: false,
        error: '缺少必要字段',
      });
    }

    const mapping = mappingManager.createMapping({
      crown,
      isports,
      odds_api,
      match_confidence: match_confidence || 0.5,
      verified: verified || false,
    });

    res.json({
      success: true,
      data: mapping,
    });
  } catch (error: any) {
    logger.error('[API] 创建映射失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/mapping/teams/:id
 * 更新映射
 */
router.put('/teams/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const mapping = mappingManager.updateMapping(id, updates);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: '映射不存在',
      });
    }

    res.json({
      success: true,
      data: mapping,
    });
  } catch (error: any) {
    logger.error('[API] 更新映射失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/mapping/teams/:id
 * 删除映射
 */
router.delete('/teams/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = mappingManager.deleteMapping(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: '映射不存在',
      });
    }

    res.json({
      success: true,
      message: '删除成功',
    });
  } catch (error: any) {
    logger.error('[API] 删除映射失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mapping/teams/batch
 * 批量导入映射
 */
router.post('/teams/batch', (req: Request, res: Response) => {
  try {
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
      return res.status(400).json({
        success: false,
        error: 'mappings 必须是数组',
      });
    }

    const imported = mappingManager.importMappings(mappings);

    res.json({
      success: true,
      data: imported,
      count: imported.length,
    });
  } catch (error: any) {
    logger.error('[API] 批量导入失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/mapping/verify/:id
 * 验证映射
 */
router.post('/verify/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mapping = mappingManager.verifyMapping(id);

    if (!mapping) {
      return res.status(404).json({
        success: false,
        error: '映射不存在',
      });
    }

    res.json({
      success: true,
      data: mapping,
    });
  } catch (error: any) {
    logger.error('[API] 验证映射失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/mapping/statistics
 * 获取统计信息
 */
router.get('/statistics', (req: Request, res: Response) => {
  try {
    const stats = mappingManager.getStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('[API] 获取统计信息失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;


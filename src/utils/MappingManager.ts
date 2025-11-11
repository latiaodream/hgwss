/**
 * 球队名称映射管理器
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TeamMapping, TeamMappingData } from '../types/mapping';
import logger from './logger';

export class MappingManager {
  private mappingFilePath: string;
  private mappings: Map<string, TeamMapping> = new Map();

  constructor(mappingFilePath?: string) {
    this.mappingFilePath = mappingFilePath || path.join(process.cwd(), 'data', 'team-mapping.json');
    this.loadMappings();
  }

  /**
   * 加载映射数据
   */
  private loadMappings(): void {
    try {
      if (!fs.existsSync(this.mappingFilePath)) {
        logger.warn(`[MappingManager] 映射文件不存在: ${this.mappingFilePath}`);
        this.saveMappings();
        return;
      }

      const data = fs.readFileSync(this.mappingFilePath, 'utf-8');
      const mappingData: TeamMappingData = JSON.parse(data);

      this.mappings.clear();
      mappingData.mappings.forEach(mapping => {
        this.mappings.set(mapping.id, mapping);
      });

      logger.info(`[MappingManager] 加载 ${this.mappings.size} 条映射`);
    } catch (error: any) {
      logger.error('[MappingManager] 加载映射失败:', error.message);
    }
  }

  /**
   * 保存映射数据
   */
  private saveMappings(): void {
    try {
      const mappingData: TeamMappingData = {
        mappings: Array.from(this.mappings.values()),
      };

      const dir = path.dirname(this.mappingFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(this.mappingFilePath, JSON.stringify(mappingData, null, 2), 'utf-8');
      logger.info(`[MappingManager] 保存 ${this.mappings.size} 条映射`);
    } catch (error: any) {
      logger.error('[MappingManager] 保存映射失败:', error.message);
    }
  }

  /**
   * 获取所有映射
   */
  getAllMappings(): TeamMapping[] {
    return Array.from(this.mappings.values());
  }

  /**
   * 根据 ID 获取映射
   */
  getMappingById(id: string): TeamMapping | undefined {
    return this.mappings.get(id);
  }

  /**
   * 创建新映射
   */
  createMapping(mapping: Omit<TeamMapping, 'id' | 'created_at' | 'updated_at'>): TeamMapping {
    const newMapping: TeamMapping = {
      ...mapping,
      id: uuidv4(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.mappings.set(newMapping.id, newMapping);
    this.saveMappings();

    logger.info(`[MappingManager] 创建映射: ${newMapping.id}`);
    return newMapping;
  }

  /**
   * 更新映射
   */
  updateMapping(id: string, updates: Partial<Omit<TeamMapping, 'id' | 'created_at'>>): TeamMapping | null {
    const existing = this.mappings.get(id);
    if (!existing) {
      logger.warn(`[MappingManager] 映射不存在: ${id}`);
      return null;
    }

    const updated: TeamMapping = {
      ...existing,
      ...updates,
      id: existing.id,
      created_at: existing.created_at,
      updated_at: new Date().toISOString(),
    };

    this.mappings.set(id, updated);
    this.saveMappings();

    logger.info(`[MappingManager] 更新映射: ${id}`);
    return updated;
  }

  /**
   * 删除映射
   */
  deleteMapping(id: string): boolean {
    const deleted = this.mappings.delete(id);
    if (deleted) {
      this.saveMappings();
      logger.info(`[MappingManager] 删除映射: ${id}`);
    } else {
      logger.warn(`[MappingManager] 映射不存在: ${id}`);
    }
    return deleted;
  }

  /**
   * 批量导入映射
   */
  importMappings(mappings: Omit<TeamMapping, 'id' | 'created_at' | 'updated_at'>[]): TeamMapping[] {
    const imported: TeamMapping[] = [];

    for (const mapping of mappings) {
      const newMapping = this.createMapping(mapping);
      imported.push(newMapping);
    }

    logger.info(`[MappingManager] 批量导入 ${imported.length} 条映射`);
    return imported;
  }

  /**
   * 验证映射
   */
  verifyMapping(id: string): TeamMapping | null {
    return this.updateMapping(id, { verified: true });
  }

  /**
   * 搜索映射
   */
  searchMappings(query: string): TeamMapping[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.mappings.values()).filter(mapping => {
      return (
        mapping.crown.team_home.toLowerCase().includes(lowerQuery) ||
        mapping.crown.team_away.toLowerCase().includes(lowerQuery) ||
        mapping.crown.league.toLowerCase().includes(lowerQuery) ||
        mapping.isports.team_home_cn.toLowerCase().includes(lowerQuery) ||
        mapping.isports.team_home_en.toLowerCase().includes(lowerQuery) ||
        mapping.isports.team_away_cn.toLowerCase().includes(lowerQuery) ||
        mapping.isports.team_away_en.toLowerCase().includes(lowerQuery) ||
        mapping.odds_api.team_home_cn.toLowerCase().includes(lowerQuery) ||
        mapping.odds_api.team_home_en.toLowerCase().includes(lowerQuery) ||
        mapping.odds_api.team_away_cn.toLowerCase().includes(lowerQuery) ||
        mapping.odds_api.team_away_en.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 按联赛筛选
   */
  filterByLeague(league: string): TeamMapping[] {
    const lowerLeague = league.toLowerCase();
    return Array.from(this.mappings.values()).filter(mapping => {
      return (
        mapping.crown.league.toLowerCase().includes(lowerLeague) ||
        mapping.isports.league_cn.toLowerCase().includes(lowerLeague) ||
        mapping.isports.league_en.toLowerCase().includes(lowerLeague) ||
        mapping.odds_api.league_cn.toLowerCase().includes(lowerLeague) ||
        mapping.odds_api.league_en.toLowerCase().includes(lowerLeague)
      );
    });
  }

  /**
   * 按验证状态筛选
   */
  filterByVerified(verified: boolean): TeamMapping[] {
    return Array.from(this.mappings.values()).filter(mapping => mapping.verified === verified);
  }

  /**
   * 按置信度筛选
   */
  filterByConfidence(minConfidence: number): TeamMapping[] {
    return Array.from(this.mappings.values()).filter(mapping => mapping.match_confidence >= minConfidence);
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    total: number;
    verified: number;
    unverified: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  } {
    const all = Array.from(this.mappings.values());
    return {
      total: all.length,
      verified: all.filter(m => m.verified).length,
      unverified: all.filter(m => !m.verified).length,
      highConfidence: all.filter(m => m.match_confidence >= 0.8).length,
      mediumConfidence: all.filter(m => m.match_confidence >= 0.5 && m.match_confidence < 0.8).length,
      lowConfidence: all.filter(m => m.match_confidence < 0.5).length,
    };
  }

  /**
   * 重新加载映射
   */
  reload(): void {
    this.loadMappings();
  }
}


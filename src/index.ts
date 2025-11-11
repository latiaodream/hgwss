import dotenv from 'dotenv';
import express from 'express';
import { ScraperManager } from './scrapers/ScraperManager';
import { WSServer } from './websocket/WSServer';
import { ThirdPartyManager } from './scrapers/ThirdPartyManager';
import { AccountConfig, ShowType } from './types';
import logger from './utils/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import mappingRouter from './routes/mapping';
import thirdpartyRouter, { setThirdPartyManager } from './routes/thirdparty';

// 加载环境变量
dotenv.config();

/**
 * 主应用类
 */
class Application {
  private scraperManager: ScraperManager;
  private thirdPartyManager?: ThirdPartyManager;
  private wsServer?: WSServer;
  private httpServer?: http.Server;
  private expressApp: express.Application;

  constructor() {
    this.scraperManager = new ScraperManager();
    this.expressApp = express();
    this.setupExpress();
  }

  /**
   * 设置 Express 中间件和路由
   */
  private setupExpress(): void {
    // 解析 JSON 请求体
    this.expressApp.use(express.json());
    this.expressApp.use(express.urlencoded({ extended: true }));

    // 静态文件服务
    this.expressApp.use(express.static(path.join(process.cwd(), 'public')));

    // API 路由
    this.expressApp.use('/api/mapping', mappingRouter);
    this.expressApp.use('/api/thirdparty', thirdpartyRouter);

    // 页面路由
    this.expressApp.get('/', (req, res) => {
      res.redirect('/matches');
    });

    this.expressApp.get('/matches', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'matches.html'));
    });

    this.expressApp.get('/matches-v2', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'matches-v2.html'));
    });

    this.expressApp.get('/team-mapping', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'team-mapping.html'));
    });

    this.expressApp.get('/thirdparty-odds', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'public', 'thirdparty-odds.html'));
    });

    // 404 处理
    this.expressApp.use((req, res) => {
      res.status(404).send('404 Not Found');
    });
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    logger.info('='.repeat(60));
    logger.info('🚀 皇冠数据抓取服务');
    logger.info('='.repeat(60));

    // 创建日志目录
    this.ensureLogDirectory();

    // 创建 PID 文件
    this.createPidFile();

    // 加载账号配置
    const accounts = this.loadAccounts();
    if (accounts.length === 0) {
      logger.error('❌ 没有配置任何账号，请检查环境变量');
      process.exit(1);
    }

    // 添加抓取器
    accounts.forEach(account => {
      this.scraperManager.addScraper(account);
    });

    // 启动抓取器
    await this.scraperManager.startAll();

    // 启动第三方 API 抓取器
    this.startThirdPartyManager();

    // 启动 WebSocket 服务器
    const wsPort = parseInt(process.env.WS_PORT || '8080');
    this.wsServer = new WSServer(wsPort, this.scraperManager);

    // 启动 HTTP 服务器（用于展示页面和 API）
    const httpPort = parseInt(process.env.HTTP_PORT || '10089');
    this.startHttpServer(httpPort);

    logger.info('='.repeat(60));
    logger.info('✅ 服务启动成功');
    logger.info(`📡 WebSocket 服务器: ws://localhost:${wsPort}`);
    logger.info(`🌐 HTTP 服务器: http://localhost:${httpPort}`);
    logger.info(`📄 页面:`);
    logger.info(`   - 皇冠赛事: http://localhost:${httpPort}/matches`);
    logger.info(`   - 第三方赔率: http://localhost:${httpPort}/thirdparty-odds`);
    logger.info(`   - 名称映射: http://localhost:${httpPort}/team-mapping`);
    logger.info(`🔑 认证令牌: ${process.env.WS_AUTH_TOKEN || 'default-token'}`);
    logger.info('='.repeat(60));
  }

  /**
   * 启动第三方 API 管理器
   */
  private startThirdPartyManager(): void {
    const isportsApiKey = process.env.ISPORTS_API_KEY || 'GvpziueL9ouzIJNj';
    const oddsapiApiKey = process.env.ODDSAPI_API_KEY || '17b831ef959c4e44e4c1e587ee60364ee91b3baac528894b83be1aa017d14620';
    const fetchInterval = parseInt(process.env.THIRDPARTY_FETCH_INTERVAL || '300'); // 默认 5 分钟

    this.thirdPartyManager = new ThirdPartyManager(
      isportsApiKey,
      oddsapiApiKey,
      fetchInterval
    );

    // 设置到路由中
    setThirdPartyManager(this.thirdPartyManager);

    // 启动定时抓取
    this.thirdPartyManager.start();

    logger.info(`🌍 第三方 API 抓取器已启动 (间隔: ${fetchInterval}秒)`);
  }

  /**
   * 加载账号配置
   */
  private loadAccounts(): AccountConfig[] {
    const accounts: AccountConfig[] = [];

    this.appendSingleAccount(
      accounts,
      'live',
      process.env.LIVE_CROWN_USERNAME,
      process.env.LIVE_CROWN_PASSWORD,
      '滚球账号'
    );
    this.appendSingleAccount(
      accounts,
      'today',
      process.env.TODAY_CROWN_USERNAME,
      process.env.TODAY_CROWN_PASSWORD,
      '今日账号'
    );
    this.appendSingleAccount(
      accounts,
      'early',
      process.env.EARLY_CROWN_USERNAME,
      process.env.EARLY_CROWN_PASSWORD,
      '早盘账号'
    );

    this.appendAccountPool(accounts, 'live', process.env.LIVE_ACCOUNT_POOL, '滚球账号池');
    this.appendAccountPool(accounts, 'today', process.env.TODAY_ACCOUNT_POOL, '今日账号池');
    this.appendAccountPool(accounts, 'early', process.env.EARLY_ACCOUNT_POOL, '早盘账号池');

    return accounts;
  }

  private appendSingleAccount(
    accounts: AccountConfig[],
    showType: ShowType,
    username?: string,
    password?: string,
    label?: string
  ): void {
    if (!username || !password) return;
    accounts.push({ username, password, showType });
    logger.info(`✅ 加载${label || showType}：${username}`);
  }

  private appendAccountPool(
    accounts: AccountConfig[],
    showType: ShowType,
    raw?: string,
    label?: string
  ): void {
    if (!raw) return;
    const entries = raw
      .split(/[\r\n,]+/)
      .map(item => item.trim())
      .filter(Boolean);

    entries.forEach((entry, idx) => {
      const [username, password] = entry.includes('/') ? entry.split('/') : entry.split(':');
      if (!username || !password) {
        logger.warn(`⚠️ ${label || showType} 中的账号格式无效: ${entry}`);
        return;
      }
      accounts.push({
        username: username.trim(),
        password: password.trim(),
        showType,
      });
      logger.info(`✅ 加载${label || showType} #${idx + 1}: ${username.trim()}`);
    });
  }

  /**
   * 确保日志目录存在
   */
  private ensureLogDirectory(): void {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * 创建 PID 文件
   */
  private createPidFile(): void {
    const pidFile = path.join(process.cwd(), 'crown-scraper.pid');

    // 检查是否有旧的 PID 文件
    if (fs.existsSync(pidFile)) {
      const oldPid = fs.readFileSync(pidFile, 'utf-8').trim();
      logger.warn(`⚠️ 检测到旧的 PID 文件: ${oldPid}`);
      logger.warn(`⚠️ 如果旧进程还在运行，请先停止它以避免账号被封`);

      // 删除旧的 PID 文件
      fs.unlinkSync(pidFile);
    }

    // 写入当前进程 PID
    fs.writeFileSync(pidFile, process.pid.toString());
    logger.info(`📝 PID 文件已创建: ${process.pid}`);
  }

  /**
   * 删除 PID 文件
   */
  private removePidFile(): void {
    const pidFile = path.join(process.cwd(), 'crown-scraper.pid');
    if (fs.existsSync(pidFile)) {
      fs.unlinkSync(pidFile);
      logger.info('🗑️ PID 文件已删除');
    }
  }

  /**
   * 启动 HTTP 服务器
   */
  private startHttpServer(port: number): void {
    this.httpServer = this.expressApp.listen(port, () => {
      logger.info(`HTTP 服务器启动在端口 ${port}`);
    });
  }

  /**
   * 优雅关闭
   */
  async shutdown(): Promise<void> {
    logger.info('🛑 正在关闭服务...');

    try {
      // 1. 停止抓取器并登出所有账号
      logger.info('1️⃣ 停止抓取器并登出账号...');
      await this.scraperManager.stopAll();

      // 2. 停止第三方 API 抓取器
      logger.info('2️⃣ 停止第三方 API 抓取器...');
      if (this.thirdPartyManager) {
        this.thirdPartyManager.stop();
      }

      // 3. 关闭 WebSocket 服务器
      logger.info('3️⃣ 关闭 WebSocket 服务器...');
      if (this.wsServer) {
        this.wsServer.close();
      }

      // 4. 关闭 HTTP 服务器
      logger.info('4️⃣ 关闭 HTTP 服务器...');
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          if (this.httpServer) {
            this.httpServer.close(() => resolve());
          } else {
            resolve();
          }
        });
      }

      // 5. 删除 PID 文件
      this.removePidFile();

      logger.info('✅ 服务已安全关闭');
      process.exit(0);
    } catch (error: any) {
      logger.error('❌ 关闭服务时出错:', error.message);
      this.removePidFile();
      process.exit(1);
    }
  }
}

// 创建应用实例
const app = new Application();

// 启动应用
app.initialize().catch(error => {
  logger.error('启动失败:', error);
  process.exit(1);
});

// 处理退出信号
process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号');
  app.shutdown();
});

process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号');
  app.shutdown();
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  app.shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的 Promise 拒绝:', reason);
  app.shutdown();
});

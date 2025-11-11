/**
 * 测试 get_game_more 接口的风控策略
 * 目标：找出不会触发 CheckEMNU 的请求方式
 */

import axios, { AxiosInstance } from 'axios';
import * as xml2js from 'xml2js';
import * as https from 'https';

interface TestConfig {
  username: string;
  password: string;
  baseUrl: string;
  version: string;
  delayBetweenRequests: number; // 请求间隔（毫秒）
  warmupSteps: string[]; // 预热步骤
  useProxy: boolean;
  userAgent: string;
}

class GameMoreTester {
  private client: AxiosInstance;
  private config: TestConfig;
  private uid: string = '';
  private cookies: string[] = [];
  private testResults: any[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `https://${config.baseUrl}`,
      timeout: 30000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
      headers: {
        'User-Agent': config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    // 拦截器：自动管理 Cookie
    this.client.interceptors.request.use((config) => {
      if (this.cookies.length > 0) {
        config.headers['Cookie'] = this.cookies.join('; ');
      }
      return config;
    });

    this.client.interceptors.response.use((response) => {
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        setCookie.forEach((cookie: string) => {
          const cookieName = cookie.split('=')[0];
          const existingIndex = this.cookies.findIndex(c => c.startsWith(cookieName + '='));
          if (existingIndex >= 0) {
            this.cookies[existingIndex] = cookie.split(';')[0];
          } else {
            this.cookies.push(cookie.split(';')[0]);
          }
        });
      }
      return response;
    });
  }

  private log(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  private async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async parseXML(xml: string): Promise<any> {
    const parser = new xml2js.Parser({ explicitArray: false });
    return parser.parseStringPromise(xml);
  }

  /**
   * 步骤1：预热 - 访问首页和会员页面
   */
  private async warmUp(): Promise<boolean> {
    this.log('=== 步骤1：预热访问 ===');
    
    for (const path of this.config.warmupSteps) {
      try {
        this.log(`访问: ${path}`);
        await this.client.get(path);
        await this.delay(this.config.delayBetweenRequests);
      } catch (error: any) {
        this.log(`预热失败: ${path}`, error.message);
      }
    }
    
    return true;
  }

  /**
   * 获取 BlackBox
   */
  private getBlackBox(): string {
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const random2 = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const random3 = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const random4 = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const random5 = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    return `0400${random1}${random2}@${random3}@${random4};${random5}${timestamp}`;
  }

  /**
   * 步骤2：登录
   */
  private async login(): Promise<boolean> {
    this.log('=== 步骤2：登录 ===');

    try {
      // 获取 BlackBox
      const blackbox = this.getBlackBox();

      // Base64 编码 UserAgent
      const encodedUA = Buffer.from(this.config.userAgent).toString('base64');

      const params = new URLSearchParams({
        p: 'chk_login',
        langx: 'zh-cn',
        ver: this.config.version,
        username: this.config.username,
        password: this.config.password,
        app: 'N',
        auto: 'CFHFID',
        blackbox,
        userAgent: encodedUA,
      });

      const url = `/transform.php?ver=${this.config.version}`;
      this.log(`POST ${url}`);

      const response = await this.client.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `https://${this.config.baseUrl}/app/member/`,
        },
      });

      const result = await this.parseXML(response.data);
      const server = (result as any).serverresponse || (result as any);

      this.log('登录响应:', {
        status: server.status,
        msg: server.msg,
        uid: server.uid,
      });

      // 判定成功：msg=100/109 或 status=success/200，且返回了 uid
      const ok = ((server.msg === '100' || server.msg === '109') || (server.status === 'success' || server.status === '200')) && !!server.uid;
      if (ok) {
        this.uid = server.uid;
        this.log(`✅ 登录成功，UID: ${this.uid}`);
        return true;
      } else {
        this.log('❌ 登录失败', result);
        return false;
      }
    } catch (error: any) {
      this.log('❌ 登录异常', error.message);
      if (error.response) {
        this.log('响应状态:', error.response.status);
        this.log('响应数据:', error.response.data?.substring(0, 200));
      }
      return false;
    }
  }

  /**
   * 步骤3：浏览赛事列表（模拟正常用户行为）
   */
  private async browseMatchList(): Promise<any[]> {
    this.log('=== 步骤3：浏览赛事列表 ===');
    
    try {
      const params = new URLSearchParams({
        uid: this.uid,
        ver: this.config.version,
        langx: 'zh-cn',
        p: 'get_game_list',
        p3type: '',
        date: '',
        gtype: 'ft',
        showtype: 'live',
        rtype: 'rb',
        ltype: '3',
        filter: '',
        cupFantasy: 'N',
        sorttype: 'L',
        specialClick: '',
        isFantasy: 'N',
        isRB: 'Y',
        g_date: '',
        page_no: '0',
        ts: Date.now().toString(),
      });

      const response = await this.client.post(`/transform.php?ver=${this.config.version}`, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `https://${this.config.baseUrl}/app/member/FT_browse/index.php?rtype=rb&langx=zh-cn`,
        },
      });

      const rawText = typeof response.data === 'string' ? response.data : '';
      let result: any;
      try {
        result = await this.parseXML(rawText);
      } catch (e: any) {
        this.log('浏览列表响应片段(前300字节)', rawText.slice(0, 300));
        throw e;
      }
      const games = result.serverresponse?.game || [];
      const gameList = Array.isArray(games) ? games : [games];

      this.log(`获取到 ${gameList.length} 场赛事`);
      return gameList.filter(g => g && g.gid);
    } catch (error: any) {
      this.log('浏览赛事列表失败', error.message);
      return [];
    }
  }

  /**
   * 步骤4：测试 get_game_more 接口
   */
  private async testGameMore(gid: string, league: string, strategy: string): Promise<any> {
    this.log(`=== 测试策略: ${strategy} ===`);
    this.log(`测试赛事 GID: ${gid}, 联赛: ${league}`);
    
    const testResult = {
      strategy,
      gid,
      league,
      success: false,
      hasCheckEMNU: false,
      responseTime: 0,
      error: null as any,
      timestamp: new Date().toISOString(),
    };

    try {
      const startTime = Date.now();
      
      const params = new URLSearchParams({
        uid: this.uid,
        ver: this.config.version,
        langx: 'zh-cn',
        p: 'get_game_more',
        gtype: 'FT',
        showtype: 'live',
        ltype: '3',
        isRB: 'Y',
        lid: league,
        specialClick: '',
        mode: 'NORMAL',
        from: 'game_more',
        filter: 'Main',
        ts: Date.now().toString(),
        ecid: gid,
      });

      const response = await this.client.post(`/transform.php?ver=${this.config.version}`, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `https://${this.config.baseUrl}/app/member/FT_browse/index.php?rtype=rb&langx=zh-cn`,
        },
      });

      testResult.responseTime = Date.now() - startTime;

      // 检查响应内容
      const responseText = response.data;
      
      if (responseText.includes('CheckEMNU') || responseText.includes('风险') || responseText.includes('异常')) {
        testResult.hasCheckEMNU = true;
        this.log('❌ 触发风控：CheckEMNU');
      } else {
        const result = await this.parseXML(responseText);
        const games = result.serverresponse?.game || [];
        const gameList = Array.isArray(games) ? games : [games];
        
        if (gameList.length > 0 && gameList[0].gid) {
          testResult.success = true;
          this.log(`✅ 成功获取多盘口数据，共 ${gameList.length} 个盘口`);
        } else {
          this.log('⚠️  响应格式异常', result);
        }
      }
    } catch (error: any) {
      testResult.error = error.message;
      this.log('❌ 请求失败', error.message);
    }

    this.testResults.push(testResult);
    return testResult;
  }

  /**
   * 运行完整测试流程
   */
  async runTest() {
    this.log('========================================');
    this.log('开始测试 get_game_more 风控策略');
    this.log('========================================');
    this.log('配置信息:', {
      username: this.config.username,
      baseUrl: this.config.baseUrl,
      delayBetweenRequests: this.config.delayBetweenRequests,
      userAgent: this.config.userAgent,
    });

    // 步骤1：预热
    await this.warmUp();
    await this.delay(2000);

    // 步骤2：登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      this.log('登录失败，测试终止');
      return;
    }
    await this.delay(3000);

    // 步骤3：浏览赛事列表
    const matches = await this.browseMatchList();
    if (matches.length === 0) {
      this.log('没有可用的赛事，测试终止');
      return;
    }
    await this.delay(5000);

    // 步骤4：测试不同策略
    const testMatch = matches[0];
    const gid = testMatch.gid;
    const league = testMatch.league || '';

    // 策略1：立即请求（基线测试）
    await this.testGameMore(gid, league, '策略1: 立即请求');
    await this.delay(10000);

    // 策略2：等待10秒后请求
    this.log('等待10秒...');
    await this.delay(10000);
    await this.testGameMore(gid, league, '策略2: 等待10秒后请求');
    await this.delay(10000);

    // 策略3：先浏览其他赛事，再请求目标赛事
    this.log('浏览其他赛事...');
    if (matches.length > 1) {
      await this.browseMatchList();
      await this.delay(5000);
    }
    await this.testGameMore(gid, league, '策略3: 浏览其他赛事后请求');

    // 输出测试结果
    this.log('========================================');
    this.log('测试结果汇总');
    this.log('========================================');
    this.testResults.forEach((result, index) => {
      this.log(`\n测试 ${index + 1}: ${result.strategy}`);
      this.log(`  成功: ${result.success ? '✅' : '❌'}`);
      this.log(`  触发风控: ${result.hasCheckEMNU ? '❌ 是' : '✅ 否'}`);
      this.log(`  响应时间: ${result.responseTime}ms`);
      if (result.error) {
        this.log(`  错误: ${result.error}`);
      }
    });
  }
}

// 运行测试 - 尝试多个域名（固定为 hga026.com）
const domains = ['hga026.com'];

async function runTestWithDomains() {
  for (const domain of domains) {
    console.log(`\n\n尝试域名: ${domain}`);
    console.log('='.repeat(50));

    const config: TestConfig = {
      username: 'WjeLaA68i0',
      password: 'I0FQsaTFFUHg',
      baseUrl: domain,
      version: '2025-10-16-fix342_120',
      delayBetweenRequests: 2000,
      warmupSteps: [
        '/',
        '/app/member/',
        '/app/member/mem_login.php?langx=zh-cn',
      ],
      useProxy: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const tester = new GameMoreTester(config);
    try {
      await tester.runTest();
      break; // 如果成功，停止尝试其他域名
    } catch (error) {
      console.error(`域名 ${domain} 测试失败:`, error);
    }
  }
}

runTestWithDomains().catch(console.error);


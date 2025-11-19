import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'config.json');

const args = parseArgs(process.argv);

main().catch((err) => {
  console.error('❌ 捕获登录信息失败:', err.message);
  process.exitCode = 1;
});

async function main() {
  const config = JSON.parse(await readFile(configPath, 'utf-8'));
  if (!config.username || !config.password) {
    throw new Error('请在 config.json 中配置 username 和 password');
  }

  if (!config.userAgent) {
    throw new Error('请在 config.json 中配置 userAgent，以便脚本模拟真实浏览器');
  }

  let email = config.email;
  if (!email) {
    email = (await prompt('请输入账号绑定的邮箱: ')).trim();
    if (!email) throw new Error('邮箱不能为空');
    config.email = email;
  }

  // 验证码将在登录流程中动态获取
  let code = args.get('code');

  const headless = args.has('headless')
    ? args.get('headless') !== 'false'
    : true;
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    userAgent: config.userAgent,
    locale: 'zh-CN',
    extraHTTPHeaders: normalizeHeaders(config.wsHeaders)
  });
  const page = await context.newPage();

  // 监听 WebSocket，捕获 gw.xbetbot.com 上的 token
  let wsToken = null;
  let httpToken = null;
  let storageToken = null;

  page.on('websocket', (ws) => {
    try {
      const url = new URL(ws.url());
      if (url.hostname === 'gw.xbetbot.com') {
        const token = url.searchParams.get('token');
        if (token) {
          wsToken = token;
          console.log('🔑 捕获到 WebSocket token:', `${token.slice(0, 16)}...`);
        } else {
          console.log('⚠️ 捕获到 gw.xbetbot.com WebSocket，但 URL 中没有 token 参数:', url.toString());
        }
      }
    } catch (err) {
      console.log('⚠️ 解析 WebSocket URL 失败:', ws.url(), err);
    }
  });

  // 监听所有 HTTP 响应，尝试从 JSON 里提取 token
  page.on('response', async (response) => {
    try {
      const urlStr = response.url();
      const url = new URL(urlStr);
      if (!url.hostname.includes('xbetbot.com')) return;

      const headers = response.headers();
      const contentType = headers['content-type'] || headers['Content-Type'] || '';
      if (!contentType.includes('application/json')) return;

      let data;
      try {
        data = await response.json();
      } catch {
        return;
      }

      const token = extractTokenFromJson(data);
      if (token && !httpToken) {
        httpToken = token;
        console.log(
          '🔑 从 HTTP 响应中捕获到 token:',
          `${token.slice(0, 16)}...`,
          'URL:',
          urlStr
        );
      } else if (!httpToken) {
        // 调试：打印 JSON 中的一些长字符串候选，方便人工分析
        const candidates = [];
        const stack = [{ value: data, path: '$' }];
        while (stack.length && candidates.length < 10) {
          const { value, path } = stack.pop();
          if (!value || typeof value !== 'object') continue;
          for (const [key, v] of Object.entries(value)) {
            const childPath = `${path}.${key}`;
            if (typeof v === 'string') {
              if (v.length >= 32) {
                candidates.push({ path: childPath, value: v });
              }
            } else if (v && typeof v === 'object') {
              stack.push({ value: v, path: childPath });
            }
          }
        }
        if (candidates.length) {
          console.log('🔍 JSON 响应中发现一些长字符串候选 (可能是 token/sessionId)，URL:', urlStr);
          for (const c of candidates.slice(0, 5)) {
            console.log('  ·', c.path, '长度 =', c.value.length, '前缀 =', `${c.value.slice(0, 24)}...`);
          }
        }
      }
    } catch (err) {
      console.log('⚠️ 解析 HTTP 响应时出错:', err.message || err);
    }
  });

  console.log('🌐 打开登录页面...');
  await page.goto(args.get('url') || 'https://b.xbetbot.com/login?redirect=/home', { waitUntil: 'domcontentloaded' });

  // 等待页面加载
  await page.waitForTimeout(3000);

  // 调试：打印页面内容
  console.log('📄 页面标题:', await page.title());
  console.log('📄 页面 URL:', page.url());

  // 查找所有 input 元素
  const inputs = await page.locator('input').all();
  console.log(`📄 找到 ${inputs.length} 个 input 元素:`);
  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    const type = await input.getAttribute('type').catch(() => 'unknown');
    const placeholder = await input.getAttribute('placeholder').catch(() => '');
    const name = await input.getAttribute('name').catch(() => '');
    const id = await input.getAttribute('id').catch(() => '');
    console.log(`  [${i}] type="${type}" placeholder="${placeholder}" name="${name}" id="${id}"`);
  }

  // 查找所有 button 元素
  const buttons = await page.locator('button').all();
  console.log(`📄 找到 ${buttons.length} 个 button 元素:`);
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const text = await button.textContent().catch(() => '');
    console.log(`  [${i}] text="${text.trim()}"`);
  }

  // 读取现有的 deviceId（如果有）
  let existingDeviceId = null;
  const deviceIdPath = path.resolve(rootDir, config.deviceIdFile || '.xbet-device-id');
  try {
    existingDeviceId = (await readFile(deviceIdPath, 'utf-8')).trim();
    console.log('📱 使用现有 deviceId:', existingDeviceId);
  } catch (err) {
    console.log('📱 未找到现有 deviceId，将生成新的');
  }

  const did = await ensureDeviceId(page, existingDeviceId);
  console.log('📱 最终 deviceId:', did);

  // 步骤 1: 填写账号密码
  await fillLoginForm(page, config.username, config.password);

  console.log('🔐 点击登陆按钮...');
  await clickLoginButton(page);


  const state = await waitForHomeOrDialog(page);
  if (state === 'home') {
    console.log('✅ 已直接登录，无需验证码');
  } else if (state === 'dialog') {
    const dialogShot = `/tmp/login-dialog-${Date.now()}.png`;
    await page.screenshot({ path: dialogShot });
    console.log(`🪟 检测到验证码弹窗，已截图: ${dialogShot}`);
    code = await sendAndWaitForCode(page, code);
    await fillVerificationCode(page, code);
    await page.waitForURL('**/home**', { timeout: 20000 });
    console.log('✅ 验证码提交成功，已进入首页');
  } else {
    const failShot = `/tmp/login-failed-${Date.now()}.png`;
    await page.screenshot({ path: failShot });
    throw new Error(`未检测到首页或验证码弹窗，请查看截图 ${failShot}`);
  }

  if (!wsToken) {
    console.log('⌛ 登录成功，等待 WebSocket 建立以捕获 token...');
    await page.waitForTimeout(15000);
  }

  // 从浏览器上下文收集 xbetbot.com 相关 cookies，给 WebSocket 复用
  const allCookies = await context.cookies();
  const xbetCookies = allCookies.filter((c) => c.domain && c.domain.includes('xbetbot.com'));
  if (xbetCookies.length) {
    const cookieHeader = xbetCookies.map((c) => `${c.name}=${c.value}`).join('; ');
    config.wsHeaders = config.wsHeaders || {};
    config.wsHeaders.cookie = cookieHeader;
    console.log('🍪 捕获到 xbetbot.com cookies，用于 WebSocket:',
      cookieHeader.length > 160 ? cookieHeader.slice(0, 160) + '...' : cookieHeader
    );
  } else {
    console.log('⚠️ 未在浏览器上下文中找到任何 xbetbot.com cookie');
  }

  // 从 localStorage / sessionStorage 中尝试提取 token（备用方案）
  try {
    const storageSnapshot = await page.evaluate(() => {
      const dump = (storage) => {
        const result = {};
        if (!storage) return result;
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          result[key] = storage.getItem(key);
        }
        return result;
      };
      return {
        localStorage: dump(window.localStorage),
        sessionStorage: dump(window.sessionStorage)
      };
    });
    const found = findTokenInStorageSnapshot(storageSnapshot);
    if (found) {
      storageToken = found.value;
      console.log(
        `🔑 从 ${found.source} 中捕获到 token (${found.key}):`,
        `${storageToken.slice(0, 16)}...`
      );
    } else {
      console.log('ℹ️ localStorage/sessionStorage 中未发现明显的 token 字段');
    }
  } catch (err) {
    console.log('⚠️ 读取 localStorage/sessionStorage 失败:', err.message || err);
  }

  const payload = {
    did,
    ua: config.userAgent,
    usr: config.username,
    pwd: config.password,
    email,
    code
  };

  await writeFile(path.resolve(rootDir, config.deviceIdFile || '.xbet-device-id'), `${did}\n`, 'utf-8');

  const finalToken = wsToken || httpToken || storageToken;
  if (finalToken) {
    config.token = finalToken;
    console.log('✅ 将 token 写入 config.json:', `${finalToken.slice(0, 16)}...`);
  } else {
    console.warn('⚠️ 未捕获到任何 token，config.json 中的 token 将保持不变。');
  }

  // 可选：只在本次登录使用了验证码时才记录 code，避免旧验证码干扰判断
  if (code) {
    config.code = code;
  } else {
    delete config.code;
  }

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf-8');

  await browser.close();
  console.log('✅ 捕获完成，已更新 config.json 和 .xbet-device-id');
  console.log('登录 payload:', JSON.stringify(payload, null, 2));
  console.log('\n下一步：运行 npm run login:capture 获取最新验证码后，执行 pm2 restart xbet-adapter 或 node src/index.js 让配置生效。');
}

function extractTokenFromJson(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const queue = [obj];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const [key, value] of Object.entries(current)) {
      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('token') && value.length > 20) {
          return value;
        }
      } else if (value && typeof value === 'object') {
        queue.push(value);
      }
    }
  }

  return null;
}

function findTokenInStorageSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return null;

  const candidates = [];

  const pushCandidatesFrom = (store, source) => {
    if (!store || typeof store !== 'object') return;
    for (const [key, value] of Object.entries(store)) {
      if (typeof value !== 'string' || !value) continue;
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('token') || lowerKey.includes('auth')) {
        candidates.push({ source, key, value });
      }
    }
  };

  pushCandidatesFrom(snapshot.localStorage, 'localStorage');
  pushCandidatesFrom(snapshot.sessionStorage, 'sessionStorage');

  if (!candidates.length) return null;
  candidates.sort((a, b) => b.value.length - a.value.length);
  return candidates[0];
}


async function ensureDeviceId(page, existingDeviceId) {
  return await page.evaluate((existing) => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const ensureDid = () => {
      let stored = localStorage.getItem('did');
      if (!stored && existing) {
        localStorage.setItem('did', existing);
        stored = existing;
      }
      if (stored) return stored;
      let generated = '';
      while (generated.length < 21) {
        const random = Math.floor(Math.random() * alphabet.length);
        generated += alphabet[random];
      }
      localStorage.setItem('did', generated);
      return generated;
    };
    return ensureDid();
  }, existingDeviceId);
}

async function fillLoginForm(page, username, password) {
  // 使用实际的 ID 选择器
  const userInput = page.locator('#input-v-0');
  const passInput = page.locator('#input-v-2');

  console.log('📝 填写用户名和密码...');
  await userInput.waitFor({ timeout: 30000 });
  await userInput.fill(username);
  await passInput.fill(password);
}

async function sendAndWaitForCode(page, code) {
  // 等待验证码弹窗出现
  await page.waitForTimeout(1000);

  // 重新扫描所有 input
  const inputs = await page.locator('input').all();
  console.log(`📄 弹窗后有 ${inputs.length} 个 input 元素`);

  // 查找所有按钮
  const allButtons = await page.locator('button').all();
  console.log(`📄 弹窗后有 ${allButtons.length} 个 button 元素:`);
  for (let i = 0; i < allButtons.length; i++) {
    const button = allButtons[i];
    const text = await button.textContent().catch(() => '');
    console.log(`  [${i}] text="${text.trim()}"`);
  }

  // 查找所有包含"发送"的元素（div, span, button 等）
  console.log('🔍 查找所有包含"发送"的元素...');
  const allElements = await page.locator('*').all();
  let sendElement = null;
  for (const el of allElements) {
    const text = await el.textContent().catch(() => '');
    if (text && text.trim() === '发送') {
      console.log('✅ 找到"发送"元素:', await el.evaluate(e => e.tagName));
      sendElement = el;
      break;
    }
  }

  if (sendElement) {
    console.log('📧 点击"发送"按钮...');
    await sendElement.click();
    console.log('✅ 验证码已发送到邮箱！');
    await page.waitForTimeout(2000);
  } else {
    console.log('⚠️  未找到"发送"按钮，尝试点击验证码输入框右侧区域...');
    // 尝试点击第3个 input 的右侧
    const codeInput = page.locator('input').nth(2);
    const box = await codeInput.boundingBox();
    if (box) {
      // 点击输入框右侧 10px 的位置
      await page.mouse.click(box.x + box.width + 50, box.y + box.height / 2);
      console.log('✅ 已点击验证码输入框右侧');
      await page.waitForTimeout(2000);
    }
  }

  // 如果没有提供验证码，提示用户输入
  if (!code) {
    code = (await prompt('📧 请输入邮箱收到的验证码（6位数字）: ')).trim();
    if (!code) throw new Error('验证码不能为空');
  }

  return code;
}

async function fillVerificationCode(page, code) {
  // 查找验证码输入框（应该是新出现的 input）
  const codeInput = page.locator('input').last(); // 最后一个 input
  console.log('📝 填写验证码...');
  await codeInput.fill(code);

  // 查找确认按钮
  const confirmButton = page.getByRole('button', { name: /确认|确定|提交|登/ });
  if (await confirmButton.count() > 0) {
    console.log('✅ 点击确认按钮...');
    await confirmButton.first().click();
  }
}

async function clickLoginButton(page) {
  const loginButton = page.getByRole('button', { name: /登录|登陆/ });
  if (await loginButton.count()) {
    await loginButton.first().click();
    return;
  }
  await page.locator('button').last().click();
}

async function waitForHomeOrDialog(page) {
  try {
    await Promise.race([
      page.waitForURL('**/home**', { timeout: 5000 }),
      page.waitForSelector('.el-dialog, .ant-modal, .el-message-box', { timeout: 5000 })
    ]);
    if (page.url().includes('/home')) return 'home';
    return 'dialog';
  } catch {
    return page.url().includes('/home') ? 'home' : 'timeout';
  }
}
function parseArgs(argv) {
  const map = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      map.set(key, next);
      i += 1;
    } else {
      map.set(key, 'true');
    }
  }
  return map;
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

function normalizeHeaders(headers = {}) {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string' && value.length) {
      normalized[key] = value;
    }
  }
  return normalized;
}

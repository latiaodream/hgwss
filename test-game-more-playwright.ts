/**
 * 用 Playwright 模拟真实 iPhone Safari 页面链路，获取会话后发起 get_game_more
 * - 域名固定: https://hga026.com （按用户要求不切域名）
 * - 登录: 复用 transform.php?ver= 的 chk_login 逻辑
 * - 预热: 多次 get_game_list 浏览
 * - 发起: get_game_more（带 filter=Main, from=game_more, mode=NORMAL 等）
 */

import { webkit, devices, BrowserContext } from 'playwright';
import * as xml2js from 'xml2js';
import axios from 'axios';
import * as fs from 'fs';


console.log('[playwright-test] file loaded');

const BASE_URL = process.env.CROWN_SITE_URL || 'https://hga026.com';
const VERSION = process.env.CROWN_API_VERSION || '2025-10-16-fix342_120';
const USERNAME = process.env.CROWN_USERNAME || 'WjeLaA68i0';
const PASSWORD = process.env.CROWN_PASSWORD || 'I0FQsaTFFUHg';

const PREHEAT_LOOPS = parseInt(process.env.PREHEAT_LOOPS || '4');
const PREHEAT_DELAY_MS = parseInt(process.env.PREHEAT_DELAY_MS || '8000');

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1';
const ENCODED_UA = Buffer.from(MOBILE_UA).toString('base64');
const DEBUG_LOG = 'test-game-more-playwright.debug.log';
function flog(m: string){
  try { fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${m}\n`); } catch {}
}

const CAPTURE_LOG = 'test-game-more-playwright.capture.ndjson';
function clogCap(obj: any){
  try {
    fs.appendFileSync(CAPTURE_LOG, JSON.stringify({ ts: Date.now(), ...obj }) + '\n');
  } catch {}
}

function delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function genBlackBox(): string {
  const ts = Date.now();
  const r = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  return `bb_${ts}_${r()}_${r()}_${r()}_${r()}`;
}
function attachGlobalCapture(context: BrowserContext){
  const handler = async (resp: any) => {
    try {
      const url = resp.url();
      if (!/\/transform\.php(\?|$)/.test(url)) return;
      const req = resp.request();
      if (req.method() !== 'POST') return;
      const body = req.postData() || '';
      const headers = req.headers ? req.headers() : {};
      const referer = (headers as any)['referer'] || (headers as any)['Referer'];
      const status = resp.status();
      const text = await resp.text();
      clogCap({ phase: 'global', url, status, body, headers, referer, text });
    } catch {}
  };
  context.on('response', handler);
  return () => context.off('response', handler);
}

function dumpFrames(page: any, tag: string){
  try {
    const infos = page.frames().map((f: any, i: number) => `${i}:${f.name()||''} ${String(f.url()||'').slice(0,80)}`);
    flog(`frames-${tag} ${infos.join(' | ')}`);
  } catch {}
}


async function parseXml<T=any>(xml: string): Promise<T> {
  const parser = new xml2js.Parser({ explicitArray: false, mergeAttrs: true });
  return await parser.parseStringPromise(xml) as T;
}

async function loginInPage(context: BrowserContext) {
  const page = await context.newPage();
  // Warm up multiple pages to receive routing/language cookies
  try { await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' }); } catch {}
  try { await page.goto(`${BASE_URL}/app/member/`, { waitUntil: 'domcontentloaded' }); } catch {}
  try { await page.goto(`${BASE_URL}/app/member/mem_login.php?langx=zh-cn`, { waitUntil: 'domcontentloaded' }); } catch {}
  try { await page.goto(`${BASE_URL}/app/member/index.php?langx=zh-cn`, { waitUntil: 'domcontentloaded' }); } catch {}
  // 访问 FT_browse（产生页面级 Cookie）
  await page.goto(`${BASE_URL}/app/member/FT_browse/index.php?rtype=re&langx=zh-cn`, { waitUntil: 'domcontentloaded' });
  await delay(1500);

  const blackbox = genBlackBox();
  const body = new URLSearchParams({
    p: 'chk_login',
    langx: 'zh-cn',
    ver: VERSION,
    username: USERNAME,
    password: PASSWORD,
    app: 'N',
    auto: 'CFHFID',
    blackbox,
    userAgent: ENCODED_UA,
  }).toString();

  const loginResp = await page.evaluate(async (args: any) => {
    const { ver, b, headers, ref } = args;
    const resp = await fetch(`/transform.php?ver=${ver}`, {
      method: 'POST',
      credentials: 'include',
      headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8' }, headers || {}),
      body: b,
      referrer: ref,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    const t = await resp.text();
    return { status: resp.status, text: t } as { status: number; text: string };
  }, { ver: VERSION, b: body, headers: { 'Accept-Language': 'zh-CN,zh;q=0.9' }, ref: `${BASE_URL}/app/member/mem_login.php?langx=zh-cn` });

  if (loginResp.status !== 200) throw new Error(`login HTTP ${loginResp.status}`);

  const data = await parseXml<any>(loginResp.text).catch(() => ({}));
  const msg = data?.msg || data?.serverresponse?.msg;
  const uid = data?.uid || data?.serverresponse?.uid;
  if (msg === '100' || data?.status === 'success') {
    return { uid, raw: loginResp.text };
  }
  throw new Error(`login failed: msg=${msg || 'N/A'}`);
}

async function probeMemberPages(context: BrowserContext, uid: string){
  const page = await context.newPage();
  const candidates = [
    '/app/member/mem_index.php',
    '/app/member/index.php',
    '/app/member/FT_index.php',
    '/app/member/FT_browse/index.php?rtype=re',
    '/app/member/FT_browse/index.php?rtype=rb',
    '/app/member/FT_browse/index.php?mtype=4&rtype=re',
  ];
  for (const raw of candidates) {
    const url = `${BASE_URL}${raw}${raw.includes('?') ? '&' : '?'}uid=${uid}&langx=zh-cn`;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await delay(400);
      const html = await page.content();
      const name = raw.replace(/[^a-zA-Z0-9_]+/g,'_');
      fs.writeFileSync(`probe_${name}.html`, html);
      flog(`probe-ok ${url}`);
    } catch (e: any) {
      flog(`probe-fail ${url} ${e?.message||e}`);
    }
  }
}

async function getGameListInPage(context: BrowserContext, uidParam?: string) {
  const page = await context.newPage();
  // 进入 FT_browse 以确保同源与页面级 Cookie
  await page.goto(`${BASE_URL}/app/member/FT_browse/index.php?uid=${uidParam||''}&rtype=re&langx=zh-cn`, { waitUntil: 'domcontentloaded' });
  await delay(500);
  const params = new URLSearchParams({
    uid: (uidParam || ''), // 优先携带 UID
    ver: VERSION,
    langx: 'zh-cn',
    p: 'get_game_list',
    gtype: 'ft',
    showtype: 'live',
    rtype: 'rb',
    ltype: '3',
    p3type: '',
    date: '',
    filter: '',
    cupFantasy: 'N',
    sorttype: 'L',
    specialClick: '',
    isFantasy: 'N',
    ts: Date.now().toString(),
  }).toString();
  const listResp = await page.evaluate(async (args: any) => {
    const { ver, b, ref } = args;
    const resp = await fetch(`/transform.php?ver=${ver}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Language': 'zh-CN,zh;q=0.9', 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/xml,text/xml;q=0.9,*/*;q=0.8' },
      body: b,
      referrer: ref,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    const t = await resp.text();
    return { status: resp.status, text: t } as { status: number; text: string };
  }, { ver: VERSION, b: params, ref: `${BASE_URL}/app/member/FT_browse/index.php?uid=${uidParam||''}&rtype=re&langx=zh-cn` });
  if (listResp.status !== 200) throw new Error(`get_game_list HTTP ${listResp.status}`);
  const xml = await parseXml<any>(listResp.text).catch(() => ({}));
  const ecs = xml?.serverresponse?.ec || xml?.ec || [];
  const leagues = Array.isArray(ecs) ? ecs : [ecs].filter(Boolean);
  // 抽第一个有 game 的联赛
  for (const ec of leagues) {
    const games = ec?.game ? (Array.isArray(ec.game) ? ec.game : [ec.game]) : [];
    if (games.length > 0) {

      const g = games[0];
      const lid = ec?.lid || ec?.LID || g?.lid || g?.LID;
      const ecid = g?.ecid || g?.ECID;
      const gid = g?.gid || g?.GID;
      return { lid, ecid, gid, leaguesCount: leagues.length, gamesCount: games.length, raw: listResp.text };
    }
  }
  return { lid: null, ecid: null, gid: null, leaguesCount: leagues.length, gamesCount: 0, raw: listResp.text };
}

async function getGameMoreInPage(context: BrowserContext, ids: { lid: any, ecid: any, gid?: any }, uidParam?: string, rtype: 're' | 'rb' = 're') {
  const page = await context.newPage();
  // 进入 FT_browse 以确保同源与页面级 Cookie
  await page.goto(`${BASE_URL}/app/member/FT_browse/index.php?uid=${uidParam||''}&rtype=${rtype}&langx=zh-cn`, { waitUntil: 'domcontentloaded' });
  await delay(500);

  const isRBVal = rtype === 'rb' ? 'Y' : 'N';
  const showtype = rtype === 'rb' ? 'live' : 'early';
  const params = new URLSearchParams({
    uid: (uidParam || ''),
    ver: VERSION,
    langx: 'zh-cn',
    p: 'get_game_more',
    gtype: 'FT',
    showtype,
    ltype: '3',
    isRB: isRBVal,
    from: 'game_more',
    mode: 'NORMAL',
    filter: 'Main',
    ts: Date.now().toString(),
  });
  if (ids.lid) params.set('lid', String(ids.lid));

  if (ids.ecid) params.set('ecid', String(ids.ecid));
  if (ids.gid) params.set('gid', String(ids.gid));

  const refererUrl = `${BASE_URL}/app/member/FT_browse/index.php?uid=${uidParam||''}&rtype=${rtype}&langx=zh-cn`;
  // 临时监听响应以抓取此次调用的真实请求/响应
  const onResp = async (resp: any) => {
    try {
      const url = resp.url();
      if (!/\/transform\.php(\?|$)/.test(url)) return;
      const req = resp.request();
      if (req.method() !== 'POST') return;
      const body = req.postData() || '';
      if (!body.includes('p=get_game_more')) return;
      const headers = req.headers ? req.headers() : {};
      const referer = (headers as any)['referer'] || (headers as any)['Referer'];
      const status = resp.status();
      const text = await resp.text();
      clogCap({ phase: 'gm-call', rtype, url, status, body, headers, referer, text });
    } catch {}
  };
  context.on('response', onResp);

  const result = await page.evaluate(async (args: any) => {
    const { ver, b, ref } = args;
    const resp = await fetch(`/transform.php?ver=${ver}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/xml, text/xml, */*;q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      body: b,
      referrer: ref,
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
    const text = await resp.text();
    return { status: resp.status, text } as { status: number; text: string };
  }, { ver: VERSION, b: params.toString(), ref: refererUrl });

  context.off('response', onResp);
  return result;
}
async function captureGetGameMoreByClick(context: BrowserContext, uidParam?: string, timeoutMs = 12000) {
  const page = await context.newPage();
  const rtypes = ['re', 'rb'];

  for (const rtype of rtypes) {
    try {
      await page.goto(`${BASE_URL}/app/member/FT_browse/index.php?uid=${uidParam||''}&rtype=${rtype}&langx=zh-cn`, { waitUntil: 'domcontentloaded' });
    } catch {}
    await delay(600);
    // 记录页面快照
    try { await page.screenshot({ path: `ft_browse_${rtype}_before.png`, fullPage: true }); } catch {}
    try { const html = await page.content(); fs.writeFileSync(`ft_browse_${rtype}_before.html`, html); } catch {}
    dumpFrames(page, `rtype=${rtype}-before`);

    const captured: any[] = [];
    const onResp = async (resp: any) => {
      try {
        const url = resp.url();
        if (!/\/transform\.php(\?|$)/.test(url)) return;
        const req = resp.request();
        if (req.method() !== 'POST') return;
        const body = req.postData() || '';
        const headers = req.headers ? req.headers() : {};
        const referer = (headers as any)['referer'] || (headers as any)['Referer'];
        const status = resp.status();
        const text = await resp.text();
        const entry = { rtype, url, status, body, headers, referer, text };
        captured.push(entry);
        clogCap({ phase: 'click-capture', ...entry });
      } catch {}
    };
    context.on('response', onResp);

    // 滚动，避免懒加载
    try { await page.mouse.wheel(0, 20000); await delay(300); } catch {}

    // 粗暴尝试点击一些可能的“更多”入口
    const candidates = [
      'text=更多玩法', 'text=更多', 'text=More', 'text=所有玩法', 'text=玩法',
      'a.more', 'button:has-text("更多")', 'span:has-text("更多")', 'a:has-text("更多")', 'div:has-text("更多")',
      'button.more', 'a[onclick*="more"]', 'a[onclick*="More"]'
    ];
    for (const sel of candidates) {
      try { await page.locator(sel).first().click({ timeout: 1500 }); await delay(300); } catch {}
    }
    dumpFrames(page, `rtype=${rtype}-after-page-clicks`);
    // 再记一次页面快照
    try { await page.screenshot({ path: `ft_browse_${rtype}_after_clicks.png`, fullPage: true }); } catch {}
    try { const html2 = await page.content(); fs.writeFileSync(`ft_browse_${rtype}_after_clicks.html`, html2); } catch {}
    // 遍历所有 frame 再尝试点击
    try {
      for (const frame of page.frames()) {
        dumpFrames({ frames: () => [frame] } as any, `rtype=${rtype}-in-frame-${frame.name()||''}`);
        for (const sel of candidates) {
          try { await frame.locator(sel).first().click({ timeout: 1000 }); await delay(200); } catch {}
        }
        // 常见表格结构与图标入口
        try { await frame.locator('tbody tr').first().click({ timeout: 1000 }); await delay(200); } catch {}
        try { await frame.locator('i.icon-more, .icon-more, .more_icon, .more, a.more, button.more').first().click({ timeout: 1000 }); await delay(200); } catch {}
        try { await frame.locator('a[onclick*="more"], a[onclick*="More"], a[href*="more"], [class*="more"]').first().click({ timeout: 1000 }); await delay(200); } catch {}
      }
    } catch {}

    await delay(timeoutMs);
    context.off('response', onResp);

    // 优先挑选 p=get_game_more 的一条返回
    const found = captured.find(e => /(^|&)p=get_game_more(&|$)/.test(String(e.body)) || /<p>get_game_more|get_game_more/.test(String(e.text)));
    if (found) return found;
    // 若没有，返回 transform.php 的第一条作为线索
    if (captured.length) return captured[0];
  }
  return null;
}


async function main() {
  console.log('========================================');
  console.log('Playwright: 真实 iPhone Safari 链路 测试 get_game_more');
  flog('start-main');

  console.log('========================================\n');

  const iPhone = devices['iPhone 12'];
  const browser = await webkit.launch({ headless: process.env.HEADFUL !== '1' });
  const context = await browser.newContext({
    ...iPhone,
    userAgent: MOBILE_UA,
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',

    extraHTTPHeaders: { 'Accept-Language': 'zh-CN,zh;q=0.9' },
    baseURL: BASE_URL,
  });

  const detachGlobal = attachGlobalCapture(context);

  try {
    // 登录
    console.log('步骤1：浏览器内登录 transform.php');
    const login = await loginInPage(context);
    console.log(`✅ 登录成功，UID=${login.uid || '未知'}`);

    flog('login-ok uid=' + String(login.uid||''));

    // 浏览器会话内直接取列表（用于选择 lid/ecid/gid）
    const info0 = await getGameListInPage(context, login.uid);
    console.log('浏览器get_game_list：联赛=', info0.leaguesCount, '首个gameCount=', info0.gamesCount, '片段=', String(info0.raw||'').slice(0,80).replace(/\s+/g,' '));
    const chosenFromBrowser = { lid: info0.lid, ecid: info0.ecid, gid: info0.gid } as any;
    flog(`list-ok leagues=${info0.leaguesCount} games=${info0.gamesCount}`);

    // 探测登录后可访问的页面路径，保存 HTML 以便排查 404
    await probeMemberPages(context, login.uid);


    // 从浏览器上下文提取 Cookie，准备用于 Node axios
    const cookies = await context.cookies(BASE_URL);
    const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');

    // 使用浏览器 Cookie 通过 Node axios 获取列表（对照浏览器 fetch 行为）
    console.log('浏览器Cookie条数:', cookies.length, '示例:', cookies.slice(0,3).map(c => c.name).join(','));

    // 步骤2：页面点击抓真实 get_game_more 请求
    console.log('步骤2：页面点击抓真实 get_game_more 请求');
    const cap = await captureGetGameMoreByClick(context, login.uid, 12000);
    if (cap) {
      flog('capture-found status=' + String(cap.status));
      console.log('—— 捕获请求：', cap.url);
      console.log('—— 请求Referer：', cap.referer);
      console.log('—— 请求体前120字节：', String(cap.body||'').slice(0,120));
      console.log('—— 响应状态：', cap.status);
      console.log('—— 响应前200：', String(cap.text||'').slice(0,200).replace(/\s+/g,' ').trim());
      const capHasCheck = /CheckEMNU/i.test(cap.text || '');
      const capDouble = /doubleLogin/i.test(cap.text || '');
      if (!capHasCheck && !capDouble) {
        console.log('✅ 捕获：未命中 CheckEMNU（可能成功）。后续将把这条“真请求”用于 Node 复现。');
      } else {
        console.log('⚠️ 捕获：', capDouble ? 'doubleLogin' : 'CheckEMNU');
      }
    } else {
      flog('capture-miss');
      console.log('⚠️ 未能通过点击捕获到 get_game_more 请求（可能页面结构变化或入口不同）');
    }

    // 直接使用浏览器列表返回的赛事
    const chosen = chosenFromBrowser;
    console.log('选择赛事（浏览器列表）：', chosen);

    // 浏览器内发起 get_game_more（带真实页面会话）
    console.log('步骤3：浏览器内发起 get_game_more (filter=Main)');
    const gm = await getGameMoreInPage(context, chosen as any, login.uid);
    const t = (gm as any).text || '';

    const hasCheck = /CheckEMNU/i.test(t);
    const is404 = (gm as any).status === 404 || /404 Not Found/i.test(t);

    console.log('—— 响应状态：', (gm as any).status);
    console.log('—— 文本前 200 字符：', t.slice(0, 200).replace(/\s+/g, ' ').trim());

    flog(`gm-done status=${String((gm as any).status)} hasCheck=${String(hasCheck)} is404=${String(is404)}`);

    if (hasCheck) {
      // 首发命中风控，改用 rtype=rb 再试一次
      flog('try-gm rtype=rb');
      console.log('⚠️ 尝试 rtype=rb 再起一次...');
      const gm2 = await getGameMoreInPage(context, chosen as any, login.uid, 'rb');
      const t2 = (gm2 as any).text || '';
      console.log('—— rtype=rb 响应状态：', (gm2 as any).status);
      console.log('—— rtype=rb 文本前 200 字符：', t2.slice(0, 200).replace(/\s+/g, ' ').trim());
      const hasCheck2 = /CheckEMNU/i.test(t2);
      flog(`gm-rb status=${String((gm2 as any).status)} hasCheck=${String(hasCheck2)}`);
      if (hasCheck2) {
        console.log('❌ 结果：(rtype=rb) 仍命中风控 CheckEMNU');
      } else if (/doubleLogin/i.test(t2)) {
        console.log('⚠️ 结果：(rtype=rb) doubleLogin');
      } else {
        console.log('✅ 结果：(rtype=rb) 未命中 CheckEMNU');
      }
    } else if (is404) {
      console.log('❌ 结果：404 拦截');
    } else {
      console.log('✅ 结果：未命中 CheckEMNU，疑似成功（需人工检查 XML 内容）');
    }
  } catch (e: any) {
    console.error('❌ 测试异常：', e.message || String(e));
  } finally {
    try { detachGlobal && detachGlobal(); } catch {}
    await context.close();
    await browser.close();
  }
}

export async function runMain(){
  console.log('[playwright-test] runMain() invoked');
  return await (async () => { try { return await main(); } catch (e) { console.error(e); throw e; } })();
}






/**
 * 测试新协议的脚本
 * 用法: node test-new-protocol.js
 */

import { XbetClient } from './src/client/XbetClient.js';
import config from './src/config.js';

console.log('=== XBet 新协议测试 ===\n');

// 创建客户端
const client = new XbetClient({
  endpoint: config.endpoint,
  token: config.token,
  username: config.username,
  password: config.password,
  origin: config.origin,
  timeout: 20000
});

// 监听事件
client.on('handshakeSent', () => {
  console.log('[事件] 握手帧已发送');
});

client.on('sessionReady', () => {
  console.log('[事件] 会话密钥就绪');
});

client.on('authenticated', (data) => {
  console.log('[事件] 认证成功:', data);
  
  // 认证成功后，测试各个 RPC 调用
  testRpcCalls();
});

client.on('serverAck', (ack) => {
  console.log('[事件] 服务器确认:', ack);
});

client.on('requestSent', ({ reqId, opcode, payload }) => {
  console.log(`[请求] ID=${reqId}, Opcode=0x${opcode.toString(16)}, Payload=`, payload);
});

client.on('requestSuccess', ({ reqId, opcode, result }) => {
  console.log(`[成功] ID=${reqId}, Opcode=0x${opcode.toString(16)}, Result=`, JSON.stringify(result).slice(0, 200));
});

client.on('requestError', ({ reqId, opcode, error }) => {
  console.error(`[错误] ID=${reqId}, Opcode=0x${opcode.toString(16)}, Error=`, error);
});

client.on('push', ({ reqId, error, result }) => {
  console.log(`[推送] ID=${reqId}, Error=${error}, Result=`, JSON.stringify(result).slice(0, 200));
});

client.on('raw', (message) => {
  console.log('[原始消息]', typeof message, Array.isArray(message) ? `Array(${message.length})` : message);
});

client.on('error', (err) => {
  console.error('[错误]', err.message);
});

client.on('close', ({ code, reason }) => {
  console.log(`[关闭] Code=${code}, Reason=${reason}`);
  process.exit(code === 1000 ? 0 : 1);
});

// 测试 RPC 调用
async function testRpcCalls() {
  console.log('\n=== 开始测试 RPC 调用 ===\n');
  
  try {
    // 测试 1: 获取用户信息 (Opcode 0x7)
    console.log('测试 1: 获取用户信息...');
    const [s1, userInfo] = await client.getUserInfo();
    if (s1 === 0) {
      console.log('✓ 用户信息:', JSON.stringify(userInfo, null, 2));
    } else {
      console.error('✗ 获取用户信息失败:', userInfo);
    }
    
    // 等待 1 秒
    await sleep(1000);
    
    // 测试 2: 获取赛事列表 (Opcode 0xb)
    console.log('\n测试 2: 获取赛事列表...');
    const [s2, events] = await client.getEvents();
    if (s2 === 0) {
      console.log(`✓ 赛事列表: ${Array.isArray(events) ? events.length : 0} 个赛事`);
      if (Array.isArray(events) && events.length > 0) {
        console.log('  第一个赛事:', JSON.stringify(events[0], null, 2).slice(0, 300));
      }
    } else {
      console.error('✗ 获取赛事列表失败:', events);
    }
    
    // 等待 1 秒
    await sleep(1000);
    
    // 测试 3: 心跳 (Opcode 0x5)
    console.log('\n测试 3: 发送心跳...');
    const [s3, heartbeatResult] = await client.heartbeat();
    if (s3 === 0) {
      console.log('✓ 心跳成功:', heartbeatResult);
    } else {
      console.error('✗ 心跳失败:', heartbeatResult);
    }
    
    // 等待 1 秒
    await sleep(1000);
    
    // 测试 4: 长轮询 (Opcode 0x1)
    console.log('\n测试 4: 长轮询...');
    const [s4, updates] = await client.poll(0);
    if (s4 === 0) {
      console.log('✓ 长轮询成功:', JSON.stringify(updates).slice(0, 300));
    } else {
      console.error('✗ 长轮询失败:', updates);
    }
    
    console.log('\n=== 测试完成 ===\n');
    
    // 保持连接 10 秒，观察是否有推送消息
    console.log('保持连接 10 秒，观察推送消息...\n');
    await sleep(10000);
    
    // 关闭连接
    console.log('关闭连接...');
    client.stop();
    
  } catch (err) {
    console.error('测试过程中出错:', err);
    client.stop();
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 启动连接
console.log('连接到:', config.endpoint);
console.log('');
client.connect();

// 30 秒后自动退出
setTimeout(() => {
  console.log('\n超时，自动退出');
  client.stop();
  process.exit(1);
}, 30000);


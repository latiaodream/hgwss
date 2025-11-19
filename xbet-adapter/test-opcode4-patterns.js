/**
 * 测试 opcode 0x4 的不同模式
 * 根据浏览器捕获的消息，第10条消息（9字节，加密）很可能是 opcode 0x4
 */

import { XbetClient } from './src/client/XbetClient.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

const OPCODES = {
  POLL: 0x1,
  ASSIGN_ACCOUNT: 0x4,
  HEARTBEAT: 0x5,
  USER_INFO: 0x7,
};

async function test() {
  console.log('🚀 测试 opcode 0x4 的不同模式\n');
  
  const client = new XbetClient({
    endpoint: config.endpoint,
    token: config.token,
    username: config.username,
    password: config.password,
    origin: config.origin,
    wsHeaders: config.wsHeaders,
  });

  let authenticated = false;
  let closed = false;

  client.on('authenticated', () => {
    authenticated = true;
  });
  
  client.on('close', (event) => {
    closed = true;
    console.log('\n❌ 连接关闭！代码:', event.code);
  });

  try {
    console.log('📡 连接到服务器...');
    await client.connect();
    console.log('✅ 连接成功！\n');
    
    // 等待握手完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔍 测试不同的 opcode 0x4 payload...\n');
    
    // 测试 1: null
    console.log('测试 1: null');
    try {
      const r1 = await client.request(OPCODES.ASSIGN_ACCOUNT, null, 2000);
      console.log('  ✅ 成功！响应:', r1);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    if (closed) {
      console.log('\n❌ 连接已关闭，停止测试');
      return;
    }
    
    // 测试 2: undefined
    console.log('\n测试 2: undefined');
    try {
      const r2 = await client.request(OPCODES.ASSIGN_ACCOUNT, undefined, 2000);
      console.log('  ✅ 成功！响应:', r2);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    if (closed) {
      console.log('\n❌ 连接已关闭，停止测试');
      return;
    }
    
    // 测试 3: 空字符串
    console.log('\n测试 3: 空字符串 ""');
    try {
      const r3 = await client.request(OPCODES.ASSIGN_ACCOUNT, '', 2000);
      console.log('  ✅ 成功！响应:', r3);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    if (closed) {
      console.log('\n❌ 连接已关闭，停止测试');
      return;
    }
    
    // 测试 4: 数字 0
    console.log('\n测试 4: 数字 0');
    try {
      const r4 = await client.request(OPCODES.ASSIGN_ACCOUNT, 0, 2000);
      console.log('  ✅ 成功！响应:', r4);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    if (closed) {
      console.log('\n❌ 连接已关闭，停止测试');
      return;
    }
    
    // 测试 5: 布尔值 true
    console.log('\n测试 5: 布尔值 true');
    try {
      const r5 = await client.request(OPCODES.ASSIGN_ACCOUNT, true, 2000);
      console.log('  ✅ 成功！响应:', r5);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    if (closed) {
      console.log('\n❌ 连接已关闭，停止测试');
      return;
    }
    
    // 现在尝试认证
    console.log('\n📡 现在尝试认证...');
    try {
      const loginPayload = {
        usr: config.username,
        pwd: config.password,
      };
      const user = await client.request(OPCODES.USER_INFO, loginPayload, 5000);
      console.log('✅ 认证成功！用户信息:', user);
      
      // 保持连接
      console.log('\n⏳ 保持连接 10 秒...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      if (!closed) {
        console.log('✅ 连接保持成功！');
      }
      
    } catch (err) {
      console.log('❌ 认证失败:', err.message);
    }
    
  } catch (err) {
    console.error('❌ 错误:', err);
  } finally {
    if (!closed) {
      client.stop();
      console.log('\n👋 断开连接');
    }
  }
}

test().catch(console.error);


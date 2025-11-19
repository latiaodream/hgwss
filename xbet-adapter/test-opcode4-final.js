/**
 * 最终测试：尝试所有可能的 opcode 0x4 格式
 */

import { XbetClient } from './src/client/XbetClient.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

const OPCODES = {
  ASSIGN_ACCOUNT: 0x4,
  USER_INFO: 0x7,
};

async function test() {
  console.log('🚀 最终测试：尝试所有可能的 opcode 0x4 格式\n');
  
  const client = new XbetClient({
    endpoint: config.endpoint,
    token: config.token,
    username: config.username,
    password: config.password,
    origin: config.origin,
    wsHeaders: config.wsHeaders,
  });

  // 监听所有事件
  client.on('authenticated', () => {
    console.log('✅ 认证成功！');
  });
  
  client.on('error', (err) => {
    console.log('❌ 错误:', err.message);
  });

  try {
    console.log('📡 连接到服务器...');
    await client.connect();
    console.log('✅ 连接成功！\n');
    
    // 等待握手完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('🔍 开始测试不同的 opcode 0x4 格式...\n');
    
    // 测试 1: 字符串（用户名）
    console.log('测试 1: 字符串（用户名）');
    try {
      const r1 = await client.request(OPCODES.ASSIGN_ACCOUNT, config.username, 2000);
      console.log('  ✅ 成功！响应:', r1);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    // 测试 2: 数字
    console.log('\n测试 2: 数字 1');
    try {
      const r2 = await client.request(OPCODES.ASSIGN_ACCOUNT, 1, 2000);
      console.log('  ✅ 成功！响应:', r2);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    // 测试 3: 空数组
    console.log('\n测试 3: 空数组 []');
    try {
      const r3 = await client.request(OPCODES.ASSIGN_ACCOUNT, [], 2000);
      console.log('  ✅ 成功！响应:', r3);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    // 测试 4: 单元素数组
    console.log('\n测试 4: 单元素数组 [username]');
    try {
      const r4 = await client.request(OPCODES.ASSIGN_ACCOUNT, [config.username], 2000);
      console.log('  ✅ 成功！响应:', r4);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    // 测试 5: 两元素数组
    console.log('\n测试 5: 两元素数组 [username, password]');
    try {
      const r5 = await client.request(OPCODES.ASSIGN_ACCOUNT, [config.username, config.password], 2000);
      console.log('  ✅ 成功！响应:', r5);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    // 测试 6: 三元素数组（带 tid）
    console.log('\n测试 6: 三元素数组 [username, password, tid]');
    try {
      const tid = Date.now().toString(36);
      const r6 = await client.request(OPCODES.ASSIGN_ACCOUNT, [config.username, config.password, tid], 2000);
      console.log('  ✅ 成功！响应:', r6);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    // 测试 7: 对象 {uid}
    console.log('\n测试 7: 对象 {uid: username}');
    try {
      const r7 = await client.request(OPCODES.ASSIGN_ACCOUNT, { uid: config.username }, 2000);
      console.log('  ✅ 成功！响应:', r7);
    } catch (err) {
      console.log('  ❌ 失败:', err.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('测试完成！');
    console.log('='.repeat(60));
    
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
      console.log('✅ 连接保持成功！');
      
    } catch (err) {
      console.log('❌ 认证失败:', err.message);
    }
    
  } catch (err) {
    console.error('❌ 错误:', err);
  } finally {
    client.stop();
    console.log('\n👋 断开连接');
  }
}

test().catch(console.error);


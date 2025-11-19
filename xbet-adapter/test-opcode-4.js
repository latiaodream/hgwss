/**
 * 测试 Opcode 0x4 的不同 payload 格式
 * 
 * 这个脚本会尝试不同的 payload 格式来找出正确的 opcode 0x4 请求
 */

import { XbetClient } from './src/client/XbetClient.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

const OPCODES = {
  POLL: 0x1,
  ASSIGN_ACCOUNT: 0x4,
  HEARTBEAT: 0x5,
  USER_INFO: 0x7,
  EVENTS: 0xb,
  HISTORY: 0x17,
};

async function testOpcode4() {
  console.log('🚀 开始测试 Opcode 0x4...\n');
  
  const client = new XbetClient({
    endpoint: config.endpoint,
    token: config.token,
    username: config.username,
    password: config.password,
    origin: config.origin,
    wsHeaders: config.wsHeaders,
  });

  try {
    // 连接并认证
    console.log('📡 连接到服务器...');
    await client.connect();
    console.log('✅ 连接成功！');
    
    // 等待认证完成
    await new Promise((resolve) => {
      client.once('authenticated', () => {
        console.log('✅ 认证成功！');
        resolve();
      });
    });
    
    // 等待一下，让服务器稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n' + '='.repeat(60));
    console.log('开始测试不同的 Opcode 0x4 payload 格式...');
    console.log('='.repeat(60) + '\n');
    
    // 测试 1: 空 payload
    console.log('📋 测试 1: 空 payload');
    try {
      const result1 = await client.request(OPCODES.ASSIGN_ACCOUNT, null, 5000);
      console.log('✅ 成功！响应:', result1);
    } catch (err) {
      console.log('❌ 失败:', err.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 测试 2: 空对象
    console.log('\n📋 测试 2: 空对象 {}');
    try {
      const result2 = await client.request(OPCODES.ASSIGN_ACCOUNT, {}, 5000);
      console.log('✅ 成功！响应:', result2);
    } catch (err) {
      console.log('❌ 失败:', err.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 测试 3: 用户名和密码
    console.log('\n📋 测试 3: {usr, pwd}');
    try {
      const result3 = await client.request(OPCODES.ASSIGN_ACCOUNT, {
        usr: config.username,
        pwd: config.password,
      }, 5000);
      console.log('✅ 成功！响应:', result3);
    } catch (err) {
      console.log('❌ 失败:', err.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 测试 4: 完整的 payload（从代码中看到的格式）
    console.log('\n📋 测试 4: 完整 payload {usr, pwd, attr, remark, share}');
    try {
      const result4 = await client.request(OPCODES.ASSIGN_ACCOUNT, {
        usr: config.username,
        pwd: config.password,
        attr: 1,
        remark: '',
        share: 0,
      }, 5000);
      console.log('✅ 成功！响应:', result4);
    } catch (err) {
      console.log('❌ 失败:', err.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 测试 5: 数组格式 [usr, pwd, tid]
    console.log('\n📋 测试 5: 数组格式 [usr, pwd, tid]');
    try {
      const tid = Date.now().toString(36) + Math.random().toString(36).substr(2);
      const result5 = await client.request(OPCODES.ASSIGN_ACCOUNT, [
        config.username,
        config.password,
        tid
      ], 5000);
      console.log('✅ 成功！响应:', result5);
    } catch (err) {
      console.log('❌ 失败:', err.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 测试 6: 只有用户名
    console.log('\n📋 测试 6: 只有用户名 {usr}');
    try {
      const result6 = await client.request(OPCODES.ASSIGN_ACCOUNT, {
        usr: config.username,
      }, 5000);
      console.log('✅ 成功！响应:', result6);
    } catch (err) {
      console.log('❌ 失败:', err.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('测试完成！');
    console.log('='.repeat(60));
    
    // 保持连接一段时间，观察服务器是否断开
    console.log('\n⏳ 保持连接 10 秒，观察服务器行为...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('✅ 连接仍然保持！');
    
  } catch (err) {
    console.error('❌ 错误:', err);
  } finally {
    client.stop();
    console.log('\n👋 断开连接');
  }
}

// 运行测试
testOpcode4().catch(console.error);


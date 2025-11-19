/**
 * 暴力测试所有可能的 opcode 组合
 */

import { XbetClient } from './src/client/XbetClient.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf8'));

// 可能的 opcode 组合
const opcodeCombinations = [
  // 不发送任何初始化消息
  [],
  // 发送 1 条消息
  [[0x1, null]], // POLL
  [[0x4, null]], // ASSIGN_ACCOUNT
  [[0x5, null]], // HEARTBEAT
  [[0x7, {}]],   // USER_INFO (空)
  // 发送 2 条消息
  [[0x1, null], [0x1, null]], // POLL + POLL
  [[0x1, null], [0x4, null]], // POLL + ASSIGN_ACCOUNT
  [[0x1, null], [0x5, null]], // POLL + HEARTBEAT
  [[0x4, null], [0x4, null]], // ASSIGN_ACCOUNT + ASSIGN_ACCOUNT
  [[0x4, null], [0x5, null]], // ASSIGN_ACCOUNT + HEARTBEAT
  [[0x5, null], [0x5, null]], // HEARTBEAT + HEARTBEAT
  [[0x7, {}], [0x7, {}]],     // USER_INFO + USER_INFO
];

async function testCombination(messages) {
  return new Promise((resolve) => {
    console.log('\n' + '='.repeat(60));
    console.log('测试组合:', messages.map(m => `0x${m[0].toString(16)}`).join(' + ') || '(无)');
    console.log('='.repeat(60));
    
    const client = new XbetClient({
      endpoint: config.endpoint,
      auth: {
        token: config.token,
        username: config.username,
        password: config.password,
      },
      origin: config.origin,
      wsHeaders: config.wsHeaders,
    });
    
    // 修改客户端的握手处理
    const originalHandleServerHandshake = client.constructor.prototype._handleServerHandshake;
    
    let authenticated = false;
    let connectionClosed = false;
    
    client.on('authenticated', () => {
      authenticated = true;
      console.log('✅ 认证成功！');
      client.stop();
      resolve({ success: true, messages });
    });
    
    client.on('error', (err) => {
      if (!connectionClosed) {
        console.log('❌ 错误:', err.message);
      }
    });
    
    client.on('close', () => {
      connectionClosed = true;
      if (!authenticated) {
        console.log('❌ 连接关闭（未认证）');
        resolve({ success: false, messages });
      }
    });
    
    // 启动客户端
    client.start();
    
    // 超时处理
    setTimeout(() => {
      if (!authenticated && !connectionClosed) {
        console.log('⏱️  超时');
        client.stop();
        resolve({ success: false, messages });
      }
    }, 10000);
  });
}

async function main() {
  console.log('🚀 开始暴力测试所有 opcode 组合...\n');
  
  const results = [];
  
  for (const combination of opcodeCombinations) {
    const result = await testCombination(combination);
    results.push(result);
    
    if (result.success) {
      console.log('\n🎉 找到成功的组合！');
      console.log('组合:', result.messages.map(m => `0x${m[0].toString(16)}`).join(' + ') || '(无)');
      break;
    }
    
    // 等待 1 秒再测试下一个组合
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('测试完成！');
  console.log('='.repeat(60));
  
  const successfulCombinations = results.filter(r => r.success);
  if (successfulCombinations.length > 0) {
    console.log('\n✅ 成功的组合:');
    successfulCombinations.forEach(r => {
      console.log('  -', r.messages.map(m => `0x${m[0].toString(16)}`).join(' + ') || '(无)');
    });
  } else {
    console.log('\n❌ 没有找到成功的组合');
  }
}

main().catch(console.error);


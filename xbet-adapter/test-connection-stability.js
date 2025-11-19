/**
 * 测试连接稳定性 - 看看是否真的会被 1005 断开
 */

import { XbetClient } from './src/client/XbetClient.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

async function test() {
  console.log('🚀 测试连接稳定性\n');
  
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
  let closeCode = null;
  let closeReason = null;

  client.on('authenticated', (user) => {
    console.log('✅ 认证成功！');
    console.log('用户信息:', user);
    authenticated = true;
  });
  
  client.on('close', (event) => {
    console.log('\n❌ 连接关闭！');
    console.log('关闭代码:', event.code);
    console.log('关闭原因:', event.reason);
    closed = true;
    closeCode = event.code;
    closeReason = event.reason;
  });
  
  client.on('error', (err) => {
    console.log('❌ 错误:', err.message);
  });

  try {
    console.log('📡 连接到服务器...');
    await client.connect();
    console.log('✅ 连接成功！');
    
    // 等待认证
    console.log('\n⏳ 等待认证...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (!authenticated) {
      console.log('❌ 认证失败！');
      return;
    }
    
    console.log('\n✅ 认证成功！现在保持连接 30 秒...');
    console.log('如果服务器因为缺少 opcode 0x4 而断开，应该会在几秒内发生');
    
    // 保持连接 30 秒
    for (let i = 1; i <= 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (closed) {
        console.log(`\n❌ 连接在 ${i} 秒后被关闭！`);
        console.log('关闭代码:', closeCode);
        console.log('关闭原因:', closeReason);
        
        if (closeCode === 1005) {
          console.log('\n🎯 确认：服务器因为缺少某些消息而断开连接（1005）');
          console.log('这可能是因为缺少 opcode 0x4 或其他必需的消息');
        }
        
        break;
      }
      
      if (i % 5 === 0) {
        console.log(`⏳ 已保持连接 ${i} 秒...`);
      }
    }
    
    if (!closed) {
      console.log('\n✅ 连接保持了 30 秒！');
      console.log('🎯 结论：服务器不会因为缺少 opcode 0x4 而断开连接');
      console.log('或者：opcode 0x4 已经在某个地方被自动发送了');
    }
    
  } catch (err) {
    console.error('❌ 错误:', err);
  } finally {
    if (!closed) {
      client.stop();
      console.log('\n👋 主动断开连接');
    }
  }
}

test().catch(console.error);


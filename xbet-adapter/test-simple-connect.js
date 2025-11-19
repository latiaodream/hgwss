/**
 * 简单的连接测试
 */

import { XbetClient } from './src/client/XbetClient.js';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

async function test() {
  console.log('🚀 开始连接测试...\n');
  
  const client = new XbetClient({
    endpoint: config.endpoint,
    token: config.token,
    username: config.username,
    password: config.password,
    origin: config.origin,
    wsHeaders: config.wsHeaders,
  });

  try {
    console.log('📡 连接到服务器...');
    await client.connect();
    console.log('✅ 连接成功！\n');
    
    // 等待认证和测试完成
    await new Promise((resolve) => {
      client.once('authenticated', () => {
        console.log('\n✅ 认证流程完成！');
        resolve();
      });
      
      client.once('error', (err) => {
        console.error('\n❌ 错误:', err.message);
        resolve();
      });
    });
    
    // 保持连接 5 秒
    console.log('\n⏳ 保持连接 5 秒...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ 测试完成！');
    
  } catch (err) {
    console.error('❌ 错误:', err);
  } finally {
    client.stop();
    console.log('\n👋 断开连接');
  }
}

test().catch(console.error);


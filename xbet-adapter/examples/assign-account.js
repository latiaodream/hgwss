import { XbetClient } from '../src/client/XbetClient.js';
import { config } from '../src/config.js';

/**
 * 分配账号示例
 * 
 * 这个示例演示如何使用 XbetClient 的 assignAccount 方法
 * 将账号分配给用户
 */

async function main() {
  console.log('[example] 启动分配账号示例...');

  // 创建客户端实例
  const client = new XbetClient(config);

  // 监听事件
  client.on('error', (err) => {
    console.error('[example] 错误:', err.message);
  });

  client.on('authenticated', (user) => {
    console.log('[example] 认证成功:', user);
  });

  client.on('close', (event) => {
    console.log('[example] 连接关闭:', event);
    process.exit(0);
  });

  try {
    // 连接到服务器
    console.log('[example] 正在连接...');
    await client.connect();

    // 等待认证完成
    await new Promise((resolve) => {
      if (client.authenticated) {
        resolve();
      } else {
        client.once('authenticated', resolve);
      }
    });

    console.log('[example] 开始分配账号...');

    // 示例 1: 基本分配（只提供必需参数）
    try {
      const result1 = await client.assignAccount(
        'account123',      // 账号ID
        'testuser',        // 用户名
        'testpass123'      // 密码
      );
      console.log('[example] 分配成功 (基本):', result1);
    } catch (err) {
      console.error('[example] 分配失败 (基本):', err.message);
    }

    // 示例 2: 完整分配（包含所有可选参数）
    try {
      const result2 = await client.assignAccount(
        'account456',      // 账号ID
        'testuser2',       // 用户名
        'testpass456',     // 密码
        {
          email: 'test@example.com',  // 邮箱
          remark: '测试账号',          // 备注
          attr: 1,                     // 属性
          share: 0                     // 分享标志
        },
        30000              // 超时时间（30秒）
      );
      console.log('[example] 分配成功 (完整):', result2);
    } catch (err) {
      console.error('[example] 分配失败 (完整):', err.message);
    }

    // 示例 3: 批量分配
    const accounts = [
      { uid: 'acc001', usr: 'user001', pwd: 'pass001' },
      { uid: 'acc002', usr: 'user002', pwd: 'pass002' },
      { uid: 'acc003', usr: 'user003', pwd: 'pass003' },
    ];

    console.log('[example] 开始批量分配...');
    for (const account of accounts) {
      try {
        const result = await client.assignAccount(
          account.uid,
          account.usr,
          account.pwd,
          { remark: '批量分配' }
        );
        console.log(`[example] 分配成功: ${account.uid}`, result);
      } catch (err) {
        console.error(`[example] 分配失败: ${account.uid}`, err.message);
      }
    }

    console.log('[example] 所有分配完成');

  } catch (err) {
    console.error('[example] 发生错误:', err);
  } finally {
    // 关闭连接
    console.log('[example] 关闭连接...');
    client.stop();
  }
}

// 运行示例
main().catch((err) => {
  console.error('[example] 未捕获的错误:', err);
  process.exit(1);
});


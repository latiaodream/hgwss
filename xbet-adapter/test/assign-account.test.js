/**
 * 账号分配功能测试
 * 
 * 这个测试文件用于验证 assignAccount 方法的实现
 */

import { XbetClient } from '../src/client/XbetClient.js';

// 模拟配置
const mockConfig = {
  endpoint: 'wss://gw.xbetbot.com/?lang=zh-CN',
  token: 'test-token',
  username: 'testuser',
  password: 'testpass',
  timeout: 20000,
};

describe('XbetClient.assignAccount', () => {
  let client;

  beforeEach(() => {
    client = new XbetClient(mockConfig);
  });

  afterEach(() => {
    if (client) {
      client.stop();
    }
  });

  test('应该正确构造基本 payload', async () => {
    // Mock #call 方法
    const mockCall = jest.fn().mockResolvedValue({ success: true });
    client._XbetClient__call = mockCall;

    await client.assignAccount('acc123', 'user123', 'pass123');

    expect(mockCall).toHaveBeenCalledWith(
      0x4,  // ASSIGN_ACCOUNT opcode
      {
        uid: 'acc123',
        usr: 'user123',
        pwd: 'pass123',
        attr: 1,
        remark: '',
        share: 0,
      },
      undefined
    );
  });

  test('应该正确处理可选参数', async () => {
    const mockCall = jest.fn().mockResolvedValue({ success: true });
    client._XbetClient__call = mockCall;

    await client.assignAccount(
      'acc456',
      'user456',
      'pass456',
      {
        email: 'test@example.com',
        remark: '测试账号',
        attr: 2,
        share: 1,
      },
      30000
    );

    expect(mockCall).toHaveBeenCalledWith(
      0x4,
      {
        uid: 'acc456',
        usr: 'user456',
        pwd: 'pass456',
        email: 'test@example.com',
        remark: '测试账号',
        attr: 2,
        share: 1,
      },
      30000
    );
  });

  test('应该只在提供 email 时添加到 payload', async () => {
    const mockCall = jest.fn().mockResolvedValue({ success: true });
    client._XbetClient__call = mockCall;

    await client.assignAccount('acc789', 'user789', 'pass789', {
      remark: '无邮箱',
    });

    const payload = mockCall.mock.calls[0][1];
    expect(payload).not.toHaveProperty('email');
    expect(payload.remark).toBe('无邮箱');
  });

  test('应该使用默认值', async () => {
    const mockCall = jest.fn().mockResolvedValue({ success: true });
    client._XbetClient__call = mockCall;

    await client.assignAccount('acc000', 'user000', 'pass000', {});

    const payload = mockCall.mock.calls[0][1];
    expect(payload.attr).toBe(1);
    expect(payload.remark).toBe('');
    expect(payload.share).toBe(0);
  });

  test('应该传递错误', async () => {
    const mockError = new Error('分配失败');
    const mockCall = jest.fn().mockRejectedValue(mockError);
    client._XbetClient__call = mockCall;

    await expect(
      client.assignAccount('acc999', 'user999', 'pass999')
    ).rejects.toThrow('分配失败');
  });
});

// 手动测试（需要真实连接）
async function manualTest() {
  console.log('[test] 开始手动测试...');
  
  const client = new XbetClient(mockConfig);
  
  client.on('error', (err) => {
    console.error('[test] 错误:', err.message);
  });

  client.on('authenticated', () => {
    console.log('[test] 认证成功');
  });

  try {
    await client.connect();
    
    await new Promise((resolve) => {
      if (client.authenticated) {
        resolve();
      } else {
        client.once('authenticated', resolve);
      }
    });

    console.log('[test] 测试分配账号...');
    const result = await client.assignAccount(
      'test-account',
      'test-user',
      'test-pass',
      { remark: '测试' }
    );
    
    console.log('[test] 分配结果:', result);
  } catch (err) {
    console.error('[test] 测试失败:', err);
  } finally {
    client.stop();
  }
}

// 如果直接运行此文件，执行手动测试
if (import.meta.url === `file://${process.argv[1]}`) {
  manualTest();
}


/**
 * 分析从浏览器捕获的消息
 *
 * 这个脚本会尝试解密浏览器发送的消息，找出 opcode 0x4 的 payload
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';

// 从浏览器捕获的消息（十六进制格式）
const capturedMessages = [
  // 第1条 (65字节) - 客户端公钥
  'cc f1 20 54 41 63 59 24 91 67 8a 27 12 e2 10 2e 20 f7 b5 62 1c 61 b3 62 1b 25 e0 d3 c2 8a c9 7d c7 81 c1 a0 ca 09 77 ff 25 48 db e2 78 2b 1a 29 79 d9 01 9d 1b a5 e1 28 d7 38 a1 79 6c',
  
  // 第2条 (20字节) - 可能是认证请求
  'cc 2a 52 9a ee 99 cf 3f 90 e6 93 aa 51 7e 65 a3 d3 4d de b1',
  
  // 第3条 (4字节) - 心跳/轮询
  'c0 59 45 dc',
  
  // 第4条 (192字节) - 大数据包
  'd3 0e 24 3a 69 65 b6 cf d0 3e 04 59 48 e1 8d 9b 0a 1e 93 dc 60 6b 10 b0 a9 45 d6 8a dc 19 80 e1 58 0c 7d e8 bc ea 01 60 fd fe 3a ec cc 2f c4 d9 a2 6e 7b e3 df 8b fd 6e a8 36 68 0d 07 d8 c2 b4 1d 9e 65 99 6f 26 7d b3 8d 78 24 45 ff 5d 49 7c 0b 41 9c d5 6b 2f be d0 ea 8f 49 7b 49 60 5f 85 bd 82 e0 a9 aa 1a 40 62 bd e7 90 90 12 16 3d 84 40 a4 e2 4a fa 0b 47 22 51 84 71 54 f4 f7 79 50 88 d3 57 94 a9 d2 40 86 b2 3b c5 91 46 f3 c7 3a 38 37 f4 d0 81 1f d6 45 3f b2 c9 5c 0b 94 37 25 ca a9 f5 56 87 1c e7 9c db 20 5a 5c f1 77 07 c4 33 89 3f 37 36 14 6e f9 0f d2 9e a8 4d 14 4d f7',
  
  // 第5条 (4字节) - 心跳/轮询
  '52 02 55 ae',
  
  // 第6条 (4字节) - 心跳/轮询
  '7c da e7 58',
  
  // 第7条 (31字节) - ⭐ 可能是 opcode 0x4
  '9c 81 bb 7b cb 34 98 80 78 7a 6e be a7 24 27 2c e4 2e c3 de d7 94 56 99 32 f4 a8 f4 3b 00 a8',
  
  // 第8条 (62字节)
  'e3 6e ab 43 25 9a c6 48 19 20 b2 2e a2 c5 62 e2 50 13 11 5e b3 44 3d ed b3 64 fc 01 af 5e 86 44 53 2c 67 dc 40 61 89 60 50 97 24 61 66 51 6b 86 ed 20 c7 21 ab dd 59 20 36 e0 b4 fb 6e e4',
  
  // 第9条 (10字节)
  'd2 fd c5 8e 16 c6 22 2e 13 7a',
  
  // 第10条 (58字节)
  '7c 04 b0 74 0c 17 80 b7 92 32 fc d8 83 c4 77 46 c7 4b 66 50 13 6a ab 84 06 55 ad 0d 0d 0f 12 76 83 c9 91 33 3f ca 79 a1 34 6b 70 b6 ed 8c 16 f4 16 08 b0 a7 83 12 c8 2f be 48',
  
  // 最新的一条 (62字节)
  'f8 fa a6 e9 b1 71 ce e2 36 5e 57 2b 37 b5 28 f9 80 a1 4f ad 6f f5 7b 8b 8f ba 1c e1 17 57 5c 50 85 4d d7 18 c4 02 e4 c1 b1 79 9c 45 b9 c6 15 11 b8 0a 88 ce ed 11 c3 5a 0a 02 25 20 80 77'
];

// 将十六进制字符串转换为 Buffer
function hexToBuffer(hexString) {
  const hex = hexString.replace(/\s+/g, '');
  return Buffer.from(hex, 'hex');
}

// 尝试解码 CBOR 消息
function tryDecodeCBOR(buffer, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${label} (${buffer.length} 字节)`);
  console.log(`十六进制: ${buffer.toString('hex')}`);
  
  try {
    const decoder = new DagCborDecoder(buffer);
    const decoded = decoder.decode();
    console.log('✅ CBOR 解码成功:');
    console.log(JSON.stringify(decoded, null, 2));
    
    // 检查是否是 RPC 请求格式 [reqId, opcode, payload]
    if (Array.isArray(decoded) && decoded.length >= 2) {
      console.log(`\n📋 RPC 请求分析:`);
      console.log(`  Request ID: ${decoded[0]}`);
      console.log(`  Opcode: 0x${decoded[1].toString(16)} (${decoded[1]})`);
      if (decoded.length > 2) {
        console.log(`  Payload:`, decoded[2]);
      }
      
      // 如果是 opcode 0x4，高亮显示
      if (decoded[1] === 0x4) {
        console.log(`\n🎯 ⭐⭐⭐ 找到 OPCODE 0x4! ⭐⭐⭐`);
        console.log(`完整 payload:`, JSON.stringify(decoded[2], null, 2));
      }
    }
  } catch (err) {
    console.log(`❌ CBOR 解码失败: ${err.message}`);
  }
}

// 分析所有消息
console.log('开始分析捕获的消息...\n');

capturedMessages.forEach((hexMsg, index) => {
  const buffer = hexToBuffer(hexMsg);
  tryDecodeCBOR(buffer, `消息 #${index + 1}`);
});

console.log(`\n${'='.repeat(60)}`);
console.log('分析完成！');
console.log('\n💡 提示：');
console.log('1. 第1条消息是客户端公钥（65字节），不是 CBOR 格式');
console.log('2. 后续消息都是 RC4 加密的，需要先解密才能解码');
console.log('3. 我们需要找到浏览器端的 RC4 密钥才能解密这些消息');
console.log('\n🔍 下一步：');
console.log('请在浏览器控制台运行以下代码来导出 RC4 密钥：');
console.log(`
// 查找 Vue 应用的根实例
const app = document.getElementById('app').__vueParentComponent;
console.log('Vue app:', app);

// 或者尝试从 DevTools 中查找
// 1. 在 Vue DevTools 中找到根组件
// 2. 查找包含 WebSocket 或 client 的属性
// 3. 导出 ephemeral (客户端私钥) 和服务器公钥
`);


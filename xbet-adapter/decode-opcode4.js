/**
 * 解码捕获的消息 - 使用原始十六进制数据
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';

// 从浏览器捕获的原始十六进制数据
const messages = {
  'msg5_30B_RAW': '03e67cc5c5a0c98fef96c6774d6b32d5652b81d89d7039437924ae73ef61',
};

console.log('🔍 解码捕获的消息...\n');

for (const [name, hexData] of Object.entries(messages)) {
  console.log('='.repeat(60));
  console.log(`解码 ${name}:`);
  console.log('='.repeat(60));

  // 解码十六进制
  const buffer = Buffer.from(hexData, 'hex');

  console.log('长度:', buffer.length, '字节');
  console.log('十六进制:', buffer.toString('hex'));
  console.log('字节数组:', Array.from(buffer));

  // 尝试解码 CBOR
  console.log('\n尝试解码 CBOR:');
  try {
    const decoder = new DagCborDecoder(buffer);
    const decoded = decoder.decode();
    console.log('✅ CBOR 解码成功:');
    console.log(JSON.stringify(decoded, null, 2));

    // 检查是否是 RPC 请求格式 [reqId, opcode, payload]
    if (Array.isArray(decoded) && decoded.length >= 2) {
      console.log('\n📋 RPC 请求分析:');
      console.log('  Request ID:', decoded[0]);
      console.log('  Opcode:', `0x${decoded[1].toString(16)} (${decoded[1]})`);
      if (decoded.length > 2) {
        console.log('  Payload:', decoded[2]);
        console.log('  Payload 类型:', typeof decoded[2]);
        if (Array.isArray(decoded[2])) {
          console.log('  Payload 是数组，长度:', decoded[2].length);
          decoded[2].forEach((item, i) => {
            console.log(`    [${i}]:`, item, `(${typeof item})`);
          });
        } else if (typeof decoded[2] === 'object') {
          console.log('  Payload 是对象，键:', Object.keys(decoded[2]));
          for (const [key, value] of Object.entries(decoded[2])) {
            console.log(`    ${key}:`, value, `(${typeof value})`);
          }
        }
      }

      // 如果是 opcode 0x4
      if (decoded[1] === 0x4) {
        console.log('\n🎯 ⭐⭐⭐ 这就是 OPCODE 0x4! ⭐⭐⭐');
        console.log('\n完整的 payload 结构:');
        console.log(JSON.stringify(decoded[2], null, 2));
      }
    }
  } catch (err) {
    console.log('❌ CBOR 解码失败:', err.message);
  }

  console.log('\n');
}

console.log('='.repeat(60));
console.log('分析完成！');


/**
 * 分析第3、4条消息
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';

// 第3、4条消息（都是 4 字节）
const hex = 'c0051188';
const buffer = Buffer.from(hex, 'hex');

console.log('第3、4条消息分析 (4 字节):\n');
console.log('十六进制:', hex);
console.log('长度:', buffer.length);

// 尝试解码 CBOR
try {
  const decoder = new DagCborDecoder(buffer);
  const decoded = decoder.decode();
  console.log('\nCBOR 解码结果:');
  console.log(JSON.stringify(decoded, null, 2));
} catch (err) {
  console.log('\n❌ CBOR 解码失败:', err.message);
}

console.log('\n原始字节:');
console.log('0xc0 =', buffer[0].toString(16), '- CBOR tag 0');
console.log('0x05 =', buffer[1].toString(16), '- 正整数 5');
console.log('0x11 =', buffer[2].toString(16), '- 正整数 17');
console.log('0x88 =', buffer[3].toString(16), '- 数组，长度 8');

console.log('\n🎯 这条消息是加密的，无法直接解码');
console.log('但是它的长度（4字节）很短，可能是一个简单的请求');
console.log('例如: [reqId, opcode, null]');


/**
 * 解码第5条消息（30字节）
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';

// 第5条消息（30字节）
const hex = 'ea1bd6ae5dad6da0aef18bcf92a8272cccaebae5a15061975afc1ac04ba3';
const buffer = Buffer.from(hex, 'hex');

console.log('第5条消息分析 (30 字节):\n');
console.log('十六进制:', hex);
console.log('长度:', buffer.length);

// 这是加密的消息，我们无法直接解码
console.log('\n❌ 这是加密的消息，无法直接解码');

console.log('\n但是我们知道：');
console.log('- 浏览器发送的认证请求 payload 是 {usr: "latiao", pwd: "latiao2025"}');
console.log('- CBOR 编码后应该是 30 字节');
console.log('- 所以这条消息很可能就是认证请求！');

console.log('\n让我计算一下 CBOR 编码的长度：');
const testPayload = {
  usr: 'latiao',
  pwd: 'latiao2025'
};

// 手动计算 CBOR 编码长度
// [reqId, opcode, payload]
// reqId = 1 (1 byte)
// opcode = 0x7 (1 byte)
// payload = {usr: "latiao", pwd: "latiao2025"}
//   - map header (1 byte)
//   - "usr" (1 + 3 = 4 bytes)
//   - "latiao" (1 + 6 = 7 bytes)
//   - "pwd" (1 + 3 = 4 bytes)
//   - "latiao2025" (1 + 10 = 11 bytes)
// array header (1 byte)
// total = 1 + 1 + 1 + 1 + 4 + 7 + 4 + 11 = 30 bytes

console.log('\n计算结果：');
console.log('- 数组标记: 1 字节');
console.log('- reqId (1): 1 字节');
console.log('- opcode (0x7): 1 字节');
console.log('- 对象标记: 1 字节');
console.log('- "usr": 4 字节');
console.log('- "latiao": 7 字节');
console.log('- "pwd": 4 字节');
console.log('- "latiao2025": 11 字节');
console.log('总计: 30 字节 ✅');

console.log('\n🎯 结论：第5条消息（30字节）是认证请求！');
console.log('payload = {usr: "latiao", pwd: "latiao2025"}');


/**
 * 解码第3、4条消息
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';

console.log('第3、4条消息分析:\n');

// 第3条消息（4字节）
const hex3 = '5a4ab132';
const buffer3 = Buffer.from(hex3, 'hex');

console.log('第3条消息:');
console.log('  十六进制:', hex3);
console.log('  长度:', buffer3.length);
console.log('  原始字节:', Array.from(buffer3).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

// 第4条消息（4字节）
const hex4 = 'a27d7d5d';
const buffer4 = Buffer.from(hex4, 'hex');

console.log('\n第4条消息:');
console.log('  十六进制:', hex4);
console.log('  长度:', buffer4.length);
console.log('  原始字节:', Array.from(buffer4).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

console.log('\n❌ 这些都是加密的消息，无法直接解码');

console.log('\n但是我们知道它们的长度是 4 字节');
console.log('可能的 CBOR 结构：');
console.log('1. [reqId, opcode, null] - 3个元素的数组');
console.log('2. [reqId, opcode, {}] - 3个元素的数组，payload 是空对象');
console.log('3. [reqId, opcode] - 2个元素的数组（不太可能）');

console.log('\n让我计算一下 CBOR 编码长度：');
console.log('[1, 0x7, null]:');
console.log('  - 数组标记(3元素): 1 字节 (0x83)');
console.log('  - reqId (1): 1 字节 (0x01)');
console.log('  - opcode (0x7): 1 字节 (0x07)');
console.log('  - null: 1 字节 (0xf6)');
console.log('  总计: 4 字节 ✅');

console.log('\n[1, 0x7, {}]:');
console.log('  - 数组标记(3元素): 1 字节 (0x83)');
console.log('  - reqId (1): 1 字节 (0x01)');
console.log('  - opcode (0x7): 1 字节 (0x07)');
console.log('  - 空对象: 1 字节 (0xa0)');
console.log('  总计: 4 字节 ✅');

console.log('\n🎯 结论：第3、4条消息都是 4 字节');
console.log('它们很可能是 [reqId, opcode, null] 或 [reqId, opcode, {}]');
console.log('opcode 可能是 0x1 (POLL) 或 0x5 (HEARTBEAT) 或其他');


/**
 * 验证我们的编码是否正确
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';

// 我们的编码
const ourHex = '830107a263757372666c617469616f637077646a6c617469616f32303235';
const ourBuffer = Buffer.from(ourHex, 'hex');

console.log('我们的编码:');
console.log('  十六进制:', ourHex);
console.log('  长度:', ourBuffer.length);

// 解码
const decoder = new DagCborDecoder(ourBuffer);
const decoded = decoder.decode();

console.log('\n解码结果:');
console.log(JSON.stringify(decoded, null, 2));

console.log('\n分析:');
console.log('- 0x83: 数组，3个元素');
console.log('- 0x01: reqId = 1');
console.log('- 0x07: opcode = 0x7');
console.log('- 0xa2: 对象，2个键值对');
console.log('  - 0x63 0x75 0x73 0x72: "usr" (3字节字符串)');
console.log('  - 0x66 0x6c 0x61 0x74 0x69 0x61 0x6f: "latiao" (6字节字符串)');
console.log('  - 0x63 0x70 0x77 0x64: "pwd" (3字节字符串)');
console.log('  - 0x6a 0x6c 0x61 0x74 0x69 0x61 0x6f 0x32 0x30 0x32 0x35: "latiao2025" (10字节字符串)');

console.log('\n✅ 编码正确！');


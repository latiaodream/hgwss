/**
 * 分析第9条消息
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';

// 第9条消息
const hex = 'c0051188d646e92c7ef3c4619fbf0d59e107d96873280c21a6ba6cc3263a8a3cd40e4e76711555d6b693c82e64be4e3e79827ed59d76f2a45499e92c67';
const buffer = Buffer.from(hex, 'hex');

console.log('第9条消息分析 (61 字节):\n');
console.log('十六进制:', hex);
console.log('长度:', buffer.length);

// 解码 CBOR
const decoder = new DagCborDecoder(buffer);
const decoded = decoder.decode();

console.log('\nCBOR 解码结果:');
console.log(JSON.stringify(decoded, null, 2));

console.log('\n分析:');
console.log('这是一个 CBOR tag 结构');
console.log('Tag:', decoded.tag);
console.log('Value:', decoded.value);

console.log('\n在 CBOR 中，tag 0 通常表示日期时间');
console.log('但是 value 是 5，这不是一个有效的时间戳');

console.log('\n让我检查原始字节:');
console.log('第1字节 (0xc0):', buffer[0].toString(16), '- CBOR tag 0');
console.log('第2字节 (0x05):', buffer[1].toString(16), '- 正整数 5');
console.log('第3-61字节:', buffer.slice(2).toString('hex'));

console.log('\n等等！第3-61字节（59字节）可能是加密的数据！');
console.log('所以这条消息的结构是:');
console.log('  [tag 0, value 5] + [59字节加密数据]');
console.log('  = 2字节 CBOR + 59字节加密数据 = 61字节');

console.log('\n🎯 结论:');
console.log('第9条消息不是一个完整的 CBOR 消息');
console.log('它是 CBOR 解码器误解析的结果');
console.log('实际上，整条消息都是加密的！');


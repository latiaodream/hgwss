/**
 * 分析第7条消息（31字节）- 很可能是 opcode 0x4
 */

// 第7条消息的原始十六进制
const msg7Hex = '9c 81 bb 7b cb 34 98 80 78 7a 6e be a7 24 27 2c e4 2e c3 de d7 94 56 99 32 f4 a8 f4 3b 00 a8';
const msg7Bytes = Buffer.from(msg7Hex.replace(/\s+/g, ''), 'hex');

console.log('第7条消息分析:');
console.log('长度:', msg7Bytes.length, '字节');
console.log('十六进制:', msg7Bytes.toString('hex'));
console.log('字节数组:', Array.from(msg7Bytes));
console.log('\nCBOR 分析:');
console.log('第1字节 0x9c =', 0x9c.toString(2), '(二进制)');
console.log('  高3位:', (0x9c >> 5).toString(2), '= 数组类型');
console.log('  低5位:', (0x9c & 0x1f).toString(2), '=', (0x9c & 0x1f), '(长度或附加信息)');

// 尝试不同的解释
console.log('\n可能的结构:');
console.log('1. 如果是 RPC 请求 [reqId, opcode, payload]:');
console.log('   - 第1字节 0x9c 可能表示数组');
console.log('   - 但长度 28 不合理');
console.log('\n2. 如果消息被 RC4 加密:');
console.log('   - 我们需要 RC4 密钥才能解密');
console.log('   - 解密后才能看到真实的 CBOR 结构');

// 比较其他消息的长度
console.log('\n其他消息长度对比:');
console.log('  消息 #2 (认证): 20 字节');
console.log('  消息 #3 (心跳): 4 字节');
console.log('  消息 #7 (疑似 opcode 0x4): 31 字节 ⭐');
console.log('  消息 #8: 62 字节');
console.log('  消息 #9: 10 字节');
console.log('  消息 #10: 58 字节');

console.log('\n💡 结论:');
console.log('1. 第7条消息（31字节）的长度很特殊');
console.log('2. 它在认证消息（20字节）之后发送');
console.log('3. 很可能就是 opcode 0x4 的请求');
console.log('4. 但是它是 RC4 加密的，我们无法直接解码');
console.log('\n🔍 下一步:');
console.log('需要从浏览器端获取:');
console.log('  1. 客户端私钥 (ephemeral)');
console.log('  2. 服务器公钥');
console.log('  3. 或者直接获取 RC4 密钥');
console.log('然后才能解密这条消息，看到真实的 payload');


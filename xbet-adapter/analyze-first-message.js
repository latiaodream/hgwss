/**
 * 分析第1条消息 - 可能是客户端公钥
 */

// 第1条消息的十六进制
const hex = '0474d5dd4859a5d82402166dfbc8138a458c99b21598393475cf0c512694cea0e8243d57cd36ae6e09f57f7a82678516723ecf4b8f9ca07f6f9a7672698a5639db0000019a8421e016';
const buffer = Buffer.from(hex, 'hex');

console.log('第1条消息分析 (73 字节):\n');
console.log('完整十六进制:', hex);
console.log('\n字节分析:');
console.log('第1字节 (0x04):', buffer[0], '- 这是 P256 公钥的标识符！');
console.log('第2-66字节:', buffer.slice(1, 66).toString('hex'), '- 这应该是 65 字节的公钥');
console.log('第67-73字节:', buffer.slice(66).toString('hex'), '- 额外的 7 字节数据');

console.log('\n🎯 结论:');
console.log('这条消息的结构是:');
console.log('  [0x04] + [65字节公钥] + [7字节额外数据]');
console.log('  = 1 + 65 + 7 = 73 字节');

console.log('\n但是等等... 让我重新计算:');
console.log('实际长度:', buffer.length);
console.log('如果是 0x04 + 65字节公钥 = 66字节');
console.log('剩余:', buffer.length - 66, '字节');

console.log('\n让我检查是否是 CBOR 编码的公钥:');
console.log('第1字节 0x04 在 CBOR 中表示:', '正整数 4');
console.log('所以这不是原始的 P256 公钥，而是 CBOR 编码的数据');

console.log('\n💡 这说明:');
console.log('1. 所有消息都是 CBOR 编码的');
console.log('2. 第1条消息解码后是数字 4');
console.log('3. 这可能是某种消息类型或版本号');
console.log('4. 真正的公钥可能在后续的字节中，但被 RC4 加密了');


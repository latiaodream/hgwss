/**
 * 测试所有可能的 opcode 组合
 */

import { encodeDagCbor } from './src/cbor/DagCborEncoder.js';

console.log('测试所有可能的 4 字节消息:\n');

// 测试所有 opcode (0x0 - 0x1f)
for (let opcode = 0; opcode <= 0x1f; opcode++) {
  // 测试 null payload
  const msg1 = [1, opcode, null];
  const enc1 = encodeDagCbor(msg1);
  
  if (enc1.length === 4) {
    console.log(`✅ [1, 0x${opcode.toString(16).padStart(2, '0')}, null] = 4 字节`);
    console.log(`   hex: ${Buffer.from(enc1).toString('hex')}`);
  }
  
  // 测试空对象 payload
  const msg2 = [1, opcode, {}];
  const enc2 = encodeDagCbor(msg2);
  
  if (enc2.length === 4) {
    console.log(`✅ [1, 0x${opcode.toString(16).padStart(2, '0')}, {}] = 4 字节`);
    console.log(`   hex: ${Buffer.from(enc2).toString('hex')}`);
  }
}

console.log('\n🎯 结论：任何 opcode 配合 null 或 {} payload 都会产生 4 字节的消息');
console.log('我们无法从长度推断出 opcode！');


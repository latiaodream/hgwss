/**
 * 解码所有捕获的消息
 */

import { DagCborDecoder } from './src/cbor/DagCborDecoder.js';
import { RC4 } from './src/crypto/rc4.js';

// 从浏览器捕获的原始十六进制数据
const messages = {
  '第1条_73B_客户端公钥': '0474d5dd4859a5d82402166dfbc8138a458c99b21598393475cf0c512694cea0e8243d57cd36ae6e09f57f7a82678516723ecf4b8f9ca07f6f9a7672698a5639db0000019a8421e016',
  '第3条_4B': '9a493ab5',
  '第4条_4B': '5d0a14ea',
  '第5条_30B': '03e67cc5c5a0c98fef96c6774d6b32d5652b81d89d7039437924ae73ef61',
  '第9条_61B': 'c0051188d646e92c7ef3c4619fbf0d59e107d96873280c21a6ba6cc3263a8a3cd40e4e76711555d6b693c82e64be4e3e79827ed59d76f2a45499e92c67',
  '第10条_9B': '93daa8dd28e0fd6937',
};

console.log('🔍 解码所有捕获的消息...\n');

for (const [name, hexData] of Object.entries(messages)) {
  console.log('='.repeat(70));
  console.log(`${name}:`);
  console.log('='.repeat(70));
  
  const buffer = Buffer.from(hexData, 'hex');
  
  console.log('长度:', buffer.length, '字节');
  console.log('十六进制:', buffer.toString('hex'));
  console.log('字节数组:', Array.from(buffer));
  
  // 特殊处理第1条消息（客户端公钥）
  if (name.includes('第1条')) {
    console.log('\n📋 这是客户端握手帧:');
    console.log('  前65字节: P256 公钥');
    console.log('  后8字节: 时间戳');
    const timestamp = buffer.readBigUInt64BE(65);
    console.log('  时间戳值:', timestamp.toString());
    console.log('  时间戳日期:', new Date(Number(timestamp)).toISOString());
    console.log('\n');
    continue;
  }
  
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
        } else if (typeof decoded[2] === 'object' && decoded[2] !== null) {
          console.log('  Payload 是对象，键:', Object.keys(decoded[2]));
          for (const [key, value] of Object.entries(decoded[2])) {
            console.log(`    ${key}:`, value, `(${typeof value})`);
          }
        }
      }
      
      // 标记特殊的 opcode
      if (decoded[1] === 0x1) {
        console.log('\n🔄 这是 POLL (轮询) 请求');
      } else if (decoded[1] === 0x4) {
        console.log('\n🎯 ⭐⭐⭐ 这就是 OPCODE 0x4! ⭐⭐⭐');
        console.log('\n完整的 payload 结构:');
        console.log(JSON.stringify(decoded[2], null, 2));
      } else if (decoded[1] === 0x5) {
        console.log('\n💓 这是 HEARTBEAT (心跳) 请求');
      } else if (decoded[1] === 0x7) {
        console.log('\n🔐 这是 USER_INFO (认证) 请求');
      }
    }
  } catch (err) {
    console.log('❌ CBOR 解码失败:', err.message);
    console.log('这可能是加密的数据');
  }
  
  console.log('\n');
}

console.log('='.repeat(70));
console.log('分析完成！');
console.log('='.repeat(70));


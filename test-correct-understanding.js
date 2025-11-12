/**
 * 正确理解整个系统
 */

function formatTime(time) {
  if (!time) return '-';
  const date = new Date(time);
  const utcTime = date.getTime();
  const utcMinus8 = new Date(utcTime + 4 * 60 * 60 * 1000);
  const month = String(utcMinus8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcMinus8.getUTCDate()).padStart(2, '0');
  const hour = String(utcMinus8.getUTCHours()).padStart(2, '0');
  const minute = String(utcMinus8.getUTCMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

console.log('='.repeat(60));
console.log('正确理解');
console.log('='.repeat(60));

// 用户看到皇冠显示 11-12 15:00
// 我们需要找到什么样的存储能让前端显示 15:00

console.log('\n目标：前端显示 11-12 15:00');
console.log('前端逻辑：Date 对象 + 4小时，然后 getUTCHours()');
console.log('所以：(Date 对象的 UTC 时间 + 4小时) 的小时数 = 15');
console.log('即：Date 对象的 UTC 时间的小时数 = 11');
console.log('即：Date 对象应该是 UTC 11:00');

// 构造 Date 对象为 UTC 11:00
const targetUTC = '2024-11-12T11:00:00Z';
console.log('\nDate 对象（UTC）:', targetUTC);
console.log('前端显示:', formatTime(targetUTC));

// 现在的问题是：如何存储才能让 Date 对象是 UTC 11:00？
// 答案：存储为 `2024-11-12T11:00:00-04:00` 会被解析为 UTC 15:00 ❌
// 答案：存储为 `2024-11-12T07:00:00-04:00` 会被解析为 UTC 11:00 ✅

const stored1 = '2024-11-12T11:00:00-04:00';
console.log('\n存储方案1:', stored1);
console.log('解析为 Date:', new Date(stored1).toISOString());
console.log('前端显示:', formatTime(stored1));

const stored2 = '2024-11-12T07:00:00-04:00';
console.log('\n存储方案2:', stored2);
console.log('解析为 Date:', new Date(stored2).toISOString());
console.log('前端显示:', formatTime(stored2));

console.log('\n' + '='.repeat(60));
console.log('结论');
console.log('='.repeat(60));
console.log('\n要让前端显示 15:00，后端应该存储 07:00-04:00');
console.log('这样 Date 对象是 UTC 11:00，加 4 小时后是 UTC 15:00');
console.log('getUTCHours() 返回 15');

console.log('\n现在分析 iSports：');
console.log('用户看到 iSports 显示 19:00');
console.log('所以后端应该存储 11:00-04:00（Date 对象 UTC 15:00，加4小时 = UTC 19:00）');

console.log('\n如果 iSports API 返回 UTC 15:00');
console.log('旧逻辑：存储为 15:00-04:00（Date 对象 UTC 19:00，前端显示 23:00）❌');
console.log('新逻辑：存储为 11:00-04:00（Date 对象 UTC 15:00，前端显示 19:00）✅');

console.log('\n所以新逻辑是对的！UTC 时间 - 4小时');


/**
 * 理解真实的逻辑
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
console.log('理解真实的存储逻辑');
console.log('='.repeat(60));

// 用户看到：皇冠显示 11-12 15:00
// 反推后端存储
console.log('\n用户看到皇冠显示: 11-12 15:00');
console.log('前端逻辑：加 4 小时');
console.log('所以后端存储的时间加 4 小时 = 15:00');
console.log('后端存储的时间 = 15:00 - 4 = 11:00');

// 构造后端存储的时间
const crownStored = '2024-11-12T11:00:00-04:00';
console.log('\n后端存储:', crownStored);
console.log('前端显示:', formatTime(crownStored));

// 用户看到：iSports 显示 11-12 19:00
console.log('\n用户看到 iSports 显示: 11-12 19:00');
console.log('前端逻辑：加 4 小时');
console.log('所以后端存储的时间加 4 小时 = 19:00');
console.log('后端存储的时间 = 19:00 - 4 = 15:00');

const isportsStored = '2024-11-12T15:00:00-04:00';
console.log('\n后端存储:', isportsStored);
console.log('前端显示:', formatTime(isportsStored));

console.log('\n' + '='.repeat(60));
console.log('分析');
console.log('='.repeat(60));
console.log('\n皇冠后端存储: 11:00');
console.log('iSports 后端存储: 15:00');
console.log('差异: 4 小时');

console.log('\n现在的问题是：iSports API 返回什么时间？');
console.log('假设 iSports API 返回 UTC 时间戳对应 UTC 15:00');
console.log('那么我们应该怎么处理？');

const isportsUTCTimestamp = Date.parse('2024-11-12T15:00:00Z') / 1000;
console.log('\niSports API 时间戳:', isportsUTCTimestamp);
console.log('对应 UTC 时间: 2024-11-12T15:00:00Z');

// 旧逻辑：直接用 UTC 时间
const oldDate = new Date(isportsUTCTimestamp * 1000);
const oldHour = oldDate.getUTCHours(); // 15
const oldStored = `2024-11-12T${String(oldHour).padStart(2, '0')}:00:00-04:00`;
console.log('\n旧逻辑存储:', oldStored);
console.log('前端显示:', formatTime(oldStored));

// 新逻辑：UTC - 4 小时
const newDate = new Date(isportsUTCTimestamp * 1000 - 4 * 60 * 60 * 1000);
const newHour = newDate.getUTCHours(); // 11
const newStored = `2024-11-12T${String(newHour).padStart(2, '0')}:00:00-04:00`;
console.log('\n新逻辑存储:', newStored);
console.log('前端显示:', formatTime(newStored));

console.log('\n' + '='.repeat(60));
console.log('结论');
console.log('='.repeat(60));
console.log('\n如果 iSports API 返回的是 UTC 15:00');
console.log('新逻辑会存储为 11:00，前端显示 15:00 ✅ 与皇冠一致');
console.log('旧逻辑会存储为 15:00，前端显示 19:00 ❌ 比皇冠多 4 小时');


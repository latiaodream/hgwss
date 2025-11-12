/**
 * 验证最终解决方案
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
console.log('最终解决方案验证');
console.log('='.repeat(60));

// 假设 iSports API 返回的时间戳
const isportsTimestamp = 1731427200; // UTC 2024-11-12 16:00:00
console.log('\niSports API 返回时间戳:', isportsTimestamp);
console.log('对应 UTC 时间:', new Date(isportsTimestamp * 1000).toISOString());

// 旧逻辑：直接用 UTC 时间构造
const oldDate = new Date(isportsTimestamp * 1000);
const oldHour = oldDate.getUTCHours(); // 16
const oldTimeStr = `2024-11-12T${String(oldHour).padStart(2, '0')}:00:00-04:00`;
console.log('\n旧逻辑存储:', oldTimeStr);
console.log('前端显示:', formatTime(oldTimeStr));

// 新逻辑：UTC - 4 小时
const newDate = new Date(isportsTimestamp * 1000 - 4 * 60 * 60 * 1000);
const newHour = newDate.getUTCHours(); // 12
const newTimeStr = `2024-11-12T${String(newHour).padStart(2, '0')}:00:00-04:00`;
console.log('\n新逻辑存储:', newTimeStr);
console.log('前端显示:', formatTime(newTimeStr));

// 皇冠时间（假设是 GMT-4 的 11:00）
const crownTimeStr = '2024-11-12T11:00:00-04:00';
console.log('\n皇冠存储:', crownTimeStr);
console.log('前端显示:', formatTime(crownTimeStr));

console.log('\n' + '='.repeat(60));
console.log('结论');
console.log('='.repeat(60));
console.log('\n如果皇冠显示 15:00，iSports 也应该显示 15:00');
console.log('新逻辑:', formatTime(newTimeStr), '✅');
console.log('旧逻辑:', formatTime(oldTimeStr), '❌');


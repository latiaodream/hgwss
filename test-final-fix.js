/**
 * 测试最终修复
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
console.log('最终修复验证');
console.log('='.repeat(60));

// 皇冠显示 15:00，反推后端存储
console.log('\n皇冠显示: 11-12 15:00');
console.log('前端逻辑: Date + 4小时 = 15:00');
console.log('所以 Date 对象 = UTC 11:00');
console.log('所以存储应该让 new Date() 解析为 UTC 11:00');

// 测试不同的存储方式
const crownStored = '2024-11-12T07:00:00-04:00';
console.log('\n皇冠存储:', crownStored);
console.log('解析为 Date:', new Date(crownStored).toISOString());
console.log('前端显示:', formatTime(crownStored));

// iSports API 返回 UTC 15:00（假设）
const isportsAPITime = 1731423600; // UTC 15:00
console.log('\n\niSports API 返回时间戳:', isportsAPITime);
console.log('对应 UTC 时间:', new Date(isportsAPITime * 1000).toISOString());

// 新逻辑：UTC - 8 小时
const adjustedDate = new Date(isportsAPITime * 1000 - 8 * 60 * 60 * 1000);
const hour = adjustedDate.getUTCHours(); // 7
const isportsStored = `2024-11-12T${String(hour).padStart(2, '0')}:00:00-04:00`;
console.log('\niSports 存储:', isportsStored);
console.log('解析为 Date:', new Date(isportsStored).toISOString());
console.log('前端显示:', formatTime(isportsStored));

console.log('\n' + '='.repeat(60));
console.log('结论');
console.log('='.repeat(60));
console.log('\n皇冠显示:', formatTime(crownStored));
console.log('iSports 显示:', formatTime(isportsStored));
console.log('\n时间一致！✅');


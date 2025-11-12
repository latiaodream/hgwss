/**
 * 测试前端 formatTime 函数
 */

function formatTime(time) {
  if (!time) return '-';
  const date = new Date(time);

  // 后端存储的是 UTC-4 时间，前端显示需要转换为 UTC-8（中国时间）
  // UTC-4 -> UTC-8 需要加 4 小时
  const utcTime = date.getTime();
  const utcMinus8 = new Date(utcTime + 4 * 60 * 60 * 1000);

  const month = String(utcMinus8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(utcMinus8.getUTCDate()).padStart(2, '0');
  const hour = String(utcMinus8.getUTCHours()).padStart(2, '0');
  const minute = String(utcMinus8.getUTCMinutes()).padStart(2, '0');

  return `${month}-${day} ${hour}:${minute}`;
}

console.log('='.repeat(60));
console.log('前端 formatTime 函数测试');
console.log('='.repeat(60));

// 测试皇冠时间
const crownTime = '2024-11-12T15:00:00-04:00';
console.log('\n皇冠时间:', crownTime);
console.log('解析为 Date:', new Date(crownTime).toISOString());
console.log('前端显示:', formatTime(crownTime));

// 测试 iSports 时间（旧逻辑）
const isportsOldTime = '2024-11-12T19:00:00-04:00';
console.log('\niSports 时间（旧逻辑）:', isportsOldTime);
console.log('解析为 Date:', new Date(isportsOldTime).toISOString());
console.log('前端显示:', formatTime(isportsOldTime));

// 测试 iSports 时间（新逻辑 - 减 4 小时）
const isportsNewTime = '2024-11-12T15:00:00-04:00';
console.log('\niSports 时间（新逻辑）:', isportsNewTime);
console.log('解析为 Date:', new Date(isportsNewTime).toISOString());
console.log('前端显示:', formatTime(isportsNewTime));

console.log('\n' + '='.repeat(60));
console.log('结论');
console.log('='.repeat(60));
console.log('\n如果用户看到:');
console.log('- 皇冠显示: 11-12 15:00');
console.log('- iSports 显示: 11-12 19:00');
console.log('\n那么后端存储应该是:');
console.log('- 皇冠: 2024-11-12T11:00:00-04:00 (加4小时 = 15:00)');
console.log('- iSports: 2024-11-12T15:00:00-04:00 (加4小时 = 19:00)');
console.log('\n所以 iSports 比皇冠多了 4 小时！');


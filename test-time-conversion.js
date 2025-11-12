/**
 * 测试时间转换逻辑
 */

console.log('='.repeat(60));
console.log('时间转换测试');
console.log('='.repeat(60));

// 假设当前是北京时间 2024-11-12 23:00
const beijingTime = new Date('2024-11-12T23:00:00+08:00');
console.log('\n当前北京时间:', beijingTime.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
console.log('当前 UTC 时间:', beijingTime.toISOString());
console.log('当前 GMT-4 时间:', beijingTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));

console.log('\n' + '='.repeat(60));
console.log('场景 1: 皇冠数据');
console.log('='.repeat(60));

// 皇冠原始数据：11-12 03:00p（表示 GMT-4 的 15:00）
const crownRaw = '11-12 03:00p';
console.log('\n皇冠原始数据:', crownRaw);

// 解析为 GMT-4 时间
const crownHour = 15; // 03:00p = 15:00
const crownTimeStr = `2024-11-12T${String(crownHour).padStart(2, '0')}:00:00-04:00`;
console.log('存储格式:', crownTimeStr);

const crownDate = new Date(crownTimeStr);
console.log('解析后的 Date 对象:', crownDate.toISOString());
console.log('对应 UTC 时间:', crownDate.toISOString());
console.log('对应北京时间:', crownDate.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));

// 前端显示逻辑（加 4 小时）
const crownDisplayTime = new Date(crownDate.getTime() + 4 * 60 * 60 * 1000);
console.log('\n前端显示逻辑（加 4 小时）:');
console.log('显示时间:', crownDisplayTime.toISOString());
const crownDisplayHour = crownDisplayTime.getUTCHours();
const crownDisplayMinute = crownDisplayTime.getUTCMinutes();
console.log('显示为:', `${String(crownDisplayHour).padStart(2, '0')}:${String(crownDisplayMinute).padStart(2, '0')}`);

console.log('\n' + '='.repeat(60));
console.log('场景 2: iSports 数据（旧逻辑）');
console.log('='.repeat(60));

// iSports API 返回 UTC 时间戳
const isportsTimestamp = 1731427200; // UTC 2024-11-12 19:00:00
console.log('\niSports 时间戳:', isportsTimestamp);

const isportsDateUTC = new Date(isportsTimestamp * 1000);
console.log('对应 UTC 时间:', isportsDateUTC.toISOString());
console.log('对应北京时间:', isportsDateUTC.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }));
console.log('对应 GMT-4 时间:', isportsDateUTC.toLocaleString('en-US', { timeZone: 'America/New_York' }));

// 旧逻辑：直接用 UTC 时间构造 GMT-4 字符串
const isportsOldHour = isportsDateUTC.getUTCHours(); // 19
const isportsOldTimeStr = `2024-11-12T${String(isportsOldHour).padStart(2, '0')}:00:00-04:00`;
console.log('\n旧逻辑存储格式:', isportsOldTimeStr);

const isportsOldDate = new Date(isportsOldTimeStr);
console.log('解析后的 Date 对象:', isportsOldDate.toISOString());
console.log('对应 UTC 时间:', isportsOldDate.toISOString());

// 前端显示逻辑（加 4 小时）
const isportsOldDisplayTime = new Date(isportsOldDate.getTime() + 4 * 60 * 60 * 1000);
console.log('\n前端显示逻辑（加 4 小时）:');
console.log('显示时间:', isportsOldDisplayTime.toISOString());
const isportsOldDisplayHour = isportsOldDisplayTime.getUTCHours();
const isportsOldDisplayMinute = isportsOldDisplayTime.getUTCMinutes();
console.log('显示为:', `${String(isportsOldDisplayHour).padStart(2, '0')}:${String(isportsOldDisplayMinute).padStart(2, '0')}`);

console.log('\n' + '='.repeat(60));
console.log('场景 3: iSports 数据（新逻辑 - 减 4 小时）');
console.log('='.repeat(60));

// 新逻辑：UTC 时间 - 4 小时
const isportsNewDate = new Date(isportsTimestamp * 1000 - 4 * 60 * 60 * 1000);
const isportsNewHour = isportsNewDate.getUTCHours(); // 15
const isportsNewTimeStr = `2024-11-12T${String(isportsNewHour).padStart(2, '0')}:00:00-04:00`;
console.log('\n新逻辑存储格式:', isportsNewTimeStr);

const isportsNewDateParsed = new Date(isportsNewTimeStr);
console.log('解析后的 Date 对象:', isportsNewDateParsed.toISOString());
console.log('对应 UTC 时间:', isportsNewDateParsed.toISOString());

// 前端显示逻辑（加 4 小时）
const isportsNewDisplayTime = new Date(isportsNewDateParsed.getTime() + 4 * 60 * 60 * 1000);
console.log('\n前端显示逻辑（加 4 小时）:');
console.log('显示时间:', isportsNewDisplayTime.toISOString());
const isportsNewDisplayHour = isportsNewDisplayTime.getUTCHours();
const isportsNewDisplayMinute = isportsNewDisplayTime.getUTCMinutes();
console.log('显示为:', `${String(isportsNewDisplayHour).padStart(2, '0')}:${String(isportsNewDisplayMinute).padStart(2, '0')}`);

console.log('\n' + '='.repeat(60));
console.log('总结');
console.log('='.repeat(60));
console.log('\n皇冠显示:', `${String(crownDisplayHour).padStart(2, '0')}:${String(crownDisplayMinute).padStart(2, '0')}`);
console.log('iSports 旧逻辑显示:', `${String(isportsOldDisplayHour).padStart(2, '0')}:${String(isportsOldDisplayMinute).padStart(2, '0')}`);
console.log('iSports 新逻辑显示:', `${String(isportsNewDisplayHour).padStart(2, '0')}:${String(isportsNewDisplayMinute).padStart(2, '0')}`);
console.log('\n时间差:');
console.log('旧逻辑 vs 皇冠:', Math.abs(isportsOldDisplayHour - crownDisplayHour), '小时');
console.log('新逻辑 vs 皇冠:', Math.abs(isportsNewDisplayHour - crownDisplayHour), '小时');


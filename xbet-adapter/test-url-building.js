/**
 * 测试 URL 构建
 */

import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf8'));

console.log('配置:');
console.log('  endpoint:', config.endpoint);
console.log('  token:', config.token);

// 模拟 #buildEndpointUrl 方法
function buildEndpointUrl(endpoint, token) {
  try {
    const url = new URL(endpoint);
    if (token) {
      url.searchParams.set('token', token);
    }
    return url.toString();
  } catch {
    if (token && !endpoint.includes('token=')) {
      const joiner = endpoint.includes('?') ? '&' : '?';
      return `${endpoint}${joiner}token=${encodeURIComponent(token)}`;
    }
    return endpoint;
  }
}

const finalUrl = buildEndpointUrl(config.endpoint, config.token);

console.log('\n最终 URL:');
console.log(finalUrl);

console.log('\n✅ URL 构建正确！');


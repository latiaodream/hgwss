# 如何分析前端 JS 找到 Opcode 和 Payload 结构

## 问题

前端 JS 文件 `BvC2gKzY6q.js` 是**高度混淆的单行代码**，所有变量名都被替换成了类似 `_0x129a8d`, `_0x3945` 的形式，无法直接搜索。

## 解决方案

### 步骤 1: 美化 JS 代码

首先需要把单行代码格式化成可读的多行代码：

```bash
# 方法 A: 使用在线工具
# 访问 https://beautifier.io/
# 粘贴 BvC2gKzY6q.js 的内容，点击 Beautify

# 方法 B: 使用 Node.js 工具
npm install -g js-beautify
js-beautify https://b.xbetbot.com/assets/BvC2gKzY6q.js > tmp_main.beauty.js

# 方法 C: 使用 Chrome DevTools
# 1. 打开 https://b.xbetbot.com/game
# 2. F12 → Sources → 找到 BvC2gKzY6q.js
# 3. 点击左下角的 {} 按钮（Pretty print）
# 4. 右键 → Save as... 保存美化后的代码
```

### 步骤 2: 搜索 Opcode 常量定义

在美化后的代码中搜索（大约在 1130 行左右）：

```javascript
// 搜索这些模式：
Dl = 0x7    // 获取用户信息
Pl = 0xb    // 获取赛事列表
$t = 0x17   // 获取历史数据
jl = 0x1    // 长轮询
Ct = 0x5    // 心跳/取消
Hl = 0x4    // 可能是登录/认证
```

**提示**: 这些常量名（Dl, Pl, $t, jl, Ct, Hl）可能会变化，但 opcode 的十六进制值应该是固定的。

### 步骤 3: 查找 RPC 调用

搜索 `we[` 或 `we.` 或 `.request(` 来找到实际调用的地方：

```javascript
// 典型的调用模式：
we[_0x51861a(_0x2e735a._0x5c4f75)](Dl)           // 调用 opcode 0x7
we[...](Pl)                                       // 调用 opcode 0xb
we[...]($t, { from, to })                         // 调用 opcode 0x17
we[...](jl, cursor, 0)                            // 调用 opcode 0x1
G(Ct, ...)                                        // 调用 opcode 0x5
```

### 步骤 4: 分析 `async function La` (登录函数)

用户提到的 `La` 函数可能是登录相关的函数，搜索：

```javascript
// 搜索模式：
async function La
async function.*La
function La\(
```

然后查看它如何调用 `G(Hl, payload)` 或 `request(0x4, payload)`。

### 步骤 5: 提取 Payload 结构

找到调用后，查看传入的参数：

```javascript
// 示例 1: 获取用户信息
const [status, user] = await client.request(0x7, {});
// Payload: 空对象

// 示例 2: 获取历史数据
const [status, history] = await client.request(0x17, {
  from: startTimestamp,
  to: endTimestamp
});
// Payload: { from: number, to: number }

// 示例 3: 长轮询
const [status, updates] = await client.request(0x1, cursor, 0);
// Payload: cursor (直接传数字，不是对象)
```

## 当前已知的 Opcode

| Opcode | 十进制 | 常量名 | 用途 | Payload | 返回值 |
|--------|--------|--------|------|---------|--------|
| 0x1 | 1 | jl | 长轮询 | `cursor` (number) | `[[opcode, [[nextCursor, data], ...]], ...]` |
| 0x4 | 4 | Hl | 登录/认证? | 待确认 | 待确认 |
| 0x5 | 5 | Ct | 心跳/取消 | `{}` 或 `{ orderId }` | `{ status: 0 }` |
| 0x7 | 7 | Dl | 获取用户信息 | `{}` | `{ mid, uid, token, email, ... }` |
| 0xb | 11 | Pl | 获取赛事列表 | `{}` 或 filter | `[{ gid, league, teams, ... }, ...]` |
| 0x17 | 23 | $t | 获取历史数据 | `{ from, to }` | `[{ ... }, ...]` |

## 下一步行动

1. **美化 JS 代码**：
   ```bash
   curl -s https://b.xbetbot.com/assets/BvC2gKzY6q.js | js-beautify > tmp_main.beauty.js
   ```

2. **搜索 Opcode 0x4 (Hl)**：
   ```bash
   grep -n "Hl.*=.*0x4\|Hl.*=.*4" tmp_main.beauty.js
   ```

3. **搜索 La 函数**：
   ```bash
   grep -n "function La\|async.*La" tmp_main.beauty.js
   ```

4. **查看调用上下文**：
   找到 `La` 函数后，查看它如何构造 payload 并调用 `G(Hl, payload)` 或 `request(0x4, payload)`

5. **复制相关代码**：
   把 `La` 函数的完整代码复制出来，分析 payload 结构

## 示例：如何找到登录 Payload

假设我们找到了这样的代码：

```javascript
async function La(username, password) {
  const payload = {
    usr: username,
    pwd: hashPassword(password),
    device: getDeviceInfo(),
    timestamp: Date.now()
  };
  
  const [status, result] = await G(Hl, payload);  // Hl = 0x4
  
  if (status === 0) {
    // 登录成功
    return result;
  } else {
    // 登录失败
    throw new Error(result);
  }
}
```

那么我们就知道了：
- **Opcode 0x4** 是登录接口
- **Payload 结构**:
  ```javascript
  {
    usr: string,      // 用户名
    pwd: string,      // 密码（可能经过哈希）
    device: object,   // 设备信息
    timestamp: number // 时间戳
  }
  ```

## 工具推荐

- **JS Beautifier**: https://beautifier.io/
- **Chrome DevTools**: 内置的 Pretty print 功能
- **VSCode**: 安装 "Beautify" 插件
- **Node.js js-beautify**: `npm install -g js-beautify`

## 注意事项

1. **变量名会变化**: 每次前端更新，混淆后的变量名可能不同
2. **Opcode 值应该稳定**: 十六进制的 opcode 值（0x1, 0x4, 0x5, 0x7, 0xb, 0x17）应该不会变
3. **常量名可能变化**: Dl, Pl, $t, jl, Ct, Hl 这些名字可能会变，但可以通过 opcode 值反推
4. **Payload 结构是关键**: 重点关注传入 `request()` 或 `G()` 的参数结构


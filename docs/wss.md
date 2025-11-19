# Crown Scraper WebSocket 接入指南

## 服务器信息
- WS 地址: `ws://<host>:<port>`（默认端口 8080，可在 `.env` 中通过 `WS_PORT` 调整）
- Auth Token: `.env` 中的 `WS_AUTH_TOKEN`（默认 `test_token_local`）

## 连接流程
1. 建立 WebSocket 连接:
   ```js
   const ws = new WebSocket('ws://host:8080');
   ```
2. 连接成功后发送认证:
   ```json
   {
     "type": "auth",
     "data": { "token": "your-token" }
   }
   ```
3. 收到 `HEARTBEAT` 表示认证通过，然后按需订阅。

## 订阅与取消订阅
- 订阅皇冠赛事（`showType`: `live`/`today`/`early`）:
  ```json
  {
    "type": "subscribe",
    "data": { "showTypes": ["live", "today"] }
  }
  ```
- 订阅第三方赛事（`thirdpartySources`: `isports`/`oddsapi`）:
  ```json
  {
    "type": "subscribe",
    "data": { "thirdpartySources": ["isports"] }
  }
  ```
- 取消订阅使用 `type = "unsubscribe"`，结构同上。

## 心跳
- 服务器每 30 秒发送 `HEARTBEAT`；客户端可定期上报 `PING` 保持在线:
  ```json
  { "type": "ping" }
  ```

## 推送事件
- `match_add`：新增皇冠赛事
- `match_update`：赛事数据更新（盘口/状态等）
- `match_remove`：赛事下架
- `score_update`：比分变化
- `odds_update`：盘口赔率变化
- `thirdparty_update`：第三方（iSports/OddsAPI）数据更新

### 示例：皇冠赛事更新
```json
{
  "type": "match_update",
  "data": {
    "showType": "live",
    "gid": "8301234",
    "match": { "league": "英超", "team_home": "曼城", ... }
  },
  "timestamp": 1731495600000
}
```

### 示例：第三方更新
```json
{
  "type": "thirdparty_update",
  "data": {
    "source": "isports",
    "matches": [ { "match_id": "123", ... } ],
    "count": 1
  },
  "timestamp": 1731495600000
}
```

## REST fallback
- `/api/matches?showType=live&page=1&pageSize=50` 获取当前分页赛事
- `/api/match-compare` 查看匹配队列
- `/api/history/daily?date=YYYY-MM-DD` 拉取历史快照

## 注意事项
- 同一 token 可多客户端连接，但请控制频率避免限流。
- 后续会新增 `/api/matches/diff?since=<timestamp>` 以方便补增量。

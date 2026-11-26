# 小蜗 · 比奇堡租房

海绵宝宝主题的房屋**租售一体**全栈应用：Vue3 前端 + Express 后端 + MySQL / SQLite 数据库。
左侧彩色功能栏 + 顶部「图标 → 搜索 → 头像 → 个人中心」，22 个页面全部可用，所有操作真实落库。
租房走「预约 → 签约 → 账单」，卖房走「挂牌 → 购房意向 → 卖家确认成交」。

---

## 快速开始

```bash
cd D:\Projects\xiaowo

npm install
npm run dev:all                # 同时启动后端(3001) + 前端(5173)，打开 http://127.0.0.1:5173
```

分开启动（调试后端时更方便）：

```bash
npm run server                 # 仅后端  http://127.0.0.1:3001
npm run dev                      # 仅前端  http://127.0.0.1:5173（已配置 /api 代理到 3001）
```

其他命令：

| 命令 | 作用 |
| --- | --- |
| `npm run db:health` | 打印当前数据库驱动、连接串、房源条数 |
| `npm run db:reset` | 把 demo 数据（房源 / 帖子 / 拍卖）恢复初始状态，不需要登录 |
| `npm test` | 端到端测试（101 项断言，需前后端都在跑） |
| `npm run test:stress` | 拍卖并发压测：50 并发只有 1 个能赢，详见 `docs/并发压测报告.md` |
| `npm run build` | 构建前端到 `dist/` |
| `npm start` | 构建 + 启动后端，由 3001 直接托管 `dist/`（单端口生产模式） |

调试参数：`?skipintro=1` 跳过开场动画（可拼在 hash 后，如 `#/bill?skipintro=1`）。

---

## 部署（Docker Compose）

一条命令起「应用 + MySQL + Redis」三件套：

```bash
cp .env.production.example .env    # 改掉两个密码，填高德 Key
docker compose up -d --build       # 打开 http://127.0.0.1:8080
docker compose ps                  # 三个服务都要 healthy
```

- `Dockerfile` 是多阶段构建：`vite build` 后只把 `dist/`、`server/`、`src/data/` 带进运行镜像，非 root 运行，自带 healthcheck。
- `HOST=0.0.0.0` 才能被容器外访问；线上再用 Caddy / Nginx 反代到 443，配 `CORS_ORIGIN` 和 `TRUST_PROXY`。
- 前端是构建期打包，**改了高德 Key 或任何前端代码都要 `--build`**。
- 详细的服务器选购、证书、备份、排错见 [`docs/部署指南.md`](docs/部署指南.md)。

---

## 数据库配置（改这里就够）

所有配置集中在项目根目录 **`.env`**（模板见 `.env.example`）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DB_CLIENT` | `mysql` | `mysql` 或 `sqlite`，决定用哪个驱动 |
| `DB_HOST` | `127.0.0.1` | MySQL 主机 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `root` | MySQL 账号 |
| `DB_PASSWORD` | 空 | MySQL 密码 |
| `DB_NAME` | `xiaowo` | 库名，**不存在会自动创建**（utf8mb4） |
| `DB_FILE` | `server/data/xiaowo.db` | SQLite 数据文件路径 |
| `PORT` | `3001` | 后端端口 |
| `SEED_ON_INIT` | `true` | 首次启动是否灌入种子数据 |

当前环境已实测：**MySQL 8 在 `127.0.0.1:3306`，`root` 账号空密码可直接连**，库 `xiaowo` 已自动创建并建表。

- 想换成你自己的 MySQL 账号：改 `DB_USER` / `DB_PASSWORD`，重启 `npm run server` 即可。
- 不想装 MySQL：把 `DB_CLIENT=sqlite`，其余不用动（Node 内置 `node:sqlite`，零编译零安装）。
- MySQL 连不上时后端**不会崩**，会打印一行警告并自动回落到 SQLite，前端无感。

### 表结构（17 张）

`users` `houses` `leases` `bills` `bookings` `messages` `friends` `reviews` `feeds` `favorites` `decor_state`
`community_posts` `post_comments` `post_likes` `sale_intents` `auctions` `bids`

DDL 见 `server/db/schema.mysql.sql` 与 `server/db/schema.sqlite.sql`。
字段用 snake_case 存储，接口层自动转 camelCase（`map_x → x`、`description → desc`、`due_date → due` 等见 `server/lib/serialize.js`）。数组字段（`tags` / `facilities` / `terms` / `placed`）以 JSON 文本存储，出库自动 parse。

**出租 / 出售共用 `houses` 表**，用 `trade` 区分：`rent` 时 `price` 是月租、`deposit` 是押金；`sale` 时 `price` 是总价，`deposit` / `min_lease` 无意义统一置 0。老库启动时会自动 `ALTER TABLE houses ADD COLUMN trade`（建表脚本只对新库生效，迁移在 `server/db/init.js` 的 `ensureColumns()`）。

---

## 后端 API

基址 `http://127.0.0.1:3001/api`，统一返回 `{ ok: true, data }` / `{ ok: false, error }`。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查：驱动、连接串、房源数、运行时长 |
| GET | `/bootstrap` | 全量快照（用户/房源/租约/账单/预约/消息/好友/评价/动态/收藏/装修） |
| GET | `/houses` | 房源列表，支持 `district` `type` `trade=rent\|sale` `status` `q` `minPrice` `maxPrice` `rooms` `sort` |
| GET | `/houses/:id` | 房源详情 |
| POST | `/houses` | 发布房源（必填 title/address/price/area；出租另需 availableFrom，出售 `trade=sale` 时校验跳过） |
| PATCH | `/houses/:id` | 更新房源（状态、价格、标签等白名单字段） |
| DELETE | `/houses/:id` | 删除房源（连带清理收藏） |
| POST | `/houses/:id/view` | 浏览量 +1 |
| GET/PUT/DELETE | `/favorites[/:houseId]` | 收藏列表 / 添加 / 移除 |
| GET | `/leases` | 租约列表（`status` `houseId` 过滤） |
| POST | `/leases/:id/sign` | 电子签约生效 |
| POST | `/leases/:id/terminate` | 退租（房源自动回到可租） |
| GET/POST | `/bills` | 账单列表 / 手动记账 |
| POST | `/bills/:id/pay` | 支付（写入 paidAt、method，并生成消息） |
| GET/POST | `/bookings` | 预约列表 / 提交预约（同房源同日期重复提交返回 409） |
| PATCH | `/bookings/:id` | 改预约状态 `pending/done/canceled` |
| GET | `/messages` | 消息列表（`type` 过滤） |
| PATCH | `/messages/:id/read` | 单条已读 |
| POST | `/messages/read-all` | 全部已读 |
| DELETE | `/messages/:id` | 删除消息 |
| GET/PATCH/DELETE | `/friends[/:id]` | 好友列表 / 改关系 / 移除 |
| GET/POST | `/reviews` | 评价列表（`houseId`）/ 发布评价（自动重算房源评分与评价数） |
| GET | `/feeds` · POST `/feeds/:id/like` | 社区动态 / 点赞 |
| GET/PUT | `/decor` | 装修方案（主题 + 已放置家具，JSON 存储） |
| GET/PATCH | `/user` | 当前用户资料 / 修改昵称、手机、角色 |
| GET | `/stats/dashboard` | 房东看板聚合：出租率、月收入、浏览、近 6 月账单 |
| GET | `/community/posts` | 邻里社区列表，支持 `district` `sort=new\|hot` `page` `pageSize` |
| GET | `/community/posts/:id` | 帖子详情（30s 缓存，返回 `cached` 标记） |
| POST | `/community/posts` | 发帖（标题 4~60 字，限流 3 帖/分钟/人） |
| DELETE | `/community/posts/:id` | 删帖（仅作者，事务内连带删评论与点赞） |
| POST | `/community/posts/:id/like` | 点赞 / 取消（事务内翻转关系并复算热度） |
| GET/POST | `/community/posts/:id/comments` | 评论列表 / 发评论（限流 10 条/分钟/人） |
| DELETE | `/community/comments/:id` | 删评论（仅作者） |
| GET | `/community/overview` | 各街区帖子数 + Redis 状态 |
| POST | `/houses/:id/intents` | 提交购房意向（仅 `trade=sale` 且在售；不能买自己的房；同房同人只允许一条 pending） |
| GET | `/sale/intents` | 购房意向列表，`role=buyer\|seller` `status` 过滤 |
| POST | `/sale/intents/:id/accept` | 卖家确认成交：意向置 accepted、同房其它 pending 关闭、房源置 sold（事务） |
| POST | `/sale/intents/:id/reject` | 卖家拒绝意向 |
| POST | `/sale/intents/:id/cancel` | 买家撤回意向 |
| GET | `/sale/overview` | 售房统计：在售 / 已售 / 均价 / 待处理意向 |
| POST | `/reset` | 清库重灌种子数据（前端「恢复初始数据」调的就是它），拍卖演示场次也会一并还原 |
| GET | `/auctions` | 拍卖场次列表，支持 `status` `district` `scope=mine\|bidding` |
| GET | `/auctions/overview` | 拍卖概览：进行中 / 已结束 / 我挂拍的 / 我领先的 + 延时规则 |
| GET | `/auctions/:id` | 拍卖详情（含房源摘要、出价记录、我的最高出价、是否领先） |
| GET | `/auctions/:id/bids` | 出价排行榜（Redis ZSET 优先，缺失时回源数据库并回填） |
| POST | `/auctions/:id/bids` | 出价：`{ price }`，门槛 = 当前价 + 最小加价（无人出价时为起拍价） |
| POST | `/houses/:id/auctions` | 房主挂拍：`{ startPrice, step, deposit, hours }` |
| POST | `/auctions/:id/cancel` | 房主撤回（仅限尚无人出价） |

---

## Redis（可选增强）

社区模块用 Redis 做了三件数据库做起来不划算的事。**未配置或连不上时自动降级为纯数据库模式，接口行为不变**。

```bash
docker run -d --name xiaowo-redis --restart unless-stopped -p 6379:6379 redis:7-alpine
```

`.env` 里配置：

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `REDIS_URL` | 空 | 留空 = 不启用 Redis，全部走数据库 |
| `REDIS_PREFIX` | `xw:` | key 前缀，多个项目共用一个 Redis 时用于隔离 |
| `REDIS_CACHE_TTL` | `30` | 帖子详情缓存秒数 |

| 用途 | Redis 结构 | key 示例 | 降级行为 |
| --- | --- | --- | --- |
| 街区热度榜 | ZSET（score = 赞×3 + 评论×5） | `xw:community:hot:jelly` | 回落 `ORDER BY hot_score DESC` |
| 帖子详情缓存 | String（JSON + TTL） | `xw:cache:post:P6001` | 直接查库 |
| 发帖/评论限流 | String（INCR + EXPIRE） | `xw:rate:post:U1001` | 不拦截，放行 |
| 出价排队削峰 | `SET NX PX` 锁 | `xw:lock:auction:bid:A1001` | 放行，靠条件 UPDATE 兜底 |
| 出价排行榜 | ZSET（score = 价格） | `xw:rank:auction:A1001` | 回源 `bids` 表并回填 |
| 出价限流 | String（INCR + EXPIRE） | `xw:rate:auction-bid:U1001` | 不拦截，放行 |

**一致性约定（重要）**：数据库是唯一真相源，Redis 里的分值只是数据库计算结果的副本。

- 点赞、评论都在**数据库事务**里改计数并复算 `hot_score`，成功后才同步 Redis；Redis 写失败只影响榜单新鲜度，不影响数据正确性。
- 启动时 `warmHotRank()` 把库里的分值灌进榜单；**断线重连后同样会重建**，覆盖断线期间产生的写入。
- 列表接口返回 `source: "redis" | "db"` 字段，可以据此判断当次查询是否真的走了 Redis（前端会显示「Redis 热榜」角标）。

---

## 高德实景地图

`/map` 与详情页的「房源位置」支持切换成**高德实景地图**。比奇堡是虚构的，这里把六个街区锚到厦门一带的真实海岸线上（GCJ-02 火星坐标，高德直接可用），每套房再按街区锚点 + 槽位偏移算出一个不重叠的点，所以地图上「同街区聚在一起」的空间关系是保留的。

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `VITE_AMAP_KEY` | 空 | Web端(JS API) 的 Key。**留空 = 用内置手绘示意图**，填了 = 用高德实景 |
| `VITE_AMAP_SECURITY` | 空 | 可选。Key 开了「安全密钥」时填 `securityJsCode` |

申请：<https://console.amap.com/dev/key/app> → 新建应用 → 添加 Key → 服务平台选 **Web端(JS API)**；在该 Key 的设置里把 `127.0.0.1`、`localhost`（以及线上域名）加进 Referer 白名单。

几个实现上的取舍：

- **Key 走 `.env`，不写死在代码里**。JS API 的 Key 本来就会被打进前端包，靠 Referer 白名单保护，所以 `.env` 已在 `.gitignore` 里，不要把真 Key 提交上去。
- **零 Key 降级**：没配 Key 时 `AmapPanel` 根本不挂载，页面回落到手绘 SVG 示意图，并在左上角提示要填哪个变量。
- **点位不重叠**：十几个价格气泡在小地图上必然叠在一起，`placeHouses()` 给同街区的房源铺了 3×4 的槽位；未选中的气泡用 `¥1.4k` 紧凑写法，选中的才展开成 `¥1,350`。筛选街区/房型时槽位按全量房源算，所以同一套房不会跳位置。
- **双向联动**：点气泡 → 右侧列表高亮 + 底部浮卡；点列表行 → 地图定位到该房源（zoom 16）。地图容器尺寸变化（列表变长、窗口缩放）由 `ResizeObserver` 触发 `map.resize()`。

---

## 二手房买卖

和租房的「预约 → 签约 → 账单」平行的一条链路。**没有真实资金流**：意向价只是双方谈定的价格，平台只落一条记录，过户在线下完成，所以也没有钱包表、不冻结押金。

| 环节 | 接口 | 落库变化 |
| --- | --- | --- |
| 挂牌 | `POST /houses`（`trade=sale`） | `houses` 新增一行，`price` = 总价 |
| 出价 | `POST /houses/:id/intents` | `sale_intents` 新增 `pending` |
| 卖家确认 | `POST /sale/intents/:id/accept` | 意向 → `accepted`、同房其它 pending → `rejected`、房源 → `sold` |
| 拒绝 / 撤回 | `reject` / `cancel` | 意向 → `rejected` / `canceled` |

规则与边界：

- 只有 `trade=sale` 且 `status=available` 的房源能收意向；卖家不能给自己出价（403），同一买家对同一套房只允许一条 `pending`（409）。
- 确认成交放在一个 `db.tx` 里，三件事同时成功或同时回滚，不会出现「房源已售但意向还挂着」。
- 状态机 `pending → accepted | rejected | canceled`，终态再改返回 400。
- 房源状态复用：`available` 在售 / `sold` 已售 / `pending` 下架；前端按 `trade` 切换文案（在租/已租出 ↔ 在售/已售）。
- 意向提交接了 Redis 限流（5 次/分钟/人），Redis 不可用时自动放行。

前端两个页面：

- `/sale` 买房专区：在售统计条 + 街区/居室/总价上限筛选 + 总价、单价排序。卡片与租房共用 `HouseCard`，只把「/月」换成「总价」。
- `/sale-orders` 购房意向：卖家「我收到的」/ 买家「我提交的」两个视角，接受/拒绝/撤回都是本地乐观更新、失败回滚。

**首页刻意不混排**：租房列表过滤掉 `trade=sale`，售房只在「买房专区」出现，避免 `¥420,000/月` 这种口径错乱。

---

## 法拍房拍卖

和「购房意向」那种一对一谈价不同，拍卖要解决的是**并发下的价格正确性**：两个人同时出价，不能都以为自己领先。

### 规则

- 公开加价：`current_price = 0` 表示**无人出价**，此时门槛 = 起拍价；否则门槛 = 当前价 + 最小加价幅度。
- **最后 5 分钟延时**：结束前 5 分钟内有人出价，结束时间顺延 5 分钟，整场最多顺延 **3** 次，防止无限拖。
- 房东不能给自己挂拍的房子出价；已经领先的人不能自己再加价；有人出价后房东不能撤回。
- 到点后价高者得（无人出价 = 流拍），房源状态随之变为「已售 / 已租出」。
- 和二手房一致：**保证金只展示、不冻结**，平台不碰资金流。

### 一致性怎么保证

```
UPDATE auctions SET
  current_price = ?, current_bidder = ?, bid_count = bid_count + 1,
  extend_count = extend_count + CASE WHEN ? = 1 THEN 1 ELSE 0 END,
  end_at = CASE WHEN ? = 1 THEN ? ELSE end_at END
WHERE id = ? AND status = 'live' AND end_at > ?
  AND ? >= (CASE WHEN current_price > 0 THEN current_price + step ELSE start_price END)
  AND (current_bidder = '' OR current_bidder <> ?)
```

门槛判断、延时、状态检查全在**一条条件 UPDATE** 里，`changes === 1` 才算成功。数据库是唯一裁判，Redis 锁只用来「削峰」——让同一场拍卖的并发请求排队几毫秒、失败方早点收到反馈；**Redis 挂了也不影响出价**（此时锁返回 `undefined`，直接放行）。到点结算是**懒结算**：任何一次读取或出价前都会调 `settleDue()`，不依赖进程内定时器，多实例部署也不会漏。

### Redis 在这里做什么

| 用途 | 结构 | 降级行为 |
| --- | --- | --- |
| 出价排队削峰 | `SET NX PX` 锁 + Lua 校验释放 | Redis 不可用 → 放行，靠数据库条件 UPDATE 兜底 |
| 出价排行榜 | ZSET（score = 价格）`xw:rank:auction:<id>` | 榜单为空 → 回源数据库并回填 |
| 出价限流 | 固定窗口计数，20 次/分钟 | 不拦截，放行 |

### 演示数据

四场，覆盖四种状态：`A1001` 有人出价（章鱼哥领先）、`A1002` 快到点且无人出价、`A1003` 是我（小蜗）挂拍的、`A1000` 已结束成交。「恢复初始数据」会一并重建，所以反复出价后不会所有人都领跑同一场。

前端三个入口：

- `/auction` 列表：倒计时每秒跳，四个视角（进行中 / 我挂拍的 / 我领先的 / 已结束）。
- `/auction/:id` 详情：出价面板 + 快捷加价档位 + 出价记录 + 延时提示。出价成功后**不做乐观更新**，直接用服务端返回的拍卖对象替换——价格不能靠前端猜。
- `/mine` 我的房源：每套房按状态分流按钮——可挂拍的显示「挂拍」（弹窗填起拍价 / 最小加价 / 保证金 / 时长），已在拍的显示「拍卖中」直接跳详情。挂拍成功后跳到新场次的详情页。

### 倒计时为什么能一直准

详情页的倒计时不是「加载一次然后本地递减」：

- 接口额外下发 `serverNow`，前端算出 `本机时间 - 服务器时间` 的偏差，倒计时统一按服务器时间走。用户把系统时间往前拨十分钟，看到的剩余时间也不会变。
- 每 30 秒静默同步一次（不碰输入框、不弹加载态、失败不打断画面），别人出价触发的延时能自己刷出来；标签页切回前台会立刻补一次（后台标签页的定时器会被浏览器降频）。
- 偏差超过 2 秒时，倒计时下面那行小字会从「每 30 秒对时 · 上次 15:27:58」变成「本机时间偏差 7 秒，已按服务器时间显示」。
- 到点自动拉一次让状态翻成「已结束」；失败最多 10 秒重试一次，不会每秒打接口。

---

## 数据流

1. 启动时 `main.js` 先 `await bootstrap()` 拉全量快照，再挂载 Vue（后端不可用则用本地缓存 + 种子数据，进入离线演示模式）。
2. 所有写操作都是**本地乐观更新 + 后台同步**：界面立即响应，`fetch` 成功后落库；失败会 toast 提示并回滚关键项（如预约冲突）。
3. 装修方案 400ms 防抖后整体 `PUT /decor`，避免拖拽时刷接口。
4. `localStorage` 只做离线缓存（`xiaowo-state-v2`）与界面偏好（`xiaowo-ui-v2`），数据以数据库为准。
5. 站内通知**只由服务端写**（出价成功 / 被超越 / 拍卖成交 / 账单 / 预约），前端不自己造：`App.vue` 每 60 秒拉一次 `/messages`（后台标签页跳过，切回前台补一次），进消息页时再拉一次。所以别人刚超越你的出价，侧栏红点会自己亮起来，不用按 F5。

### 账号与数据隔离

- 登录态：Bearer token 存 `sessions` 表（带过期时间），`attachUser` 每个请求解析一次；token 失效时当作游客，不报错。
- 游客只读：除 `/auth/*` 与房源浏览量自增，其余写操作一律 401。未登录时接口回落到演示账号，所以页面不会一片空。
- **租约 / 账单 / 预约 / 消息按账号过滤**：`leases` 用角色 id（`tenant_id OR owner_id`），账单、预约、消息用 `user_id`。越权写操作返回 403/404 —— 拿到别人的账单 id 也付不了，拿到消息 id 也删不掉，`read-all` 只影响自己那几条。
- **角色即身份**：房源 `owner_id`、拍卖 `seller_id`、租约 `tenant_id` 存的都是角色 id，所以一个角色只能有一个账号（注册时校验，重复返回 409）。注册某个角色 = 接管该角色名下的房子和租约，这是设计取舍，不是漏洞。
- 老库升级：`ensureColumns()` 给三张表补 `user_id` 并把存量行归到演示账号，升级后不会出现「数据凭空消失」。

---

## 目录结构

```
xiaowo/
├─ .env / .env.example            # 数据库与服务配置
├─ Dockerfile                     # 多阶段构建：vite build → 只带 dist/server/src/data 进运行镜像
├─ docker-compose.yml             # 应用 + MySQL + Redis 三件套（含健康检查与数据卷）
├─ .env.production.example        # 部署要填的变量（与本地 .env 的键名刻意错开）
├─ docs/部署指南.md              # 从买服务器到签证书、备份、排错
├─ server/
│  ├─ index.js                          # Express 入口：API + 静态托管 + 错误处理
│  ├─ config.js                         # 读取 .env，输出连接描述
│  ├─ db/
│  │  ├─ index.js                     # 双驱动适配（mysql2 / node:sqlite），统一 all/get/run/tx
│  │  ├─ schema.mysql.sql       # MySQL DDL
│  │  ├─ schema.sqlite.sql      # SQLite DDL
│  │  ├─ init.js                      # 建表 + 种子导入 + 重置
│  │  └─ auction.js                   # 拍卖建表 / 演示种子 / 懒结算 / 条件 UPDATE 出价
│  ├─ lib/serialize.js            # 表结构映射、JSON 字段、camelCase、id 生成
│  └─ routes/
│       ├─ catalog.js                 # bootstrap / houses / favorites / stats
│       ├─ rental.js                    # leases / bills / bookings
│       ├─ social.js                    # messages / friends / reviews / feeds
│       ├─ community.js               # 邻里社区：帖子 / 点赞 / 评论 / 热榜预热
│       ├─ sale.js                      # 二手房：购房意向 / 确认成交 / 售房概览
│       ├─ auction.js                   # 法拍房：列表 / 出价 / 排行 / 挂拍 / 撤回
│       └─ user.js                      # user / decor / reset
├─ scripts/dev-all.mjs            # 一条命令起前后端（零额外依赖）
├─ tests/smoke.mjs                    # 101 项端到端断言（含落库校验）
└─ src/
     ├─ api/client.js                 # fetch 封装 + 连接状态
     ├─ api/index.js                    # 各资源方法
     ├─ stores/app.js                 # reactive store + 乐观更新 + 同步
     ├─ data/seed.js                    # 种子数据（前端与后端共用）
     ├─ components/                     # 雪碧图 / 背景 / 开场动画 / 侧栏 / 顶栏 / 房源卡 / 高德地图面板
     ├─ views/                              # 20 个页面（含买房专区 / 购房意向）
     └─ styles/                           # legacy.css（设计令牌）+ main.css（增补）
```

---

## 页面一览

`/` 找房 · `/sale` 买房专区 · `/auction` 法拍房 · `/auction/:id` 拍卖详情 · `/sale-orders` 购房意向 · `/map` 地图 · `/house/:id` 详情 · `/fav` 收藏 · `/compare` 对比 ·
`/mine` 我的房源 · `/publish` 发布 · `/decorate` 装修 · `/booking` 预约 ·
`/lease` 租约 · `/bill` 账单 · `/review` 评价与信用 · `/message` 消息 ·
`/neighbor` 邻居与好友 · `/community` 邻里社区 · `/community/:id` 帖子详情 ·
`/dashboard` 房东看板 · `/profile` 个人中心 ·
`/settings` 设置（含服务器与数据库面板）· `/help` 帮助中心 · 404

`/house/:id` 是租售共用的详情页：按房源 `trade` 切换价格口径（月租+押金+最短租期 / 总价+单价），右侧边栏在售房时把「快速预约」换成「提交购房意向」。

---

## 测试

```bash
npm run server     # 终端 A
npm run dev          # 终端 B
npm test               # 终端 C
```

当前结果：**101/101 通过，0 控制台错误**（测试结束会自动恢复演示数据，不留临时账号）。除了 UI 断言，还会直接查接口确认数据真的写进了数据库：

- `收藏已写入数据库` · `预约已写入数据库` · `账单状态已落库为已付` · `装修方案已写入数据库` · `新房源已写入数据库` · `已读状态已落库` · `清空收藏已落库`
- `点赞已写入数据库` · `评论已写入数据库` · `发帖已写入数据库`
- `购房意向已写入数据库` · `卖家确认意向成功` · `确认后房源状态变为已售`
- `按最低门槛出价成功` · `出价已写入数据库` · `出价次数递增` · `低于门槛出价被拒` · `房主不能给自己出价` · `已结束拍卖不可出价`
- `我的房源出现挂拍入口` · `不能给别人的房源挂拍` · `房主可以把房源挂上拍` · `无人出价时可以撤回拍卖` · `拍卖详情下发服务器时间` · `详情页显示对时提示`
- `可以注册第二个账号` · `新账号看不到别人的消息` · `新账号看不到别人的账单` · `新账号看不到别人的预约` · `不能替别人付账单` · `不能删别人的消息` · `同一角色不能重复注册` · `测试结束自动恢复演示数据`

- `消息页进页重新拉取`（拦截网络请求，确认不是只读启动快照）

### 并发压测

`npm run test:stress` 会造一场临时拍卖，用 50 个并发请求撞它，分四轮验证：

| 轮次 | 场景 | 实测结果 |
| --- | --- | --- |
| 1 | 同价位 50 并发，**绕过 Redis 锁** | 1 成功 / 49 失败，价格只被写一次 |
| 2 | 同价位 50 并发，**开锁** | 仍然 1 成功（锁只削峰，不是正确性来源） |
| 3 | 50 个不同价位混战 | 成功数 == 落库条数 == 出价次数，最终价 == 成功价最大值 |
| 4 | 走真实 HTTP 50 并发 | 1×201 + 19×409（抢输）+ 30×429（限流） |

完整输出与解读见 [`docs/并发压测报告.md`](docs/并发压测报告.md)。

社区/售房相关断言会顺带覆盖：街区筛选、点赞计数变化、Redis 状态（连不上时不算失败，只提示降级）、售房卡片按总价展示、租房首页不混入售房源。
- 另有 11 个页面在 430px 视口下零横向溢出、19 个侧栏入口可达、404 兜底。

---

## 常见问题

**MySQL 连不上？** 看 `npm run server` 的首屏日志，会打印实际驱动。想强制用文件数据库：`.env` 里 `DB_CLIENT=sqlite`。

**端口被占用？** `3001` 是后端、`5173` 是前端。改 `.env` 的 `PORT`，同时改 `vite.config.js` 里的代理目标。前端换端口时用 `npm run dev -- --port 5180`，跑测试要带上同样的端口：`APP_PORT=5180 npm test`。

**数据乱了想重来？** 设置页点「恢复初始数据」，或直接 `curl -X POST http://127.0.0.1:3001/api/reset`。

**换数据库后表不存在？** 后端启动会自动执行对应 `schema.*.sql`，无需手动建表；库本身也会自动创建。

---

## 版权

海绵宝宝、派大星等角色及比奇堡场景版权归 Nickelodeon / Viacom 所有，本项目仅用于学习与演示。**商用请替换为原创 IP**——代码结构、数据模型与接口设计均可直接复用。

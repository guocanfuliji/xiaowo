/**
 * 拍卖并发压测：同一场拍卖同时来 50 个出价，验证「只有一个能赢」
 *
 * 用法：npm run test:stress        （需要后端已启动在 3001，测完自动清理）
 *
 * 四轮，分别验证不同的防线：
 *   1) 绕过 Redis 锁，50 个请求直接打数据库 → 只该有 1 个成功（证明条件 UPDATE 是唯一裁判）
 *   2) 打开 Redis 锁 → 仍然只有 1 个成功（锁只是削峰，不是正确性来源）
 *   3) 50 个不同价位混战 → 成功数 == 落库条数 == 出价次数，最终价 == 成功价里的最大值
 *   4) 走真实 HTTP，50 个并发同价位 → 1 个 201，其余被限流 / 抢输
 *
 * 注意：脚本自己在测试库里造一场拍卖，跑完删掉，不碰演示数据。
 */
import crypto from 'node:crypto'
import db, { initDb } from '../server/db/index.js'
import { placeBid, nowStr } from '../server/db/auction.js'
import { initRedis, waitForRedis, redis, getStatus as redisStatus } from '../server/lib/redis.js'
import { createSession } from '../server/lib/auth.js'
import { DEMO_USER } from '../server/db/init.js'
import { buildInsert } from '../server/lib/serialize.js'

const N = 50
const API = process.env.API_BASE || 'http://127.0.0.1:3001/api'
const TITLE = '压测场次（脚本创建，可删）'
const AID = 'STRESS-AUC-1'

let stressToken = ''
const num = (n) => Number(n || 0)
const money = (n) => '¥' + num(n).toLocaleString('zh-CN')
const bidsOf = async (id) => num((await db.get('SELECT COUNT(*) AS n FROM bids WHERE auction_id = ?', [id]))?.n)
const aucOf = async (id) => {
  const r = await db.get('SELECT * FROM auctions WHERE id = ?', [id])
  if (!r) return null
  return {
    price: num(r.current_price ?? r.CURRENT_PRICE),
    bidder: r.current_bidder ?? r.CURRENT_BIDDER,
    count: num(r.bid_count ?? r.BID_COUNT)
  }
}

let fail = 0
const check = (label, pass, detail = '') => {
  if (!pass) fail++
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? '  [' + detail + ']' : ''}`)
}

/* ---------------- 准备 ---------------- */
await initDb()
initRedis()
const rs = await waitForRedis()
console.log(`数据库 ${db.dialect} · Redis ${rs.connected ? '已连接' : '未连接（第 2/3 轮锁会退化为放行，更能说明数据库兜底）'}`)

// 清掉上一次可能残留的压测数据
await db.run('DELETE FROM bids WHERE auction_id = ?', [AID])
await db.run('DELETE FROM auctions WHERE id = ?', [AID])
await db.run('DELETE FROM messages WHERE body LIKE ?', [`%${TITLE}%`])

const house = await db.get("SELECT id FROM houses WHERE status = 'available' LIMIT 1")
const START = 100000
const STEP = 1000
const auction = {
  id: AID,
  houseId: house.id,
  sellerId: 'stress-seller',
  title: TITLE,
  startPrice: START,
  step: STEP,
  deposit: 10000,
  currentPrice: 0,
  currentBidder: '',
  bidCount: 0,
  extendCount: 0,
  status: 'live',
  startAt: nowStr(),
  endAt: nowStr(new Date(Date.now() + 2 * 3600e3)),
  resultPrice: 0,
  winnerId: '',
  createdAt: nowStr()
}
const ins = buildInsert('auctions', auction)
await db.run(ins.sql, ins.params)
console.log(`\n测试场次 ${AID} · 起拍 ${money(START)} · 步长 ${money(STEP)} · ${N} 个并发\n`)

/* ---------------- 第 1 轮：无锁，同价位，50 个不同买家 ---------------- */
console.log('第 1 轮 · 同一价格 50 并发，绕过 Redis 锁直接打数据库')
{
  const P = START + STEP
  const out = await Promise.allSettled(
    Array.from({ length: N }, (_, i) =>
      placeBid({ auctionId: AID, bidderId: `stress-a${i}`, price: P })
    )
  )
  const ok = out.filter((r) => r.status === 'fulfilled').length
  const codes = {}
  out.filter((r) => r.status === 'rejected').forEach((r) => {
    const c = r.reason?.status || 'ERR'
    codes[c] = (codes[c] || 0) + 1
  })
  const a = await aucOf(AID)
  console.log(`  成功 ${ok} · 失败 ${out.length - ok} · 错误码 ${JSON.stringify(codes)}`)
  console.log(`  当前价 ${money(a.price)} · 出价次数 ${a.count} · bids 行数 ${await bidsOf(AID)}`)
  console.log('  400 = 读到的已是新价、在应用层门槛被挡；409 = 走到数据库被条件 UPDATE 挡下，两者都是「没抢到」')
  check('只有 1 个出价成功', ok === 1, `${ok}/${out.length}`)
  check('价格只被写了一次', a.price === P, money(a.price))
  check('出价次数只 +1', a.count === 1, String(a.count))
  check('只落库 1 条出价记录', (await bidsOf(AID)) === 1)
}

/* ---------------- 第 2 轮：开锁，同价位 ---------------- */
console.log('\n第 2 轮 · 同样 50 并发，这次开 Redis 锁（锁只削峰，不应改变结果）')
{
  const before = await aucOf(AID)
  const P = before.price + STEP
  const out = await Promise.allSettled(
    Array.from({ length: N }, (_, i) =>
      placeBid({ auctionId: AID, bidderId: `stress-b${i}`, price: P, lock: (n, t) => redis.lock(n, t) })
    )
  )
  const ok = out.filter((r) => r.status === 'fulfilled').length
  const codes = {}
  out.filter((r) => r.status === 'rejected').forEach((r) => {
    const c = r.reason?.status || 'ERR'
    codes[c] = (codes[c] || 0) + 1
  })
  const a = await aucOf(AID)
  console.log(`  成功 ${ok} · 失败 ${out.length - ok} · 错误码 ${JSON.stringify(codes)}`)
  console.log(`  当前价 ${money(a.price)} · 出价次数 ${a.count} · bids 行数 ${await bidsOf(AID)}`)
  check('仍然只有 1 个成功', ok === 1, `${ok}/${out.length}`)
  check('价格只 +1 步', a.price === P, money(a.price))
  check('出价次数只 +1', a.count === before.count + 1, `${before.count} → ${a.count}`)
  check('账单外的数据没被污染：bids 行数 == 出价次数', (await bidsOf(AID)) === a.count)
}

/* ---------------- 第 3 轮：不同价位混战 ---------------- */
console.log('\n第 3 轮 · 50 个买家报不同价格混战（这轮故意不开锁，让数据库自己排队）')
{
  const before = await aucOf(AID)
  const base = before.price + STEP
  const prices = Array.from({ length: N }, (_, i) => base + i * STEP)
  const out = await Promise.allSettled(
    prices.map((p, i) =>
      placeBid({ auctionId: AID, bidderId: `stress-c${i}`, price: p })
    )
  )
  const wins = out.map((r, i) => (r.status === 'fulfilled' ? prices[i] : null)).filter(Boolean)
  const a = await aucOf(AID)
  const rows = await bidsOf(AID)
  console.log(`  成功 ${wins.length} 次 · 成功价 ${wins.map(money).join(' → ') || '无'}`)
  console.log(`  当前价 ${money(a.price)} · 出价次数 ${a.count} · bids 行数 ${rows}`)
  check('最终价 == 成功出价的最大值', a.price === Math.max(...wins), `${money(a.price)} vs ${money(Math.max(...wins))}`)
  check('出价次数 == bids 行数（没有幽灵计数）', a.count === rows, `${a.count} vs ${rows}`)
  check('出价次数增量 == 成功次数', a.count === before.count + wins.length, `${before.count} + ${wins.length} vs ${a.count}`)
  check('成功次数小于并发数（确实发生了争抢）', wins.length < N, `${wins.length}/${N}`)
  check('领先者就是最终价的出价人', a.bidder === `stress-c${prices.indexOf(Math.max(...wins))}`, String(a.bidder))
}

/* ---------------- 第 4 轮：真实 HTTP ---------------- */
console.log('\n第 4 轮 · 走真实接口，50 个并发同价位（含限流、锁、条件更新三层）')
{
  const before = await aucOf(AID)
  const P = before.price + STEP
  // 上一轮可能已经把这个账号的限流桶打满（20 次/分钟），先清掉，保证脚本可以连续跑
  await redis.rateClear(`auction-bid:${DEMO_USER.id}`)
  const { token } = await createSession(DEMO_USER.id)
  stressToken = token
  const out = await Promise.all(
    Array.from({ length: N }, () =>
      fetch(`${API}/auctions/${AID}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ price: P })
      }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) })).catch((e) => ({ status: 0, body: { error: e.message } }))
    )
  )
  const byStatus = {}
  out.forEach((r) => { byStatus[r.status] = (byStatus[r.status] || 0) + 1 })
  const a = await aucOf(AID)
  console.log(`  状态分布 ${JSON.stringify(byStatus)}`)
  console.log(`  当前价 ${money(a.price)} · 出价次数 ${a.count} · 提示：${out.find((r) => r.status !== 201)?.body?.error || ''}`)
  check('HTTP 层也只有 1 个 201', (byStatus[201] || 0) === 1, String(byStatus[201] || 0))
  check('其余全部被拦（409 抢输 / 429 限流）', out.filter((r) => r.status !== 201).every((r) => r.status === 409 || r.status === 429), JSON.stringify(byStatus))
  check('出价次数只 +1', a.count === before.count + 1, `${before.count} → ${a.count}`)
  check('限流真的生效（同一账号 1 分钟最多 20 次）', (byStatus[429] || 0) > 0 || !redisStatus().connected, `${byStatus[429] || 0} 次 429`)
}

/* ---------------- 清理 ---------------- */
await db.run('DELETE FROM bids WHERE auction_id = ?', [AID])
await db.run('DELETE FROM auctions WHERE id = ?', [AID])
await db.run('DELETE FROM messages WHERE body LIKE ?', [`%${TITLE}%`])
// 只删本脚本签发的那一个会话，不动浏览器里的登录态
if (stressToken) await db.run('DELETE FROM sessions WHERE token_hash = ?', [crypto.createHash('sha256').update(stressToken).digest('hex')])
console.log(`\n已清理测试场次${fail ? ` · 失败 ${fail} 项` : ' · 全部通过'}`)
process.exit(fail ? 1 : 0)

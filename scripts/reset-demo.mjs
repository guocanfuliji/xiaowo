/**
 * 把演示数据恢复到初始状态（房源 / 帖子 / 拍卖），不需要登录态
 * 用法：npm run db:reset
 *
 * 和 POST /api/reset 的区别：那个接口要求先登录（走 HTTP 会话），
 * 这个脚本直接连数据库，适合把跑完测试变脏的数据抹回演示态。
 */
import db, { initDb } from '../server/db/index.js'
import { seedIfEmpty } from '../server/db/init.js'
import { resetAuction } from '../server/db/auction.js'
import { initRedis, waitForRedis, redis, getStatus } from '../server/lib/redis.js'
import { DISTRICTS } from '../src/data/seed.js'

await initDb()
// Redis 没连上时 rankClear 会被安全包装吞掉，残留的旧榜单会让详情页读到「幽灵出价」
initRedis()
await waitForRedis()

const r = await seedIfEmpty(true)
await redis.hotClearAll(DISTRICTS.map((d) => d.id))
const auc = await resetAuction()
await Promise.all(auc.ids.map((id) => redis.rankClear('auction:' + id)))

const rows = await db.all('SELECT id, status, current_price, current_bidder FROM auctions ORDER BY id')
const rs = getStatus()
console.log(`已重置：${r.houses} 套房源 · ${r.posts} 条帖子 · ${rows.length} 场拍卖 · Redis ${rs.connected ? '已清理' : '未连接（榜单为空，无需清理）'}`)
for (const x of rows) {
  const price = Number(x.current_price ?? 0)
  console.log(`  ${x.id}  ${x.status.padEnd(7)} ${price ? '¥' + price.toLocaleString('zh-CN') : '无人出价'}  ${x.current_bidder || '-'}`)
}
process.exit(0)

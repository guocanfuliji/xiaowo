/**
 * 建表 + 首次填充种子数据
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import db from './index.js'
import { buildInsert } from '../lib/serialize.js'
import { hashPassword } from '../lib/auth.js'
import {
  HOUSES, LEASES, BILLS, BOOKINGS, MESSAGES, FRIENDS, REVIEWS, FEEDS,
  COMMUNITY_POSTS, POST_COMMENTS, SALE_HOUSES, SALE_INTENTS
} from '../../src/data/seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const DEMO_USER = {
  id: 'U1001',
  charId: 'gary',
  avatar: '',
  name: '小蜗',
  phone: '138****6688',
  email: 'gary@bikini.bottom',
  credit: 92,
  member: '珊瑚会员',
  joinedAt: '2024-05-01',
  verified: true
}

/** 演示账号密码：登录页会直接把它写在提示里，方便评审时一键体验 */
export const DEMO_PASSWORD = '123456'

export const DEMO_FAVORITES = ['H1003', 'H1006', 'H1009']

export const DEMO_DECOR = {
  theme: 0,
  placed: [
    { uid: 'd1', id: 'sofa', gx: 0, gy: 0 },
    { uid: 'd2', id: 'table', gx: 2, gy: 1 },
    { uid: 'd3', id: 'lamp', gx: 4, gy: 0 },
    { uid: 'd4', id: 'plant', gx: 5, gy: 0 }
  ]
}

export async function initSchema() {
  const file = db.dialect === 'sqlite' ? 'schema.sqlite.sql' : 'schema.mysql.sql'
  const sql = fs.readFileSync(path.join(__dirname, file), 'utf8')
  await db.exec(sql)
  const migrated = await ensureColumns()
  return { dialect: db.dialect, file, migrated }
}

/* ---------------- 结构升级（CREATE TABLE IF NOT EXISTS 不会补列） ---------------- */

async function hasColumn(table, column) {
  if (db.dialect === 'sqlite') {
    const rows = await db.all(`PRAGMA table_info(${table})`)
    return rows.some((r) => (r.name ?? r.NAME) === column)
  }
  const row = await db.get(
    'SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column]
  )
  return Number(row?.n ?? row?.N ?? 0) > 0
}

/**
 * 老库升级：houses 增加 trade 列（rent 出租 / sale 出售）。
 * 建表脚本只对新库生效，已经在跑的库必须走 ALTER，否则售房功能一读写就报「no such column」。
 */
export async function ensureColumns() {
  const added = []
  if (!(await hasColumn('houses', 'trade'))) {
    await db.run("ALTER TABLE houses ADD COLUMN trade VARCHAR(8) NOT NULL DEFAULT 'rent'")
    try {
      if (db.dialect === 'sqlite') {
        await db.run('CREATE INDEX IF NOT EXISTS idx_house_trade ON houses (trade, status)')
      } else {
        await db.run('ALTER TABLE houses ADD INDEX idx_house_trade (trade, status)')
      }
    } catch (e) { /* 索引已存在则忽略 */ }
    added.push('houses.trade')
  }

  // 老库里的演示账号没有密码，补一个，否则登录页的「演示账号」点不进去
  const demo = await db.get('SELECT password_hash FROM users WHERE id = ?', [DEMO_USER.id])
  const hasPwd = !!(demo && (demo.password_hash ?? demo.PASSWORD_HASH))
  if (demo && !hasPwd) {
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(DEMO_PASSWORD), DEMO_USER.id])
    added.push('users.password_hash(demo)')
  }

  // 头像库：用户自己选的那张脸。空字符串表示「没选过，用角色默认图」
  if (!(await hasColumn('users', 'avatar'))) {
    await db.run("ALTER TABLE users ADD COLUMN avatar VARCHAR(32) DEFAULT ''")
    added.push('users.avatar')
  }

  // 去掉「贝壳屋」房型：动画里没有对应的实景镜头，剩下五种都有原画截图。
  // 老库里这几套房源会顶着已删除的 type，必须一起改掉，否则按房型筛选会漏。
  const legacy = await db.all("SELECT id FROM houses WHERE type = 'shell'")
  if (legacy.length) {
    const FIX = {
      H1006: ['dome', 'h-dome', '海带森林 · 圆顶树屋（独栋）'],
      H1011: ['rock', 'h-rock', '沙地平原 · 岩石屋（两居）'],
      H1013: ['dome', 'h-dome', '海带森林 · 小蜗的玻璃树屋'],
      H2002: ['dome', 'h-dome', '海带森林 · 小蜗的玻璃树屋（出售）']
    }
    for (const [id, [type, svg, title]] of Object.entries(FIX)) {
      await db.run('UPDATE houses SET type = ?, svg = ?, title = ? WHERE id = ?', [type, svg, title, id])
    }
    await db.run("UPDATE houses SET type = 'dome', svg = 'h-dome' WHERE type = 'shell'")
    await db.run("UPDATE houses SET desc = REPLACE(desc, '贝壳结构', '玻璃穹顶') WHERE desc LIKE '%贝壳结构%'")
    added.push(`houses.type(shell→${legacy.length}套)`)
  }

  // 数据隔离：消息 / 账单 / 预约原来没有「归属人」，谁登录看到的是同一份（还能把别人的标记已读、替别人付款）。
  // CREATE TABLE IF NOT EXISTS 不会给老库补列，所以这里单独 ALTER；存量行统一归到演示账号，避免升级完页面一片空白。
  const OWNER_INDEX = { messages: 'idx_msg_user', bills: 'idx_bill_user', bookings: 'idx_booking_user' }
  for (const [table, idxName] of Object.entries(OWNER_INDEX)) {
    if (!(await hasColumn(table, 'user_id'))) {
      await db.run(`ALTER TABLE ${table} ADD COLUMN user_id VARCHAR(32) DEFAULT ''`)
      added.push(`${table}.user_id`)
    }
    await db.run(`UPDATE ${table} SET user_id = ? WHERE user_id IS NULL OR user_id = ''`, [DEMO_USER.id])
    try {
      if (db.dialect === 'sqlite') await db.run(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${table} (user_id)`)
      else await db.run(`ALTER TABLE ${table} ADD INDEX ${idxName} (user_id)`)
    } catch (e) { /* 新库建表时已经带了这个索引，重复建会报错，忽略即可 */ }
  }
  return added
}

async function insertMany(table, list) {
  for (const item of list) {
    const { sql, params } = buildInsert(table, item)
    await db.run(sql, params)
  }
}

export async function seedIfEmpty(force = false) {
  const row = await db.get('SELECT COUNT(*) AS n FROM houses')
  const count = Number(row?.n ?? row?.N ?? 0)
  if (count > 0 && !force) return { seeded: false, houses: count }

  if (force) {
    for (const t of ['sessions', 'sale_intents', 'post_likes', 'post_comments', 'community_posts', 'favorites', 'decor_state', 'reviews', 'feeds', 'friends', 'messages', 'bookings', 'bills', 'leases', 'houses', 'users']) {
      await db.run(`DELETE FROM ${t}`)
    }
  }

  await insertMany('users', [{
    ...DEMO_USER,
    passwordHash: await hashPassword(DEMO_PASSWORD),
    createdAt: new Date().toISOString().slice(0, 10)
  }])
  await insertMany('houses', HOUSES)
  await insertMany('houses', SALE_HOUSES)
  await insertMany('sale_intents', SALE_INTENTS)
  await insertMany('leases', LEASES)
  // 账单 / 预约 / 消息都要记在演示账号名下，否则登录后一条都看不到（数据隔离的副作用，必须在这里补上）
  await insertMany('bills', BILLS.map((b) => ({ ...b, userId: DEMO_USER.id })))
  await insertMany('bookings', BOOKINGS.map((b) => ({ ...b, userId: DEMO_USER.id })))
  await insertMany('messages', MESSAGES.map((m) => ({ ...m, userId: DEMO_USER.id })))
  await insertMany('friends', FRIENDS)
  await insertMany('reviews', REVIEWS)
  await insertMany('feeds', FEEDS)
  await insertMany('favorites', DEMO_FAVORITES.map((houseId) => ({ userId: DEMO_USER.id, houseId })))
  await insertMany('decor_state', [{ userId: DEMO_USER.id, theme: DEMO_DECOR.theme, placed: DEMO_DECOR.placed }])
  await insertMany('community_posts', COMMUNITY_POSTS)
  await insertMany('post_comments', POST_COMMENTS)
  await normalizeCommunityCounts()

  return { seeded: true, houses: HOUSES.length, posts: COMMUNITY_POSTS.length }
}


/**
 * 按实际评论/点赞行校准帖子的计数字段与热度。
 * 种子里的 commentCount 是手写的，容易和真实评论行数对不上（列表显示 4 条、点进去只有 1 条），
 * 所以每次灌完种子都跑一次校准，保证「列表数字 = 详情页实际条数」。
 */
export async function normalizeCommunityCounts() {
  await db.run(
    `UPDATE community_posts SET comment_count =
       (SELECT COUNT(*) FROM post_comments c WHERE c.post_id = community_posts.id)`
  )
  await db.run('UPDATE community_posts SET hot_score = like_count * 3 + comment_count * 5')
  return { ok: true }
}

/** 社区数据单独补种：老库升级上来时若帖子表为空，自动灌入示例帖，不惊动其它业务数据 */
export async function seedCommunityIfEmpty() {
  const row = await db.get('SELECT COUNT(*) AS n FROM community_posts')
  const n = Number(row?.n ?? row?.N ?? 0)
  if (n > 0) return { seeded: false, posts: n }
  await insertMany('community_posts', COMMUNITY_POSTS)
  await insertMany('post_comments', POST_COMMENTS)
  await normalizeCommunityCounts()
  return { seeded: true, posts: COMMUNITY_POSTS.length }
}

/** 售房数据单独补种：老库加上 trade 列后是清一色出租房，这里补几套二手房与示例意向 */
export async function seedSaleIfEmpty() {
  const row = await db.get("SELECT COUNT(*) AS n FROM houses WHERE trade = 'sale'")
  const n = Number(row?.n ?? row?.N ?? 0)
  if (n > 0) return { seeded: false, sale: n }

  await insertMany('houses', SALE_HOUSES)
  const ids = new Set((await db.all('SELECT id FROM houses')).map((r) => r.id ?? r.ID))
  await insertMany('sale_intents', SALE_INTENTS.filter((i) => ids.has(i.houseId)))
  return { seeded: true, sale: SALE_HOUSES.length, intents: SALE_INTENTS.length }
}

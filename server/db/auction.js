/**
 * 法拍房（拍卖）数据层
 *
 * 设计要点（和售房意向那种「谈价」链路不同，拍卖的核心是并发下的价格正确性）：
 * - 价格不变量：current_price = 0 表示「无人出价」，此时起拍价就是门槛；
 *   有出价后，门槛 = current_price + step。所有校验都塞进**一条条件 UPDATE**，
 *   数据库自己保证不会出现两个人都以为自己领先的情况；Redis 锁只用来削峰、让失败方早点收到反馈。
 * - 延时规则：最后 5 分钟内有人出价，结束时间 +5 分钟，整场最多延时 3 次（防止无限拖）；
 *   延时与出价在同一条 UPDATE 里改，不会出现「价格上去了但时间没延」。
 * - 结算：到点后懒结算（任何一次读取 / 出价前都会调用 settleDue），
 *   不依赖进程内定时器，多实例部署也不会漏。
 * - 钱：保证金只展示不冻结，和二手房一致，平台不碰资金。
 */
import db from './index.js'
import { buildInsert, genId, rowToObj, rowsToObjs } from '../lib/serialize.js'
import { charOf } from '../../src/data/seed.js'

export const RULES = {
  extendWindowMs: 5 * 60 * 1000, // 最后 5 分钟
  extendMs: 5 * 60 * 1000,       // 每次延时 5 分钟
  maxExtend: 3                   // 最多延时 3 次
}

const pad = (n) => String(n).padStart(2, '0')
export const nowStr = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
/** 字符串时间 → 毫秒；MySQL 驱动会把 DATETIME 还原成 Date，SQLite 给的是字符串，这里都接住 */
export const msOf = (s) => {
  if (!s) return 0
  if (s instanceof Date) return s.getTime()
  const str = String(s)
  return new Date(str.includes('T') ? str : str.replace(' ', 'T')).getTime()
}

export class BizError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

/* ---------------- 建表 ---------------- */
const DDL_MYSQL = [
  `CREATE TABLE IF NOT EXISTS auctions (
    id VARCHAR(16) NOT NULL PRIMARY KEY,
    house_id VARCHAR(16) NOT NULL,
    seller_id VARCHAR(16) NOT NULL,
    title VARCHAR(160) NOT NULL DEFAULT '',
    start_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    step DECIMAL(12,2) NOT NULL DEFAULT 1000,
    deposit DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    current_bidder VARCHAR(16) NOT NULL DEFAULT '',
    bid_count INT NOT NULL DEFAULT 0,
    extend_count INT NOT NULL DEFAULT 0,
    status VARCHAR(12) NOT NULL DEFAULT 'live',
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    result_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    winner_id VARCHAR(16) NOT NULL DEFAULT '',
    created_at DATETIME NULL,
    KEY idx_auction_status (status, end_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS bids (
    id VARCHAR(16) NOT NULL PRIMARY KEY,
    auction_id VARCHAR(16) NOT NULL,
    bidder_id VARCHAR(16) NOT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    extend_flag INT NOT NULL DEFAULT 0,
    created_at DATETIME NULL,
    KEY idx_bid_auction (auction_id, price)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
]

const DDL_SQLITE = [
  `CREATE TABLE IF NOT EXISTS auctions (
    id TEXT NOT NULL PRIMARY KEY,
    house_id TEXT NOT NULL,
    seller_id TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    start_price REAL NOT NULL DEFAULT 0,
    step REAL NOT NULL DEFAULT 1000,
    deposit REAL NOT NULL DEFAULT 0,
    current_price REAL NOT NULL DEFAULT 0,
    current_bidder TEXT NOT NULL DEFAULT '',
    bid_count INTEGER NOT NULL DEFAULT 0,
    extend_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'live',
    start_at TEXT NULL,
    end_at TEXT NULL,
    result_price REAL NOT NULL DEFAULT 0,
    winner_id TEXT NOT NULL DEFAULT '',
    created_at TEXT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bids (
    id TEXT NOT NULL PRIMARY KEY,
    auction_id TEXT NOT NULL,
    bidder_id TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    extend_flag INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS idx_auction_status ON auctions(status, end_at)',
  'CREATE INDEX IF NOT EXISTS idx_bid_auction ON bids(auction_id, price)'
]

export async function resetAuction() {
  await db.run('DELETE FROM bids')
  await db.run('DELETE FROM auctions')
  const r = await initAuction()
  return { ...r, ids: demoAuctions().map((x) => x.a.id) }
}

/** 演示数据：四场，覆盖「有人出价 / 无人出价 / 我挂拍的 / 已结束」四种状态 */
function demoAuctions() {
  const now = Date.now()
  const at = (ms) => nowStr(new Date(ms))
  return [
    {
      a: {
        id: 'A1001', houseId: 'H2001', sellerId: 'krabs', title: '比奇堡市中心 · 珊瑚街全景公寓',
        startPrice: 760000, step: 20000, deposit: 50000,
        currentPrice: 800000, currentBidder: 'squidward', bidCount: 3, extendCount: 1,
        status: 'live', startAt: at(now - 2 * 86400e3), endAt: at(now + 3 * 86400e3)
      },
      bids: [
        ['squidward', 800000, -6 * 3600e3, 0],
        ['patrick', 780000, -26 * 3600e3, 0],
        ['squidward', 760000, -40 * 3600e3, 0]
      ]
    },
    {
      a: {
        id: 'A1002', houseId: 'H2003', sellerId: 'sandy', title: '水母田 · 270° 观景菠萝屋',
        startPrice: 1150000, step: 30000, deposit: 80000,
        currentPrice: 0, currentBidder: '', bidCount: 0, extendCount: 0,
        status: 'live', startAt: at(now - 3 * 3600e3), endAt: at(now + 42 * 60e3)
      },
      bids: []
    },
    {
      a: {
        id: 'A1003', houseId: 'H2002', sellerId: 'gary', title: '海带森林 · 小蜗的玻璃树屋（出售）',
        startPrice: 380000, step: 10000, deposit: 20000,
        currentPrice: 400000, currentBidder: 'patrick', bidCount: 2, extendCount: 0,
        status: 'live', startAt: at(now - 86400e3), endAt: at(now + 26 * 3600e3)
      },
      bids: [
        ['patrick', 400000, -5 * 3600e3, 0],
        ['spongebob', 390000, -20 * 3600e3, 0]
      ]
    },
    {
      a: {
        id: 'A1000', houseId: 'H2004', sellerId: 'patrick', title: '岩石区 · 独栋岩石屋',
        startPrice: 320000, step: 10000, deposit: 20000,
        currentPrice: 360000, currentBidder: 'krabs', bidCount: 4, extendCount: 2,
        status: 'ended', startAt: at(now - 12 * 86400e3), endAt: at(now - 5 * 86400e3),
        resultPrice: 360000, winnerId: 'krabs'
      },
      bids: []
    }
  ]
}

export async function initAuction() {
  const ddl = db.dialect === 'sqlite' ? DDL_SQLITE : DDL_MYSQL
  for (const sql of ddl) await db.exec(sql)

  const n = Number((await db.get('SELECT COUNT(*) AS n FROM auctions'))?.n ?? 0)
  if (n > 0) return { created: true, seeded: false, count: n }

  for (const item of demoAuctions()) {
    const row = { ...item.a, createdAt: item.a.startAt, resultPrice: item.a.resultPrice || 0, winnerId: item.a.winnerId || '' }
    const { sql, params } = buildInsert('auctions', row)
    await db.run(sql, params)
    for (const [bidderId, price, offset, extendFlag] of item.bids) {
      const b = {
        id: genId('B'),
        auctionId: item.a.id,
        bidderId,
        price,
        extendFlag,
        createdAt: nowStr(new Date(Date.now() + offset))
      }
      const q = buildInsert('bids', b)
      // 必须 await：之前 fire-and-forget 会让「重置后立刻查详情」看到 0 条出价记录
      await db.run(q.sql, q.params)
    }
  }
  return { created: true, seeded: true, count: demoAuctions().length }
}

/* ---------------- 结算 ---------------- */
async function notifyChar(charId, type, title, body) {
  try {
    const u = await db.get('SELECT id FROM users WHERE char_id = ?', [charId])
    const uid = u?.id ?? u?.ID
    if (!uid) return
    const row = {
      id: genId('M'), type, fromId: type === 'system' ? 'system' : charId,
      userId: uid, title, body, time: '刚刚', read: false, createdAt: nowStr()
    }
    const { sql, params } = buildInsert('messages', row)
    await db.run(sql, params)
  } catch (e) { /* 通知失败不影响结算 */ }
}

async function settleOne(a) {
  const price = Number(a.current_price ?? a.currentPrice ?? 0)
  const winner = a.current_bidder || a.currentBidder || ''
  const houseId = a.house_id ?? a.houseId
  const sellerId = a.seller_id ?? a.sellerId
  const won = await db.tx(async (c) => {
    const r = await c.run(
      "UPDATE auctions SET status = 'ended', result_price = ?, winner_id = ? WHERE id = ? AND status = 'live'",
      [price, winner, a.id]
    )
    if (!r.changes) return false
    if (winner) {
      // 成交后房源从「在售」变「已售」，租房房源则置为已租出，避免还被别处挂出来
      const house = await c.get('SELECT trade FROM houses WHERE id = ?', [houseId])
      const trade = house?.trade ?? house?.TRADE
      if (trade === 'sale') await c.run("UPDATE houses SET status = 'sold' WHERE id = ?", [houseId])
      else await c.run("UPDATE houses SET status = 'rented' WHERE id = ?", [houseId])
    }
    return true
  })
  if (won) {
    if (winner) {
      await notifyChar(winner, 'system', '恭喜竞拍成功', `你以 ¥${price.toLocaleString('zh-CN')} 拍下了「${a.title}」，房东会尽快联系你办理手续。`)
      await notifyChar(sellerId, 'system', '拍卖已结束', `「${a.title}」以 ¥${price.toLocaleString('zh-CN')} 成交，买家 ${charOf(winner).name}。`)
    } else {
      await notifyChar(sellerId, 'system', '拍卖流拍', `「${a.title}」到点无人出价，已结束。可以重新上拍。`)
    }
  }
  return won
}

/** 到期结算：任何读接口都会先调一次，保证「到点就是结束」，不依赖定时器 */
export async function settleDue() {
  const rows = await db.all("SELECT * FROM auctions WHERE status = 'live' AND end_at <= ?", [nowStr()])
  for (const r of rows) await settleOne(r)
  return rows.length
}

/* ---------------- 查询 ---------------- */
const num = (v) => Number(v ?? 0)

/** 拍卖 + 房源摘要 + 双方名字（列表一次查完，避免 N+1） */
async function enrich(rows) {
  if (!rows.length) return []
  const ids = [...new Set(rows.map((r) => r.houseId))]
  const ph = ids.map(() => '?').join(',')
  const houses = await db.all(
    `SELECT id, title, address, svg, type, district, price, area, rooms, halls, trade, status FROM houses WHERE id IN (${ph})`,
    ids
  )
  const hmap = new Map(houses.map((h) => [h.id ?? h.ID, h]))
  const now = Date.now()
  return rows.map((a) => {
    const h = hmap.get(a.houseId)
    const current = num(a.currentPrice)
    const endMs = msOf(a.endAt)
    return {
      ...a,
      /** 有效价：还没人出价时显示起拍价，避免前端到处写 `|| startPrice` */
      price: current || num(a.startPrice),
      floorPrice: current ? current + num(a.step) : num(a.startPrice),
      leftMs: Math.max(0, endMs - now),
      extendLeft: Math.max(0, RULES.maxExtend - num(a.extendCount)),
      sellerName: charOf(a.sellerId).name,
      leaderName: a.currentBidder ? charOf(a.currentBidder).name : '',
      house: h
        ? {
            id: h.id ?? h.ID,
            title: h.title ?? h.TITLE,
            address: h.address ?? h.ADDRESS,
            svg: h.svg ?? h.SVG,
            type: h.type ?? h.TYPE,
            district: h.district ?? h.DISTRICT,
            price: num(h.price ?? h.PRICE),
            area: num(h.area ?? h.AREA),
            rooms: num(h.rooms ?? h.ROOMS),
            halls: num(h.halls ?? h.HALLS),
            trade: h.trade ?? h.TRADE,
            status: h.status ?? h.STATUS
          }
        : null
    }
  })
}

export async function listAuctions({ status = '', district = '', sellerId = '', bidderId = '', limit = 60 } = {}) {
  await settleDue()
  const where = []
  const params = []
  if (status === 'live' || status === 'ended') { where.push('status = ?'); params.push(status) }
  if (sellerId) { where.push('seller_id = ?'); params.push(sellerId) }
  if (bidderId) {
    // 「我参与过的」：出价表里有我，或者我正领先
    where.push('(current_bidder = ? OR id IN (SELECT auction_id FROM bids WHERE bidder_id = ?))')
    params.push(bidderId, bidderId)
  }
  const sql = `SELECT * FROM auctions ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY CASE WHEN status = 'live' THEN 0 ELSE 1 END, end_at ASC`
  let items = await enrich(rowsToObjs('auctions', await db.all(sql, params)))
  if (district) items = items.filter((a) => a.house?.district === district)
  items = items.slice(0, limit)

  const counts = { live: 0, ended: 0 }
  items.forEach((i) => { if (counts[i.status] !== undefined) counts[i.status] += 1 })
  return { items, counts, total: items.length }
}

export async function getAuction(id) {
  await settleDue()
  const row = rowToObj('auctions', await db.get('SELECT * FROM auctions WHERE id = ?', [id]))
  if (!row) return null
  const [one] = await enrich([row])
  const bids = rowsToObjs('bids', await db.all(
    'SELECT * FROM bids WHERE auction_id = ? ORDER BY price DESC, created_at DESC LIMIT 30', [id]
  )).map((b) => ({ ...b, bidderName: charOf(b.bidderId).name }))
  return { ...one, bids }
}

/* ---------------- 出价 ---------------- */
/**
 * 出价：价格与延时用同一条条件 UPDATE 落库。
 * 谁先在数据库里把 current_price 推上去，谁就领先；后到的因为门槛不满足，changes=0。
 */
export async function placeBid({ auctionId, bidderId, price, lock }) {
  const now = new Date()
  const nowS = nowStr(now)
  const auction = rowToObj('auctions', await db.get('SELECT * FROM auctions WHERE id = ?', [auctionId]))
  if (!auction) throw new BizError('拍卖不存在', 404)
  if (auction.status !== 'live') throw new BizError('这场拍卖已经结束了', 400)
  if (msOf(auction.endAt) <= now.getTime()) throw new BizError('已经到结束时间，不能再出价', 400)
  if (auction.sellerId === bidderId) throw new BizError('不能给自己挂拍的房子出价', 403)

  const current = num(auction.currentPrice)
  const step = num(auction.step)
  const floor = current ? current + step : num(auction.startPrice)
  const value = Math.round(num(price) * 100) / 100
  if (!(value > 0)) throw new BizError('请填写有效的出价金额')
  if (value < floor) {
    throw new BizError(`出价不能低于 ¥${floor.toLocaleString('zh-CN')}${current ? `（当前价 ¥${current.toLocaleString('zh-CN')} + 最小加价 ¥${step.toLocaleString('zh-CN')}）` : '（起拍价）'}`)
  }
  if (auction.currentBidder === bidderId) throw new BizError('你已经是最高价了，等别人来追吧')

  // 削峰：同一场拍卖同一时刻只放一个人进数据库，其余立刻拿到「手慢了」
  // Redis 挂了时 lock 返回 undefined，直接放行 —— 价格正确性由下面的条件 UPDATE 兜底，锁绝不是必需项
  const token = lock ? await lock(`auction:bid:${auctionId}`, 2500) : undefined
  if (token === false) throw new BizError('出价太密集了，再点一次试试', 409)

  try {
    const extendsNow = msOf(auction.endAt) - now.getTime() <= RULES.extendWindowMs && num(auction.extendCount) < RULES.maxExtend
    const newEnd = extendsNow ? nowStr(new Date(msOf(auction.endAt) + RULES.extendMs)) : auction.endAt

    const bidId = genId('B')
    const done = await db.tx(async (c) => {
      const r = await c.run(
        `UPDATE auctions SET
           current_price = ?, current_bidder = ?, bid_count = bid_count + 1,
           extend_count = extend_count + CASE WHEN ? = 1 THEN 1 ELSE 0 END,
           end_at = CASE WHEN ? = 1 THEN ? ELSE end_at END
         WHERE id = ? AND status = 'live' AND end_at > ?
           AND ? >= (CASE WHEN current_price > 0 THEN current_price + step ELSE start_price END)
           AND (current_bidder = '' OR current_bidder <> ?)`,
        [value, bidderId, extendsNow ? 1 : 0, extendsNow ? 1 : 0, newEnd, auctionId, nowS, value, bidderId]
      )
      if (!r.changes) return false
      await c.run(
        'INSERT INTO bids (id, auction_id, bidder_id, price, extend_flag, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [bidId, auctionId, bidderId, value, extendsNow ? 1 : 0, nowS]
      )
      return true
    })

    if (!done) {
      const fresh = rowToObj('auctions', await db.get('SELECT * FROM auctions WHERE id = ?', [auctionId]))
      if (!fresh || fresh.status !== 'live') throw new BizError('这场拍卖已经结束了', 400)
      const f = num(fresh.currentPrice)
      if (fresh.currentBidder === bidderId) throw new BizError('你已经是最高价了', 409)
      throw new BizError(`手慢了，当前价已经到 ¥${f.toLocaleString('zh-CN')}`, 409)
    }

    // 被超越的上一任领先者收一条提醒
    if (auction.currentBidder && auction.currentBidder !== bidderId) {
      await notifyChar(auction.currentBidder, 'system', '你的出价被超越了',
        `「${auction.title}」当前最高价 ¥${value.toLocaleString('zh-CN')}，${charOf(bidderId).name} 领先。`)
    }

    const updated = await getAuction(auctionId)
    return { auction: updated, bidId, extended: extendsNow, endAt: newEnd, price: value }
  } finally {
    if (lock && token) await token.release()
  }
}

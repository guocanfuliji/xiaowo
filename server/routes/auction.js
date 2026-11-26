/**
 * 法拍房（拍卖）：公开加价 + 最后 5 分钟延时（最多 3 次）
 *
 * 为什么价格校验不靠读-判断-再写：
 *   两个人同时出价时，「先查当前价、再算门槛、再 UPDATE」会双写成功。
 *   这里把门槛判断塞进 UPDATE 的 WHERE 里，数据库的原子性就是唯一裁判；
 *   Redis 锁只是让同一场拍卖的并发请求排队几毫秒，减少无谓的失败重试。
 */
import { Router } from 'express'
import db from '../db/index.js'
import { buildInsert, genId, rowToObj } from '../lib/serialize.js'
import { currentUserCharId, pushMessage } from './catalog.js'
import { redis } from '../lib/redis.js'
import { charOf } from '../../src/data/seed.js'
import {
  BizError, RULES, getAuction, listAuctions, nowStr, placeBid, settleDue
} from '../db/auction.js'

export const router = Router()

const nOf = (row) => Number(row?.n ?? row?.N ?? 0)
const round2 = (n) => Math.round(Number(n) * 100) / 100

/* ---------------- 列表 ---------------- */
router.get('/auctions', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const scope = String(req.query.scope || '')
    const data = await listAuctions({
      status: String(req.query.status || ''),
      district: String(req.query.district || ''),
      sellerId: scope === 'mine' ? charId : '',
      bidderId: scope === 'bidding' ? charId : ''
    })
    res.json({ ok: true, data: { ...data, scope: scope || 'all' } })
  } catch (e) { next(e) }
})

/* ---------------- 概览（侧栏角标 / 统计条） ---------------- */
router.get('/auctions/overview', async (req, res, next) => {
  try {
    await settleDue()
    const charId = await currentUserCharId(req)
    const live = nOf(await db.get("SELECT COUNT(*) AS n FROM auctions WHERE status = 'live'"))
    const ended = nOf(await db.get("SELECT COUNT(*) AS n FROM auctions WHERE status = 'ended'"))
    const mine = nOf(await db.get("SELECT COUNT(*) AS n FROM auctions WHERE seller_id = ? AND status = 'live'", [charId]))
    const leading = nOf(await db.get("SELECT COUNT(*) AS n FROM auctions WHERE current_bidder = ? AND status = 'live'", [charId]))
    const myBids = nOf(await db.get(
      "SELECT COUNT(DISTINCT auction_id) AS n FROM bids WHERE bidder_id = ?", [charId]
    ))
    const poolRow = await db.get("SELECT COALESCE(SUM(price), 0) AS s FROM bids WHERE bidder_id = ?", [charId])
    res.json({
      ok: true,
      data: { live, ended, mine, leading, myBids, bidAmount: Number(poolRow?.s ?? poolRow?.S ?? 0), rules: RULES }
    })
  } catch (e) { next(e) }
})

/* ---------------- 出价排行（ZSET 优先，缺失则回源数据库并回填） ---------------- */
router.get('/auctions/:id/bids', async (req, res, next) => {
  try {
    const auction = rowToObj('auctions', await db.get('SELECT * FROM auctions WHERE id = ?', [req.params.id]))
    if (!auction) return res.status(404).json({ ok: false, error: '拍卖不存在' })

    const limit = Math.min(50, Math.max(5, Number(req.query.limit) || 20))
    let source = 'redis'
    const ids = await redis.rankTop(`auction:${auction.id}`, limit)
    let rows = []
    if (ids && ids.length) {
      const ph = ids.map(() => '?').join(',')
      rows = await db.all(`SELECT * FROM bids WHERE id IN (${ph})`, ids)
      // 榜单里可能残留已删除的 id（重建演示数据后就会出现）→ 当空榜处理，回源重建
      if (rows.length !== ids.length) rows = []
      else {
        const order = new Map(ids.map((id, i) => [id, i]))
        rows.sort((a, b) => (order.get(a.id ?? a.ID) ?? 99) - (order.get(b.id ?? b.ID) ?? 99))
      }
    }
    if (!rows.length) {
      source = 'db'
      rows = await db.all(
        'SELECT * FROM bids WHERE auction_id = ? ORDER BY price DESC, created_at DESC LIMIT ?',
        [auction.id, limit]
      )
      // 首次访问、Redis 重启、或榜单脏掉时，用数据库结果把排行补回去（榜单可自愈）
      if (ids && ids.length) await redis.rankClear(`auction:${auction.id}`)
      for (const r of [...rows].reverse()) {
        const id = r.id ?? r.ID
        await redis.rankAdd(`auction:${auction.id}`, id, Number(r.price ?? r.PRICE ?? 0))
      }
    }

    const items = rows.map((r) => {
      const price = Number(r.price ?? r.PRICE ?? 0)
      const bidderId = r.bidder_id ?? r.BIDDER_ID
      return {
        id: r.id ?? r.ID,
        auctionId: r.auction_id ?? r.AUCTION_ID,
        bidderId,
        bidderName: charOf(bidderId).name,
        price,
        extendFlag: Number(r.extend_flag ?? r.EXTEND_FLAG ?? 0),
        createdAt: r.created_at ?? r.CREATED_AT,
        leading: price === Number(auction.currentPrice) && bidderId === auction.currentBidder
      }
    })
    res.json({ ok: true, data: { items, total: nOf(await db.get('SELECT COUNT(*) AS n FROM bids WHERE auction_id = ?', [auction.id])), source } })
  } catch (e) { next(e) }
})

/* ---------------- 详情 ---------------- */
router.get('/auctions/:id', async (req, res, next) => {
  try {
    const data = await getAuction(req.params.id)
    if (!data) return res.status(404).json({ ok: false, error: '拍卖不存在' })
    const charId = await currentUserCharId(req)
    const mine = data.bids.find((b) => b.bidderId === charId) || null
    res.json({
      ok: true,
      data: {
        ...data,
        myBid: mine ? { price: mine.price, createdAt: mine.createdAt } : null,
        leading: data.currentBidder === charId,
        isSeller: data.sellerId === charId,
        // 前端用它换算本机时钟偏差：倒计时按「服务器时间」走，不受用户改表影响
        serverNow: Date.now(),
        rules: RULES
      }
    })
  } catch (e) { next(e) }
})

/* ---------------- 出价 ---------------- */
router.post('/auctions/:id/bids', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const uid = req.authUserId || 'U1001'

    const rate = await redis.rateLimit(`auction-bid:${uid}`, 20, 60)
    if (rate && !rate.allowed) {
      return res.status(429).json({ ok: false, error: '出价太频繁了，喘口气再试（每分钟最多 20 次）' })
    }

    const price = round2(req.body?.price)
    const out = await placeBid({
      auctionId: req.params.id,
      bidderId: charId,
      price,
      lock: (name, ttl) => redis.lock(name, ttl)
    })

    await redis.rankAdd(`auction:${out.auction.id}`, out.bidId, out.price)
    await pushMessage(uid, 'system', out.extended ? '出价成功 · 触发延时' : '出价成功',
      `「${out.auction.title}」你以 ¥${out.price.toLocaleString('zh-CN')} 暂时领先，${out.extended ? '因临近结束，结束时间顺延 5 分钟。' : '结束前被超越会收到通知。'}`)

    res.status(201).json({ ok: true, data: out })
  } catch (e) {
    if (e instanceof BizError) return res.status(e.status).json({ ok: false, error: e.message })
    next(e)
  }
})

/* ---------------- 房主挂拍 ---------------- */
router.post('/houses/:id/auctions', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const house = rowToObj('houses', await db.get('SELECT * FROM houses WHERE id = ?', [req.params.id]))
    if (!house) return res.status(404).json({ ok: false, error: '房源不存在' })
    if (house.ownerId !== charId) return res.status(403).json({ ok: false, error: '只能拍卖自己名下的房源' })
    if (house.status !== 'available') return res.status(400).json({ ok: false, error: '该房源当前不处于可售/可租状态' })

    const dup = await db.get("SELECT id FROM auctions WHERE house_id = ? AND status = 'live'", [house.id])
    if (dup) return res.status(409).json({ ok: false, error: '这套房已经有一场正在进行的拍卖' })

    const startPrice = round2(req.body?.startPrice ?? Math.round(house.price * 0.85))
    if (!(startPrice > 0)) return res.status(400).json({ ok: false, error: '请填写有效的起拍价' })
    if (startPrice > house.price * 1.2) return res.status(400).json({ ok: false, error: '起拍价不能高于挂牌价的 1.2 倍' })

    const step = round2(req.body?.step ?? Math.max(1000, Math.round(startPrice * 0.02)))
    if (!(step > 0)) return res.status(400).json({ ok: false, error: '最小加价幅度必须大于 0' })
    const hours = Math.min(14 * 24, Math.max(1, Number(req.body?.hours) || 72))
    const deposit = round2(req.body?.deposit ?? Math.max(10000, Math.round(startPrice * 0.05)))

    const now = new Date()
    const row = {
      id: genId('A'),
      houseId: house.id,
      sellerId: charId,
      title: house.title,
      startPrice,
      step,
      deposit,
      currentPrice: 0,          // 0 = 无人出价，起拍价就是门槛
      currentBidder: '',
      bidCount: 0,
      extendCount: 0,
      status: 'live',
      startAt: nowStr(now),
      endAt: nowStr(new Date(now.getTime() + hours * 3600e3)),
      resultPrice: 0,
      winnerId: '',
      createdAt: nowStr(now)
    }
    const { sql, params } = buildInsert('auctions', row)
    await db.run(sql, params)
    await redis.rankClear(`auction:${row.id}`)

    res.status(201).json({ ok: true, data: await getAuction(row.id) })
  } catch (e) { next(e) }
})

/* ---------------- 房主撤回（仅限无人出价） ---------------- */
router.post('/auctions/:id/cancel', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const auction = rowToObj('auctions', await db.get('SELECT * FROM auctions WHERE id = ?', [req.params.id]))
    if (!auction) return res.status(404).json({ ok: false, error: '拍卖不存在' })
    if (auction.sellerId !== charId) return res.status(403).json({ ok: false, error: '只有房主可以撤回' })
    if (auction.status !== 'live') return res.status(400).json({ ok: false, error: '这场拍卖已经结束' })
    if (Number(auction.currentPrice) > 0) return res.status(400).json({ ok: false, error: '已经有人出价，不能撤回了' })

    const r = await db.run("UPDATE auctions SET status = 'canceled', end_at = ? WHERE id = ? AND status = 'live'", [nowStr(), auction.id])
    if (!r.changes) return res.status(409).json({ ok: false, error: '状态已经变化，请刷新' })
    res.json({ ok: true, data: { id: auction.id, status: 'canceled' } })
  } catch (e) { next(e) }
})


/**
 * 二手房买卖：挂牌房源的「购房意向」流转
 *
 * 业务规则：
 * - 只有 trade='sale' 且 status='available' 的房源能收意向；
 * - 卖家不能给自己出价；同一买家对同一套房只允许一条 pending 意向；
 * - 卖家接受某条意向时，同一套房的其它 pending 意向一并置为 rejected，房源置 sold；
 * - 全程不做资金流：意向价只是「谈定的价格」，没有钱包、没有冻结。
 * 一致性：接受动作放在 db.tx 里，房源状态与意向状态不会各走一半。
 */
import { Router } from 'express'
import db from '../db/index.js'
import { buildInsert, genId, rowToObj, rowsToObjs } from '../lib/serialize.js'
import { currentUserId, currentUserCharId, pushMessage } from './catalog.js'
import { redis } from '../lib/redis.js'
import { charOf } from '../../src/data/seed.js'

export const router = Router()

const nOf = (row) => Number(row?.n ?? row?.N ?? 0)
const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const round2 = (n) => Math.round(Number(n) * 100) / 100
const STATUS_TEXT = { pending: '待确认', accepted: '已接受', rejected: '已拒绝', canceled: '已撤回' }

/** 意向 + 房源摘要（列表页一次查完，避免 N+1） */
async function withHouses(intents) {
  const ids = [...new Set(intents.map((i) => i.houseId))]
  if (!ids.length) return []
  const ph = ids.map(() => '?').join(',')
  const rows = await db.all(
    `SELECT id, title, address, svg, district, price, status, trade, area FROM houses WHERE id IN (${ph})`,
    ids
  )
  const map = new Map(rows.map((r) => [r.id ?? r.ID, r]))
  return intents.map((i) => {
    const h = map.get(i.houseId)
    return {
      ...i,
      statusText: STATUS_TEXT[i.status] || i.status,
      buyer: charOf(i.buyerId).name,
      seller: charOf(i.sellerId).name,
      house: h
        ? {
            id: h.id ?? h.ID,
            title: h.title ?? h.TITLE,
            address: h.address ?? h.ADDRESS,
            svg: h.svg ?? h.SVG,
            district: h.district ?? h.DISTRICT,
            price: Number(h.price ?? h.PRICE ?? 0),
            status: h.status ?? h.STATUS,
            area: Number(h.area ?? h.AREA ?? 0)
          }
        : null
    }
  })
}

/* ---------------- 提交购房意向 ---------------- */
router.post('/houses/:id/intents', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const charId = await currentUserCharId(req)
    const house = rowToObj('houses', await db.get('SELECT * FROM houses WHERE id = ?', [req.params.id]))
    if (!house) return res.status(404).json({ ok: false, error: '房源不存在' })
    if (house.trade !== 'sale') return res.status(400).json({ ok: false, error: '这套房是出租房源，请走租房流程' })
    if (house.status === 'sold') return res.status(400).json({ ok: false, error: '该房源已成交' })
    if (house.status !== 'available') return res.status(400).json({ ok: false, error: '该房源当前不可售' })
    if (house.ownerId === charId) return res.status(403).json({ ok: false, error: '不能购买自己名下的房源' })

    const price = round2(req.body?.price ?? house.price)
    if (!(price > 0)) return res.status(400).json({ ok: false, error: '请填写有效的出价金额' })
    if (price > house.price * 1.5) {
      return res.status(400).json({ ok: false, error: `出价不要超过挂牌价的 1.5 倍（¥${house.price}）` })
    }

    const dup = await db.get(
      "SELECT id FROM sale_intents WHERE house_id = ? AND buyer_id = ? AND status = 'pending'",
      [house.id, charId]
    )
    if (dup) return res.status(409).json({ ok: false, error: '你已经提交过意向，等房东回应吧' })

    const rate = await redis.rateLimit(`sale-intent:${uid}`, 5, 60)
    if (rate && !rate.allowed) {
      return res.status(429).json({ ok: false, error: '提交太频繁了，请稍后再试（每分钟最多 5 次）' })
    }

    const intent = {
      id: genId('SI'),
      houseId: house.id,
      buyerId: charId,
      sellerId: house.ownerId,
      price,
      message: String(req.body?.message || '').slice(0, 300),
      status: 'pending',
      createdAt: nowStr()
    }
    const { sql, params } = buildInsert('sale_intents', intent)
    await db.run(sql, params)

    await pushMessage(currentUserId(req), 'system', '购房意向已提交',
      `已向 ${charOf(house.ownerId).name} 提交「${house.title}」的购房意向，出价 ¥${price.toLocaleString('zh-CN')}。`)

    res.status(201).json({ ok: true, data: { ...intent, statusText: STATUS_TEXT.pending, buyer: charOf(charId).name, seller: charOf(house.ownerId).name } })
  } catch (e) { next(e) }
})

/* ---------------- 我的意向（买家 / 卖家视角） ---------------- */
router.get('/sale/intents', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const role = req.query.role === 'seller' ? 'seller' : 'buyer'
    const col = role === 'seller' ? 'seller_id' : 'buyer_id'
    const status = String(req.query.status || '')
    const where = [`${col} = ?`]
    const params = [charId]
    if (STATUS_TEXT[status]) { where.push('status = ?'); params.push(status) }

    const rows = await db.all(
      `SELECT * FROM sale_intents WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC`,
      params
    )
    const items = await withHouses(rowsToObjs('sale_intents', rows))

    const counts = { pending: 0, accepted: 0, rejected: 0, canceled: 0 }
    items.forEach((i) => { if (counts[i.status] !== undefined) counts[i.status] += 1 })

    res.json({ ok: true, data: { role, items, counts, total: items.length } })
  } catch (e) { next(e) }
})

/* ---------------- 卖家接受 ---------------- */
router.post('/sale/intents/:id/accept', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const intent = rowToObj('sale_intents', await db.get('SELECT * FROM sale_intents WHERE id = ?', [req.params.id]))
    if (!intent) return res.status(404).json({ ok: false, error: '意向不存在' })
    if (intent.sellerId !== charId) return res.status(403).json({ ok: false, error: '只有房主可以确认意向' })
    if (intent.status !== 'pending') {
      return res.status(400).json({ ok: false, error: `该意向已是「${STATUS_TEXT[intent.status] || intent.status}」状态` })
    }

    const house = rowToObj('houses', await db.get('SELECT * FROM houses WHERE id = ?', [intent.houseId]))
    if (!house) return res.status(404).json({ ok: false, error: '房源不存在' })
    if (house.status === 'sold') return res.status(400).json({ ok: false, error: '该房源已成交' })

    await db.tx(async (conn) => {
      await conn.run("UPDATE sale_intents SET status = 'accepted' WHERE id = ? AND status = 'pending'", [intent.id])
      // 同一套房的其它待确认意向直接关掉，避免一套房卖给两个人
      await conn.run(
        "UPDATE sale_intents SET status = 'rejected' WHERE house_id = ? AND id <> ? AND status = 'pending'",
        [intent.houseId, intent.id]
      )
      await conn.run("UPDATE houses SET status = 'sold' WHERE id = ?", [intent.houseId])
    })

    await pushMessage(currentUserId(req), 'pay', '房源已成交',
      `「${house.title}」已接受 ${charOf(intent.buyerId).name} 的意向，成交价 ¥${Number(intent.price).toLocaleString('zh-CN')}。`)

    res.json({ ok: true, data: { id: intent.id, status: 'accepted', houseId: intent.houseId, houseStatus: 'sold' } })
  } catch (e) { next(e) }
})

/* ---------------- 卖家拒绝 ---------------- */
router.post('/sale/intents/:id/reject', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const intent = rowToObj('sale_intents', await db.get('SELECT * FROM sale_intents WHERE id = ?', [req.params.id]))
    if (!intent) return res.status(404).json({ ok: false, error: '意向不存在' })
    if (intent.sellerId !== charId) return res.status(403).json({ ok: false, error: '只有房主可以拒绝意向' })
    if (intent.status !== 'pending') {
      return res.status(400).json({ ok: false, error: `该意向已是「${STATUS_TEXT[intent.status] || intent.status}」状态` })
    }
    await db.run("UPDATE sale_intents SET status = 'rejected' WHERE id = ?", [intent.id])
    res.json({ ok: true, data: { id: intent.id, status: 'rejected' } })
  } catch (e) { next(e) }
})

/* ---------------- 买家撤回 ---------------- */
router.post('/sale/intents/:id/cancel', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const intent = rowToObj('sale_intents', await db.get('SELECT * FROM sale_intents WHERE id = ?', [req.params.id]))
    if (!intent) return res.status(404).json({ ok: false, error: '意向不存在' })
    if (intent.buyerId !== charId) return res.status(403).json({ ok: false, error: '只能撤回自己提交的意向' })
    if (intent.status !== 'pending') {
      return res.status(400).json({ ok: false, error: `该意向已是「${STATUS_TEXT[intent.status] || intent.status}」状态` })
    }
    await db.run("UPDATE sale_intents SET status = 'canceled' WHERE id = ?", [intent.id])
    res.json({ ok: true, data: { id: intent.id, status: 'canceled' } })
  } catch (e) { next(e) }
})

/* ---------------- 售房概览（页面角标 / 统计卡） ---------------- */
router.get('/sale/overview', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const saleCount = nOf(await db.get("SELECT COUNT(*) AS n FROM houses WHERE trade = 'sale' AND status = 'available'"))
    const soldCount = nOf(await db.get("SELECT COUNT(*) AS n FROM houses WHERE trade = 'sale' AND status = 'sold'"))
    const avgRow = await db.get("SELECT AVG(price) AS n FROM houses WHERE trade = 'sale' AND status = 'available'")
    const avgPrice = Math.round(Number(avgRow?.n ?? avgRow?.N ?? 0))
    const pendingReceived = nOf(await db.get(
      "SELECT COUNT(*) AS n FROM sale_intents WHERE seller_id = ? AND status = 'pending'", [charId]
    ))
    const pendingMine = nOf(await db.get(
      "SELECT COUNT(*) AS n FROM sale_intents WHERE buyer_id = ? AND status = 'pending'", [charId]
    ))
    const dealRow = await db.get(
      "SELECT COUNT(*) AS n, COALESCE(SUM(price), 0) AS s FROM sale_intents WHERE status = 'accepted' AND (seller_id = ? OR buyer_id = ?)",
      [charId, charId]
    )
    res.json({
      ok: true,
      data: {
        saleCount,
        soldCount,
        avgPrice,
        pendingReceived,
        pendingMine,
        deals: nOf(dealRow),
        dealAmount: Number(dealRow?.s ?? dealRow?.S ?? 0)
      }
    })
  } catch (e) { next(e) }
})

/**
 * 房源 / 收藏 / 统计 / 全量快照
 */
import { Router } from 'express'
import db from '../db/index.js'
import { buildInsert, buildUpdate, genId, isClientId, rowToObj, rowsToObjs, today, TABLES } from '../lib/serialize.js'
import { DEMO_USER, DEMO_DECOR } from '../db/init.js'

export const router = Router()

/**
 * 当前请求对应的用户 id。
 * 登录态由 attachUser 中间件从 Bearer token 解析后挂在 req.authUserId 上；
 * 没带 token 时回落到演示账号（游客只读，写操作由 index.js 的守卫拦成 401）。
 */
export const currentUserId = (req) => req.authUserId || DEMO_USER.id

/** 业务表里的 owner_id / author_id 存的是角色 id（gary/spongebob…），与种子数据保持一致 */
export async function currentUserCharId(req) {
  const uid = currentUserId(req)
  const row = await db.get('SELECT char_id FROM users WHERE id = ?', [uid])
  return row?.char_id || row?.CHAR_ID || DEMO_USER.charId
}

/** 不把密码哈希暴露给前端 */
export const stripUser = (u) => {
  if (!u) return u
  const { passwordHash, ...rest } = u
  return rest
}

/* ---------------- 全量快照（前端启动一次拉取） ---------------- */
router.get('/bootstrap', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const charId = await currentUserCharId(req)
    const [userRow] = [await db.get('SELECT * FROM users WHERE id = ?', [uid])]
    const houses = rowsToObjs('houses', await db.all('SELECT * FROM houses ORDER BY created_at DESC, id DESC'))
    // 租约 / 账单 / 预约 / 消息都按当前账号过滤：没有这一步，任何账号登录都能看到别人的租金和私信
    const leases = rowsToObjs('leases', await db.all(
      'SELECT * FROM leases WHERE tenant_id = ? OR owner_id = ?', [charId, charId]
    ))
    const bills = rowsToObjs('bills', await db.all(
      'SELECT * FROM bills WHERE user_id = ? ORDER BY due_date DESC', [uid]
    ))
    const bookings = rowsToObjs('bookings', await db.all(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY visit_date DESC', [uid]
    ))
    const messages = rowsToObjs('messages', await db.all(
      'SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC, id DESC', [uid]
    ))
    const friends = rowsToObjs('friends', await db.all('SELECT * FROM friends'))
    const reviews = rowsToObjs('reviews', await db.all('SELECT * FROM reviews ORDER BY review_date DESC'))
    const feeds = rowsToObjs('feeds', await db.all('SELECT * FROM feeds'))
    const favRows = await db.all('SELECT house_id FROM favorites WHERE user_id = ?', [uid])
    const decorRow = await db.get('SELECT * FROM decor_state WHERE user_id = ?', [uid])
    // 售房意向：既可能是「我提交的」，也可能是「我收到的」，一次取全，前端按买卖双方分组
    const saleIntentRows = await db.all(
      'SELECT * FROM sale_intents WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC',
      [charId, charId]
    )

    res.json({
      ok: true,
      data: {
        user: userRow ? stripUser(rowToObj('users', userRow)) : { ...DEMO_USER },
        houses,
        leases,
        bills,
        bookings,
        messages,
        friends,
        reviews,
        feeds,
        favorites: favRows.map((r) => r.house_id || r.HOUSE_ID),
        saleIntents: rowsToObjs('sale_intents', saleIntentRows),
        decor: decorRow ? rowToObj('decor_state', decorRow) : { theme: DEMO_DECOR.theme, placed: DEMO_DECOR.placed },
        meta: { dialect: db.dialect, houses: houses.length, servedAt: new Date().toISOString() }
      }
    })
  } catch (e) { next(e) }
})

/* ---------------- 房源 ---------------- */
router.get('/houses', async (req, res, next) => {
  try {
    const { district, type, trade, status, q, maxPrice, minPrice, rooms, sort } = req.query
    const where = []
    const params = []
    if (district) { where.push('district = ?'); params.push(district) }
    if (type) { where.push('type = ?'); params.push(type) }
    if (trade) { where.push('trade = ?'); params.push(trade === 'sale' ? 'sale' : 'rent') }
    if (status) { where.push('status = ?'); params.push(status) }
    if (rooms) { where.push('rooms >= ?'); params.push(Number(rooms)) }
    if (maxPrice) { where.push('price <= ?'); params.push(Number(maxPrice)) }
    if (minPrice) { where.push('price >= ?'); params.push(Number(minPrice)) }
    if (q) {
      where.push('(title LIKE ? OR address LIKE ? OR description LIKE ?)')
      const like = `%${q}%`
      params.push(like, like, like)
    }
    const order = {
      priceAsc: 'price ASC',
      priceDesc: 'price DESC',
      areaDesc: 'area DESC',
      rating: 'rating DESC',
      newest: 'created_at DESC, id DESC'
    }[sort] || 'featured DESC, rating DESC'

    const sql = `SELECT * FROM houses ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`
    res.json({ ok: true, data: rowsToObjs('houses', await db.all(sql, params)) })
  } catch (e) { next(e) }
})

router.get('/houses/:id', async (req, res, next) => {
  try {
    const row = await db.get('SELECT * FROM houses WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ ok: false, error: '房源不存在' })
    res.json({ ok: true, data: rowToObj('houses', row) })
  } catch (e) { next(e) }
})

router.post('/houses', async (req, res, next) => {
  try {
    const b = req.body || {}
    const trade = b.trade === 'sale' ? 'sale' : 'rent'
    const miss = []
    if (!b.title?.trim()) miss.push('title')
    if (!b.address?.trim()) miss.push('address')
    if (!(Number(b.price) > 0)) miss.push(trade === 'sale' ? 'price（总价）' : 'price（月租）')
    if (!(Number(b.area) > 0)) miss.push('area')
    if (trade === 'rent' && !b.availableFrom) miss.push('availableFrom')
    if (miss.length) return res.status(400).json({ ok: false, error: '缺少必填字段：' + miss.join(', ') })

    const house = {
      id: isClientId(b.id) ? b.id : genId(trade === 'sale' ? 'HS' : 'H'),
      title: b.title.trim(),
      type: b.type || 'pineapple',
      trade,
      svg: b.svg || 'h-pineapple',
      district: b.district || 'center',
      address: b.address.trim(),
      price: Number(b.price),
      deposit: trade === 'sale' ? 0 : Number(b.deposit) || 0,
      area: Number(b.area),
      rooms: Number(b.rooms) || 1,
      halls: Number(b.halls) || 0,
      baths: Number(b.baths) || 1,
      floor: Number(b.floor) || 1,
      totalFloor: Number(b.totalFloor) || Number(b.floor) || 1,
      orientation: b.orientation || '朝南',
      fit: b.fit || '精装',
      tags: Array.isArray(b.tags) ? b.tags : [],
      facilities: Array.isArray(b.facilities) ? b.facilities : [],
      ownerId: await currentUserCharId(req),
      status: 'available',
      availableFrom: b.availableFrom || '',
      minLease: trade === 'sale' ? 0 : Number(b.minLease) || 12,
      views: 0,
      rating: 5,
      reviewCount: 0,
      featured: false,
      x: Number(b.x) || 20 + Math.round(Math.random() * 60),
      y: Number(b.y) || 20 + Math.round(Math.random() * 60),
      desc: b.desc || '',
      createdAt: today()
    }
    const { sql, params } = buildInsert('houses', house)
    await db.run(sql, params)
    await pushMessage(currentUserId(req), 'system', '房源发布成功',
      `你的${trade === 'sale' ? '出售' : '出租'}房源「${house.title}」已通过审核并上架。`)
    res.status(201).json({ ok: true, data: house })
  } catch (e) { next(e) }
})

router.patch('/houses/:id', async (req, res, next) => {
  try {
    const exist = await db.get('SELECT id FROM houses WHERE id = ?', [req.params.id])
    if (!exist) return res.status(404).json({ ok: false, error: '房源不存在' })
    const allowed = {}
    for (const k of ['title', 'price', 'deposit', 'area', 'rooms', 'halls', 'baths', 'floor', 'totalFloor', 'orientation', 'fit', 'tags', 'facilities', 'status', 'availableFrom', 'minLease', 'desc', 'featured', 'x', 'y', 'trade']) {
      if (req.body[k] !== undefined) allowed[k] = req.body[k]
    }
    const u = buildUpdate('houses', allowed, 'id', req.params.id)
    if (u) await db.run(u.sql, u.params)
    const row = await db.get('SELECT * FROM houses WHERE id = ?', [req.params.id])
    res.json({ ok: true, data: rowToObj('houses', row) })
  } catch (e) { next(e) }
})

router.delete('/houses/:id', async (req, res, next) => {
  try {
    await db.run('DELETE FROM houses WHERE id = ?', [req.params.id])
    await db.run('DELETE FROM favorites WHERE house_id = ?', [req.params.id])
    res.json({ ok: true, data: { id: req.params.id } })
  } catch (e) { next(e) }
})

router.post('/houses/:id/view', async (req, res, next) => {
  try {
    await db.run('UPDATE houses SET views = views + 1 WHERE id = ?', [req.params.id])
    const row = await db.get('SELECT views FROM houses WHERE id = ?', [req.params.id])
    res.json({ ok: true, data: { views: Number(row?.views ?? 0) } })
  } catch (e) { next(e) }
})

/* ---------------- 收藏 ---------------- */
router.get('/favorites', async (req, res, next) => {
  try {
    const rows = await db.all('SELECT house_id FROM favorites WHERE user_id = ?', [currentUserId(req)])
    res.json({ ok: true, data: rows.map((r) => r.house_id || r.HOUSE_ID) })
  } catch (e) { next(e) }
})

router.put('/favorites/:houseId', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const exist = await db.get('SELECT 1 AS x FROM favorites WHERE user_id = ? AND house_id = ?', [uid, req.params.houseId])
    if (!exist) {
      await db.run('INSERT INTO favorites (user_id, house_id) VALUES (?, ?)', [uid, req.params.houseId])
    }
    res.json({ ok: true, data: { houseId: req.params.houseId, favorited: true } })
  } catch (e) { next(e) }
})

router.delete('/favorites/:houseId', async (req, res, next) => {
  try {
    await db.run('DELETE FROM favorites WHERE user_id = ? AND house_id = ?', [currentUserId(req), req.params.houseId])
    res.json({ ok: true, data: { houseId: req.params.houseId, favorited: false } })
  } catch (e) { next(e) }
})

router.delete('/favorites', async (req, res, next) => {
  try {
    await db.run('DELETE FROM favorites WHERE user_id = ?', [currentUserId(req)])
    res.json({ ok: true, data: [] })
  } catch (e) { next(e) }
})

/* ---------------- 房东看板统计 ---------------- */
router.get('/stats/dashboard', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const charId = await currentUserCharId(req)
    const mine = rowsToObjs('houses', await db.all('SELECT * FROM houses WHERE owner_id = ?', [charId]))
    const rented = mine.filter((h) => h.status === 'rented')
    const favRows = await db.all('SELECT house_id FROM favorites WHERE user_id = ?', [uid])
    const favSet = new Set(favRows.map((r) => r.house_id || r.HOUSE_ID))

    // 只统计当前用户名下房源产生的账单：归属判断下推到 SQL，避免全表拉取
    const billRows = rowsToObjs('bills', await db.all(
      'SELECT b.* FROM bills b JOIN houses h ON h.id = b.house_id WHERE h.owner_id = ?',
      [charId]
    ))
    const months = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      months.push({
        ym,
        label: d.getMonth() + 1 + '月',
        amount: billRows.filter((b) => String(b.due || '').startsWith(ym)).reduce((s, b) => s + Number(b.amount), 0)
      })
    }

    res.json({
      ok: true,
      data: {
        houses: mine.length,
        rented: rented.length,
        rate: mine.length ? Math.round((rented.length / mine.length) * 100) : 0,
        income: rented.reduce((s, h) => s + Number(h.price), 0),
        views: mine.reduce((s, h) => s + Number(h.views), 0),
        favorites: mine.filter((h) => favSet.has(h.id)).length,
        monthly: months,
        topHouses: [...mine].sort((a, b) => b.views - a.views).slice(0, 5).map((h) => ({ id: h.id, title: h.title, views: h.views, price: h.price, rating: h.rating }))
      }
    })
  } catch (e) { next(e) }
})

/* ---------------- 供其他路由复用 ---------------- */
export async function pushMessage(uid, type, title, body) {
  const urow = await db.get('SELECT char_id FROM users WHERE id = ?', [uid])
  const charId = urow?.char_id || urow?.CHAR_ID || 'gary'
  const row = {
    id: genId('M'),
    type,
    fromId: type === 'system' ? 'system' : charId,
    userId: uid,
    title,
    body,
    time: '刚刚',
    read: false,
    createdAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
  }
  const { sql, params } = buildInsert('messages', row)
  await db.run(sql, params)
  return row
}

export { TABLES }

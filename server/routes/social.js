/**
 * 消息 / 好友 / 评价 / 社区动态
 */
import { Router } from 'express'
import db from '../db/index.js'
import { buildInsert, buildUpdate, genId, isClientId, rowToObj, rowsToObjs, today } from '../lib/serialize.js'
import { currentUserId, currentUserCharId, pushMessage } from './catalog.js'

export const router = Router()

/* ---------------- 消息 ---------------- */
router.get('/messages', async (req, res, next) => {
  try {
    const { type } = req.query
    const where = ['user_id = ?']
    const params = [currentUserId(req)]
    if (type) { where.push('type = ?'); params.push(type) }
    const rows = await db.all(
      `SELECT * FROM messages WHERE ${where.join(' AND ')} ORDER BY created_at DESC, id DESC`,
      params
    )
    res.json({ ok: true, data: rowsToObjs('messages', rows) })
  } catch (e) { next(e) }
})

router.patch('/messages/:id/read', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const own = await db.get('SELECT id FROM messages WHERE id = ? AND user_id = ?', [req.params.id, uid])
    if (!own) return res.status(404).json({ ok: false, error: '消息不存在' })
    await db.run('UPDATE messages SET read_flag = 1 WHERE id = ? AND user_id = ?', [req.params.id, uid])
    res.json({ ok: true, data: { id: req.params.id, read: true } })
  } catch (e) { next(e) }
})

router.post('/messages/read-all', async (req, res, next) => {
  try {
    await db.run('UPDATE messages SET read_flag = 1 WHERE user_id = ?', [currentUserId(req)])
    res.json({ ok: true, data: { read: true } })
  } catch (e) { next(e) }
})

router.delete('/messages/:id', async (req, res, next) => {
  try {
    const r = await db.run('DELETE FROM messages WHERE id = ? AND user_id = ?', [req.params.id, currentUserId(req)])
    if (!r.changes) return res.status(404).json({ ok: false, error: '消息不存在' })
    res.json({ ok: true, data: { id: req.params.id } })
  } catch (e) { next(e) }
})

/* ---------------- 好友 / 邻居 ---------------- */
router.get('/friends', async (req, res, next) => {
  try {
    res.json({ ok: true, data: rowsToObjs('friends', await db.all('SELECT * FROM friends')) })
  } catch (e) { next(e) }
})

router.patch('/friends/:id', async (req, res, next) => {
  try {
    const relation = req.body?.relation
    if (!relation) return res.status(400).json({ ok: false, error: '缺少 relation' })
    const u = buildUpdate('friends', { relation }, 'id', req.params.id)
    if (u) await db.run(u.sql, u.params)
    const row = await db.get('SELECT * FROM friends WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ ok: false, error: '好友不存在' })
    res.json({ ok: true, data: rowToObj('friends', row) })
  } catch (e) { next(e) }
})

router.delete('/friends/:id', async (req, res, next) => {
  try {
    await db.run('DELETE FROM friends WHERE id = ?', [req.params.id])
    res.json({ ok: true, data: { id: req.params.id } })
  } catch (e) { next(e) }
})

/* ---------------- 评价 ---------------- */
router.get('/reviews', async (req, res, next) => {
  try {
    const { houseId } = req.query
    const rows = houseId
      ? await db.all('SELECT * FROM reviews WHERE house_id = ? ORDER BY review_date DESC', [houseId])
      : await db.all('SELECT * FROM reviews ORDER BY review_date DESC')
    res.json({ ok: true, data: rowsToObjs('reviews', rows) })
  } catch (e) { next(e) }
})

router.post('/reviews', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.houseId) return res.status(400).json({ ok: false, error: '缺少 houseId' })
    if (!b.content?.trim()) return res.status(400).json({ ok: false, error: '评价内容不能为空' })
    const rating = Math.min(5, Math.max(1, Number(b.rating) || 5))

    const review = {
      id: isClientId(b.id) ? b.id : genId('R'),
      houseId: b.houseId,
      authorId: await currentUserCharId(req),
      rating,
      content: b.content.trim(),
      tags: Array.isArray(b.tags) ? b.tags : [],
      date: today()
    }
    const { sql, params } = buildInsert('reviews', review)
    await db.run(sql, params)

    // 重新计算房源评分
    const agg = await db.get(
      'SELECT COUNT(*) AS n, AVG(rating) AS avg FROM reviews WHERE house_id = ?',
      [b.houseId]
    )
    const n = Number(agg?.n ?? 0)
    const avg = Number(agg?.avg ?? rating)
    await db.run('UPDATE houses SET review_count = ?, rating = ? WHERE id = ?', [
      n, Number(avg.toFixed(1)), b.houseId
    ])

    res.status(201).json({ ok: true, data: review })
  } catch (e) { next(e) }
})

/* ---------------- 社区动态 ---------------- */
router.get('/feeds', async (req, res, next) => {
  try {
    res.json({ ok: true, data: rowsToObjs('feeds', await db.all('SELECT * FROM feeds')) })
  } catch (e) { next(e) }
})

router.post('/feeds/:id/like', async (req, res, next) => {
  try {
    await db.run('UPDATE feeds SET likes = likes + 1 WHERE id = ?', [req.params.id])
    const row = await db.get('SELECT * FROM feeds WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ ok: false, error: '动态不存在' })
    res.json({ ok: true, data: rowToObj('feeds', row) })
  } catch (e) { next(e) }
})

export { pushMessage }

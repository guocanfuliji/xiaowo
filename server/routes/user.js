/**
 * 用户资料 / 装修状态 / 数据重置
 */
import { Router } from 'express'
import db from '../db/index.js'
import { buildUpdate, rowToObj } from '../lib/serialize.js'
import { currentUserId, stripUser } from './catalog.js'
import { seedIfEmpty, DEMO_DECOR } from '../db/init.js'
import { CHARS, AVATARS, DISTRICTS } from '../../src/data/seed.js'
import { redis } from '../lib/redis.js'
import { resetAuction } from '../db/auction.js'

export const router = Router()

router.get('/user', async (req, res, next) => {
  try {
    const row = await db.get('SELECT * FROM users WHERE id = ?', [currentUserId(req)])
    if (!row) return res.status(404).json({ ok: false, error: '用户不存在' })
    res.json({ ok: true, data: stripUser(rowToObj('users', row)) })
  } catch (e) { next(e) }
})

router.patch('/user', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const patch = {}
    for (const k of ['name', 'phone', 'email', 'charId', 'avatar', 'credit', 'member', 'verified']) {
      if (req.body[k] !== undefined) patch[k] = req.body[k]
    }
    if (patch.name !== undefined && !String(patch.name).trim()) {
      return res.status(400).json({ ok: false, error: '昵称不能为空' })
    }
    if (patch.name !== undefined) patch.name = String(patch.name).trim()
    // 头像只接受头像库里的 id；空字符串表示「回到角色默认图」
    if (patch.avatar !== undefined) {
      patch.avatar = String(patch.avatar || '').trim()
      if (patch.avatar && !AVATARS.some((a) => a.id === patch.avatar)) {
        return res.status(400).json({ ok: false, error: '头像不存在' })
      }
    }
    // 切换角色时同步角色名，避免出现「角色是蟹老板、昵称还是痞老板」的错位
    if (patch.charId !== undefined && patch.name === undefined) {
      const target = CHARS.find((c) => c.id === patch.charId)
      if (target?.name) patch.name = target.name
    }
    const u = buildUpdate('users', patch, 'id', uid)
    if (u) await db.run(u.sql, u.params)
    const row = await db.get('SELECT * FROM users WHERE id = ?', [uid])
    res.json({ ok: true, data: stripUser(rowToObj('users', row)) })
  } catch (e) { next(e) }
})

/* ---------------- 装修 ---------------- */
router.get('/decor', async (req, res, next) => {
  try {
    const row = await db.get('SELECT * FROM decor_state WHERE user_id = ?', [currentUserId(req)])
    res.json({ ok: true, data: row ? rowToObj('decor_state', row) : { theme: DEMO_DECOR.theme, placed: DEMO_DECOR.placed } })
  } catch (e) { next(e) }
})

router.put('/decor', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const theme = Number(req.body?.theme) || 0
    const placed = Array.isArray(req.body?.placed) ? req.body.placed : []
    const exist = await db.get('SELECT user_id FROM decor_state WHERE user_id = ?', [uid])
    if (exist) {
      await db.run('UPDATE decor_state SET theme = ?, placed = ? WHERE user_id = ?', [
        theme, JSON.stringify(placed), uid
      ])
    } else {
      await db.run('INSERT INTO decor_state (user_id, theme, placed) VALUES (?, ?, ?)', [
        uid, theme, JSON.stringify(placed)
      ])
    }
    const row = await db.get('SELECT * FROM decor_state WHERE user_id = ?', [uid])
    res.json({ ok: true, data: rowToObj('decor_state', row) })
  } catch (e) { next(e) }
})

/* ---------------- 重置（重新灌入种子数据） ---------------- */
router.post('/reset', async (req, res, next) => {
  try {
    const r = await seedIfEmpty(true)
    // 热榜里可能残留已删除的帖子 id，重置时一并清掉，下次访问自动重建
    await redis.hotClearAll(DISTRICTS.map((d) => d.id))
    // 拍卖也回到演示初始状态，否则反复出价后所有场次都会由同一个人领跑
    const auc = await resetAuction()
    await Promise.all(auc.ids.map((id) => redis.rankClear('auction:' + id)))
    res.json({ ok: true, data: r })
  } catch (e) { next(e) }
})

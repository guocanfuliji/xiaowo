/**
 * 邻里社区：按街区聚合的帖子 / 点赞 / 评论
 *
 * Redis 分工：
 * - 热榜 ZSET：排序在 Redis 完成，数据库只负责按 id 回表；
 * - 详情缓存：30s TTL，写操作后主动失效；
 * - 发帖/评论限流：固定窗口计数，Redis 不可用时自动放行（不阻断业务）。
 * 一致性策略：所有计数以数据库为准，Redis 中的分值是数据库计算结果的副本。
 */
import { Router } from 'express'
import db from '../db/index.js'
import { redis, getStatus } from '../lib/redis.js'
import { buildInsert, rowToObj, rowsToObjs, genId, isClientId } from '../lib/serialize.js'
import { currentUserId, currentUserCharId } from './catalog.js'
import { DISTRICTS } from '../../src/data/seed.js'

export const router = Router()

const DISTRICT_IDS = new Set(DISTRICTS.map((d) => d.id))
const hotScoreOf = (like, comment) => Number(like) * 3 + Number(comment) * 5
const nOf = (row) => Number(row?.n ?? row?.N ?? 0)
const clampInt = (v, min, max, dflt) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return dflt
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

/** 批量查「当前用户点过赞的帖子」，避免列表 N+1 */
async function likedIds(userId, ids) {
  if (!ids.length) return new Set()
  const ph = ids.map(() => '?').join(',')
  const rows = await db.all(
    `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${ph})`,
    [userId, ...ids]
  )
  return new Set(rows.map((r) => r.post_id || r.POST_ID))
}

/** 复算并回写帖子热度（likes*3 + comments*5），返回新分值 */
async function recalcHot(conn, postId) {
  const row = await conn.get('SELECT like_count, comment_count FROM community_posts WHERE id = ?', [postId])
  if (!row) return null
  const score = hotScoreOf(row.like_count, row.comment_count)
  await conn.run('UPDATE community_posts SET hot_score = ? WHERE id = ?', [score, postId])
  return score
}

/* ---------------- 帖子列表 ---------------- */
router.get('/community/posts', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const district = String(req.query.district || '')
    const sort = req.query.sort === 'hot' ? 'hot' : 'new'
    const page = clampInt(req.query.page, 1, 10000, 1)
    const pageSize = clampInt(req.query.pageSize, 1, 50, 10)
    const offset = (page - 1) * pageSize

    const where = ["status = 'normal'"]
    const params = []
    if (district) { where.push('district = ?'); params.push(district) }
    const whereSql = where.join(' AND ')

    const total = nOf(await db.get(`SELECT COUNT(*) AS n FROM community_posts WHERE ${whereSql}`, params))

    let rows = []
    let source = 'db'

    if (sort === 'hot') {
      const scope = district || 'all'
      const card = await redis.hotCard(scope)
      // 榜单为空或与库内数量对不上（Redis 重启 / 新写入）时，用数据库重建
      if (card !== null && card !== total) {
        const all = await db.all(
          `SELECT id, hot_score FROM community_posts WHERE ${whereSql}`, params
        )
        await redis.hotRebuild(scope, all.map((r) => ({ id: r.id, hotScore: r.hot_score })))
      }
      const ids = await redis.hotTop(scope, offset, pageSize)
      if (ids) {
        source = 'redis'
        if (ids.length) {
          const ph = ids.map(() => '?').join(',')
          const found = rowsToObjs('community_posts',
            await db.all(`SELECT * FROM community_posts WHERE id IN (${ph})`, ids))
          const map = new Map(found.map((p) => [p.id, p]))
          rows = ids.map((id) => map.get(id)).filter(Boolean)   // 保持 ZSET 的顺序
        }
      }
    }

    if (source === 'db') {
      // Redis 不可用或榜单为空时的兜底排序，与 ZSET 的排序口径保持一致
      const orderBy = sort === 'hot'
        ? 'hot_score DESC, created_at DESC, id DESC'
        : 'created_at DESC, hot_score DESC, id DESC'
      rows = rowsToObjs('community_posts', await db.all(
        `SELECT * FROM community_posts WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ${pageSize} OFFSET ${offset}`,
        params
      ))
    }

    const liked = await likedIds(uid, rows.map((p) => p.id))
    res.json({
      ok: true,
      data: {
        items: rows.map((p) => ({ ...p, liked: liked.has(p.id) })),
        total, page, pageSize, sort, district, source
      }
    })
  } catch (e) { next(e) }
})

/* ---------------- 帖子详情（带缓存） ---------------- */
router.get('/community/posts/:id', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const id = req.params.id
    const cacheKey = `post:${id}`

    let post = await redis.cacheGet(cacheKey)
    let cached = !!post
    if (!post) {
      post = rowToObj('community_posts', await db.get('SELECT * FROM community_posts WHERE id = ?', [id]))
      if (!post) return res.status(404).json({ ok: false, error: '帖子不存在或已删除' })
      await redis.cacheSet(cacheKey, post)
    }

    const liked = await likedIds(uid, [post.id])
    res.json({ ok: true, data: { ...post, liked: liked.has(post.id), cached } })
  } catch (e) { next(e) }
})

/* ---------------- 发帖 ---------------- */
router.post('/community/posts', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const charId = await currentUserCharId(req)
    const b = req.body || {}

    const district = String(b.district || '')
    const title = String(b.title || '').trim()
    const content = String(b.content || '').trim()
    if (!DISTRICT_IDS.has(district)) return res.status(400).json({ ok: false, error: '请选择有效的街区' })
    if (title.length < 4 || title.length > 60) return res.status(400).json({ ok: false, error: '标题需为 4~60 个字' })
    if (content.length < 1 || content.length > 2000) return res.status(400).json({ ok: false, error: '正文需为 1~2000 个字' })

    const rate = await redis.rateLimit(`post:${uid}`, 3, 60)
    if (rate && !rate.allowed) {
      return res.status(429).json({ ok: false, error: '发帖太快了，请稍后再试（每分钟最多 3 帖）' })
    }

    const post = {
      id: isClientId(b.id) ? b.id : genId('P'),
      district,
      authorId: charId,
      title,
      content,
      tags: Array.isArray(b.tags) ? b.tags.slice(0, 4) : [],
      likeCount: 0,
      commentCount: 0,
      hotScore: 0,
      status: 'normal',
      createdAt: new Date().toISOString().slice(0, 10)
    }
    const { sql, params } = buildInsert('community_posts', post)
    await db.run(sql, params)
    await redis.hotSet(district, post.id, 0)

    res.status(201).json({ ok: true, data: { ...post, liked: false } })
  } catch (e) { next(e) }
})

/* ---------------- 删帖（仅作者） ---------------- */
router.delete('/community/posts/:id', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const id = req.params.id
    const post = rowToObj('community_posts', await db.get('SELECT * FROM community_posts WHERE id = ?', [id]))
    if (!post) return res.status(404).json({ ok: false, error: '帖子不存在' })
    if (post.authorId !== charId) return res.status(403).json({ ok: false, error: '只能删除自己发布的帖子' })

    await db.tx(async (conn) => {
      await conn.run('DELETE FROM post_comments WHERE post_id = ?', [id])
      await conn.run('DELETE FROM post_likes WHERE post_id = ?', [id])
      await conn.run('DELETE FROM community_posts WHERE id = ?', [id])
    })
    await redis.hotRemove(post.district, id)
    await redis.cacheDel(`post:${id}`)

    res.json({ ok: true, data: { id } })
  } catch (e) { next(e) }
})

/* ---------------- 点赞 / 取消（事务 + 计数复算） ---------------- */
router.post('/community/posts/:id/like', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const id = req.params.id
    const post = rowToObj('community_posts', await db.get('SELECT * FROM community_posts WHERE id = ?', [id]))
    if (!post) return res.status(404).json({ ok: false, error: '帖子不存在' })

    const result = await db.tx(async (conn) => {
      const hit = await conn.get('SELECT post_id FROM post_likes WHERE post_id = ? AND user_id = ?', [id, uid])
      let liked
      if (hit) {
        await conn.run('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?', [id, uid])
        await conn.run('UPDATE community_posts SET like_count = like_count - 1 WHERE id = ? AND like_count > 0', [id])
        liked = false
      } else {
        await conn.run('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)', [
          id, uid, new Date().toISOString().slice(0, 10)
        ])
        await conn.run('UPDATE community_posts SET like_count = like_count + 1 WHERE id = ?', [id])
        liked = true
      }
      const score = await recalcHot(conn, id)
      const row = await conn.get('SELECT like_count, comment_count FROM community_posts WHERE id = ?', [id])
      return { liked, likeCount: Number(row.like_count), commentCount: Number(row.comment_count), hotScore: score }
    })

    await redis.hotSet(post.district, id, result.hotScore)
    await redis.cacheDel(`post:${id}`)
    res.json({ ok: true, data: { id, ...result } })
  } catch (e) { next(e) }
})

/* ---------------- 评论 ---------------- */
router.get('/community/posts/:id/comments', async (req, res, next) => {
  try {
    const rows = await db.all(
      'SELECT * FROM post_comments WHERE post_id = ? ORDER BY created_at ASC, id ASC',
      [req.params.id]
    )
    res.json({ ok: true, data: rowsToObjs('post_comments', rows) })
  } catch (e) { next(e) }
})

router.post('/community/posts/:id/comments', async (req, res, next) => {
  try {
    const uid = currentUserId(req)
    const charId = await currentUserCharId(req)
    const id = req.params.id
    const content = String(req.body?.content || '').trim()
    if (!content) return res.status(400).json({ ok: false, error: '评论内容不能为空' })
    if (content.length > 500) return res.status(400).json({ ok: false, error: '评论最多 500 个字' })

    const post = rowToObj('community_posts', await db.get('SELECT * FROM community_posts WHERE id = ?', [id]))
    if (!post) return res.status(404).json({ ok: false, error: '帖子不存在' })

    const rate = await redis.rateLimit(`comment:${uid}`, 10, 60)
    if (rate && !rate.allowed) {
      return res.status(429).json({ ok: false, error: '评论太频繁了，请稍后再试（每分钟最多 10 条）' })
    }

    const comment = {
      id: isClientId(req.body?.id) ? req.body.id : genId('PC'),
      postId: id,
      authorId: charId,
      content,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    }

    const score = await db.tx(async (conn) => {
      const { sql, params } = buildInsert('post_comments', comment)
      await conn.run(sql, params)
      await conn.run('UPDATE community_posts SET comment_count = comment_count + 1 WHERE id = ?', [id])
      return recalcHot(conn, id)
    })

    await redis.hotSet(post.district, id, score)
    await redis.cacheDel(`post:${id}`)
    res.status(201).json({ ok: true, data: comment })
  } catch (e) { next(e) }
})

router.delete('/community/comments/:id', async (req, res, next) => {
  try {
    const charId = await currentUserCharId(req)
    const id = req.params.id
    const row = await db.get('SELECT * FROM post_comments WHERE id = ?', [id])
    if (!row) return res.status(404).json({ ok: false, error: '评论不存在' })
    const comment = rowToObj('post_comments', row)
    if (comment.authorId !== charId) return res.status(403).json({ ok: false, error: '只能删除自己的评论' })

    const post = await db.get('SELECT district FROM community_posts WHERE id = ?', [comment.postId])
    const score = await db.tx(async (conn) => {
      await conn.run('DELETE FROM post_comments WHERE id = ?', [id])
      await conn.run('UPDATE community_posts SET comment_count = comment_count - 1 WHERE id = ? AND comment_count > 0', [comment.postId])
      return recalcHot(conn, comment.postId)
    })
    await redis.hotSet(post?.district, comment.postId, score)
    await redis.cacheDel(`post:${comment.postId}`)

    res.json({ ok: true, data: { id } })
  } catch (e) { next(e) }
})

/* ---------------- 街区概览（页签角标） ---------------- */
router.get('/community/overview', async (req, res, next) => {
  try {
    const rows = await db.all(
      "SELECT district, COUNT(*) AS n FROM community_posts WHERE status = 'normal' GROUP BY district"
    )
    const map = {}
    rows.forEach((r) => { map[r.district || r.DISTRICT] = nOf({ n: r.n ?? r.N }) })
    res.json({
      ok: true,
      data: {
        total: Object.values(map).reduce((s, n) => s + n, 0),
        districts: DISTRICTS.map((d) => ({ id: d.id, name: d.name, posts: map[d.id] || 0 })),
        redis: getStatus()
      }
    })
  } catch (e) { next(e) }
})

/**
 * 启动预热：把数据库里的热度分值灌进 Redis 榜单。
 * 好处是 Redis 重启 / Redis 里分值过期后，一开机就与数据库对齐，不依赖首次访问触发重建。
 */
export async function warmHotRank() {
  const rows = rowsToObjs('community_posts',
    await db.all("SELECT id, district, hot_score FROM community_posts WHERE status = 'normal'"))
  if (!rows.length) return 0

  const byDistrict = new Map()
  rows.forEach((r) => {
    if (!byDistrict.has(r.district)) byDistrict.set(r.district, [])
    byDistrict.get(r.district).push({ id: r.id, hotScore: r.hotScore })
  })

  for (const [district, list] of byDistrict) await redis.hotRebuild(district, list)
  await redis.hotRebuild('all', rows.map((r) => ({ id: r.id, hotScore: r.hotScore })))
  return rows.length
}

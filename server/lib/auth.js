/**
 * 账号与登录会话
 *
 * 设计取舍：
 * - 口令用 PBKDF2-SHA256（12 万次迭代）加盐哈希，不引入 bcrypt 之类需要编译的依赖；
 * - 会话是「有状态」的：token 随机生成，库里只存 sha256(token)，登出 = 删行，天然支持踢人；
 * - token 有效期内不续期（7 天），过期行在下次校验时顺手删掉，不需要定时任务。
 * 为什么不发 JWT：JWT 无法在服务端作废，退出登录只是前端自欺；本项目更看重「登出即失效」。
 */
import crypto from 'node:crypto'
import { promisify } from 'node:util'
import db from '../db/index.js'

const pbkdf2 = promisify(crypto.pbkdf2)
const ITERATIONS = 120000
const KEYLEN = 32
const DIGEST = 'sha256'
const SESSION_DAYS = 7

const nowStr = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

/** 存成 pbkdf2$<salt>$<hash>，长度 104，正好放进 VARCHAR(128) */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = (await pbkdf2(String(password), salt, ITERATIONS, KEYLEN, DIGEST)).toString('hex')
  return `pbkdf2$${salt}$${hash}`
}

export async function verifyPassword(password, stored) {
  if (!stored) return false
  const [algo, salt, hash] = String(stored).split('$')
  if (algo !== 'pbkdf2' || !salt || !hash) return false
  const calc = await pbkdf2(String(password), salt, ITERATIONS, KEYLEN, DIGEST)
  const want = Buffer.from(hash, 'hex')
  return calc.length === want.length && crypto.timingSafeEqual(calc, want)
}

export async function createSession(userId) {
  const token = crypto.randomBytes(24).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString().slice(0, 19).replace('T', ' ')
  await db.run(
    'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)',
    [sha256(token), userId, nowStr(), expiresAt]
  )
  return { token, expiresAt }
}

/** token → userId；不存在 / 过期都返回 null，过期的顺手清理 */
export async function resolveSession(token) {
  if (!token) return null
  const hash = sha256(token)
  const row = await db.get('SELECT user_id, expires_at FROM sessions WHERE token_hash = ?', [hash])
  if (!row) return null
  const userId = row.user_id ?? row.USER_ID
  const expiresAt = String(row.expires_at ?? row.EXPIRES_AT ?? '')
  if (expiresAt && expiresAt < nowStr()) {
    await db.run('DELETE FROM sessions WHERE token_hash = ?', [hash])
    return null
  }
  return userId || null
}

export async function destroySession(token) {
  if (!token) return 0
  const r = await db.run('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)])
  return r.changes
}

export const bearerOf = (req) => {
  const raw = req.get('authorization') || ''
  return raw.toLowerCase().startsWith('bearer ') ? raw.slice(7).trim() : ''
}

/**
 * 每个请求只做一次 token → userId 的解析，后续 handler 同步读 req.authUserId。
 * currentUserId() 是同步的，不能在这里改成 async，否则所有路由都要跟着改。
 */
export async function attachUser(req, res, next) {
  try {
    const token = bearerOf(req)
    req.authToken = token
    req.authUserId = token ? await resolveSession(token) : null
    next()
  } catch (e) { next(e) }
}

export function requireAuth(req, res, next) {
  if (!req.authUserId) return res.status(401).json({ ok: false, error: '请先登录后再操作' })
  next()
}

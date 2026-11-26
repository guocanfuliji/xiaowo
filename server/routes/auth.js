/**
 * 注册 / 登录 / 登出 / 当前账号 / 改密码
 *
 * 账号规则：手机号唯一、昵称唯一，登录支持「手机号」或「昵称」+ 密码。
 * 这套接口是唯一允许「未登录」调用的写接口，其余写操作统一由 index.js 的守卫拦成 401。
 */
import { Router } from 'express'
import db from '../db/index.js'
import { buildInsert, genId, rowToObj, today } from '../lib/serialize.js'
import { hashPassword, verifyPassword, createSession, destroySession } from '../lib/auth.js'
import { stripUser } from './catalog.js'
import { CHARS } from '../../src/data/seed.js'

export const router = Router()

const PHONE_RE = /^1[3-9]\d{9}$/
const CHAR_IDS = new Set(CHARS.map((c) => c.id))

const findById = (id) => db.get('SELECT * FROM users WHERE id = ?', [id])
const fail = (res, code, msg) => res.status(code).json({ ok: false, error: msg })

/* ---------------- 注册 ---------------- */
router.post('/auth/register', async (req, res, next) => {
  try {
    const b = req.body || {}
    const name = String(b.name || '').trim()
    const phone = String(b.phone || '').trim()
    const password = String(b.password || '')

    if (name.length < 2 || name.length > 12) return fail(res, 400, '昵称需为 2~12 个字')
    if (!PHONE_RE.test(phone)) return fail(res, 400, '请填写 11 位手机号')
    if (password.length < 6 || password.length > 32) return fail(res, 400, '密码需为 6~32 位')

    const dupPhone = await db.get('SELECT id FROM users WHERE phone = ?', [phone])
    if (dupPhone) return fail(res, 409, '该手机号已注册，可直接登录')
    const dupName = await db.get('SELECT id FROM users WHERE name = ?', [name])
    if (dupName) return fail(res, 409, '这个昵称已被占用，换一个吧')

    /*
     * 角色即身份：房源归属（owner_id）、租约（tenant_id/owner_id）、拍卖（seller_id）都用 char_id 记人。
     * 两个账号共用一个 char_id 会互相看到对方的房子和租约，所以一个角色只允许一个账号。
     */
    const usedRows = await db.all('SELECT char_id FROM users')
    const used = new Set(usedRows.map((r) => r.char_id ?? r.CHAR_ID))
    if (CHAR_IDS.has(b.charId) && used.has(b.charId)) {
      return fail(res, 409, '这个角色已经有账号了，换一个角色试试')
    }
    const charId = CHAR_IDS.has(b.charId)
      ? b.charId
      : CHARS.map((c) => c.id).find((id) => !used.has(id)) || ''
    if (!charId) return fail(res, 409, '演示环境里的角色都已被占用，请直接用已有账号登录')

    const user = {
      id: genId('U'),
      charId,
      avatar: '',
      name,
      phone,
      email: String(b.email || '').slice(0, 128),
      credit: 90,
      member: '贝壳会员',
      joinedAt: today(),
      verified: false,
      passwordHash: await hashPassword(password),
      createdAt: today()
    }
    const { sql, params } = buildInsert('users', user)
    await db.run(sql, params)

    const { token, expiresAt } = await createSession(user.id)
    res.status(201).json({ ok: true, data: { token, expiresAt, user: stripUser(user) } })
  } catch (e) { next(e) }
})

/* ---------------- 登录 ---------------- */
router.post('/auth/login', async (req, res, next) => {
  try {
    const b = req.body || {}
    const account = String(b.account || '').trim()
    const password = String(b.password || '')
    if (!account || !password) return fail(res, 400, '请填写账号与密码')

    const row = await db.get('SELECT * FROM users WHERE phone = ? OR name = ? LIMIT 1', [account, account])
    // 账号不存在与密码错误返回同一句，避免被拿来探测哪些账号存在
    if (!row) return fail(res, 401, '账号或密码不正确')
    const user = rowToObj('users', row)
    if (!(await verifyPassword(password, user.passwordHash))) {
      return fail(res, 401, '账号或密码不正确')
    }

    const { token, expiresAt } = await createSession(user.id)
    res.json({ ok: true, data: { token, expiresAt, user: stripUser(user) } })
  } catch (e) { next(e) }
})

/* ---------------- 登出 ---------------- */
router.post('/auth/logout', async (req, res, next) => {
  try {
    const removed = await destroySession(req.authToken)
    res.json({ ok: true, data: { removed } })
  } catch (e) { next(e) }
})

/* ---------------- 当前账号 ---------------- */
router.get('/auth/me', async (req, res, next) => {
  try {
    if (!req.authUserId) return fail(res, 401, '尚未登录')
    const row = await findById(req.authUserId)
    if (!row) return fail(res, 401, '登录状态已失效，请重新登录')
    res.json({ ok: true, data: stripUser(rowToObj('users', row)) })
  } catch (e) { next(e) }
})

/* ---------------- 改密码（顺手让其它设备下线） ---------------- */
router.post('/auth/password', async (req, res, next) => {
  try {
    if (!req.authUserId) return fail(res, 401, '请先登录')
    const { oldPassword, newPassword } = req.body || {}
    if (String(newPassword || '').length < 6 || String(newPassword || '').length > 32) {
      return fail(res, 400, '新密码需为 6~32 位')
    }
    const row = await findById(req.authUserId)
    if (!row) return fail(res, 401, '登录状态已失效，请重新登录')
    const user = rowToObj('users', row)
    if (!(await verifyPassword(String(oldPassword || ''), user.passwordHash))) {
      return fail(res, 400, '原密码不正确')
    }

    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(newPassword), user.id])
    // 所有旧会话作废，再发一个新 token 给当前设备
    await db.run('DELETE FROM sessions WHERE user_id = ?', [user.id])
    const { token, expiresAt } = await createSession(user.id)
    res.json({ ok: true, data: { token, expiresAt } })
  } catch (e) { next(e) }
})

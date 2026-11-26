/**
 * 租约 / 账单 / 预约看房
 */
import { Router } from 'express'
import db from '../db/index.js'
import { buildInsert, buildUpdate, genId, isClientId, rowToObj, rowsToObjs, today } from '../lib/serialize.js'
import { currentUserId, currentUserCharId, pushMessage } from './catalog.js'

export const router = Router()

/* ---------------- 租约 ---------------- */
router.get('/leases', async (req, res, next) => {
  try {
    const { status, houseId } = req.query
    // 租约表用角色 id 记归属（种子与房源保持一致），当前账号既是租客也可能是房东，两边都要看得到
    const charId = await currentUserCharId(req)
    const where = ['(tenant_id = ? OR owner_id = ?)']
    const params = [charId, charId]
    if (status) { where.push('status = ?'); params.push(status) }
    if (houseId) { where.push('house_id = ?'); params.push(houseId) }
    const sql = `SELECT * FROM leases WHERE ${where.join(' AND ')} ORDER BY start_date DESC`
    res.json({ ok: true, data: rowsToObjs('leases', await db.all(sql, params)) })
  } catch (e) { next(e) }
})

/** 租约归属校验：只有租客本人或房东能操作，避免拿到 id 就能替别人解约 */
async function leaseOf(req, { tenantOnly = false } = {}) {
  const row = await db.get('SELECT * FROM leases WHERE id = ?', [req.params.id])
  if (!row) return { code: 404, msg: '租约不存在' }
  const charId = await currentUserCharId(req)
  const tenant = row.tenant_id ?? row.TENANT_ID
  const owner = row.owner_id ?? row.OWNER_ID
  if (tenantOnly) {
    return charId === tenant ? { row } : { code: 403, msg: '只有租客本人可以签约' }
  }
  if (charId !== tenant && charId !== owner) return { code: 403, msg: '这不是你的租约' }
  return { row }
}

router.post('/leases/:id/sign', async (req, res, next) => {
  try {
    const { code, msg } = await leaseOf(req, { tenantOnly: true })
    if (code) return res.status(code).json({ ok: false, error: msg })
    const u = buildUpdate('leases', { status: 'active', signedAt: today() }, 'id', req.params.id)
    await db.run(u.sql, u.params)
    const row = await db.get('SELECT * FROM leases WHERE id = ?', [req.params.id])
    await pushMessage(currentUserId(req), 'system', '租约已生效', '电子签约完成，合同已存入云端。')
    res.json({ ok: true, data: rowToObj('leases', row) })
  } catch (e) { next(e) }
})

router.post('/leases/:id/terminate', async (req, res, next) => {
  try {
    const { code, msg, row: lease } = await leaseOf(req)
    if (code) return res.status(code).json({ ok: false, error: msg })
    const u = buildUpdate('leases', { status: 'ended' }, 'id', req.params.id)
    await db.run(u.sql, u.params)
    await db.run("UPDATE houses SET status = 'available' WHERE id = ?", [lease.house_id || lease.houseId])
    const row = await db.get('SELECT * FROM leases WHERE id = ?', [req.params.id])
    res.json({ ok: true, data: rowToObj('leases', row) })
  } catch (e) { next(e) }
})

/* ---------------- 账单 ---------------- */
router.get('/bills', async (req, res, next) => {
  try {
    const { status } = req.query
    const where = ['user_id = ?']
    const params = [currentUserId(req)]
    if (status) { where.push('status = ?'); params.push(status) }
    const rows = await db.all(
      `SELECT * FROM bills WHERE ${where.join(' AND ')} ORDER BY due_date DESC`,
      params
    )
    res.json({ ok: true, data: rowsToObjs('bills', rows) })
  } catch (e) { next(e) }
})

router.post('/bills/:id/pay', async (req, res, next) => {
  try {
    const bill = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    if (!bill) return res.status(404).json({ ok: false, error: '账单不存在' })
    if ((bill.user_id ?? bill.USER_ID ?? '') !== currentUserId(req)) {
      return res.status(403).json({ ok: false, error: '这不是你的账单' })
    }
    if ((bill.status || '') === 'paid') return res.json({ ok: true, data: rowToObj('bills', bill) })
    const method = req.body?.method || '贝壳支付'
    const u = buildUpdate('bills', { status: 'paid', paidAt: today(), method }, 'id', req.params.id)
    await db.run(u.sql, u.params)
    const row = await db.get('SELECT * FROM bills WHERE id = ?', [req.params.id])
    await pushMessage(currentUserId(req), 'pay', '支付成功', `${row.type}（${row.period}）¥${Number(row.amount).toFixed(2)} 已通过${method}支付。`)
    res.json({ ok: true, data: rowToObj('bills', row) })
  } catch (e) { next(e) }
})

router.post('/bills', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!(Number(b.amount) > 0)) return res.status(400).json({ ok: false, error: '金额需大于 0' })
    const bill = {
      id: isClientId(b.id) ? b.id : genId('B'),
      leaseId: b.leaseId || '',
      houseId: b.houseId || '',
      userId: currentUserId(req),
      type: b.type || '其他',
      amount: Number(b.amount),
      due: b.due || today(),
      status: 'unpaid',
      period: b.period || '手动记账',
      paidAt: '',
      method: ''
    }
    const { sql, params } = buildInsert('bills', bill)
    await db.run(sql, params)
    res.status(201).json({ ok: true, data: bill })
  } catch (e) { next(e) }
})

/* ---------------- 预约看房 ---------------- */
router.get('/bookings', async (req, res, next) => {
  try {
    const rows = await db.all(
      'SELECT * FROM bookings WHERE user_id = ? ORDER BY visit_date DESC, visit_time DESC',
      [currentUserId(req)]
    )
    res.json({ ok: true, data: rowsToObjs('bookings', rows) })
  } catch (e) { next(e) }
})

router.post('/bookings', async (req, res, next) => {
  try {
    const b = req.body || {}
    if (!b.houseId) return res.status(400).json({ ok: false, error: '请选择房源' })
    if (!b.date) return res.status(400).json({ ok: false, error: '请选择看房日期' })

    const dup = await db.get(
      "SELECT id FROM bookings WHERE house_id = ? AND visit_date = ? AND status = 'pending' AND user_id = ?",
      [b.houseId, b.date, currentUserId(req)]
    )
    if (dup) return res.status(409).json({ ok: false, error: '该房源该时段已预约过了' })

    const house = await db.get('SELECT owner_id, title FROM houses WHERE id = ?', [b.houseId])
    const booking = {
      id: isClientId(b.id) ? b.id : genId('K'),
      houseId: b.houseId,
      userId: currentUserId(req),
      date: b.date,
      time: b.time || '10:00',
      agentId: house?.owner_id || 'U1001',
      status: 'pending',
      note: b.note || '',
      createdAt: today()
    }
    const { sql, params } = buildInsert('bookings', booking)
    await db.run(sql, params)
    await pushMessage(currentUserId(req), 'house', '预约提交成功', `已提交 ${booking.date} ${booking.time} 的看房预约，等待房东确认。`)
    res.status(201).json({ ok: true, data: booking })
  } catch (e) { next(e) }
})

router.patch('/bookings/:id', async (req, res, next) => {
  try {
    const status = req.body?.status
    if (!['pending', 'done', 'canceled'].includes(status)) {
      return res.status(400).json({ ok: false, error: 'status 只能是 pending/done/canceled' })
    }
    const row = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id])
    if (!row) return res.status(404).json({ ok: false, error: '预约不存在' })
    // 预约本人可以取消，房东可以确认/完成；其余人拿到 id 也不能改
    const isMine = (row.user_id ?? row.USER_ID ?? '') === currentUserId(req)
    if (!isMine) {
      const house = await db.get('SELECT owner_id FROM houses WHERE id = ?', [row.house_id ?? row.HOUSE_ID])
      if (!house || (house.owner_id ?? house.OWNER_ID) !== (await currentUserCharId(req))) {
        return res.status(403).json({ ok: false, error: '这不是你的预约' })
      }
    }
    const u = buildUpdate('bookings', { status }, 'id', req.params.id)
    if (u) await db.run(u.sql, u.params)
    res.json({ ok: true, data: rowToObj('bookings', await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id])) })
  } catch (e) { next(e) }
})

/**
 * 数据库适配层：同一套 SQL，支持 MySQL(8+) 与 SQLite(内置 node:sqlite)
 * 统一接口：all / get / run / exec / tx / close
 */
import fs from 'node:fs'
import path from 'node:path'
import { config } from '../config.js'

let impl = null
export let dialect = config.db.client

/* ---------------- MySQL ---------------- */
async function initMysql() {
  const mysql = await import('mysql2/promise')
  const c = config.db.mysql
  // 先不指定 database 连接一次，确保库存在
  const admin = await mysql.createConnection({
    host: c.host, port: c.port, user: c.user, password: c.password, multipleStatements: false
  })
  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${c.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  )
  await admin.end()

  const pool = await mysql.createPool({
    host: c.host,
    port: c.port,
    user: c.user,
    password: c.password,
    database: c.database,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,
    multipleStatements: false,
    charset: 'utf8mb4_unicode_ci'
  })

  const wrap = (conn) => ({
    all: async (sql, params = []) => { const [rows] = await conn.execute(sql, params); return rows },
    get: async (sql, params = []) => { const [rows] = await conn.execute(sql, params); return rows[0] || null },
    run: async (sql, params = []) => {
      const [r] = await conn.execute(sql, params)
      return { changes: r.affectedRows ?? 0, lastId: r.insertId ?? null }
    }
  })

  dialect = 'mysql'
  return {
    dialect,
    ...wrap(pool),
    async exec(sqlText) {
      for (const stmt of splitSql(sqlText)) await pool.query(stmt)
    },
    async tx(fn) {
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()
        const r = await fn(wrap(conn))
        await conn.commit()
        return r
      } catch (e) {
        await conn.rollback()
        throw e
      } finally {
        conn.release()
      }
    },
    async close() { await pool.end() }
  }
}

/* ---------------- SQLite ---------------- */
async function initSqlite() {
  const { DatabaseSync } = await import('node:sqlite')
  const file = config.db.sqlite.file
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const db = new DatabaseSync(file)
  db.exec('PRAGMA journal_mode = WAL')

  const norm = (params = []) => params.map((p) => (p === undefined ? null : typeof p === 'boolean' ? (p ? 1 : 0) : p))

  const run = (sql, params = []) => {
    const r = db.prepare(sql).run(...norm(params))
    return { changes: Number(r.changes || 0), lastId: r.lastInsertRowid != null ? Number(r.lastInsertRowid) : null }
  }
  const all = (sql, params = []) => db.prepare(sql).all(...norm(params))
  const get = (sql, params = []) => db.prepare(sql).get(...norm(params)) || null

  dialect = 'sqlite'
  return {
    dialect,
    all,
    get,
    run,
    async exec(sqlText) { db.exec(sqlText) },
    async tx(fn) {
      db.exec('BEGIN')
      try {
        const r = await fn({ all, get, run })
        db.exec('COMMIT')
        return r
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    },
    async close() { db.close() }
  }
}

function splitSql(text) {
  return text
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function initDb() {
  if (impl) return impl
  try {
    impl = config.db.client === 'sqlite' ? await initSqlite() : await initMysql()
  } catch (e) {
    if (config.db.client !== 'sqlite') {
      console.warn(`[db] ${config.db.client} 连接失败，自动回落到 SQLite：${e.code || e.message}`)
      impl = await initSqlite()
    } else {
      throw e
    }
  }
  return impl
}

const proxy = {
  all: (...a) => {
    if (!impl) throw new Error('数据库尚未初始化，请先 await initDb()')
    return impl.all(...a)
  },
  get: (...a) => {
    if (!impl) throw new Error('数据库尚未初始化，请先 await initDb()')
    return impl.get(...a)
  },
  run: (...a) => {
    if (!impl) throw new Error('数据库尚未初始化，请先 await initDb()')
    return impl.run(...a)
  },
  exec: (...a) => {
    if (!impl) throw new Error('数据库尚未初始化，请先 await initDb()')
    return impl.exec(...a)
  },
  tx: (fn) => {
    if (!impl) throw new Error('数据库尚未初始化，请先 await initDb()')
    return impl.tx(fn)
  },
  close: () => (impl ? impl.close() : Promise.resolve()),
  get dialect() { return impl ? impl.dialect : config.db.client }
}

export default proxy

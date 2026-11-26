/**
 * 打印数据库表结构与行数
 * 用法：node scripts/db-stats.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const env = {}
const f = path.join(ROOT, '.env')
if (fs.existsSync(f)) {
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l) => {
    const s = l.trim()
    if (!s || s.startsWith('#')) return
    const i = s.indexOf('=')
    if (i > 0) env[s.slice(0, i).trim()] = s.slice(i + 1).trim()
  })
}

const client = (env.DB_CLIENT || 'mysql').toLowerCase()
const rows = []

if (client === 'sqlite') {
  const { DatabaseSync } = await import('node:sqlite')
  const file = path.resolve(ROOT, env.DB_FILE || 'server/data/xiaowo.db')
  const db = new DatabaseSync(file)
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all()
  for (const t of tables) {
    const n = db.prepare(`SELECT COUNT(*) AS n FROM "${t.name}"`).get()
    rows.push([t.name, n.n])
  }
  db.close()
  console.log(`SQLite：${file}`)
} else {
  const mysql = await import('mysql2/promise')
  const conn = await mysql.createConnection({
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'xiaowo'
  })
  const [version] = await conn.query('SELECT VERSION() AS v, DATABASE() AS db')
  const [tables] = await conn.query('SHOW TABLES')
  for (const t of tables) {
    const name = Object.values(t)[0]
    const [c] = await conn.query('SELECT COUNT(*) AS n FROM `' + name + '`')
    rows.push([name, c[0].n])
  }
  console.log(`MySQL ${version[0].v}  ·  数据库 ${version[0].db}`)
  await conn.end()
}

console.log('─'.repeat(34))
for (const [name, n] of rows) console.log(`  ${name.padEnd(16)} ${String(n).padStart(6)} 行`)
console.log('─'.repeat(34))
console.log(`  共 ${rows.length} 张表，合计 ${rows.reduce((s, r) => s + Number(r[1]), 0)} 行`)

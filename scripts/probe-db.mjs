/**
 * 数据库连通性探测：读取 .env，尝试连接并打印结果
 * 用法：node scripts/probe-db.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** 读 .env */
const env = {}
const file = path.join(ROOT, '.env')
if (fs.existsSync(file)) {
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
    const s = line.trim()
    if (!s || s.startsWith('#')) return
    const i = s.indexOf('=')
    if (i > 0) env[s.slice(0, i).trim()] = s.slice(i + 1).trim()
  })
}

const client = (env.DB_CLIENT || 'mysql').toLowerCase()
const host = env.DB_HOST || '127.0.0.1'
const port = Number(env.DB_PORT || 3306)
const user = env.DB_USER || 'root'
const name = env.DB_NAME || 'xiaowo'

console.log(`配置：${client.toUpperCase()}  ${user}@${host}:${port}/${name}`)

if (client === 'sqlite') {
  const { DatabaseSync } = await import('node:sqlite')
  const dbFile = path.resolve(ROOT, env.DB_FILE || 'server/data/xiaowo.db')
  const db = new DatabaseSync(dbFile)
  const row = db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table'").get()
  console.log(`✓ SQLite 可用：${dbFile}（${row.n} 张表）`)
  db.close()
  process.exit(0)
}

let mysql
try {
  mysql = await import('mysql2/promise')
} catch (e) {
  console.error('✗ 未安装 mysql2，请先 npm install')
  process.exit(1)
}

const passwords = [env.DB_PASSWORD ?? '']
// .env 没填密码时，顺带试两个本地开发最常见的默认值
if (!process.env.DB_PASSWORD && !env.DB_PASSWORD) passwords.push('root', '123456')

let ok = false
for (const pwd of passwords) {
  try {
    const conn = await mysql.createConnection({ host, port, user, password: pwd, connectTimeout: 4000 })
    const [rows] = await conn.query('SELECT VERSION() AS v')
    console.log(`✓ MySQL 连接成功：${user}@${host}:${port}  版本 ${rows[0].v}  密码 ${pwd ? '已填写' : '（空）'}`)
    await conn.end()
    ok = true
    break
  } catch (e) {
    console.log(`✗ 尝试密码 ${pwd ? '******' : '（空）'} 失败：${e.code || e.message}`)
  }
}

if (!ok) {
  console.error('\n未能连接 MySQL。请在 .env 中填写正确的 DB_USER / DB_PASSWORD，或把 DB_CLIENT 改为 sqlite 使用文件数据库。')
  process.exit(1)
}

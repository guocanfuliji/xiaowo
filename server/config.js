import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')

/* ---------- 极简 .env 解析（不依赖 dotenv 的启动顺序） ---------- */
function loadEnv() {
  const file = path.join(ROOT, '.env')
  if (!fs.existsSync(file)) return
  const text = fs.readFileSync(file, 'utf8')
  text.split(/\r?\n/).forEach((line) => {
    const s = line.trim()
    if (!s || s.startsWith('#')) return
    const i = s.indexOf('=')
    if (i < 0) return
    const k = s.slice(0, i).trim()
    let v = s.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    if (process.env[k] === undefined) process.env[k] = v
  })
}
loadEnv()

const env = (k, d = '') => (process.env[k] ?? d)

export const config = {
  port: Number(env('PORT', 3001)),
  /**
   * 监听地址：本地默认只听回环（安全），容器/线上用 HOST=0.0.0.0，
   * 否则宿主机或反代连不进来 —— 这是 Docker 部署最容易踩的一个坑。
   */
  host: env('HOST', '127.0.0.1'),
  /**
   * 允许跨域的来源，逗号分隔；留空 = 不限制（仅适合本地开发）。
   * 线上务必填自己的域名，否则任何网站都能拿你的接口刷数据。
   */
  corsOrigin: env('CORS_ORIGIN', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** 部署在 Nginx / Caddy 后面时开这个，否则限流拿到的 IP 全是反代的 */
  trustProxy: env('TRUST_PROXY', ''),
  db: {
    client: env('DB_CLIENT', 'mysql').toLowerCase(),
    mysql: {
      host: env('DB_HOST', '127.0.0.1'),
      port: Number(env('DB_PORT', 3306)),
      user: env('DB_USER', 'root'),
      password: env('DB_PASSWORD', ''),
      database: env('DB_NAME', 'xiaowo')
    },
    sqlite: {
      file: path.resolve(ROOT, env('DB_FILE', 'server/data/xiaowo.db'))
    }
  },
  /** Redis 为可选增强：未配置或连不上时业务自动降级到数据库 */
  redis: {
    url: env('REDIS_URL', ''),
    keyPrefix: env('REDIS_PREFIX', 'xw:'),
    cacheTtl: Number(env('REDIS_CACHE_TTL', 30))
  },
  seedOnInit: env('SEED_ON_INIT', 'true') !== 'false'
}

/** 打印给开发者看的连接串（不含密码） */
export function describeDb() {
  if (config.db.client === 'sqlite') return `SQLite → ${config.db.sqlite.file}`
  const m = config.db.mysql
  return `MySQL → ${m.user}@${m.host}:${m.port}/${m.database}`
}

/**
 * 小蜗后端入口：Express + REST API + 静态托管 dist
 */
import express from 'express'
import cors from 'cors'
import fs from 'node:fs'
import path from 'node:path'
import { config, ROOT, describeDb } from './config.js'
import { initDb } from './db/index.js'
import { initSchema, seedIfEmpty, seedCommunityIfEmpty, seedSaleIfEmpty } from './db/init.js'
import { router as catalog } from './routes/catalog.js'
import { router as rental } from './routes/rental.js'
import { router as social } from './routes/social.js'
import { router as userRouter } from './routes/user.js'
import { router as community, warmHotRank } from './routes/community.js'
import { router as sale } from './routes/sale.js'
import { router as auth } from './routes/auth.js'
import { router as auction } from './routes/auction.js'
import { initAuction } from './db/auction.js'
import { attachUser } from './lib/auth.js'
import { initRedis, waitForRedis, onRedisReady, getStatus as redisStatus, redis } from './lib/redis.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', config.trustProxy === 'true' ? 1 : (Number(config.trustProxy) || false))
// 本地开发默认全放开；线上配 CORS_ORIGIN 就只认这些来源
app.use(cors(config.corsOrigin.length ? { origin: config.corsOrigin } : undefined))
app.use(express.json({ limit: '2mb' }))

/* ---------- 登录态：每个请求解析一次 token，handle 里同步读 req.authUserId ---------- */
app.use('/api', attachUser)

/* ---------- 健康检查（也用于告诉前端当前连的是哪个库） ---------- */
app.get('/api/health', async (req, res, next) => {
  try {
    const row = await (await import('./db/index.js')).default.get('SELECT COUNT(*) AS n FROM houses')
    res.json({
      ok: true,
      data: {
        service: 'xiaowo-api',
        dialect: (await import('./db/index.js')).dialect,
        connection: describeDb(),
        houses: Number(row?.n ?? row?.N ?? 0),
        redis: redisStatus(),
        uptime: Math.round(process.uptime()),
        time: new Date().toISOString()
      }
    })
  } catch (e) { next(e) }
})

/* ---------- 业务路由 ---------- */
app.use('/api', auth)

/**
 * 游客只读：未登录只能 GET，写操作一律 401。
 * 例外只有两个 —— /auth/*（自己上面已挂载）与浏览量自增（看房不该强制登录）。
 */
const GUEST_WRITE_OK = [/^\/houses\/[^/]+\/view$/]
app.use('/api', (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next()
  if (GUEST_WRITE_OK.some((re) => re.test(req.path))) return next()
  if (!req.authUserId) return res.status(401).json({ ok: false, error: '请先登录后再操作' })
  next()
})

app.use('/api', catalog)
app.use('/api', rental)
app.use('/api', social)
app.use('/api', userRouter)
app.use('/api', community)
app.use('/api', sale)
app.use('/api', auction)

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: '接口不存在：' + req.originalUrl }))

/* ---------- 生产模式：托管构建产物 ---------- */
const dist = path.join(ROOT, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

/* ---------- 统一错误处理 ---------- */
app.use((err, req, res, next) => {
  console.error('[api error]', req.method, req.originalUrl, '-', err.message)
  res.status(500).json({ ok: false, error: err.message })
})

/* ---------- 启动 ---------- */
const conn = await initDb()
const schema = await initSchema()
const seed = await seedIfEmpty()
const communitySeed = await seedCommunityIfEmpty()
const saleSeed = await seedSaleIfEmpty()
const auctionSeed = await initAuction()
onRedisReady(() => warmHotRank())
const rds = initRedis()

app.listen(config.port, config.host, async () => {
  const live = await waitForRedis()
  const warmed = live.connected ? await warmHotRank() : 0
  const line = '─'.repeat(46)
  console.log(`\n${line}`)
  console.log('  🐌 小蜗 · 比奇堡租房 API')
  console.log(line)
  console.log(`  地址     http://${config.host === '0.0.0.0' ? '127.0.0.1' : config.host}:${config.port}${config.host === '0.0.0.0' ? '（监听 0.0.0.0，容器/反代可访问）' : ''}`)
  console.log(`  健康检查 http://127.0.0.1:${config.port}/api/health`)
  console.log(`  跨域     ${config.corsOrigin.length ? config.corsOrigin.join(' , ') : '未限制（开发模式，线上请配 CORS_ORIGIN）'}`)
  console.log(`  数据库   ${describeDb()}`)
  console.log(`  驱动     ${conn.dialect} · 建表 ${schema.file}`)
  console.log(`  数据     ${seed.seeded ? '首次导入种子数据' : '已有数据，跳过导入'} · 房源 ${seed.houses} 条`)
  console.log(`  社区     ${communitySeed.seeded ? '已导入示例帖' : '沿用已有帖子'} · 帖子 ${communitySeed.posts} 条${warmed ? ' · 热榜已预热 ' + warmed + ' 条' : ''}`)
  console.log(`  售房     ${saleSeed.seeded ? '已补充二手房源' : '沿用已有在售房源'} · 在售 ${saleSeed.sale} 套${schema.migrated?.length ? ' · 结构升级 ' + schema.migrated.join(', ') : ''}`)
  console.log(`  拍卖     ${auctionSeed.seeded ? '已导入演示拍卖' : '沿用已有拍卖'} · 场次 ${auctionSeed.count} 场`)
  console.log(`  缓存     ${live.connected ? 'Redis 已连接（热榜 / 详情缓存 / 限流）' : (live.enabled ? 'Redis 连接失败，已降级为数据库模式' : '未配置 REDIS_URL，已降级为数据库模式')}${live.error ? ' · ' + live.error : ''}`)
  console.log(`${line}\n`)
  // 线上最常见的两个疏忽：跨域没收紧、反代后没开 trust proxy（限流会把所有人当成同一个 IP）
  if (process.env.NODE_ENV === 'production') {
    if (!config.corsOrigin.length) console.warn('  ⚠️  CORS_ORIGIN 未配置，任何网站都能调用本接口，线上请填自己的域名\n')
    if (!config.trustProxy) console.warn('  ⚠️  TRUST_PROXY 未开启，若前面有 Nginx/Caddy，限流会按反代 IP 计算\n')
  }
})

process.on('SIGINT', async () => {
  await redis.close()
  await conn.close()
  process.exit(0)
})

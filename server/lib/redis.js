/**
 * Redis 客户端（可选增强层）
 *
 * 职责边界（重要）：
 * - 数据库是唯一真相源：帖子的点赞数、评论数、点赞关系全部落库；
 * - Redis 只做三件「数据库做起来贵」的事：
 *     1) 热度榜      ZSET，避免每次列表都 ORDER BY 全表排序
 *     2) 详情缓存    30s TTL，挡住热点帖的重复查询
 *     3) 发帖限流    固定窗口计数，防止刷屏
 * - 未配置 REDIS_URL 或连接失败时，所有方法返回 null，调用方回落 SQL，业务不中断。
 */
import Redis from 'ioredis'
import { config } from '../config.js'

let client = null
let enabled = false
let connected = false
let lastError = ''
let loggedError = false
let readyHandler = null

/** 注册「连接就绪」回调：首次连上与断线重连都会触发，用于把数据库里的最新分值回灌榜单 */
export function onRedisReady(fn) {
  readyHandler = fn
}

const key = (k) => config.redis.keyPrefix + k

function markDown(err) {
  connected = false
  lastError = err?.message || String(err)
  if (!loggedError) {
    console.warn(`[redis] 连接异常，已降级为数据库模式：${lastError}`)
    loggedError = true
  }
}

export function initRedis() {
  if (!config.redis.url) {
    enabled = false
    return getStatus()
  }
  if (client) return getStatus()

  enabled = true
  client = new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: (times) => Math.min(times * 300, 3000)
  })

  client.on('ready', () => {
    connected = true
    lastError = ''
    loggedError = false
    if (readyHandler) {
      // 重连后 Redis 里的榜单可能是断线期间的旧值，这里重建一次
      Promise.resolve()
        .then(() => readyHandler())
        .catch(() => { /* 启动早期数据库可能还没就绪，忽略即可 */ })
    }
  })
  client.on('end', () => { connected = false })
  client.on('error', markDown)

  return getStatus()
}

/**
 * 启动时等待连接就绪（最多 timeoutMs）。
 * 不能用「立刻 ping」来判断：ioredis 建连是异步的，且 enableOfflineQueue=false 时
 * 未连接状态下发出的命令会直接抛 Stream isn't writeable，导致把正常启动误判成失败。
 */
export async function waitForRedis(timeoutMs = 2000) {
  if (!enabled || !client || connected) return getStatus()
  await new Promise((resolve) => {
    let done = false
    let timer = null
    const finish = () => {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      client?.off('ready', finish)
      client?.off('error', finish)
      resolve()
    }
    timer = setTimeout(finish, timeoutMs)
    client.once('ready', finish)
    client.once('error', finish)
  })
  return getStatus()
}

export function getStatus() {
  return { enabled, connected, mode: connected ? 'redis' : 'db', error: lastError }
}

/** 仅在连接可用时执行，异常吞掉返回 null（调用方走数据库分支） */
async function safe(fn) {
  if (!enabled || !client || !connected) return null
  try {
    return await fn(client)
  } catch (e) {
    markDown(e)
    return null
  }
}

const hotKey = (district) => key(`community:hot:${district || 'all'}`)

export const redis = {
  /* ---- 热度榜：score = like_count*3 + comment_count*5 ---- */
  async hotSet(district, postId, score) {
    return safe(async (c) => {
      const p = c.pipeline()
      p.zadd(hotKey(district), score, postId)
      if (district) p.zadd(hotKey('all'), score, postId)   // 全站榜
      await p.exec()
      return true
    })
  },
  async hotRemove(district, postId) {
    return safe(async (c) => {
      const p = c.pipeline()
      p.zrem(hotKey(district), postId)
      if (district) p.zrem(hotKey('all'), postId)
      await p.exec()
      return true
    })
  },
  /** 返回按热度降序的 id 数组；Redis 不可用返回 null 以触发 SQL 排序 */
  async hotTop(district, offset, count) {
    return safe((c) => c.zrevrange(hotKey(district), offset, offset + count - 1))
  },
  /** 榜单内元素个数，用于判断是否需要重建（与数据库 total 对账） */
  async hotCard(district) {
    return safe((c) => c.zcard(hotKey(district)))
  },
  /** 用数据库结果重建某个街区的热榜（Redis 重启后自愈） */
  async hotRebuild(district, rows) {
    return safe(async (c) => {
      const k = hotKey(district)
      await c.del(k)
      if (!rows.length) return 0
      const args = []
      rows.forEach((r) => args.push(r.hotScore ?? r.hot_score ?? 0, r.id))
      await c.zadd(k, ...args)
      return rows.length
    })
  },

  /** 清空所有街区热榜（恢复初始数据时调用，避免残留已删除的帖子 id） */
  async hotClearAll(districts) {
    return safe(async (c) => {
      const keys = ['all', ...districts].map((d) => hotKey(d))
      return c.del(...keys)
    })
  },

  /* ---- 通用缓存 ---- */
  cacheGet: (k) => safe(async (c) => {
    const raw = await c.get(key(`cache:${k}`))
    if (!raw) return null
    try { return JSON.parse(raw) } catch (e) { return null }
  }),
  cacheSet: (k, val, ttl = config.redis.cacheTtl) =>
    safe((c) => c.set(key(`cache:${k}`), JSON.stringify(val), 'EX', ttl)),
  cacheDel: (...keys) => safe((c) => (keys.length ? c.del(...keys.map((k) => key(`cache:${k}`))) : 0)),

  /* ---- 固定窗口限流：返回剩余可发次数；Redis 不可用返回 null（不拦截） ---- */
  async rateLimit(bucket, limit, windowSec) {
    return safe(async (c) => {
      const k = key(`rate:${bucket}`)
      const n = await c.incr(k)
      if (n === 1) await c.expire(k, windowSec)
      return { allowed: n <= limit, used: n, limit }
    })
  },

  /** 清掉某个限流桶（压测脚本 / 本地调试用，线上下不发这个口子） */
  async rateClear(bucket) {
    return safe((c) => c.del(key(`rate:${bucket}`)))
  },

  /* ---- 分布式锁：SET NX PX，释放时用 Lua 校验 token，避免误删别人的锁 ----
   * 只用于「削峰」：价格正确性由数据库的条件 UPDATE 保证，锁拿不到就直接告诉用户手慢了。
   * 返回值三态：对象 = 拿到锁；false = 别人正持有；undefined = Redis 不可用（调用方应放行）。 */
  async lock(name, ttlMs = 3000) {
    if (!enabled || !client || !connected) return undefined
    const r = await safe(async (c) => {
      const k = key(`lock:${name}`)
      const token = Math.random().toString(36).slice(2) + Date.now()
      const ok = await c.set(k, token, 'PX', ttlMs, 'NX')
      if (ok !== 'OK') return false
      return {
        key: k,
        token,
        release: async () => {
          try {
            await c.eval(
              'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
              1, k, token
            )
          } catch (e) { /* 锁过期就自然失效，忽略 */ }
        }
      }
    })
    return r === null ? undefined : r   // safe() 在命令异常时返回 null，等同降级放行
  },

  /* ---- 出价排行：ZSET(score=价格, member=出价 id)，只需 top N 时不用扫全表 ---- */
  async rankAdd(bucket, member, score, ttlSec = 86400) {
    return safe(async (c) => {
      const k = key(`rank:${bucket}`)
      const p = c.pipeline()
      p.zadd(k, score, member)
      p.expire(k, ttlSec)
      await p.exec()
      return true
    })
  },
  rankTop: (bucket, count = 10) =>
    safe((c) => c.zrevrange(key(`rank:${bucket}`), 0, count - 1)),
  rankClear: (bucket) => safe((c) => c.del(key(`rank:${bucket}`))),

  raw: () => client,
  close: async () => {
    if (client) {
      try { await client.quit() } catch (e) { /* ignore */ }
      client = null
      connected = false
    }
  }
}

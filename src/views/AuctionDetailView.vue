<script setup>
/** 拍卖详情：倒计时 + 出价面板 + 出价记录（Redis ZSET 排行，缺失时回源数据库） */
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Api } from '@/api/index.js'
import { state, money, toast, submitBid } from '@/stores/app.js'
import { loggedIn } from '@/stores/auth.js'
import { typeImg, DISTRICTS } from '@/data/seed.js'

const route = useRoute()
const router = useRouter()

const a = ref(null)
const bids = ref([])
const rankSource = ref('')
const loading = ref(true)
const err = ref('')
const amount = ref(0)
const submitting = ref(false)
const now = ref(Date.now())
const skew = ref(0)        // 服务器时间 - 本机时间
const syncedAt = ref(0)    // 上次校准时刻（本机毫秒）
const syncing = ref(false)
let ticker = null
let syncer = null
let seq = 0                // 请求序号：只认最新一次的返回
let settling = false
let settleTry = 0          // 到点结算的重试节流，避免接口异常时每秒打一次

const id = computed(() => String(route.params.id || ''))
const districtName = computed(() => (DISTRICTS.find((d) => d.id === a.value?.house?.district) || {}).name || '')
const endMs = computed(() => {
  const s = String(a.value?.endAt || '')
  return new Date(s.includes('T') ? s : s.replace(' ', 'T')).getTime()
})
const leftMs = computed(() => Math.max(0, endMs.value - now.value))
const isLive = computed(() => a.value?.status === 'live' && leftMs.value > 0)
const urgent = computed(() => isLive.value && leftMs.value <= 5 * 60 * 1000)
const floor = computed(() => Number(a.value?.floorPrice || 0))
const step = computed(() => Number(a.value?.step || 0))
const leading = computed(() => !!a.value && a.value.currentBidder === state.user.charId)
const isSeller = computed(() => !!a.value && a.value.sellerId === state.user.charId)
/** 本机时间偏差超过 2 秒才提示，否则只是网络抖动的正常误差 */
const skewed = computed(() => Math.abs(skew.value) > 2000)
const skewSec = computed(() => Math.round(Math.abs(skew.value) / 1000))
const syncText = computed(() => {
  if (!syncedAt.value) return ''
  const d = new Date(syncedAt.value)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
})

const clock = computed(() => {
  const s = Math.floor(leftMs.value / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const p = (n) => String(n).padStart(2, '0')
  return { d, text: d > 0 ? `${d} 天 ${p(h)}:${p(m)}:${p(sec)}` : `${p(h)}:${p(m)}:${p(sec)}` }
})

const fmtTime = (v) => {
  if (!v) return ''
  const str = String(v)
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return str
  const p = (n) => String(n).padStart(2, '0')
  return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

const quick = computed(() => {
  const f = floor.value
  return [
    { label: '最低出价', v: f },
    { label: '+' + money(step.value), v: f + step.value },
    { label: '+' + money(step.value * 2), v: f + step.value * 2 },
    { label: '+' + money(step.value * 5), v: f + step.value * 5 }
  ]
})

/** 用服务器时间校正本机时钟，倒计时一律按服务器走，用户改本地时间也不影响 */
function applyServerTime(serverNow) {
  const n = Number(serverNow)
  if (!n) return
  skew.value = n - Date.now()
  syncedAt.value = Date.now()
  now.value = Date.now() + skew.value
}

/**
 * @param {{silent?: boolean}} opts silent=true 时静默同步：不碰输入框、不覆盖错误、不显示加载态
 */
async function load(opts = {}) {
  const silent = !!opts.silent
  const touchAmount = !silent
  const my = ++seq
  syncing.value = true
  try {
    if (!silent) err.value = ''
    const target = id.value
    const d = await Api.auctions.one(target)
    if (my !== seq) return                 // 已有更新的请求在飞，丢弃这次旧结果
    a.value = d
    applyServerTime(d.serverNow)
    if (touchAmount) {
      if (!amount.value || amount.value < d.floorPrice) amount.value = d.floorPrice
      if (d.myBid && d.myBid.price >= d.floorPrice) amount.value = d.myBid.price
    }
    const b = await Api.auctions.bids(target, { limit: 20 })
    if (my !== seq) return
    bids.value = b.items
    rankSource.value = b.source
  } catch (e) {
    // 静默同步失败不打断画面，继续用上一份数据倒计时
    if (my === seq && !silent) err.value = e.message
  } finally {
    if (my === seq) {
      loading.value = false
      syncing.value = false
    }
  }
}

async function bid() {
  if (submitting.value) return
  const v = Number(amount.value)
  if (!(v >= floor.value)) {
    toast(`不能低于 ${money(floor.value)}`, 'warn')
    return
  }
  submitting.value = true
  try {
    const out = await submitBid(id.value, v)
    toast(out.extended ? '出价成功，已触发延时 5 分钟' : '出价成功，你暂时领先', 'ok')
    amount.value = out.auction.floorPrice
    await load()
  } catch (e) {
    toast(e.message, 'warn')
    await load()
  } finally {
    submitting.value = false
  }
}

async function cancelAuction() {
  try {
    await Api.auctions.cancel(id.value)
    toast('已撤回这场拍卖', 'ok')
    await load()
  } catch (e) {
    toast(e.message, 'warn')
  }
}

const SYNC_MS = 30 * 1000

function startSync() {
  stopSync()
  syncer = setInterval(() => {
    // 已结束的场次不再拉，省一次请求
    if (a.value?.status === 'live') load({ silent: true })
  }, SYNC_MS)
}
function stopSync() {
  if (syncer) clearInterval(syncer)
  syncer = null
}

/** 切回前台立刻校准：后台标签页的定时器会被浏览器降频，回来时倒计时可能已经偏了 */
function onVisible() {
  if (document.hidden) return
  now.value = Date.now() + skew.value
  if (a.value?.status === 'live') load({ silent: true })
}

onMounted(async () => {
  await load()
  startSync()
  document.addEventListener('visibilitychange', onVisible)
  ticker = setInterval(() => {
    now.value = Date.now() + skew.value
    // 到点后自动拉一次，让状态从「竞拍中」翻成「已结束」；失败最多 10 秒重试一次
    const dueNow = a.value?.status === 'live' && endMs.value && now.value > endMs.value
    if (!settling && dueNow && Date.now() - settleTry > 10000) {
      settleTry = Date.now()
      settling = true
      load({ silent: true }).finally(() => { settling = false })
    }
  }, 1000)
})
onBeforeUnmount(() => {
  clearInterval(ticker)
  stopSync()
  document.removeEventListener('visibilitychange', onVisible)
})
watch(id, () => load())
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>拍卖详情</h1>
        <p>公开加价 · 出价即时生效，价高者得</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/auction')">全部拍卖</button>
      </div>
    </div>

    <div v-if="loading" class="card">加载中…</div>
    <div v-else-if="err" class="card" style="color:var(--red)">{{ err }}</div>

    <div v-else-if="a" class="auc-layout">
      <!-- 左：房源与出价记录 -->
      <div>
        <div class="auc-hero">
          <img v-if="typeImg(a.house?.type)" :src="typeImg(a.house?.type)" alt="" />
          <svg v-else viewBox="0 0 120 150"><use :href="'#' + (a.house?.svg || 'h-pineapple')" /></svg>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title" style="display:flex;align-items:center;gap:10px">
            {{ a.title }}
            <span class="badge" :class="isLive ? 'badge--mint' : ''">{{ isLive ? '竞拍中' : '已结束' }}</span>
          </div>
          <div class="card__desc">{{ a.house?.address }} · {{ districtName }}</div>

          <div class="auc-strip" style="margin-top:12px;background:#f7fdfd;box-shadow:none">
            <div><b>{{ a.house?.rooms }}室{{ a.house?.halls }}厅</b><span>户型</span></div>
            <div><b>{{ a.house?.area }} m²</b><span>面积</span></div>
            <div><b>{{ money(a.house?.price) }}</b><span>挂牌价</span></div>
            <div><b>{{ a.sellerName }}</b><span>房东</span></div>
            <div><b>{{ a.bidCount }}</b><span>出价次数</span></div>
          </div>

          <div style="display:flex;gap:10px;margin-top:14px">
            <button class="btn btn--ghost" style="height:36px" @click="router.push('/house/' + a.houseId)">看房源详情</button>
            <button class="btn btn--ghost" style="height:36px" @click="router.push('/map')">在地图上找</button>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">
            出价记录
            <span class="badge" style="margin-left:8px">{{ bids.length }} 条</span>
            <span v-if="rankSource" class="badge badge--mint" style="margin-left:6px">
              {{ rankSource === 'redis' ? 'Redis 排行' : '数据库回源' }}
            </span>
          </div>
          <div class="card__desc">按价格从高到低，最多显示 20 条</div>
          <div style="margin-top:10px">
            <div v-for="b in bids" :key="b.id" class="auc-row">
              <span :class="{ me: b.bidderId === state.user.charId }">{{ b.bidderName }}</span>
              <b>{{ money(b.price) }}</b>
              <span style="color:var(--ink3)">{{ fmtTime(b.createdAt) }}</span>
              <span v-if="b.extendFlag" class="badge" style="font-size:10px">触发延时</span>
              <span v-if="b.leading" class="lead">当前领先</span>
            </div>
            <div v-if="!bids.length" class="auc-rule" style="padding:10px 0">还没有人出价，你可以成为第一个。</div>
          </div>
        </div>
      </div>

      <!-- 右：出价面板 -->
      <div>
        <div class="card" :style="urgent ? 'border:2px solid rgba(226,59,71,.45)' : ''">
          <div class="card__title" style="justify-content:space-between">
            <span>{{ isLive ? '距离结束' : '本场结果' }}</span>
            <span v-if="a.extendCount" class="badge" style="font-size:10px">已延时 {{ a.extendCount }}/3 次</span>
          </div>
          <div v-if="isLive" class="auc-clock" :class="{ 'is-urgent': urgent }" style="margin-top:6px">
            <b>{{ clock.text }}</b>
            <span class="auc-rule" v-if="urgent">最后 5 分钟，出价会顺延</span>
          </div>
          <div v-else class="auc-clock" style="margin-top:6px">
            <b style="color:var(--ink2)">已结束</b>
            <span class="auc-rule">{{ a.currentBidder ? '成交价 ' + money(a.resultPrice || a.currentPrice) : '流拍，无人出价' }}</span>
          </div>

          <div v-if="isLive" class="auc-sync">
            <i class="auc-dot" :class="{ 'is-busy': syncing }"></i>
            <span v-if="syncing && !syncedAt">正在与服务器对时…</span>
            <span v-else-if="skewed">本机时间偏差 {{ skewSec }} 秒，已按服务器时间显示</span>
            <span v-else>每 30 秒对时 · 上次 {{ syncText }}</span>
          </div>

          <div style="margin-top:16px">
            <span class="auc-rule">{{ a.currentPrice > 0 ? '当前最高价' : '起拍价' }}</span>
            <span class="auc-bigprice">
              {{ money(a.currentPrice > 0 ? a.currentPrice : a.startPrice) }}
              <small v-if="a.currentBidder">领先：{{ a.leaderName }}</small>
            </span>
          </div>

          <div class="auc-strip" style="box-shadow:none;background:#f7fdfd;padding:10px 12px;margin-top:10px">
            <div><b>{{ money(a.startPrice) }}</b><span>起拍价</span></div>
            <div><b>{{ money(a.step) }}</b><span>最小加价</span></div>
            <div><b>{{ money(a.deposit) }}</b><span>保证金（不冻结）</span></div>
          </div>

          <template v-if="isLive">
            <div v-if="isSeller" class="auc-rule" style="margin-top:14px">
              这是你挂拍的房子。有人出价后不能撤回，到点自动成交。
              <button v-if="!a.bidCount" class="btn btn--ghost" style="height:32px;margin-top:8px;width:100%" @click="cancelAuction">
                撤回拍卖
              </button>
            </div>

            <template v-else>
              <div style="margin-top:16px">
                <span class="auc-rule">你的出价（最低 {{ money(floor) }}）</span>
                <div class="auc-input">
                  <input v-model.number="amount" type="number" :min="floor" :step="a.step" style="flex:1" />
                  <button class="btn btn--primary" style="height:40px;padding:0 18px" :disabled="submitting" @click="loggedIn ? bid() : router.push('/login')">
                    {{ submitting ? '出价中…' : loggedIn ? '确认出价' : '登录后出价' }}
                  </button>
                </div>
                <div v-if="!loggedIn" class="auc-rule" style="margin-top:6px">
                  未登录只能围观，<a href="#/login" style="color:var(--sea);font-weight:800">点这里登录</a>后即可出价。
                </div>
                <div class="auc-quick">
                  <button v-for="q in quick" :key="q.label" class="chip" @click="amount = q.v">{{ q.label }}</button>
                </div>
                <div v-if="leading" class="auc-rule" style="margin-top:8px;color:#0f6e56;font-weight:800">
                  你目前最高价领先，被超越会收到消息提醒。
                </div>
              </div>
            </template>
          </template>

          <div class="auc-rule" style="margin-top:16px;border-top:1px dashed var(--line);padding-top:12px">
            <b>规则</b><br />
            · 起拍价 {{ money(a.startPrice) }}，每次至少加价 {{ money(a.step) }}；<br />
            · 结束前 5 分钟内有人出价，结束时间顺延 5 分钟，最多顺延 3 次；<br />
            · 房东不能给自己的房子出价，也不能在有人出价后撤回；<br />
            · 到点后价高者得，平台只记录结果，不代收资金。
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/** 法拍房：公开加价，最后 5 分钟出价触发延时（最多 3 次） */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import { state, money, loadAuctions } from '@/stores/app.js'
import { typeImg, DISTRICTS } from '@/data/seed.js'

const router = useRouter()
const scope = ref('all') // all | mine | leading | ended
const district = ref('')
const now = ref(Date.now())
let ticker = null
let poller = null

const endMs = (a) => {
  const s = String(a.endAt || '')
  return new Date(s.includes('T') ? s : s.replace(' ', 'T')).getTime()
}
const leftOf = (a) => endMs(a) - now.value

/** 剩余时间：超过一天只显示到分钟，避免卡片上跳秒太吵 */
function fmtLeft(ms) {
  if (ms <= 0) return '已结束'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const p = (n) => String(n).padStart(2, '0')
  return d > 0 ? `${d} 天 ${p(h)}:${p(m)}` : `${p(h)}:${p(m)}:${p(sec)}`
}

const all = computed(() => state.auctions || [])

const list = computed(() => {
  let arr = all.value
  if (scope.value === 'ended') arr = arr.filter((a) => a.status !== 'live')
  else if (scope.value === 'mine') arr = arr.filter((a) => a.sellerId === state.user.charId)
  else if (scope.value === 'leading') arr = arr.filter((a) => a.currentBidder === state.user.charId && a.status === 'live')
  else arr = arr.filter((a) => a.status === 'live')
  if (district.value) arr = arr.filter((a) => a.house?.district === district.value)

  return [...arr].sort((a, b) => {
    const live = (x) => (x.status === 'live' ? 0 : 1)
    if (live(a) !== live(b)) return live(a) - live(b)
    // 进行中：快到点的排前面；已结束：刚结束的排前面
    return live(a) === 0 ? endMs(a) - endMs(b) : endMs(b) - endMs(a)
  })
})

const liveCount = computed(() => all.value.filter((a) => a.status === 'live').length)
const totalBids = computed(() => all.value.reduce((s, a) => s + Number(a.bidCount || 0), 0))
const mineCount = computed(() => all.value.filter((a) => a.sellerId === state.user.charId && a.status === 'live').length)
const leadingCount = computed(() => all.value.filter((a) => a.currentBidder === state.user.charId && a.status === 'live').length)

const SCOPES = [
  { v: 'all', t: '进行中' },
  { v: 'mine', t: '我挂拍的' },
  { v: 'leading', t: '我领先的' },
  { v: 'ended', t: '已结束' }
]

onMounted(async () => {
  await loadAuctions()
  ticker = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  // 每 30 秒和服务端对一次，既刷新别人出的价，也校正本地时钟漂移
  poller = setInterval(() => {
    if (document.hidden) return          // 后台标签页不拉，省请求
    loadAuctions()
  }, 30000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  clearInterval(ticker)
  clearInterval(poller)
  document.removeEventListener('visibilitychange', onVisible)
})

/** 切回前台立刻对齐时间并拉一次，倒计时才不会停在离开时的那一刻 */
function onVisible() {
  if (document.hidden) return
  now.value = Date.now()
  loadAuctions()
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>比奇堡法拍房</h1>
        <p>公开加价 · 结束前 5 分钟有人出价就顺延 5 分钟 · 最多顺延 3 次</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/mine')">我的房源</button>
        <button class="btn btn--primary" @click="router.push('/publish?trade=sale')">挂牌卖房</button>
      </div>
    </div>

    <div class="auc-strip">
      <div><b>{{ liveCount }}</b><span>正在拍卖</span></div>
      <div><b>{{ totalBids }}</b><span>累计出价</span></div>
      <div><b>{{ mineCount }}</b><span>我挂拍的</span></div>
      <div><b>{{ leadingCount }}</b><span>我暂时领先</span></div>
      <div style="margin-left:auto;max-width:420px;display:grid;place-items:center">
        <p class="auc-rule">
          拍卖成交后平台只记录结果，不代收资金；保证金金额仅作展示，不冻结。
        </p>
      </div>
    </div>

    <div class="filters" style="margin-top:14px">
      <div class="filters__group">
        <span class="filters__label">街区</span>
        <select v-model="district">
          <option value="">全部</option>
          <option v-for="d in DISTRICTS" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>
      <div class="sortbar" style="margin-left:auto">
        <button
          v-for="s in SCOPES"
          :key="s.v"
          class="chip"
          :class="{ 'is-on': scope === s.v }"
          @click="scope = s.v"
        >{{ s.t }}</button>
      </div>
    </div>

    <div v-if="list.length" class="auc-grid">
      <article v-for="a in list" :key="a.id" class="auc-card" @click="router.push('/auction/' + a.id)">
        <div class="auc-card__art">
          <img v-if="typeImg(a.house?.type)" :src="typeImg(a.house?.type)" alt="" loading="lazy" />
          <svg v-else viewBox="0 0 120 150"><use :href="'#' + (a.house?.svg || 'h-pineapple')" /></svg>
          <span class="auc-card__tag" :class="{ 'auc-card__tag--ended': a.status !== 'live' }">
            <em v-if="a.status === 'live'"></em>{{ a.status === 'live' ? '竞拍中' : a.status === 'ended' ? '已结束' : '已撤回' }}
          </span>
          <span class="auc-card__clock" :class="{ 'is-urgent': a.status === 'live' && leftOf(a) < 3600e3 }">
            {{ a.status === 'live' ? fmtLeft(leftOf(a)) : fmtLeft(0) }}
          </span>
        </div>
        <div class="auc-card__body">
          <b>{{ a.title }}</b>
          <span>{{ a.house?.address }}</span>
          <span>{{ a.house?.rooms }}室{{ a.house?.halls }}厅 · {{ a.house?.area }}m² · 房东 {{ a.sellerName }}</span>
          <div class="auc-card__price">
            <em>{{ money(a.status === 'ended' && a.resultPrice ? a.resultPrice : a.price) }}</em>
            <i>{{ a.status === 'ended' ? '成交价' : a.currentPrice > 0 ? '当前最高价' : '起拍价' }}</i>
          </div>
          <div class="auc-card__bar">
            <span>{{ a.bidCount }} 次出价</span>
            <span>{{ a.currentBidder ? '领先：' + a.leaderName : '还没人出价' }}</span>
          </div>
        </div>
      </article>
    </div>
    <EmptyState v-else title="这里还没有拍卖" desc="换个筛选条件，或者去「我的房源」把一套房挂上拍" />
  </div>
</template>

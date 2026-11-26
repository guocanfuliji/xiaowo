<script setup>
/** 我的房源（房东视角）：状态管理 + 待办 + 收益概览 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import { Api } from '@/api/index.js'
import {
  state, myHouses, houseById, charOf, money,
  updateHouseStatus, removeHouse, setBookingStatus, toast, loadAuctions
} from '@/stores/app.js'
import { DISTRICTS } from '@/data/seed.js'

const router = useRouter()
const tab = ref('all')

/* ---------------- 挂拍（把房源挂上拍卖） ---------------- */
const auctionForm = ref(null)
const creating = ref(false)

/** 同一套房同时只允许一场进行中的拍卖，按钮也要据此隐藏 */
const liveAuctionOf = (houseId) => state.auctions.find((a) => a.houseId === houseId && a.status === 'live')

function openAuction(h) {
  const sale = h.trade === 'sale'
  // 卖房按总价的 85% 起拍；租房按月租的 90% 起拍（竞租），步长和保证金按量级给默认值
  const start = sale ? Math.round(h.price * 0.85) : Math.round(h.price * 0.9)
  auctionForm.value = {
    houseId: h.id,
    title: h.title,
    sale,
    startPrice: start,
    step: sale ? Math.max(1000, Math.round(start * 0.02)) : Math.max(50, Math.round(start * 0.05)),
    deposit: sale ? Math.max(10000, Math.round(start * 0.05)) : start,
    hours: 72
  }
}

async function submitAuction() {
  const f = auctionForm.value
  if (!f || creating.value) return
  if (!(Number(f.startPrice) > 0)) return toast('起拍价要大于 0', 'warn')
  if (!(Number(f.step) > 0)) return toast('最小加价要大于 0', 'warn')
  creating.value = true
  try {
    const created = await Api.auctions.create(f.houseId, {
      startPrice: Number(f.startPrice),
      step: Number(f.step),
      deposit: Number(f.deposit),
      hours: Number(f.hours)
    })
    await loadAuctions()
    auctionForm.value = null
    toast('已挂拍，倒计时开始', 'ok')
    router.push('/auction/' + created.id)
  } catch (e) {
    toast(e.message, 'warn')
  } finally {
    creating.value = false
  }
}

const list = computed(() => {
  if (tab.value === 'all') return myHouses.value
  return myHouses.value.filter((h) => h.status === tab.value)
})

const stat = computed(() => ({
  total: myHouses.value.length,
  available: myHouses.value.filter((h) => h.status === 'available').length,
  rented: myHouses.value.filter((h) => h.status === 'rented').length,
  pending: myHouses.value.filter((h) => h.status === 'pending').length,
  views: myHouses.value.reduce((s, h) => s + h.views, 0),
  income: myHouses.value.filter((h) => h.status === 'rented').reduce((s, h) => s + h.price, 0)
}))

/** 我作为房东收到的待确认预约 */
const myBookings = computed(() =>
  state.bookings.filter((b) => myHouses.value.some((h) => h.id === b.houseId))
)
const pending = computed(() => myBookings.value.filter((b) => b.status === 'pending'))

/** 出租 / 出售共用一套列表，状态文案按交易类型分流 */
const statusPill = (h) => (h.trade === 'sale'
  ? (h.status === 'sold' ? { t: '已售', c: 'wait' } : { t: '在售', c: 'ok' })
  : (h.status === 'available' ? { t: '在租', c: 'ok' } : h.status === 'rented' ? { t: '已租出', c: 'wait' } : { t: '待上架', c: 'due' }))

function confirm(id) { setBookingStatus(id, 'done'); toast('已确认看房') }function cancel(id) { setBookingStatus(id, 'canceled') }

function del(id) {
  const h = houseById(id)
  if (window.confirm(`确定删除房源「${h.title}」吗？此操作不可撤销。`)) removeHouse(id)
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>我的房源</h1>
        <p>共 {{ stat.total }} 套 · 在租 {{ stat.available }} 套 · 累计浏览 {{ stat.views }} 次</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--yellow" @click="router.push('/decorate')">装修房屋</button>
        <button class="btn btn--primary" @click="router.push('/publish')">+ 发布房源</button>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><i>在租房源</i><b>{{ stat.available }}</b><em>上架中</em></div>
      <div class="kpi"><i>已租出</i><b>{{ stat.rented }}</b><em>履约中</em></div>
      <div class="kpi"><i>月租金收入</i><b>{{ money(stat.income) }}</b><em>预估</em></div>
      <div class="kpi"><i>待处理预约</i><b>{{ pending.length }}</b><em>需确认</em></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div class="card__title">房源列表</div>
          <div class="tabs">
            <button :class="{ 'is-on': tab === 'all' }" @click="tab = 'all'">全部</button>
            <button :class="{ 'is-on': tab === 'available' }" @click="tab = 'available'">在租</button>
            <button :class="{ 'is-on': tab === 'rented' }" @click="tab = 'rented'">已租出</button>
            <button :class="{ 'is-on': tab === 'pending' }" @click="tab = 'pending'">待上架</button>
          </div>
        </div>

        <div v-if="list.length" style="margin-top:12px">
          <div v-for="h in list" :key="h.id" class="hrow">
            <div class="hrow__art" @click="router.push('/house/' + h.id)" style="cursor:pointer">
              <svg viewBox="0 0 120 150"><use :href="'#' + h.svg" /></svg>
            </div>
            <div class="hrow__main">
              <b>{{ h.title }}</b>
              <span>{{ h.address }}</span>
              <div class="hrow__meta">
                <i><SvgIcon name="ic-area" cls="ic" />{{ h.area }}m²</i>
                <i><SvgIcon name="ic-bed" cls="ic" />{{ h.rooms }}室{{ h.halls }}厅</i>
                <i>浏览 {{ h.views }}</i>
                <i>★ {{ h.rating }}</i>
              </div>
            </div>
            <div class="hrow__end">
              <div class="hrow__price">{{ money(h.price) }}<i>{{ h.trade === 'sale' ? '总价' : '/月' }}</i></div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
                <span class="tag-pill" :class="statusPill(h).c">{{ statusPill(h).t }}</span>
              </div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
                <button
                  v-if="h.status === 'available' && !liveAuctionOf(h.id)"
                  class="btn btn--yellow"
                  style="height:30px;padding:0 12px;font-size:11.5px"
                  @click="openAuction(h)"
                >
                  挂拍
                </button>
                <router-link
                  v-else-if="liveAuctionOf(h.id)"
                  class="btn btn--ghost"
                  style="height:30px;padding:0 12px;font-size:11.5px"
                  :to="'/auction/' + liveAuctionOf(h.id).id"
                >
                  拍卖中
                </router-link>
                <button
                  v-if="!(h.trade === 'sale' && h.status === 'sold')"
                  class="btn btn--ghost"
                  style="height:30px;padding:0 12px;font-size:11.5px"
                  @click="updateHouseStatus(h.id, h.status === 'available' ? 'pending' : 'available')"
                >
                  {{ h.status === 'available' ? '下架' : '上架' }}
                </button>
                <button class="btn btn--ghost" style="height:30px;padding:0 12px;font-size:11.5px" @click="router.push('/house/' + h.id)">详情</button>
                <button class="btn btn--ghost" style="height:30px;padding:0 12px;font-size:11.5px;color:#bb2b36" @click="del(h.id)">删除</button>
              </div>
            </div>
          </div>
        </div>

        <EmptyState
          v-else
          icon="h-moai"
          :title="tab === 'all' ? '你还没有发布房源' : '该状态下暂无房源'"
          desc="发布第一套房源，让比奇堡的小伙伴找到你。"
        >
          <button class="btn btn--primary" @click="router.push('/publish')">立即发布</button>
        </EmptyState>
      </div>

      <div>
        <div class="card">
          <div class="card__title">待办事项</div>
          <div class="card__desc">及时处理租客请求，可以提升出租效率哦</div>
          <div style="margin-top:12px">
            <div v-for="b in pending" :key="b.id" class="todo">
              <span class="todo__ic"><SvgIcon name="ic-calendar" cls="ic" /></span>
              <div class="todo__txt">
                <b>{{ houseById(b.houseId)?.title }} · {{ b.date }} {{ b.time }}</b>
                <span>租客备注：{{ b.note || '无' }}</span>
                <div style="display:flex;gap:6px;margin-top:8px">
                  <button class="btn btn--primary" style="height:28px;padding:0 12px;font-size:11.5px" @click="confirm(b.id)">确认</button>
                  <button class="btn btn--ghost" style="height:28px;padding:0 12px;font-size:11.5px" @click="cancel(b.id)">改期</button>
                </div>
              </div>
            </div>
            <div v-if="!pending.length" class="todo">
              <span class="todo__ic"><SvgIcon name="ic-check" cls="ic" /></span>
              <div class="todo__txt"><b>暂无待处理预约</b><span>所有看房请求都已处理完毕</span></div>
            </div>
            <div class="todo">
              <span class="todo__ic"><SvgIcon name="ic-camera" cls="ic" /></span>
              <div class="todo__txt"><b>补充房源实拍图</b><span>带实拍图的房源浏览量平均高出 2.3 倍</span></div>
            </div>
            <div class="todo">
              <span class="todo__ic"><SvgIcon name="ic-star" cls="ic" /></span>
              <div class="todo__txt"><b>回复租客评价</b><span>及时回复可提升房东信用分</span></div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">房东小贴士</div>
          <div class="timeline" style="margin-top:12px">
            <div class="tl">
              <b>保持日历更新</b>
              <span>及时标记已出租房源，避免租客白跑一趟。</span>
            </div>
            <div class="tl">
              <b>设置合理押金</b>
              <span>信用分 90 以上的租客可考虑押金减免，出租更快。</span>
            </div>
            <div class="tl">
              <b>24 小时内回复</b>
              <span>响应速度直接影响房源在搜索结果中的排序。</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 挂拍表单：起拍价 / 最小加价 / 保证金 / 时长 -->
    <div v-if="auctionForm" class="auc-modal" @click.self="auctionForm = null">
      <div class="auc-modal__card">
        <h3>把这套房挂上拍卖</h3>
        <p class="auc-rule">{{ auctionForm.title }}</p>

        <div class="auc-modal__row">
          <label>起拍价</label>
          <input v-model.number="auctionForm.startPrice" type="number" min="1" :step="auctionForm.sale ? 1000 : 50" />
        </div>
        <div class="auc-modal__row">
          <label>最小加价</label>
          <input v-model.number="auctionForm.step" type="number" min="1" />
        </div>
        <div class="auc-modal__row">
          <label>保证金</label>
          <input v-model.number="auctionForm.deposit" type="number" min="0" />
        </div>
        <div class="auc-modal__row">
          <label>拍卖时长</label>
          <select v-model.number="auctionForm.hours">
            <option :value="24">24 小时</option>
            <option :value="72">3 天</option>
            <option :value="168">7 天</option>
          </select>
        </div>

        <p class="auc-rule" style="margin-top:12px">
          起拍价就是首次出价门槛，之后每次至少加 {{ money(auctionForm.step) }}。
          结束前 5 分钟有人出价会顺延 5 分钟，最多顺延 3 次；有人出价后不能撤回。
          保证金只展示、不冻结，和二手房一致。
        </p>

        <div class="auc-modal__acts">
          <button class="btn btn--ghost" @click="auctionForm = null">取消</button>
          <button class="btn btn--primary" :disabled="creating" @click="submitAuction">
            {{ creating ? '挂拍中…' : '确认挂拍' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

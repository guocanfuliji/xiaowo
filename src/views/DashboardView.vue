<script setup>
/** 房东看板：出租表现 + 收入趋势 + 房源排行 */
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import { HOUSE_TYPES } from '@/data/seed.js'
import { state, myHouses, charOf, money, houseById, stats, loadStats } from '@/stores/app.js'

const router = useRouter()

onMounted(loadStats)

const typeName = (id) => (HOUSE_TYPES.find((t) => t.id === id) || {}).name || id

const rented = computed(() => myHouses.value.filter((h) => h.status === 'rented'))
const income = computed(() => rented.value.reduce((s, h) => s + h.price, 0))
const rate = computed(() =>
  myHouses.value.length ? Math.round((rented.value.length / myHouses.value.length) * 100) : 0
)
const views = computed(() => myHouses.value.reduce((s, h) => s + h.views, 0))
const favs = computed(() =>
  state.favorites.filter((id) => myHouses.value.some((h) => h.id === id)).length
)

/** 近 6 个月收入：优先用后端按账单聚合的真实数据，取不到时按在租房源推算 */
const monthIncome = computed(() => {
  const live = stats.monthly || []
  const useLive = live.length === 6
  const rows = useLive
    ? live.map((m) => ({ label: m.label, value: Number(m.amount) || 0 }))
    : (() => {
        const now = new Date()
        const out = []
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const seedVal = Math.sin(d.getMonth() + 1) * 0.12 + 1
          out.push({ label: d.getMonth() + 1 + '月', value: Math.round(income.value * seedVal) })
        }
        return out
      })()
  const max = Math.max(...rows.map((r) => r.value), 1)
  return rows.map((r) => ({
    ...r,
    h: r.value > 0 ? Math.max(6, Math.round((r.value / max) * 100)) : 0
  }))
})

const monthTotal = computed(() => monthIncome.value.reduce((s, m) => s + m.value, 0))

const rank = computed(() => [...myHouses.value].sort((a, b) => b.views - a.views).slice(0, 5))

const byType = computed(() => {
  const map = {}
  myHouses.value.forEach((h) => { map[h.type] = (map[h.type] || 0) + 1 })
  return Object.entries(map).map(([k, v]) => ({ type: k, name: typeName(k), n: v }))
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>房东看板</h1>
        <p>实时掌握房源表现，出租效率一目了然。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/mine')">管理房源</button>
        <button class="btn btn--primary" @click="router.push('/publish')">发布新房源</button>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><i>在管房源</i><b>{{ myHouses.length }}</b><em>套</em></div>
      <div class="kpi"><i>出租率</i><b>{{ rate }}%</b><em>{{ rented.length }} 套已租出</em></div>
      <div class="kpi"><i>月租金收入</i><b>{{ money(income) }}</b><em>预估</em></div>
      <div class="kpi"><i>累计浏览</i><b>{{ views }}</b><em>{{ favs }} 次被收藏</em></div>
    </div>

    <div v-if="myHouses.length" class="two-col">
      <div class="card">
        <div class="card__title">近 6 个月租金收入</div>
        <div class="card__desc">
          {{ stats.loaded ? '按本地账单实际到账统计' : '按当前在租房源推算，实际以账单为准' }}
        </div>
        <div class="bars">
          <div v-for="m in monthIncome" :key="m.label">
            <b>{{ m.value ? money(m.value) : '' }}</b>
            <i :style="{ height: m.h + '%' }" :title="money(m.value)"></i>
            <span>{{ m.label }}</span>
          </div>
        </div>
        <div class="deco-budget">
          <span>6 个月合计</span>
          <b>{{ money(monthTotal) }}</b>
        </div>
        <p v-if="!monthTotal" style="margin:8px 0 0;font-size:11.5px;color:var(--ink3)">
          近 6 个月还没有已出账的租金账单，签约后会自动汇总到这里。
        </p>
      </div>

      <div class="card">
        <div class="card__title">房源热度排行</div>
        <div class="card__desc">浏览量最高的 5 套在管房源</div>
        <div style="margin-top:14px">
          <div v-for="(h, i) in rank" :key="h.id" class="row" style="margin-bottom:8px;cursor:pointer" @click="router.push('/house/' + h.id)">
            <span style="font-size:15px;font-weight:900;color:var(--sea);flex:0 0 22px">{{ i + 1 }}</span>
            <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + h.svg" /></svg>
            <div class="row__main">
              <b>{{ h.title }}</b>
              <span>浏览 {{ h.views }} · 收藏 {{ state.favorites.includes(h.id) ? 1 : 0 }} · ★ {{ h.rating }}</span>
            </div>
            <div class="row__end">{{ money(h.price) }}</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="myHouses.length" class="two-col">
      <div class="card">
        <div class="card__title">房源结构</div>
        <div class="card__desc">按房屋类型统计在管房源</div>
        <div style="margin-top:14px">
          <div v-for="t in byType" :key="t.type" style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:12px">
              <b style="font-weight:800">{{ t.name }}</b><span style="color:var(--ink2)">{{ t.n }} 套</span>
            </div>
            <div class="progress" style="margin-top:5px">
              <i :style="{ width: (t.n / Math.max(...byType.map(x => x.n))) * 100 + '%' }"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__title">经营建议</div>
        <div class="timeline" style="margin-top:14px">
          <div class="tl">
            <b>{{ rate >= 60 ? '出租率表现优秀' : '出租率还有提升空间' }}</b>
            <span>当前出租率 {{ rate }}%，{{ rate >= 60 ? '高于比奇堡平均水平 52%' : '建议适当调整租金或补充实拍图' }}。</span>
          </div>
          <div class="tl">
            <b>补充房屋实拍图</b>
            <span>带图房源的平均浏览量为纯插画房源的 2.3 倍。</span>
          </div>
          <div class="tl">
            <b>关注收藏转化</b>
            <span>有 {{ favs }} 套房源被收藏，主动邀请看房可提升成交率。</span>
          </div>
          <div class="tl">
            <b>保持响应速度</b>
            <span>24 小时内回复预约请求，可提升搜索排序权重。</span>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-if="!myHouses.length"
      icon="h-pineapple"
      title="还没有在管房源"
      desc="发布第一套房源后，这里会展示它的浏览、收藏与收入数据。"
    >
      <button class="btn btn--primary" @click="router.push('/publish')">去发布房源</button>
    </EmptyState>
  </div>
</template>

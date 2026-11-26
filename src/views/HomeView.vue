<script setup>
/** 首页 · 找房：Hero + 权益条 + 多维筛选 + 房源列表 */
import { reactive, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import HouseCard from '@/components/HouseCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { state, charOf } from '@/stores/app.js'
import { DISTRICTS, HOUSE_TYPES, TAGS } from '@/data/seed.js'

const route = useRoute()
const router = useRouter()

const f = reactive({
  q: '', district: '', type: '', rooms: '', maxPrice: 5000, sort: 'recommend', tag: ''
})
const limit = ref(8)
const listRef = ref(null)

watch(() => route.query.q, (v) => { f.q = v || '' }, { immediate: true })

const QUICK = [
  { label: '菠萝屋', type: 'pineapple' },
  { label: '市中心', district: 'center' },
  { label: '水母田', district: 'jelly' },
  { label: '可短租', tag: '可短租' },
  { label: '1500 以下', max: 1500 }
]

function quick(it) {
  f.type = it.type || ''
  f.district = it.district || ''
  f.tag = it.tag || ''
  f.maxPrice = it.max || 5000
  limit.value = 8
  listRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function reset() {
  Object.assign(f, { q: '', district: '', type: '', rooms: '', maxPrice: 5000, sort: 'recommend', tag: '' })
  limit.value = 8
}

const SORTS = [
  { v: 'recommend', t: '综合推荐' },
  { v: 'priceAsc', t: '价格从低到高' },
  { v: 'priceDesc', t: '价格从高到低' },
  { v: 'areaDesc', t: '面积最大' },
  { v: 'newest', t: '最新上架' },
  { v: 'rating', t: '评分最高' }
]

const list = computed(() => {
  let arr = state.houses.filter((h) => h.status !== 'pending' && h.trade !== 'sale')
  const kw = f.q.trim()
  if (kw) {
    const k = kw.toLowerCase()
    arr = arr.filter((h) => {
      const owner = charOf(h.ownerId).name
      const district = DISTRICTS.find((d) => d.id === h.district)?.name || ''
      const typeName = HOUSE_TYPES.find((t) => t.id === h.type)?.name || ''
      return (
        h.title.toLowerCase().includes(k) ||
        h.address.toLowerCase().includes(k) ||
        h.desc.toLowerCase().includes(k) ||
        district.includes(kw) ||
        typeName.includes(kw) ||
        owner.includes(kw) ||
        h.tags.some((t) => t.includes(kw))
      )
    })
  }
  if (f.district) arr = arr.filter((h) => h.district === f.district)
  if (f.type) arr = arr.filter((h) => h.type === f.type)
  if (f.rooms) arr = arr.filter((h) => h.rooms >= Number(f.rooms))
  if (f.tag) arr = arr.filter((h) => h.tags.includes(f.tag))
  arr = arr.filter((h) => h.price <= f.maxPrice)

  const sorted = [...arr]
  switch (f.sort) {
    case 'priceAsc': sorted.sort((a, b) => a.price - b.price); break
    case 'priceDesc': sorted.sort((a, b) => b.price - a.price); break
    case 'areaDesc': sorted.sort((a, b) => b.area - a.area); break
    case 'newest': sorted.sort((a, b) => b.id.localeCompare(a.id)); break
    case 'rating': sorted.sort((a, b) => b.rating - a.rating); break
    default: sorted.sort((a, b) => (b.rating * 30 + b.views / 60 + (b.featured ? 20 : 0)) - (a.rating * 30 + a.views / 60 + (a.featured ? 20 : 0)))
  }
  // 可租优先
  sorted.sort((a, b) => (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1))
  return sorted
})

const shown = computed(() => list.value.slice(0, limit.value))
const hasMore = computed(() => list.value.length > limit.value)
const rentalCount = computed(() => state.houses.filter((h) => h.trade !== 'sale' && h.status !== 'pending').length)
const saleOnSale = computed(() => state.houses.filter((h) => h.trade === 'sale' && h.status === 'available').length)

const PERKS = [
  { e: '🏠', b: '真房源核验', d: '每套房源都经比奇堡房产局备案' },
  { e: '💰', b: '免中介费', d: '房东直租房源零佣金' },
  { e: '📝', b: '电子签约', d: '线上签约，合同云端留存' },
  { e: '🛡️', b: '资金保障', d: '押金平台托管，退租无忧' }
]
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="hero">
      <div class="hero__text">
        <span class="hero__badge">🐌 比奇堡第 1 租房平台</span>
        <h1 class="hero__title">在比奇堡，找一间<br /><span class="hl">会发光的房子</span></h1>
        <p class="hero__sub">
          从菠萝屋到贝壳别墅，{{ rentalCount }} 套海底好房等你来挑。
          按街区、房型、预算自由筛选，电子签约、押金托管一步到位。
        </p>

        <div class="searchbar">
          <div class="searchbar__field">
            <SvgIcon name="ic-search" cls="ic" />
            <input v-model="f.q" type="text" placeholder="试试「菠萝屋」「水母田」「珊迪」" @keyup.enter="limit = 8" />
          </div>
          <button class="btn btn--primary" @click="limit = 8; listRef?.scrollIntoView({behavior:'smooth'})">找房</button>
        </div>

        <div class="chips">
          <button v-for="q in QUICK" :key="q.label" class="chip" @click="quick(q)">{{ q.label }}</button>
        </div>

        <div style="margin-top:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--ink3)">
          想直接买下来？
          <button class="chip" style="margin:0" @click="router.push('/sale')">
            🏷️ 二手房专区 · {{ saleOnSale }} 套在售 →
          </button>
        </div>
      </div>

      <div class="hero__art">
        <div class="float">
          <img class="hero__photo" src="/houses/pineapple.jpg" alt="菠萝屋" />
        </div>
        <span class="hero__tag tag-a">🏖️ 海景阳台</span>
        <span class="hero__tag tag-b">🐌 小蜗推荐</span>
      </div>
    </section>

    <!-- 权益 -->
    <div class="perk">
      <div v-for="p in PERKS" :key="p.b" class="perk__item">
        <span>{{ p.e }}</span>
        <b>{{ p.b }}</b>
        <i>{{ p.d }}</i>
      </div>
    </div>

    <!-- 筛选 -->
    <div ref="listRef" class="sec-head">
      <h2>为你挑房</h2>
      <span class="sec-head__more">共 <b>{{ list.length }}</b> 套符合条件</span>
    </div>

    <div class="filters">
      <div class="filters__group">
        <span class="filters__label">街区</span>
        <select v-model="f.district">
          <option value="">全部</option>
          <option v-for="d in DISTRICTS" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
      </div>
      <div class="filters__group">
        <span class="filters__label">房型</span>
        <select v-model="f.type">
          <option value="">全部</option>
          <option v-for="t in HOUSE_TYPES" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
      <div class="filters__group">
        <span class="filters__label">居室</span>
        <select v-model="f.rooms">
          <option value="">不限</option>
          <option value="1">1 室及以上</option>
          <option value="2">2 室及以上</option>
          <option value="3">3 室及以上</option>
          <option value="4">4 室及以上</option>
        </select>
      </div>
      <div class="filters__group range">
        <span class="filters__label">月租上限</span>
        <input v-model.number="f.maxPrice" type="number" min="500" max="8000" step="100" />
        <span class="filters__label">元</span>
      </div>
      <div class="filters__group">
        <span class="filters__label">标签</span>
        <select v-model="f.tag">
          <option value="">不限</option>
          <option v-for="t in TAGS" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>
      <button class="btn btn--ghost" style="margin-left:auto" @click="reset">重置筛选</button>
    </div>

    <div class="result-bar">
      <b>找到 <em>{{ list.length }}</em> 套房源</b>
      <div class="sortbar">
        <button
          v-for="s in SORTS"
          :key="s.v"
          class="chip"
          :class="{ 'is-on': f.sort === s.v }"
          @click="f.sort = s.v"
        >{{ s.t }}</button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="shown.length" class="grid">
      <HouseCard v-for="h in shown" :key="h.id" :house="h" />
    </div>
    <EmptyState
      v-else
      title="没有找到符合条件的房源"
      desc="试试放宽价格上限，或换一个街区看看。"
      icon="h-dome"
    >
      <button class="btn btn--ghost" @click="reset">重置筛选条件</button>
    </EmptyState>

    <div v-if="hasMore" style="text-align:center;margin-top:20px">
      <button class="btn btn--ghost" @click="limit += 8">加载更多房源（剩余 {{ list.length - limit }} 套）</button>
    </div>

    <div class="sec-head">
      <h2>大家都在看</h2>
      <span class="sec-head__more" @click="router.push('/map')" style="cursor:pointer">去地图找房 →</span>
    </div>
    <div class="grid">
      <HouseCard v-for="h in state.houses.filter(x => x.featured).slice(0, 4)" :key="h.id" :house="h" />
    </div>
  </div>
</template>

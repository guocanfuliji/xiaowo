<script setup>
/** 买房专区：二手房挂牌列表（与租房共用 HouseCard，只是价格口径换成总价） */
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import HouseCard from '@/components/HouseCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { state, money, saleHouses } from '@/stores/app.js'
import { DISTRICTS } from '@/data/seed.js'

const router = useRouter()
const f = reactive({ district: '', maxPrice: 200, rooms: '', sort: 'recommend' })

const SORTS = [
  { v: 'recommend', t: '综合推荐' },
  { v: 'priceAsc', t: '总价从低到高' },
  { v: 'priceDesc', t: '总价从高到低' },
  { v: 'unitAsc', t: '单价最低' },
  { v: 'newest', t: '最新挂牌' }
]

const list = computed(() => {
  let arr = state.houses.filter((h) => h.trade === 'sale' && h.status !== 'pending')
  if (f.district) arr = arr.filter((h) => h.district === f.district)
  if (f.rooms) arr = arr.filter((h) => h.rooms >= Number(f.rooms))
  arr = arr.filter((h) => Number(h.price) <= f.maxPrice * 10000)

  const sorted = [...arr]
  switch (f.sort) {
    case 'priceAsc': sorted.sort((a, b) => a.price - b.price); break
    case 'priceDesc': sorted.sort((a, b) => b.price - a.price); break
    case 'unitAsc': sorted.sort((a, b) => a.price / (a.area || 1) - b.price / (b.area || 1)); break
    case 'newest': sorted.sort((a, b) => String(b.id).localeCompare(String(a.id))); break
    default: sorted.sort((a, b) => (b.rating * 20 + b.views / 100 + (b.featured ? 30 : 0)) - (a.rating * 20 + a.views / 100 + (a.featured ? 30 : 0)))
  }
  // 在售优先，已售沉底
  sorted.sort((a, b) => (a.status === 'available' ? 0 : 1) - (b.status === 'available' ? 0 : 1))
  return sorted
})

const onSale = computed(() => saleHouses.value.filter((h) => h.status === 'available'))
const soldCount = computed(() => saleHouses.value.filter((h) => h.status === 'sold').length)
const avgPrice = computed(() =>
  onSale.value.length ? Math.round(onSale.value.reduce((s, h) => s + Number(h.price), 0) / onSale.value.length) : 0
)

function reset() {
  Object.assign(f, { district: '', maxPrice: 200, rooms: '', sort: 'recommend' })
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>比奇堡二手房</h1>
        <p>在售 {{ onSale.length }} 套 · 已成交 {{ soldCount }} 套 · 在售均价 {{ money(avgPrice) }}</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/sale-orders')">我的购房意向</button>
        <button class="btn btn--primary" @click="router.push('/publish?trade=sale')">我要卖房</button>
      </div>
    </div>

    <div class="sale-hero">
      <div class="sale-hero__item">
        <b>{{ onSale.length }}</b>
        <i>在售房源</i>
      </div>
      <div class="sale-hero__item">
        <b>{{ soldCount }}</b>
        <i>已成交</i>
      </div>
      <div class="sale-hero__item">
        <b>{{ money(avgPrice) }}</b>
        <i>在售均价</i>
      </div>
      <p class="sale-hero__note">
        平台只撮合「购房意向」，不参与资金流转：谈定价格后由双方线下办理过户，意向单仅作记录。
      </p>
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
        <span class="filters__label">居室</span>
        <select v-model="f.rooms">
          <option value="">不限</option>
          <option value="1">1 室及以上</option>
          <option value="2">2 室及以上</option>
          <option value="3">3 室及以上</option>
        </select>
      </div>
      <div class="filters__group range">
        <span class="filters__label">总价上限</span>
        <input v-model.number="f.maxPrice" type="number" min="10" max="500" step="10" />
        <span class="filters__label">万元</span>
      </div>
      <button class="btn btn--ghost" style="margin-left:auto" @click="reset">重置筛选</button>
    </div>

    <div class="result-bar">
      <b>找到 <em>{{ list.length }}</em> 套在售房源</b>
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

    <div v-if="list.length" class="grid">
      <HouseCard v-for="h in list" :key="h.id" :house="h" />
    </div>
    <EmptyState
      v-else
      icon="h-anchor"
      title="没有符合条件的在售房源"
      desc="试试放宽总价上限，或者换个街区看看。"
    >
      <button class="btn btn--ghost" @click="reset">重置筛选条件</button>
    </EmptyState>
  </div>
</template>

<style scoped>
.sale-hero {
  display: flex;
  align-items: center;
  gap: 26px;
  flex-wrap: wrap;
  padding: 16px 20px;
  margin-bottom: 14px;
  background: var(--card, #fff);
  border-radius: 14px;
  box-shadow: 0 6px 18px rgba(18, 60, 63, .06);
}
.sale-hero__item { display: flex; flex-direction: column; }
.sale-hero__item b { font-size: 20px; font-weight: 900; color: var(--ink1); line-height: 1.2; }
.sale-hero__item i { font-style: normal; font-size: 11px; color: var(--ink3); margin-top: 2px; }
.sale-hero__note {
  flex: 1;
  min-width: 240px;
  margin: 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--ink3);
}
</style>

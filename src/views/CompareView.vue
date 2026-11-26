<script setup>
/** 房源对比：最多 3 套横向对比 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import { state, compareHouses, charOf, toggleCompare, money } from '@/stores/app.js'
import { DISTRICTS, HOUSE_TYPES } from '@/data/seed.js'

const router = useRouter()
const adding = ref('')

const others = computed(() => state.houses.filter((h) => !state.compare.includes(h.id) && h.trade !== 'sale'))

const ROWS = [
  { k: 'price', label: '价格', fmt: (h) => (h.trade === 'sale' ? money(h.price) + '（总价）' : money(h.price) + '/月') },
  { k: 'deposit', label: '押金', fmt: (h) => (h.trade === 'sale' ? '—' : money(h.deposit)) },
  { k: 'area', label: '建筑面积', fmt: (h) => h.area + ' m²' },
  { k: 'layout', label: '户型', fmt: (h) => `${h.rooms}室${h.halls}厅${h.baths}卫` },
  { k: 'floor', label: '楼层', fmt: (h) => `${h.floor}/${h.totalFloor} 层` },
  { k: 'fit', label: '装修', fmt: (h) => h.fit },
  { k: 'district', label: '街区', fmt: (h) => DISTRICTS.find((d) => d.id === h.district)?.name || '-' },
  { k: 'type', label: '房型', fmt: (h) => HOUSE_TYPES.find((t) => t.id === h.type)?.name || '-' },
  { k: 'from', label: '可入住', fmt: (h) => h.availableFrom || '—' },
  { k: 'lease', label: '最短租期', fmt: (h) => (h.trade === 'sale' ? '—' : h.minLease + ' 个月') },
  { k: 'rating', label: '评分', fmt: (h) => '★ ' + h.rating + `（${h.reviewCount} 条）` },
  { k: 'owner', label: '房东', fmt: (h) => charOf(h.ownerId).name },
  { k: 'facilities', label: '配套', fmt: (h) => h.facilities.join('、') }
]

function add() {
  if (!adding.value) return
  toggleCompare(adding.value)
  adding.value = ''
}

const best = computed(() => {
  const list = compareHouses.value
  if (!list.length) return null
  return list.reduce((a, b) => (a.price <= b.price ? a : b))
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>房源对比</h1>
        <p>横向比较最多 3 套房源的关键参数，帮你做最后决定。</p>
      </div>
      <div class="page-head__acts">
        <select v-model="adding" style="width:auto;min-width:180px;height:40px;margin-top:0">
          <option value="">添加一套房源…</option>
          <option v-for="h in others" :key="h.id" :value="h.id">{{ h.title }}</option>
        </select>
        <button class="btn btn--primary" @click="add">加入对比</button>
      </div>
    </div>

    <div v-if="compareHouses.length" class="card cmp">
      <table>
        <thead>
          <tr>
            <th style="width:120px">对比项</th>
            <th v-for="h in compareHouses" :key="h.id">
              <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
                <svg viewBox="0 0 120 150" style="height:56px;width:auto"><use :href="'#' + h.svg" /></svg>
                <span>{{ h.title }}</span>
                <span class="badge" :class="h.id === best?.id ? 'badge--mint' : ''">
                  {{ h.id === best?.id ? '价格最低' : h.status === 'available' ? '可租' : '已租出' }}
                </span>
                <button class="btn btn--ghost" style="height:28px;padding:0 10px;font-size:11px" @click="toggleCompare(h.id)">移除</button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in ROWS" :key="r.k">
            <td>{{ r.label }}</td>
            <td v-for="h in compareHouses" :key="h.id + r.k">{{ r.fmt(h) }}</td>
          </tr>
          <tr>
            <td>操作</td>
            <td v-for="h in compareHouses" :key="h.id + 'act'">
              <button class="btn btn--primary" style="height:32px;padding:0 14px;font-size:12px" @click="router.push('/house/' + h.id)">查看详情</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <EmptyState
      v-else
      icon="icx-compare"
      title="对比栏还没有房源"
      desc="在房源详情页点击「加入对比」，或从上方下拉框直接添加。"
    >
      <button class="btn btn--primary" @click="router.push('/')">去找房</button>
    </EmptyState>

    <div v-if="compareHouses.length" class="card" style="margin-top:16px">
      <div class="card__title">小蜗的建议</div>
      <div class="card__desc">
        价格最低的是「{{ best?.title }}」，{{ best?.trade === 'sale' ? '总价' : '月租' }} {{ money(best?.price || 0) }}；
        评分最高的是「{{ [...compareHouses].sort((a,b)=>b.rating-a.rating)[0]?.title }}」。
        如果你更看重通勤，建议优先看比奇堡市中心的房源。
      </div>
    </div>
  </div>
</template>

<script setup>
/** 比奇堡地图找房：地图 + pin + 房源列表联动 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import AmapPanel from '@/components/AmapPanel.vue'
import { state, charOf, houseById, money } from '@/stores/app.js'
import { DISTRICTS, HOUSE_TYPES, placeHouses } from '@/data/seed.js'
import EmptyState from '@/components/EmptyState.vue'

/** 配了高德 Key 就用真地图，否则回落到手绘示意图 */
const hasKey = !!import.meta.env.VITE_AMAP_KEY

const router = useRouter()
const activeId = ref('')
const filter = ref({ district: '', type: '', max: 6000 })

const pins = computed(() => {
  const list = state.houses.filter((h) => {
    if (h.status === 'pending') return false
    if (filter.value.district && h.district !== filter.value.district) return false
    if (filter.value.type && h.type !== filter.value.type) return false
    return h.price <= filter.value.max
  })
  // 用全量房源算槽位，筛选后同一个房源不会跳位置
  const placed = placeHouses(state.houses.filter((h) => h.status !== 'pending'))
  return list.map((h) => placed.find((p) => p.id === h.id) || h)
})
const active = computed(() => houseById(activeId.value))
const activeOwner = computed(() => (active.value ? charOf(active.value.ownerId) : null))
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>比奇堡地图找房</h1>
        <p>点击地图上的图钉查看房源，右侧列表与地图双向联动。</p>
      </div>
      <div class="page-head__acts">
        <select v-model="filter.district" style="width:auto;min-width:130px;height:40px;margin-top:0">
          <option value="">全部街区</option>
          <option v-for="d in DISTRICTS" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <select v-model="filter.type" style="width:auto;min-width:110px;height:40px;margin-top:0">
          <option value="">全部房型</option>
          <option v-for="t in HOUSE_TYPES" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </div>
    </div>

    <div class="two-col map-layout" :class="{ 'map-layout--amap': hasKey }">
      <div>
        <div class="mapbox" :class="{ 'mapbox--amap': hasKey }">
          <AmapPanel v-if="hasKey" :markers="pins" :active-id="activeId" @select="activeId = $event" />

          <template v-else>
          <svg class="map" viewBox="0 0 1000 525" preserveAspectRatio="none">
            <defs>
              <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#c9f2f4" /><stop offset="1" stop-color="#8fdfe3" />
              </linearGradient>
            </defs>
            <rect width="1000" height="525" fill="url(#seaG)" />
            <!-- 沙丘 -->
            <path d="M0 470 Q250 420 500 470 T1000 460 L1000 525 L0 525z" fill="#F6E3B4" opacity=".85" />
            <path d="M0 505 Q300 470 620 505 T1000 495 L1000 525 L0 525z" fill="#EFD79F" opacity=".9" />
            <!-- 海带森林 -->
            <g stroke="#4FA98A" stroke-width="6" stroke-linecap="round" opacity=".55" fill="none">
              <path d="M760 470 q14-70 0-130" /><path d="M800 480 q-16-80 4-140" /><path d="M840 470 q18-60 2-120" />
            </g>
            <!-- 沉船 -->
            <g opacity=".5" transform="translate(120 400) rotate(-8)">
              <path d="M0 40 L60 40 L50 70 L10 70z" fill="#8C6A46" />
              <path d="M30 40 L30 0" stroke="#8C6A46" stroke-width="5" />
            </g>
            <!-- 街区圈 -->
            <g v-for="d in DISTRICTS" :key="d.id">
              <ellipse :cx="d.x * 10" :cy="d.y * 5.25" rx="86" ry="52" fill="rgba(255,255,255,.22)" />
              <text :x="d.x * 10" :y="d.y * 5.25 - 60" text-anchor="middle" font-size="15" font-weight="800" fill="#0d6167" opacity=".65">{{ d.name }}</text>
            </g>
          </svg>

          <button
            v-for="h in pins"
            :key="h.id"
            class="pin"
            :class="{ 'is-active': activeId === h.id }"
            :style="{ left: h.x + '%', top: h.y + '%' }"
            :title="h.title"
            @click="activeId = h.id"
          >
            <span class="pin__dot"><svg viewBox="0 0 120 150"><use :href="'#' + h.svg" /></svg></span>
            <span class="pin__label">{{ money(h.price) }}</span>
          </button>
          </template>

          <div v-if="!hasKey" class="map-hint">
            <b>当前是手绘示意图</b>
            <span>在 .env 里填 <code>VITE_AMAP_KEY</code> 后刷新，即可切换成高德实景地图。</span>
          </div>

          <div v-if="active" class="map-tip">
            <b>{{ active.title }}</b>
            <span>{{ active.address }} · {{ active.rooms }}室{{ active.halls }}厅 · {{ active.area }}m²</span>
            <span class="price">{{ money(active.price) }}<i style="font-size:10px;font-style:normal">/月</i></span>
            <div style="display:flex;gap:8px;margin-top:10px">
              <button class="btn btn--primary" style="height:34px;padding:0 14px;font-size:12px" @click="router.push('/house/' + active.id)">查看详情</button>
              <button class="btn btn--ghost" style="height:34px;padding:0 14px;font-size:12px" @click="$router.push('/booking?house=' + active.id)">预约看房</button>
            </div>
          </div>
          <div v-else class="map-tip">
            <b>点击图钉看房源</b>
            <span>当前地图共 {{ pins.length }} 套在租房源</span>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__title">地图房源 <span class="badge badge--mint">{{ pins.length }} 套</span></div>
        <div class="card__desc">按价格从低到高排列，点击可定位</div>
        <div class="scroll-y" style="margin-top:12px">
          <div
            v-for="h in [...pins].sort((a,b)=>a.price-b.price)"
            :key="h.id"
            class="row"
            :style="activeId === h.id ? 'outline:2px solid var(--sea)' : ''"
            style="margin-bottom:8px;cursor:pointer"
            @click="activeId = h.id"
          >
            <svg class="ico" viewBox="0 0 120 150" style="background:rgba(94,211,214,.12)"><use :href="'#' + h.svg" /></svg>
            <div class="row__main">
              <b>{{ h.title }}</b>
              <span>{{ h.rooms }}室{{ h.halls }}厅 · {{ h.area }}m² · {{ charOf(h.ownerId).name }}</span>
            </div>
            <div class="row__end">{{ money(h.price) }}</div>
          </div>
          <EmptyState v-if="!pins.length" title="该条件下没有房源" desc="换个街区或提高预算试试" />
        </div>
      </div>
    </div>
  </div>
</template>

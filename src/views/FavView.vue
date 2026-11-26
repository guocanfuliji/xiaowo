<script setup>
/** 我的收藏 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import HouseCard from '@/components/HouseCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { state, favHouses, toggleFav, clearFavorites, money } from '@/stores/app.js'

const router = useRouter()
const tab = ref('all')
const sort = ref('default')

const list = computed(() => {
  let arr = [...favHouses.value]
  if (tab.value === 'available') arr = arr.filter((h) => h.status === 'available')
  if (tab.value === 'rented') arr = arr.filter((h) => h.status === 'rented')
  if (sort.value === 'priceAsc') arr.sort((a, b) => a.price - b.price)
  if (sort.value === 'priceDesc') arr.sort((a, b) => b.price - a.price)
  if (sort.value === 'rating') arr.sort((a, b) => b.rating - a.rating)
  return arr
})

const avg = computed(() =>
  list.value.length ? (list.value.reduce((s, h) => s + h.price, 0) / list.value.length).toFixed(0) : 0
)

function clearAll() {
  clearFavorites()
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>我的收藏</h1>
        <p>共 {{ state.favorites.length }} 套房源，平均月租 ¥{{ avg }}。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="clearAll">清空收藏</button>
        <button class="btn btn--primary" @click="router.push('/compare')">去对比</button>
      </div>
    </div>

    <div class="filters">
      <div class="tabs">
        <button :class="{ 'is-on': tab === 'all' }" @click="tab = 'all'">全部 {{ state.favorites.length }}</button>
        <button :class="{ 'is-on': tab === 'available' }" @click="tab = 'available'">可租</button>
        <button :class="{ 'is-on': tab === 'rented' }" @click="tab = 'rented'">已租出</button>
      </div>
      <div class="sortbar" style="margin-left:auto">
        <button class="chip" :class="{ 'is-on': sort === 'default' }" @click="sort = 'default'">默认</button>
        <button class="chip" :class="{ 'is-on': sort === 'priceAsc' }" @click="sort = 'priceAsc'">价格 ↑</button>
        <button class="chip" :class="{ 'is-on': sort === 'priceDesc' }" @click="sort = 'priceDesc'">价格 ↓</button>
        <button class="chip" :class="{ 'is-on': sort === 'rating' }" @click="sort = 'rating'">评分</button>
      </div>
    </div>

    <div v-if="list.length" class="grid">
      <HouseCard v-for="h in list" :key="h.id" :house="h" />
    </div>
    <EmptyState
      v-else
      icon="icx-heart"
      title="收藏夹还是空的"
      desc="在房源卡片右上角点一下爱心，就能把房子收进来慢慢挑。"
    >
      <button class="btn btn--primary" @click="router.push('/')">去挑几套房</button>
    </EmptyState>
  </div>
</template>

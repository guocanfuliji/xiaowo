<script setup>
/** 房源卡片（列表/收藏/搜索共用） */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from './SvgIcon.vue'
import CharAvatar from './CharAvatar.vue'
import { charOf, isFav, toggleFav, money } from '@/stores/app.js'
import { typeImg } from '@/data/seed.js'

const props = defineProps({
  house: { type: Object, required: true },
  compact: { type: Boolean, default: false }
})
const router = useRouter()

const owner = computed(() => charOf(props.house.ownerId))
const catMap = { pineapple: 'sea', rock: 'rock', dome: 'dome', shell: 'shell', anchor: 'anchor', moai: 'moai' }
const cat = computed(() => catMap[props.house.type] || 'sea')
/** 有原画实拍就上实拍，没有则回落手绘 symbol */
const photo = computed(() => typeImg(props.house.type))
const favOn = computed(() => isFav(props.house.id))
const isSale = computed(() => props.house.trade === 'sale')

const statusText = computed(() => (isSale.value
  ? { available: '在售', sold: '已售', pending: '待上架' }
  : { available: '可租', rented: '已租出', pending: '待上架' })[props.house.status] || props.house.status)
const statusClass = computed(() => (isSale.value
  ? { available: 'badge--yellow', sold: 'badge', pending: 'badge--yellow' }
  : { available: 'badge--mint', rented: 'badge', pending: 'badge--yellow' })[props.house.status] || 'badge')
</script>

<template>
  <article class="hcard">
    <div class="hcard__art" :data-cat="cat">
      <span class="badge hcard__badge" :class="statusClass">{{ statusText }}</span>
      <button
        class="hcard__fav"
        :class="{ 'is-on': favOn }"
        :title="favOn ? '取消收藏' : '收藏'"
        @click.stop="toggleFav(house.id)"
      >
        <svg viewBox="0 0 24 24"><use href="#ic-heart" /></svg>
      </button>
      <img v-if="photo" class="arte-photo" :src="photo" alt="" loading="lazy" draggable="false" />
      <svg v-else class="arte" viewBox="0 0 120 150"><use :href="'#' + house.svg" /></svg>
    </div>

    <div class="hcard__body" @click="router.push('/house/' + house.id)" style="cursor:pointer">
      <h3 class="hcard__title">{{ house.title }}</h3>
      <div class="hcard__meta">
        <SvgIcon name="ic-pin" cls="ic" />
        <span>{{ house.address }}</span>
      </div>
      <div class="hcard__specs">
        <i><SvgIcon name="ic-bed" cls="ic" />{{ house.rooms }}室{{ house.halls }}厅</i>
        <i><SvgIcon name="ic-area" cls="ic" />{{ house.area }}m²</i>
        <i>{{ house.floor }}/{{ house.totalFloor }}层</i>
      </div>
      <div class="hcard__tags">
        <span v-for="t in house.tags.slice(0, 3)" :key="t">{{ t }}</span>
      </div>
      <div class="hcard__foot">
        <div class="price">{{ money(house.price) }}<i>{{ isSale ? '总价' : '/月' }}</i></div>
        <div class="host">
          <CharAvatar :char="owner" :size="22" />
          <span>{{ owner.name }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
/** 房源详情：图集 / 参数 / 房东 / 预约 / 评价 / 相似房源 */
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import CharAvatar from '@/components/CharAvatar.vue'
import HouseCard from '@/components/HouseCard.vue'
import {
  state, charOf, houseById, visitHouse, isFav, toggleFav,
  isCompare, toggleCompare, addBooking, addReview, money, toast, submitSaleIntent
} from '@/stores/app.js'
import { DISTRICTS, HOUSE_TYPES, TAGS, typeImg, placeHouses } from '@/data/seed.js'
import AmapPanel from '@/components/AmapPanel.vue'

/** 配了高德 Key 的话，详情页的「房源位置」也用实景小地图 */
const hasKey = !!import.meta.env.VITE_AMAP_KEY
const posPins = computed(() => {
  if (!house.value) return []
  const p = placeHouses(state.houses.filter((h) => h.status !== 'pending')).find((x) => x.id === house.value.id)
  return p ? [p] : []
})

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id)
const house = computed(() => houseById(id.value))

/** 图集：本房型实拍 + 其它房型实拍，点击切换大图 */
const gallery = computed(() => {
  const own = HOUSE_TYPES.find((t) => t.id === house.value?.type)
  const rest = HOUSE_TYPES.filter((t) => t.id !== house.value?.type && t.img)
  return [own, ...rest].filter((t) => t && t.img).slice(0, 4)
})
const activeType = ref('')
watch(house, (h) => { if (h) activeType.value = h.type }, { immediate: true })
const activePhoto = computed(() => {
  const t = HOUSE_TYPES.find((x) => x.id === (activeType.value || house.value?.type))
  return (t && t.img) || typeImg(house.value?.type)
})
onMounted(() => visitHouse(id.value))

const owner = computed(() => (house.value ? charOf(house.value.ownerId) : null))
const districtName = computed(() => DISTRICTS.find((d) => d.id === house.value?.district)?.name || '')
const typeName = computed(() => HOUSE_TYPES.find((t) => t.id === house.value?.type)?.name || '')
const ownerHouses = computed(() => state.houses.filter((h) => h.ownerId === house.value?.ownerId && h.id !== id.value))
const reviews = computed(() => state.reviews.filter((r) => r.houseId === id.value))
const similar = computed(() =>
  state.houses.filter((h) => h.id !== id.value && h.district === house.value?.district).slice(0, 3)
)
const avgRating = computed(() =>
  reviews.value.length ? (reviews.value.reduce((s, r) => s + r.rating, 0) / reviews.value.length).toFixed(1) : '—'
)

/* 售房：总价 / 单价 / 购房意向 */
const isSale = computed(() => house.value?.trade === 'sale')
const unitPrice = computed(() => {
  const area = Number(house.value?.area || 0)
  return area > 0 ? Math.round(Number(house.value.price) / area) : 0
})
const intent = ref({ price: 0, message: '' })
watch(house, (h) => { if (h) intent.value = { price: h.price, message: '' } }, { immediate: true })
const intentSent = computed(() => state.saleIntents.some(
  (i) => i.houseId === id.value && i.buyerId === state.user.charId && i.status === 'pending'
))
const isMyHouse = computed(() => house.value?.ownerId === state.user.charId)
function submitIntent() {
  submitSaleIntent({ houseId: id.value, price: intent.value.price, message: intent.value.message })
}

/* 预约 */
const booking = ref({ date: '', time: '10:00', note: '' })
const TIMES = ['09:30', '10:00', '11:00', '14:00', '14:30', '16:00', '18:30']
function submitBooking() {
  if (!booking.value.date) return toast('请选择看房日期', 'warn')
  addBooking({ houseId: id.value, date: booking.value.date, time: booking.value.time, note: booking.value.note })
  booking.value = { date: '', time: '10:00', note: '' }
}

/* 评价 */
const myReview = ref({ rating: 5, content: '', tags: [] })
function toggleRtag(t) {
  const i = myReview.value.tags.indexOf(t)
  if (i >= 0) myReview.value.tags.splice(i, 1)
  else myReview.value.tags.push(t)
}
function submitReview() {
  if (!myReview.value.content.trim()) return toast('请写点入住感受吧', 'warn')
  addReview({ houseId: id.value, rating: myReview.value.rating, content: myReview.value.content, tags: myReview.value.tags })
  myReview.value = { rating: 5, content: '', tags: [] }
}

function today() { return new Date().toISOString().slice(0, 10) }
</script>

<template>
  <div v-if="house">
    <button class="back-btn" @click="router.back()">
      <SvgIcon name="ic-arrow-left" cls="ic" /> 返回
    </button>

    <div class="detail">
      <!-- 左侧主体 -->
      <div>
        <div class="detail__hero">
          <div class="detail__art" :class="{ 'has-photo': !!activePhoto }">
            <img v-if="activePhoto" class="arte-photo" :src="activePhoto" alt="" draggable="false" />
            <svg v-else class="arte" viewBox="0 0 120 150"><use :href="'#' + house.svg" /></svg>
          </div>
          <div class="detail__body">
            <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">
              <span class="badge" :class="isSale ? 'badge--yellow' : 'badge--mint'">{{ isSale ? '出售' : '出租' }}</span>
              <span class="badge badge--mint">{{ typeName }}</span>
              <span class="badge">{{ house.fit }}</span>
              <span v-for="t in house.tags" :key="t" class="badge badge--yellow">{{ t }}</span>
            </div>
            <h1 class="detail__title" style="margin-top:10px">{{ house.title }}</h1>
            <div class="detail__sub">
              <SvgIcon name="ic-pin" cls="ic" /> {{ house.address }} · {{ districtName }}
            </div>
            <div class="detail__price">
              <span class="price">{{ money(house.price) }}</span>
              <small v-if="isSale">总价 · 单价约 {{ money(unitPrice) }}/m² · 面积 {{ house.area }} m²</small>
              <small v-else>/月 · 押金 {{ money(house.deposit) }} · 最短租期 {{ house.minLease }} 个月</small>
            </div>

            <div class="detail__facts">
              <div class="fact"><b>{{ house.rooms }}室{{ house.halls }}厅{{ house.baths }}卫</b><i>户型</i></div>
              <div class="fact"><b>{{ house.area }} m²</b><i>建筑面积</i></div>
              <div class="fact"><b>{{ house.floor }}/{{ house.totalFloor }}F</b><i>楼层</i></div>
              <div class="fact"><b>{{ house.orientation }}</b><i>朝向</i></div>
            </div>

            <div class="detail__amenities">
              <span v-for="a in house.facilities" :key="a" class="amenity">
                <SvgIcon name="ic-check" cls="ic" />{{ a }}
              </span>
            </div>

            <div class="sub-title">房源描述</div>
            <p style="font-size:13px;line-height:1.85;color:var(--ink2)">{{ house.desc }}</p>

            <div class="sub-title">房型图集</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button
                v-for="g in gallery"
                :key="g.id"
                class="theme"
                :class="{ 'is-on': activeType === g.id }"
                style="width:86px;flex-direction:column;gap:4px;padding:6px"
                :title="g.name"
                @click="activeType = g.id"
              >
                <img :src="g.img" alt="" style="width:72px;height:46px;object-fit:cover;border-radius:8px;display:block" />
                <span style="font-size:10.5px;line-height:1.2">{{ g.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 评价 -->
        <div class="card" style="margin-top:18px">
          <div class="card__title">住客评价 <span class="stars">★ {{ avgRating }}</span></div>
          <div class="card__desc">{{ reviews.length }} 条真实评价 · 来自已签约的租客</div>

          <div v-if="reviews.length">
            <div v-for="r in reviews" :key="r.id" class="comment">
              <CharAvatar :char="charOf(r.authorId)" :size="38" />
              <div style="flex:1;min-width:0">
                <b>{{ charOf(r.authorId).name }}</b>
                <span class="stars" style="margin-left:8px">{{ '★'.repeat(r.rating) }}</span>
                <p>{{ r.content }}</p>
                <div class="badge-row" style="margin-top:6px">
                  <span v-for="t in r.tags" :key="t" class="badge badge--purple">{{ t }}</span>
                  <span class="tl__time">{{ r.date }}</span>
                </div>
              </div>
            </div>
          </div>
          <p v-else style="font-size:12.5px;color:var(--ink3);margin-top:12px">还没有评价，来做第一个吧。</p>

          <div class="sub-title">写评价</div>
          <div style="display:flex;align-items:center;gap:10px">
            <span style="font-size:12px;font-weight:800;color:var(--ink2)">评分</span>
            <span
              v-for="n in 5"
              :key="n"
              class="stars stars--lg"
              style="cursor:pointer"
              :style="{ opacity: n <= myReview.rating ? 1 : .28 }"
              @click="myReview.rating = n"
            >★</span>
          </div>
          <div class="checks">
            <label v-for="t in TAGS.slice(0, 6)" :key="t" class="check">
              <input type="checkbox" :checked="myReview.tags.includes(t)" @change="toggleRtag(t)" />{{ t }}
            </label>
          </div>
          <textarea v-model="myReview.content" placeholder="说说房子的采光、隔音和房东响应速度…" style="margin-top:10px"></textarea>
          <button class="btn btn--primary" style="margin-top:10px" @click="submitReview">发布评价</button>
        </div>
      </div>

      <!-- 右侧边栏 -->
      <div>
        <div class="side-card">
          <div class="host-row">
            <CharAvatar :char="owner" :size="54" />
            <div>
              <b>{{ owner.name }}</b>
              <i>{{ owner.role }} · 认证房东</i>
            </div>
          </div>
          <div class="host-stats">
            <div><b>{{ state.houses.filter(h => h.ownerId === house.ownerId).length }}</b><i>{{ isSale ? '在售房源' : '在租房源' }}</i></div>
            <div><b>{{ house.rating }}</b><i>平均评分</i></div>
            <div><b>{{ ownerHouses.length + 3 }}</b><i>成交记录</i></div>
          </div>
          <button class="btn btn--primary btn--lg" @click="$router.push('/booking?house=' + house.id)">
            <SvgIcon name="ic-calendar" cls="ic" /> 预约看房
          </button>
          <button class="btn btn--ghost btn--lg" @click="toggleFav(house.id)">
            {{ isFav(house.id) ? '已收藏 ♥' : '收藏房源' }}
          </button>
          <button class="btn btn--ghost btn--lg" @click="toggleCompare(house.id)">
            {{ isCompare(house.id) ? '已在对比栏' : '加入对比' }}
          </button>

          <template v-if="isSale">
            <div class="sub-title">提交购房意向</div>
            <label>你的出价（元）</label>
            <input v-model.number="intent.price" type="number" min="1" step="1000" />
            <input v-model="intent.message" type="text" placeholder="付款方式 / 过户时间（选填）" style="margin-top:10px" />
            <button
              class="btn btn--yellow btn--lg"
              style="margin-top:10px"
              :disabled="house.status !== 'available' || intentSent || isMyHouse"
              @click="submitIntent"
            >
              {{ house.status === 'sold' ? '该房源已成交' : isMyHouse ? '这是你名下的房源' : intentSent ? '意向已提交，等待确认' : '提交购房意向' }}
            </button>
          </template>

          <template v-else>
            <div class="sub-title">快速预约</div>
            <label>看房日期</label>
            <input v-model="booking.date" type="date" :min="today()" />
            <div class="chips" style="margin-top:10px">
              <button v-for="t in TIMES" :key="t" class="chip" :class="{ 'is-on': booking.time === t }" @click="booking.time = t">{{ t }}</button>
            </div>
            <input v-model="booking.note" type="text" placeholder="备注（选填）" style="margin-top:10px" />
            <button class="btn btn--yellow btn--lg" style="margin-top:10px" @click="submitBooking">提交预约</button>
          </template>
        </div>

        <div class="side-card" style="margin-top:14px">
          <div class="card__title" style="font-size:14px">房源位置</div>
          <div class="mini-map" style="margin-top:10px">
            <AmapPanel v-if="hasKey" :markers="posPins" :active-id="house.id" />
            <div v-else class="pin is-active" :style="{ left: house.x + '%', top: house.y + '%' }">
              <span class="pin__dot"><SvgIcon :name="house.svg" /></span>
              <span class="pin__label">{{ money(house.price) }}</span>
            </div>
          </div>
          <div class="kv" style="margin-top:10px"><span>所在街区</span><b>{{ districtName }}</b></div>
          <div class="kv" v-if="isSale"><span>交易类型</span><b>产权出售</b></div>
          <div class="kv" v-else><span>可入住时间</span><b>{{ house.availableFrom }}</b></div>
          <div class="kv"><span>浏览量</span><b>{{ house.views }} 次</b></div>
        </div>
      </div>
    </div>

    <div class="sec-head">
      <h2>同街区房源</h2>
      <span class="sec-head__more" @click="router.push('/map')" style="cursor:pointer">在地图上查看 →</span>
    </div>
    <div v-if="similar.length" class="grid">
      <HouseCard v-for="h in similar" :key="h.id" :house="h" />
    </div>
    <EmptyState v-else title="该街区暂无更多房源" desc="换个街区看看吧" />
  </div>

  <EmptyState v-else title="房源不存在或已下架" desc="它可能刚刚被租出去了">
    <button class="btn btn--primary" @click="router.push('/')">回到首页找房</button>
  </EmptyState>
</template>

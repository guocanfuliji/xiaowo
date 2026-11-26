<script setup>
/** 评价与信用：信用分构成 + 我的评价 + 待评价房源 */
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { state, houseById, charOf, addReview, money, toast } from '@/stores/app.js'

const router = useRouter()

const mine = computed(() => state.reviews.filter((r) => r.authorId === state.user.charId))
const reviewedIds = computed(() => mine.value.map((r) => r.houseId))

/** 可以评价的房源：已完成看房或已租过的房源 */
const pending = computed(() => {
  const ids = new Set()
  state.bookings.filter((b) => b.status === 'done').forEach((b) => ids.add(b.houseId))
  state.leases.forEach((l) => ids.add(l.houseId))
  return [...ids].map(houseById).filter((h) => h && !reviewedIds.value.includes(h.id))
})

const CREDIT = [
  { k: '按时交租', v: 95, w: '40%', d: '连续 8 个月按时缴纳房租' },
  { k: '履约记录', v: 90, w: '30%', d: '无违约、无提前退租' },
  { k: '评价反馈', v: 88, w: '20%', d: '房东与邻居评价良好' },
  { k: '平台活跃', v: 92, w: '10%', d: '每周至少登录 3 次' }
]

const BENEFITS = [
  { e: '🪙', b: '押金减免', d: '信用分 ≥ 90，部分房源可押一付一' },
  { e: '⚡', b: '优先审核', d: '房东优先通过你的看房与签约申请' },
  { e: '🎁', b: '租金券', d: '每季度可领取 ¥100 租金抵扣券' },
  { e: '🛡️', b: '纠纷保障', d: '平台优先介入并垫付争议金额' }
]

const form = reactive({ houseId: '', rating: 5, content: '', tags: [] })
const TAGS = ['房东好说话', '采光超棒', '隔音很好', '位置便利', '性价比高', '配套齐全', '装修精美']

function toggleTag(t) {
  const i = form.tags.indexOf(t)
  if (i >= 0) form.tags.splice(i, 1)
  else form.tags.push(t)
}

function submit() {
  if (!form.houseId) return toast('请选择要评价的房源', 'warn')
  if (!form.content.trim()) return toast('请写点真实感受', 'warn')
  addReview({ houseId: form.houseId, rating: form.rating, content: form.content, tags: [...form.tags] })
  form.houseId = ''
  form.content = ''
  form.tags = []
}

const topRated = computed(() => [...state.houses].sort((a, b) => b.rating - a.rating).slice(0, 5))
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>评价与信用</h1>
        <p>真实的评价让比奇堡的租房环境越来越好。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--primary" @click="router.push('/help')">信用规则说明</button>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card__title">我的居住信用分</div>
        <div class="card__desc">满分 100 分，每月 1 日更新</div>

        <div style="display:flex;align-items:center;gap:18px;margin-top:16px;flex-wrap:wrap">
          <div style="position:relative;width:118px;height:118px;flex:0 0 118px">
            <svg viewBox="0 0 100 100" style="width:100%;height:100%;transform:rotate(-90deg)">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(15,111,116,.1)" stroke-width="10" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#15a3a8" stroke-width="10" stroke-linecap="round"
                :stroke-dasharray="(2 * Math.PI * 42).toFixed(1)"
                :stroke-dashoffset="(2 * Math.PI * 42 * (1 - state.user.credit / 100)).toFixed(1)"
              />
            </svg>
            <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">
              <b style="font-size:26px;font-weight:900">{{ state.user.credit }}</b>
              <i style="font-size:10.5px;font-style:normal;color:var(--ink3)">信用优秀</i>
            </div>
          </div>
          <div style="flex:1;min-width:220px">
            <div v-for="c in CREDIT" :key="c.k" style="margin-bottom:12px">
              <div style="display:flex;justify-content:space-between;font-size:12px">
                <b style="font-weight:800">{{ c.k }}</b>
                <span style="color:var(--ink2)">{{ c.v }} 分 · 权重 {{ c.w }}</span>
              </div>
              <div class="progress" style="margin-top:5px"><i :style="{ width: c.v + '%' }"></i></div>
              <span style="font-size:10.5px;color:var(--ink3)">{{ c.d }}</span>
            </div>
          </div>
        </div>

        <div class="perk" style="margin-top:8px">
          <div v-for="b in BENEFITS" :key="b.b" class="perk__item">
            <span>{{ b.e }}</span><b>{{ b.b }}</b><i>{{ b.d }}</i>
          </div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card__title">写评价</div>
          <div class="card__desc">评价将公开展示，帮助后来的租客做决定</div>

          <div style="margin-top:12px">
            <label>选择房源</label>
            <select v-model="form.houseId">
              <option value="">请选择…</option>
              <option v-for="h in pending" :key="h.id" :value="h.id">{{ h.title }}</option>
            </select>
          </div>

          <div style="display:flex;align-items:center;gap:8px;margin-top:14px">
            <span style="font-size:12px;font-weight:800;color:var(--ink2)">评分</span>
            <span
              v-for="n in 5" :key="n" class="stars stars--lg" style="cursor:pointer"
              :style="{ opacity: n <= form.rating ? 1 : .28 }"
              @click="form.rating = n"
            >★</span>
            <span style="font-size:11.5px;color:var(--ink3)">{{ form.rating }} 星</span>
          </div>

          <div class="checks">
            <label v-for="t in TAGS" :key="t" class="check">
              <input type="checkbox" :checked="form.tags.includes(t)" @change="toggleTag(t)" />{{ t }}
            </label>
          </div>

          <textarea v-model="form.content" placeholder="说说采光、隔音、房东响应速度…" style="margin-top:12px"></textarea>
          <button class="btn btn--primary btn--lg" style="margin-top:12px" @click="submit">发布评价</button>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">口碑榜</div>
          <div class="card__desc">比奇堡评分最高的 5 套房源</div>
          <div style="margin-top:12px">
            <div v-for="(h, i) in topRated" :key="h.id" class="row" style="margin-bottom:8px;cursor:pointer" @click="router.push('/house/' + h.id)">
              <span style="font-size:15px;font-weight:900;color:var(--sea);flex:0 0 22px">{{ i + 1 }}</span>
              <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + h.svg" /></svg>
              <div class="row__main">
                <b>{{ h.title }}</b>
                <span class="stars">★ {{ h.rating }}</span> · <span>{{ h.reviewCount }} 条评价</span>
              </div>
              <div class="row__end">{{ money(h.price) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="sec-head">
      <h2>我发布的评价</h2>
      <span class="sec-head__more">共 {{ mine.length }} 条</span>
    </div>

    <div v-if="mine.length" class="card">
      <div v-for="r in mine" :key="r.id" class="comment">
        <CharAvatar :char="charOf(r.authorId)" :size="38" />
        <div style="flex:1;min-width:0">
          <b>{{ houseById(r.houseId)?.title }}</b>
          <span class="stars" style="margin-left:8px">{{ '★'.repeat(r.rating) }}</span>
          <p>{{ r.content }}</p>
          <div class="badge-row" style="margin-top:6px">
            <span v-for="t in r.tags" :key="t" class="badge badge--purple">{{ t }}</span>
            <span class="tl__time">{{ r.date }}</span>
          </div>
        </div>
        <button class="btn btn--ghost" style="height:28px;padding:0 12px;font-size:11.5px" @click="router.push('/house/' + r.houseId)">查看房源</button>
      </div>
    </div>
    <EmptyState v-else icon="icx-shield" title="你还没有发布过评价" desc="住过或看过的房子都可以留下真实反馈。" />
  </div>
</template>

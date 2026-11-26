<script setup>
/** 帮助中心：搜索 + 分类 FAQ + 联系入口 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import { HELPS } from '@/data/seed.js'

const router = useRouter()
const kw = ref('')
const cat = ref('all')
const openId = ref('HP1')

const cats = computed(() => ['all', ...new Set(HELPS.map((h) => h.cat))])

const list = computed(() => {
  let arr = HELPS
  if (cat.value !== 'all') arr = arr.filter((h) => h.cat === cat.value)
  const k = kw.value.trim()
  if (k) arr = arr.filter((h) => h.q.includes(k) || h.a.includes(k))
  return arr
})

const CONTACTS = [
  { e: '💬', b: '在线客服', d: '9:00 - 21:00，平均响应 2 分钟', ic: 'ic-send' },
  { e: '📞', b: '电话热线', d: '400-6688-2026（24 小时）', ic: 'ic-bell' },
  { e: '🏘️', b: '社区互助', d: '去邻居圈提问，热心住户帮你解答', ic: 'ic-users' }
]
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>帮助中心</h1>
        <p>租房常见问题都在这里，找不到答案可以直接联系客服。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/settings')">前往设置</button>
      </div>
    </div>

    <div class="card">
      <div class="topsearch" style="max-width:none">
        <SvgIcon name="ic-search" cls="topsearch__ic" />
        <input v-model="kw" type="text" placeholder="搜索问题关键词，例如：押金、中介费、信用分" />
      </div>

      <div class="tabs" style="margin-top:14px">
        <button v-for="c in cats" :key="c" :class="{ 'is-on': cat === c }" @click="cat = c">
          {{ c === 'all' ? '全部' : c }}
        </button>
      </div>

      <div style="margin-top:8px">
        <div
          v-for="h in list"
          :key="h.id"
          class="faq"
          :class="{ 'is-open': openId === h.id }"
          @click="openId = openId === h.id ? '' : h.id"
        >
          <b>
            <span>{{ h.q }}</span>
            <SvgIcon name="ic-chevron" cls="ic" />
          </b>
          <p>{{ h.a }}</p>
        </div>
        <p v-if="!list.length" style="font-size:12.5px;color:var(--ink3);padding:20px 0;text-align:center">
          没有找到相关问题，试试其他关键词或联系客服。
        </p>
      </div>
    </div>

    <div class="sec-head">
      <h2>联系我们</h2>
      <span class="sec-head__more">人工服务时间 9:00 - 21:00</span>
    </div>

    <div class="perk" style="margin-top:0">
      <button
        v-for="c in CONTACTS"
        :key="c.b"
        class="perk__item"
        style="text-align:left;cursor:pointer"
        @click="$router.push(c.b === '社区互助' ? '/neighbor' : '/message')"
      >
        <span>{{ c.e }}</span>
        <b>{{ c.b }}</b>
        <i>{{ c.d }}</i>
      </button>
    </div>

    <div class="card" style="margin-top:16px">
      <div class="card__title">租房流程一览</div>
      <div class="timeline" style="margin-top:14px">
        <div class="tl"><b>1 · 找房筛选</b><span>按街区、房型、预算筛选，或从地图直接挑选。</span></div>
        <div class="tl"><b>2 · 预约看房</b><span>提交预约后房东 24 小时内确认，可在线沟通时间。</span></div>
        <div class="tl"><b>3 · 电子签约</b><span>在「我的租约」中完成签约，合同云端留存随时查看。</span></div>
        <div class="tl"><b>4 · 缴纳租金</b><span>账单自动推送，支持贝壳支付、水母钱包与银行卡。</span></div>
        <div class="tl"><b>5 · 评价反馈</b><span>入住后发布评价，帮助他人也提升自己的信用分。</span></div>
      </div>
    </div>
  </div>
</template>

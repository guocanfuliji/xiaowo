<script setup>
/** 邻里社区：按街区聚合的帖子列表 + 发帖 */
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { Api } from '@/api/index.js'
import { charOf, toast } from '@/stores/app.js'
import { DISTRICTS } from '@/data/seed.js'

const router = useRouter()

const district = ref('')
const sort = ref('hot')
const page = ref(1)
const pageSize = 10

const items = ref([])
const total = ref(0)
const loading = ref(false)
const source = ref('db')
const counts = ref({})

const showForm = ref(false)
const form = ref({ district: 'center', title: '', content: '' })
const submitting = ref(false)

const hasMore = computed(() => items.value.length < total.value)

async function load(append = false) {
  loading.value = true
  try {
    const d = await Api.community.posts({
      district: district.value, sort: sort.value, page: page.value, pageSize
    })
    items.value = append ? [...items.value, ...d.items] : d.items
    total.value = d.total
    source.value = d.source
  } catch (e) {
    toast(e.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadOverview() {
  try {
    const d = await Api.community.overview()
    const map = {}
    d.districts.forEach((x) => { map[x.id] = x.posts })
    counts.value = map
  } catch (e) { /* 概览失败不影响列表 */ }
}

function switchDistrict(id) {
  district.value = id
  page.value = 1
  load()
}

function switchSort(s) {
  sort.value = s
  page.value = 1
  load()
}

function more() {
  page.value += 1
  load(true)
}

/** 列表内点赞：先本地翻转，失败再回滚 */
async function toggleLike(p) {
  const before = { liked: p.liked, likeCount: p.likeCount, hotScore: p.hotScore }
  p.liked = !p.liked
  p.likeCount += p.liked ? 1 : -1
  try {
    const d = await Api.community.like(p.id)
    p.liked = d.liked
    p.likeCount = d.likeCount
    p.hotScore = d.hotScore
  } catch (e) {
    Object.assign(p, before)
    toast(e.message || '操作失败')
  }
}

function openForm() {
  showForm.value = true
  form.value.district = district.value || 'center'
}

async function submit() {
  const title = form.value.title.trim()
  const content = form.value.content.trim()
  if (title.length < 4) return toast('标题至少 4 个字')
  if (!content) return toast('写点内容吧')
  submitting.value = true
  try {
    const d = await Api.community.create({
      district: form.value.district,
      title,
      content,
      tags: [DISTRICTS.find((x) => x.id === form.value.district)?.name || ''].filter(Boolean)
    })
    toast('发布成功')
    form.value = { district: form.value.district, title: '', content: '' }
    showForm.value = false
    district.value = d.district
    sort.value = 'new'
    page.value = 1
    await Promise.all([load(), loadOverview()])
  } catch (e) {
    toast(e.message || '发布失败')
  } finally {
    submitting.value = false
  }
}

const districtName = (id) => (DISTRICTS.find((d) => d.id === id) || {}).name || id
const multi = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s)

onMounted(() => {
  load()
  loadOverview()
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>邻里社区</h1>
        <p>
          {{ total }} 条帖子 · 按街区看看邻居们在聊什么
          <span v-if="source === 'redis'" class="badge badge--mint" style="margin-left:6px">Redis 热榜</span>
        </p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--primary" @click="openForm">发帖</button>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div class="tabs">
          <button :class="{ 'is-on': district === '' }" @click="switchDistrict('')">全部街区</button>
          <button
            v-for="d in DISTRICTS"
            :key="d.id"
            :class="{ 'is-on': district === d.id }"
            @click="switchDistrict(d.id)"
          >
            {{ d.name }}<em v-if="counts[d.id]" class="tab__n">{{ counts[d.id] }}</em>
          </button>
        </div>
        <div class="tabs">
          <button :class="{ 'is-on': sort === 'hot' }" @click="switchSort('hot')">最热</button>
          <button :class="{ 'is-on': sort === 'new' }" @click="switchSort('new')">最新</button>
        </div>
      </div>
    </div>

    <!-- 发帖 -->
    <div v-if="showForm" class="card" style="margin-top:14px">
      <div class="card__title">发一条新帖</div>
      <div class="card__desc">选择所属街区，邻居们才看得到</div>
      <div class="form">
        <div class="form__row">
          <div>
            <label>街区</label>
            <select v-model="form.district">
              <option v-for="d in DISTRICTS" :key="d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div>
            <label>标题</label>
            <input v-model="form.title" type="text" maxlength="60" placeholder="4~60 字，说清你要聊什么" />
          </div>
        </div>
        <div style="margin-top:14px">
          <label>正文</label>
          <textarea v-model="form.content" rows="5" maxlength="2000" placeholder="展开说说…"
            style="height:auto;padding:12px 14px;line-height:1.7"></textarea>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">
          <button class="btn btn--ghost" @click="showForm = false">取消</button>
          <button class="btn btn--primary" :disabled="submitting" @click="submit">
            {{ submitting ? '发布中…' : '发布' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="items.length" style="margin-top:14px">
      <div
        v-for="p in items"
        :key="p.id"
        class="card post"
        @click="router.push('/community/' + p.id)"
      >
        <div class="post__head">
          <CharAvatar :char="charOf(p.authorId)" :size="38" />
          <div class="post__who">
            <b>{{ charOf(p.authorId).name }}</b>
            <span>{{ districtName(p.district) }} · {{ p.createdAt }}</span>
          </div>
        </div>

        <h3 class="post__title">{{ p.title }}</h3>
        <p class="post__body">{{ multi(p.content, 90) }}</p>

        <div class="post__foot">
          <button
            class="post__act"
            :class="{ 'is-on': p.liked }"
            @click.stop="toggleLike(p)"
          >
            ♥ {{ p.likeCount }}
          </button>
          <span class="post__act post__act--static">💬 {{ p.commentCount }}</span>
          <span class="post__hot">热度 {{ p.hotScore }}</span>
        </div>
      </div>

      <div v-if="hasMore" style="text-align:center;margin-top:6px">
        <button class="btn btn--ghost" :disabled="loading" @click="more">
          {{ loading ? '加载中…' : '加载更多' }}
        </button>
      </div>
    </div>

    <div v-else-if="loading" class="card" style="margin-top:14px;text-align:center;padding:32px;color:var(--ink3)">
      正在加载帖子…
    </div>

    <EmptyState
      v-else
      icon="icx-chat"
      title="这个街区还没人发帖"
      desc="来做第一个开口的人，聊聊房租、噪音、拼单或者周末活动。"
      style="margin-top:14px"
    >
      <button class="btn btn--primary" @click="openForm">发第一帖</button>
    </EmptyState>
  </div>
</template>

<style scoped>
.post { margin-bottom: 12px; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease; }
.post:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(18, 60, 63, .10); }
.post__head { display: flex; align-items: center; gap: 10px; }
.post__who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.post__who b { font-size: 12.5px; font-weight: 800; }
.post__who span { font-size: 11px; color: var(--ink3); }
.post__title { font-size: 14.5px; font-weight: 900; margin: 10px 0 4px; line-height: 1.45; }
.post__body { font-size: 12.5px; color: var(--ink2); line-height: 1.7; margin: 0; }
.post__foot { display: flex; align-items: center; gap: 16px; margin-top: 10px; font-size: 11.5px; color: var(--ink3); }
.post__act { color: var(--ink3); font-weight: 800; }
.post__act.is-on { color: #e2547a; }
.post__act--static { cursor: default; }
.post__hot { margin-left: auto; font-size: 10.5px; color: var(--ink3); }
.tab__n { font-style: normal; margin-left: 4px; font-size: 10px; opacity: .7; }
</style>

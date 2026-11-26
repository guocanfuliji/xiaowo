<script setup>
/** 消息通知：分类筛选 + 已读 + 删除 + 通知设置 */
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import { state, charOf, markAllRead, markRead, removeMessage, unreadCount, loadMessages, toast } from '@/stores/app.js'

const router = useRouter()
const tab = ref('all')
const loading = ref(true)

// 进页先拉一次：服务端写的通知（出价被超越 / 成交）不在本地快照里
onMounted(async () => {
  await loadMessages()
  loading.value = false
})

const TYPES = [
  { v: 'all', t: '全部' },
  { v: 'house', t: '房源' },
  { v: 'friend', t: '好友' },
  { v: 'pay', t: '账单' },
  { v: 'system', t: '系统' }
]

const ICONS = { house: 'ic-home', friend: 'ic-users', pay: 'ic-wallet', system: 'ic-bell' }

const list = computed(() => {
  if (tab.value === 'all') return state.messages
  return state.messages.filter((m) => m.type === tab.value)
})

const counts = computed(() => ({
  all: state.messages.length,
  house: state.messages.filter((m) => m.type === 'house').length,
  friend: state.messages.filter((m) => m.type === 'friend').length,
  pay: state.messages.filter((m) => m.type === 'pay').length,
  system: state.messages.filter((m) => m.type === 'system').length
}))

function open(m) {
  markRead(m.id)
  if (m.type === 'house') router.push('/')
  else if (m.type === 'pay') router.push('/bill')
  else if (m.type === 'friend') router.push('/neighbor')
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>消息通知</h1>
        <p>未读 {{ unreadCount }} 条 · 共 {{ state.messages.length }} 条消息</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="markAllRead">全部标记已读</button>
        <button class="btn btn--primary" @click="router.push('/settings')">通知设置</button>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:14px">
      <button v-for="t in TYPES" :key="t.v" :class="{ 'is-on': tab === t.v }" @click="tab = t.v">
        {{ t.t }} {{ counts[t.v] }}
      </button>
    </div>

    <div v-if="loading && !list.length" class="card">正在同步消息…</div>
    <div v-else-if="list.length" class="card">
      <div class="msgs">
        <div
          v-for="m in list"
          :key="m.id"
          class="msg"
          :class="{ 'msg--new': !m.read }"
          @click="open(m)"
        >
          <!-- 系统消息固定用小蜗（平台吉祥物）当发信人头像 -->
          <CharAvatar :char="charOf(m.fromId === 'system' ? 'gary' : m.fromId)" :size="44" />
          <div class="msg__body">
            <b>{{ m.title }}</b>
            <span>{{ m.body }}</span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <span class="msg__time">{{ m.time }}</span>
            <button
              class="btn btn--ghost"
              style="height:26px;padding:0 10px;font-size:11px"
              @click.stop="removeMessage(m.id)"
            >删除</button>
          </div>
        </div>
      </div>
    </div>
    <EmptyState v-else icon="icx-bell" title="这里很安静" desc="有新消息时会第一时间通知你。" />
  </div>
</template>

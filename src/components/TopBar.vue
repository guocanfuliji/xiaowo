<script setup>
/** 顶部栏：图标 → 搜索 → 头像 → 个人中心 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from './SvgIcon.vue'
import CharAvatar from './CharAvatar.vue'
import { state, me, switchChar, CHARS } from '@/stores/app.js'
import { loggedIn } from '@/stores/auth.js'

const router = useRouter()
const q = ref('')
const menuOpen = ref(false)

defineProps({ collapsed: { type: Boolean, default: false } })
const emit = defineEmits(['toggle', 'menu'])

function search() {
  const kw = q.value.trim()
  router.push({ name: 'home', query: kw ? { q: kw } : {} })
}

function openProfile() {
  router.push(loggedIn.value ? '/profile' : { path: '/login', query: { redirect: '/profile' } })
}

/** 切换角色是写操作，游客点了先引导去登录 */
function onAvatar() {
  if (!loggedIn.value) {
    router.push({ path: '/login', query: { redirect: '/' } })
    return
  }
  cycleChar()
}

const nextChar = computed(() => {
  const i = CHARS.findIndex((c) => c.id === state.user.charId)
  return CHARS[(i + 1) % CHARS.length]
})

function cycleChar() {
  switchChar(nextChar.value.id)
  menuOpen.value = false
}
</script>

<template>
  <header class="topbar">
    <button class="icon-btn icon-btn--brand" title="收起 / 展开功能栏" @click="emit('toggle')">
      <SvgIcon name="h-pineapple" />
    </button>

    <button class="icon-btn mobile-only" title="打开功能栏" @click="emit('menu')">
      <SvgIcon name="ic-menu" />
    </button>

    <div class="topsearch">
      <SvgIcon name="ic-search" cls="topsearch__ic" />
      <input v-model="q" type="text" placeholder="搜索街区、房屋类型或房东，例如：菠萝屋" @keyup.enter="search" />
      <kbd>/</kbd>
    </div>

    <button class="top-avatar" :title="loggedIn ? '当前身份：' + me.name + '（点击切换）' : '登录 / 注册'" @click="onAvatar">
      <CharAvatar :char="me" :avatar-id="state.user.avatar" bare />
      <i class="online"></i>
    </button>

    <button class="user-chip" @click="openProfile">
      <span class="user-chip__meta">
        <b>{{ loggedIn ? state.user.name : '未登录' }}</b>
        <i v-if="loggedIn">{{ state.user.member }} · 信用 {{ state.user.credit }}</i>
        <i v-else>登录后可收藏 · 发帖 · 出价</i>
      </span>
      <SvgIcon name="ic-chevron" cls="chev" />
    </button>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import IconSprite from './components/IconSprite.vue'
import BgScene from './components/BgScene.vue'
import IntroScreen from './components/IntroScreen.vue'
import SideMenu from './components/SideMenu.vue'
import TopBar from './components/TopBar.vue'
import { ui, state, loadMessages } from './stores/app.js'
import { loggedIn } from './stores/auth.js'

const showIntro = ref(false)
const isMobile = ref(false)
const drawerOpen = ref(false)
let msgTimer = null

function checkWidth() {
  isMobile.value = window.innerWidth < 980
}

function endIntro() {
  ui.introPlayed = true
  showIntro.value = false
  document.body.classList.remove('is-loading')
  document.body.classList.add('is-ready')
}

function replayIntro() {
  showIntro.value = true
  document.body.classList.add('is-loading')
  document.body.classList.remove('is-ready')
}

onMounted(() => {
  checkWidth()
  window.addEventListener('resize', checkWidth)
  // hash 路由下查询串在 hash 内，需同时检查两处
  const skip = location.search.includes('skipintro') || location.hash.includes('skipintro')
  if (!ui.introPlayed && !skip) {
    showIntro.value = true
    document.body.classList.add('is-loading')
  } else {
    document.body.classList.add('is-ready')
  }
  // 快捷键：/ 聚焦搜索，Esc 关闭抽屉
  window.addEventListener('keydown', onKey)
  // 站内通知由服务端产生（出价被超越 / 成交 / 预约），本地不轮询就永远看不到，红点也不会变
  refreshMessages()
  msgTimer = setInterval(refreshMessages, 60 * 1000)
  document.addEventListener('visibilitychange', onVisible)
})

/** 登录后才需要拉消息；后台标签页不拉，切回来补一次 */
function refreshMessages() {
  if (!loggedIn.value || document.hidden) return
  loadMessages()
}

function onVisible() {
  if (!document.hidden) refreshMessages()
}

function onKey(e) {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
    e.preventDefault()
    document.querySelector('.topsearch input')?.focus()
  }
  if (e.key === 'Escape') drawerOpen.value = false
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', checkWidth)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisible)
  if (msgTimer) clearInterval(msgTimer)
})

const sideClosed = computed(() => isMobile.value && !drawerOpen.value)
watch(sideClosed, (v) => {
  document.body.classList.toggle('side-closed', v)
}, { immediate: true })
</script>

<template>
  <IconSprite />
  <BgScene />
  <IntroScreen v-if="showIntro" @done="endIntro" />

  <div class="app">
    <SideMenu
      :collapsed="ui.collapsed && !isMobile"
      @navigate="drawerOpen = false"
      @replay="replayIntro"
    />
    <div v-if="drawerOpen && isMobile" class="scrim" @click="drawerOpen = false"></div>

    <div class="main">
      <TopBar :collapsed="ui.collapsed" @toggle="ui.collapsed = !ui.collapsed" @menu="drawerOpen = !drawerOpen" />

      <main class="view-root">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <footer class="footer">
        <span>小蜗 · 比奇堡租房 &copy; 2026 — 海底最靠谱的找房平台</span>
        <span v-if="loggedIn" class="footer__tip">
          当前身份：{{ state.user.name }} · 收藏 {{ state.favorites.length }} 套 · 待办 {{ state.bookings.filter(b => b.status === 'pending').length }} 项
        </span>
        <span v-else class="footer__tip">
          游客浏览中 · <router-link to="/login">登录</router-link> 后可收藏、预约与出价
        </span>
      </footer>
    </div>
  </div>

  <div id="xw-toast"></div>
</template>

<style>
.page-enter-active { transition: opacity .26s ease, transform .26s ease; }
.page-leave-active { transition: opacity .16s ease, transform .16s ease; }
.page-enter-from { opacity: 0; transform: translateY(12px); }
.page-leave-to { opacity: 0; transform: translateY(-6px); }

/* 页脚游客提示里的登录入口：跟随主题色，别变成浏览器默认蓝 */
.footer__tip a { color: var(--sea); text-decoration: underline; text-underline-offset: 2px; }
.footer__tip a:hover { opacity: .78; }
</style>

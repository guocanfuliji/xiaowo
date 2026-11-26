<script setup>
/** 左侧功能栏：分组 + 彩色图标 + 徽标 */
import { computed } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { state, unreadCount, pendingBookings, unpaidBills, myHouses, pendingReceivedIntents, liveAuctions } from '@/stores/app.js'
import { loggedIn, logout } from '@/stores/auth.js'

const props = defineProps({
  collapsed: { type: Boolean, default: false }
})
const emit = defineEmits(['navigate', 'replay'])

const groups = computed(() => [
  {
    label: '找 房',
    items: [
      { to: '/', icon: 'icx-home', text: '首页 · 找房', exact: true },
      { to: '/sale', icon: 'icx-tag', text: '买房专区' },
      { to: '/auction', icon: 'icx-gavel', text: '法拍房', tag: liveAuctions.value.length || null },
      { to: '/map', icon: 'icx-map', text: '比奇堡地图' },
      { to: '/fav', icon: 'icx-heart', text: '我的收藏', tag: state.favorites.length || null },
      { to: '/compare', icon: 'icx-compare', text: '房源对比', tag: state.compare.length || null }
    ]
  },
  {
    label: '我 是 房 东',
    items: [
      { to: '/mine', icon: 'icx-key', text: '我的房源', tag: myHouses.value.length || null },
      { to: '/publish', icon: 'icx-plus', text: '发布房源' },
      { to: '/decorate', icon: 'icx-brush', text: '房屋装修' },
      { to: '/dashboard', icon: 'icx-chart', text: '房东看板' }
    ]
  },
  {
    label: '租 住 服 务',
    items: [
      { to: '/booking', icon: 'icx-calendar', text: '预约看房', dot: pendingBookings.value.length > 0 },
      { to: '/lease', icon: 'icx-doc', text: '我的租约' },
      { to: '/sale-orders', icon: 'icx-deal', text: '购房意向', tag: pendingReceivedIntents.value.length || null },
      { to: '/bill', icon: 'icx-wallet', text: '账单与支付', dot: unpaidBills.value.length > 0 },
      { to: '/review', icon: 'icx-shield', text: '评价与信用' }
    ]
  },
  {
    label: '社 区',
    items: [
      { to: '/community', icon: 'icx-chat', text: '邻里社区' },
      { to: '/message', icon: 'icx-bell', text: '消息通知', dot: unreadCount.value > 0 },
      { to: '/neighbor', icon: 'icx-users', text: '邻居与好友' }
    ]
  }
])
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <router-link to="/" class="brand" @click="emit('navigate')">
      <span class="brand__ico"><SvgIcon name="h-pineapple" /></span>
      <span class="brand__txt">
        <b>小蜗</b>
        <i>BIKINI BOTTOM</i>
      </span>
    </router-link>

    <nav class="menu">
      <div v-for="g in groups" :key="g.label" class="menu__group">
        <div class="menu__label">{{ g.label }}</div>
        <router-link
          v-for="it in g.items"
          :key="it.to"
          :to="it.to"
          class="menu__item"
          active-class="is-active"
          @click="emit('navigate')"
        >
          <SvgIcon :name="it.icon" />
          <span>{{ it.text }}</span>
          <em v-if="it.tag" class="tag">{{ it.tag }}</em>
          <em v-else-if="it.dot" class="tag tag--dot"></em>
        </router-link>
      </div>

      <div class="menu__group">
        <div class="menu__label">其 他</div>
        <router-link v-if="!loggedIn" to="/login" class="menu__item menu__item--sub" active-class="is-active" @click="emit('navigate')">
          <SvgIcon name="icx-key" /><span>登录 / 注册</span>
        </router-link>
        <router-link to="/settings" class="menu__item menu__item--sub" active-class="is-active" @click="emit('navigate')">
          <SvgIcon name="icx-settings" /><span>设置</span>
        </router-link>
        <router-link to="/help" class="menu__item menu__item--sub" active-class="is-active" @click="emit('navigate')">
          <SvgIcon name="icx-help" /><span>帮助中心</span>
        </router-link>
        <button v-if="loggedIn" class="menu__item menu__item--sub" @click="logout">
          <SvgIcon name="icx-shield" /><span>退出登录</span>
        </button>
        <button class="menu__item menu__item--sub" @click="emit('replay')">
          <SvgIcon name="icx-play" /><span>重播开场动画</span>
        </button>
      </div>
    </nav>

    <div class="sidebar__foot">
      <div class="promo" v-show="!collapsed">
        <b>信用分 {{ state.user.credit }} / 100</b>
        <p>按时交租可提升信用，享受押金减免与优先看房。</p>
        <button class="promo__btn" @click="$router.push('/publish')">免费发布房源</button>
      </div>
    </div>
  </aside>
</template>

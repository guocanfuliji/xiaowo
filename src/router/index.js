import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue'), meta: { title: '首页 · 找房' } },
  { path: '/map', name: 'map', component: () => import('@/views/MapView.vue'), meta: { title: '比奇堡地图' } },
  { path: '/sale', name: 'sale', component: () => import('@/views/SaleView.vue'), meta: { title: '买房专区' } },
  { path: '/sale-orders', name: 'saleOrders', component: () => import('@/views/SaleOrdersView.vue'), meta: { title: '购房意向' } },
  { path: '/auction', name: 'auction', component: () => import('@/views/AuctionView.vue'), meta: { title: '法拍房' } },
  { path: '/auction/:id', name: 'auctionDetail', component: () => import('@/views/AuctionDetailView.vue'), meta: { title: '拍卖详情' } },
  { path: '/house/:id', name: 'house', component: () => import('@/views/HouseDetailView.vue'), meta: { title: '房源详情' } },
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: '登录 / 注册' } },
  { path: '/fav', name: 'fav', component: () => import('@/views/FavView.vue'), meta: { title: '我的收藏' } },
  { path: '/compare', name: 'compare', component: () => import('@/views/CompareView.vue'), meta: { title: '房源对比' } },
  { path: '/mine', name: 'mine', component: () => import('@/views/MineView.vue'), meta: { title: '我的房源' } },
  { path: '/publish', name: 'publish', component: () => import('@/views/PublishView.vue'), meta: { title: '发布房源' } },
  { path: '/decorate', name: 'decorate', component: () => import('@/views/DecorateView.vue'), meta: { title: '房屋装修' } },
  { path: '/booking', name: 'booking', component: () => import('@/views/BookingView.vue'), meta: { title: '预约看房' } },
  { path: '/lease', name: 'lease', component: () => import('@/views/LeaseView.vue'), meta: { title: '我的租约' } },
  { path: '/bill', name: 'bill', component: () => import('@/views/BillView.vue'), meta: { title: '账单与支付' } },
  { path: '/review', name: 'review', component: () => import('@/views/ReviewView.vue'), meta: { title: '评价与信用' } },
  { path: '/community', name: 'community', component: () => import('@/views/CommunityView.vue'), meta: { title: '邻里社区' } },
  { path: '/community/:id', name: 'post', component: () => import('@/views/PostDetailView.vue'), meta: { title: '帖子详情' } },
  { path: '/message', name: 'message', component: () => import('@/views/MessageView.vue'), meta: { title: '消息通知' } },
  { path: '/neighbor', name: 'neighbor', component: () => import('@/views/NeighborView.vue'), meta: { title: '邻居与好友' } },
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: '房东看板' } },
  { path: '/profile', name: 'profile', component: () => import('@/views/ProfileView.vue'), meta: { title: '个人中心' } },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue'), meta: { title: '设置' } },
  { path: '/help', name: 'help', component: () => import('@/views/HelpView.vue'), meta: { title: '帮助中心' } },
  { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('@/views/NotFoundView.vue'), meta: { title: '页面不存在' } }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' })
})

router.afterEach((to) => {
  document.title = (to.meta.title ? to.meta.title + ' · ' : '') + '小蜗 · 比奇堡租房'
})

export default router

/**
 * 全局状态：业务数据 + UI 偏好
 * 数据源：后端 API（MySQL / SQLite），localStorage 仅作离线缓存与 UI 偏好
 * 写操作采用「本地乐观更新 + 后台同步」，页面层保持同步调用体验
 */
import { reactive, computed, watch } from 'vue'
import { Api } from '@/api/index.js'
import { net, setToken } from '@/api/client.js'
import {
  CHARS, charOf, AVATARS, avatarById, avatarOfChar, resolveAvatar,
  HOUSES, LEASES, BILLS, BOOKINGS, MESSAGES,
  FRIENDS, REVIEWS, FEEDS, DECOR_THEMES, SALE_HOUSES, SALE_INTENTS
} from '@/data/seed.js'

const STORAGE_KEY = 'xiaowo-state-v2'
const UI_KEY = 'xiaowo-ui-v2'
const VERSION = 2

const safe = {
  get(k) { try { return localStorage.getItem(k) } catch (e) { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k) } catch (e) { /* ignore */ } }
}

const clone = (v) => JSON.parse(JSON.stringify(v))

function defaultState() {
  return {
    version: VERSION,
    user: {
      id: 'U1001',
      charId: 'gary',
      avatar: '',
      name: '小蜗',
      phone: '138****6688',
      email: 'gary@bikini.bottom',
      credit: 92,
      member: '珊瑚会员',
      joinedAt: '2024-05-01',
      verified: true
    },
    houses: [...clone(HOUSES), ...clone(SALE_HOUSES)],
    leases: clone(LEASES),
    bills: clone(BILLS),
    bookings: clone(BOOKINGS),
    messages: clone(MESSAGES),
    friends: clone(FRIENDS),
    reviews: clone(REVIEWS),
    feeds: clone(FEEDS),
    saleIntents: clone(SALE_INTENTS),
    auctions: [],
    favorites: ['H1003', 'H1006', 'H1009'],
    compare: ['H1001', 'H1003'],
    decor: {
      theme: 0,
      placed: [
        { uid: 'd1', id: 'sofa', gx: 0, gy: 0 },
        { uid: 'd2', id: 'table', gx: 2, gy: 1 },
        { uid: 'd3', id: 'lamp', gx: 4, gy: 0 },
        { uid: 'd4', id: 'plant', gx: 5, gy: 0 }
      ]
    }
  }
}

function defaultUI() {
  return { collapsed: false, introPlayed: false, density: 'comfortable', notify: true, darkChip: false }
}

function load() {
  const raw = safe.get(STORAGE_KEY)
  if (!raw) return defaultState()
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== VERSION) return defaultState()
    return { ...defaultState(), ...parsed }
  } catch (e) { return defaultState() }
}

function loadUI() {
  const raw = safe.get(UI_KEY)
  if (!raw) return defaultUI()
  try { return { ...defaultUI(), ...JSON.parse(raw) } } catch (e) { return defaultUI() }
}

export const state = reactive(load())
export const ui = reactive(loadUI())
export { net }

/** 服务端聚合统计（房东看板用），不进 localStorage */
export const stats = reactive({
  loaded: false,
  houses: 0,
  rented: 0,
  rate: 0,
  income: 0,
  views: 0,
  favorites: 0,
  monthly: [],
  topHouses: []
})

export async function loadStats() {
  try {
    const d = await Api.stats()
    Object.assign(stats, d, { loaded: true })
    return d
  } catch (e) {
    stats.loaded = false
    return null
  }
}

/* ---------------- 持久化（离线缓存） ---------------- */
let saveTimer = null
watch(state, () => {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => safe.set(STORAGE_KEY, JSON.stringify(state)), 300)
}, { deep: true })

watch(ui, () => safe.set(UI_KEY, JSON.stringify(ui)), { deep: true })

/* ---------------- 从后端载入全量数据 ---------------- */
export async function bootstrap() {
  try {
    const data = await Api.bootstrap()
    if (data.user) state.user = data.user
    if (Array.isArray(data.houses)) state.houses = data.houses
    if (Array.isArray(data.leases)) state.leases = data.leases
    if (Array.isArray(data.bills)) state.bills = data.bills
    if (Array.isArray(data.bookings)) state.bookings = data.bookings
    if (Array.isArray(data.messages)) state.messages = data.messages
    if (Array.isArray(data.friends)) state.friends = data.friends
    if (Array.isArray(data.reviews)) state.reviews = data.reviews
    if (Array.isArray(data.feeds)) state.feeds = data.feeds
    if (Array.isArray(data.favorites)) state.favorites = data.favorites
    if (Array.isArray(data.saleIntents)) state.saleIntents = data.saleIntents
    if (data.decor && Array.isArray(data.decor.placed)) state.decor = data.decor

    net.online = true
    net.checked = true
    net.dialect = data.meta?.dialect || ''
    net.connection = data.meta?.dialect === 'mysql' ? 'MySQL' : 'SQLite'
    net.error = ''
    // 拍卖不在 bootstrap 快照里：它有「到点即结束」的时效性，单独拉一次更准
    loadAuctions()
    return true
  } catch (e) {
    net.online = false
    net.checked = true
    net.error = e.message
    return false
  }
}

/* ---------------- 派生数据 ---------------- */
export const me = computed(() => charOf(state.user.charId))
/** 当前账号要渲染的那张脸（自己选的头像 → 角色默认 → null 回落 svg） */
export const myAvatar = computed(() => resolveAvatar(state.user.avatar, state.user.charId))
export const houseById = (id) => state.houses.find((h) => h.id === id) || null
export const availableHouses = computed(() => state.houses.filter((h) => h.status === 'available'))
export const myHouses = computed(() => state.houses.filter((h) => h.ownerId === state.user.charId))
export const favHouses = computed(() => state.favorites.map(houseById).filter(Boolean))
export const compareHouses = computed(() => state.compare.map(houseById).filter(Boolean))
export const unreadCount = computed(() => state.messages.filter((m) => !m.read).length)
export const pendingBookings = computed(() => state.bookings.filter((b) => b.status === 'pending'))
export const unpaidBills = computed(() => state.bills.filter((b) => b.status !== 'paid'))
export const activeLease = computed(() => state.leases.find((l) => l.status === 'active') || null)
export const totalUnpaid = computed(() => unpaidBills.value.reduce((s, b) => s + Number(b.amount), 0))
export const monthlyRent = computed(() => (activeLease.value ? activeLease.value.rent : 0))
export const decorTheme = computed(() => DECOR_THEMES[state.decor.theme || 0] || DECOR_THEMES[0])

/* 售房：挂牌房源与意向（买家 / 卖家两个视角） */
export const saleHouses = computed(() => state.houses.filter((h) => h.trade === 'sale'))
export const mySaleIntents = computed(() => state.saleIntents.filter((i) => i.buyerId === state.user.charId))
export const receivedSaleIntents = computed(() => state.saleIntents.filter((i) => i.sellerId === state.user.charId))
export const pendingReceivedIntents = computed(() => receivedSaleIntents.value.filter((i) => i.status === 'pending'))

/* 法拍房：列表 / 我在领先的 / 我挂拍的 */
export const liveAuctions = computed(() => state.auctions.filter((a) => a.status === 'live'))
export const leadingAuctions = computed(() => liveAuctions.value.filter((a) => a.currentBidder === state.user.charId))
export const myAuctions = computed(() => state.auctions.filter((a) => a.sellerId === state.user.charId))

/** 拍卖数据单独拉取：它有时效性（到点即结束），不放进 bootstrap 的离线快照里 */
export async function loadAuctions(q = {}) {
  try {
    const d = await Api.auctions.list(q)
    const scoped = q.scope || q.status || q.district
    if (!scoped) state.auctions = d.items
    return d
  } catch (e) {
    return null
  }
}

/** 消息单独拉取：站内通知由服务端写入（出价被超越、拍卖成交），bootstrap 快照里那份只代表启动那一刻 */
export async function loadMessages(q = {}) {
  try {
    const list = await Api.messages.list(q)
    if (Array.isArray(list) && !q.type) state.messages = list
    return list
  } catch (e) {
    return null
  }
}

/** 出价：服务端是唯一裁判，成功后就地用返回结果替换，不做乐观更新（价格不能猜） */
export async function submitBid(auctionId, price) {
  const out = await Api.auctions.bid(auctionId, price)
  const idx = state.auctions.findIndex((a) => a.id === auctionId)
  if (idx >= 0) state.auctions.splice(idx, 1, { ...state.auctions[idx], ...out.auction, bids: undefined })
  // 出价成功服务端会写一条站内消息，顺手把消息列表拉新，侧栏红点跟着亮
  loadMessages()
  return out
}

/* ---------------- 工具 ---------------- */
export const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 8)
export const money = (n) =>
  '¥' + Number(n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function toast(msg, type = 'ok') {
  const host = document.getElementById('xw-toast')
  if (!host) return
  const el = document.createElement('div')
  el.className = 'xw-toast xw-toast--' + type
  el.textContent = msg
  host.appendChild(el)
  setTimeout(() => el.classList.add('is-in'), 10)
  setTimeout(() => {
    el.classList.remove('is-in')
    setTimeout(() => el.remove(), 320)
  }, 2200)
}

/** 乐观更新后的后台同步：失败只提示，不阻塞交互 */
function push(promise, label = '操作') {
  if (!net.online) return
  Promise.resolve(promise).catch((e) => {
    const needLogin = /请先登录/.test(e.message || '')
    toast(needLogin ? `${label}需要先登录，点右上角「未登录」即可登录` : `${label}同步失败：${e.message}`, 'warn')
    console.warn('[sync]', label, e.message)
  })
}

/* ---------------- 收藏 / 对比 ---------------- */
export function toggleFav(id) {
  const i = state.favorites.indexOf(id)
  if (i >= 0) {
    state.favorites.splice(i, 1)
    toast('已取消收藏')
    push(Api.favorites.remove(id), '取消收藏')
  } else {
    if (state.favorites.length >= 20) return toast('收藏夹最多 20 套', 'warn')
    state.favorites.push(id)
    toast('已加入收藏')
    push(Api.favorites.add(id), '收藏')
  }
  return state.favorites.includes(id)
}
export function isFav(id) { return state.favorites.includes(id) }

/** 清空收藏（逐条落库） */
export function clearFavorites() {
  const ids = [...state.favorites]
  if (!ids.length) return
  state.favorites.splice(0, state.favorites.length)
  ids.forEach((id) => push(Api.favorites.remove(id), '清空收藏'))
  toast('已清空收藏夹', 'warn')
}

export function toggleCompare(id) {
  const i = state.compare.indexOf(id)
  if (i >= 0) state.compare.splice(i, 1)
  else {
    if (state.compare.length >= 3) return toast('最多同时对比 3 套房源', 'warn')
    state.compare.push(id)
  }
  toast(state.compare.includes(id) ? '已加入对比' : '已移出对比')
}
export function isCompare(id) { return state.compare.includes(id) }

/* ---------------- 房源 ---------------- */
export function publishHouse(payload) {
  const trade = payload.trade === 'sale' ? 'sale' : 'rent'
  const id = (trade === 'sale' ? 'HS' : 'H') + (1000 + state.houses.length + Math.floor(Math.random() * 900))
  const house = {
    id,
    title: payload.title,
    type: payload.type,
    trade,
    svg: payload.svg,
    district: payload.district,
    address: payload.address,
    price: Number(payload.price),
    deposit: trade === 'sale' ? 0 : Number(payload.deposit),
    area: Number(payload.area),
    rooms: Number(payload.rooms),
    halls: Number(payload.halls),
    baths: Number(payload.baths),
    floor: Number(payload.floor),
    totalFloor: Number(payload.totalFloor) || Number(payload.floor),
    orientation: payload.orientation,
    fit: payload.fit,
    tags: payload.tags || [],
    facilities: payload.facilities || [],
    ownerId: state.user.charId,
    status: 'available',
    availableFrom: payload.availableFrom || '',
    minLease: trade === 'sale' ? 0 : (Number(payload.minLease) || 12),
    views: 0,
    rating: 5,
    reviewCount: 0,
    featured: false,
    x: 20 + Math.round(Math.random() * 60),
    y: 20 + Math.round(Math.random() * 60),
    desc: payload.desc
  }
  state.houses.unshift(house)
  push(Api.houses.create(house), '发布房源')
  pushMessage('system', '房源发布成功', `你的${trade === 'sale' ? '出售' : '出租'}房源「${house.title}」已通过审核并上架。`)
  toast(trade === 'sale' ? '房源已挂牌出售！' : '房源发布成功！')
  return house
}

export function updateHouseStatus(id, status) {
  const h = houseById(id)
  if (!h) return
  h.status = status
  push(Api.houses.update(id, { status }), '房源状态')
  const txt = { available: '已上架', rented: '已标记为已租出', pending: '已下架待审核' }[status] || '已更新'
  toast(`「${h.title}」${txt}`)
}

export function removeHouse(id) {
  const i = state.houses.findIndex((h) => h.id === id)
  if (i < 0) return
  const title = state.houses[i].title
  state.houses.splice(i, 1)
  const f = state.favorites.indexOf(id)
  if (f >= 0) state.favorites.splice(f, 1)
  push(Api.houses.remove(id), '删除房源')
  toast(`已删除房源「${title}」`, 'warn')
}

export function visitHouse(id) {
  const h = houseById(id)
  if (!h) return
  h.views += 1
  push(Api.houses.view(id), '浏览量')
}

/* ---------------- 售房 · 购房意向 ---------------- */
const stamp = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
export const INTENT_TEXT = { pending: '待确认', accepted: '已接受', rejected: '已拒绝', canceled: '已撤回' }

export function submitSaleIntent({ houseId, price, message }) {
  const h = houseById(houseId)
  if (!h) return toast('房源不存在', 'warn')
  if (h.ownerId === state.user.charId) return toast('不能购买自己名下的房源', 'warn')
  if (h.status !== 'available') return toast('该房源当前不可售', 'warn')
  const amount = Math.round(Number(price) * 100) / 100
  if (!(amount > 0)) return toast('请填写出价金额', 'warn')
  if (state.saleIntents.some((i) => i.houseId === houseId && i.buyerId === state.user.charId && i.status === 'pending')) {
    return toast('你已经提交过意向，等房东回应吧', 'warn')
  }

  const temp = {
    id: uid('SI'),
    houseId,
    buyerId: state.user.charId,
    sellerId: h.ownerId,
    price: amount,
    message: message || '',
    status: 'pending',
    createdAt: stamp()
  }
  state.saleIntents.unshift(temp)

  if (net.online) {
    Api.sale.submit(houseId, { price: amount, message: temp.message })
      .then((d) => {
        // 用服务端 id 覆盖本地临时 id，否则后续接受/撤回对不上库里的那一行
        const i = state.saleIntents.findIndex((x) => x.id === temp.id)
        if (i >= 0) state.saleIntents.splice(i, 1, { ...temp, ...d })
      })
      .catch((e) => {
        const i = state.saleIntents.findIndex((x) => x.id === temp.id)
        if (i >= 0) state.saleIntents.splice(i, 1)
        toast('提交失败：' + e.message, 'warn')
      })
  }

  pushMessage('system', '购房意向已提交', `已向 ${charOf(h.ownerId).name} 提交「${h.title}」的购房意向，出价 ${money(amount)}。`)
  toast('购房意向已提交，等房东确认')
  return temp
}

/** 卖家确认成交：意向置 accepted、同房其它意向关闭、房源置 sold —— 与后端一个事务里的动作保持一致 */
export function acceptSaleIntent(id) {
  const it = state.saleIntents.find((x) => x.id === id)
  if (!it) return
  if (it.status !== 'pending') return toast('该意向已处理过', 'warn')

  const snapshot = state.saleIntents.map((x) => ({ id: x.id, status: x.status }))
  const h = houseById(it.houseId)
  const prevHouse = h?.status

  it.status = 'accepted'
  state.saleIntents.forEach((x) => {
    if (x.houseId === it.houseId && x.id !== it.id && x.status === 'pending') x.status = 'rejected'
  })
  if (h) h.status = 'sold'

  if (net.online) {
    Api.sale.accept(id).catch((e) => {
      snapshot.forEach((s) => {
        const t = state.saleIntents.find((x) => x.id === s.id)
        if (t) t.status = s.status
      })
      if (h && prevHouse) h.status = prevHouse
      toast('确认失败：' + e.message, 'warn')
    })
  }

  pushMessage('pay', '已确认购房意向', `「${h?.title || ''}」已接受 ${charOf(it.buyerId).name} 的意向，成交价 ${money(it.price)}。`)
  toast('已接受意向，房源标记为已售')
}

export function rejectSaleIntent(id) {
  const it = state.saleIntents.find((x) => x.id === id)
  if (!it || it.status !== 'pending') return
  it.status = 'rejected'
  push(Api.sale.reject(id), '拒绝意向')
  toast('已拒绝该意向', 'warn')
}

export function cancelSaleIntent(id) {
  const it = state.saleIntents.find((x) => x.id === id)
  if (!it || it.status !== 'pending') return
  it.status = 'canceled'
  push(Api.sale.cancel(id), '撤回意向')
  toast('已撤回购房意向')
}

/* ---------------- 预约 ---------------- */
export function addBooking({ houseId, date, time, note }) {
  const dup = state.bookings.some((b) => b.houseId === houseId && b.date === date && b.status === 'pending')
  if (dup) return toast('该房源该时段已预约过了', 'warn')
  const h = houseById(houseId)
  const b = {
    id: uid('K'),
    houseId,
    date,
    time,
    agentId: h ? h.ownerId : 'spongebob',
    status: 'pending',
    note: note || '',
    createdAt: new Date().toISOString().slice(0, 10)
  }
  state.bookings.unshift(b)
  if (net.online) {
    Api.bookings.create(b).catch((e) => {
      const i = state.bookings.findIndex((x) => x.id === b.id)
      if (i >= 0) state.bookings.splice(i, 1)
      toast('预约失败：' + e.message, 'warn')
    })
  }
  pushMessage('house', '预约提交成功', `已向 ${charOf(b.agentId).name} 提交 ${date} ${time} 的看房预约，等待确认。`)
  toast('预约提交成功，等待房东确认')
  return b
}

export function setBookingStatus(id, status) {
  const b = state.bookings.find((x) => x.id === id)
  if (!b) return
  b.status = status
  push(Api.bookings.update(id, status), '预约状态')
  toast(status === 'done' ? '已完成看房' : status === 'canceled' ? '已取消预约' : '预约已恢复待确认')
}

/* ---------------- 租约 ---------------- */
export function signLease(leaseId) {
  const l = state.leases.find((x) => x.id === leaseId)
  if (!l) return
  l.status = 'active'
  l.signedAt = new Date().toISOString().slice(0, 10)
  push(Api.leases.sign(leaseId), '签约')
  pushMessage('system', '租约已生效', `「${houseById(l.houseId)?.title || ''}」的租约已完成电子签约。`)
  toast('电子签约完成，租约已生效')
}

export function terminateLease(leaseId) {
  const l = state.leases.find((x) => x.id === leaseId)
  if (!l) return
  l.status = 'ended'
  const h = houseById(l.houseId)
  if (h) h.status = 'available'
  push(Api.leases.terminate(leaseId), '退租')
  toast('已提交退租申请', 'warn')
}

/* ---------------- 账单 ---------------- */
export function payBill(id, method = '贝壳支付') {
  const b = state.bills.find((x) => x.id === id)
  if (!b || b.status === 'paid') return
  b.status = 'paid'
  b.paidAt = new Date().toISOString().slice(0, 10)
  b.method = method
  push(Api.bills.pay(id, method), '账单支付')
  pushMessage('pay', '支付成功', `${b.type}（${b.period}）${money(b.amount)} 已通过${method}支付。`)
  toast(`支付成功 ${money(b.amount)}`)
}

export function addBill(payload) {
  const b = { id: uid('B'), status: 'unpaid', ...payload }
  state.bills.unshift(b)
  push(Api.bills.create(b), '新增账单')
  toast('已新增账单')
  return b
}

/* ---------------- 评价 ---------------- */
export function addReview({ houseId, rating, content, tags }) {
  const r = {
    id: uid('R'),
    houseId,
    authorId: state.user.charId,
    rating: Number(rating),
    content,
    tags: tags || [],
    date: new Date().toISOString().slice(0, 10)
  }
  state.reviews.unshift(r)
  const h = houseById(houseId)
  if (h) {
    const list = state.reviews.filter((x) => x.houseId === houseId)
    h.reviewCount = list.length
    h.rating = Number((list.reduce((s, x) => s + x.rating, 0) / list.length).toFixed(1))
  }
  push(Api.reviews.create(r), '发布评价')
  toast('评价已发布，感谢反馈！')
  return r
}

export function likeFeed(id) {
  const f = state.feeds.find((x) => x.id === id)
  if (!f) return
  f.likes += 1
  push(Api.feeds.like(id), '点赞')
}

/* ---------------- 消息 ---------------- */
export function pushMessage(type, title, body) {
  state.messages.unshift({
    id: uid('M'),
    type,
    fromId: type === 'system' ? 'system' : state.user.charId,
    title,
    body,
    time: '刚刚',
    read: false
  })
}

export function markAllRead() {
  state.messages.forEach((m) => { m.read = true })
  push(Api.messages.readAll(), '标记已读')
  toast('全部消息已标记为已读')
}

export function markRead(id) {
  const m = state.messages.find((x) => x.id === id)
  if (m && !m.read) {
    m.read = true
    push(Api.messages.read(id), '标记已读')
  }
}

export function removeMessage(id) {
  const i = state.messages.findIndex((m) => m.id === id)
  if (i >= 0) {
    state.messages.splice(i, 1)
    push(Api.messages.remove(id), '删除消息')
  }
}

/* ---------------- 好友 ---------------- */
export function toggleFriendRelation(id) {
  const f = state.friends.find((x) => x.id === id)
  if (!f) return
  f.relation = f.relation === '好友' ? '邻居' : '好友'
  push(Api.friends.update(id, { relation: f.relation }), '好友关系')
  toast(`${charOf(f.charId).name} 已设为${f.relation}`)
}

export function removeFriend(id) {
  const i = state.friends.findIndex((f) => f.id === id)
  if (i >= 0) {
    const name = charOf(state.friends[i].charId).name
    state.friends.splice(i, 1)
    push(Api.friends.remove(id), '移除好友')
    toast(`已移除 ${name}`, 'warn')
  }
}

/* ---------------- 装修（400ms 节流落库） ---------------- */
let decorTimer = null
function pushDecor() {
  if (!net.online) return
  clearTimeout(decorTimer)
  decorTimer = setTimeout(() => {
    Api.decor.save({ theme: state.decor.theme, placed: state.decor.placed })
      .catch((e) => toast('装修方案同步失败：' + e.message, 'warn'))
  }, 400)
}

export function placeFurniture(fid, gx, gy) {
  state.decor.placed.push({ uid: uid('d'), id: fid, gx, gy })
  pushDecor()
}
export function moveFurniture(uid2, gx, gy) {
  const f = state.decor.placed.find((x) => x.uid === uid2)
  if (f) { f.gx = gx; f.gy = gy; pushDecor() }
}
export function removeFurniture(uid2) {
  const i = state.decor.placed.findIndex((x) => x.uid === uid2)
  if (i >= 0) { state.decor.placed.splice(i, 1); pushDecor() }
}
export function setDecorTheme(i) { state.decor.theme = i; pushDecor() }

export function clearDecor() {
  state.decor.placed.splice(0, state.decor.placed.length)
  pushDecor()
}

/* ---------------- 用户 ---------------- */
export function switchChar(charId) {
  state.user.charId = charId
  const c = charOf(charId)
  state.user.name = c.name
  // 换身份时把脸也换成新角色的默认图，否则会出现「名字是派大星、脸是海绵宝宝」
  const av = avatarOfChar(charId)
  state.user.avatar = av ? av.id : ''
  push(Api.user.update({ charId, name: c.name, avatar: state.user.avatar }), '切换身份')
  toast(`已切换身份：${c.name}`)
}
/** 只换脸，不动昵称与身份 */
export function setAvatar(avatarId) {
  const av = avatarById(avatarId)
  if (!av) return
  state.user.avatar = av.id
  push(Api.user.update({ avatar: av.id }), '更换头像')
  toast(`头像已更换：${av.label}`)
}
export function updateUser(patch) {
  Object.assign(state.user, patch)
  push(Api.user.update(patch), '保存资料')
  toast('资料已保存')
}

/* ---------------- 重置 ---------------- */
export function resetAll() {
  safe.del(STORAGE_KEY)
  safe.del(UI_KEY)
  const d = defaultState()
  Object.keys(d).forEach((k) => { state[k] = d[k] })
  push(Api.reset(), '重置数据')
  // 后端重置会清空 sessions，本地 token 留着只会一直 401，这里一并清掉
  setToken('')
  toast('已恢复全部初始数据，请重新登录', 'warn')
}

/* ---------------- 重新拉取（设置页「同步」用） ---------------- */
export async function reloadFromServer() {
  const okFlag = await bootstrap()
  toast(okFlag ? '已与服务器同步' : '无法连接服务器，当前为离线数据', okFlag ? 'ok' : 'warn')
  return okFlag
}

export { CHARS, charOf, AVATARS, DECOR_THEMES }

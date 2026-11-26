import { api } from './client.js'

const qs = (obj = {}) => {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => { if (v !== '' && v !== undefined && v !== null) p.set(k, v) })
  const s = p.toString()
  return s ? '?' + s : ''
}

export const Api = {
  bootstrap: () => api.get('/bootstrap'),
  health: () => api.get('/health'),

  /** 注册 / 登录 / 登出 / 当前账号 */
  auth: {
    register: (p) => api.post('/auth/register', p),
    login: (p) => api.post('/auth/login', p),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
    password: (p) => api.post('/auth/password', p)
  },

  houses: {
    list: (q) => api.get('/houses' + qs(q)),
    one: (id) => api.get('/houses/' + id),
    create: (h) => api.post('/houses', h),
    update: (id, patch) => api.patch('/houses/' + id, patch),
    remove: (id) => api.del('/houses/' + id),
    view: (id) => api.post('/houses/' + id + '/view')
  },

  favorites: {    list: () => api.get('/favorites'),
    add: (houseId) => api.put('/favorites/' + houseId),
    remove: (houseId) => api.del('/favorites/' + houseId),
    clear: () => api.del('/favorites')
  },

  leases: {
    list: (q) => api.get('/leases' + qs(q)),
    sign: (id) => api.post('/leases/' + id + '/sign'),
    terminate: (id) => api.post('/leases/' + id + '/terminate')
  },

  bills: {
    list: (q) => api.get('/bills' + qs(q)),
    create: (b) => api.post('/bills', b),
    pay: (id, method) => api.post('/bills/' + id + '/pay', { method })
  },

  bookings: {
    list: () => api.get('/bookings'),
    create: (b) => api.post('/bookings', b),
    update: (id, status) => api.patch('/bookings/' + id, { status })
  },

  messages: {
    list: (q) => api.get('/messages' + qs(q)),
    read: (id) => api.patch('/messages/' + id + '/read'),
    readAll: () => api.post('/messages/read-all'),
    remove: (id) => api.del('/messages/' + id)
  },

  friends: {
    list: () => api.get('/friends'),
    update: (id, patch) => api.patch('/friends/' + id, patch),
    remove: (id) => api.del('/friends/' + id)
  },

  reviews: {
    list: (q) => api.get('/reviews' + qs(q)),
    create: (r) => api.post('/reviews', r)
  },

  feeds: {
    list: () => api.get('/feeds'),
    like: (id) => api.post('/feeds/' + id + '/like')
  },

  decor: {
    get: () => api.get('/decor'),
    save: (decor) => api.put('/decor', decor)
  },

  user: {
    get: () => api.get('/user'),
    update: (patch) => api.patch('/user', patch)
  },

  community: {
    posts: (q) => api.get('/community/posts' + qs(q)),
    post: (id) => api.get(`/community/posts/${id}`),
    create: (p) => api.post('/community/posts', p),
    remove: (id) => api.del(`/community/posts/${id}`),
    like: (id) => api.post(`/community/posts/${id}/like`),
    comments: (id) => api.get(`/community/posts/${id}/comments`),
    comment: (id, content) => api.post(`/community/posts/${id}/comments`, { content }),
    removeComment: (id) => api.del(`/community/comments/${id}`),
    overview: () => api.get('/community/overview')
  },

  /** 二手房买卖：挂牌房源 + 购房意向 */
  sale: {
    overview: () => api.get('/sale/overview'),
    intents: (q) => api.get('/sale/intents' + qs(q)),
    submit: (houseId, payload) => api.post(`/houses/${houseId}/intents`, payload),
    accept: (id) => api.post(`/sale/intents/${id}/accept`),
    reject: (id) => api.post(`/sale/intents/${id}/reject`),
    cancel: (id) => api.post(`/sale/intents/${id}/cancel`)
  },

  /** 法拍房：公开加价 + 最后 5 分钟延时 */
  auctions: {
    list: (q) => api.get('/auctions' + qs(q)),
    overview: () => api.get('/auctions/overview'),
    one: (id) => api.get(`/auctions/${id}`),
    bids: (id, q) => api.get(`/auctions/${id}/bids` + qs(q)),
    bid: (id, price) => api.post(`/auctions/${id}/bids`, { price }),
    create: (houseId, payload) => api.post(`/houses/${houseId}/auctions`, payload),
    cancel: (id) => api.post(`/auctions/${id}/cancel`)
  },

  stats: () => api.get('/stats/dashboard'),
  reset: () => api.post('/reset')
}

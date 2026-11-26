import { reactive } from 'vue'

/** 后端连接状态（顶栏/设置页可展示） */
export const net = reactive({
  online: false,
  checked: false,
  dialect: '',
  connection: '',
  error: ''
})

/**
 * 登录态：token 存在 localStorage，刷新页面不需要重新登录。
 * 放在这里而不是 store 里，是为了让 request() 能直接读到，避免 store ↔ api 循环依赖。
 */
const TOKEN_KEY = 'xw-token'
const readToken = () => { try { return localStorage.getItem(TOKEN_KEY) || '' } catch (e) { return '' } }

export const session = reactive({ token: readToken() })

export function setToken(t) {
  session.token = t || ''
  try {
    if (session.token) localStorage.setItem(TOKEN_KEY, session.token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch (e) { /* 隐私模式下写不了 localStorage，退化为仅内存 */ }
}

const BASE = import.meta.env.VITE_API_BASE || '/api'

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (session.token) headers.Authorization = 'Bearer ' + session.token

  let res
  try {
    res = await fetch(BASE + path, {
      method,
      headers: Object.keys(headers).length ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch (e) {
    net.online = false
    net.error = '无法连接后端服务'
    throw new Error('无法连接后端服务，请确认 npm run server 已启动')
  }

  let json = null
  try { json = await res.json() } catch (e) { /* 非 JSON 响应 */ }

  // token 失效（过期 / 被重置 / 改过密码）时直接清掉，前端自然回到游客态
  if (res.status === 401 && session.token && !path.startsWith('/auth/login')) setToken('')

  if (!res.ok || !json || json.ok === false) {
    throw new Error((json && json.error) || `请求失败（HTTP ${res.status}）`)
  }
  return json.data
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b ?? {} }),
  patch: (p, b) => request(p, { method: 'PATCH', body: b ?? {} }),
  put: (p, b) => request(p, { method: 'PUT', body: b ?? {} }),
  del: (p) => request(p, { method: 'DELETE' })
}

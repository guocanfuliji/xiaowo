/**
 * 登录态（token 的唯一读写入口）
 *
 * token 本身放在 api/client.js 的 session 里（fetch 要直接读），这里只提供业务动作。
 * 登录/注册成功后都会重新 bootstrap() 一次，把 state.user、收藏、房源全部换成该账号的数据。
 */
import { computed } from 'vue'
import { Api } from '@/api/index.js'
import { session, setToken } from '@/api/client.js'
import { state, bootstrap, toast } from './app.js'

export const auth = session
export const loggedIn = computed(() => !!session.token)

async function apply(d) {
  setToken(d.token)
  if (d.user) state.user = d.user
  await bootstrap()
}

export async function login(account, password) {
  const d = await Api.auth.login({ account, password })
  await apply(d)
  toast(`欢迎回来，${d.user.name}`)
  return d.user
}

export async function register(payload) {
  const d = await Api.auth.register(payload)
  await apply(d)
  toast('注册成功，已自动登录')
  return d.user
}

export async function logout() {
  if (session.token) {
    try { await Api.auth.logout() } catch (e) { /* token 已失效也无所谓，本地清掉即可 */ }
  }
  setToken('')
  await bootstrap()
  toast('已退出登录', 'warn')
}

/** 刷新页面后校验 token 是否还有效（失效会自动清掉 token，回到游客态） */
export async function refreshMe() {
  if (!session.token) return null
  try {
    const u = await Api.auth.me()
    if (u) state.user = u
    return u
  } catch (e) {
    setToken('')
    return null
  }
}

export async function changePassword(oldPassword, newPassword) {
  const d = await Api.auth.password({ oldPassword, newPassword })
  setToken(d.token)
  toast('密码已更新，其它设备已自动下线')
  return d
}

/** 未登录时做写操作：统一提示并跳登录页 */
export function requireLogin(router) {
  if (loggedIn.value) return true
  toast('请先登录后再操作', 'warn')
  if (router) router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
  return false
}

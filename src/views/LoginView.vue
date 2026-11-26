<script setup>
/** 登录 / 注册：一个页面两个页签，游客也能直接浏览，登录后才能写入 */
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import { CHARS } from '@/data/seed.js'
import { login, register, loggedIn, logout } from '@/stores/auth.js'
import { state, toast } from '@/stores/app.js'

const route = useRoute()
const router = useRouter()

const tab = ref(route.query.tab === 'register' ? 'register' : 'login')
const loading = ref(false)

const f = ref({ account: '', password: '', name: '', phone: '', charId: 'spongebob' })
const redirect = computed(() => String(route.query.redirect || '/'))

async function submitLogin() {
  if (!f.value.account.trim() || !f.value.password) return toast('请填写账号与密码', 'warn')
  loading.value = true
  try {
    await login(f.value.account.trim(), f.value.password)
    router.push(redirect.value)
  } catch (e) {
    toast(e.message || '登录失败', 'warn')
  } finally {
    loading.value = false
  }
}

async function submitRegister() {
  const name = f.value.name.trim()
  if (name.length < 2) return toast('昵称至少 2 个字', 'warn')
  if (!/^1[3-9]\d{9}$/.test(f.value.phone.trim())) return toast('请填写 11 位手机号', 'warn')
  if (f.value.password.length < 6) return toast('密码至少 6 位', 'warn')
  loading.value = true
  try {
    await register({ name, phone: f.value.phone.trim(), password: f.value.password, charId: f.value.charId })
    router.push(redirect.value)
  } catch (e) {
    toast(e.message || '注册失败', 'warn')
  } finally {
    loading.value = false
  }
}

function fillDemo() {
  tab.value = 'login'
  f.value.account = '小蜗'
  f.value.password = '123456'
  toast('已填入演示账号，直接点登录即可')
}
</script>

<template>
  <div class="auth">
    <div class="auth__intro">
      <h1 class="auth__title">在比奇堡，<br /><span class="hl">先有个身份</span></h1>
      <p class="auth__sub">
        游客可以自由浏览房源、地图与邻里社区；
        收藏、预约、发帖、出价这些写操作需要一个账号。
      </p>
      <ul class="auth__points">
        <li><b>一个账号一份数据</b><span>收藏、房源、购房意向跟着账号走</span></li>
        <li><b>登录即写，退出即读</b><span>没有 token 的写请求后端直接 401</span></li>
        <li><b>登出真的失效</b><span>会话存在数据库里，登出即删，不是前端假装</span></li>
      </ul>
    </div>

    <div class="card auth__card">
      <div class="tabs">
        <button :class="{ 'is-on': tab === 'login' }" @click="tab = 'login'">登录</button>
        <button :class="{ 'is-on': tab === 'register' }" @click="tab = 'register'">注册</button>
      </div>

      <!-- 已登录时的状态 -->
      <template v-if="loggedIn">
        <div class="auth__signed">
          <CharAvatar :char="CHARS.find(c => c.id === state.user.charId)" :avatar-id="state.user.avatar" :size="54" />
          <div>
            <b>{{ state.user.name }}</b>
            <i>已登录 · {{ state.user.member }} · 信用 {{ state.user.credit }}</i>
          </div>
        </div>
        <button class="btn btn--primary btn--lg" @click="router.push('/')">回到首页</button>
        <button class="btn btn--ghost btn--lg" style="margin-top:8px" @click="logout">退出登录</button>
      </template>

      <!-- 登录 -->
      <div v-else-if="tab === 'login'" class="form">
        <label>账号</label>
        <input v-model="f.account" type="text" placeholder="手机号或昵称" autocomplete="username" />
        <label style="margin-top:12px">密码</label>
        <input v-model="f.password" type="password" placeholder="6~32 位" autocomplete="current-password"
          @keyup.enter="submitLogin" />
        <button class="btn btn--primary btn--lg" style="margin-top:16px" :disabled="loading" @click="submitLogin">
          {{ loading ? '登录中…' : '登录' }}
        </button>

        <div class="auth__demo">
          <div>
            <b>演示账号</b>
            <span>昵称 <em>小蜗</em> · 密码 <em>123456</em></span>
          </div>
          <button class="btn btn--ghost" style="height:32px;padding:0 12px;font-size:12px" @click="fillDemo">一键填入</button>
        </div>
      </div>

      <!-- 注册 -->
      <div v-else class="form">
        <label>昵称</label>
        <input v-model="f.name" type="text" maxlength="12" placeholder="2~12 个字，登录时也能用它" />
        <label style="margin-top:12px">手机号</label>
        <input v-model="f.phone" type="tel" maxlength="11" placeholder="11 位手机号，登录账号" />
        <label style="margin-top:12px">密码</label>
        <input v-model="f.password" type="password" placeholder="6~32 位" autocomplete="new-password" />

        <label style="margin-top:14px">选个头像</label>
        <div class="auth__chars">
          <button
            v-for="c in CHARS"
            :key="c.id"
            class="auth__char"
            :class="{ 'is-on': f.charId === c.id }"
            :title="c.name"
            @click="f.charId = c.id"
          >
            <CharAvatar :char="c" bare />
          </button>
        </div>

        <button class="btn btn--primary btn--lg" style="margin-top:16px" :disabled="loading" @click="submitRegister">
          {{ loading ? '注册中…' : '注册并登录' }}
        </button>
        <p class="auth__tip">注册即代表同意《比奇堡居住公约》，演示环境不校验短信验证码。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 28px;
  align-items: start;
  padding: 18px 4px;
}
.auth__intro { padding: 12px 6px; }
.auth__title { font-size: 30px; line-height: 1.3; font-weight: 900; color: var(--ink1); margin: 0; }
.auth__title .hl { color: #0f6e56; }
.auth__sub { margin: 14px 0 0; font-size: 13px; line-height: 1.9; color: var(--ink2); max-width: 420px; }
.auth__points { list-style: none; padding: 0; margin: 22px 0 0; display: grid; gap: 12px; max-width: 440px; }
.auth__points li {
  background: var(--card, #fff);
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 6px 18px rgba(18, 60, 63, .05);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.auth__points b { font-size: 13px; color: var(--ink1); }
.auth__points span { font-size: 11.5px; color: var(--ink3); }
.auth__card { padding: 18px 20px 20px; }
.auth__signed { display: flex; align-items: center; gap: 12px; margin: 14px 0 16px; }
.auth__signed b { display: block; font-size: 15px; }
.auth__signed i { font-style: normal; font-size: 11.5px; color: var(--ink3); }
.auth__demo {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f2f8f6;
}
.auth__demo b { display: block; font-size: 12px; color: var(--ink1); }
.auth__demo span { font-size: 11.5px; color: var(--ink2); }
.auth__demo em { font-style: normal; font-weight: 900; color: #0f6e56; }
.auth__chars { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 8px; }
.auth__char {
  position: relative;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #f6fafb;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: border-color .15s ease, transform .15s ease;
}
.auth__char.is-on { border-color: #0f6e56; transform: translateY(-2px); }
.auth__tip { font-size: 11px; color: var(--ink3); margin-top: 10px; line-height: 1.7; }

@media (max-width: 900px) {
  .auth { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .auth__title { font-size: 23px; }
  .auth__points { display: none; }
}
</style>

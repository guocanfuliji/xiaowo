<script setup>
/** 设置：服务器与数据库 + 账号安全 + 通知偏好 + 界面偏好 */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import { state, ui, net, resetAll, reloadFromServer, toast } from '@/stores/app.js'
import { loggedIn, logout, changePassword } from '@/stores/auth.js'
import { Api } from '@/api/index.js'

const router = useRouter()
const mail = ref(true)
const sms = ref(false)
const priceAlert = ref(true)
const newHouseAlert = ref(true)
const health = ref(null)
const syncing = ref(false)
const lastSync = ref('')

onMounted(checkHealth)

async function checkHealth() {
  try {
    health.value = await Api.health()
    lastSync.value = new Date().toLocaleTimeString('zh-CN')
  } catch (e) {
    health.value = null
  }
}

async function doSync() {
  syncing.value = true
  const ok = await reloadFromServer()
  if (ok) await checkHealth()
  syncing.value = false
}

const SECURITY = computed(() => (loggedIn.value
  ? [
      { k: '昵称', v: state.user.name },
      { k: '手机号', v: state.user.phone || '—' },
      { k: '会员等级', v: `${state.user.member} · 信用 ${state.user.credit}` }
    ]
  : []))

/* 修改密码 */
const pwd = ref({ open: false, old: '', next: '', confirm: '' })
const savingPwd = ref(false)

async function submitPwd() {
  if (!pwd.value.old) return toast('请填写原密码', 'warn')
  if (pwd.value.next.length < 6) return toast('新密码至少 6 位', 'warn')
  if (pwd.value.next !== pwd.value.confirm) return toast('两次输入的新密码不一致', 'warn')
  savingPwd.value = true
  try {
    await changePassword(pwd.value.old, pwd.value.next)
    pwd.value = { open: false, old: '', next: '', confirm: '' }
  } catch (e) {
    toast(e.message || '修改失败', 'warn')
  } finally {
    savingPwd.value = false
  }
}

const ABOUT = computed(() => [
  { k: '版本', v: 'v2.0.0（Vue3 + Express）' },
  { k: '后端', v: net.online ? `已连接（${net.dialect === 'mysql' ? 'MySQL' : 'SQLite'}）` : '未连接' },
  { k: '接口', v: net.online ? 'http://127.0.0.1:3001/api' : '—' },
  { k: '隐私政策', v: '查看' },
  { k: '用户协议', v: '查看' }
])

function confirmReset() {
  if (window.confirm('确定要恢复全部初始数据吗？数据库里的房源、预约、账单与装修方案都会被重置。')) {
    resetAll()
    setTimeout(checkHealth, 700)
  }
}

const keys = computed(() => [
  { k: '房源数据', v: state.houses.length + ' 套' },
  { k: '收藏', v: state.favorites.length + ' 条' },
  { k: '预约', v: state.bookings.length + ' 条' },
  { k: '账单', v: state.bills.length + ' 条' },
  { k: '消息', v: state.messages.length + ' 条' }
])
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>设置</h1>
        <p>管理服务器连接、账号安全与通知偏好。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/profile')">个人中心</button>
      </div>
    </div>

    <div class="two-col">
      <div>
        <div class="card">
          <div class="card__title">
            账号与安全
            <span class="badge" :class="loggedIn ? 'badge--mint' : ''">{{ loggedIn ? '已登录' : '游客' }}</span>
          </div>
          <div class="card__desc">
            {{ loggedIn ? '当前登录身份，密码修改后其它设备会自动下线。' : '未登录也可以浏览房源与社区；收藏、预约、发帖、出价需要先登录。' }}
          </div>

          <template v-if="!loggedIn">
            <button class="btn btn--primary" style="margin-top:12px" @click="router.push('/login')">去登录 / 注册</button>
            <p style="font-size:11.5px;color:var(--ink3);margin-top:10px">
              演示账号：昵称 <b>小蜗</b> · 密码 <b>123456</b>
            </p>
          </template>

          <template v-else>
            <div style="margin-top:12px">
              <div v-for="s in SECURITY" :key="s.k" class="kv"><span>{{ s.k }}</span><b>{{ s.v }}</b></div>
            </div>

            <div v-if="!pwd.open" class="deco__acts">
              <button class="btn btn--ghost" @click="pwd.open = true">修改密码</button>
              <button class="btn btn--ghost" style="color:#bb2b36" @click="logout">退出登录</button>
            </div>

            <div v-else class="form" style="margin-top:14px">
              <label>原密码</label>
              <input v-model="pwd.old" type="password" autocomplete="current-password" />
              <label style="margin-top:10px">新密码</label>
              <input v-model="pwd.next" type="password" autocomplete="new-password" placeholder="6~32 位" />
              <label style="margin-top:10px">确认新密码</label>
              <input v-model="pwd.confirm" type="password" autocomplete="new-password" @keyup.enter="submitPwd" />
              <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">
                <button class="btn btn--ghost" @click="pwd.open = false">取消</button>
                <button class="btn btn--primary" :disabled="savingPwd" @click="submitPwd">{{ savingPwd ? '保存中…' : '保存' }}</button>
              </div>
            </div>
          </template>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">
            服务器与数据库
            <span class="badge" :class="net.online ? 'badge--mint' : ''">{{ net.online ? '已连接' : '离线' }}</span>
          </div>
          <div class="card__desc">
            {{ net.online ? '数据实时读写数据库，刷新页面不会丢失。' : '未连上后端，当前使用本地缓存（离线演示模式）。' }}
          </div>
          <div style="margin-top:12px">
            <div class="kv"><span>数据库驱动</span><b>{{ net.dialect === 'mysql' ? 'MySQL' : net.dialect === 'sqlite' ? 'SQLite' : '—' }}</b></div>
            <div class="kv"><span>数据库房源</span><b>{{ health ? health.houses + ' 套' : '—' }}</b></div>
            <div class="kv"><span>服务运行时长</span><b>{{ health ? health.uptime + ' 秒' : '—' }}</b></div>
            <div class="kv"><span>最近同步</span><b>{{ lastSync || '—' }}</b></div>
            <div v-for="k in keys" :key="k.k" class="kv"><span>{{ k.k }}</span><b>{{ k.v }}</b></div>
          </div>
          <div class="deco__acts">
            <button class="btn btn--ghost" :disabled="syncing" @click="doSync">{{ syncing ? '同步中…' : '重新同步' }}</button>
            <button class="btn btn--ghost" @click="checkHealth">健康检查</button>
            <button class="btn btn--ghost" style="color:#bb2b36" @click="confirmReset">恢复初始数据</button>
          </div>
          <p style="font-size:11px;color:var(--ink3);margin-top:10px;line-height:1.7">
            连接参数在项目根目录 <code>.env</code> 中配置：DB_CLIENT / DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME。
          </p>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card__title">通知偏好</div>
          <div class="card__desc">选择你希望收到的提醒</div>
          <div style="margin-top:10px">
            <div class="set-row">
              <div><b>应用内通知</b><span>新消息、预约与账单提醒</span></div>
              <span class="switch" :class="{ 'is-on': ui.notify }" @click="ui.notify = !ui.notify"></span>
            </div>
            <div class="set-row">
              <div><b>降价提醒</b><span>关注的房源降价时通知我</span></div>
              <span class="switch" :class="{ 'is-on': priceAlert }" @click="priceAlert = !priceAlert"></span>
            </div>
            <div class="set-row">
              <div><b>新房源提醒</b><span>关注街区有新房源上架时通知</span></div>
              <span class="switch" :class="{ 'is-on': newHouseAlert }" @click="newHouseAlert = !newHouseAlert"></span>
            </div>
            <div class="set-row">
              <div><b>邮件通知</b><span>{{ state.user.email }}</span></div>
              <span class="switch" :class="{ 'is-on': mail }" @click="mail = !mail"></span>
            </div>
            <div class="set-row">
              <div><b>短信通知</b><span>仅发送账单与签约相关</span></div>
              <span class="switch" :class="{ 'is-on': sms }" @click="sms = !sms"></span>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">界面偏好</div>
          <div class="card__desc">调整布局与展示密度</div>
          <div style="margin-top:10px">
            <div class="set-row">
              <div><b>收起功能栏</b><span>隐藏侧栏文字，仅显示图标</span></div>
              <span class="switch" :class="{ 'is-on': ui.collapsed }" @click="ui.collapsed = !ui.collapsed"></span>
            </div>
            <div class="set-row">
              <div><b>紧凑模式</b><span>缩小卡片间距，一屏看更多</span></div>
              <span class="switch" :class="{ 'is-on': ui.density === 'compact' }" @click="ui.density = ui.density === 'compact' ? 'comfortable' : 'compact'"></span>
            </div>
            <div class="set-row">
              <div><b>重播开场动画</b><span>重新观看小蜗的出场动画</span></div>
              <button class="btn btn--ghost" style="height:32px;padding:0 14px;font-size:12px" @click="ui.introPlayed = false; location.reload()">重播</button>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">关于小蜗</div>
          <div style="margin-top:10px">
            <div v-for="a in ABOUT" :key="a.k" class="kv">
              <span>{{ a.k }}</span>
              <b>{{ a.v }}</b>
            </div>
          </div>
          <p style="font-size:11.5px;color:var(--ink3);margin-top:12px;line-height:1.7">
            本项目为演示原型，动画角色版权归原权利方所有，商用请替换为原创 IP。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

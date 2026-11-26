<script setup>
/** 个人中心：身份切换 + 资料编辑 + 数据统计 */
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import { state, me, myAvatar, CHARS, AVATARS, switchChar, setAvatar, updateUser, toast, money } from '@/stores/app.js'

const router = useRouter()

const form = reactive({
  name: state.user.name,
  phone: state.user.phone,
  email: state.user.email
})

const editing = ref(false)

function save() {
  if (!form.name.trim()) return toast('昵称不能为空', 'warn')
  updateUser({ name: form.name.trim(), phone: form.phone, email: form.email })
  editing.value = false
}

function pick(id) {
  switchChar(id)
  form.name = state.user.name
}

const stats = computed(() => [
  { b: state.favorites.length, i: '收藏房源' },
  { b: state.bookings.length, i: '看房预约' },
  { b: state.leases.length, i: '历史租约' },
  { b: state.reviews.filter((r) => r.authorId === state.user.charId).length, i: '发布评价' },
  { b: state.user.credit, i: '信用分' }
])

/** 足迹：预约过或租过的房源 */
const footprint = computed(() => {
  const ids = new Set()
  state.bookings.forEach((b) => ids.add(b.houseId))
  state.leases.forEach((l) => ids.add(l.houseId))
  state.favorites.forEach((id) => ids.add(id))
  return [...ids].map((id) => state.houses.find((h) => h.id === id)).filter(Boolean).slice(0, 6)
})
</script>

<template>
  <div>
    <div class="card">
      <div class="profile__head">
        <div class="profile__avatar">
          <CharAvatar :char="me" :avatar-id="state.user.avatar" bare />
        </div>
        <div style="flex:1;min-width:220px">
          <h1 style="font-size:24px;font-weight:900">{{ state.user.name }}</h1>
          <p style="font-size:12.5px;color:var(--ink2);margin-top:6px">
            {{ me.role }} · {{ state.user.member }} · 加入比奇堡 {{ state.user.joinedAt }}
          </p>
          <div class="badge-row" style="margin-top:10px">
            <span class="badge badge--mint">{{ state.user.verified ? '✓ 已实名认证' : '未认证' }}</span>
            <span class="badge badge--yellow">信用分 {{ state.user.credit }}</span>
            <span class="badge badge--purple">比奇堡居民</span>
          </div>
        </div>
        <div class="page-head__acts">
          <button class="btn btn--ghost" @click="editing = !editing">{{ editing ? '取消编辑' : '编辑资料' }}</button>
          <button class="btn btn--primary" @click="router.push('/settings')">设置</button>
        </div>
      </div>

      <div class="stats">
        <div v-for="s in stats" :key="s.i" class="stat"><b>{{ s.b }}</b><i>{{ s.i }}</i></div>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div class="card__title">头像库</div>
        <div class="card__desc">挑一张脸就行，昵称和身份都不会变（共 {{ AVATARS.length }} 张）</div>
        <div class="avatar-picker">
          <button
            v-for="a in AVATARS"
            :key="a.id"
            class="av"
            :class="{ 'is-on': myAvatar && myAvatar.id === a.id }"
            :title="a.label"
            @click="setAvatar(a.id)"
          >
            <img class="chimg-img" :src="a.img" :alt="a.label" loading="lazy" draggable="false" />
          </button>
        </div>
        <p style="font-size:12px;color:var(--ink2);margin-top:10px">
          当前头像：<b style="color:var(--sea)">{{ myAvatar ? myAvatar.label : '默认图标' }}</b>
        </p>

        <div class="sub-title">切换身份</div>
        <div class="card__desc">身份决定昵称与职业，切过去会顺带换成该角色的默认头像</div>
        <div class="avatar-picker">
          <button
            v-for="c in CHARS"
            :key="c.id"
            class="av"
            :class="{ 'is-on': state.user.charId === c.id }"
            :title="c.name + ' · ' + c.role"
            @click="pick(c.id)"
          >
            <CharAvatar :char="c" bare />
          </button>
        </div>
        <p style="font-size:12px;color:var(--ink2);margin-top:12px">
          当前身份：<b style="color:var(--sea)">{{ me.name }}</b>（{{ me.role }}）
        </p>

        <div class="sub-title">基本资料</div>
        <div v-if="editing" class="form">
          <div class="form__row" style="margin-top:0">
            <div>
              <label>昵称</label>
              <input v-model="form.name" type="text" />
            </div>
            <div>
              <label>手机号</label>
              <input v-model="form.phone" type="text" />
            </div>
          </div>
          <div style="margin-top:14px">
            <label>邮箱</label>
            <input v-model="form.email" type="text" />
          </div>
          <button class="btn btn--primary" style="margin-top:14px" @click="save">保存资料</button>
        </div>
        <div v-else>
          <div class="kv"><span>昵称</span><b>{{ state.user.name }}</b></div>
          <div class="kv"><span>手机号</span><b>{{ state.user.phone }}</b></div>
          <div class="kv"><span>邮箱</span><b>{{ state.user.email }}</b></div>
          <div class="kv"><span>会员等级</span><b>{{ state.user.member }}</b></div>
          <div class="kv"><span>注册时间</span><b>{{ state.user.joinedAt }}</b></div>
        </div>
      </div>

      <div>
        <div class="card">
          <div class="card__title">我的足迹</div>
          <div class="card__desc">浏览、预约与收藏过的房源</div>
          <div style="margin-top:12px">
            <div
              v-for="h in footprint"
              :key="h.id"
              class="row"
              style="margin-bottom:8px;cursor:pointer"
              @click="router.push('/house/' + h.id)"
            >
              <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + h.svg" /></svg>
              <div class="row__main">
                <b>{{ h.title }}</b>
                <span>{{ h.rooms }}室{{ h.halls }}厅 · {{ h.area }}m²</span>
              </div>
              <div class="row__end">{{ money(h.price) }}</div>
            </div>
            <p v-if="!footprint.length" style="font-size:12px;color:var(--ink3)">还没有浏览记录，去首页看看吧。</p>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">快捷入口</div>
          <div class="insp">
            <button class="insp__card" @click="router.push('/fav')">
              <span class="insp__sw" style="background:linear-gradient(160deg,#FFA9C6,#EE5787)"></span>
              <b>我的收藏</b><span>{{ state.favorites.length }} 套房源</span>
            </button>
            <button class="insp__card" @click="router.push('/bill')">
              <span class="insp__sw" style="background:linear-gradient(160deg,#FFC766,#F08A17)"></span>
              <b>账单支付</b><span>待缴 {{ state.bills.filter(b => b.status !== 'paid').length }} 笔</span>
            </button>
            <button class="insp__card" @click="router.push('/decorate')">
              <span class="insp__sw" style="background:linear-gradient(160deg,#C6AEFF,#8254E8)"></span>
              <b>房屋装修</b><span>布置你的小窝</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/** 预约看房：提交预约 + 我的预约管理 */
import { reactive, ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  state, houseById, charOf, addBooking, setBookingStatus, pendingBookings, money, toast
} from '@/stores/app.js'

const route = useRoute()
const router = useRouter()

const f = reactive({ houseId: '', date: '', time: '10:00', note: '' })
const TIMES = ['09:30', '10:00', '11:00', '14:00', '14:30', '16:00', '18:30']
const tab = ref('all')

onMounted(() => {
  if (route.query.house) f.houseId = String(route.query.house)
  const t = new Date()
  t.setDate(t.getDate() + 1)
  f.date = t.toISOString().slice(0, 10)
})

const candidates = computed(() => state.houses.filter((h) => h.status !== 'pending'))
const preview = computed(() => houseById(f.houseId))
const previewOwner = computed(() => (preview.value ? charOf(preview.value.ownerId) : null))

function submit() {
  if (!f.houseId) return toast('请选择要看的房源', 'warn')
  if (!f.date) return toast('请选择看房日期', 'warn')
  addBooking({ houseId: f.houseId, date: f.date, time: f.time, note: f.note })
  f.note = ''
}

const list = computed(() => {
  if (tab.value === 'all') return state.bookings
  return state.bookings.filter((b) => b.status === tab.value)
})

const STATUS = { pending: { t: '待确认', c: 'wait' }, done: { t: '已完成', c: 'ok' }, canceled: { t: '已取消', c: 'due' } }

function quickDate(offset) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  f.date = d.toISOString().slice(0, 10)
}

const upcoming = computed(() => pendingBookings.value.slice(0, 3))
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>预约看房</h1>
        <p>提交后房东会在 24 小时内确认，请留意消息通知。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/message')">查看通知</button>
      </div>
    </div>

    <div class="two-col">
      <div class="card form">
        <div class="card__title">发起预约</div>
        <div class="card__desc">选择房源与时间，房东确认后即可看房</div>

        <div style="margin-top:14px">
          <label>选择房源</label>
          <select v-model="f.houseId">
            <option value="">请选择…</option>
            <option v-for="h in candidates" :key="h.id" :value="h.id">
              {{ h.title }}（{{ money(h.price) }}/月）
            </option>
          </select>
        </div>

        <div v-if="preview" class="row" style="margin-top:12px">
          <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + preview.svg" /></svg>
          <div class="row__main">
            <b>{{ preview.title }}</b>
            <span>{{ preview.address }} · {{ preview.rooms }}室{{ preview.halls }}厅 · 房东 {{ previewOwner.name }}</span>
          </div>
          <div class="row__end">{{ money(preview.price) }}</div>
        </div>

        <div class="form__row">
          <div>
            <label>看房日期</label>
            <input v-model="f.date" type="date" :min="new Date().toISOString().slice(0,10)" />
            <div class="chips" style="margin-top:10px">
              <button class="chip" @click="quickDate(1)">明天</button>
              <button class="chip" @click="quickDate(2)">后天</button>
              <button class="chip" @click="quickDate(7)">一周后</button>
            </div>
          </div>
          <div>
            <label>时段</label>
            <div class="chips" style="margin-top:9px">
              <button v-for="t in TIMES" :key="t" class="chip" :class="{ 'is-on': f.time === t }" @click="f.time = t">{{ t }}</button>
            </div>
          </div>
        </div>

        <div style="margin-top:14px">
          <label>备注</label>
          <input v-model="f.note" type="text" placeholder="例如：想重点看采光和卫生间" />
        </div>

        <button class="btn btn--primary btn--lg" style="margin-top:16px" @click="submit">提交预约</button>
      </div>

      <div>
        <div class="card">
          <div class="card__title">即将看房</div>
          <div class="card__desc">共 {{ pendingBookings.length }} 项待确认</div>
          <div style="margin-top:12px">
            <div v-for="b in upcoming" :key="b.id" class="todo">
              <span class="todo__ic"><SvgIcon name="ic-calendar" cls="ic" /></span>
              <div class="todo__txt">
                <b>{{ houseById(b.houseId)?.title }}</b>
                <span>{{ b.date }} {{ b.time }} · 房东 {{ charOf(b.agentId).name }}</span>
              </div>
            </div>
            <div v-if="!upcoming.length" class="todo">
              <span class="todo__ic"><SvgIcon name="ic-check" cls="ic" /></span>
              <div class="todo__txt"><b>暂无待确认预约</b><span>挑一套心仪的房子预约看房吧</span></div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">看房小贴士</div>
          <div class="timeline" style="margin-top:12px">
            <div class="tl"><b>检查采光与通风</b><span>海底房屋的舷窗朝向决定了一整天的亮度。</span></div>
            <div class="tl"><b>确认水压与温泉</b><span>贝壳浴缸和 24h 温泉需要现场试用。</span></div>
            <div class="tl"><b>问清押金规则</b><span>退租时的验收标准务必写进合同。</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="sec-head">
      <h2>我的预约</h2>
      <span class="sec-head__more">共 {{ state.bookings.length }} 条记录</span>
    </div>

    <div class="tabs" style="margin-bottom:12px">
      <button :class="{ 'is-on': tab === 'all' }" @click="tab = 'all'">全部</button>
      <button :class="{ 'is-on': tab === 'pending' }" @click="tab = 'pending'">待确认</button>
      <button :class="{ 'is-on': tab === 'done' }" @click="tab = 'done'">已完成</button>
      <button :class="{ 'is-on': tab === 'canceled' }" @click="tab = 'canceled'">已取消</button>
    </div>

    <div v-if="list.length" class="list">
      <div v-for="b in list" :key="b.id" class="row">
        <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + (houseById(b.houseId)?.svg || 'h-pineapple')" /></svg>
        <div class="row__main">
          <b>{{ houseById(b.houseId)?.title || '房源已下架' }}</b>
          <span>{{ b.date }} {{ b.time }} · 房东 {{ charOf(b.agentId).name }} · {{ b.note || '无备注' }}</span>
        </div>
        <span class="tag-pill" :class="STATUS[b.status].c">{{ STATUS[b.status].t }}</span>
        <div style="display:flex;gap:6px">
          <button
            v-if="b.status === 'pending'"
            class="btn btn--ghost"
            style="height:30px;padding:0 12px;font-size:11.5px"
            @click="setBookingStatus(b.id, 'canceled')"
          >取消</button>
          <button
            v-if="b.status === 'pending'"
            class="btn btn--ghost"
            style="height:30px;padding:0 12px;font-size:11.5px"
            @click="setBookingStatus(b.id, 'done')"
          >标记完成</button>
          <button
            v-else
            class="btn btn--ghost"
            style="height:30px;padding:0 12px;font-size:11.5px"
            @click="setBookingStatus(b.id, 'pending')"
          >重新预约</button>
          <button
            class="btn btn--ghost"
            style="height:30px;padding:0 12px;font-size:11.5px"
            @click="houseById(b.houseId) && router.push('/house/' + b.houseId)"
          >详情</button>
        </div>
      </div>
    </div>
    <EmptyState v-else icon="icx-calendar" title="这里还没有预约记录" desc="选择一套房源，提交看房时间吧。" />
  </div>
</template>

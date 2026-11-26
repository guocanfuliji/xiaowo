<script setup>
/** 账单与支付：待付清单 + 支付方式 + 支出统计 + 自定义记账 */
import { computed, ref, reactive } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  state, houseById, money, payBill, addBill, unpaidBills, totalUnpaid, toast
} from '@/stores/app.js'

const tab = ref('unpaid')
const method = ref('贝壳支付')
const METHODS = [
  { id: '贝壳支付', ic: 'ic-wallet', b: '贝壳支付', d: '余额 ¥12,480 · 推荐' },
  { id: '水母钱包', ic: 'ic-star', b: '水母钱包', d: '绑定银行卡立减 2 元' },
  { id: '蟹堡信用卡', ic: 'ic-doc', b: '蟹堡信用卡', d: '尾号 6688 · 可分期' }
]

const list = computed(() => {
  if (tab.value === 'all') return state.bills
  return state.bills.filter((b) => b.status === tab.value)
})

const paidThisMonth = computed(() => {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return state.bills.filter((b) => b.status === 'paid' && (b.paidAt || '').startsWith(ym)).reduce((s, b) => s + b.amount, 0)
})
const overdue = computed(() => state.bills.filter((b) => b.status === 'overdue'))

const STATUS = { unpaid: { t: '待支付', c: 'wait' }, paid: { t: '已支付', c: 'ok' }, overdue: { t: '已逾期', c: 'due' } }

/* 近 6 个月支出统计 */
const monthly = computed(() => {
  const now = new Date()
  const rows = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const sum = state.bills
      .filter((b) => (b.due || '').startsWith(ym))
      .reduce((s, b) => s + b.amount, 0)
    rows.push({ label: (d.getMonth() + 1) + '月', value: sum, ym })
  }
  const max = Math.max(...rows.map((r) => r.value), 1)
  const min = Math.min(...rows.map((r) => r.value))
  return rows.map((r) => ({
    ...r,
    h: r.value === 0 ? 4 : Math.round(34 + ((r.value - min) / (max - min || 1)) * 66)
  }))
})

const custom = reactive({ type: '水电', amount: 0, due: '', houseId: '' })
function addCustom() {
  if (!(Number(custom.amount) > 0)) return toast('请输入正确的金额', 'warn')
  addBill({
    leaseId: 'L2001',
    houseId: custom.houseId || (houseById(state.leases[0]?.houseId)?.id || state.houses[0].id),
    type: custom.type,
    amount: Number(custom.amount),
    due: custom.due || new Date().toISOString().slice(0, 10),
    period: '手动记账'
  })
  custom.amount = 0
  custom.due = ''
}

function payAll() {
  const targets = state.bills.filter((b) => b.status !== 'paid')
  if (!targets.length) return toast('没有待支付账单')
  targets.forEach((b) => payBill(b.id, method.value))
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>账单与支付</h1>
        <p>房租、水电、物业一站缴清，支持贝壳支付与银行卡。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--primary" @click="payAll">一键缴清（{{ unpaidBills.length }} 笔）</button>
      </div>
    </div>

    <div class="kpis">
      <div class="kpi"><i>待支付总额</i><b>{{ money(totalUnpaid) }}</b><em>{{ unpaidBills.length }} 笔</em></div>
      <div class="kpi"><i>本月已付</i><b>{{ money(paidThisMonth) }}</b><em>按时缴纳</em></div>
      <div class="kpi"><i>逾期账单</i><b>{{ overdue.length }}</b><em>请尽快处理</em></div>
      <div class="kpi"><i>信用分</i><b>{{ state.user.credit }}</b><em>按时交租可提升</em></div>
    </div>

    <div class="two-col">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div class="card__title">账单明细</div>
          <div class="tabs">
            <button :class="{ 'is-on': tab === 'unpaid' }" @click="tab = 'unpaid'">待支付</button>
            <button :class="{ 'is-on': tab === 'overdue' }" @click="tab = 'overdue'">逾期</button>
            <button :class="{ 'is-on': tab === 'paid' }" @click="tab = 'paid'">已支付</button>
            <button :class="{ 'is-on': tab === 'all' }" @click="tab = 'all'">全部</button>
          </div>
        </div>

        <div v-if="list.length" class="table-scroll" style="margin-top:14px">
          <table>
            <thead>
              <tr>
                <th>类型</th><th>房源</th><th>账期</th><th>金额</th><th>到期日</th><th>状态</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in list" :key="b.id">
                <td><b>{{ b.type }}</b></td>
                <td>{{ houseById(b.houseId)?.title.slice(0, 12) || '—' }}</td>
                <td>{{ b.period }}</td>
                <td style="font-weight:900;color:#e2603a">{{ money(b.amount) }}</td>
                <td>{{ b.due }}</td>
                <td><span class="tag-pill" :class="STATUS[b.status].c">{{ STATUS[b.status].t }}</span></td>
                <td>
                  <button
                    v-if="b.status !== 'paid'"
                    class="btn btn--primary"
                    style="height:28px;padding:0 12px;font-size:11.5px"
                    @click="payBill(b.id, method)"
                  >支付</button>
                  <span v-else style="font-size:11px;color:var(--ink3)">{{ b.method }} · {{ b.paidAt }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else icon="icx-wallet" :title="tab === 'unpaid' ? '没有待支付账单' : '暂无该状态账单'" desc="房东发起账单后会出现在这里。" />
      </div>

      <div>
        <div class="card">
          <div class="card__title">支付方式</div>
          <div class="card__desc">支付前请确认收款方为平台托管账户</div>
          <div
            v-for="m in METHODS"
            :key="m.id"
            class="paycard"
            :class="{ 'is-on': method === m.id }"
            @click="method = m.id"
          >
            <span class="paycard__ic"><SvgIcon :name="m.ic" cls="ic" style="width:20px;height:20px" /></span>
            <div>
              <b>{{ m.b }}</b>
              <span>{{ m.d }}</span>
            </div>
            <span class="paycard__tick"><SvgIcon name="ic-check" cls="ic" /></span>
          </div>

          <div class="deco-budget">
            <span>本次将支付</span>
            <b>{{ money(totalUnpaid) }}</b>
          </div>
          <button class="btn btn--primary btn--lg" style="margin-top:12px" @click="payAll">确认支付</button>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">近 6 个月支出</div>
          <div class="card__desc">包含房租、水电、物业与维修</div>
          <div class="bars">
            <div v-for="m in monthly" :key="m.ym">
              <i :style="{ height: m.h + '%' }" :title="money(m.value)"></i>
              <span>{{ m.label }}</span>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">手动记账</div>
          <div class="card__desc">记录一笔计划外支出，方便对账</div>
          <div class="form__row" style="grid-template-columns:1fr 1fr">
            <div>
              <label>类型</label>
              <select v-model="custom.type">
                <option>水电</option><option>物业</option><option>维修</option><option>网络</option><option>其他</option>
              </select>
            </div>
            <div>
              <label>金额</label>
              <input v-model.number="custom.amount" type="number" min="0" placeholder="0" />
            </div>
          </div>
          <div style="margin-top:12px">
            <label>到期日</label>
            <input v-model="custom.due" type="date" />
          </div>
          <button class="btn btn--ghost btn--lg" style="margin-top:12px" @click="addCustom">添加账单</button>
        </div>
      </div>
    </div>
  </div>
</template>

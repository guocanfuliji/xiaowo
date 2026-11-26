<script setup>
/** 我的租约：当前租约 / 待签约 / 历史记录 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  state, houseById, charOf, activeLease, signLease, terminateLease, money, toast
} from '@/stores/app.js'

const router = useRouter()
const tab = ref('current')

const current = computed(() => activeLease.value)
/** 租约可能同时出现在房东和租客的列表里，续租/退租只有租客能发起 */
const isTenant = (l) => !!l && l.tenantId === state.user.charId
const pending = computed(() => state.leases.filter((l) => l.status === 'pending'))
const history = computed(() => state.leases.filter((l) => l.status === 'ended'))

function progress(l) {
  const s = new Date(l.start).getTime()
  const e = new Date(l.end).getTime()
  const now = Date.now()
  return Math.max(0, Math.min(100, Math.round(((now - s) / (e - s)) * 100)))
}

function daysLeft(l) {
  return Math.ceil((new Date(l.end).getTime() - Date.now()) / 864e5)
}

function renew(l) {
  toast('已向房东发送续租意向，请留意消息通知')
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>我的租约</h1>
        <p>电子合同云端留存，退租续租一键申请。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/bill')">查看账单</button>
        <button class="btn btn--primary" @click="router.push('/')">找新房子</button>
      </div>
    </div>

    <!-- 当前租约 -->
    <div v-if="current" class="two-col">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div class="card__title">正在履约的租约 <span class="badge badge--mint">生效中</span></div>
          <span class="tag-pill ok">{{ current.id }}</span>
        </div>

        <div class="row" style="margin-top:14px">
          <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + (houseById(current.houseId)?.svg || 'h-pineapple')" /></svg>
          <div class="row__main">
            <b>{{ houseById(current.houseId)?.title }}</b>
            <span>{{ houseById(current.houseId)?.address }}</span>
          </div>
          <div class="row__end">{{ money(current.rent) }}<span style="font-size:11px;color:var(--ink3)">/月</span></div>
        </div>

        <div style="margin-top:16px">
          <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ink2)">
            <span>租期进度</span>
            <span>剩余 {{ daysLeft(current) }} 天</span>
          </div>
          <div class="progress" style="margin-top:6px"><i :style="{ width: progress(current) + '%' }"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--ink3);margin-top:5px">
            <span>{{ current.start }}</span><span>{{ current.end }}</span>
          </div>
        </div>

        <div class="kv" style="margin-top:16px"><span>月租金</span><b>{{ money(current.rent) }}</b></div>
        <div class="kv"><span>押金</span><b>{{ money(current.deposit) }}</b></div>
        <div class="kv"><span>支付周期</span><b>{{ current.payCycle }}</b></div>
        <div class="kv"><span>签约日期</span><b>{{ current.signedAt || '—' }}</b></div>
        <div class="kv"><span>合同编号</span><b>{{ current.id }}</b></div>

        <p style="font-size:12px;color:var(--ink2);margin-top:14px;line-height:1.7">{{ current.note }}</p>

        <div v-if="isTenant(current)" class="deco__acts">
          <button class="btn btn--primary" @click="renew(current)">申请续租</button>
          <button class="btn btn--ghost" @click="terminateLease(current.id)">申请退租</button>
        </div>
        <div v-else class="auc-rule" style="margin-top:14px;border-top:1px dashed var(--line);padding-top:12px">
          你是这套房的房东，租客是 <b>{{ charOf(current.tenantId).name }}</b>。
          收租流水在「房东看板」，租客申请续租或退租后会出现在这里。
        </div>
      </div>

      <div>
        <div class="side-card">
          <div class="host-row">
            <CharAvatar :char="charOf(current.ownerId)" :size="54" />
            <div>
              <b>{{ charOf(current.ownerId).name }}</b>
              <i>{{ charOf(current.ownerId).role }} · 认证房东</i>
            </div>
          </div>
          <div class="host-stats">
            <div><b>{{ state.houses.filter(h => h.ownerId === current.ownerId).length }}</b><i>在租房源</i></div>
            <div><b>{{ houseById(current.houseId)?.rating }}</b><i>房源评分</i></div>
            <div><b>98%</b><i>回复率</i></div>
          </div>
          <button class="btn btn--ghost btn--lg" @click="toast('已打开与房东的对话')">联系房东</button>
          <button class="btn btn--ghost btn--lg" @click="toast('合同已下载到本地（演示）')">下载合同 PDF</button>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">合同条款</div>
          <div class="card__desc">共 {{ current.terms.length }} 条，签约即视为已阅读</div>
          <div style="margin-top:12px">
            <div v-for="(t, i) in current.terms" :key="i" class="term">
              <b>第 {{ i + 1 }} 条</b><span>{{ t }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="h-dome"
      title="当前没有生效中的租约"
      desc="签一份合约，就能在比奇堡安家啦。"
    >
      <button class="btn btn--primary" @click="router.push('/')">去找房</button>
    </EmptyState>

    <!-- 待签约 -->
    <div class="sec-head">
      <h2>待签约</h2>
      <span class="sec-head__more">{{ pending.length }} 份合同等待你确认</span>
    </div>

    <div v-if="pending.length" class="list">
      <div v-for="l in pending" :key="l.id" class="row">
        <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + (houseById(l.houseId)?.svg || 'h-pineapple')" /></svg>
        <div class="row__main">
          <b>{{ houseById(l.houseId)?.title }}</b>
          <span>{{ l.start }} 至 {{ l.end }} · {{ money(l.rent) }}/月 · 押金 {{ money(l.deposit) }}</span>
        </div>
        <span class="tag-pill wait">待签约</span>
        <button class="btn btn--primary" style="height:34px;padding:0 16px;font-size:12px" @click="signLease(l.id)">立即签约</button>
      </div>
    </div>
    <EmptyState v-else icon="icx-doc" title="没有待签约的合同" desc="与房东谈妥后，合同会出现在这里。" />

    <!-- 历史 -->
    <div class="sec-head">
      <h2>历史租约</h2>
      <span class="sec-head__more">{{ history.length }} 份已结束</span>
    </div>

    <div v-if="history.length" class="list">
      <div v-for="l in history" :key="l.id" class="row">
        <svg class="ico" viewBox="0 0 120 150"><use :href="'#' + (houseById(l.houseId)?.svg || 'h-pineapple')" /></svg>
        <div class="row__main">
          <b>{{ houseById(l.houseId)?.title }}</b>
          <span>{{ l.start }} 至 {{ l.end }} · {{ money(l.rent) }}/月</span>
        </div>
        <span class="tag-pill ok">已完成</span>
        <button class="btn btn--ghost" style="height:30px;padding:0 12px;font-size:11.5px" @click="toast('已查看历史合同（演示）')">查看</button>
      </div>
    </div>
    <EmptyState v-else icon="h-anchor" title="还没有历史租约" desc="结束的合约会归档在这里，方便随时查阅。" />
  </div>
</template>

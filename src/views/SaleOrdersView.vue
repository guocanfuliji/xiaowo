<script setup>
/** 购房意向：卖家收到的 / 买家提交的，两个视角共用一套卡片 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import {
  state, money, charOf, INTENT_TEXT,
  mySaleIntents, receivedSaleIntents,
  acceptSaleIntent, rejectSaleIntent, cancelSaleIntent
} from '@/stores/app.js'

const router = useRouter()
const role = ref('received')

const list = computed(() => (role.value === 'received' ? receivedSaleIntents.value : mySaleIntents.value))
const pendingCount = computed(() => receivedSaleIntents.value.filter((i) => i.status === 'pending').length)
const houseOf = (i) => state.houses.find((h) => h.id === i.houseId)
const badgeOf = { pending: 'badge--yellow', accepted: 'badge--mint', rejected: 'badge', canceled: 'badge' }
const otherName = (i) => charOf(role.value === 'received' ? i.buyerId : i.sellerId).name
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>购房意向</h1>
        <p>卖家确认后房源自动标记为已售，同一套房的其它意向会被关闭。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/sale')">返回买房专区</button>
      </div>
    </div>

    <div class="card">
      <div class="tabs">
        <button :class="{ 'is-on': role === 'received' }" @click="role = 'received'">
          我收到的<em v-if="pendingCount" class="tab__n">{{ pendingCount }}</em>
        </button>
        <button :class="{ 'is-on': role === 'buyer' }" @click="role = 'buyer'">我提交的</button>
      </div>
    </div>

    <div v-if="list.length" style="margin-top:14px">
      <div v-for="i in list" :key="i.id" class="card intent">
        <div class="intent__art" @click="router.push('/house/' + i.houseId)">
          <svg viewBox="0 0 120 150"><use :href="'#' + (houseOf(i)?.svg || 'h-pineapple')" /></svg>
        </div>

        <div class="intent__body">
          <div class="intent__head">
            <b class="intent__title" @click="router.push('/house/' + i.houseId)">
              {{ houseOf(i)?.title || '房源已下架' }}
            </b>
            <span class="badge" :class="badgeOf[i.status]">{{ INTENT_TEXT[i.status] || i.status }}</span>
          </div>
          <div class="intent__meta">
            {{ role === 'received' ? '买家' : '房东' }}：{{ otherName(i) }}
            <span class="dot">·</span>{{ i.createdAt }}
          </div>
          <p v-if="i.message" class="intent__msg">{{ i.message }}</p>
          <div class="intent__foot">
            <span class="intent__price">出价 {{ money(i.price) }}</span>
            <span class="intent__list">挂牌 {{ money(houseOf(i)?.price) }}</span>
            <span v-if="Number(i.price) < Number(houseOf(i)?.price || 0)" class="intent__off">
              低 {{ Math.round((1 - i.price / houseOf(i).price) * 100) }}%
            </span>
          </div>

          <div v-if="i.status === 'pending'" class="intent__acts">
            <template v-if="role === 'received'">
              <button class="btn btn--primary" @click="acceptSaleIntent(i.id)">接受并成交</button>
              <button class="btn btn--ghost" @click="rejectSaleIntent(i.id)">拒绝</button>
            </template>
            <button v-else class="btn btn--ghost" @click="cancelSaleIntent(i.id)">撤回意向</button>
          </div>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      icon="h-anchor"
      :title="role === 'received' ? '还没有人向你出价' : '你还没有提交过购房意向'"
      :desc="role === 'received' ? '挂牌出售后，买家的出价会出现在这里。' : '去买房专区看看，找到心仪的房子就能出价。'"
      style="margin-top:14px"
    >
      <button class="btn btn--primary" @click="router.push(role === 'received' ? '/publish?trade=sale' : '/sale')">
        {{ role === 'received' ? '挂牌卖房' : '去买房专区' }}
      </button>
    </EmptyState>
  </div>
</template>

<style scoped>
.intent {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
  align-items: flex-start;
}
.intent__art {
  width: 84px;
  height: 96px;
  flex: 0 0 84px;
  border-radius: 12px;
  background: linear-gradient(160deg, #EAF6FF, #D3ECF7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.intent__art svg { height: 84px; width: auto; }
.intent__body { flex: 1; min-width: 0; }
.intent__head { display: flex; align-items: center; gap: 8px; }
.intent__title { font-size: 14.5px; font-weight: 900; cursor: pointer; }
.intent__meta { font-size: 11.5px; color: var(--ink3); margin-top: 4px; }
.dot { margin: 0 6px; }
.intent__msg {
  margin: 8px 0 0;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink2);
  background: #F7FAFB;
  border-radius: 8px;
  padding: 8px 10px;
}
.intent__foot { display: flex; align-items: baseline; gap: 12px; margin-top: 8px; }
.intent__price { font-size: 15px; font-weight: 900; color: #d9541f; }
.intent__list { font-size: 11.5px; color: var(--ink3); }
.intent__off { font-size: 11px; color: #1f8a5b; }
.intent__acts { display: flex; gap: 8px; margin-top: 10px; }
.tab__n { font-style: normal; margin-left: 4px; font-size: 10px; opacity: .7; }
</style>

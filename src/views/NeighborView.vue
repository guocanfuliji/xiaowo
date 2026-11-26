<script setup>
/** 邻居与好友：关系管理 + 社区动态 */
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import CharAvatar from '@/components/CharAvatar.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  state, charOf, toggleFriendRelation, removeFriend, likeFeed, pushMessage, toast
} from '@/stores/app.js'
import { DISTRICTS } from '@/data/seed.js'

const router = useRouter()
const tab = ref('all')

const list = computed(() => {
  if (tab.value === 'all') return state.friends
  return state.friends.filter((f) => f.relation === tab.value)
})

const online = computed(() => state.friends.filter((f) => f.status === 'online'))

const byDistrict = computed(() => {
  const map = {}
  state.friends.forEach((f) => { map[f.district] = (map[f.district] || 0) + 1 })
  return DISTRICTS.map((d) => ({ ...d, n: map[d.id] || 0 })).filter((d) => d.n > 0)
})

function greet(f) {
  pushMessage('friend', `你向 ${charOf(f.charId).name} 打了招呼`, '对方收到后会回复你，快去打个招呼吧。')
  toast(`已向 ${charOf(f.charId).name} 打招呼`)
}

function invite(f) {
  pushMessage('house', `邀请 ${charOf(f.charId).name} 看房`, '已发送你收藏的房源链接，等待对方回应。')
  toast('邀请已发送')
}
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>邻居与好友</h1>
        <p>{{ state.friends.length }} 位关系 · {{ online.length }} 位在线 · 比奇堡是个温暖的社区</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="router.push('/message')">消息中心</button>
      </div>
    </div>

    <div class="two-col">
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
          <div class="card__title">我的邻居圈</div>
          <div class="tabs">
            <button :class="{ 'is-on': tab === 'all' }" @click="tab = 'all'">全部</button>
            <button :class="{ 'is-on': tab === '好友' }" @click="tab = '好友'">好友</button>
            <button :class="{ 'is-on': tab === '邻居' }" @click="tab = '邻居'">邻居</button>
            <button :class="{ 'is-on': tab === '房东' }" @click="tab = '房东'">房东</button>
          </div>
        </div>

        <div v-if="list.length" style="margin-top:14px">
          <div v-for="f in list" :key="f.id" class="row" style="margin-bottom:10px">
            <div style="position:relative;flex:0 0 46px">
              <CharAvatar :char="charOf(f.charId)" :size="46" />
              <i
                class="online"
                :style="f.status === 'online' ? '' : 'background:#c3d2d3'"
                style="right:-2px;bottom:-2px"
              ></i>
            </div>
            <div class="row__main">
              <b>{{ charOf(f.charId).name }} <span class="badge badge--mint">{{ f.relation }}</span></b>
              <span>{{ DISTRICTS.find(d => d.id === f.district)?.name }} · {{ f.lastActive }}活跃 · {{ f.note }}</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
              <button class="btn btn--primary" style="height:30px;padding:0 12px;font-size:11.5px" @click="greet(f)">打招呼</button>
              <button class="btn btn--ghost" style="height:30px;padding:0 12px;font-size:11.5px" @click="invite(f)">邀看房</button>
              <button class="btn btn--ghost" style="height:30px;padding:0 12px;font-size:11.5px" @click="toggleFriendRelation(f.id)">改关系</button>
              <button class="btn btn--ghost" style="height:30px;padding:0 12px;font-size:11.5px;color:#bb2b36" @click="removeFriend(f.id)">移除</button>
            </div>
          </div>
        </div>
        <EmptyState v-else icon="icx-users" title="这里还没有人" desc="添加好友后，租房信息可以互相分享。" />
      </div>

      <div>
        <div class="card">
          <div class="card__title">社区动态</div>
          <div class="card__desc">看看邻居们最近在聊什么</div>
          <div style="margin-top:12px">
            <div v-for="fd in state.feeds" :key="fd.id" style="padding:12px 0;border-top:1px dashed rgba(18,60,63,.1)">
              <div style="display:flex;gap:10px;align-items:flex-start">
                <CharAvatar :char="charOf(fd.charId)" :size="34" />
                <div style="flex:1;min-width:0">
                  <b style="font-size:12.5px">{{ charOf(fd.charId).name }}</b>
                  <span class="tl__time" style="margin-left:8px">{{ fd.time }}</span>
                  <p style="font-size:12.5px;color:var(--ink2);line-height:1.65;margin-top:4px">{{ fd.text }}</p>
                  <div style="display:flex;gap:14px;margin-top:8px;font-size:11.5px;color:var(--ink3)">
                    <button style="color:var(--sea);font-weight:800" @click="likeFeed(fd.id)">♥ {{ fd.likes }}</button>
                    <span>💬 {{ fd.comments }}</span>
                    <span>↗ 分享</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">关系分布</div>
          <div class="card__desc">你的好友都在哪些街区</div>
          <div style="margin-top:12px">
            <div v-for="d in byDistrict" :key="d.id" style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px">
                <b style="font-weight:800">{{ d.name }}</b><span style="color:var(--ink2)">{{ d.n }} 人</span>
              </div>
              <div class="progress" style="margin-top:5px">
                <i :style="{ width: (d.n / Math.max(...byDistrict.map(x => x.n))) * 100 + '%' }"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

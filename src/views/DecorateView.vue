<script setup>
/** 房屋装修：主题切换 + 家具目录 + 网格拖放布置 + 预算统计 */
import { computed, ref } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import {
  state, setDecorTheme, placeFurniture, moveFurniture,
  removeFurniture, clearDecor, money, toast
} from '@/stores/app.js'
import { FURNITURE, DECOR_THEMES } from '@/data/seed.js'

const COLS = 6
const ROWS = 2

const theme = computed(() => DECOR_THEMES[state.decor.theme] || DECOR_THEMES[0])
const dragUid = ref('')
const overCell = ref('')

const placed = computed(() =>
  state.decor.placed.map((p) => ({ ...p, item: FURNITURE.find((f) => f.id === p.id) })).filter((p) => p.item)
)

const total = computed(() => placed.value.reduce((s, p) => s + p.item.price, 0))

function occupied(gx, gy, w, h, exceptUid = '') {
  return placed.value.some((p) => {
    if (p.uid === exceptUid) return false
    return !(gx + w <= p.gx || p.gx + p.item.w <= gx || gy + h <= p.gy || p.gy + p.item.h <= gy)
  })
}

function findSlot(w, h) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x + w > COLS || y + h > ROWS) continue
      if (!occupied(x, y, w, h)) return { gx: x, gy: y }
    }
  }
  return null
}

function add(it) {
  const slot = findSlot(it.w, it.h)
  if (!slot) return toast('房间放不下了，先移除几件家具吧', 'warn')
  placeFurniture(it.id, slot.gx, slot.gy)
  toast(`已放置「${it.name}」`)
}

function onDragStart(uid2) { dragUid.value = uid2 }
function onDragEnd() { dragUid.value = ''; overCell.value = '' }

function onDrop(gx, gy) {
  const uid2 = dragUid.value
  if (!uid2) return
  const p = placed.value.find((x) => x.uid === uid2)
  if (!p) return
  if (gx + p.item.w > COLS || gy + p.item.h > ROWS) return toast('超出房间范围', 'warn')
  if (occupied(gx, gy, p.item.w, p.item.h, uid2)) return toast('这里已经被占用了', 'warn')
  moveFurniture(uid2, gx, gy)
  overCell.value = ''
}

function clearAll() {
  clearDecor()
  toast('房间已清空', 'warn')
}

function autoDecorate() {
  state.decor.placed.splice(0, state.decor.placed.length)
  const pick = ['sofa', 'lamp', 'table', 'plant', 'painting', 'rug', 'tv', 'bed']
  pick.forEach((id) => {
    const it = FURNITURE.find((f) => f.id === id)
    if (!it) return
    const slot = findSlot(it.w, it.h)
    if (slot) placeFurniture(it.id, slot.gx, slot.gy)
  })
  toast('已为你自动布置！')
}

const cats = computed(() => {
  const map = {}
  FURNITURE.forEach((f) => { (map[f.cat] = map[f.cat] || []).push(f) })
  return map
})
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h1>房屋装修</h1>
        <p>拖动家具自由布置你的海底小屋，切换主题看看不同风格。</p>
      </div>
      <div class="page-head__acts">
        <button class="btn btn--ghost" @click="autoDecorate">一键布置</button>
        <button class="btn btn--ghost" @click="clearAll">清空房间</button>
      </div>
    </div>

    <div class="deco">
      <!-- 房间 -->
      <div>
        <div class="card" style="padding:16px">
          <div class="room deco-wrap">
            <svg viewBox="0 0 400 300">
              <!-- 墙 -->
              <rect x="0" y="0" width="400" height="180" :fill="theme.wall" />
              <!-- 地板 -->
              <rect x="0" y="180" width="400" height="120" :fill="theme.floor" />
              <!-- 地板纹理 -->
              <g stroke="rgba(0,0,0,.07)" stroke-width="2">
                <path d="M0 210h400M0 240h400M0 270h400" />
                <path d="M60 180v120M140 180v120M220 180v120M300 180v120" />
              </g>
              <!-- 舷窗（海底景） -->
              <circle cx="318" cy="72" r="46" fill="#BFE9F5" stroke="#fff" stroke-width="7" />
              <circle cx="318" cy="72" r="40" fill="#9FDCF0" />
              <path d="M286 88q10-12 20 0t26 0" stroke="#5FBFD8" stroke-width="4" fill="none" stroke-linecap="round" />
              <circle cx="300" cy="58" r="5" fill="#FFE9A8" />
              <g fill="#4FA98A" opacity=".8">
                <path d="M296 108q6-24 2-40" stroke="#4FA98A" stroke-width="4" fill="none" stroke-linecap="round" />
                <path d="M334 110q-6-26 2-42" stroke="#4FA98A" stroke-width="4" fill="none" stroke-linecap="round" />
              </g>
              <circle cx="318" cy="72" r="46" fill="none" :stroke="theme.accent" stroke-width="3" opacity=".5" />
              <!-- 挂画 -->
              <rect x="44" y="46" width="72" height="52" rx="6" fill="#fff" stroke="#d9c9a8" stroke-width="4" />
              <path d="M52 88l16-20 12 14 10-10 14 16z" :fill="theme.accent" opacity=".8" />
              <!-- 踢脚线 -->
              <rect x="0" y="174" width="400" height="8" :fill="theme.accent" opacity=".35" />
              <!-- 地毯 -->
              <ellipse cx="150" cy="252" rx="110" ry="26" :fill="theme.accent" opacity=".28" />
              <!-- 小蜗 -->
              <g transform="translate(58 236)">
                <ellipse cx="0" cy="16" rx="22" ry="5" fill="rgba(0,0,0,.12)" />
                <circle cx="0" cy="0" r="15" fill="#9BC4D6" />
                <path d="M0 -15a15 15 0 0 1 0 30" fill="#7FB2C8" />
                <circle cx="-5" cy="-3" r="3.4" fill="#fff" />
                <circle cx="6" cy="-3" r="3.4" fill="#fff" />
                <circle cx="-4.4" cy="-2.6" r="1.7" fill="#123c3f" />
                <circle cx="6.6" cy="-2.6" r="1.7" fill="#123c3f" />
                <path d="M-3 5q4 4 8 0" stroke="#123c3f" stroke-width="1.6" fill="none" stroke-linecap="round" />
              </g>
            </svg>

            <!-- 家具网格 -->
            <div class="deco-grid">
              <div
                v-for="c in COLS * ROWS"
                :key="c"
                class="deco-cell"
                :class="{ 'is-over': overCell === c }"
                :style="{ gridColumn: ((c - 1) % COLS) + 1, gridRow: Math.floor((c - 1) / COLS) + 1 }"
                @dragover.prevent="overCell = c"
                @dragleave="overCell = ''"
                @drop="onDrop((c - 1) % COLS, Math.floor((c - 1) / COLS))"
              ></div>

              <div
                v-for="p in placed"
                :key="p.uid"
                class="deco-item"
                :class="{ 'is-drag': dragUid === p.uid }"
                draggable="true"
                :style="{
                  gridColumn: (p.gx + 1) + ' / span ' + p.item.w,
                  gridRow: (p.gy + 1) + ' / span ' + p.item.h
                }"
                :title="p.item.name + ' · ' + money(p.item.price)"
                @dragstart="onDragStart(p.uid)"
                @dragend="onDragEnd"
              >
                <span>{{ p.item.icon }}</span>
                <button class="deco-item__del" @click="removeFurniture(p.uid)">×</button>
              </div>
            </div>
          </div>

          <div class="deco-budget">
            <span>已放置 {{ placed.length }} 件家具</span>
            <span>布置总花费 <b>{{ money(total) }}</b></span>
          </div>
        </div>
      </div>

      <!-- 面板 -->
      <div>
        <div class="card">
          <div class="card__title">房间主题</div>
          <div class="card__desc">切换墙面与地板配色</div>
          <div class="themes" style="margin-top:12px">
            <button
              v-for="(t, i) in DECOR_THEMES"
              :key="t.id"
              class="theme"
              :class="{ 'is-on': state.decor.theme === i }"
              @click="setDecorTheme(i)"
            >
              <span class="theme__mini" :style="{ color: t.accent }">
                <i :style="{ background: t.wall }"></i>
                <i :style="{ background: t.floor }"></i>
                <i></i>
              </span>
              <span class="theme__txt">
                <b>{{ t.name }}</b>
                <span>墙面 / 地板 / 点缀</span>
              </span>
            </button>
          </div>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card__title">家具商城</div>
          <div class="card__desc">点击加入房间，可在房间内拖动调整位置</div>

          <div v-for="(list, cat) in cats" :key="cat">
            <div class="sub-title">{{ cat }}</div>
            <div class="furniture">
              <button
                v-for="it in list"
                :key="it.id"
                class="fur"
                :title="it.name + ' · ' + money(it.price) + ' · 占 ' + it.w + '×' + it.h + ' 格'"
                @click="add(it)"
              >
                <span>{{ it.icon }}</span>
                {{ it.name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

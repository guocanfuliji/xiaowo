<script setup>
/** 开场动画：菠萝屋坠落 → 小蜗出场 → LOGO 弹跳（与主题一致的分镜） */
import { ref, onMounted, onBeforeUnmount } from 'vue'
import SvgIcon from './SvgIcon.vue'

const emit = defineEmits(['done'])

const done = ref(false)
const rock = ref(false)
const moai = ref(false)
const main = ref(false)
const shake = ref(false)
const boom = ref(false)
const gary = ref(false)
const bubble = ref(false)
const logo = ref(false)
const loading = ref(false)
const bubbles = ref([])

let timers = []

onMounted(() => {
  const n = 20
  const list = []
  for (let i = 0; i < n; i++) {
    const size = 5 + Math.random() * 22
    list.push({
      left: Math.random() * 100 + '%',
      size: size + 'px',
      dur: (6 + Math.random() * 9).toFixed(1) + 's',
      delay: (-Math.random() * 10).toFixed(1) + 's',
      dx: (Math.random() * 50 - 25).toFixed(0) + 'px'
    })
  }
  bubbles.value = list

  const at = (t, fn) => timers.push(setTimeout(fn, t))
  at(320, () => { rock.value = true; moai.value = true })
  at(760, () => { main.value = true; shake.value = true; boom.value = true })
  at(1180, () => { shake.value = false })
  at(1320, () => { boom.value = false })
  at(1560, () => { gary.value = true })
  at(2000, () => { bubble.value = true })
  at(2500, () => { logo.value = true; loading.value = true })
  at(4400, finish)
})

function finish() {
  if (done.value) return
  done.value = true
  emit('done')
}

function skip() {
  timers.forEach(clearTimeout)
  timers = []
  finish()
}

onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="intro" :class="{ 'is-done': done, 'is-load': loading, shake: shake }">
    <div class="intro__bg"></div>
    <div class="intro__veil"></div>
    <div class="intro__rays"></div>
    <div class="intro__bubbles">
      <i
        v-for="(b, i) in bubbles"
        :key="i"
        :style="{ left: b.left, width: b.size, height: b.size, animationDuration: b.dur, animationDelay: b.delay, '--dx': b.dx }"
      ></i>
    </div>

    <div class="intro__jelly jl1"><SvgIcon name="jelly" /></div>
    <div class="intro__jelly jl2"><SvgIcon name="jelly" /></div>
    <div class="intro__jelly jl3"><SvgIcon name="jelly" /></div>

    <div class="intro__stage" :class="{ 'is-dim': logo }">
      <div class="intro__sand"></div>

      <div class="ihouse ihouse--rock" :class="{ 'is-pop': rock }">
        <svg viewBox="0 0 120 150"><use href="#h-rock" /></svg>
      </div>

      <div class="ihouse ihouse--main" :class="{ 'is-drop': main }">
        <svg class="ihouse__svg" viewBox="0 0 120 150"><use href="#h-pineapple" /></svg>
        <div class="ihouse__gary" :class="{ 'is-on': gary }">
          <svg viewBox="0 0 100 100"><use href="#ch-gary" /></svg>
        </div>
        <div class="ihouse__bubble" :class="{ 'is-on': bubble }">喵～欢迎回家</div>
        <div class="ihouse__boom" :class="{ 'is-on': boom }">咚！</div>
      </div>

      <div class="ihouse ihouse--moai" :class="{ 'is-pop': moai }">
        <svg viewBox="0 0 120 150"><use href="#h-moai" /></svg>
      </div>
    </div>

    <div class="intro__logo" :class="{ 'is-on': logo }">
      <div class="intro__mark"><svg viewBox="0 0 100 100"><use href="#ch-gary" /></svg></div>
      <div class="intro__title">小蜗</div>
      <div class="intro__sub">比奇堡租房 · 从一间菠萝屋开始</div>
      <div class="intro__load"><i></i></div>
    </div>

    <button class="intro__skip" @click="skip">跳过 ›</button>
  </div>
</template>

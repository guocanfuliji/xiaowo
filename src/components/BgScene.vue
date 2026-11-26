<script setup>
/** 比奇堡全景背景 + 上浮气泡 */
import { onMounted, ref } from 'vue'

const bubbles = ref([])

onMounted(() => {
  const list = []
  for (let i = 0; i < 22; i++) {
    const size = 6 + Math.random() * 26
    list.push({
      left: Math.random() * 100 + '%',
      size: size + 'px',
      dur: (11 + Math.random() * 16).toFixed(1) + 's',
      delay: (-Math.random() * 20).toFixed(1) + 's',
      dx: (Math.random() * 60 - 30).toFixed(0) + 'px'
    })
  }
  bubbles.value = list
})
</script>

<template>
  <div class="bg" aria-hidden="true">
    <div class="bg__img"></div>
    <div class="bg__tint"></div>
    <div class="bg__bubbles">
      <i
        v-for="(b, i) in bubbles"
        :key="i"
        :style="{ left: b.left, width: b.size, height: b.size, animationDuration: b.dur, animationDelay: b.delay, '--dx': b.dx }"
      ></i>
    </div>
  </div>
</template>

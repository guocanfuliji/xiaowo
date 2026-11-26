<script setup>
import SvgIcon from './SvgIcon.vue'
defineProps({
  icon: { type: String, default: 'h-shell' },
  title: { type: String, default: '这里还空着' },
  desc: { type: String, default: '' }
})
</script>

<template>
  <div class="empty">
    <svg viewBox="0 0 120 150"><use :href="'#' + icon" /></svg>
    <b>{{ title }}</b>
    <span>{{ desc }}</span>
    <slot />
  </div>
</template>

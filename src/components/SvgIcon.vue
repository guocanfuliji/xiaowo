<script setup>
/** 统一的 SVG symbol 引用组件：<SvgIcon name="h-pineapple" /> */
defineProps({
  name: { type: String, required: true },
  cls: { type: String, default: '' }
})
</script>

<template>
  <svg :class="cls" aria-hidden="true">
    <use :href="'#' + name" />
  </svg>
</template>

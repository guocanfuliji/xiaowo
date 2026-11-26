<script setup>
/**
 * 角色头像（全站唯一入口）
 *
 * 渲染哪张脸由 resolveAvatar 决定：用户选的 avatarId 优先，没选过就退回该角色的默认图，
 * 都没有才回落成原来的 svg 图标（老数据 / 空值 / 图被下架时的兜底）。
 *
 * bare=true 用于外层已经有圆形裁剪的场景（顶栏 .top-avatar、选头像 .av / .auth__char）：
 * 此时直接输出 <img> / <SvgIcon> 本体，不套壳——父容器多是 display:grid，包一层再写
 * width/height:100% 会塌成奇怪的尺寸。
 */
import { computed } from 'vue'
import SvgIcon from './SvgIcon.vue'
import { resolveAvatar } from '@/data/seed.js'

const props = defineProps({
  char: { type: Object, default: null },
  avatarId: { type: String, default: '' },
  size: { type: [Number, String], default: 48 },
  bare: { type: Boolean, default: false },
  cls: { type: String, default: '' }
})

const av = computed(() => resolveAvatar(props.avatarId, props.char && props.char.id))
const img = computed(() => (av.value ? av.value.img : ''))
const alt = computed(() => (av.value ? av.value.label : (props.char && props.char.name) || '头像'))

const box = computed(() => {
  const s = typeof props.size === 'number' ? props.size + 'px' : props.size
  return { width: s, height: s, flex: `0 0 ${s}` }
})
const svgName = computed(() => (props.char && props.char.svg) || 'ch-gary')
</script>

<template>
  <img
    v-if="bare && img"
    class="chimg-img"
    :src="img"
    :alt="alt"
    loading="lazy"
    draggable="false"
  />
  <SvgIcon v-else-if="bare" :name="svgName" :cls="cls" />

  <span v-else class="chimg" :class="[cls, { 'chimg--photo': img }]" :style="box">
    <img v-if="img" :src="img" :alt="alt" loading="lazy" draggable="false" />
    <SvgIcon v-else :name="svgName" />
  </span>
</template>

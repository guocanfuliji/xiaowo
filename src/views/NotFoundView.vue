<script setup>
import { useRouter } from 'vue-router'
import SvgIcon from '@/components/SvgIcon.vue'

const router = useRouter()
</script>

<template>
  <div class="empty" style="padding-top:60px">
    <svg viewBox="0 0 120 150" style="width:120px;height:150px;margin:0 auto 16px">
      <use href="#h-shell" />
    </svg>
    <b style="font-size:18px">404 · 这个贝壳屋里什么都没有</b>
    <span>页面可能已被下架，或者地址输错了。</span>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">
      <button class="btn btn--primary" @click="router.push('/')">
        <SvgIcon name="ic-home" cls="ic" /> 回到首页
      </button>
      <button class="btn btn--ghost" @click="router.back()">返回上一页</button>
    </div>
  </div>
</template>

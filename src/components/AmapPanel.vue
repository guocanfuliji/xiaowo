<script setup>
/**
 * 高德地图面板（JS API 2.0）
 * - Key 从 .env 的 VITE_AMAP_KEY 读，不写死在代码里
 * - 没配 Key 时本组件不渲染，由 MapView 回落到手绘示意图
 */
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  markers: { type: Array, default: () => [] },
  activeId: { type: String, default: '' }
})
const emit = defineEmits(['select'])

const KEY = import.meta.env.VITE_AMAP_KEY || ''
const SECURITY = import.meta.env.VITE_AMAP_SECURITY || ''

const el = ref(null)
const failed = ref('')
let map = null
let pins = new Map()
let ro = null

const money = (n) => '¥' + Number(n || 0).toLocaleString('zh-CN')

/** 未选中的气泡用紧凑写法（¥1.4k），选中的才展开成完整价格，否则十几个气泡在小地图上糊成一片 */
const shortMoney = (n) => {
  const v = Number(n || 0)
  return v >= 1000 ? '¥' + (v / 1000).toFixed(1) + 'k' : '¥' + v
}

const markerHtml = (h, on) =>
  `<div class="amap-pin${on ? ' is-active' : ''}">${on ? money(h.price) : shortMoney(h.price)}</div>`

function loadSdk() {
  if (window.AMap) return Promise.resolve()
  return new Promise((resolve, reject) => {
    if (SECURITY) window._AMapSecurityConfig = { securityJsCode: SECURITY }
    const s = document.createElement('script')
    // plugin= 必须写进 URL，否则 AMap.Scale 之类是 undefined
    s.src = `https://webapi.amap.com/maps?v=2.0&plugin=AMap.Scale&key=${encodeURIComponent(KEY)}`
    s.onload = () => (window.AMap ? resolve() : reject(new Error('AMap 未挂载')))
    s.onerror = () => reject(new Error('SDK 加载失败'))
    document.head.appendChild(s)
  })
}

/** 房源只有十几个，按点数量给个固定级别比 setFitView 更稳，也不会把气泡挤成一团 */
function fit(markers) {
  if (!map || !markers.length) return
  const lngs = markers.map((h) => h.lng)
  const lats = markers.map((h) => h.lat)
  const center = [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2
  ]
  const zoom = markers.length > 3 ? 13 : markers.length > 1 ? 14 : 16
  map.setZoomAndCenter(zoom, center)
}

function draw() {
  if (!map) return
  pins.forEach((m) => m.setMap(null))
  pins = new Map()
  props.markers.forEach((h) => {
    const on = h.id === props.activeId
    const m = new window.AMap.Marker({
      position: [h.lng, h.lat],
      content: markerHtml(h, on),
      offset: new window.AMap.Pixel(-26, -34),
      title: h.title,
      zIndex: on ? 120 : 100
    })
    m.on('click', () => emit('select', h.id))
    m.setMap(map)
    pins.set(h.id, m)
  })
  fit(props.markers)
}

onMounted(async () => {
  try {
    await loadSdk()
    map = new window.AMap.Map(el.value, {
      zoom: 13,
      center: [118.0825, 24.448],
      viewMode: '2D',
      resizeEnable: true
    })
    // 控件是锦上添花，缺插件不该让整张地图报错
    try {
      if (window.AMap.Scale) map.addControl(new window.AMap.Scale())
    } catch (e) {
      /* 忽略：没加载到 Scale 插件时不影响地图本身 */
    }
    draw()
    // 容器尺寸变了（比如右侧列表变长、窗口缩放）要让高德重算画布
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => {
        if (map && typeof map.resize === 'function') map.resize()
      })
      ro.observe(el.value)
    }
  } catch (e) {
    failed.value = e.message || '地图加载失败'
  }
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
  ro = null
  pins.forEach((m) => m.setMap(null))
  pins = new Map()
  if (map) map.destroy()
  map = null
})

watch(() => props.markers, () => draw(), { deep: true })

watch(
  () => props.activeId,
  (id) => {
    const h = props.markers.find((x) => x.id === id)
    pins.forEach((m, key) => {
      const item = props.markers.find((x) => x.id === key)
      if (item) m.setContent(markerHtml(item, key === id))
    })
    if (h && map) map.setZoomAndCenter(16, [h.lng, h.lat])
  }
)
</script>

<template>
  <div class="amap-wrap">
    <div ref="el" class="amap-canvas"></div>
    <div v-if="failed" class="amap-err">
      <b>地图加载失败</b>
      <span>{{ failed }}。请检查 Key 是否开通了 Web 端（JS API）服务，以及 Referer 白名单是否包含当前域名。</span>
    </div>
  </div>
</template>

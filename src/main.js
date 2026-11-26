import { createApp } from 'vue'
import router from './router'
import App from './App.vue'
import './styles/main.css'
import { bootstrap } from './stores/app.js'
import { refreshMe } from './stores/auth.js'

// 先校验本地 token 是否还有效（失效就清掉，回到游客态），再拉全量数据；两者都失败也照常挂载
refreshMe()
  .catch(() => null)
  .finally(() => {
    bootstrap().finally(() => {
      createApp(App).use(router).mount('#app')
    })
  })

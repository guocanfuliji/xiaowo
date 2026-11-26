/**
 * 小蜗 · 端到端冒烟测试（puppeteer-core + 本机 Chrome）
 * 前置：后端(3001) + 前端(默认 5173) 均已启动
 * 用法：npm test             （前端占用其它端口时：APP_PORT=5180 npm test）
 */
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PORT = process.env.APP_PORT || 5173
const APP = `http://127.0.0.1:${PORT}/#`
const API = process.env.API_URL || 'http://127.0.0.1:3001/api'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const results = []
const errors = []
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond, extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== '' ? '  [' + extra + ']' : ''}`)
}

const getJson = async (p) => {
  const r = await fetch(API + p)
  return r.json()
}

const postJson = (p, payload, tk) => fetch(API + p, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: 'Bearer ' + tk } : {}) },
  body: JSON.stringify(payload || {})
})

/* ---------- 0. 账号体系：未登录只读 / 注册 / 登录 ---------- */
const anonPost = await postJson('/community/posts', { district: 'center', title: '未登录发帖', content: 'should be blocked' })
ok('未登录的写操作被拒绝', anonPost.status === 401, 'HTTP ' + anonPost.status)

const badPwd = await postJson('/auth/login', { account: '小蜗', password: 'wrong-pwd' })
ok('密码错误返回 401', badPwd.status === 401)

const regPhone = '139' + String(Date.now()).slice(-8)
const regRes = await (await postJson('/auth/register', { name: '冒烟租客', phone: regPhone, password: 'abc123', charId: 'sandy' })).json()
ok('注册新账号成功', regRes?.ok === true && !!regRes.data.token, regRes?.data?.user?.name || regRes?.error)
ok('新账号是独立用户', regRes?.data?.user?.id !== 'U1001', regRes?.data?.user?.id)
const dupRes = await (await postJson('/auth/register', { name: '冒烟租客乙', phone: regPhone, password: 'abc123' })).json()
ok('重复手机号被拒绝', dupRes?.ok === false && /已注册/.test(dupRes.error || ''), dupRes?.error)

const LOGIN = async () => {
  const r = await postJson('/auth/login', { account: '小蜗', password: '123456' })
  const j = await r.json()
  return (j.ok && j.data.token) || ''
}
let token = await LOGIN()
ok('演示账号可登录', !!token, token ? 'token 已签发' : '登录失败')

const apiFetch = (p, opts = {}) => fetch(API + p, {
  ...opts,
  headers: {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
    ...(token ? { Authorization: 'Bearer ' + token } : {})
  }
})

/* ---------- 0.1 环境准备：确认后端在线并重置数据 ---------- */
let health = null
try {
  health = await getJson('/health')
  ok('后端在线', health.ok === true, health?.data?.connection)
  ok('已连接数据库', ['mysql', 'sqlite'].includes(health?.data?.dialect), health?.data?.dialect)
  const rds = health?.data?.redis
  // Redis 是可选增强层：没配置、或连不上已降级为数据库模式，都不算失败
  ok('Redis 状态正常（可选）', rds ? (!rds.enabled || rds.connected || rds.mode === 'db') : true,
    rds ? `${rds.mode}${rds.mode === 'db' ? ' · 已降级，业务不受影响' : ''}${rds.error ? ' / ' + rds.error : ''}` : '未配置')
} catch (e) {
  ok('后端在线', false, '请先 npm run server')
}
if (health?.ok) await apiFetch('/reset', { method: 'POST' })
await sleep(400)
token = await LOGIN()   // 重置会清空所有会话，重新登录再继续
const boot = await (await apiFetch('/bootstrap')).json()
ok('快照接口返回种子数据', boot?.data?.houses?.length >= 14, boot?.data?.houses?.length + ' 套房源')
ok('「我的房源」有数据', boot?.data?.houses?.filter((h) => h.ownerId === 'gary').length === 3, '3 套')
ok('二手房种子已就位', boot?.data?.houses?.filter((h) => h.trade === 'sale').length >= 4, boot?.data?.houses?.filter((h) => h.trade === 'sale').length + ' 套')
ok('购房意向随快照下发', Array.isArray(boot?.data?.saleIntents) && boot.data.saleIntents.length >= 2, boot?.data?.saleIntents?.length + ' 条')

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--window-size=1440,900']
})
const page = await browser.newPage()
await page.setViewport({ width: 1440, height: 900 })
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
page.on('response', (r) => {
  if (r.status() !== 401) return
  const req = r.request()
  console.log(`  [401] ${req.method()} ${r.url()} auth=${!!req.headers()['authorization']}`)
})
page.on('dialog', async (d) => { await d.accept() })
/** 记下页面实际发过的 /api 请求，用来验证「进页会重新拉取」这类行为 */
const apiHits = []
page.on('request', (r) => {
  const u = r.url()
  const i = u.indexOf('/api/')
  if (i >= 0) apiHits.push(u.slice(i + 5).split('?')[0])
})

const goto = async (hash) => {
  await page.goto(APP + hash + '?skipintro=1', { waitUntil: 'domcontentloaded', timeout: 20000 })
  await sleep(650)
}
const clickText = (txt, sel = '.btn') =>
  page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((b) => b.textContent.includes(t))
    if (el) el.click()
    return !!el
  }, txt, sel)
const count = (sel) => page.$$eval(sel, (e) => e.length).catch(() => 0)

/* ---------- 0.2 UI 登录：浏览器从这里开始持有 token ---------- */
await goto('/login')
await page.type('.auth__card input[type=text]', '小蜗')
await page.type('.auth__card input[type=password]', '123456')
await page.click('.auth__card .btn--primary')
await sleep(1500)
const chipName = await page.$eval('.user-chip b', (e) => e.textContent.trim()).catch(() => '')
ok('UI 登录后顶栏显示昵称', chipName === '小蜗', chipName || '未取到')
const storedToken = await page.evaluate(() => localStorage.getItem('xw-token') || '')
ok('登录 token 已落到本地', storedToken.length > 20, storedToken ? 'len=' + storedToken.length : '空')

/* ---------- 1. 首页 ---------- */
await goto('/')
const cards = await count('.hcard')
ok('首页渲染房源卡片', cards >= 8, cards)
ok('首页数据来自后端', (await page.$eval('.sec-head__more b', (e) => e.textContent)).length > 0)

/* ---------- 2. 筛选 ---------- */
await page.select('.filters select', 'center')
await sleep(340)
const filtered = await count('.hcard')
ok('街区筛选生效', filtered > 0 && filtered < cards, `${cards} → ${filtered}`)

/* ---------- 3. 搜索 ---------- */
await goto('/')
await page.type('.topsearch input', '菠萝屋')
await page.keyboard.press('Enter')
await sleep(480)
ok('搜索命中结果', (await count('.hcard')) > 0, await count('.hcard'))

/* ---------- 4. 详情 ---------- */
await goto('/house/H1001')
ok('详情页标题', (await page.$eval('.detail__title', (e) => e.textContent)).includes('菠萝屋'))
ok('详情页参数区', (await count('.detail__facts .fact')) === 4, await count('.detail__facts .fact'))
ok('详情页评价区', (await count('.comment')) > 0, await count('.comment'))

/* ---------- 5. 收藏（含落库校验） ---------- */
const favBefore = await page.$$eval('.menu__item .tag', (e) => e.map((x) => x.textContent).join(','))
await clickText('收藏')
await sleep(500)
const favAfter = await page.$$eval('.menu__item .tag', (e) => e.map((x) => x.textContent).join(','))
ok('详情页收藏改变侧栏计数', favBefore !== favAfter, `${favBefore} → ${favAfter}`)
const favApi = await getJson('/favorites')
ok('收藏已写入数据库', Array.isArray(favApi.data) && favApi.data.length === 4, favApi.data?.length + ' 条')

/* ---------- 6. 预约（含落库） ---------- */
await goto('/booking')
const bkBefore = await count('.list .row')
await page.select('.card.form select', 'H1013')
await sleep(260)
await clickText('提交预约')
await sleep(750)
const bkAfter = await count('.list .row')
ok('提交预约新增记录', bkAfter === bkBefore + 1, `${bkBefore} → ${bkAfter}`)
const bkApi = await getJson('/bookings')
ok('预约已写入数据库', bkApi.data?.length === bkAfter, bkApi.data?.length + ' 条')

/* ---------- 7. 账单一键支付（含落库） ---------- */
await goto('/bill')
const kpiBefore = await page.$$eval('.kpi b', (e) => e.map((x) => x.textContent))
await clickText('确认支付')
await sleep(900)
const kpiAfter = await page.$$eval('.kpi b', (e) => e.map((x) => x.textContent))
ok('一键缴清清空待付', kpiBefore[0] !== kpiAfter[0], `${kpiBefore[0]} → ${kpiAfter[0]}`)
const billApi = await getJson('/bills')
ok('账单状态已落库为已付', billApi.data.every((b) => b.status === 'paid'), billApi.data.filter((b) => b.status === 'paid').length + '/' + billApi.data.length)

/* ---------- 8. 装修（含落库） ---------- */
await goto('/decorate')
await clickText('清空房间')
await sleep(700)
const furBefore = await count('.deco-item')
await page.click('.fur')
await sleep(950)
const furAfter = await count('.deco-item')
ok('点击商城放置家具', furAfter === furBefore + 1, `${furBefore} → ${furAfter}`)
const decorApi = await getJson('/decor')
ok('装修方案已写入数据库', decorApi.data?.placed?.length === furAfter, decorApi.data?.placed?.length + ' 件')

/* ---------- 9. 发布房源（含落库） ---------- */
await goto('/publish')
await clickText('填入示例')
await sleep(340)
await clickText('提交并上架')
await sleep(900)
const newId = page.url().split('/house/')[1]
ok('发布后跳转新房源详情', !!newId && newId.startsWith('H'), newId)
const pubApi = await getJson('/houses/' + newId)
ok('新房源已写入数据库', pubApi.ok === true && pubApi.data?.id === newId, pubApi.data?.title)

/* ---------- 10. 消息已读（含落库） ---------- */
apiHits.length = 0
await goto('/message')
ok('消息页进页重新拉取', apiHits.includes('messages'), apiHits.filter((u) => u.startsWith('messages')).join(' ') || '没发请求')
const newBefore = await count('.msg--new')
await clickText('全部标记已读')
await sleep(520)
ok('消息全部已读', newBefore > 0 && (await count('.msg--new')) === 0, `${newBefore} → 0`)
const msgApi = await getJson('/messages')
ok('已读状态已落库', msgApi.data.every((m) => m.read), msgApi.data.length + ' 条')

/* ---------- 11. 侧栏导航 ---------- */
await goto('/')
const menuCount = await count('.menu__item[href]')
for (let i = 0; i < menuCount; i++) {
  const items = await page.$$('.menu__item[href]')
  await items[i].click()
  await sleep(320)
  const len = await page.$eval('.view-root', (e) => e.textContent.trim().length)
  if (len < 60) ok('导航异常 ' + (await page.evaluate(() => location.hash)), false, len)
}
ok('侧栏全部页面可达', true, menuCount + ' 个入口')

/* ---------- 12. 移动端 ---------- */
await page.setViewport({ width: 430, height: 900 })
for (const r of ['/', '/map', '/bill', '/decorate', '/publish', '/mine', '/house/H1001', '/community', '/sale', '/sale-orders', '/auction', '/auction/A1001', '/house/H2001']) {
  await goto(r)
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  ok('430px 无横向溢出 ' + r, over <= 1, over)
}
await page.setViewport({ width: 1440, height: 900 })

/* ---------- 13. 清空收藏 → 空态（含落库） ---------- */
await goto('/fav')
await clickText('清空收藏')
await sleep(700)
ok('清空收藏展示空态', (await count('.empty')) === 1)
const favEmpty = await (await apiFetch('/favorites')).json()
ok('清空收藏已落库', favEmpty.data?.length === 0, favEmpty.data?.length + ' 条')

/* ---------- 14. 恢复初始数据（会清空会话，必须重新登录） ---------- */
const tokenBeforeReset = token
await goto('/settings')
await clickText('恢复初始数据')
await sleep(1400)

const staleMe = await fetch(API + '/auth/me', { headers: { Authorization: 'Bearer ' + tokenBeforeReset } })
ok('重置后旧会话立即失效', staleMe.status === 401, 'HTTP ' + staleMe.status)

token = await LOGIN()
ok('重置后可重新登录', !!token, token ? 'token 已重新签发' : '登录失败')

/* resetAll() 会把内存里的 token 一起清掉，页面此刻是游客态；而 goto() 只换 hash
   属于同文档导航，不会重跑 main.js 的 refreshMe()。所以这里写回 localStorage 后
   必须整页 reload，让新 token 重新进到 session.token，后续写请求才带得上 Authorization。 */
await page.evaluate((t) => localStorage.setItem('xw-token', t), token)
await page.reload({ waitUntil: 'domcontentloaded' })
await sleep(1200)
const chipAfterReload = await page.$eval('.user-chip b', (e) => e.textContent.trim())
ok('刷新页面后仍保持登录', chipAfterReload !== '未登录', chipAfterReload)

await goto('/fav')
ok('恢复初始数据后收藏回归', (await count('.hcard')) === 3, await count('.hcard'))

/* ---------- 15. 邻里社区 ---------- */
await goto('/community')
const postCount = await count('.post')
ok('社区列表渲染帖子', postCount >= 6, postCount)

/* 头像库：有手绘图就走 <img>（naturalWidth > 0 说明 public/avatars 里的文件真的加载到了），
   小蜗没有图，回落成 svg，所以只校验「有图的都加载成功」 */
const avImgs = await page.$$eval('.post .chimg img', (els) =>
  els.map((e) => ({ src: e.getAttribute('src'), w: e.naturalWidth })))
ok('社区头像走图片库', avImgs.length > 0 && avImgs.every((i) => i.w > 0), `${avImgs.length} 张`)

await clickText('水母田', '.tabs button')
await sleep(800)
const jellyCount = await count('.post')
ok('按街区筛选生效', jellyCount > 0 && jellyCount < postCount, `${postCount} → ${jellyCount}`)

await clickText('全部街区', '.tabs button')
await sleep(800)
const likeBefore = (await page.$eval('.post .post__act', (e) => e.textContent.trim()))
await page.click('.post .post__act')
await sleep(1000)
const likeAfter = (await page.$eval('.post .post__act', (e) => e.textContent.trim()))
ok('点赞后计数变化', likeBefore !== likeAfter, `${likeBefore} → ${likeAfter}`)

await page.click('.post')
await sleep(1000)
const postId = await page.evaluate(() => location.hash.split('/').pop())
const detail = await getJson(`/community/posts/${postId}`)
ok('点赞已写入数据库', detail?.data?.liked === true, `liked=${detail?.data?.liked}`)

await page.type('.card textarea', '冒烟测试留言')
await clickText('发表')
await sleep(1200)
const cmtApi = await getJson(`/community/posts/${postId}/comments`)
ok('评论已写入数据库', cmtApi?.data?.some((c) => c.content.includes('冒烟测试留言')), `${cmtApi?.data?.length} 条`)

await goto('/community')
await clickText('发帖')
await sleep(500)
await page.type('.form input[type=text]', '冒烟测试：社区发帖')
await page.type('.form textarea', '这条帖子由自动化测试创建，验证后会被删除。')
await clickText('发布')
await sleep(1500)
const createdList = await getJson('/community/posts?sort=new&pageSize=8')
const created = createdList?.data?.items?.find((x) => x.title.includes('冒烟测试：社区发帖'))
ok('发帖已写入数据库', !!created, created?.id || '未找到')
if (created) await apiFetch(`/community/posts/${created.id}`, { method: 'DELETE' })

/* ---------- 16. 二手房买卖 ---------- */
await goto('/sale')
const saleCards = await count('.hcard')
ok('买房专区渲染在售房源', saleCards >= 3, saleCards)
const salePriceText = await page.$eval('.hcard .price', (e) => e.textContent)
ok('售房卡片按总价展示', salePriceText.includes('总价'), salePriceText)

await goto('/')
const rentOnly = await page.$$eval('.grid', (grids) =>
  grids[0] ? [...grids[0].querySelectorAll('.hcard .price')].map((e) => e.textContent) : [])
ok('租房首页不混入售房源', rentOnly.length > 0 && rentOnly.every((t) => t.includes('/月')), rentOnly.length + ' 张')

await goto('/house/H2001')
const saleDetail = await page.$eval('.detail__price small', (e) => e.textContent)
ok('售房详情显示总价与单价', saleDetail.includes('总价') && saleDetail.includes('/m²'), saleDetail.trim())

await page.$eval('.side-card input[type=number]', (el) => {
  el.value = ''
  el.dispatchEvent(new Event('input', { bubbles: true }))
})
await page.type('.side-card input[type=number]', '860000')
await clickText('提交购房意向')
await sleep(1200)
const buyerIntents = await getJson('/sale/intents?role=buyer')
const mineIntent = buyerIntents?.data?.items?.find((i) => i.houseId === 'H2001')
ok('购房意向已写入数据库', !!mineIntent && Number(mineIntent.price) === 860000, String(mineIntent?.price))

const accept = await (await apiFetch('/sale/intents/SI8001/accept', { method: 'POST' })).json()
ok('卖家确认意向成功', accept?.ok === true && accept?.data?.houseStatus === 'sold', accept?.data?.houseStatus)
const soldHouse = await getJson('/houses/H2002')
ok('确认后房源状态变为已售', soldHouse?.data?.status === 'sold', soldHouse?.data?.status)

await goto('/sale-orders')
const intentCards = await count('.intent')
ok('购房意向页渲染记录', intentCards >= 1, intentCards)

/* ---------- 16.5 头像库（头像与身份解耦） ---------- */
await goto('/profile')
const libCount = await count('.avatar-picker .av')
ok('头像库渲染全部图片', libCount >= 14, libCount + ' 块（14 张头像 + 7 个身份）')

const nameBefore = await page.$eval('.profile__head h1', (e) => e.textContent.trim())
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.avatar-picker .av')].find((x) => (x.title || '').includes('特写'))
  if (b) b.click()
})
await sleep(900)

const bigAv = await page.$eval('.profile__avatar img', (e) => ({ src: e.getAttribute('src'), w: e.naturalWidth })).catch(() => null)
ok('个人中心大头像同步为新头像', !!bigAv && bigAv.w > 0, bigAv ? `${bigAv.src} ${bigAv.w}px` : '仍是图标')

const avatarNow = await getJson('/user')
ok('换头像已写入数据库', !!avatarNow?.data?.avatar, avatarNow?.data?.avatar)
ok('换头像不改昵称', (await page.$eval('.profile__head h1', (e) => e.textContent.trim())) === nameBefore, nameBefore)

// 还原成小蜗的脸，别把演示账号留在测试用头像上
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.avatar-picker .av')].find((x) => (x.title || '') === '小蜗')
  if (b) b.click()
})
await sleep(700)

/* ---------- 16.6 法拍房：公开加价 + 最后 5 分钟延时 ---------- */
const bidPost = async (id, price) => {
  const r = await fetch(API + `/auctions/${id}/bids`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ price })
  })
  let j = null
  try { j = await r.json() } catch (e) { /* 非 JSON */ }
  return { status: r.status, json: j }
}

const aucList = await getJson('/auctions')
ok('拍卖接口返回场次', aucList?.data?.items?.length >= 4, (aucList?.data?.items?.length || 0) + ' 场')
ok('存在进行中的拍卖', Number(aucList?.data?.counts?.live) >= 3, aucList?.data?.counts?.live + ' 场进行中')

await goto('/auction')
const aucCards = await count('.auc-card')
ok('法拍房页渲染拍卖卡片', aucCards >= 3, aucCards + ' 张')

await goto('/auction/A1001')
const aucBig = await page.$eval('.auc-bigprice', (e) => e.textContent.trim()).catch(() => '')
ok('拍卖详情展示当前最高价', aucBig.includes('¥'), aucBig)
ok('拍卖详情展示出价记录', (await count('.auc-row')) >= 2, (await count('.auc-row')) + ' 条')

// 门槛从接口取，不写死金额；之前跑过出价也能继续测
const beforeAuc = (await getJson('/auctions/A1001'))?.data
ok('拍卖详情下发服务器时间', Math.abs(Number(beforeAuc?.serverNow) - Date.now()) < 60000, '偏差 ' + Math.round((Number(beforeAuc?.serverNow) - Date.now()) / 1000) + ' 秒')
const syncTip = await page.$eval('.auc-sync', (e) => e.textContent.trim().replace(/\s+/g, ' ')).catch(() => '')
ok('详情页显示对时提示', /对时|校准|偏差/.test(syncTip), syncTip)
const floor = Number(beforeAuc?.floorPrice)
const bidRes = await bidPost('A1001', floor)
ok('按最低门槛出价成功', bidRes.status === 201 && Number(bidRes.json?.data?.price) === floor, 'HTTP ' + bidRes.status + ' · ¥' + floor)
const afterAuc = (await getJson('/auctions/A1001'))?.data
ok('出价已写入数据库', Number(afterAuc?.currentPrice) === floor && afterAuc?.currentBidder === 'gary', '领先 ' + afterAuc?.leaderName)
ok('出价次数递增', Number(afterAuc?.bidCount) === Number(beforeAuc?.bidCount) + 1, beforeAuc?.bidCount + ' → ' + afterAuc?.bidCount)

ok('低于门槛出价被拒', (await bidPost('A1001', floor - 1)).status === 400, 'HTTP 400')
ok('房主不能给自己出价', (await bidPost('A1003', 999999)).status === 403, 'HTTP 403')
ok('已结束拍卖不可出价', (await bidPost('A1000', 999999)).status === 400, 'HTTP 400')

const aucOverview = (await getJson('/auctions/overview'))?.data
ok('拍卖概览下发延时规则', aucOverview?.rules?.maxExtend === 3, '最多延时 ' + aucOverview?.rules?.maxExtend + ' 次')

// 挂拍入口：入口按房源状态分流（能挂 → 「挂拍」，已挂 → 「拍卖中」）
await goto('/mine')
const mineBtns = await page.$$eval('.hrow button, .hrow a', (els) => els.map((e) => e.textContent.trim()))
ok('我的房源出现挂拍入口', mineBtns.includes('挂拍') || mineBtns.includes('拍卖中'), mineBtns.join(' / '))

const postAuc = async (path, body) => {
  const r = await fetch(API + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })
  let j = null
  try { j = await r.json() } catch (e) { /* 非 JSON */ }
  return { status: r.status, json: j }
}

const otherAuc = await postAuc('/houses/H2001/auctions', { startPrice: 700000 })
ok('不能给别人的房源挂拍', otherAuc.status === 403, 'HTTP ' + otherAuc.status)

const newAuc = await postAuc('/houses/H1013/auctions', { startPrice: 1800, step: 100, hours: 24 })
ok('房主可以把房源挂上拍', newAuc.status === 201 && newAuc.json?.data?.status === 'live', newAuc.json?.data?.id || newAuc.json?.error)
if (newAuc.json?.data?.id) {
  const cancelAuc = await postAuc(`/auctions/${newAuc.json.data.id}/cancel`)
  ok('无人出价时可以撤回拍卖', cancelAuc.status === 200 && cancelAuc.json?.data?.status === 'canceled', 'HTTP ' + cancelAuc.status)
}

/* ---------- 17. 数据隔离：换一个账号登录，看不到别人的消息 / 账单 / 预约 ---------- */
{
  const tag = String(Date.now()).slice(-5)
  const reg = await postJson('/auth/register', { name: '隔离' + tag, phone: '137' + tag + '000', password: 'test1234' })
  const regJson = await reg.json()
  const tk = regJson?.data?.token
  ok('可以注册第二个账号', reg.status === 201 && !!tk, regJson?.data?.user?.charId || regJson?.error)

  const boot = await (await fetch(API + '/bootstrap', { headers: { Authorization: 'Bearer ' + tk } })).json()
  const d = boot.data || {}
  ok('新账号看不到别人的消息', (d.messages || []).length === 0, (d.messages || []).length + ' 条')
  ok('新账号看不到别人的账单', (d.bills || []).length === 0, (d.bills || []).length + ' 条')
  ok('新账号看不到别人的预约', (d.bookings || []).length === 0, (d.bookings || []).length + ' 条')

  const pay = await postJson('/bills/B3001/pay', {}, tk)
  ok('不能替别人付账单', pay.status === 403, 'HTTP ' + pay.status)
  const del = await fetch(API + '/messages/M5001', { method: 'DELETE', headers: { Authorization: 'Bearer ' + tk } })
  ok('不能删别人的消息', del.status === 404, 'HTTP ' + del.status)

  const dup = await postJson('/auth/register', { name: '撞车' + tag, phone: '136' + tag + '000', password: 'test1234', charId: regJson?.data?.user?.charId })
  ok('同一角色不能重复注册', dup.status === 409, 'HTTP ' + dup.status)
}

/* ---------- 18. 404 ---------- */
await goto('/no-such-page')
ok('未知路由显示 404', (await page.$eval('body', (e) => e.textContent)).includes('404'))

/* ---------- 19. 收尾：恢复演示数据，顺便清掉本次跑测试注册的临时账号 ---------- */
{
  const r = await fetch(API + '/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: '{}'
  })
  const j = await r.json().catch(() => null)
  ok('测试结束自动恢复演示数据', r.status === 200 && j?.ok, j?.data ? `房源 ${j.data.houses} 套` : (j?.error || 'HTTP ' + r.status))
}

/* ---------- 汇总 ---------- */
let fail = 0
for (const r of results) if (!r.pass) fail++
if (errors.length) {
  console.log('\n控制台错误：')
  errors.slice(0, 12).forEach((e) => console.log('  ' + e))
}
console.log(`\n合计 ${results.length} 项，失败 ${fail} 项，控制台错误 ${errors.length} 条`)

const code = fail || errors.length ? 1 : 0
// Chrome 在 Windows 上关闭时可能抛出无害的进程事件，忽略它以免影响退出码
process.on('uncaughtException', (e) => console.log('  [cleanup] ' + e.message))
process.on('unhandledRejection', () => {})
try { await browser.close() } catch (e) { /* ignore */ }
setTimeout(() => process.exit(code), 150)

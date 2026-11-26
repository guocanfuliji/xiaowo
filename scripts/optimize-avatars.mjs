/**
 * 头像压缩：public/avatars/*.jpg → 长边 240px、JPEG q=86
 *
 * 为什么要缩：原图是 720~851px 的稿子，单张 30~150KB，14 张就 1.1MB，
 * 而页面上最大也就个人中心那个 118px 的头像（Retina 2x 需要 236px）。
 *
 * 幂等：长边已经 ≤ 256 的文件直接跳过，重复跑不会二次压缩掉画质。
 * 用法：node scripts/optimize-avatars.mjs
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const DIR = path.resolve('public/avatars')
const MAX = 240
const LIMIT = 256 // 超过这个长边才处理
const QUALITY = 0.86

const files = (await fs.readdir(DIR)).filter((f) => /\.jpe?g$/i.test(f))
if (!files.length) {
  console.log('public/avatars 下没有 jpg')
  process.exit(0)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu']
})
const page = await browser.newPage()
await page.goto('about:blank')

let saved = 0
let skipped = 0

for (const f of files) {
  const file = path.join(DIR, f)
  const before = (await fs.stat(file)).size
  const buf = await fs.readFile(file)
  const b64 = buf.toString('base64')

  const out = await page.evaluate(async (data, MAX, LIMIT, QUALITY) => {
    const img = new Image()
    img.src = 'data:image/jpeg;base64,' + data
    await img.decode()
    const long = Math.max(img.naturalWidth, img.naturalHeight)
    if (long <= LIMIT) return { skipped: true, w: img.naturalWidth, h: img.naturalHeight }

    const scale = MAX / long
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const cv = document.createElement('canvas')
    cv.width = w
    cv.height = h
    const ctx = cv.getContext('2d')
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, w, h)
    return { skipped: false, dataUrl: cv.toDataURL('image/jpeg', QUALITY), w, h }
  }, b64, MAX, LIMIT, QUALITY)

  if (out.skipped) {
    skipped++
    console.log(`跳过 ${f}  ${out.w}x${out.h}`)
    continue
  }
  const outBuf = Buffer.from(out.dataUrl.split(',')[1], 'base64')
  await fs.writeFile(file, outBuf)
  saved += before - outBuf.length
  console.log(`${f}  → ${out.w}x${out.h}  ${(before / 1024).toFixed(0)}KB → ${(outBuf.length / 1024).toFixed(0)}KB`)
}

await browser.close()
const total = (await fs.readdir(DIR)).filter((f) => /\.jpe?g$/i.test(f))
let sum = 0
for (const f of total) sum += (await fs.stat(path.join(DIR, f))).size
console.log(`\n处理 ${files.length - skipped} 张，跳过 ${skipped} 张，共省 ${(saved / 1024).toFixed(0)}KB；目录合计 ${(sum / 1024).toFixed(0)}KB`)

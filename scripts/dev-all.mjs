/**
 * 一条命令同时起后端（3001）与前端（5173），零额外依赖
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const api = spawn(process.execPath, ['--experimental-sqlite', 'server/index.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' }
})

const web = spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, FORCE_COLOR: '1' }
})

const kids = [api, web]
let closing = false

function shutdown(code = 0) {
  if (closing) return
  closing = true
  kids.forEach((p) => { try { p.kill() } catch (e) { /* ignore */ } })
  setTimeout(() => process.exit(code), 200)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

kids.forEach((p) => p.on('exit', (code) => {
  if (!closing) {
    console.log(`\n[dev:all] 子进程退出（code=${code}），一并停止其余服务`)
    shutdown(code ?? 0)
  }
}))

#!/usr/bin/env node
/**
 * Client 半冒烟测试：不启动 DSH，用最小 React / ctx 桩验证
 *   window.__ModuleLoader__.load 被调用
 *   factory 能执行
 *   apply 注册了 sidebar.panellist + main 两个 slot
 *
 * 用法：node tools/check-client.mjs
 */
import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let failed = 0
const check = (name, cond, extra = '') => {
  if (cond) console.log(`  ok   ${name}`)
  else { failed++; console.log(`  FAIL ${name} ${extra}`) }
}

// ---- 最小 React 桩 ----
const React = {
  createElement: (...args) => ({ type: args[0], props: args[1], children: args.slice(2) }),
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useCallback: (fn) => fn,
  useRef: (v) => ({ current: v === undefined ? null : v }),
}

let loaded = null
global.window = {
  __ModuleLoader__: {
    load(def) {
      loaded = def
    },
  },
}
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
}

const src = await readFile(join(ROOT, 'client.js'), 'utf8')
// 用 Function 构造器执行，注入 React 桩
const fn = new Function('window', 'require', 'localStorage', 'navigator', 'document', src)
fn(global.window, (id) => {
  if (id === 'react') return React
  throw new Error('unexpected require: ' + id)
}, global.localStorage, { clipboard: null }, { createElement: () => ({}), body: {} })

console.log('\n[模块加载]')
check('__ModuleLoader__.load 被调用', !!loaded)
check('id = dsh-ai-workflow-kit', loaded && loaded.id === 'dsh-ai-workflow-kit', loaded && loaded.id)
check('factory 是函数', loaded && typeof loaded.factory === 'function')

const mod = loaded.factory((id) => {
  if (id === 'react') return React
  throw new Error('unexpected require: ' + id)
})

console.log('\n[插件导出]')
check('返回 inject 数组', Array.isArray(mod.inject) && mod.inject.includes('slots'))
check('返回 apply 函数', typeof mod.apply === 'function')

console.log('\n[slot 注册]')
const registered = []
const ctx = {
  slots: {
    inject(name, fn) { fn() },
    register(opts, comp) {
      registered.push({ opts, comp })
    },
  },
}
mod.apply(ctx)

check('注册 2 个 slot', registered.length === 2, 'got ' + registered.length)
const panel = registered.find((r) => r.opts.name === 'sidebar.panellist')
const main = registered.find((r) => r.opts.name === 'main')
check('sidebar.panellist id=awkit', panel && panel.opts.id === 'awkit', panel && panel.opts.id)
check('sidebar.panellist 有 label', panel && typeof panel.opts.label === 'function' && panel.opts.label() === 'AI 工作流')
check('main key=awkit', main && main.opts.key === 'awkit', main && main.opts.key)
check('main 组件是函数', main && typeof main.comp === 'function')
check('图标组件是函数', panel && typeof panel.comp === 'function')

console.log(failed === 0 ? '\n全部通过' : `\n${failed} 项失败`)
process.exit(failed === 0 ? 0 : 1)

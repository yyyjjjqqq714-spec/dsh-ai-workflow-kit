import fs from 'node:fs'

const CLIENT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/plugin/client.js'
const src = fs.readFileSync(CLIENT, 'utf8')

let captured = null
const fakeWindow = {
  __ModuleLoader__: {
    load(spec) { captured = spec },
  },
}

const React = {
  createElement: (...args) => ({ __el: true, args }),
  useState: (v) => [v, () => {}],
  useEffect: () => {},
}

const fakeRequire = (name) => {
  if (name === 'react') return React
  throw new Error('unexpected require: ' + name)
}

const fn = new Function('window', 'require', src)
fn(fakeWindow, fakeRequire)

if (!captured) { console.error('FAIL: __ModuleLoader__.load never called'); process.exit(1) }
console.log('id       :', captured.id)
console.log('factory  :', typeof captured.factory)

const mod = captured.factory(fakeRequire)
console.log('exports  :', Object.keys(mod))
console.log('inject   :', JSON.stringify(mod.inject))

const calls = []
const ctx = {
  slots: {
    inject(key, cb) { calls.push({ op: 'inject', key }); try { cb() } catch (e) { calls.push({ op: 'inject-threw', key, err: String(e) }) } },
    register(opts, Comp) {
      calls.push({ op: 'register', name: opts.name, id: opts.id, key: opts.key, order: opts.order, hasComponent: typeof Comp === 'function' })
      if (opts.name === 'main' && !opts.key) throw new Error('keyed slot "main" requires options.key')
      if (opts.name === 'sidebar.panellist' && !opts.id) throw new Error('list slot requires options.id')
      return () => {}
    },
  },
}

mod.apply(ctx)
console.log('calls    :')
for (const c of calls) console.log('  ', JSON.stringify(c))

const ok = calls.some(c => c.op === 'register' && c.name === 'sidebar.panellist' && c.id === 'awkit')
        && calls.some(c => c.op === 'register' && c.name === 'main' && c.key === 'awkit')
console.log('RESULT   :', ok ? 'PASS' : 'FAIL')
process.exit(ok ? 0 : 1)

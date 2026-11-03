# E. 明天 2 小时 MVP 执行清单

> 时间基准：120 分钟，单人执行。
> 前置：工程目录 `ai-workflow-kit/` 已建；git 已装（`winget install --id Git.Git -e`）。
> 风格库源已核实：`F:\skill提示词库\提示词等（DeepSeek可用等）\代码动画_341种风格提示词_免费\风格提示词\`（340 个 md / 10 个系列）。

---

## 0. 范围决策（已按你要求调整）

原方案是"只做内容层"。你要求**也要看到插件界面**，所以调整为：

**内容层为主 + 插件界面最小可见（两级）**

| 级别 | 内容 | 时间 | 是否必达 |
|------|------|------|----------|
| **L1 界面必达** | 侧栏出现「AI 工作流」图标，点开有面板，面板里显示列表（先静态数据） | 15 min | ✅ **必须** |
| **L2 真数据加分** | 面板通过 Host 路由读取 `content/` 真实文件 | +15 min | 🟡 有余力才做 |

为什么这样切：**看到界面**只需要 client 半，不需要写盘链路；
**接真数据**才需要 Host 半。分开做，保证"界面一定看得到"。

**明天明确不做**：
- ❌ 300+ 风格全量（只做 1 条全字段）
- ❌ 表单提交 / 写盘（L2 只做到"读"）
- ❌ 知识库批量入库（只建目录 + 1 篇样本）
- ❌ 渲染自动化（手动跑一次仍可）

---

## 1. 时间块分解

| 时间 | 时长 | 任务 | 产出 | 卡点即停 |
|------|------|------|------|----------|
| 00:00-00:05 | 5 | 开工 + `git init` + 首次 commit | 仓库就绪 | — |
| 00:05-00:15 | 10 | schema ×3（精简） | `prompt/template/style.schema.json` | 超 10min → 只写 required |
| 00:15-00:35 | 20 | **MVP-1 提示词** | v1.md + 评分 | → 砍评分保结构 |
| 00:35-00:50 | 15 | **MVP-2 代码模板** | TS 模板 + 渲染结果 | → 砍测试保替换 |
| 00:50-01:10 | 20 | **MVP-3 视频风格** | A3 全 19 字段 + 分镜表 | → 砍渲染保字段 |
| 01:10-01:25 | 15 | **插件 L1 界面** | 侧栏图标 + 面板 | **不可砍**，见第 5 节 |
| 01:25-01:40 | 15 | 插件 L2 真数据（可选） | 面板显示真实文件 | 失败 → 回滚到静态 |
| 01:40-01:50 | 10 | 索引 + 校验 + commit | `_index.json` + validate PASS | — |
| 01:50-02:00 | 10 | 验收报告 + 快照 | 报告 + zip | — |

---

## 2. MVP-1：提示词优化器（20 分钟）

### 范围
只做**一个**提示词，完整走一遍流程。

### 六步（每步约 3 分钟）
1. **选真实需求**：建议「写一个 MV 分镜提示词」
2. **澄清 5 问**：目标模型 / 输出给谁 / 必须包含 / 绝对不能有 / 成功标准
3. **套六段式**：角色 / 上下文 / 任务 / 约束 / 输出格式 / 示例
4. **落盘**：`content/prompts/<slug>/v1.md`
5. **评分**：六维 0-5 → `content/prompts/<slug>/_scores/v1.json`
6. **验证**：原样喂模型一次，看是否满足成功标准

### 评分六维
| 维度 | 5 分的标准 |
|------|-----------|
| 完整性 | 六段齐全无冗余 |
| 可执行性 | 一次出稿可用，无需追问 |
| 约束明确度 | 每条约束可被判定违反 |
| 输出格式确定度 | 有格式 + 字段 + 示例 |
| 复用性 | 换主题可直接用 |
| 抗拐偏性 | 有负面约束兜底 |

### 验收
- [ ] `v1.md` 六段齐全
- [ ] 六维有分数 + 一句话理由
- [ ] 喂模型一次通过
- [ ] 换主题仍可用

---

## 3. MVP-2：代码模板（15 分钟）

只做 **1 个**：`TypeScript + Fastify + REST 路由`。

```
content/templates/typescript/fastify/route/
├─ template.json
├─ files/{{resource}}.ts
└─ tests/{{resource}}.test.ts
```

`template.json` 关键字段：`id / lang / framework / kind / vars[] / files[] / tests[] / review[]`

`vars` 示例：`Resource`(PascalCase) / `resource`(camelCase) / `table`(snake_case)

### 验收
- [ ] vars 与文件里 `{{}}` 完全一致（无遗漏无多余）
- [ ] 用 `Resource=Order` 渲染，文件名/类名/路径三处都替换正确
- [ ] 审查清单 ≥4 条且可判定

---

## 4. MVP-3：视频风格脚本（20 分钟）

只做 **1 条**：`A3 大字冲击`
原文：`F:\skill提示词库\提示词等（DeepSeek可用等）\代码动画_341种风格提示词_免费\风格提示词\A-G_代码样片\A3_大字冲击.md`

三件产出：
1. `content/styles/S1-code/A3.json`（19 字段全填）
2. `content/styles/S1-code/A3-storyboard.md`（≥5 镜头）
3. `content/styles/S1-code/A3.html`（用原文 `draw(t)`，能打开即可）

### 验收
- [ ] 19 字段零空值
- [ ] 分镜表 ≥5 镜，每镜有 `style_node`
- [ ] `A3.html` 打开不报错
- [ ] 质检点 ≥2 个 `auto: true`

---

## 5. 插件 L1 界面（15 分钟，不可砍）

### 5.1 建三个文件（5 分钟）

`plugin/package.json`
```json
{
  "name": "@local/ai-workflow-kit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./index.js", "./client": "./client.js" },
  "files": ["index.js", "client.js", "cordis.patch.yml"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-ui-conversation"]
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": ">=4.0.0-rc <5",
    "react": ">=18"
  }
}
```

`plugin/cordis.patch.yml`
```yaml
- insert:
    - id: ai-workflow-kit
      name: '@local/ai-workflow-kit'
```

`plugin/client.js`（**先静态数据，不依赖 Host**）
```js
window.__ModuleLoader__.load({
  id: '@local/ai-workflow-kit',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const DEMO = [
      { id: 'S1-A3', name: '大字冲击' },
      { id: 'S1-A1', name: '字雨' },
      { id: 'S1-A2', name: '光标打字' },
    ]

    function Panel() {
      return h('div', { style: { padding: '16px 20px' } },
        h('h2', { style: { fontSize: 16, marginBottom: 12 } }, 'AI 工作流'),
        h('ul', { style: { listStyle: 'none', padding: 0 } },
          DEMO.map(it => h('li', {
            key: it.id,
            style: { padding: '8px 0', borderBottom: '1px solid var(--dsw-alias-border-l1)' }
          }, `${it.id} · ${it.name}`))
        )
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('sidebar.panellist', () =>
          ctx.slots.register(
            { name: 'sidebar.panellist', id: 'awkit', order: 200, label: () => 'AI 工作流' },
            () => null
          )
        )
        ctx.slots.inject('main', () =>
          ctx.slots.register({ name: 'main', key: 'awkit' }, Panel)
        )
      }
    }
  }
})
```

`plugin/index.js`（Host 半，L1 阶段可为空壳）
```js
export function apply() {}
```

### 5.2 安装（5 分钟）

```powershell
dsh plugin --profile desktop add "F:\软件\DeepSeek Harness工作区\ai-workflow-kit\plugin"
```

> 本地目录 = link，改代码立刻生效。
> **首次安装可能不重启即可，但不确定时直接重启 DSH 最稳。**
> 若报 peer 版本不符 → 按报错调整 `peerDependencies`。

### 5.3 验证（5 分钟）
- [ ] 左侧边栏出现「AI 工作流」图标
- [ ] 点击后主区显示三条示例
- [ ] 无控制台报错（F12 看 Console）

**如果 15 分钟没出现图标**：不要继续调试。
记下报错原文，先回滚（`remove`），继续做后面的任务，晚上再修。

---

## 6. 插件 L2：接真数据（15 分钟，可选）

只有 L1 通过才做。

### 6.1 改 `index.js`
```js
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const inject = ['webServer']

const ROOT = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit'

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/awkit/api/list',
    handler: async (req, res) => {
      let out = []
      try {
        const raw = await readFile(join(ROOT, 'content/styles/_index.json'), 'utf8')
        out = JSON.parse(raw)
      } catch (e) {
        out = [{ id: 'ERR', name: String(e.message) }]
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(out))
    },
  }))
}
```

### 6.2 改 `client.js` 的 Panel
```js
function Panel() {
  const [items, setItems] = React.useState(DEMO)
  React.useEffect(() => {
    fetch('/awkit/api/list')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d) && d.length) setItems(d) })
      .catch(() => {})
  }, [])
  // ...其余渲染不变
}
```

### 验收
- [ ] 面板显示的是 `_index.json` 里的真实条目
- [ ] 把 `_index.json` 改一条，刷新面板能看到变化

**失败即回滚**：`setItems` 只在成功时执行，失败保留 `DEMO`，不要白屏。

---

## 7. 卡点即停规则

| 卡在 | 停手 | 保底 |
|------|------|------|
| schema | 只写 required | 能校验 |
| validate | `JSON.parse` + 手写 if | 不追求完整 schema |
| MVP-1 | 砍评分 | 六段 + 落盘 |
| MVP-2 | 砍测试文件 | 模板 + 替换能跑 |
| MVP-3 | 砍渲染 | 字段 + 分镜表 |
| **插件 L1** | **记录报错原文后回滚** | 继续后面任务，不要死磕 |
| 插件 L2 | 回滚到静态 | L1 已达标 |

---

## 8. 验收报告（10 分钟）

| 项 | 路径 | 状态 |
|----|------|------|
| schema ×3 | `schema/*.json` | ✅/❌ |
| 提示词 v1 | `content/prompts/<slug>/v1.md` | ✅/❌ |
| 代码模板 | `content/templates/typescript/fastify/route/` | ✅/❌ |
| 风格条目 | `content/styles/S1-code/A3.json` | ✅/❌ |
| 分镜表 | `content/styles/S1-code/A3-storyboard.md` | ✅/❌ |
| **插件界面** | **侧栏可见 + 面板可开** | ✅/❌ |
| 索引 | `content/styles/_index.json` | ✅/❌ |
| git | 至少 2 次 commit | ✅/❌ |

---

## 9. 第 2-5 天路线

| 天 | 主线 | 关键交付 |
|----|------|----------|
| D2 | 批次 B01（S1 补字段 25 条） | 25 条可检索 |
| D3 | 插件表单 + Host `ctx.fs` 写盘 | 填表 → 落盘 → 列表刷新 |
| D4 | 三个面板入口齐备（提示词/模板/风格） | 三入口可切换 |
| D5 | 知识库入库脚本 + 投喂 20 篇 | kb 可用 |

> 注意：`ctx.fs` 写前必须先 read，否则可能撞 `FS_STALE_VERSION`。

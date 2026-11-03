# B. 三个插件的输入 / 输出规格

> 通用约定：每个插件都有 **AI 侧（skill）** 与 **UI 侧（plugin）** 两种实现，
> 共享同一份字段契约与同一份 `content/` 数据。先写契约，UI 后做。

---

## 0. 三插件共同契约（先定，避免各写各的）

### 0.1 产物双份
每次生成都落两份：
- `*.json` —— 机读，带 schema_version，供插件/脚本消费
- `*.md` —— 人读，可粘贴、可 diff

### 0.2 版本号规则
```
<slug>/v<N>.md，N 从 1 开始，只增不改
并写一条 <slug>/_versions/index.json：
{"version": N, "created_at": "...", "change_note": "必填", "score_total": 24}
```

### 0.3 审计日志
所有生成追加一行到 `_audit/log.jsonl`：
```json
{"ts":"2026-11-04T15:30:00+08:00","plugin":"prompt-forge","action":"generate",
 "input_digest":"sha1前12位","output":"content/prompts/x/v1.md","schema":"v1","ok":true}
```

### 0.4 schema_version
每个产物文件必带 `"schema_version": 1`，schema 升级时旧文件不需要改（兼容读）。

---

## B1. Prompt Forge —— 提示词优化器

### 职责边界
| 做 | 不做 |
|----|------|
| 需求澄清（缺什么问什么） | 凭空猜需求 |
| 六段式结构化 | 只做同义改写 |
| 六维评分 + 迭代建议 | 自动无限迭代（必须人决定） |
| 版本归档与对比 | 云端同步 |
| 输出可复制的成品 | 替代你判断"这个提示词好不好" |

### 与已有插件的关系
本机已装 `dsh-webui-prompt-optimizer`（v0.1.0），它做的是：
- 输入框右侧图标 → 单轮 SSE 流式改写 / 多轮生成"均衡/精简/详尽"三候选
- 可包装为 `/goal` 或附加 AI 浏览器验证要求

**它缺的正是 B1 的核心**：需求澄清、六段式、评分、版本库。
**复用策略**：B1 不重写流式改写引擎；MVP 阶段先做纯文件版（skill 驱动），
UI 阶段再考虑 fork 该插件的 `lib/client.js` 复用其 SSE 调用与样式。

### 输入
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `raw_need` | string | ✅ | 原始需求，可以很粗糙 |
| `target_model` | enum | ✅ | `deepseek` / `claude` / `gpt` / `gemini` / `local` |
| `scene` | enum | ✅ | `code` / `copy` / `video` / `data` / `research` / `other` |
| `strictness` | enum | ✅ | `loose`(宽松) / `standard` / `strict` |
| `audience` | string | | 输出给谁看 |
| `draft` | string | | 已有草稿，有则做"优化"而非"从零" |
| `success_criteria` | string[] | ✅ | 怎样算成功，1-3 条 |

### 澄清问题池（按 strictness 决定问几个）
| 维度 | 问题 | loose | standard | strict |
|------|------|:-----:|:--------:|:------:|
| 目标 | 你最终要拿这个输出干什么？ | ✅ | ✅ | ✅ |
| 模型 | 喂给哪个模型？ | ✅ | ✅ | ✅ |
| 受众 | 谁来看结果？ | | ✅ | ✅ |
| 边界 | 绝对不能出现什么？ | | ✅ | ✅ |
| 标准 | 怎样算成功？ | | ✅ | ✅ |
| 素材 | 有没有必须用上的原文/数据？ | | | ✅ |
| 格式 | 输出必须是表格/JSON/口播稿？ | | | ✅ |

> 规则：**不要把所有问题一次问完**。strict 也最多 5 问，其余用默认值并在输出里标注"假设"。

### 输出
```jsonc
{
  "schema_version": 1,
  "slug": "video-storyboard-prompt",
  "version": 1,
  "structured": {
    "role": "你是一位有 10 年经验的短视频导演……",
    "context": "……[KB:doc#chunk] 可选引用",
    "task": "……",
    "constraints": ["……", "……"],
    "output_format": {"type": "json", "fields": ["shot","time","desc"]},
    "example": {"input": "……", "output": "……"}
  },
  "score": {
    "completeness":   {"v": 5, "why": "六段齐全"},
    "executability":  {"v": 4, "why": "约束可判定但输出格式略宽"},
    "constraint":     {"v": 5, "why": "每条都能被判违反"},
    "format":         {"v": 4, "why": "有字段但缺示例"},
    "reusability":    {"v": 3, "why": "绑定单一主题"},
    "anti_drift":     {"v": 4, "why": "有 3 条负面约束"},
    "total": 25
  },
  "next_actions": ["补一个真实输出示例可提 format 到 5"],
  "assumptions": ["假设输出为 JSON，若需 Markdown 请调整"]
}
```

### 验收
- [ ] 六段齐全，`assumptions` 明确列出所有默认假设
- [ ] 每维评分有 `why`，不允许只写分数
- [ ] 原样喂给目标模型一次，输出满足 `success_criteria`
- [ ] 换主题后模板仍可用（复用性 ≥3 分）

---

## B2. Code Template Forge —— 代码模板库

### 职责边界
| 做 | 不做 |
|----|------|
| 模板 + 变量声明 + 占位替换 | 替代框架本身 |
| 配套测试文件生成 | 保证业务逻辑正确 |
| 代码审查清单 | 自动修复所有问题 |
| 多语言/框架索引 | 什么都进库（只收高频） |

### 输入
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template_id` | string | ✅ | 如 `ts-fastify-route` |
| `vars` | object | ✅ | 变量实际值，键须与声明一致 |
| `target_dir` | string | ✅ | 渲染到哪个目录 |
| `with_tests` | bool | | 默认 true |
| `overwrite` | bool | | 默认 false，存在则报错 |

### 模板契约（`template.json`）
```jsonc
{
  "schema_version": 1,
  "id": "ts-fastify-route",
  "lang": "typescript",
  "framework": "fastify",
  "kind": "route",
  "vars": [
    {"key":"Resource","type":"PascalCase","required":true,"example":"User"},
    {"key":"resource","type":"camelCase","required":true,"example":"user"}
  ],
  "files":     [{"from":"files/{{resource}}.ts","to":"src/routes/{{resource}}.ts"}],
  "tests":     [{"from":"tests/{{resource}}.test.ts","to":"src/routes/{{resource}}.test.ts"}],
  "review":    ["错误处理覆盖 4xx/5xx","无 any","输入用 schema 校验","有日志"],
  "deps":      [{"name":"fastify","version":"^4"}],
  "post_steps":["pnpm add fastify"]
}
```

### 模板库组织结构
```
content/templates/
├─ _index.json                       # 脚本生成
├─ typescript/
│  ├─ fastify/{route,plugin,service}/
│  ├─ react/{component,hook,context}/
│  └─ node/{cli,worker,cron}/
├─ python/
│  ├─ fastapi/{router,model,test}/
│  └─ cli/{command,config}/
├─ sql/{migration,query}/ 
└─ config/{docker,ci,tsconfig}/
```

### 输出
```
rendered/<template_id>/<yyyymmdd-HHmmss>/
├─ files/…                      # 实际渲染产物
├─ manifest.json                # 用了哪些 vars / 哪些文件 / 审查清单
└─ REVIEW.md                    # 待人工打勾的审查项
```

### 验收
- [ ] `template.json` 的 vars 与文件里所有 `{{}}` 完全一致（脚本校验双向）
- [ ] 渲染产物通过该语言的基础检查（TS: `tsc --noEmit`；Python: `ruff check`）
- [ ] 审查清单 ≥4 条，每条可判定
- [ ] 渲染两次结果一致（幂等）

---

## B3. Style Director —— 视频风格脚本

### 职责边界
| 做 | 不做 |
|----|------|
| 风格匹配（从库里挑） | 从零发明风格 |
| 分镜表 / 口播稿 / 字幕 | 直接出成片 |
| 平台适配（尺寸/时长/安全区） | 代替剪辑判断 |
| 生成可渲染的提示词/index.html | 保证创意好 |

### 输入
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `topic` | string | ✅ | 主题或已有文案 |
| `platform` | enum | ✅ | `douyin` / `bilibili` / `wechat` / `youtube` |
| `duration` | number | ✅ | 秒 |
| `style_ids` | string[] | ✅ | 1-3 个，多个即混搭 |
| `assets` | object | | `{footage:bool, voice:bool, bgm:bool, logo:bool}` |
| `key_lines` | string[] | | 必须上屏的金句 |
| `tone` | enum | | `warm` / `cold` / `urgent` / `calm` |

### 输出（四件套）
1. **分镜表** `storyboard.json` + `.md`
```jsonc
{"shots":[
  {"shot":1,"t":"0-3s","size":"特写","move":"缓推","desc":"……",
   "subtitle":"……","vo":"……","beat":"down-beat 1","trans":"硬切",
   "style_node":"S1-A3.hook"}
]}
```
2. **口播稿** `script.md`（按分镜段落，带停顿标记）
3. **字幕** `subtitle.srt`（时间码对齐分镜）
4. **风格提示词** `prompt.md`（把选中风格的 `prompt_template` 填好）

### 平台适配规则（内置，不需每次问）
| 平台 | 比例 | 建议时长 | 字幕安全区 | 前 3 秒硬要求 |
|------|------|----------|------------|---------------|
| douyin | 9:16 | 15-60s | 下 1/3，避让右栏 | 必须出冲突/悬念 |
| bilibili | 16:9 | 3min+ | 居中偏下 | 可用片头，可慢起 |
| wechat | 9:16 | 30-90s | 下 1/3 | 同抖音 |
| youtube | 16:9 | 8min+ | 居中偏下 | 可留 hook 到 15s |

### 验收
- [ ] 分镜表每镜都有 `style_node`，能反查到风格条目
- [ ] 口播字数与时长匹配（中文约 4-5 字/秒）
- [ ] SRT 时间码无重叠、无空隙 >2s
- [ ] 风格提示词原样可用，占位符全部被替换
- [ ] 平台适配四要素（比例/时长/安全区/前3秒）全部体现

---

## B4. 三插件联动（一个真实链路）

```
需求："做一条 45 秒抖音，讲别熬夜"
  ↓ B1 澄清 → 生成"分镜提示词"（六段式，评分 24/30）
  ↓ B3 匹配风格 → 命中 S1-A3 大字冲击
  ↓ B3 产出分镜表 + 口播 + SRT + 填好的提示词
  ↓ B2 拉模板 → 生成 index.html 骨架（Canvas 舞台）
  ↓ 渲染 → MP4
  ↓ 质检点逐条打勾 → 写回 _audit
```

> 这条链路是第 4 天的目标，明天不跑。

---

## B5. 插件能力边界（已核实部分）

### 确证事实（有代码证据）

| # | 能力 | 证据 | 置信度 |
|---|------|------|:------:|
| 1 | 模块加载格式 | `window.__ModuleLoader__.load({ id, factory: (require) => {...} })`<br>见 `dsh-webui-prompt-optimizer\lib\client.js:1-5` | 高 |
| 2 | 可 require 的依赖 | `react` / `react-dom` / `react/jsx-runtime` / `@deepseek-ai/dsh-client-ui-primitives` | 高 |
| 3 | 可依赖 LLM | `peerDependencies` 含 `@deepseek-ai/dsh-llm`；prompt-optimizer 走**本机 loopback 路由**流式调用 | 高 |
| 4 | 持久化 | 插件用独立 `localStorage` 键存状态（README 明确"独立 localStorage 键"） | 高 |
| 5 | UI 注入 | 运行时幂等注入 `<style>`（`STYLE_ID` 常量）；sidebar 入口用 `ctx.slots.register` | 高 |
| 6 | 样式对齐 | 主题令牌走 DSH token（`interactive-bg-hover`、`border-l2`、`business-primary`） | 高 |

### ⚠️ 更正：一条被推翻的结论

**我最初的判断**：找不到插件写文件的证据 → 插件按"不能写"设计。

**推翻它的证据**：DSH 插件是**双半结构**。纯 `client.js` 确实没有 fs/storage，
但 **Host 半（`index.js`）完全能写文件、跑命令、调模型**。

| 通道 | 签名 | 证据 |
|------|------|------|
| Host 文件 API | `ctx.fs`：resolve/stat/read/list/watch/write/edit（原子写 + 版本守卫；错误码 `FS_NOT_FOUND` / `FS_STALE_VERSION` / `FS_AMBIGUOUS_EDIT`） | `dsh-fs/README.md:36` |
| Host HTTP 路由 | `ctx.webServer.register({kind:'prefix', path:'/x/api', handler(req,res)})`，客户端同源 `fetch` | `dsh-better-sidebar/lib/index.js:670` |
| Host 直接 Node | Host 是普通 Node 进程，可 `node:fs` / `child_process` | better-sidebar 用 node-pty/git（3938 行） |
| Host 键值存储 | `ctx.storage` + `ctx.storageDomain`，默认落 `~/.dsh/storages` | `dsh-base/cordis.patch.yml` |

### 能力速查表

**Client 侧**

- 模块格式 `window.__ModuleLoader__.load({ id, factory })`；factory 闭包只注入 5 个内置：
  `ctx`（受限 Cordis：get/on/provide/effect）、`React`、`host.call(method,args)`、`styles.insert(css)`、`console`
- **静态登记的 ctx 服务仅 8 个**：`layout` / `locale` / `sessions` / `slots` / `theme` / `timer` / `uiWorkspace` / `workspaces`
- 真实插件中额外观测到可用（中置信）：`remote` / `modules` / `resources` / `configForms` / `settingsSchema` / `commandUi` / `uiConversation` / `sidebarRight` / `sidebarRightTabs` / `inputTriggers` / `uiRenderer`
- **98 个 slot**，`kind ∈ single|keyed|list|chain`，`scope ∈ root|session|session-maybe`
- 注册选项全集：`name, id, key, order, label, priority, select, inject, children, store, locale, registrant`
  - `list` 必填 `id`；`keyed` 必填 `key`；`chain` 必填 `select`
  - `priority` 高者遮蔽低者；`label` 可为 `() => string`（跟随语言热更新）
- **复合 UI 两条路**：① `children` 自声明子槽；② `sidebar.panellist`(list) + `main`(keyed) 用**同名 id/key** 自动联动 → "列表面板 + 主区页面"成立（印证 theme-studio 经验）
- 入口全部是 slot：`settings.section` / `sidebar.footer.action` / `conversation.composer.dock` / `conversation.input.right|left|overlay|dock` / `conversation.session.header.actions` 等
- ❌ **没有通用 contextmenu API**，只有特定菜单项槽（`sidebar.workspaces.session.menu.item` 等）

**Host 侧**

- `export function apply(ctx, config)` + `export const inject = ['tools']` + `export const Config`（schemastery）
- `ctx.tools.register(defineTool({ name, description, parameters, output, execute }))`
- `ctx.commands.register({ name, description, input:{hint}, handler })` → 斜杠命令（handler 返回 `{kind:'success'|'error', text}`）
- `ctx.systemPrompt.section()` → 注入 system prompt（**Client 做不到这句**）
- `ctx.fs` / `ctx.storage` / `ctx.webServer` / `node:fs` / `child_process`

**清单字段（易错）**

- `dsh.client` **恰好 4 个键**：`platform`(必填) / `inject`? / `external`? / `immediately`?
  —— **其他键被静默丢弃，不报错**（`dsh-client-modules/lib/index.js:62` `parseDshClient`）
- `dsh.bundle.patch` 可以是 `string` 或 `string[]`（`dsh-app-boot/lib/index.js:517`）
- 本地目录安装 = **link**（`@local/theme-studio: link:F:/...`），不是复制
- 安装：`dsh plugin --profile desktop add <pkg>`（转发给 pnpm）；`install_bundle` 接受绝对本地目录
- `cordis.patch.yml` 的 `!!js`（两个感叹号，不是 `!js`）在注入激活后按 getter 求值

### 一个已解释的矛盾（原列为"待核实"）

| 事实 | 出处 |
|------|------|
| 官方规范**明令禁止**：`Do not require('@deepseek-ai/dsh-client-ui-primitives')`，理由是 UI 组件库不保证跨版本稳定；要求自写控件、只依赖 `--dsw-alias-*` 设计令牌 | `skills/cordis-plugin-development/references/practices.md:35` |
| 但 `dsh-webui-prompt-optimizer` **实际 require 了它且能跑** | `dsh-webui-prompt-optimizer/lib/client.js:8` |

**结论**：这是**规范禁令，不是运行时限制**。运行时能解析，但升级 DSH 后有断链风险。

**决策：遵守规范，自写控件 + token 配色。** 少一个依赖，多一层稳定。
代价是 UI 工作量增加（无表格/树/表单组件），这已计入第 3-4 天排期。

### 安装侧三个必知事实（会咬人）

| 事实 | 后果 |
|------|------|
| `engines.dsh` / DSH peer 依赖不满足 → **直接拒绝安装**（不是警告） | 第一次打包必须核对 peer 版本 |
| 本地目录安装 = **link**，且 `files` 字段**对 linked 目录不生效** | 源码改了立刻生效，但也意味着不能靠 `files` 裁剪 |
| 新 bundle 可通过 HMR 激活；**替换已安装的包必须重启** | 首次装不用重启；改代码有时要重启 |

另：未知斜杠命令**被拒绝而不是降级成普通提示词**；slot 未声明时报
`slot "X" is not declared (a parent entry's children table must declare it)` —— 排错直接搜这句。

### 更正后的架构结论

三条写路径并存，职责不重叠：

```
client.js（渲染）          Host index.js（在线能力）        skill + tools/*.mjs（离线批处理）
──────────────────         ──────────────────────          ─────────────────────────────
列表 / 详情 / 表单          写文件 → ctx.fs                 批量重建索引
fetch → 同源路由            跑命令 → child_process           schema 校验
host.call() RPC             调模型 → 路由                    风格 → 视频渲染
复制到剪贴板                注册 tool / 斜杠命令
❌ 无 fs / 无 storage        ✅ 唯一"在线"写盘者              ✅ 唯一"离线"写盘者
```

**推论（影响排期）：第 3 天做插件时，必须一次写两个文件 —— `client.js` + `index.js`。**
只写 client.js 的插件，只能看、不能存。

### 对三个插件的具体影响（已更新）

| 插件 | 明天（skill+文件） | Client 半 | Host 半（必需） |
|------|-------------------|-----------|-----------------|
| B1 提示词 | 对话澄清 → 写 v1.md | 输入框右侧按钮（`conversation.input.right`）+ 结果面板 | `ctx.webServer` 路由调 LLM；`ctx.fs` 写 `prompts/` |
| B2 代码模板 | edit 渲染模板 | 侧栏列表 + 主区详情 + 变量表单 | `ctx.fs` 读模板写产物；`ctx.tools` 注册渲染工具 |
| B3 风格脚本 | grep → 读原文 → 写分镜 | 卡片墙 + 筛选 + 复制提示词 | `ctx.fs` 读 `styles/`；渲染接 `music_mv_render` |

**已知缺口**：client 端**没有现成的表格/树组件**，需自写（或实测 primitives）。
**不能 iframe 内嵌页面**（官方 practices 明令禁止）。

> 但 B5 的核心判断没变，只是主体变了：
> **"内容与界面解耦"依然成立，插件依然不是数据的唯一来源。**
> 变的只是：写盘者从"脚本一家"变成"脚本 + Host 两家"。这反而是好消息——
> 意味着插件能做到"点一下保存"的完整体验，不必退回复制粘贴。

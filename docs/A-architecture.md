# A. 总体架构（文字版架构图）

> 目标：一套可复用、可版本管理、可验收的 AI 工作流插件包。
> 覆盖：提示词工程 / 代码模板 / 视频风格脚本 / 本地知识库 / 300+ 风格提示词库。

---

## 1. 一句话架构

**内容与界面解耦**：所有资产是 `content/` 下的纯文件（md + json），
由 `schema/` 统一约束，通过两种入口消费 ——
给 AI 读的 **skill**，给人操作的 **plugin**，两者读同一份索引。

---

## 2. 四层架构图

```
┌───────────────────────────────────────────────────────────────────────┐
│  L2 接入层   —— 两种消费入口，同一数据源，可单独使用                     │
│                                                                        │
│   【AI 侧】skill × 3              【UI 侧】plugin × 1（双半结构）      │
│   skills/prompt-forge/            @local/ai-workflow-kit               │
│   skills/code-template/             ├─ client.js  sidebar × 3 入口     │
│   skills/video-style/               ├─ client.js  main 表单/列表/详情  │
│                                     └─ index.js   ctx.fs 写盘 + LLM    │
│   读取：grep 索引 → 只开命中的 md   读取：client 同源 fetch / host.call │
│   成本：零上下文，按需加载          能力：看 + 存（写盘靠 Host 半）     │
└────────────────┬───────────────────────────────┬──────────────────────┘
                 │                               │
                 │        同一份 _index.json     │
┌────────────────▼───────────────────────────────▼──────────────────────┐
│  L1 规范层   schema/   —— 唯一契约，所有插件/脚本/人共用                │
│                                                                        │
│   prompt.schema.json     结构化提示词（六段式 + 评分 + 版本）          │
│   template.schema.json   代码模板（语言/框架/占位符/测试/审查清单）     │
│   style.schema.json      风格条目（11 业务字段 + 8 索引字段）           │
│   kb.schema.json         知识库条目（来源/元数据/切片/引用）            │
│   batch.schema.json      分批计划条目                                   │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ validate.mjs 校验
┌────────────────────────────────▼───────────────────────────────────────┐
│  L0 内容层   content/   —— 全部纯文件，可复制、可 diff、可归档          │
│                                                                        │
│   prompts/     结构化提示词 + _versions/ 版本库 + _scores/ 评分记录     │
│   templates/   多语言/多框架模板 + 变量声明 + 测试文件 + 审查清单       │
│   styles/      400+ 风格库（_index.json 总索引 + 5 大类 + 16 批次）     │
│   kb/          本地文档知识库（原文/切片/索引/元数据/引用规则）         │
└────────────────────────────────┬───────────────────────────────────────┘
                                 │ node 脚本批量处理
┌────────────────────────────────▼───────────────────────────────────────┐
│  L3 执行层   tools/   —— 全部 node ESM，无第三方依赖                    │
│                                                                        │
│   build-index.mjs   扫 content/ → 重建所有 _index.json（禁止手改索引）  │
│   validate.mjs      按 schema 校验 → 输出 PASS/FAIL 清单（验收用）      │
│   render-style.mjs  风格条目 → index.html → MP4（接 music_mv_render）   │
│   kb-ingest.mjs     文档 → 切片 → 元数据 → 索引（增量、幂等）           │
│   new-prompt.mjs    新建提示词骨架 + 版本号自增                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 五条设计决策（每条都有"为什么"）

| # | 决策 | 为什么 |
|---|------|--------|
| D1 | **内容用纯文件，不用数据库** | 你机器上没有 git，未来也随时可以装；文件能被 `grep`、能被 diff、能被任意编辑器打开、能在没装 DSH 的机器上用。数据库做不到"可复制"。 |
| D2 | **插件只做壳，不做数据源** | 插件代码会随 DSH 版本失效（依赖 `@deepseek-ai/dsh-client-ui-*` 的 peer 版本），但 `content/` 里的内容十年后仍可用。换 UI 不用搬数据。 |
| D3 | **索引由脚本生成，禁止手改** | 已有 340 条风格库的教训：手写索引必然和原文漂移。`_index.json` 一律由 `build-index.mjs` 重建。 |
| D4 | **skill 是 AI 侧主入口，插件是可选增强** | 341 条风格库一次读完 ≈ 77 万 token，必爆上下文。skill 的三步法（搜索引→读一个系列→只开命中原文）是已验证的省 token 模式，插件做不出这个效果。 |
| D5 | **知识库是底座，风格库是它的特化子库** | 风格库本质是"带结构的知识条目"。统一 schema 后，风格检索可以复用知识库的检索/引用机制，不必写两套。 |

---

## 4. 数据流（三个典型动作）

### 动作 1：写一个新提示词
```
用户输入需求
  → Skill/插件 澄清追问（缺什么问什么）
  → 套六段式骨架（角色/上下文/任务/约束/输出格式/示例）
  → 写入 content/prompts/<slug>/v1.md
  → 六维评分写入 _scores/<slug>.json
  → build-index.mjs 重建索引
```

### 动作 2：用风格库做一个视频
```
用户说要什么感觉
  → grep content/styles/_index.json 命中候选（3-5 条）
  → 只读命中的 md 原文（每条约 1-2KB）
  → 填 {{占位符}} → 生成分镜表 + 口播 + 字幕
  → render-style.mjs → index.html → music_mv_render → MP4
  → 质检点逐条打勾 → 写回 质检记录
```

### 动作 3：往知识库放一批文档
```
原文丢进 kb/00_收件箱/
  → kb-ingest.mjs 识别格式 → 按标题切片（300-800字/片）
  → 生成 front-matter 元数据 → 写 40_元数据/meta/<id>.json
  → 原文归档到 10_原文/<主题>/（不可改）
  → 重建 30_索引/
  → validate.mjs 校验引用完整性
```

---

## 5. 目录现状（本方案落地后）

```
ai-workflow-kit/
├─ README.md                 总入口：5 分钟上手
├─ docs/
│  ├─ A-architecture.md      本文件
│  ├─ B-plugin-specs.md      三个插件输入输出规格
│  ├─ C-knowledge-base.md    知识库目录模板 + 元数据
│  ├─ D-style-library.md     300+ 风格库分类与分批
│  └─ E-tomorrow-mvp.md      2 小时 MVP 执行清单
├─ schema/                   四个 schema（JSON Schema draft-07）
├─ content/
│  ├─ prompts/               ├ <slug>/v1.md, v2.md ...
│  │                          ├ _versions/index.json
│  │                          └ _scores/<slug>.json
│  ├─ templates/             ├ <lang>/<framework>/<kind>/
│  ├─ styles/                ├ _index.json  ← 脚本生成
│  │                          ├ S1-code/  S2-ai-video/  S3-live/
│  │                          ├ S4-package/ S5-audio/
│  │                          └ _batches/batch-01.json ...
│  └─ kb/                    └ 见 C 文档
├─ tools/                    build-index / validate / render-style /
│                            kb-ingest / new-prompt
├─ skills-src/               三个 skill 的源文件（软链或复制到 ~/.dsh/skills）
└─ _audit/log.jsonl          每次生成的审计日志（谁/何时/输入/输出/schema版本）
```

---

## 6. 版本管理方案（因为本机没有 git）

**现状**：`git --version` 报 CommandNotFoundException，本机未安装 git。

### 方案 A（推荐，10 分钟）
```powershell
winget install --id Git.Git -e --source winget
```
装完 `git init`，此后每次 MVP 结束 `git commit`。这是唯一能真正做到"可回滚"的方式。

### 方案 B（不装 git 的兜底，现在就能用）
每个内容文件顶部带 `version` 字段，且：

```
content/prompts/<slug>/
  v1.md  v2.md  v3.md          # 不改旧版本，只新增
  _versions/index.json         # {version, created_at, change_note, score}
```

规则：
1. **只增不改**：任何修改都产生新版本号，旧版本保留。
2. **变更必写 note**：`change_note` 必填，说明"这版改了什么、为什么"。
3. **批量快照**：`tools/snapshot.ps1` 把整个 `content/` 打包成
   `_backup/2026-11-04_1530.zip`，一键可回到任意快照。
4. 磁盘成本可忽略（全文本，总大小预期 < 5MB）。

> 结论：方案 B 能覆盖"可复制、可验收、可追溯"，但**不能**优雅地做分支合并。
> 一旦你要多人协作，必须上 git。

---

## 7. 验收总原则

| 层级 | 验收方式 | 通过标准 |
|------|----------|----------|
| schema | `node tools/validate.mjs` | 0 error，每类至少 1 条样本通过 |
| 内容 | 抽样人工复核 | 抽 3 条，字段无空值、示例可跑 |
| 插件 | 面板能开、表单能提交 | 三个入口都能打开且不报错 |
| 风格库 | 抽 3 条走完整链路 | 能渲染出 MP4 或 index.html |
| 知识库 | 引用一个真实 chunk | 引用能定位到原文具体段落 |

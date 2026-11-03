# ai-workflow-kit

> 一套可复用、可版本管理、可验收的 AI 工作流插件包。
> 把「提示词工程 / 代码模板 / 视频风格脚本 / 本地知识库 / 300+ 风格库」落成可执行的系统。

---

## 先读什么

| 你想知道 | 读这个 | 用时 |
|----------|--------|------|
| 整体怎么搭的、为什么这么搭 | [A-architecture.md](docs/A-architecture.md) | 8 分钟 |
| 三个插件各吃什么、吐什么 | [B-plugin-specs.md](docs/B-plugin-specs.md) | 10 分钟 |
| 知识库目录怎么建、元数据怎么写 | [C-knowledge-base.md](docs/C-knowledge-base.md) | 8 分钟 |
| 300+ 风格库怎么分类、怎么分批 | [D-style-library.md](docs/D-style-library.md) | 10 分钟 |
| 明天 2 小时具体干什么 | [E-tomorrow-mvp.md](docs/E-tomorrow-mvp.md) | 5 分钟 |

---

## 一句话说明

**内容与界面解耦**：所有资产都是 `content/` 下的纯文件，
由 `schema/` 统一约束，通过两种入口使用 ——
给 AI 读的 **skill**，给人操作的 **plugin**。

---

## 现在有什么 / 明天做什么

**已完成（本方案设计阶段）**
- ✅ 四层架构与五条设计决策
- ✅ 三个插件的输入输出规格
- ✅ 知识库目录模板 + 元数据字段 + 引用规则
- ✅ 300+ 风格库的 19 字段规范 + 5 大类 + 16 批计划
- ✅ 2 小时 MVP 清单

**明天（2 小时）**
- schema × 3
- 三个 MVP 各一个（1 条提示词 / 1 个代码模板 / 1 条风格）
- 索引 + 校验 + 验收报告

**明确不做的**
- 350 条风格全做
- 插件 UI
- 知识库批量入库

---

## 关键前提

1. **本机已有 340 条代码动画风格**（`C:\Users\1\.dsh\skills\code-animation-styles\`），
   是 S1 大类的基础，不重复建设。
2. **本机已装 `dsh-webui-prompt-optimizer`**，它做单轮/多轮改写，
   B1 补的是澄清/结构化/评分/版本，不重写改写引擎。
3. **本机没有 git**，版本管理走「只增不改 + 快照」兜底；
   建议 10 分钟装 git，此后才真正可回滚。

---

## 目录

```
ai-workflow-kit/
├─ docs/         A-E 五份方案
├─ schema/       四个 JSON Schema（明天建）
├─ content/      prompts / templates / styles / kb
├─ tools/        build-index / validate / render-style / kb-ingest / new-prompt
└─ _audit/       生成审计日志
```

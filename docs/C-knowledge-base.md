# C. 本地文档知识库 —— 目录模板与规范

> 定位：知识库是整套系统的**底座**。风格库、模板库、提示词库都可以视为它的特化分区。

---

## 1. 目录模板

```
content/kb/
│
├─ 00_收件箱/              # 唯一允许"乱放"的地方
│  └─ inbox/               # 原文原样进入，不做任何改动
│     └─ 2026-11-04/       # 按投喂日期分子目录
│
├─ 10_原文/                # 归档后的原始文档 —— 只读，永不修改
│  ├─ 技术/
│  │  ├─ 前端/  后端/  数据库/  运维/
│  ├─ 业务/
│  │  ├─ 需求/  方案/  复盘/  竞品/
│  ├─ 素材/
│  │  ├─ 文案/  脚本/  分镜/  参考图/
│  ├─ 个人/
│  │  ├─ 笔记/  想法/  读书/
│  └─ _orphan/            # 无法归类的先放这，月度清理
│
├─ 20_切片/                # 结构化切片 —— 检索与引用的实际单位
│  └─ chunks/
│     └─ <doc_id>/
│        ├─ 001.md         # 单 chunk：300-800 字 + front-matter
│        ├─ 002.md
│        └─ ...
│
├─ 30_索引/                # 全部由 build-index.mjs 生成，禁止手改
│  ├─ _index.json          # 主索引（机读，全字段）
│  ├─ by-topic.md          # 按主题
│  ├─ by-tag.md            # 按标签
│  ├─ by-date.md           # 按时间
│  └─ by-source-type.md    # 按来源类型（pdf/docx/md/web）
│
├─ 40_元数据/
│  └─ meta/
│     └─ <doc_id>.json     # 一篇文档一个元数据文件
│
├─ 50_规则/
│  ├─ citation.md          # 引用规则（必读）
│  ├─ naming.md            # 命名规范
│  ├─ chunking.md          # 切片策略
│  └─ retention.md         # 保留与淘汰
│
└─ 90_归档/                # 过期但保留的文档
```

### 命名规范（`50_规则/naming.md` 摘要）

| 对象 | 格式 | 示例 |
|------|------|------|
| doc_id | `<主题缩写>-<yyyymmdd>-<序号>` | `fe-20261104-001` |
| chunk 文件 | 三位零填充序号 | `003.md` |
| 元数据 | 与 doc_id 同名 | `fe-20261104-001.json` |
| 标签 | 小写、连字符、无空格 | `react-hooks` |

---

## 2. 元数据字段（`kb.schema.json`）

```jsonc
{
  "id": "fe-20261104-001",          // 必填，全局唯一
  "title": "React 性能优化清单",     // 必填
  "source_path": "10_原文/技术/前端/react-perf.md",  // 必填，相对 content/kb
  "source_type": "md",               // 必填：pdf|docx|pptx|xlsx|md|txt|html|web
  "source_url": "",                  // 来源是网页时必填
  "author": "",                      // 未知留空，不要填"未知"
  "created_at": "2026-10-20",        // 文档自身日期
  "ingested_at": "2026-11-04T15:30:00+08:00",  // 进库时间
  "topic": "前端性能",                // 单值，用于一级分类
  "tags": ["react", "performance", "memo"],  // 3-8 个
  "summary": "一段话概括，≤120 字",   // 必填，用于检索召回
  "key_points": [                    // 3-7 条，每条一行，可独立引用
    "memo 只在 props 浅比较失败时才需要",
    "列表 key 用稳定 id，不要用索引"
  ],
  "entities": ["React", "memo", "useMemo"],  // 专有名词，用于实体检索
  "relations": [                     // 与其他文档的关联
    {"type": "extends", "target": "fe-20261012-003"},
    {"type": "contradicts", "target": "fe-20260901-007", "note": "关于 useMemo 的建议相反"}
  ],
  "sensitivity": "internal",         // public|internal|private
  "chunk_count": 7,
  "lang": "zh",
  "version": 1,
  "supersedes": "",                  // 若替代旧文档，填旧 id
  "status": "active"                 // active|archived|draft
}
```

### chunk 的 front-matter

```markdown
---
doc_id: fe-20261104-001
chunk: 3
heading_path: "性能优化 > 渲染 > memo"
char_count: 412
---
正文……
```

`heading_path` 是关键：它让引用能定位到"某文档的某一节"，而不只是"某文档"。

---

## 3. 切片策略（`50_规则/chunking.md`）

| 规则 | 值 | 理由 |
|------|-----|------|
| 切分依据 | Markdown 标题层级（`##`/`###`） | 天然语义边界，比按字数硬切好 |
| 单片长度 | 300-800 字 | 低于 300 信息不足，高于 800 召回噪声大 |
| 超长节处理 | 按段落二次切，保留 1 行上文摘要 | 不丢上下文 |
| 过短节处理 | 与下一节合并，直到 ≥300 字 | 避免碎片 |
| 表格/代码块 | 不切开 | 切开即语义损坏 |
| 每片必备 | `heading_path` + `doc_id` | 引用可定位 |

---

## 4. 引用规则（`50_规则/citation.md` —— 这是"引用规则"的核心）

### 格式
```
[KB:<doc_id>#<chunk>]
例：[KB:fe-20261104-001#3]
```

### 硬规则
1. **任何来自知识库的事实陈述必须带引用**，无引用即视为模型臆造。
2. **引用必须能反查**：`validate.mjs` 会检查 `doc_id` 存在、`chunk` 不越界、
   `source_path` 仍存在。任一项失败 → 该引用标红。
3. **`sensitivity: private` 的内容禁止进入任何对外产物**（公开视频、对外文档）。
4. **一因多源时列主辅**：`[KB:a#1][KB:b#4]`，前者为主源。
5. **不得引用 `status: archived` 的内容**作为当前结论依据（可作历史背景，需注明）。
6. **引用不改写原文**：允许概括，但不得让概括与原文倾向相反。

### 引用落点
- 写进提示词：放在"上下文"段，格式 `[KB:xxx#n] 原文要点`
- 写进视频口播：不上屏，但脚本里保留引用以便核稿
- 写进代码注释：`// ref: [KB:xxx#n]`

---

## 5. 检索方式（给 AI 用）

```powershell
# 1. 先在主索引里搜关键词（只返回 id/title/summary，不读正文）
Select-String -Path content/kb/30_索引/_index.json -Pattern "memo|渲染"

# 2. 命中后读元数据确认相关性
Get-Content content/kb/40_元数据/meta/fe-20261104-001.json

# 3. 只读命中的 chunk
Get-Content content/kb/20_切片/chunks/fe-20261104-001/003.md
```

> 禁止：整库读 `_index.json` 或整目录读 chunk。
> `_index.json` 超过 200KB 时必须改用 `by-topic.md` 分区检索。

---

## 6. 入库流程（`kb-ingest.mjs`）

```
1. 扫描  00_收件箱/inbox/**/*
2. 识别  扩展名 → 解析器（md 直读；docx/pdf 走 python-docx / pdfplumber）
3. 提取  标题 / 作者 / 日期 / 正文
4. 切片  按标题层级 → chunks/*.md
5. 生成  元数据（summary 与 key_points 需 LLM 或人工补，脚本先留 TODO）
6. 归档  原文移动到 10_原文/<topic>/
7. 判重  标题+正文指纹（sha1 前 16 位）已存在 → 跳过并记入报告
8. 重建  调用 build-index.mjs
9. 报告  输出：新增 N 篇 / 跳过 N 篇 / 切片 N 个 / 待补元数据 N 篇
```

**幂等要求**：同一文件重复投喂，结果必须完全相同，不得产生重复 chunk。

---

## 7. 验收标准

- [ ] 投喂 3 类不同格式（md / docx / pdf）各 1 篇，全部成功切片
- [ ] `validate.mjs` 对引用检查 0 error
- [ ] 随机抽 1 个 chunk，用 `heading_path` 能在原文里精确找到对应段落
- [ ] 重复投喂同一文件，`chunk_count` 不变
- [ ] `by-topic.md` / `by-tag.md` 能按关键词定位到 doc_id

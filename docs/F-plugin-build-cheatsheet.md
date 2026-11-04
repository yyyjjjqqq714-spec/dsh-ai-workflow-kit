# F. 插件施工速查表（从 98 条 Slot 目录中筛出实际要用的）

> 来源：`dsh-cordis-client-runner/lib/client.js` 内嵌的 Slot 目录常量。
> 完整 98 条见该文件 `client.js:4372` 起；这里只留三个插件会用到的。

---

## 1. 三个插件实际要用的 Slot

### B1 提示词优化器
| slot | kind | 用途 |
|------|------|------|
| `conversation.input.right` | list | 输入框右侧「优化」按钮（`dsh-webui-prompt-optimizer` 就用这个） |
| `conversation.input.overlay` | list | 结果弹层 |
| `conversation.composer.dock` | list | 输入区下方工具条 |
| `conversation.composer` | chain | 整体替换 composer（激进，一般不用） |
| `settings.section` | list | 设置页里的配置区块 |

### B2 代码模板库
| slot | kind | 用途 |
|------|------|------|
| `sidebar.panellist` | list | 侧栏图标入口，**`id` 必填** |
| `main` | keyed | 主区页面，**`key` 与上面 `id` 同名即联动** |
| `sidebar.panellist.actions` | list | 面板上的操作按钮 |
| `shell.overlay` | list | 全屏弹窗（预览渲染结果） |

### B3 视频风格库
| slot | kind | 用途 |
|------|------|------|
| `sidebar.panellist` | list | 入口 |
| `main` | keyed | 卡片墙主区 |
| `sidebar.right.pane.tab` | keyed | 右栏预览（样片） |
| `conversation.input.right` | list | 「应用此风格」写进草稿 |

---

## 2. 注册选项全集（11 个）

```js
ctx.slots.inject('slot.name', () => ctx.slots.register({
  name:      'slot.name',      // 总是必填
  id:        'my-id',          // list 槽必填（也是 main 的 key）
  key:       'my-key',         // keyed 槽必填
  select:    fn,               // chain 槽必填
  order:     100,              // 升序，默认 0
  label:     () => '中文名',   // string | (() => string)，thunk 跟随语言热更新
  priority:  0,                // 高者遮蔽低者
  children:  { 'my.sub.slot': { kind: 'chain', scope: 'root' } },
  store:     fn,
  inject:    () => ({ ... }),
  locale:    'my-ns',
  registrant:'diag-label',
}, Component))
```

**必填规则**（违反即硬抛）：
- `list` 缺 `id` → `list slot "X" requires options.id`
- `keyed` 缺 `key` → `keyed slot "X" requires options.key`
- `chain` 缺 `select` → `chain slot "X" requires options.select`
- 槽未声明 → `slot "X" is not declared (a parent entry's children table must declare it)`

---

## 3. 复合 UI 的两条路

### 路线 A：官方 panel 约定（推荐，最省事）
```js
// 侧栏入口
ctx.slots.register({
  name: 'sidebar.panellist', id: 'templates', order: 100, label: () => '模板库',
}, SidebarIcon)

// 主区页面（key 与 id 同名 → 自动联动）
ctx.slots.register({
  name: 'main', key: 'templates',
}, TemplatePage)

// 切页（可选，点图标时一般自动切）
ctx.layout.selectPanel('templates')
ctx.layout.selectPanel(null)   // 回到对话
```

> `main` 的 `conversation` 是保留 key，不要占用。

### 路线 B：自声明子槽（需要三级嵌套时）
```js
ctx.slots.register({
  name: 'shell.overlay', id: 'my.root',
  children: { 'my.detail.slot': { kind: 'keyed', scope: 'root' } },
}, RootComponent)
```

---

## 4. Host 半最小骨架

```js
export const inject = ['webServer', 'tools']
export const Config = Schema.object({ /* schemastery */ })

export function apply(ctx, config) {
  // 1. 给 client 提供数据
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/ai-workflow-kit/api',
    handler: async (req, res) => {
      const files = await ctx.fs.list(...)     // 读 content/
      res.writeHead(200, {'content-type':'application/json'})
      res.end(JSON.stringify(files))
    },
  }))

  // 2. 注册 agent tool（可选）
  ctx.tools.register(defineTool({
    name: 'render_template',
    description: '渲染代码模板到目标目录',
    parameters: { templateId: { type:'string', required:true } },
    output: { schema: { type:'object' }, render: textRender(v => v.path) },
    execute: async (args, exec) => { /* ctx.fs.write ... */ },
  }))
}
```

`ctx.fs` 错误码：`FS_NOT_FOUND` / `FS_STALE_VERSION` / `FS_AMBIGUOUS_EDIT`。
**写之前先 read**，否则可能撞 `FS_STALE_VERSION`。

---

## 5. 安装与调试

```powershell
# 装本地工程（= link，不是复制）
dsh plugin --profile desktop add "F:\软件\DeepSeek Harness工作区\ai-workflow-kit"
```

| 注意 | 说明 |
|------|------|
| 首次装 | 可经 HMR 激活 |
| 替换已装包 | **必须重启 DSH** |
| linked 目录 | `files` 字段不生效，源码改了立刻生效 |
| peer 版本不符 | **拒绝安装**，不是警告 |
| 构造脚本 | 需 `approvedBuilds` 显式批准 |

**调试顺序**：
1. `client.js` 先只注册一个 `sidebar.panellist`，确认能出现
2. 再加 `main` 同名 key，确认能切页
3. 再加 `index.js` 的 webServer 路由，浏览器 `fetch` 验证
4. 最后才接 `ctx.fs` 写盘

---

## 6. 不要做的事

| 禁止 | 原因 |
|------|------|
| `require('@deepseek-ai/dsh-client-ui-primitives')` | `practices.md:35` 明令禁止（跨版本不稳），但**运行时能用**——遵守规范，自写控件 + `--dsw-alias-*` token |
| iframe 内嵌 Host 生成的页面 | 拿不到主题 token / 亮暗切换 / `ctx.locale` |
| 用 localStorage 存业务数据 | 按 origin 共享、无插件级隔离、无配额，只适合 UI 偏好 |
| 依赖通用右键菜单 | **不存在**该 API，只有特定菜单项槽 |

---

## 7. 调试：如何取 DSH 的 Console 报错（2026-11-03 实测）

DSH 是 Electron，渲染进程的 console **不落盘**，没有任何日志文件能查到前端报错。只能用下面这套：

```powershell
# 1. 激活 DSH 主窗口
$p = Get-Process | ? { $_.ProcessName -like '*DeepSeek*' -and $_.MainWindowTitle } | Select -First 1
[W]::SetForegroundWindow([IntPtr]$p.MainWindowHandle)

# 2. 发 F12（keybd_event，SendKeys 在 pwsh 7 的 MTA 下不可靠）
[K]::keybd_event(0x7B,0,0,[IntPtr]::Zero); [K]::keybd_event(0x7B,0,2,[IntPtr]::Zero)

# 3. 截图读原文（人眼读图，不要试图抓文本）
```

**踩坑（全部实测）**：
- **坐标点击不可靠**：`AI 工作流` 行 rect 是 `(584,382) 252x36`，点 `(660,420)` 差 **2px** 就落到隔壁「更多」行，弹出会话菜单。必须用 `BoundingRectangle` 的中心 `(710,400)`。
- **UIA 是可靠入口**：`AutomationElement` 按 `NameProperty` 能精确找到侧栏按钮（`ControlType.Button`），支持 `InvokePattern`，直接 `Invoke()` 比鼠标稳。
- **UIA FindFirst 会串台**：全局搜 `Name='Console'` 命中的是**别的应用**的控件（本次命中了 ArcMap 区域），不是 DevTools 的 tab。要按 `BoundingRectangle` 落在 DSH 窗口范围内过滤。
- **DevTools 的 Console 计数徽章**在标签上（本次显示红色 `27`），但 27 = log + warn + error 的总数，不等于错误数。
- **关 DevTools 同样是 F12**，关闭后布局恢复。

**实测结论（2026-11-03 的 27 条红字）**：全部与本插件无关，是既存问题：

| 报错原文 | 来源判断 |
|----------|----------|
| `dash-app://app/dsh-tea-web.html/list-fonts-1` → `405 (Method Not Allowed)` ×5 | 某字体面板插件 |
| `dash-app://app/plugins/events-1` → `net::ERR_FAILED` ×8 | 插件事件流通道 |
| `models.dev/api.json` → `net::ERR_NAME_NOT_RESOLVED` | 外网域名（本机网络受限，git 也被拦过） |
| `katex-*.css-1` → `404 (Not Found)` | 公式渲染样式 |
| `[connection] connection lost, retry plugins/...` | 插件连接重试 |

**判定插件是否正常的依据**：面板能渲染出内容 = `client.js` 加载 → factory 执行 → slot 注册全链路通过。console 里有别家红字不影响。

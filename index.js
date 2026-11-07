/**
 * AI Workflow Kit —— 宿主半入口。
 *
 * 这一层只做装配：
 *   content  → 读 content/ 下的纯文件（自包含，不依赖本机绝对路径）
 *   routes   → 挂 /awkit/api 同源路由给 client 半
 *   tools    → 注册 Agent 工具（宿主有 tools 服务时）
 *   commands → 注册 /awkit 斜杠命令（宿主有 commands 服务时）
 *
 * 依赖全部可选降级：缺 tools 或 commands 时面板仍然可用，不会拒绝加载。
 */
import { createContentService } from './lib/content.js'
import { createHandler } from './lib/routes.js'
import { registerTools } from './lib/tools.js'
import { registerCommands } from './lib/commands.js'

export const name = 'ai-workflow-kit'

/** webServer 是硬依赖：没有它 client 半拿不到数据。 */
export const inject = ['webServer']

export function apply(ctx, config = {}) {
  const options = {
    contentDir: typeof config.contentDir === 'string' && config.contentDir ? config.contentDir : undefined,
    allowCors: config.allowCors !== false,
    cacheSeconds: Number.isFinite(config.cacheSeconds) ? config.cacheSeconds : 86400,
    maxPromptChars: Number.isFinite(config.maxPromptChars) ? config.maxPromptChars : 200_000,
  }

  const content = createContentService({ contentRoot: options.contentDir })
  const handler = createHandler({ content, options })

  // ---- HTTP 路由 ----
  ctx.effect(() =>
    ctx.webServer.register({
      kind: 'prefix',
      path: '/awkit/api',
      handler,
    }),
  )

  // ---- Agent 工具（可选）----
  // 宿主没有 tools 服务、或 ctx.inject 签名不兼容时，都只降级不阻断加载。
  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['tools'], (scope) => {
        scope.effect(() => registerTools(scope, content))
      })
    } else if (typeof ctx.tools?.register === 'function') {
      ctx.effect(() => registerTools(ctx, content))
    }
  } catch (err) {
    ctx.logger?.warn?.(`[ai-workflow-kit] Agent 工具注册跳过: ${String((err && err.message) || err)}`)
  }

  // ---- 斜杠命令（可选）----
  try {
    if (typeof ctx.inject === 'function') {
      ctx.inject(['commands'], (scope) => {
        registerCommands(scope, content)
      })
    } else if (typeof ctx.commands?.register === 'function') {
      registerCommands(ctx, content)
    }
  } catch (err) {
    ctx.logger?.warn?.(`[ai-workflow-kit] 斜杠命令注册跳过: ${String((err && err.message) || err)}`)
  }

  ctx.logger?.info?.(
    `[ai-workflow-kit] 已挂载 /awkit/api，内容目录 ${content.root}`,
  )
}

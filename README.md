# AI Workflow Kit for DeepSeek Harness

[中文说明](README.zh.md)

A sidebar panel that puts a **340-entry code-animation style library**, **prompt
templates** and **renderable code templates** one click away from the chat — and
exposes the same library to the agent as tools, so it can search a style and
write the implementation prompt for you.

Everything ships inside the package: no extra download, no network call, no
absolute path baked into your machine.

---

## Why this exists

Prompt libraries usually live in a folder you forget the path of. This one is a
plugin: the library is browsable as thumbnails, searchable by id / name / tag,
and callable by the agent during a normal conversation.

- **340 video styles** across 10 series (code samples, cartoon, motion graphics,
  Chinese ink, Oscar-film palettes, code-video, …), each with the original
  implementation prompt.
- **8 prompt templates** for storyboards, title cards, style mixing, style →
  code, tutorials and scripts.
- **5 code templates** (Fastify route, React component, Zod schema, FastAPI
  router, argparse CLI) with variables and one-click rendering.
- **Storyboard forge**: pick a style, type a topic, get a complete director
  instruction with platform rules baked in.

## Install

From the plugin market, or:

```sh
dsh plugin --profile web add dsh-ai-workflow-kit
```

Pin a release tarball instead:

```sh
dsh plugin --profile web add "https://github.com/yyyjjjqqq714-spec/dsh-ai-workflow-kit/releases/latest/download/dsh-ai-workflow-kit.tgz"
```

Requires DeepSeek Harness `>= 0.1.7`. Restart DSH after installing a replacement
build; a first install can activate through HMR.

## Use

**Sidebar** — click **AI 工作流** to open the panel. Three tabs, one search box
(`/` focuses it).

- **视频风格** — thumbnail wall grouped by series. Click a card for the full
  prompt, a "copy prompt" button, and **生成分镜指令** which turns the style plus
  a topic / platform / duration into a ready director instruction.
- **提示词** — 8 templates, copy or send straight into the conversation.
- **代码模板** — fill the variable form, watch the rendered source update live,
  copy it or send it to the chat.

**Slash command**

```
/awkit                 overview + help
/awkit 水墨            keyword search, shows the top hit's prompt
/awkit S1-A3           exact id
/awkit prompts         prompt inventory
/awkit templates       code template inventory
```

**Agent tools** — the model can call these during a normal turn:

| Tool | What it does |
|---|---|
| `awkit_search` | search styles / prompts / templates |
| `awkit_get_style` | full style prompt by id |
| `awkit_render_template` | render a code template with variables (dry-run by default) |
| `awkit_overview` | inventory of the whole library |

Typical ask: *"用 S1-A3 这个风格，帮我做一条 45 秒抖音讲别熬夜的分镜"* — the agent
finds the style, pulls the prompt, and produces the storyboard.

## Privacy and permissions

- Content is read from the package itself (`content/`), through `node:fs`
  read-only calls.
- The only HTTP surface is a same-origin prefix route `/awkit/api` used by the
  panel in your own browser.
- No telemetry, no outbound network requests, no shell.
- Writing is opt-in and single-purpose: `awkit_render_template` writes only when
  the caller passes `write: true` **and** a `targetDir`, and refuses paths that
  escape that directory.

## Structure

```
index.js            host entry — assembly only
lib/content.js      content layer: load, cache, search, error codes
lib/routes.js       same-origin REST API (old and new routes both supported)
lib/tools.js        agent tools
lib/commands.js     slash commands
client.js           browser half: panel, detail views, forge, renderer
content/            340 styles + thumbnails, 8 prompts, 5 templates
tools/              build + smoke scripts (not shipped in the tarball)
```

Local development:

```sh
node tools/prepare-content.mjs      # copy style markdown into the package
node tools/build-content-manifest.mjs
node tools/smoke.mjs                # host half
node tools/check-client.mjs         # browser half
```

## License

MIT. Third-party style prompts keep their original terms; see
`content/styles/` for source attribution.

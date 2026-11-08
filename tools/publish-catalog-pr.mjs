#!/usr/bin/env node
/**
 * 用 GitHub git-data API 把「已插入本插件一行」的两个 README 提交到 fork。
 * 前提：fork 的 main 已被强制同步到 upstream 最新 head（parent 必须是它，
 * 否则 GitHub 的三方比较算不平，PR 会带上无关文件）。
 *
 * 环境变量：
 *   GH_TOKEN   必填，GitHub OAuth token
 *   FORK       owner/repo，默认 yyyjjjqqq714-spec/awesome-dsh-plugin
 *   PARENT_SHA 新提交的父提交，默认 cd36e8582eaa2a3e64f4e68d28dd8b73b255563f
 *
 * 输入：
 *   %TEMP%\awesome-readme.md.new
 *   %TEMP%\awesome-readme-zh.md.new
 */
import { readFileSync } from 'node:fs'

const TOKEN = process.env.GH_TOKEN
if (!TOKEN) {
  console.error('缺少 GH_TOKEN')
  process.exit(1)
}
const FORK = process.env.FORK || 'yyyjjjqqq714-spec/awesome-dsh-plugin'
const PARENT = process.env.PARENT_SHA || 'cd36e8582eaa2a3e64f4e68d28dd8b73b255563f'
const API = 'https://api.github.com'
const TMP = process.env.TEMP || process.env.TMP

const base = {
  Authorization: `Bearer ${TOKEN}`,
  'User-Agent': 'awkit-publisher',
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
}

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: base,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 800)}`)
  }
  return text ? JSON.parse(text) : null
}

const readme = readFileSync(`${TMP}\\awesome-readme.md.new`, 'utf8')
const readmeZh = readFileSync(`${TMP}\\awesome-readme-zh.md.new`, 'utf8')

console.log(`README.md      ${readme.length} 字符`)
console.log(`README.zh.md   ${readmeZh.length} 字符`)

const blobEn = await call('POST', `/repos/${FORK}/git/blobs`, {
  content: readme,
  encoding: 'utf-8',
})
console.log(`blob README.md    ${blobEn.sha}`)

const blobZh = await call('POST', `/repos/${FORK}/git/blobs`, {
  content: readmeZh,
  encoding: 'utf-8',
})
console.log(`blob README.zh.md ${blobZh.sha}`)

const parent = await call('GET', `/repos/${FORK}/git/commits/${PARENT}`)
console.log(`parent tree       ${parent.tree.sha}`)

const tree = await call('POST', `/repos/${FORK}/git/trees`, {
  base_tree: parent.tree.sha,
  tree: [
    { path: 'README.md', mode: '100644', type: 'blob', sha: blobEn.sha },
    { path: 'README.zh.md', mode: '100644', type: 'blob', sha: blobZh.sha },
  ],
})
console.log(`new tree          ${tree.sha}`)

const commit = await call('POST', `/repos/${FORK}/git/commits`, {
  message: 'Add dsh-ai-workflow-kit to Workflow & Automation',
  tree: tree.sha,
  parents: [PARENT],
})
console.log(`new commit        ${commit.sha}`)

await call('PATCH', `/repos/${FORK}/git/refs/heads/main`, {
  sha: commit.sha,
  force: true,
})
console.log(`fork main ->      ${commit.sha}`)
console.log('DONE')

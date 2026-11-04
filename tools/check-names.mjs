import fs from 'node:fs'
const IDX = 'F:/软件/DeepSeek Harness工作区/ai-workflow-kit/content/styles/_index.json'
const rows = JSON.parse(fs.readFileSync(IDX, 'utf8'))
const target = ['S5-M14_', 'S5-M15_', 'S5-M16_', 'S5-M17_', 'S5-M26_', 'S5-M35_', 'S5-M39_', 'S5-M40_']
for (const id of target) {
  const r = rows.find((x) => x.id === id)
  console.log(id, '->', r ? r.name : '(missing)')
}

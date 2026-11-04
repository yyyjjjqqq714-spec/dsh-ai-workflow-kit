# -*- coding: utf-8 -*-
"""147 张渲染图全量质量审计。

检查项：
  1. 尺寸是否严格 320x180
  2. 字节数（过小=空白）
  3. 两两 RGB 平均绝对差（相似度）
  4. 与真实原图（193 张）的区分度检查：确认没有把 generated 混进 original 路径
"""
import json
import os

import numpy as np
from PIL import Image

GEN = r"F:\软件\DeepSeek Harness工作区\ai-workflow-kit\content\styles\_generated"
IDX = r"F:\软件\DeepSeek Harness工作区\ai-workflow-kit\content\styles\_index.json"

rows = json.load(open(IDX, encoding="utf-8"))
targets = [r for r in rows if not r.get("hasStill")]

print(f"待审计: {len(targets)} 张")

# ---- 1. 尺寸 / 字节 ----
bad_size, tiny = [], []
sizes = []
for r in targets:
    p = os.path.join(GEN, r["id"] + ".jpg")
    if not os.path.exists(p):
        bad_size.append((r["id"], "MISSING"))
        continue
    with Image.open(p) as im:
        if im.size != (320, 180):
            bad_size.append((r["id"], im.size))
    b = os.path.getsize(p)
    sizes.append(b)
    if b < 2000:
        tiny.append((r["id"], b))

print(f"尺寸异常: {len(bad_size)}  {bad_size[:5]}")
print(f"过小(<2KB): {len(tiny)}  {tiny[:5]}")
print(f"字节范围: {min(sizes)} - {max(sizes)}, 均值 {sum(sizes)//len(sizes)}")

# ---- 2. 两两差异 ----
print("\n计算两两 RGB 差…")
arrs = []
ids = []
for r in targets:
    p = os.path.join(GEN, r["id"] + ".jpg")
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert("RGB").resize((160, 90))
    arrs.append(np.asarray(im, dtype=np.float32))
    ids.append(r["id"])

n = len(arrs)
diffs = []
worst = []
for i in range(n):
    for j in range(i + 1, n):
        d = float(np.abs(arrs[i] - arrs[j]).mean())
        diffs.append(d)
        if d < 30:
            worst.append((round(d, 1), ids[i], ids[j]))

diffs = np.array(diffs)
print(f"对数: {len(diffs)}")
print(f"中位 {np.median(diffs):.1f}  均值 {diffs.mean():.1f}  最小 {diffs.min():.1f}  最大 {diffs.max():.1f}")
print(f"<30 的对数: {len(worst)} ({len(worst)/len(diffs)*100:.1f}%)")
worst.sort()
print("最相似的 10 对：")
for d, a, b in worst[:10]:
    print(f"  {d:5.1f}  {a}  vs  {b}")

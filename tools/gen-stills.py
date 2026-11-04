# -*- coding: utf-8 -*-
"""为无参考图的风格生成"示意卡"（程序化视觉预告，非真实效果截图）。

输出: content/styles/_generated/<id>.jpg  320x180
依赖: Pillow（本机已装 12.3）

两级视觉决策：
  1) 名称关键词（粉笔/像素/终端/水墨/蓝图...）优先，决定专属画法
  2) 否则回落到所属系列的通用视觉语言
"""
import json
import os
import random
import re

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = r"F:\软件\DeepSeek Harness工作区\ai-workflow-kit"
IDX = os.path.join(ROOT, "content", "styles", "_index.json")
OUT = os.path.join(ROOT, "content", "styles", "_generated")

FONT_B = r"C:\Windows\Fonts\msyhbd.ttc"
FONT_R = r"C:\Windows\Fonts\msyh.ttc"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"

W, H = 320, 180

SERIES_CN = {
    "S2": "现成版式", "S3": "卡通画风", "S5": "动态风格",
    "S8": "mg-styles", "S9": "code-video", "S10": "中国风",
}

# 系列默认配色：bg, ink, a1, a2
PALETTES = {
    "S2": ("#ffffff", "#1a1a1a", "#e63946", "#457b9d"),
    "S3": ("#fff8ef", "#2b2b2b", "#f4a261", "#e76f51"),
    "S5": ("#0f1115", "#e8e8e8", "#4f7cff", "#8b5cf6"),
    "S8": ("#f5f7fa", "#1f2937", "#06b6d4", "#a855f7"),
    "S9": ("#0b0f0c", "#7cf08a", "#1f7a35", "#d6f5c8"),
    "S10": ("#f2ede3", "#1c1a17", "#6b6156", "#b03a2e"),
}


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return ImageFont.load_default()


def hex2rgb(h):
    if isinstance(h, (tuple, list)):
        return tuple(h)
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def blend(c1, c2, t):
    a = hex2rgb(c1)
    b = hex2rgb(c2)
    return tuple(int(a[i] * (1 - t) + b[i] * t) for i in range(3))


# ---------------- 关键词专属画法 ----------------

def draw_chalk(name, rnd):
    """粉笔黑板：墨绿黑板 + 粉尘质感的白/彩色粉笔字。"""
    img = Image.new("RGB", (W, H), (28, 42, 34))
    d = ImageDraw.Draw(img)
    # 黑板擦痕
    for _ in range(14):
        x, y = rnd.randint(-20, W), rnd.randint(0, H)
        d.line([x, y, x + rnd.randint(30, 90), y + rnd.randint(-6, 6)],
               fill=(58, 76, 64), width=rnd.randint(1, 3))
    # 粉笔字（几行手写感）
    words = ["一笔一笔", "讲清楚", "为什么", "看这里"]
    for i, wtext in enumerate(words):
        d.text((26 + rnd.randint(-8, 8), 30 + i * 30), wtext,
               font=font(FONT_R, 20), fill=(235, 238, 228))
    d.text((220, 40), "≈", font=font(FONT_R, 46), fill=(232, 196, 120))
    return img


def draw_pixel(name, rnd):
    """像素：16px 网格色块拼出的图案。"""
    img = Image.new("RGB", (W, H), (18, 20, 28))
    d = ImageDraw.Draw(img)
    cols = ["#ff5d5d", "#5dd6ff", "#ffd75d", "#8bff8b", "#c38bff"]
    for gy in range(0, H, 16):
        for gx in range(0, W, 16):
            if rnd.random() < 0.18:
                d.rectangle([gx, gy, gx + 16, gy + 16], fill=hex2rgb(rnd.choice(cols)))
    # 中心像素小人
    cx, cy = 148, 78
    body = [(0, 0), (16, 0), (0, 16), (16, 16), (-16, 16), (0, 32), (16, 32)]
    for dx, dy in body:
        d.rectangle([cx + dx, cy + dy, cx + dx + 14, cy + dy + 14], fill=hex2rgb("#ffd75d"))
    return img


def draw_terminal(name, rnd):
    """终端 / CRT：黑底绿字 + 扫描线。"""
    img = Image.new("RGB", (W, H), (6, 12, 8))
    d = ImageDraw.Draw(img)
    glyphs = "{}[]()=>;:/*+-$#@01"
    for row in range(9):
        y = 10 + row * 17
        s = "".join(rnd.choice(glyphs) for _ in range(26))
        d.text((14, y), s, font=font(FONT_MONO, 11),
               fill=blend(hex2rgb("#7cf08a"), hex2rgb("#060c08"), rnd.uniform(0.35, 0.9)))
    for y in range(0, H, 3):
        d.line([0, y, W, y], fill=(0, 0, 0), width=1)
    d.rectangle([8, 6, W - 8, H - 6], outline=(40, 90, 50), width=1)
    return img


def draw_ink(name, rnd):
    """水墨 / 工笔 / 山水：宣纸 + 墨晕。"""
    img = Image.new("RGB", (W, H), (242, 237, 227))
    d = ImageDraw.Draw(img)
    for i in range(9):
        x, y = rnd.randint(10, W - 10), rnd.randint(20, 150)
        r = rnd.randint(6, 40)
        c = rnd.choice([(28, 26, 23), (107, 97, 86), (176, 58, 46)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=blend(c, (242, 237, 227), 0.80))
    img = img.filter(ImageFilter.GaussianBlur(1.0))
    # 一道竹枝
    d = ImageDraw.Draw(img)
    d.line([40, 150, 62, 60], fill=(40, 48, 36), width=3)
    return img


def draw_blueprint(name, rnd):
    """蓝图 / 工程制图：深蓝底 + 白色细线网格。"""
    img = Image.new("RGB", (W, H), (18, 44, 82))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 16):
        d.line([x, 0, x, H], fill=(40, 78, 130), width=1)
    for y in range(0, H, 16):
        d.line([0, y, W, y], fill=(40, 78, 130), width=1)
    for _ in range(5):
        x, y = rnd.randint(20, W - 60), rnd.randint(20, H - 40)
        w, h = rnd.randint(24, 70), rnd.randint(14, 44)
        d.rectangle([x, y, x + w, y + h], outline=(200, 220, 245), width=1)
    d.ellipse([120, 40, 210, 130], outline=(200, 220, 245), width=1)
    return img


# ---------------- 系列通用画法 ----------------

def draw_s2(name, rnd):
    img = Image.new("RGB", (W, H), hex2rgb("#ffffff"))
    d = ImageDraw.Draw(img)
    for i in range(3):
        x = 18 + i * 96
        w = rnd.choice([56, 72, 40])
        h = rnd.choice([70, 48, 86])
        d.rectangle([x, 150 - h, x + w, 150], fill=blend((255, 255, 255), hex2rgb("#e63946"), 0.10 + i * 0.06))
    return img


def draw_s3(name, rnd):
    img = Image.new("RGB", (W, H), hex2rgb("#fff8ef"))
    d = ImageDraw.Draw(img)
    for i in range(4):
        r = rnd.choice([14, 20, 26, 32])
        x, y = rnd.randint(30, W - 30), rnd.randint(40, 130)
        c = rnd.choice(["#f4a261", "#e76f51", "#f9c74f"])
        d.ellipse([x - r, y - r, x + r, y + r], fill=blend(hex2rgb(c), hex2rgb("#fff8ef"), 0.35))
        d.ellipse([x - r, y - r, x + r, y + r], outline=(43, 43, 43), width=2)
    return img


def draw_s5(name, rnd):
    img = Image.new("RGB", (W, H), hex2rgb("#0f1115"))
    d = ImageDraw.Draw(img)
    for i in range(5):
        x, y = rnd.randint(20, W - 20), rnd.randint(30, 140)
        r = rnd.randint(18, 46)
        d.ellipse([x - r, y - r, x + r, y + r], fill=blend(hex2rgb("#4f7cff"), hex2rgb("#0f1115"), 0.72))
    for i in range(3):
        y = 40 + i * 26
        d.line([0, y, W, y - 8], fill=blend(hex2rgb("#8b5cf6"), hex2rgb("#0f1115"), 0.45), width=1)
    return img


def draw_s8(name, rnd):
    img = Image.new("RGB", (W, H), hex2rgb("#f5f7fa"))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 24):
        d.line([x, 0, x, H], fill=(226, 232, 240), width=1)
    for y in range(0, H, 24):
        d.line([0, y, W, y], fill=(226, 232, 240), width=1)
    cx, cy = W // 2, 92
    for k, c in enumerate(["#06b6d4", "#a855f7"]):
        s = 34 - k * 8
        pts = [(cx, cy - s), (cx + s * 1.7, cy), (cx, cy + s), (cx - s * 1.7, cy)]
        d.polygon(pts, fill=blend(hex2rgb(c), hex2rgb("#f5f7fa"), 0.35), outline=(31, 41, 55))
    return img


SERIES_DRAW = {"S2": draw_s2, "S3": draw_s3, "S5": draw_s5, "S8": draw_s8, "S9": draw_terminal, "S10": draw_ink}

# 关键词 -> 专属画法（按顺序匹配，先命中先用）
KEYWORD_RULES = [
    (r"粉笔|黑板", draw_chalk),
    (r"像素", draw_pixel),
    (r"终端|CRT|代码|汇编|ASCII", draw_terminal),
    (r"水墨|工笔|写意|山水|墨|宣纸", draw_ink),
    (r"蓝图|工程制图|制图|工程", draw_blueprint),
]


def make(row):
    sid, name, series = row["id"], row["name"], row["series"]
    rnd = random.Random(hash(sid) & 0xFFFFFFFF)

    drawer = None
    for pat, fn in KEYWORD_RULES:
        if re.search(pat, name):
            drawer = fn
            break
    if drawer is None:
        drawer = SERIES_DRAW.get(series, draw_s3)

    img = drawer(name, rnd)

    # 底部压暗条
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rectangle([0, H - 62, W, H], fill=(0, 0, 0, 92))
    img = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
    d = ImageDraw.Draw(img)

    d.text((12, 8), f"{series} · {SERIES_CN.get(series, series)}",
           font=font(FONT_R, 10), fill=(210, 210, 210))

    fsize = 22 if len(name) <= 8 else 17
    d.text((12, H - 46), name[:14], font=font(FONT_B, fsize), fill=(250, 250, 250))
    d.text((12, H - 20), "示意卡 · 按提示词生成", font=font(FONT_R, 9), fill=(190, 190, 190))

    # 轻噪点
    px = img.load()
    for _ in range(1200):
        x, y = rnd.randint(0, W - 1), rnd.randint(0, H - 1)
        r, g, b = px[x, y]
        n = rnd.randint(-8, 8)
        px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))

    return img


def main():
    rows = json.load(open(IDX, encoding="utf-8"))
    targets = [r for r in rows if not r.get("hasStill")]
    os.makedirs(OUT, exist_ok=True)
    for i, r in enumerate(targets, 1):
        make(r).save(os.path.join(OUT, r["id"] + ".jpg"), "JPEG", quality=86)
        if i % 40 == 0:
            print(f"  {i}/{len(targets)}", flush=True)
    print(f"done {len(targets)}")


if __name__ == "__main__":
    main()

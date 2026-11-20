#!/usr/bin/env python3
"""Draw the eight built-in sample scenes for Neon Vice Cover Forge.

Flat, poster-style illustrations of Vice City-flavoured places —
sunsets, palms, neon streets, a marina, a desert road — rendered
with PIL shapes only. No photographs, no people, no game artwork:
every scene is original vector-style drawing code, saved as JPEGs
under app/samples/ for the cover maker to grade and collage.
"""

import math
import os
import random

from PIL import Image, ImageDraw

W, H = 1200, 900
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "samples")


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sky(draw, top, mid, bottom, horizon=0.62):
    for y in range(H):
        t = y / H
        if t < horizon:
            c = lerp(top, mid, t / horizon)
        else:
            c = lerp(mid, bottom, (t - horizon) / (1 - horizon))
        draw.line([(0, y), (W, y)], fill=c)


def sun(draw, cx, cy, r, core=(255, 214, 90), glow=(255, 120, 80)):
    for i in range(6, 0, -1):
        rr = r * (1 + i * 0.16)
        a = int(26 * (7 - i))
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=glow + (a,))
        draw._image.alpha_composite(overlay) if hasattr(draw, "_image") else None
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=core)


def palm(draw, x, y, s=1.0, color=(18, 8, 28), lean=0.25):
    # Curved trunk from segments, then fronds as arcs.
    pts = []
    for i in range(11):
        t = i / 10
        pts.append((x + lean * 90 * s * t * t, y - 260 * s * t))
    for i in range(len(pts) - 1):
        draw.line([pts[i], pts[i + 1]], fill=color, width=max(3, int(14 * s * (1 - i / 14))))
    tx, ty = pts[-1]
    for k in range(7):
        ang = math.radians(-160 + k * 26)
        ex = tx + math.cos(ang) * 150 * s
        ey = ty + math.sin(ang) * 60 * s + 55 * s
        mx = tx + math.cos(ang) * 80 * s
        my = ty + math.sin(ang) * 55 * s - 25 * s
        draw.line([(tx, ty), (mx, my), (ex, ey)], fill=color, width=max(2, int(7 * s)))


def skyline(draw, base_y, color, seed, lit=(255, 210, 110), max_h=340):
    rnd = random.Random(seed)
    x = -20
    while x < W + 20:
        bw = rnd.randint(46, 110)
        bh = rnd.randint(90, max_h)
        draw.rectangle([x, base_y - bh, x + bw, base_y], fill=color)
        for _ in range(rnd.randint(4, 16)):
            wx = x + rnd.randint(6, max(7, bw - 12))
            wy = base_y - bh + rnd.randint(8, max(9, bh - 16))
            draw.rectangle([wx, wy, wx + 5, wy + 7], fill=lit)
        x += bw + rnd.randint(4, 18)


def water(draw, y0, deep, shine, sun_x=None):
    draw.rectangle([0, y0, W, H], fill=deep)
    rnd = random.Random(7)
    for _ in range(90):
        y = rnd.randint(y0 + 6, H - 8)
        x = rnd.randint(0, W - 60)
        ln = rnd.randint(14, 60)
        draw.line([(x, y), (x + ln, y)], fill=shine, width=2)
    if sun_x is not None:
        for i in range(26):
            y = y0 + 8 + i * ((H - y0) // 26)
            spread = 30 + i * 7
            draw.line([(sun_x - spread, y), (sun_x + spread, y)], fill=(255, 170, 90), width=3)


def new_scene():
    img = Image.new("RGBA", (W, H))
    return img, ImageDraw.Draw(img, "RGBA")


def sunset_beach():
    img, d = new_scene()
    sky(d, (58, 16, 92), (255, 94, 98), (255, 170, 80), 0.6)
    sun(d, 780, 430, 110)
    water(d, 540, (64, 24, 96), (255, 140, 120), sun_x=780)
    d.rectangle([0, 760, W, H], fill=(38, 16, 52))
    palm(d, 150, 880, 1.15, lean=0.3)
    palm(d, 1080, 890, 0.95, lean=-0.28)
    return img


def neon_street():
    img, d = new_scene()
    sky(d, (8, 6, 32), (28, 10, 58), (10, 8, 26), 0.55)
    skyline(d, 620, (16, 10, 36), 3, lit=(120, 230, 255), max_h=420)
    d.polygon([(430, H), (560, 620), (640, 620), (770, H)], fill=(12, 8, 24))
    d.line([(600, 640), (600, H)], fill=(255, 210, 63), width=5)
    signs = [((120, 300), (255, 46, 136)), ((210, 430), (53, 224, 230)), ((950, 280), (255, 170, 40)),
             ((880, 460), (180, 90, 255)), ((330, 210), (255, 90, 90))]
    for (x, y), c in signs:
        for i in range(4, 0, -1):
            d.rounded_rectangle([x - i * 7, y - i * 5, x + 130 + i * 7, y + 44 + i * 5],
                                radius=14, outline=c + (60,))
        d.rounded_rectangle([x, y, x + 130, y + 44], radius=10, fill=c)
    palm(d, 90, 900, 0.9, color=(6, 4, 16))
    palm(d, 1120, 900, 0.9, color=(6, 4, 16), lean=-0.25)
    return img


def skyline_scene():
    img, d = new_scene()
    sky(d, (16, 20, 64), (120, 40, 110), (255, 120, 80), 0.72)
    d.ellipse([980, 70, 1060, 150], fill=(245, 240, 220))
    skyline(d, 760, (36, 22, 66), 11, max_h=380)
    skyline(d, 820, (18, 10, 38), 23, max_h=300)
    water(d, 820, (14, 10, 34), (255, 150, 110))
    return img


def boulevard():
    img, d = new_scene()
    sky(d, (70, 24, 110), (255, 110, 90), (255, 190, 90), 0.58)
    sun(d, 600, 470, 95)
    d.polygon([(0, H), (520, 540), (680, 540), (W, H)], fill=(26, 14, 40))
    for i in range(6):
        y0 = 560 + i * 58
        d.polygon([(592, y0), (608, y0), (612, y0 + 34), (588, y0 + 34)], fill=(255, 220, 120))
    for i, s in enumerate([0.45, 0.65, 0.9, 1.25]):
        palm(d, 470 - i * 130, 560 + i * 95, s, lean=0.22)
        palm(d, 730 + i * 130, 560 + i * 95, s, lean=-0.22)
    # Low convertible silhouette, centre of the road.
    d.polygon([(430, 800), (470, 748), (560, 730), (700, 736), (770, 762), (790, 800)], fill=(10, 6, 20))
    d.ellipse([470, 782, 540, 852], fill=(6, 4, 14))
    d.ellipse([680, 782, 750, 852], fill=(6, 4, 14))
    d.rectangle([548, 742, 660, 760], fill=(255, 150, 90))
    return img


def pier():
    img, d = new_scene()
    sky(d, (52, 20, 96), (240, 90, 110), (255, 175, 85), 0.55)
    sun(d, 350, 400, 85)
    water(d, 500, (46, 22, 84), (255, 150, 120), sun_x=350)
    d.polygon([(330, H), (560, 520), (640, 520), (870, H)], fill=(24, 12, 34))
    for i in range(7):
        y = 540 + i * 52
        d.line([(350 + i * -6, y), (850 + i * 6, y)], fill=(60, 34, 70), width=4)
    for x, s in [(545, 1), (655, 1), (430, 1.6), (770, 1.6)]:
        d.rectangle([x, 520, x + 10 * s, 520 + 90 * s], fill=(16, 8, 26))
    palm(d, 1050, 880, 1.0, lean=-0.3)
    return img


def marina():
    img, d = new_scene()
    sky(d, (40, 18, 88), (235, 95, 115), (255, 180, 90), 0.58)
    sun(d, 900, 420, 80)
    water(d, 530, (40, 20, 78), (255, 160, 120), sun_x=900)

    def boat(x, y, s, sail=(245, 240, 235)):
        d.polygon([(x, y), (x + 150 * s, y), (x + 128 * s, y + 26 * s), (x + 22 * s, y + 26 * s)], fill=(14, 8, 26))
        d.line([(x + 72 * s, y), (x + 72 * s, y - 150 * s)], fill=(14, 8, 26), width=max(2, int(4 * s)))
        d.polygon([(x + 76 * s, y - 146 * s), (x + 76 * s, y - 6 * s), (x + 132 * s, y - 6 * s)], fill=sail)
        d.polygon([(x + 68 * s, y - 130 * s), (x + 68 * s, y - 6 * s), (x + 24 * s, y - 6 * s)], fill=(255, 190, 120))

    boat(180, 640, 1.0)
    boat(560, 700, 1.35)
    boat(920, 620, 0.8)
    return img


def desert_road():
    img, d = new_scene()
    sky(d, (90, 30, 90), (255, 120, 70), (255, 200, 100), 0.55)
    sun(d, 600, 380, 150)
    d.rectangle([0, 500, W, H], fill=(120, 52, 40))
    d.polygon([(0, 560), (300, 500), (700, 545), (W, 510), (W, 620), (0, 640)], fill=(96, 38, 44))
    d.polygon([(480, H), (580, 560), (620, 560), (720, H)], fill=(30, 16, 30))
    for i in range(5):
        y = 590 + i * 62
        d.line([(600, y), (600, y + 30)], fill=(255, 230, 150), width=5)

    def cactus(x, y, s):
        c = (16, 30, 26)
        r_main = max(2, int(12 * s))
        r_arm = max(2, int(9 * s))
        d.rounded_rectangle([x, y - 150 * s, x + 26 * s, y], radius=r_main, fill=c)
        d.rounded_rectangle([x - 34 * s, y - 105 * s, x - 12 * s, y - 55 * s], radius=r_arm, fill=c)
        d.rectangle([x - 22 * s, y - 70 * s, x, y - 58 * s], fill=c)
        d.rounded_rectangle([x + 38 * s, y - 120 * s, x + 60 * s, y - 70 * s], radius=r_arm, fill=c)
        d.rectangle([x + 26 * s, y - 85 * s, x + 48 * s, y - 73 * s], fill=c)

    cactus(150, 720, 1.2)
    cactus(980, 780, 1.5)
    cactus(840, 640, 0.8)
    return img


def boardwalk():
    img, d = new_scene()
    sky(d, (24, 14, 66), (150, 50, 120), (255, 140, 90), 0.6)
    # Ferris wheel silhouette.
    cx, cy, r = 880, 330, 190
    d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(16, 8, 30), width=10)
    for k in range(8):
        a = k * math.pi / 4
        d.line([(cx, cy), (cx + math.cos(a) * r, cy + math.sin(a) * r)], fill=(16, 8, 30), width=5)
        gx, gy = cx + math.cos(a) * r, cy + math.sin(a) * r
        d.ellipse([gx - 11, gy - 11, gx + 11, gy + 11], fill=(255, 210, 110))
    d.polygon([(cx - 90, 560), (cx, cy), (cx + 90, 560)], outline=(16, 8, 30), width=8)
    # Boardwalk planks.
    d.rectangle([0, 560, W, H], fill=(30, 16, 42))
    for i in range(9):
        y = 580 + i * 38
        d.line([(0, y), (W, y)], fill=(66, 38, 78), width=3)
    # String lights.
    rnd = random.Random(4)
    for row, y0 in enumerate([120, 190]):
        pts = [(x, y0 + 26 * math.sin(x / 140 + row)) for x in range(0, W + 40, 40)]
        d.line(pts, fill=(20, 10, 34), width=3)
        for x, y in pts[::2]:
            c = rnd.choice([(255, 210, 110), (255, 120, 170), (120, 230, 255)])
            d.ellipse([x - 6, y - 6, x + 6, y + 6], fill=c)
    palm(d, 120, 880, 1.1, lean=0.28)
    return img


SCENES = {
    "sunset-beach": sunset_beach,
    "neon-street": neon_street,
    "skyline": skyline_scene,
    "boulevard": boulevard,
    "pier": pier,
    "marina": marina,
    "desert-road": desert_road,
    "boardwalk": boardwalk,
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, fn in SCENES.items():
        img = fn()
        path = os.path.join(OUT, f"{name}.jpg")
        img.convert("RGB").save(path, "JPEG", quality=88)
        print(f"{name}.jpg  {os.path.getsize(path)} bytes")


if __name__ == "__main__":
    main()

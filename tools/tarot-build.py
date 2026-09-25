# -*- coding: utf-8 -*-
"""把 tarot-sample/ 里 AI 生成的中文名牌面，按卡牌映射为规范英文名并转成 webp。
输出：tarot/major-00.webp ... major-21.webp / wands-01.webp ... pentacles-king.webp
用法：py tools/tarot-build.py
"""
import os, glob
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tarot-sample')
OUT = os.path.join(ROOT, 'tarot')

MAJORS = ['愚者','魔术师','女祭司','皇后','皇帝','教皇','恋人','战车','力量','隐者','命运之轮',
          '正义','倒吊人','死神','节制','恶魔','高塔','星星','月亮','太阳','审判','世界']
SUITS = [('权杖','wands'), ('圣杯','cups'), ('宝剑','swords'), ('金币','pentacles')]
RANKS = [('首牌','01'),('二','02'),('三','03'),('四','04'),('五','05'),('六','06'),('七','07'),
         ('八','08'),('九','09'),('十','10'),('侍从','page'),('骑士','knight'),('皇后','queen'),('国王','king')]

rules = []
for i, nm in enumerate(MAJORS):
    rules.append((nm, 'major-%02d' % i))
for cn, en in SUITS:
    for rc, re_ in RANKS:
        rules.append((cn + rc, '%s-%s' % (en, re_)))
rules.sort(key=lambda x: -len(x[0]))   # 长 key 优先（避免 皇后 抢走 权杖皇后）

EXCLUDE = ['The_High_Priestess','The_Empress','_Death_','The_Sun','old-','new-','ai-','_wm_zoom']

os.makedirs(OUT, exist_ok=True)
found, skipped = {}, []
for p in sorted(glob.glob(os.path.join(SRC, '*.png'))):
    base = os.path.basename(p)
    if any(e in base for e in EXCLUDE):
        skipped.append(base); continue
    canon = None
    for key, c in rules:
        if key in base:
            canon = c; break
    if not canon:
        print('UNMATCHED', base); continue
    if canon in found:
        print('DUP', canon, '|', found[canon], 'VS', base); continue
    found[canon] = base

for canon, base in sorted(found.items()):
    im = Image.open(os.path.join(SRC, base)).convert('RGB')
    im = ImageOps.fit(im, (512, 768), Image.LANCZOS)
    im.save(os.path.join(OUT, canon + '.webp'), 'WEBP', quality=80, method=6)

missing = [c for _, c in rules if c not in found]
print('SAVED %d  SKIPPED %d' % (len(found), len(skipped)))
print('MISSING:', missing)

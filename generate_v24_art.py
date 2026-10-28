from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
import random,math,json
A=Path(__file__).resolve().parent/'assets'
old=Image.open(A/'pixel-atlas.png').convert('RGBA')
atlas=Image.new('RGBA',(480,660),(0,0,0,0));atlas.alpha_composite(old)
frames=json.loads((A/'sprites.json').read_text())
def px(d,x,y,w,h,color):d.rectangle((x,y,x+w-1,y+h-1),fill=color)
def poly(d,pts,color):d.polygon(pts,fill=color)
def sprite(kind):
 im=Image.new('RGBA',(48,60),(0,0,0,0));d=ImageDraw.Draw(im)
 pal={
 'thornling':('#3c7859','#70b77b','#ddcc80','#172b28'),
 'cryptHound':('#4a4763','#9782b2','#f39f7f','#211c32'),
 'mirrorShade':('#326d9d','#93e9f1','#edf7fe','#1a2c54'),
 'ashCrawler':('#853e40','#f49a4c','#ffe1a2','#3b2538'),
 'sparkWraith':('#5847a6','#b7a1ff','#eef3ff','#211e57'),
 'voidling':('#421d68','#a35be1','#f5cbff','#140e30'),
 'entGuardian':('#4d6549','#96c17d','#e2c780','#20332d'),
 'iceRevenant':('#36648d','#93d9e8','#e8fcff','#1c304f'),
 'cinderKnight':('#873c3b','#e68b4e','#ffe1aa','#3c1e29'),
 'thunderBeast':('#4c4185','#9d87e3','#f5d6ff','#211d47'),
 }[kind]
 base,light,accent,dark=pal
 large=kind in ('entGuardian','iceRevenant','cinderKnight','thunderBeast')
 # Legs with walk-ready separated silhouettes
 px(d,12,42,10,13,dark);px(d,26,42,10,13,dark)
 px(d,14,43,6,9,base);px(d,28,43,6,9,base)
 # central outline and shaded body
 px(d,10,26,30,24,dark);px(d,13,27,24,20,base);px(d,17,28,16,17,light)
 px(d,15,37,20,4,dark)
 px(d,8,28,7,19,dark);px(d,35,28,7,19,dark)
 px(d,9,30,6,14,base);px(d,35,30,6,14,base)
 # Face/hood
 px(d,10,13,30,21,dark);px(d,13,16,24,17,base)
 px(d,16,21,7,5,accent);px(d,27,21,7,5,accent)
 px(d,21,29,8,3,dark)
 if kind in ('thornling','entGuardian'):
  poly(d,[(12,24),(4,11),(16,18),(19,8),(26,21)],dark);poly(d,[(36,24),(44,11),(33,18),(29,8),(26,21)],dark)
  poly(d,[(13,21),(8,12),(17,18),(20,12),(24,23)],light);poly(d,[(36,21),(41,12),(32,18),(29,12),(24,23)],light)
  px(d,20,36,10,11,'#6b4a37');px(d,23,34,4,13,accent)
 if kind in ('cryptHound','ashCrawler'):
  poly(d,[(11,21),(11,4),(22,15)],dark);poly(d,[(38,21),(39,4),(28,15)],dark)
  poly(d,[(13,18),(14,9),(20,17)],light);poly(d,[(36,18),(35,9),(29,17)],light)
  px(d,14,34,20,8,base);px(d,17,31,5,5,accent);px(d,28,31,5,5,accent)
 if kind in ('mirrorShade','sparkWraith','voidling'):
  poly(d,[(9,26),(23,6),(40,26)],dark);poly(d,[(13,27),(24,11),(36,27)],base)
  px(d,20,8,8,6,accent)
  for x in (7,38):px(d,x,41,4,10,light)
  if kind=='voidling':
   px(d,17,21,6,4,'#ffbdfb');px(d,27,21,6,4,'#ffbdfb')
   px(d,16,35,16,4,'#b657e4')
 if large:
  px(d,5,25,9,17,dark);px(d,35,25,9,17,dark)
  px(d,15,28,19,7,accent)
  px(d,15,8,20,10,dark);px(d,19,3,11,10,light)
  px(d,18,4,4,4,accent);px(d,27,4,4,4,accent)
 if kind=='cinderKnight':
  px(d,39,8,5,45,dark);px(d,40,10,3,35,'#f2a652')
 if kind=='thunderBeast':
  poly(d,[(12,17),(9,3),(23,16)],accent);poly(d,[(36,17),(40,3),(26,16)],accent)
 return im
names=['thornling','cryptHound','mirrorShade','ashCrawler','sparkWraith','voidling','entGuardian','iceRevenant','cinderKnight','thunderBeast']
for idx,name in enumerate(names,29):
 x=(idx%7)*68+5;y=(idx//7)*110+5
 im=sprite(name);atlas.alpha_composite(im,(x,y));frames['enemy_'+name]=[x,y,48,60]
 im.resize((192,240),Image.Resampling.NEAREST).save(A/('new-'+name+'.png'))
# Fifth boss, darkness, original larger sprite
im=Image.new('RGBA',(80,96),(0,0,0,0));d=ImageDraw.Draw(im)
# ragged robe, with branching spires and crystalline spikes
poly(d,[(34,20),(20,30),(12,56),(4,92),(20,86),(27,95),(40,86),(54,95),(64,86),(77,92),(68,53),(56,29),(46,20)],'#0b0819')
poly(d,[(32,25),(23,33),(17,58),(10,89),(26,80),(30,91),(41,82),(53,92),(57,81),(69,89),(62,57),(54,32),(45,25)],'#30104c')
poly(d,[(32,34),(26,46),(21,78),(32,69),(41,77),(51,69),(59,82),(54,47),(48,35)],'#4a1d6c')
# armored shoulder and hands
px(d,7,39,19,16,'#1a0e2e');px(d,54,39,19,16,'#1a0e2e')
px(d,8,41,17,8,'#6e389e');px(d,55,41,17,8,'#6e389e')
px(d,5,55,12,21,'#361c59');px(d,63,55,12,21,'#361c59')
# horned crown
poly(d,[(26,28),(14,5),(34,18),(39,10),(44,18),(66,4),(53,29)],'#0d091a')
poly(d,[(28,25),(19,12),(34,21),(40,15),(45,21),(61,11),(52,26)],'#8751b8')
px(d,29,16,22,12,'#150c2c')
# large void face, glowing eyes and mouth
px(d,25,27,30,23,'#140c24')
px(d,29,32,9,7,'#ed9cff');px(d,43,32,9,7,'#ed9cff')
px(d,31,33,5,3,'#ffffff');px(d,45,33,5,3,'#ffffff')
px(d,34,43,13,4,'#aa55cd');px(d,37,44,7,4,'#fa9be4')
px(d,36,53,9,12,'#b94adb');px(d,38,55,5,7,'#f3b6ff')
# floating runes
for x,y in ((4,19),(65,15),(14,83),(67,79)):
 px(d,x,y,7,7,'#6236a1');px(d,x+2,y+2,3,3,'#d89aff')
x=(39%7)*68+5;y=(39//7)*110+5
atlas.alpha_composite(im,(x,y));frames['boss_darkness']=[x,y,80,96]
atlas.save(A/'pixel-atlas.png',optimize=True)
im.resize((320,384),Image.Resampling.NEAREST).save(A/'new-boss-darkness.png')
(A/'sprites.json').write_text(json.dumps(frames,ensure_ascii=False,indent=2),encoding='utf-8')
print('new atlas',atlas.size,'sprites',len(frames))

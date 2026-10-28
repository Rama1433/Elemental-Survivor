"""Generate original pixel-art icons and sprite sheets for Pixel Survivor V2.3.
Pillow is only required to regenerate artwork, not to play the PWA.
"""
from PIL import Image, ImageDraw
from pathlib import Path
import json, math
ROOT=Path(__file__).resolve().parent
AS=ROOT/'assets'; (AS/'icons').mkdir(parents=True,exist_ok=True)
S=3

def create(w,h):return Image.new('RGBA',(w,h),(0,0,0,0))
def px(d,x,y,w,h,c):d.rectangle((x,y,x+w-1,y+h-1),fill=c)
def line(d,pts,c,w=1):d.line(pts,fill=c,width=w)
def blob(d,coords,c):d.polygon(coords,fill=c)
SKINS={
 'royal':{'name':'Mago Real','robe':'#2365b6','deep':'#142e72','light':'#459fea','gold':'#ffd07c','gem':'#7eefff','cape':'#102d68'},
 'scarlet':{'name':'Mago Escarlata','robe':'#ad394c','deep':'#5a1e34','light':'#ee6a62','gold':'#f4b66c','gem':'#ff9a30','cape':'#3d152d'},
 'glacial':{'name':'Sabio Glacial','robe':'#b6dbeb','deep':'#3b719f','light':'#e8ffff','gold':'#75d9fa','gem':'#79ecff','cape':'#397a9c'},
 'storm':{'name':'Hechicero de Tormenta','robe':'#764aba','deep':'#31225d','light':'#af7eff','gold':'#e7c48f','gem':'#d8a2ff','cape':'#2d1c5d'},
}

def character(key,step=0):
 c=SKINS[key];im=create(48,60);d=ImageDraw.Draw(im)
 # pixel outlined cape and legs, chunky boots
 px(d,12,28,23,24,'#101724');px(d,15,31,17,20,c['cape']);px(d,17,44,14,6,c['deep'])
 for x in (16,28):px(d,x,49+(step if x==16 else -step),7,7,'#151d2c');px(d,x+1,51+(step if x==16 else -step),5,3,'#756455')
 px(d,9,28,31,9,'#0d1b2c');px(d,10,29,29,9,c['deep']);px(d,13,32,23,13,c['robe']);px(d,16,40,16,6,c['light'])
 px(d,10,30,7,13,c['robe']);px(d,32,30,7,12,c['robe']);px(d,11,40,5,3,'#e0b58d');px(d,33,39,5,4,'#e0b58d')
 px(d,18,33,14,3,c['gold']);px(d,21,36,8,3,c['deep']);px(d,23,37,4,4,c['gold'])
 # staff to right
 px(d,39,15,3,37,'#121723');px(d,40,16,2,34,'#9e6b43');px(d,37,10,9,10,'#1a2a41');px(d,39,9,5,10,c['gem']);px(d,40,10,3,4,'#f9ffff')
 px(d,35,20,3,4,c['gold'])
 # face hood
 px(d,17,17,16,15,'#0e1828');px(d,19,18,12,12,'#efc7a3');px(d,19,25,12,6,'#bc806c')
 px(d,18,24,4,3,'#172337');px(d,27,24,4,3,'#172337');px(d,22,27,4,2,'#895c58')
 # angular cap hood silhouette
 blob(d,[(12,19),(16,12),(22,7),(28,4),(32,9),(34,20),(37,23),(30,20),(16,23)],'#111827')
 blob(d,[(14,19),(18,12),(25,7),(29,6),(33,15),(34,20),(16,21)],c['robe'])
 px(d,23,5,7,5,c['light']);px(d,16,19,19,4,c['deep']);px(d,18,19,15,2,c['gold'])
 px(d,29,9,4,4,c['light']);px(d,22,11,4,3,c['light']);px(d,13,23,5,13,c['deep']);px(d,34,26,4,10,c['deep'])
 px(d,12,32,4,4,c['gold']);px(d,36,33,3,4,c['gold'])
 return im

def enemy(t):
 im=create(48,60);d=ImageDraw.Draw(im); outline='#141923'
 if t in ['skeleton','shield','archer','knight','champion']:
  armor=t in ('knight','champion'); s=t=='champion';
  base='#f4e9c9' if not armor else '#8588a6';shade='#aab5a7' if not armor else '#464b70'
  px(d,13,29,24,19,outline);px(d,16,30,19,17,shade);px(d,18,42,6,12,shade);px(d,29,42,6,12,shade)
  px(d,11,14,27,21,outline);px(d,13,15,23,18,base)
  px(d,16,22,6,5,'#b43e4b' if armor else '#2c2932');px(d,28,22,6,5,'#b43e4b' if armor else '#2c2932')
  px(d,22,29,6,3,'#473537');px(d,20,32,3,5,shade);px(d,27,32,3,5,shade)
  if armor:
   px(d,13,18,24,8,'#363957');px(d,16,15,19,5,'#a99e99');px(d,18,8,14,9,outline);px(d,20,10,10,7,'#bdab81');px(d,24,6,5,7,'#badafa' if t=='knight' else '#e9ad62')
   px(d,15,35,19,8,'#47456b')
  if t in ('shield','champion'): px(d,3,27,13,19,outline);px(d,4,28,11,17,'#80694d');px(d,7,31,5,8,'#e4be6a')
  if t in ('skeleton','archer','knight','champion'):
   px(d,39,17,3,35,'#3d3539');px(d,40,13,3,25,'#c9cbd4');px(d,38,9,7,10,'#a1a6b3')
  if t=='archer':px(d,35,14,3,36,'#8b5739');line(d,[(38,13),(45,29),(38,46)],'#eed1a5',2)
  if t=='champion':px(d,18,7,7,5,'#f4c661');px(d,27,7,7,5,'#f4c661')
 elif t in ('goblin','orc','shaman'):
  gr='#96c561' if t!='orc' else '#719d65';deep='#39563e';large=t=='orc'
  px(d,12,27,26,24,outline);px(d,14,28,22,22,deep);px(d,17,42,8,11,deep);px(d,29,42,8,11,deep)
  px(d,9,14,31,22,outline);px(d,11,15,27,18,gr)
  blob(d,[(11,21),(1,16),(7,28),(13,27)],outline);blob(d,[(12,21),(4,19),(10,26)],gr)
  blob(d,[(37,21),(46,16),(42,28),(36,27)],outline);blob(d,[(36,21),(43,19),(39,26)],gr)
  px(d,16,21,6,5,'#cc6351');px(d,29,21,6,5,'#cc6351');px(d,21,29,9,3,deep)
  px(d,14,31,23,8,'#886d4c' if t!='shaman' else '#563467')
  if large:px(d,15,11,19,6,'#5a6546');px(d,20,30,4,7,'#fff3cc');px(d,31,30,4,7,'#fff3cc')
  if t=='shaman':px(d,13,9,23,11,'#5a3271');px(d,19,5,9,9,'#764e9a');px(d,39,13,3,34,'#94704a');px(d,36,10,10,9,'#d09ffa')
  else:px(d,39,20,3,27,'#9f6445');px(d,37,18,7,9,'#d5d4c4')
 elif t=='wolf':
  px(d,7,27,31,19,'#161b23');px(d,9,26,28,17,'#656577');px(d,30,17,14,19,'#161b23');px(d,31,18,11,16,'#89869e')
  blob(d,[(31,21),(31,8),(38,16)],'#161b23');blob(d,[(32,20),(33,13),(38,20)],'#75768d')
  blob(d,[(38,19),(45,11),(43,29)],'#161b23');blob(d,[(40,20),(43,16),(41,26)],'#75768d')
  px(d,37,25,4,3,'#ee6f75');px(d,11,42,5,11,'#3e4150');px(d,28,42,5,11,'#3e4150');px(d,3,31,10,4,'#50536a')
 elif t in ('mage','ghost','iceWisp','stormWisp'):
  cold=t=='iceWisp';storm=t=='stormWisp';ghost=t=='ghost'
  base='#a9dbe0' if cold else '#a68be6' if storm else '#63468d' if not ghost else '#b3d5cc'
  px(d,13,29,24,24,'#141827');blob(d,[(11,31),(21,17),(30,18),(39,31),(38,54),(10,54)],base)
  px(d,13,18,25,14,'#131725');blob(d,[(12,24),(21,11),(31,14),(39,26),(34,30),(15,30)],base)
  px(d,19,25,6,4,'#fff4b5');px(d,29,25,6,4,'#fff4b5');px(d,23,35,7,4,'#2f2b4e')
  if not ghost:
   px(d,41,20,3,31,'#b2a080');px(d,37,12,12,12,'#34255e');px(d,39,14,7,7,'#c1a0fa' if not cold else '#dcfaff')
  else: px(d,15,48,19,6,'#75a9a8')
  if cold or storm:px(d,21,8,7,7,'#f6ffff');px(d,12,34,5,8,'#e4fbff')
 elif t=='bat':
  blob(d,[(23,19),(17,12),(8,18),(1,9),(3,34),(17,30),(23,38)],'#241b34');blob(d,[(25,19),(31,12),(40,18),(47,9),(45,34),(31,30),(25,38)],'#241b34')
  blob(d,[(19,21),(7,17),(11,29),(20,32)],'#685485');blob(d,[(29,21),(41,17),(37,29),(28,32)],'#685485')
  px(d,17,17,15,23,'#3f3158');px(d,19,22,5,4,'#e8a0de');px(d,27,22,5,4,'#e8a0de');px(d,24,33,3,4,'#dfd9e9')
 elif t=='spider':
  for x1,y1,x2,y2 in [(18,28,4,17),(18,37,3,43),(31,28,44,17),(31,37,45,44)]:line(d,[(x1,y1),(x2,y2)],'#65475e',4)
  px(d,15,20,20,27,'#211b29');px(d,17,22,16,23,'#8d566e');px(d,19,25,5,5,'#f3ba91');px(d,28,25,5,5,'#f3ba91');px(d,22,36,9,6,'#39334f')
 elif t in ('emberling','frostGolem'):
  frost=t=='frostGolem';base='#7bc7e3' if frost else '#c34f36';bright='#efffff' if frost else '#ffb355';dark='#335d78' if frost else '#4d3035'
  px(d,10,25,30,25,dark);px(d,12,23,26,27,base);px(d,15,10,20,20,dark);px(d,17,12,16,18,bright)
  px(d,20,25,5,5,'#192336');px(d,29,25,5,5,'#192336');px(d,8,34,7,13,base);px(d,37,34,7,13,base)
  px(d,16,49,8,7,dark);px(d,28,49,8,7,dark)
  if frost:blob(d,[(11,15),(17,2),(20,17)],'#d9f5ff');blob(d,[(31,15),(37,2),(38,18)],'#d9f5ff')
  else:blob(d,[(12,15),(18,2),(22,15)],'#ffc060');blob(d,[(29,17),(35,2),(39,18)],'#ffc060')
 else:return character('scarlet')
 return im

def boss(kind):
 im=create(80,96);d=ImageDraw.Draw(im)
 t=['skeletonKing','frostQueen','emberLord','stormArchmage'][kind]
 pal=[('#e0d5bc','#3b3b4a','#8d253f','#efc56f'),('#d9f6ff','#387caa','#a6e3fb','#c5eaff'),('#e2a04e','#3d3031','#dc5f2b','#ffe186'),('#c7b5eb','#2d265e','#9867cb','#e9d8ff')][kind]
 skin,robe,aura,crown=pal
 # cloak outline and flourish
 blob(d,[(24,35),(14,53),(10,91),(69,91),(62,51),(52,35)],'#121525')
 blob(d,[(24,40),(17,56),(14,88),(64,88),(59,53),(51,40)],robe)
 px(d,21,46,40,29,'#121525');px(d,24,45,33,28,robe);px(d,20,67,15,19,robe);px(d,45,67,15,19,robe)
 px(d,23,26,35,27,'#111624');px(d,25,28,31,23,skin)
 px(d,31,37,8,6,aura);px(d,45,37,8,6,aura);px(d,39,45,6,3,'#372834')
 px(d,26,19,29,9,crown);px(d,28,11,7,12,crown);px(d,39,8,7,13,crown);px(d,50,12,8,11,crown)
 px(d,33,54,16,7,crown);px(d,32,62,17,5,'#141923');px(d,36,63,8,3,aura)
 # arms, staff, blade
 px(d,13,44,13,25,robe);px(d,58,43,12,25,robe)
 if kind==0: # bone king sword
  px(d,5,26,5,53,'#4b465b');px(d,6,13,4,34,'#dbe8ec');px(d,2,35,12,7,crown)
 elif kind==1: # frost crystals
  for dx in (8,62):blob(d,[(dx,36),(dx+5,18),(dx+13,36)],'#c7faff')
 elif kind==2:
  blob(d,[(20,22),(16,6),(29,23)],'#f9ad44');blob(d,[(52,22),(63,6),(59,23)],'#f9ad44')
  px(d,31,61,22,9,'#f6a342')
 else:
  px(d,69,17,4,67,'#bd9bcf');px(d,65,10,11,15,'#e5c7ff');px(d,14,26,5,12,'#a181ff')
 return im

frames={};atlas=create(480,((4*2+17+4+7)//7+1)*110);ad=ImageDraw.Draw(atlas);pos=0

def slot(name,image):
 global pos
 col=pos%7; row=pos//7; x=col*68+5;y=row*110+5
 atlas.alpha_composite(image,(x,y));frames[name]=[x,y,image.width,image.height];pos+=1
for k in SKINS:
 for st in [0,1]:slot('hero_'+k+'_'+str(st),character(k,st))
for k in SKINS:
 character(k).resize((96,120),Image.Resampling.NEAREST).save(AS/f'skin-{k}.png')
types=['skeleton','shield','goblin','wolf','orc','mage','bat','ghost','spider','shaman','archer','knight','champion','iceWisp','frostGolem','emberling','stormWisp']
for t in types:slot('enemy_'+t,enemy(t))
for i in range(4):slot('boss_'+str(i),boss(i))
# Finish crop
atlas=atlas.crop((0,0,480,((pos+6)//7)*110));atlas.save(AS/'pixel-atlas.png',optimize=True)
(AS/'sprites.json').write_text(json.dumps(frames,indent=2),encoding='utf-8')
# Create unique pixel icon graphics from primitives. No emoji fonts required.
ICONS={'fire':'#ff8649','ice':'#8feaff','lightning':'#cb9aff','earth':'#d1ad79','wind':'#8de5ad','coin':'#eec25f','chest':'#cf9d5f','heart':'#ef7185','skull':'#e1d5be','clock':'#cfdde9','gem':'#74d5f1','book':'#d4ba8b','crown':'#eec36d','curse':'#c477e5','sword':'#cbd4e2','shield':'#a1b5de','pause':'#f5dfaa','play':'#f4dc9b','audio':'#8fcce7','mute':'#a1a6b4','map':'#98d5ac','magic':'#c9a6fa','foot':'#dba369','star':'#d7c9f3','storm':'#9ba7fa','rune':'#9dd9d1','portal':'#bba0ff','wolf':'#b1a1a4','hp':'#f5a9ae','magnet':'#97d9da','speed':'#d6ae76','haste':'#afa7ed','power':'#d3b9fa','frostNova':'#8feaff','emberRain':'#efb26d','thunderTotem':'#b89ff0','stoneGuardian':'#baa17b','cycloneBlades':'#8de5ad','sacrifice':'#cb6782','ashes':'#e9a265','tempest':'#cda1eb','voideye':'#9b8ae9','fang':'#d7c89e','shackle':'#c4af84','royal':'#73c6ff','scarlet':'#e28a8a','glacial':'#c0f2ff'}
for name,col in ICONS.items():
 im=create(32,32);d=ImageDraw.Draw(im);shadowC='#151925';
 if name in ('fire','emberRain','ashes'):
  blob(d,[(16,2),(22,13),(27,15),(27,22),(21,28),(9,28),(5,22),(7,16),(13,10),(14,18)],shadowC)
  blob(d,[(17,4),(20,14),(25,18),(23,25),(17,29),(9,25),(9,19),(14,13),(15,20)],col)
  blob(d,[(16,16),(20,21),(17,27),(13,26),(12,22)],'#fff1b4')
 elif name in ('ice','frostNova','glacial'):
  blob(d,[(16,1),(26,15),(17,30),(6,18)],shadowC);blob(d,[(16,3),(24,15),(16,28),(9,18)],col);line(d,[(16,5),(16,26)],'#f4ffff',2);line(d,[(16,14),(10,18)],'#dcfaff',2)
 elif name in ('lightning','storm','tempest','thunderTotem','haste'):
  blob(d,[(17,1),(29,4),(19,14),(25,16),(11,30),(13,19),(5,19)],shadowC);blob(d,[(18,3),(25,5),(15,17),(22,17),(13,27),(15,17),(9,17)],col)
 elif name in ('earth','stoneGuardian','shackle'):
  blob(d,[(6,23),(8,9),(17,5),(28,11),(29,24),(20,30),(9,28)],shadowC);blob(d,[(8,22),(10,11),(17,8),(25,11),(26,23),(19,27),(11,25)],col);line(d,[(17,8),(20,22),(12,27)],'#fff0ca',2)
 elif name in ('wind','cycloneBlades','portal'):
  d.arc((4,3,27,27),35,310,fill=col,width=5);d.arc((9,9,24,23),155,470,fill=col,width=4);px(d,13,13,5,4,'#e9fff9')
 elif name in ('heart','hp','sacrifice'):
  blob(d,[(16,28),(5,17),(4,11),(8,6),(14,7),(16,10),(19,7),(25,6),(29,12),(27,18)],shadowC)
  blob(d,[(16,25),(7,16),(6,11),(10,8),(15,12),(20,8),(25,10),(25,16)],col);px(d,9,10,5,3,'#ffe3e3')
 elif name in ('chest',):
  px(d,4,10,25,18,shadowC);px(d,6,12,21,14,'#a26b39');px(d,6,9,21,8,col);px(d,8,13,17,3,'#ffd990');px(d,14,12,5,11,'#fae8a0');px(d,15,15,3,5,shadowC)
 elif name in ('coin',):
  d.ellipse((4,3,28,29),fill=shadowC);d.ellipse((6,5,26,27),fill=col);d.ellipse((10,9,22,23),outline='#fff0ae',width=2);px(d,15,11,3,11,'#fff2bb')
 elif name in ('clock',):
  d.ellipse((4,4,28,28),outline=col,width=4);line(d,[(16,8),(16,17),(22,20)],col,3)
 elif name in ('gem',):
  blob(d,[(16,2),(29,15),(17,30),(3,15)],shadowC);blob(d,[(16,4),(27,15),(16,27),(6,15)],col);line(d,[(16,5),(16,26)],'#f1ffff',2)
 elif name in ('skull','curse','voideye'):
  d.ellipse((6,4,26,24),fill=col);px(d,9,20,14,9,col);px(d,10,14,5,5,shadowC);px(d,19,14,5,5,shadowC);px(d,14,22,4,4,shadowC)
 elif name in ('sword','power'):
  line(d,[(8,26),(24,6)],shadowC,7);line(d,[(10,25),(25,7)],col,4);line(d,[(6,21),(16,30)],'#c89c61',4)
 elif name in ('shield','rune'):
  blob(d,[(16,2),(28,8),(25,23),(16,30),(7,23),(4,8)],shadowC);blob(d,[(16,5),(24,10),(23,21),(16,27),(9,22),(7,10)],col);line(d,[(16,8),(16,24)],'#e3d9c8',2)
 elif name in ('pause',):
  px(d,7,7,7,19,col);px(d,19,7,7,19,col)
 elif name in ('play',):
  blob(d,[(9,5),(27,16),(9,27)],col)
 elif name in ('foot','speed','fang'):
  px(d,7,7,14,14,col);px(d,4,18,21,8,col);px(d,22,21,6,5,'#d5c2a4')
 elif name in ('map','book'):
  px(d,5,4,10,23,col);px(d,16,4,10,23,col);px(d,15,5,2,21,shadowC);px(d,8,8,4,2,'#ece4c5')
 elif name in ('crown','royal'):
  blob(d,[(4,9),(9,15),(15,5),(22,15),(28,8),(25,25),(7,25)],col);px(d,8,24,17,4,shadowC)
 elif name in ('star','magic'):
  blob(d,[(16,2),(20,11),(30,13),(23,19),(24,29),(16,24),(7,29),(9,19),(2,13),(12,11)],col)
 elif name in ('audio','mute'):
  blob(d,[(4,12),(11,12),(20,4),(20,28),(11,21),(4,21)],col)
  if name=='audio':d.arc((13,4,30,28),-60,60,fill=col,width=3)
  else:line(d,[(24,12),(31,22)],'#f2a2a7',3)
 else:
  blob(d,[(16,2),(27,13),(20,30),(6,22),(4,11)],col);px(d,12,12,8,8,'#faf7dc')
 im.save(AS/'icons'/f'{name}.png',optimize=True)
print('generated',len(frames),'sprites and',len(ICONS),'icons',atlas.size)

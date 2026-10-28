"""Create a stand-alone HTML demo with images embedded as data URLs."""
from pathlib import Path
import json,base64,re
root=Path(__file__).resolve().parent
out=root.parent/'Elemental_Survivor_V2_4_Demo_Jugable.html'
img=lambda file:'data:image/png;base64,'+base64.b64encode(file.read_bytes()).decode('ascii')
icons={p.stem:img(p) for p in (root/'assets'/'icons').glob('*.png')}
skins={p.stem.removeprefix('skin-'):img(p) for p in (root/'assets').glob('skin-*.png')}
atlas=img(root/'assets'/'pixel-atlas.png')
h=(root/'index.html').read_text(encoding='utf-8')
h=h.replace('<script src="game.js"></script>','{{INLINE_GAME}}')
h=re.sub(r'<script>if\(\'serviceWorker\'.*?</script>', '', h, flags=re.S)
h=re.sub(r'<link rel="manifest"[^>]*>', '', h)
h=re.sub(r'<link rel="icon"[^>]*>', '', h)
h=re.sub(r'<link rel="apple-touch-icon"[^>]*>', '', h)
h=h.replace('assets/skin-royal.png',skins['royal'])
js=(root/'game.js').read_text(encoding='utf-8')
js=js.replace("pxAtlas.src='assets/pixel-atlas.png'",'pxAtlas.src='+json.dumps(atlas))
js=js.replace('const PX_FRAMES =','const PX_SKIN_DATA='+json.dumps(skins)+';\nconst PX_ICON_DATA='+json.dumps(icons)+';\nconst PX_FRAMES =')
js=js.replace('src="assets/skin-${sk.id}.png"','src="${PX_SKIN_DATA[sk.id]}"')
js=js.replace('src="assets/skin-${saved.skin}.png"','src="${PX_SKIN_DATA[saved.skin]}"')
js=js.replace("img.src='assets/icons/'+pxEmojiMap[m[0]]+'.png'","img.src=PX_ICON_DATA[pxEmojiMap[m[0]]]")
h=h.replace('{{INLINE_GAME}}','<script>'+js+'</script>')
out.write_text(h,encoding='utf-8')
print('Created offline HTML',out,len(h))

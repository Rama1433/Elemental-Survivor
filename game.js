(()=>{'use strict';
const $=id=>document.getElementById(id), canvas=$('game'), ctx=canvas.getContext('2d',{alpha:false});
const STAGE=$('stage'), overlay=$('overlay'), modal=$('modal'), TWO=Math.PI*2;
const SAVE_KEY='arcade_ar_pixel_survivor_v2'; // Conserva las monedas y mejoras de la V2 anterior
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const fmt=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const hypot=(x,y)=>Math.hypot(x,y)||1;
const hash=(x,y,seed=0)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(seed,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296};
function loadData(){try{return Object.assign({bestKills:0,coins:0,wins:0,fortitude:0,sharpness:0},JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'))}catch{return {bestKills:0,coins:0,wins:0,fortitude:0,sharpness:0}}}
let saved=loadData();
function store(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(saved))}catch{};renderSidebar()}
let view={w:960,h:600,dpr:1}, phase='title', G=null, keys={}, joystick={id:null,sx:0,sy:0,dx:0,dy:0}, audioOn=true, actx=null, last=performance.now(), hudTick=0, toastLeft=0, toastText='', particles=[], screenShake=0;
const WEAPON_MAX=5;
function audio(frequency=500,duration=.05,type='sine',volume=.032){if(!audioOn)return;try{actx??=new(window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.setValueAtTime(frequency,actx.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(40,frequency*.62),actx.currentTime+duration);g.gain.setValueAtTime(volume,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+duration);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+duration)}catch{}}
function toast(msg,seconds=2){toastText=msg;toastLeft=seconds;$('toast').textContent=msg;$('toast').classList.remove('hidden')}
function resize(){const r=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);view={w:Math.max(200,r.width),h:Math.max(200,r.height),dpr};canvas.width=Math.round(view.w*dpr);canvas.height=Math.round(view.h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.imageSmoothingEnabled=false}
window.addEventListener('resize',resize);
function renderSidebar(){
 $('bestKills').textContent=saved.bestKills;if($('bestWave'))$('bestWave').textContent=saved.bestWave||0;
 $('coinsText').textContent=saved.coins.toLocaleString('es-AR');
 const w=G?.weapons||{fire:1,ice:0,lightning:0,earth:0,wind:0};
 const items=[['fire','🔥','Fuego'],['ice','❄️','Hielo'],['lightning','⚡','Rayo'],['earth','🪨','Tierra'],['wind','🌪️','Viento']];
 $('weaponsInfo').innerHTML=items.map(([id,icon,label])=>`<div class="info-item"><span class="info-icon">${icon}</span>${label} · ${w[id]?'Nivel '+w[id]:'Por descubrir'}</div>`).join('');
 if($('elementDock'))$('elementDock').innerHTML=items.map(([id,icon,label])=>`<div class="spell ${w[id]?'owned':''} ${id}" title="${label}: ${w[id]?'nivel '+w[id]:'bloqueado'}"><span>${icon}</span><small>${w[id]?'Nv'+w[id]:'×'}</small></div>`).join('');
}
function makeGame(){const hp=90+saved.fortitude*12;return {t:0,player:{x:0,y:0,hp,maxHp:hp,r:14,speed:166,iframes:0,face:1,walk:0},cam:{x:0,y:0},kills:0,coinsEarned:0,level:1,xp:0,need:12,xpTotal:0,weapons:{fire:1,ice:0,lightning:0,earth:0,wind:0},power:1+saved.sharpness*.07, haste:1,armor:0,magnet:95,projectileCount:0,fireTimer:.7,iceTimer:1.5,lightningTimer:2.5,earthTimer:3,windTimer:3,aoes:[],beams:[],earthWard:0,damagePop:[],enemies:[],gems:[],bullets:[],enemyBullets:[],pickups:[],boss:null,bossArrived:false,bossKilled:false,spawnTimer:.7,miniSpawned:false,levelUpPending:0,spawnId:1,ended:false,chests:0,slowActive:0}}
const ENEMIES={skeleton:{hp:20,speed:49,damage:8,r:12,exp:4,color:'#dde1c9'},goblin:{hp:16,speed:84,damage:7,r:11,exp:4,color:'#8cc98c'},wolf:{hp:30,speed:108,damage:10,r:12,exp:6,color:'#b9a181'},orc:{hp:70,speed:42,damage:17,r:16,exp:10,color:'#8eae72'},mage:{hp:36,speed:38,damage:7,r:12,exp:8,color:'#ac8bc3'}};
function enemy(type,x,y){const kind=ENEMIES[type];const scale=1+Math.min(2.7,G.t/560)+Math.max(0,(G.wave||0)-1)*.19;return {id:G.spawnId++,type,x,y,r:kind.r,hp:kind.hp*scale,maxHp:kind.hp*scale,speed:kind.speed*(1+Math.min(.4,G.t/1800)),damage:kind.damage*(1+Math.min(.65,G.t/1600)+Math.max(0,(G.wave||0)-1)*.07),fireTimer:rand(1,3),hurt:0,phase:rand(0,7),dead:false,slow:0}}
function spawnNear(type,radius){const a=rand(0,TWO), rr=radius||Math.min((view.w/2+50)/Math.max(.2,Math.abs(Math.cos(a))),(view.h/2+50)/Math.max(.2,Math.abs(Math.sin(a))))+rand(10,65),px=G.player.x,py=G.player.y;G.enemies.push(enemy(type,px+Math.cos(a)*rr,py+Math.sin(a)*rr))}
function bossSpawn(){if(G.bossArrived)return;G.bossArrived=true;const a=rand(0,TWO),r=Math.max(view.w,view.h)*.68+100;G.boss={x:G.player.x+Math.cos(a)*r,y:G.player.y+Math.sin(a)*r,r:32,hp:1050,maxHp:1050,speed:52,damage:16,hurt:0,attackTime:2,telegraph:null,shockTimer:0};toast('👑 ¡EL JEFE DE LA ZONA HA DESPERTADO!',5);$('bossWarning').classList.remove('hidden');$('bossLife').classList.remove('hidden');audio(200,.38,'sawtooth',.09)}
function beginGame(){G=makeGame();phase='playing';for(let i=0;i<7;i++)spawnNear(i%3===0?'goblin':'skeleton',rand(145,285));particles=[];keys={};joystick.id=null;joystick.dx=joystick.dy=0;overlay.classList.add('hidden');$('bossWarning').classList.add('hidden');$('bossLife').classList.add('hidden');toast('🌲 Entraste al Bosque Maldito',2);renderSidebar();renderHud();canvas.focus()}
function setModal(html){modal.innerHTML=html;overlay.classList.remove('hidden')}
function startMenu(){phase='title';G=null;particles=[];$('bossWarning').classList.add('hidden');$('bossLife').classList.add('hidden');renderSidebar();renderHud();setModal(`<div class="emblem">🧙‍♂️</div><div class="subline">ARCADE-AR · REINO ELEMENTAL</div><h2>PIXEL SURVIVOR</h2><p>El Bosque Maldito está lleno de esqueletos, goblins y hechiceros. Dominá los <b>cinco elementos</b>: Fuego, Hielo, Rayo, Tierra y Viento. Las magias atacan solas mientras explorás. ¡Derrotá al Rey Esqueleto!</p><div class="modal-stats"><span>🔥 Fuego inicial</span><span>❄️⚡🪨🌪️ Desbloqueables</span><span>👑 Jefe al minuto 5</span></div><div class="modal-buttons"><button class="gold-btn" data-action="play">▶ COMENZAR AVENTURA</button><button class="secondary-btn" data-action="shop">🪙 MEJORAS PERMANENTES · ${saved.coins} monedas</button></div>`)}
function pause(){if(phase==='playing'){
 phase='paused';keys={};joystick.id=null;joystick.dx=joystick.dy=0;
 setModal(`<div class="emblem">🧙‍♂️</div><div class="subline">PARTIDA EN PAUSA</div><h2>Campamento arcano</h2><p>Probá las cinco magias juntas para revisar sus efectos.</p><div class="modal-stats"><span>⏱ ${fmt(G.t)}</span><span>💀 ${G.kills} bajas</span><span>💎 Nivel ${G.level}</span></div><div class="modal-buttons"><button class="gold-btn" data-action="resume">▶ CONTINUAR</button><button class="secondary-btn" data-action="allSpells">✨ PROBAR LOS 5 ELEMENTOS</button><button class="secondary-btn" data-action="testBoss">👑 INVOCAR JEFE (DEMO)</button><button class="secondary-btn" data-action="restart">↻ REINICIAR PARTIDA</button><button class="secondary-btn" data-action="exit">⌂ VOLVER AL MENÚ</button></div>`)
 }else if(phase==='paused')resume()}
function resume(){if(phase==='paused'){phase='playing';overlay.classList.add('hidden');canvas.focus()}}
const upgrades=[
{id:'fire',title:'FUEGO',icon:'🔥',desc:n=>n===0?'Desbloquear explosiones':'Explosiones más grandes y proyectiles extra',max:5,kind:'ELEMENTO'},
{id:'ice',title:'HIELO',icon:'❄️',desc:n=>n===0?'Esquirlas que ralentizan':'Más cristales, daño y penetración',max:5,kind:'ELEMENTO'},
{id:'lightning',title:'RAYO',icon:'⚡',desc:n=>n===0?'Cadenas de descargas eléctricas':'Saltos extra entre enemigos',max:5,kind:'ELEMENTO'},
{id:'earth',title:'TIERRA',icon:'🪨',desc:n=>n===0?'Púas de roca que emergen del suelo':'Rocas más fuertes y protección arcana',max:5,kind:'ELEMENTO'},
{id:'wind',title:'VIENTO',icon:'🌪️',desc:n=>n===0?'Una ráfaga circular que empuja':'Mayor radio y fuerza del vendaval',max:5,kind:'ELEMENTO'},
{id:'speed',title:'BOTAS LIGERAS',icon:'🥾',desc:()=>'+7% velocidad de movimiento',max:5,kind:'PASIVA'},
{id:'hp',title:'VITALIDAD',icon:'❤️',desc:()=>'+14 vida máxima y curación',max:5,kind:'PASIVA'},
{id:'power',title:'PODER ARCANO',icon:'✨',desc:()=>'+8,5% daño (máx. +175%)',max:5,kind:'PASIVA'},
{id:'haste',title:'RITUAL VELOZ',icon:'⏩',desc:()=>'+7% frecuencia (máx. +40%)',max:5,kind:'PASIVA'},
{id:'magnet',title:'IMÁN DE GEMAS',icon:'💎',desc:()=>'+20 alcance de cristales',max:3,kind:'PASIVA'}];
function upgradeLevel(up){if(!G)return 0;if(up.id in G.weapons)return G.weapons[up.id];return G['up_'+up.id]||0}
function showUpgrades(){phase='upgrade';keys={};joystick.id=null;joystick.dx=joystick.dy=0;const options=upgrades.filter(u=>upgradeLevel(u)<u.max),selected=[];while(selected.length<3&&options.length){const p=Math.floor(Math.random()*options.length);selected.push(options.splice(p,1)[0])}G.currentOptions=selected;setModal(`<div class="emblem">✨</div><div class="subline">¡NIVEL ${G.level}!</div><h2>Elegí una bendición</h2><p>El combate se detiene mientras elegís una mejora.</p><div class="upgrade-grid">${selected.map((u,i)=>`<button class="upgrade-card" data-upgrade="${i}"><span class="up-icon">${u.icon}</span><span class="up-kind">${u.kind} · Nv. ${upgradeLevel(u)+1}</span><span class="up-title">${u.title}</span><span class="up-desc">${u.desc(upgradeLevel(u))}</span></button>`).join('')}</div>`);audio(670,.16,'triangle',.055)}
function chooseUpgrade(i){if(phase!=='upgrade')return;const up=G.currentOptions[i];if(!up)return;let prev=upgradeLevel(up);if(up.id in G.weapons)G.weapons[up.id]=prev+1;else{G['up_'+up.id]=prev+1;const p=G.player;if(up.id==='speed')p.speed*=1.07;if(up.id==='hp'){p.maxHp+=14;p.hp=Math.min(p.maxHp,p.hp+15)}if(up.id==='power')G.power=Math.min(2.75,G.power*1.085);if(up.id==='haste')G.haste=Math.min(1.4,G.haste*1.07);if(up.id==='magnet')G.magnet+=20}toast(`${up.icon} ${up.title} · Nivel ${prev+1}`,2);renderSidebar();if(G.levelUpPending>0){G.levelUpPending--;showUpgrades()}else{phase='playing';overlay.classList.add('hidden')}audio(970,.12,'triangle',.07)}
function collectXP(value){G.xp+=value;G.xpTotal+=value;while(G.xp>=G.need){G.xp-=G.need;G.level++;G.need=Math.floor(G.need*1.29+8);G.levelUpPending++}if(G.levelUpPending>0&&phase==='playing'){G.levelUpPending--;showUpgrades()}}
function gameOver(won){if(!G||G.ended)return;G.ended=true;G.player.hp=Math.max(0,G.player.hp);phase=won?'victory':'defeat';const earned=Math.max(5,Math.floor(G.kills/4)+Math.floor(G.t/10)+(won?200:0)+G.coinsEarned);G.coinsEarned=earned;saved.coins+=earned;saved.bestKills=Math.max(saved.bestKills,G.kills);if(won)saved.wins++;store();audio(won?950:180,.32,won?'triangle':'sawtooth',.07);setModal(`<div class="emblem">${won?'🏆':'💀'}</div><div class="subline">${won?'¡REINO SALVADO!':'LA MALDICIÓN CONTINÚA'}</div><h2>${won?'¡Venciste al Rey!':'Fin de la aventura'}</h2><p>${won?'El Bosque Maldito conoce tu nombre.':'El próximo intento te encontrará más fuerte.'}</p><div class="modal-stats"><span>⏱ ${fmt(G.t)}</span><span>💀 ${G.kills} bajas</span><span>💎 Nivel ${G.level}</span><span>🪙 +${earned} monedas</span></div><div class="modal-buttons"><button class="gold-btn" data-action="restart">↻ VOLVER A JUGAR</button><button class="secondary-btn" data-action="shop">🪙 MEJORAR MAGO</button><button class="secondary-btn" data-action="exit">⌂ MENÚ PRINCIPAL</button></div>`)}
function shop(){if(phase==='playing')pause();phase='shop';const fcost=60+(saved.fortitude*55),scost=70+(saved.sharpness*60);setModal(`<div class="emblem">🪙</div><div class="subline">MEJORAS PERMANENTES</div><h2>La Forja del Reino</h2><p>Las monedas se guardan en este dispositivo, incluso si perdés una partida.</p><div class="modal-stats"><span>🪙 Tenés ${saved.coins} monedas</span></div><div class="modal-buttons"><button class="secondary-btn" data-buy="fortitude" ${saved.coins<fcost||saved.fortitude>=5?'disabled':''}>❤️ Fortaleza Nv. ${saved.fortitude}/5 · +15 vida · ${saved.fortitude>=5?'Máximo':fcost+' 🪙'}</button><button class="secondary-btn" data-buy="sharpness" ${saved.coins<scost||saved.sharpness>=5?'disabled':''}>✨ Concentración Nv. ${saved.sharpness}/5 · +10% daño · ${saved.sharpness>=5?'Máximo':scost+' 🪙'}</button><button class="gold-btn" data-action="exit">VOLVER AL MENÚ</button></div>`)}
function buyUpgrade(id){let cost=id==='fortitude'?60+saved.fortitude*55:70+saved.sharpness*60;if(!['fortitude','sharpness'].includes(id)||saved[id]>=5||saved.coins<cost)return;saved.coins-=cost;saved[id]++;store();audio(620,.15,'triangle',.07);shop()}
// TERRAIN is deterministic by world tile, so the forest scrolls indefinitely without storing tiles.
function drawTerrain(){const w=view.w,h=view.h,cam=G?G.cam:{x:0,y:0};ctx.fillStyle='#243f31';ctx.fillRect(0,0,w,h);const tile=96,minX=Math.floor((cam.x-w/2-110)/tile),maxX=Math.ceil((cam.x+w/2+110)/tile),minY=Math.floor((cam.y-h/2-110)/tile),maxY=Math.ceil((cam.y+h/2+110)/tile);
for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const px=x*tile-cam.x+w/2,py=y*tile-cam.y+h/2,hv=hash(x,y);if(hv<.17){ctx.fillStyle='#294a37';ctx.fillRect(px,py,96,96)}else if(hv>.83){ctx.fillStyle='#2b4433';ctx.fillRect(px,py,96,96)}const pathDist=Math.abs((x*97+y*33)%19-9);if(pathDist<=1 && hash(x>>2,y>>2)>.38){ctx.fillStyle='#715a3b1b';ctx.fillRect(px,py,96,96)}for(let z=0;z<6;z++){let fx=px+hash(x,y,z*8+1)*tile,fy=py+hash(x,y,z*8+2)*tile,typ=hash(x,y,z*8+3);if(typ<.55){ctx.fillStyle=typ<.2?'#5b8860':'#486f50';ctx.fillRect(fx,fy,2,6);ctx.fillRect(fx-2,fy+1,6,2)}else if(typ<.65){ctx.fillStyle='#e4cf81';ctx.fillRect(fx,fy,3,3)}else if(typ<.70){ctx.fillStyle='#8c7769';ctx.fillRect(fx,fy,8,5)} } if(hv>.74){const ox=px+18+hash(x,y,6)*48,oy=py+23+hash(x,y,7)*36;if(hv>.94){ctx.fillStyle='#161f1a7a';ctx.beginPath();ctx.ellipse(ox+8,oy+13,23,10,0,0,TWO);ctx.fill();ctx.fillStyle='#4b524b';ctx.fillRect(ox,oy-3,25,19);ctx.fillStyle='#889083';ctx.fillRect(ox+2,oy-5,19,8)}else{ctx.fillStyle='#141d19a8';ctx.beginPath();ctx.ellipse(ox+5,oy+16,18,8,0,0,TWO);ctx.fill();ctx.fillStyle='#465438';ctx.fillRect(ox,oy,11,16);ctx.fillStyle='#1c5a3c';ctx.fillRect(ox-14,oy-20,38,28);ctx.fillStyle='#2d704b';ctx.fillRect(ox-8,oy-26,29,23);ctx.fillStyle='#448256';ctx.fillRect(ox-5,oy-20,13,8)}}}}
// SCREEN position helpers
const SX=x=>Math.round(x-G.cam.x+view.w/2),SY=y=>Math.round(y-G.cam.y+view.h/2);
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h)}
function shadow(x,y,rx,ry){ctx.fillStyle='#05141075';ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,TWO);ctx.fill()}
function paintHero(){
 const p=G.player,x=SX(p.x),y=SY(p.y),bounce=Math.sin(p.walk*13)*2,inv=p.iframes>0&&Math.floor(p.iframes*15)%2===0;
 shadow(x,y+12,17,5);if(inv)ctx.globalAlpha=.44;
 // Botas, túnica azul y capa con contorno de 2 píxeles
 rect(x-9,y+8+bounce,7,9,'#17243b');rect(x+3,y+8+bounce,7,9,'#17243b');
 rect(x-13,y-12+bounce,26,26,'#13233d');rect(x-11,y-11+bounce,22,24,'#285aaf');
 rect(x-7,y+3+bounce,14,9,'#1b4388');rect(x-11,y-4+bounce,22,3,'#dda953');
 rect(x-6,y-19+bounce,12,13,'#f5cba1');rect(x-5,y-15+bounce,3,3,'#202235');rect(x+3,y-15+bounce,3,3,'#202235');
 // Sombrero alto y puntiagudo estilo mago
 rect(x-14,y-21+bounce,28,5,'#102046');rect(x-12,y-24+bounce,24,6,'#2457a7');
 rect(x-9,y-29+bounce,19,7,'#2c6cc9');rect(x-7,y-34+bounce,13,7,'#2b60b9');
 rect(x-5,y-39+bounce,8,7,'#327cd8');rect(x-2,y-45+bounce,5,8,'#3987e1');
 rect(x-9,y-22+bounce,20,3,'#f6c859');rect(x-1,y-23+bounce,4,4,'#fff0ac');
 // Vara arcana con punta luminosa
 const sx=x+(p.face>0?14:-17);rect(sx,y-13+bounce,4,27,'#55392b');rect(sx-2,y-20+bounce,8,9,'#184278');rect(sx-1,y-19+bounce,6,7,'#63cfff');
 rect(sx,y-18+bounce,2,4,'#e6fdff');
 if(G.earthWard>0){ctx.globalAlpha=.7;ctx.strokeStyle='#c8b37b';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,22,0,TWO);ctx.stroke()}
 ctx.globalAlpha=1;
}
function paintEnemy(e){const x=SX(e.x),y=SY(e.y)+Math.sin(G.t*4+e.phase)*1.3;if(x<-40||y<-40||x>view.w+40||y>view.h+40)return;shadow(x,y+e.r/2,e.r,.4*e.r);const hurt=e.hurt>0;ctx.globalAlpha=hurt?.65:1;if(e.type==='skeleton'){rect(x-9,y-13,18,21,'#dadcc7');rect(x-10,y-20,20,14,'#e9e8d7');rect(x-5,y-15,4,4,'#212f29');rect(x+3,y-15,4,4,'#212f29');rect(x-4,y+8,6,8,'#afafa1');rect(x+2,y+8,6,8,'#a6afa2')}else if(e.type==='goblin'){rect(x-8,y-13,16,23,'#648b4d');rect(x-11,y-20,22,15,'#9bd66c');rect(x-16,y-16,8,6,'#91c665');rect(x+8,y-16,8,6,'#91c665');rect(x-5,y-15,4,3,'#542c32');rect(x+3,y-15,4,3,'#542c32')}else if(e.type==='wolf'){rect(x-14,y-7,27,15,'#8e8265');rect(x+6,y-14,12,15,'#c4a27b');rect(x+7,y-19,5,9,'#806c58');rect(x+15,y-19,5,9,'#806c58');rect(x+13,y-8,3,3,'#ed6f72')}else if(e.type==='orc'){rect(x-13,y-12,26,27,'#576857');rect(x-15,y-24,30,18,'#84a77e');rect(x-10,y-26,5,8,'#d8ccab');rect(x+6,y-26,5,8,'#d8ccab');rect(x-6,y-18,4,3,'#ef8586');rect(x+4,y-18,4,3,'#ef8586')}else{rect(x-11,y-15,22,29,'#46345f');rect(x-13,y-22,26,16,'#73518c');rect(x-8,y-19,16,14,'#bfa3c7');rect(x-5,y-14,4,3,'#ed75eb');rect(x+3,y-14,4,3,'#ed75eb');rect(x+13,y-12,4,29,'#a783b9');rect(x+11,y-16,8,8,'#db9ee9')}
ctx.globalAlpha=1;if(e.hp<e.maxHp){rect(x-16,y-32,32,4,'#10231a');rect(x-16,y-32,Math.max(0,32*e.hp/e.maxHp),4,'#f0a078')}}
function paintBoss(){const b=G.boss;if(!b)return;const x=SX(b.x),y=SY(b.y),glow=Math.sin(G.t*6)*2;shadow(x,y+24,37,12);rect(x-27,y-18,54,49,'#313549');rect(x-30,y-27,60,22,'#8e8eaf');rect(x-25,y-44,50,31,'#e0d9d0');rect(x-18,y-33,11,7,'#f26773');rect(x+9,y-33,11,7,'#f26773');rect(x-8,y-12,16,7,'#272931');rect(x-25,y-53,9,22,'#9c8b77');rect(x+17,y-53,9,22,'#9c8b77');rect(x-18,y-57,36,9,'#efc76c');rect(x-19,y+26,16,16,'#77758c');rect(x+3,y+26,16,16,'#77758c');ctx.strokeStyle='#f5b26b';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y+2,39+glow,0,TWO);ctx.stroke();if(b.hurt>0){ctx.strokeStyle='#ffdccc';ctx.lineWidth=3;ctx.strokeRect(x-31,y-58,62,100)}}
function sparkle(x,y,color,n=8,power=90){for(let i=0;i<n&&particles.length<260;i++){const a=rand(0,TWO),sp=rand(20,power);particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:rand(.18,.48),max:.48,size:rand(2,5),color})}}
function hurtEnemy(e,damage,knock=0){if(e.dead)return;e.hp-=damage;e.hurt=.16;const dx=e.x-G.player.x,dy=e.y-G.player.y,d=hypot(dx,dy);e.x+=(dx/d)*knock;e.y+=(dy/d)*knock;sparkle(e.x,e.y,'#f6c7a3',3,43);if(e.hp<=0)killEnemy(e)}
function killEnemy(e){if(e.dead)return;e.dead=true;G.kills++;const kind=ENEMIES[e.type];G.gems.push({x:e.x,y:e.y,value:kind.exp,r:6});if(Math.random()<.06)G.pickups.push({x:e.x+rand(-10,10),y:e.y+rand(-10,10),kind:'coin',life:22});if(Math.random()<.012)G.pickups.push({x:e.x,y:e.y,kind:'heart',life:30});sparkle(e.x,e.y,'#b9e7bd',8,88);if(G.kills%20===0)toast(`💀 ${G.kills} enemigos derrotados`,1.5);audio(260,.05,'triangle',.02)}
function damageHero(damage){const p=G.player;if(p.iframes>0||phase!=='playing')return;let final=Math.max(1,damage-G.armor)*(G.earthWard>0?.55:1);p.hp=Math.max(0,p.hp-final);p.iframes=.65;screenShake=Math.max(screenShake,7);sparkle(p.x,p.y,'#fa8e84',12,100);audio(130,.15,'sawtooth',.045);if(p.hp<=0)gameOver(false)}
function bossDamage(damage){const b=G.boss;if(!b)return;b.hp-=damage;b.hurt=.16;sparkle(b.x+rand(-15,15),b.y+rand(-15,15),'#f4c177',4,40);if(b.hp<=0){const xp=G.gems;for(let i=0;i<22;i++)xp.push({x:b.x+rand(-80,80),y:b.y+rand(-70,70),value:12,r:7});G.bossKilled=true;G.boss=null;$('bossLife').classList.add('hidden');gameOver(true)}}
function nearestTarget(range){let dist=range*range,out=null;for(const e of G.enemies){const dx=e.x-G.player.x,dy=e.y-G.player.y,d=dx*dx+dy*dy;if(!e.dead&&d<dist){dist=d;out=e}}if(G.boss){const dx=G.boss.x-G.player.x,dy=G.boss.y-G.player.y,d=dx*dx+dy*dy;if(d<dist)out=G.boss}return out}
// Cada escuela elemental tiene cadencia y comportamiento propios.
const SPELL_COLORS={fire:'#ff9d35',ice:'#61d8ff',lightning:'#c88aff',earth:'#d7ae71',wind:'#9cecc8'};
function addArea(x,y,r,color,life=.5,kind='pulse'){if(!G)return;G.aoes.push({x,y,r,color,life,max:life,kind});}
function targetList(range,origin=G.player){let r2=range*range;const targets=G.enemies.filter(e=>!e.dead&&(e.x-origin.x)**2+(e.y-origin.y)**2<r2);if(G.boss&&(G.boss.x-origin.x)**2+(G.boss.y-origin.y)**2<r2)targets.push(G.boss);return targets.sort((a,b)=>(a.x-origin.x)**2+(a.y-origin.y)**2-((b.x-origin.x)**2+(b.y-origin.y)**2))}
function strike(target,damage,knock=0,slow=0){if(!target||phase!=='playing')return;if(target===G.boss){bossDamage(damage);return}if(slow)target.slow=Math.max(target.slow||0,slow);hurtEnemy(target,damage,knock)}
function fireShot(){const p=G.player,lv=G.weapons.fire,target=nearestTarget(520);if(!target)return;let a=Math.atan2(target.y-p.y,target.x-p.x);const count=1+(lv>=3?1:0)+(lv>=5?1:0);for(let i=0;i<count;i++){let aa=a+(i-(count-1)/2)*.22;G.bullets.push({type:'fire',x:p.x,y:p.y,vx:Math.cos(aa)*360,vy:Math.sin(aa)*360,r:7,dmg:(12+lv*5)*G.power,ttl:1.7})}audio(620,.055,'sawtooth',.016)}
function iceShot(){const p=G.player,lv=G.weapons.ice,t=nearestTarget(530);if(!t)return;let a=Math.atan2(t.y-p.y,t.x-p.x),n=1+(lv>=2?1:0)+(lv>=4?1:0);for(let i=0;i<n;i++){let aa=a+(i-(n-1)/2)*.18;G.bullets.push({type:'ice',x:p.x,y:p.y,vx:Math.cos(aa)*410,vy:Math.sin(aa)*410,r:6,dmg:(10+lv*4)*G.power,ttl:1.5,pierce:1+Math.floor(lv/2),hit:new Set()})}audio(850,.09,'sine',.02)}
function lightningStrike(){const lv=G.weapons.lightning,targets=targetList(470),start=G.player;if(!targets.length)return;let last=start,visited=new Set(),pts=[{x:start.x,y:start.y}];for(let i=0;i<2+lv+(G.amulets?.includes('tempest')?2:0);i++){let options=targets.filter(e=>!visited.has(e)&&Math.hypot(e.x-last.x,e.y-last.y)<(i===0?470:250));if(!options.length)break;options.sort((a,b)=>Math.hypot(a.x-last.x,a.y-last.y)-Math.hypot(b.x-last.x,b.y-last.y));const t=options[0];visited.add(t);strike(t,(14+lv*7)*G.power,3);pts.push({x:t.x,y:t.y});last=t;}if(pts.length>1){G.beams.push({points:pts,life:.27,max:.27});for(const q of pts.slice(1))sparkle(q.x,q.y,'#e7a8ff',6,85);audio(280,.12,'sawtooth',.04)}}
function earthEruption(){const lv=G.weapons.earth,targets=targetList(320).slice(0,1+(lv>=3?1:0)+(lv>=5?1:0));if(targets.length===0)return;for(const e of targets){const rad=44+lv*7;addArea(e.x,e.y,rad,'#c5a06a',.55,'rocks');for(const t of targetList(rad,{x:e.x,y:e.y}))strike(t,(21+lv*8)*G.power,14);sparkle(e.x,e.y,'#d5b789',11,85)}G.earthWard=Math.max(G.earthWard,.8+lv*.28);audio(145,.17,'triangle',.038)}
function windGust(){const lv=G.weapons.wind,p=G.player,r=92+lv*22;addArea(p.x,p.y,r,'#88e9bc',.62,'wind');for(const e of targetList(r)){const dx=e.x-p.x,dy=e.y-p.y,d=hypot(dx,dy);strike(e,(8+lv*5)*G.power,0);if(e!==G.boss){e.x+=dx/d*(35+lv*18);e.y+=dy/d*(35+lv*18)}}sparkle(p.x,p.y,'#a0f5c9',18,195);audio(445,.14,'triangle',.032)}
function fireExplosion(x,y,level,damage){const r=25+level*6;addArea(x,y,r,'#ff9234',.35,'flame');for(const t of targetList(r,{x,y}))strike(t,damage*.67,6);sparkle(x,y,'#ffb04d',15,130);screenShake=Math.max(screenShake,3)}
function updateAttacks(dt){
 const w=G.weapons;
 for(const [key,func,base] of [['fire',fireShot,1.1],['ice',iceShot,1.65],['lightning',lightningStrike,2.45],['earth',earthEruption,3.1],['wind',windGust,3.3]]){
  if(w[key]>0){const timer=key+'Timer';G[timer]-=dt;if(G[timer]<=0){G[timer]=(base-Math.min(base*.35,w[key]*.1))/G.haste;func()}}
 }
 G.earthWard=Math.max(0,G.earthWard-dt);
 for(const b of G.bullets){
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.ttl-=dt;if(b.ttl<=0)continue;
  for(const e of targetList(18+b.r,{x:b.x,y:b.y})){
   if(Math.hypot(e.x-b.x,e.y-b.y)>e.r+b.r)continue;
   if(b.type==='fire'){strikeSchool(e,b.dmg,'fire',5);fireExplosion(b.x,b.y,w.fire,b.dmg);b.ttl=-1;break}
   if(b.type==='ice'&&!b.hit.has(e)){b.hit.add(e);strike(e,b.dmg,3,1.5+w.ice*.2);sparkle(e.x,e.y,'#a6efff',8,85);b.pierce--;if(b.pierce<=0){b.ttl=-1;break}}
  }
 }
 G.bullets=G.bullets.filter(b=>b.ttl>0);
 for(const q of G.aoes)q.life-=dt;G.aoes=G.aoes.filter(q=>q.life>0);
 for(const q of G.beams)q.life-=dt;G.beams=G.beams.filter(q=>q.life>0);
}
function updatePlayer(dt){const p=G.player;let mx=0,my=0;if(keys['KeyW']||keys['ArrowUp'])my--;if(keys['KeyS']||keys['ArrowDown'])my++;if(keys['KeyA']||keys['ArrowLeft'])mx--;if(keys['KeyD']||keys['ArrowRight'])mx++;mx+=joystick.dx;my+=joystick.dy;const mag=Math.hypot(mx,my);if(mag>.08){mx/=Math.max(1,mag);my/=Math.max(1,mag);p.x+=mx*p.speed*dt;p.y+=my*p.speed*dt;p.walk+=dt;if(mx<-.05)p.face=-1;else if(mx>.05)p.face=1}p.iframes=Math.max(0,p.iframes-dt);G.cam.x+=(p.x-G.cam.x)*Math.min(1,dt*7);G.cam.y+=(p.y-G.cam.y)*Math.min(1,dt*7)}
function updateEnemy(dt){const p=G.player,maxCount=150;G.spawnTimer-=dt;if(G.spawnTimer<=0&&!G.bossArrived){G.spawnTimer=Math.max(.18,.82-G.t*.0016);let n=1+(G.t>60?1:0)+(G.t>145?1:0);for(let i=0;i<n&&G.enemies.length<maxCount;i++){const r=Math.random();let type=r<.48?'skeleton':r<.72?'goblin':r<.84?'wolf':r<.93?'orc':'mage';if(G.t<35)type=r<.65?'skeleton':'goblin';if(G.t<85&&type==='mage')type='skeleton';spawnNear(type)}}if(G.bossArrived&&G.enemies.length<60&&Math.random()<dt*1.8)spawnNear('skeleton');
for(const e of G.enemies){if(e.dead)continue;e.hurt=Math.max(0,e.hurt-dt);e.slow=Math.max(0,(e.slow||0)-dt);let dx=p.x-e.x,dy=p.y-e.y,d=hypot(dx,dy);if(e.type==='mage'&&d<220&&d>150){e.x+=dx/d*e.speed*.22*dt;e.y+=dy/d*e.speed*.22*dt}else if(e.type!=='mage'||d>220){e.x+=dx/d*e.speed*dt*(e.slow?.55:1);e.y+=dy/d*e.speed*dt*(e.slow?.55:1)}if(d<e.r+p.r+2)damageHero(e.damage);if(e.type==='mage'){e.fireTimer-=dt;if(e.fireTimer<0&&d<450){e.fireTimer=rand(2.3,3.5);G.enemyBullets.push({x:e.x,y:e.y,vx:dx/d*168,vy:dy/d*168,r:6,ttl:3,damage:8})}}}G.enemies=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<1600);
for(const b of G.enemyBullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.ttl-=dt;if(Math.hypot(b.x-p.x,b.y-p.y)<p.r+b.r){damageHero(b.damage);b.ttl=0}}G.enemyBullets=G.enemyBullets.filter(b=>b.ttl>0)}
function updateBoss(dt){const b=G.boss;if(!b)return;const p=G.player;b.hurt=Math.max(0,b.hurt-dt);const dx=p.x-b.x,dy=p.y-b.y,d=hypot(dx,dy);if(d>65){b.x+=dx/d*b.speed*dt;b.y+=dy/d*b.speed*dt}if(d<60)damageHero(b.damage);b.attackTime-=dt;if(!b.telegraph&&b.attackTime<=0){b.attackTime=2.6;b.telegraph={x:p.x,y:p.y,life:.9,rad:95+Math.min(36,G.t/10)}}if(b.telegraph){b.telegraph.life-=dt;if(b.telegraph.life<=0){if(Math.hypot(p.x-b.telegraph.x,p.y-b.telegraph.y)<b.telegraph.rad+p.r)damageHero(20);sparkle(b.telegraph.x,b.telegraph.y,'#e66c5c',32,180);b.telegraph=null;screenShake=11}}$('bossFill').style.width=`${Math.max(0,100*b.hp/b.maxHp)}%`;}
function updateDrops(dt){const p=G.player;for(const gem of G.gems){let dx=p.x-gem.x,dy=p.y-gem.y,d=hypot(dx,dy);if(d<G.magnet){const sp=300+G.magnet*2;gem.x+=dx/d*sp*dt;gem.y+=dy/d*sp*dt}if(d<22){gem.collected=true;collectXP(gem.value)}}G.gems=G.gems.filter(g=>!g.collected&&Math.hypot(p.x-g.x,p.y-g.y)<2000);for(const v of G.pickups){v.life-=dt;let d=Math.hypot(p.x-v.x,p.y-v.y);if(d<26){v.life=-1;if(v.kind==='coin'){G.coinsEarned+=2;toast('🪙 +2 monedas de botín',.9)}else{p.hp=Math.min(p.maxHp,p.hp+25);toast('❤️ +25 vida',1)}}}G.pickups=G.pickups.filter(v=>v.life>0)}
function updateParticles(dt){for(const f of particles){f.x+=f.vx*dt;f.y+=f.vy*dt;f.life-=dt}particles=particles.filter(f=>f.life>0)}
function update(dt){if(phase!=='playing')return;G.t+=dt;updatePlayer(dt);updateEnemy(dt);if(phase!=='playing')return;updateAttacks(dt);if(phase!=='playing')return;updateBoss(dt);if(phase!=='playing')return;updateDrops(dt);updateParticles(dt);if(!G.bossArrived&&G.t>=300)bossSpawn();if(G.t>=150&&!G.miniSpawned){G.miniSpawned=true;for(let i=0;i<5;i++)spawnNear('orc');toast('⚠️ ¡Una horda de orcos se acerca!',3)}screenShake=Math.max(0,screenShake-dt*28)}
function paintGem(g){const x=SX(g.x),y=SY(g.y)+Math.sin(G.t*5+g.x)*2;if(x<-12||y<-12||x>view.w+12||y>view.h+12)return;ctx.fillStyle=g.value>6?'#ffe4a5':'#80e9db';ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+6,y);ctx.lineTo(x,y+8);ctx.lineTo(x-6,y);ctx.closePath();ctx.fill();rect(x-2,y-3,3,4,'#eefef9')}
function paintPickups(){for(const v of G.pickups){const x=SX(v.x),y=SY(v.y);if(x<0||x>view.w||y<0||y>view.h)continue;ctx.fillStyle=v.kind==='coin'?'#e9b859':'#df6e81';ctx.beginPath();ctx.arc(x,y,10,0,TWO);ctx.fill();rect(x-3,y-4,6,9,v.kind==='coin'?'#fff2ad':'#fff1dc')}}
function paintProjectiles(){
 for(const b of G.bullets){const x=SX(b.x),y=SY(b.y);if(b.type==='fire'){
   rect(x-9,y-7,18,15,'#e8612f');rect(x-5,y-11,12,17,'#ffb449');rect(x-2,y-6,6,8,'#fff3a9');
  }else{
   ctx.save();ctx.translate(x,y);ctx.rotate(Math.atan2(b.vy,b.vx));
   rect(-13,-3,26,6,'#2581cd');rect(-11,-2,22,4,'#80eaff');rect(8,-2,7,4,'#e6ffff');ctx.restore();
  }}
 for(const b of G.enemyBullets){const x=SX(b.x),y=SY(b.y);rect(x-6,y-6,12,12,'#843a9d');rect(x-3,y-3,6,6,'#f5b0ff')}
}
function paintMagic(){
 const p=G.player;
 for(const q of G.aoes){const x=SX(q.x),y=SY(q.y),pct=q.life/q.max;ctx.save();ctx.globalAlpha=Math.max(.02,pct);
  if(q.kind==='rocks'){
   ctx.strokeStyle='#f1d09a';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,y+5,q.r*(1-pct*.35),q.r*.42,0,0,TWO);ctx.stroke();
   for(let i=0;i<8;i++){let a=i*TWO/8,rr=q.r*.65;rect(x+Math.cos(a)*rr-6,y+Math.sin(a)*rr*.53-20*(1-pct),12,20,'#8b7764');rect(x+Math.cos(a)*rr-4,y+Math.sin(a)*rr*.53-22*(1-pct),8,9,'#d9be90')}
  }else if(q.kind==='wind'){
   for(let k=0;k<3;k++){ctx.strokeStyle=k%2?'#defbea':'#78deb4';ctx.lineWidth=5-k;ctx.beginPath();ctx.arc(x,y,q.r*(1.04-pct*.22)-k*13,G.t*3+k*2,G.t*3+k*2+Math.PI*1.12);ctx.stroke()}
  }else {ctx.fillStyle='#ff852966';ctx.beginPath();ctx.arc(x,y,q.r*(1-pct*.26),0,TWO);ctx.fill();ctx.strokeStyle='#ffdfa0';ctx.lineWidth=4;ctx.stroke()}
  ctx.restore();
 }
 for(const line of G.beams){ctx.save();ctx.globalAlpha=line.life/line.max;ctx.lineJoin='miter';ctx.strokeStyle='#9046fa';ctx.lineWidth=11;ctx.beginPath();line.points.forEach((q,i)=>i?ctx.lineTo(SX(q.x),SY(q.y)):ctx.moveTo(SX(q.x),SY(q.y)));ctx.stroke();ctx.strokeStyle='#e8d0ff';ctx.lineWidth=4;ctx.stroke();ctx.restore()}
 // Magia alrededor del mago al desbloquear los elementos
 const cx=SX(p.x),cy=SY(p.y),elements=[['fire','#fb9146'],['ice','#5cdeff'],['lightning','#ca8cff'],['earth','#d6ad70'],['wind','#92f5b8']].filter(([id])=>G.weapons[id]>0);
 for(let i=0;i<elements.length;i++){let a=G.t*.62+i*TWO/elements.length,r=31;rect(cx+Math.cos(a)*r-3,cy+Math.sin(a)*r-3,6,6,elements[i][1])}
}
function paintParticles(){for(const f of particles){const x=SX(f.x),y=SY(f.y);ctx.globalAlpha=clamp(f.life/f.max,0,1);rect(x,y,f.size,f.size,f.color)}ctx.globalAlpha=1}
function draw(){if(!view.w)return;ctx.setTransform(view.dpr,0,0,view.dpr,0,0);ctx.save();if(G&&screenShake>0)ctx.translate(rand(-screenShake,screenShake),rand(-screenShake,screenShake));drawTerrain();if(G){for(const g of G.gems)paintGem(g);paintPickups();if(G.boss?.telegraph){const b=G.boss.telegraph,x=SX(b.x),y=SY(b.y);ctx.fillStyle='#e1535440';ctx.strokeStyle='#ffcba7';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,b.rad,0,TWO);ctx.fill();ctx.stroke();ctx.fillStyle='#ffe9b4';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText('¡ESQUIVÁ!',x,y)}for(const e of G.enemies)paintEnemy(e);paintBoss();paintMagic();paintProjectiles();paintHero();paintParticles();if(G.bossArrived&&G.boss){const dx=G.boss.x-G.player.x,dy=G.boss.y-G.player.y;if(Math.hypot(dx,dy)>Math.min(view.w,view.h)*.45){const a=Math.atan2(dy,dx),x=view.w/2+Math.cos(a)*Math.min(view.w/2-28,view.w*.38),y=view.h/2+Math.sin(a)*Math.min(view.h/2-33,view.h*.35);ctx.fillStyle='#f6c08c';ctx.beginPath();ctx.moveTo(x+Math.cos(a)*16,y+Math.sin(a)*16);ctx.lineTo(x+Math.cos(a+2.5)*12,y+Math.sin(a+2.5)*12);ctx.lineTo(x+Math.cos(a-2.5)*12,y+Math.sin(a-2.5)*12);ctx.closePath();ctx.fill()}}}else{const x=view.w*.5,y=view.h*.5;shadow(x,y+18,17,5);rect(x-12,y-14,24,28,'#3159a4');rect(x-10,y-24,20,14,'#f3cda7');rect(x-14,y-28,28,6,'#23438b');rect(x-8,y-35,18,10,'#3273c5');rect(x-3,y-45,7,12,'#4799e5');rect(x-6,y-20,3,4,'#282e2b');rect(x+4,y-20,3,4,'#282e2b')}ctx.restore()}
function renderHud(){const p=G?.player;$('timeText').textContent=fmt(G?.t||0);$('killText').textContent=G?.kills||0;$('hpText').textContent=p?`${Math.ceil(p.hp)} / ${p.maxHp}`:'100 / 100';$('hpFill').style.width=`${p?100*p.hp/p.maxHp:100}%`;$('levelText').textContent=G?.level||1;$('xpText').textContent=G?`${G.xp} / ${G.need} PX`:'0 / 12 PX';$('xpFill').style.width=`${G?100*G.xp/G.need:0}%`}
function tick(now){const dt=Math.min(.035,(now-last)/1000||0);last=now;update(dt);hudTick+=dt;if(hudTick>.12){hudTick=0;renderHud()}if(toastLeft>0){toastLeft-=dt;if(toastLeft<=0)$('toast').classList.add('hidden')}if(G&&G.slash&&phase!=='playing')G.slash.t-=dt;draw();requestAnimationFrame(tick)}
function navKey(e){const codes=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];if(codes.includes(e.code))e.preventDefault();if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))keys[e.code]=true;if(e.code==='Escape'||e.code==='KeyP'){if(phase==='playing'||phase==='paused')pause()}}
window.addEventListener('keydown',navKey);window.addEventListener('keyup',e=>{keys[e.code]=false});window.addEventListener('blur',()=>{if(phase==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&phase==='playing')pause()});
function pointerCoord(e){let r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
function joyUpdate(e){const p=pointerCoord(e),dx=p.x-joystick.sx,dy=p.y-joystick.sy,m=hypot(dx,dy),l=Math.min(42,m);joystick.dx=dx/m*Math.min(1,m/35);joystick.dy=dy/m*Math.min(1,m/35);$('joyKnob').style.transform=`translate(${dx/m*l}px,${dy/m*l}px)`}
canvas.addEventListener('pointerdown',e=>{if(phase!=='playing'||joystick.id!==null)return;if(e.pointerType==='mouse')return;e.preventDefault();joystick.id=e.pointerId;const p=pointerCoord(e);joystick.sx=p.x;joystick.sy=p.y;const j=$('joystick');j.style.left=`${p.x-54}px`;j.style.top=`${p.y-54}px`;j.style.bottom='auto';j.style.display='grid';$('joyKnob').style.transform='translate(0,0)';try{canvas.setPointerCapture(e.pointerId)}catch{}});
canvas.addEventListener('pointermove',e=>{if(e.pointerId!==joystick.id)return;e.preventDefault();joyUpdate(e)});
function releaseJoy(e){if(e.pointerId!==joystick.id)return;joystick.id=null;joystick.dx=joystick.dy=0;$('joyKnob').style.transform='translate(0,0)';const j=$('joystick');j.style.left='22px';j.style.top='auto';j.style.bottom='22px'}
canvas.addEventListener('pointerup',releaseJoy);canvas.addEventListener('pointercancel',releaseJoy);canvas.addEventListener('lostpointercapture',releaseJoy);
modal.addEventListener('click',e=>{const up=e.target.closest('[data-upgrade]');if(up){chooseUpgrade(+up.dataset.upgrade);return}const buy=e.target.closest('[data-buy]');if(buy){buyUpgrade(buy.dataset.buy);return}const a=e.target.closest('[data-action]')?.dataset.action;if(a==='play'||a==='restart')beginGame();else if(a==='resume')resume();else if(a==='exit')startMenu();else if(a==='shop')shop();else if(a==='allSpells'){if(G){for(const k of Object.keys(G.weapons))G.weapons[k]=Math.max(2,G.weapons[k]);renderSidebar();phase='playing';overlay.classList.add('hidden');toast('✨ ¡LOS CINCO ELEMENTOS ACTIVADOS!',3);}}else if(a==='testBoss'){if(G){G.t=Math.max(G.t,300);phase='playing';overlay.classList.add('hidden');bossSpawn()}}});
$('pauseBtn').onclick=()=>pause();$('sideStart').onclick=()=>beginGame();$('sideShop').onclick=()=>shop();$('audioBtn').onclick=()=>{audioOn=!audioOn;$('audioBtn').textContent=audioOn?'🔊':'🔇'};$('fullBtn').onclick=async()=>{try{if(!document.fullscreenElement){await document.documentElement.requestFullscreen?.()}else await document.exitFullscreen?.()}catch{toast('Pantalla completa no disponible en este navegador',2)}};
// Read-only public debug snapshot: useful for automated smoke tests, does not advance or cheat gameplay.
window.pixelSurvivorStatus=()=>({phase,t:G?.t||0,kills:G?.kills||0,level:G?.level||1,enemies:G?.enemies.length||0,player:G?{x:G.player.x,y:G.player.y,hp:G.player.hp}:null,boss:!!G?.boss,spells:G?{...G.weapons}:null,coins:saved.coins});
/* Pixel Survivor V2.2 · La maldición de los cuatro reinos.
   Expansión original y compatible con el progreso local de V2.1. */
const BIOMES=[
 {name:'Bosque Maldito',short:'BOSQUE',color:'#183b32',accent:'#85df93',soil:'#264936',floor:'#31533b',dec:'#346b47',brick:'#75877c',sky:'#0d2828',boss:'Rey Esqueleto',emoji:'🌲',roster:['skeleton','goblin','thornling','wolf','bat','shield','cryptHound','ghost','mage'],champion:'entGuardian'},
 {name:'Ruinas Heladas',short:'HIELO',color:'#203a53',accent:'#a6ecff',soil:'#34536a',floor:'#426178',dec:'#87a9b7',brick:'#a0c5db',sky:'#142d47',boss:'Guardiana de Escarcha',emoji:'❄️',roster:['skeleton','iceWisp','mirrorShade','ghost','shield','wolf','archer','frostGolem'],champion:'iceRevenant'},
 {name:'Tierras de Ceniza',short:'CENIZA',color:'#472a2f',accent:'#ffc36e',soil:'#503a36',floor:'#664038',dec:'#8b4b40',brick:'#987066',sky:'#2c1e26',boss:'Señor de las Brasas',emoji:'🔥',roster:['goblin','orc','ashCrawler','bat','spider','shaman','emberling','knight'],champion:'cinderKnight'},
 {name:'Templo del Trueno',short:'TRUENO',color:'#272b51',accent:'#c29fff',soil:'#323657',floor:'#3c4765',dec:'#715ca0',brick:'#8d91bb',sky:'#1a193c',boss:'Archimago Tormentoso',emoji:'⚡',roster:['mage','ghost','sparkWraith','shaman','archer','knight','stormWisp','shield'],champion:'thunderBeast'}
];
const RARITIES=[{key:'common',name:'COMÚN',chance:55,hex:'#b8c9d2',icon:'⚪'},{key:'uncommon',name:'POCO COMÚN',chance:25,hex:'#76e39b',icon:'🟢'},{key:'rare',name:'RARO',chance:15,hex:'#66bcff',icon:'🔷'},{key:'mythic',name:'MÍTICO',chance:5,hex:'#eb99ff',icon:'💠'}];
const ARTIFACTS={
 emberRain:{name:'Lluvia de meteoros',icon:'☄️',school:'Fuego',desc:'Meteoros caen sobre grupos de monstruos.',color:'#ff8f54',cool:5.5},
 frostNova:{name:'Corona de escarcha',icon:'💠',school:'Hielo',desc:'Una nova congela y daña alrededor.',color:'#87e7ff',cool:6.5},
 thunderTotem:{name:'Tótem de tormenta',icon:'🔱',school:'Rayo',desc:'Descargas rápidas a múltiples objetivos.',color:'#ca9aff',cool:4.2},
 stoneGuardian:{name:'Guardián de piedra',icon:'🗿',school:'Tierra',desc:'Un guardián orbital golpea a los cercanos.',color:'#dcc092',cool:2.1},
 cycloneBlades:{name:'Cuchillas del vendaval',icon:'🌀',school:'Viento',desc:'Aros de viento giran y cortan alrededor.',color:'#b2ffe0',cool:2.8}
};
const CURSES={
 sacrifice:{name:'Amuleto del sacrificio',icon:'🩸',plus:'+23% de daño arcano',minus:'−20% vida máxima',desc:'Tu magia consume tu fuerza vital.'},
 ashes:{name:'Corona de cenizas',icon:'👑',plus:'+40% daño de fuego',minus:'+25% daño recibido',desc:'El fuego exige un precio.'},
 tempest:{name:'Sello de la tormenta',icon:'⚡',plus:'+2 saltos del rayo',minus:'−15% velocidad',desc:'El trueno te encadena a la tierra.'},
 voideye:{name:'Ojo del vacío',icon:'👁️',plus:'Mejor probabilidad de botín raro',minus:'+30% enemigos apareciendo',desc:'El vacío concede tesoros a quienes sobreviven.'},
 fang:{name:'Colmillo del lobo',icon:'🐺',plus:'+30% velocidad',minus:'+30% daño recibido',desc:'Corrés más rápido que las sombras.'},
 shackle:{name:'Grillete de piedra',icon:'🪨',plus:'+45% daño de tierra',minus:'−20% velocidad',desc:'La montaña es fuerte, pero inmóvil.'}
};
Object.assign(ENEMIES,{
 bat:{hp:12,speed:135,damage:6,r:8,exp:3,color:'#82649b'},
 shield:{hp:65,speed:37,damage:11,r:15,exp:9,color:'#ccc7a5'},
 ghost:{hp:40,speed:70,damage:9,r:14,exp:8,color:'#9ad2c6'},
 spider:{hp:37,speed:92,damage:8,r:13,exp:6,color:'#a55d65'},
 shaman:{hp:44,speed:39,damage:8,r:12,exp:10,color:'#b18ae0'},
 archer:{hp:32,speed:58,damage:7,r:12,exp:7,color:'#b4b98c'},
 knight:{hp:125,speed:48,damage:15,r:18,exp:17,color:'#777b9d'},
 champion:{hp:320,speed:40,damage:20,r:22,exp:36,color:'#b8a370'},
 iceWisp:{hp:23,speed:105,damage:8,r:11,exp:5,color:'#7cddec'},
 frostGolem:{hp:200,speed:27,damage:19,r:20,exp:28,color:'#9abed2'},
 emberling:{hp:34,speed:108,damage:11,r:11,exp:7,color:'#fa8358'},
 stormWisp:{hp:36,speed:118,damage:12,r:12,exp:8,color:'#b5a1ef'},
 thornling:{hp:32,speed:77,damage:9,r:12,exp:7,color:'#62a974'},cryptHound:{hp:42,speed:121,damage:12,r:13,exp:8,color:'#aaa5c1'},mirrorShade:{hp:50,speed:85,damage:13,r:13,exp:9,color:'#b2e6f7'},ashCrawler:{hp:58,speed:97,damage:13,r:14,exp:11,color:'#e88d57'},sparkWraith:{hp:46,speed:125,damage:14,r:12,exp:10,color:'#b39bff'},voidling:{hp:76,speed:115,damage:18,r:14,exp:13,color:'#ba65e4'},entGuardian:{hp:275,speed:48,damage:19,r:21,exp:30,color:'#92bb85'},iceRevenant:{hp:300,speed:55,damage:20,r:21,exp:32,color:'#9fe3f2'},cinderKnight:{hp:340,speed:52,damage:22,r:22,exp:36,color:'#e77f55'},thunderBeast:{hp:390,speed:67,damage:24,r:23,exp:39,color:'#b29ce6'}
});
const oldBegin=beginGame, oldShowMenu=startMenu, oldPause=pause, oldShop=shop, oldSidebar=renderSidebar;
const oldPlayer=updatePlayer,oldKill=killEnemy,oldStrike=strike,oldBossPaint=paintBoss, oldEnemyPaint=paintEnemy, oldTerrain=drawTerrain;
const oldMagic=paintMagic,oldPickups=paintPickups,oldDraw=draw,oldUpdateAttacks=updateAttacks, oldBossUpdate=updateBoss, oldHud=renderHud;
function adventureReset(){
 G.biome=0;G.biomeTime=0;G.zoneKills=0;G.openPortal=false;G.portal=null;G.worldLimit=Infinity;G.zoneChests=0;G.wave=0;G.endless=false;G.waveTimer=0;G.darknessDelay=-1;G.darknessAwakened=false;G.bossesDefeated=0;G.zoneMiniCount=0;
 G.chestTimer=rand(75,105);G.chestsWorld=[];G.amulets=[];G.artifacts={};G.artifactTimers={};G.rarityCounts={common:0,uncommon:0,rare:0,mythic:0};
 G.zoneBossDefeated=false;G.zoneMiniSpawned=false;G.championDead=false;G.puddles=[];G.runeEffects=[];G.allBiomesDone=false;G.recentRewards=[];
 G.player.x=G.player.y=0;G.cam.x=G.cam.y=0;G.spawnTimer=.6;
 if($('zoneLabel'))$('zoneLabel').textContent='🌲 BOSQUE MALDITO · 1/4';
 if($('chestCount'))$('chestCount').textContent='0';
 
 toast('🌲 Bosque Maldito · sobreviví al primer guardián',3);
 oldSidebar();
}
beginGame=function(){oldBegin();adventureReset();};
startMenu=function(){oldShowMenu();modal.innerHTML=`<div class="emblem">🧙‍♂️</div><div class="subline">ARCADE-AR · VERSIÓN 2.4 · MODO INFINITO</div><h2>ELEMENTAL SURVIVOR</h2><p>Dominá <b>Fuego, Hielo, Rayo, Tierra y Viento</b>. Abrí cofres de cuatro rarezas, arriesgá con amuletos malditos y derrotá a los cuatro guardianes para enfrentar a <b>Oscuridad</b>. Después, sobreviví oleadas sin fin.</p><div class="modal-stats"><span>🌲 Bosque</span><span>❄️ Ruinas heladas</span><span>🔥 Cenizas</span><span>⚡ Templo</span></div><div class="modal-buttons"><button class="gold-btn" data-action="play">▶ COMENZAR AVENTURA</button><button class="secondary-btn" data-action="shop">🪙 MEJORAS PERMANENTES · ${saved.coins} monedas</button><button class="secondary-btn" data-action="guide">📖 GUÍA DE BOTÍN Y REINOS</button></div>`;};
pause=function(){oldPause();if(phase==='paused'){
 let s=BIOMES[G.biome];modal.innerHTML=`<div class="emblem">${s.emoji}</div><div class="subline">${s.name.toUpperCase()} · ZONA ${G.biome+1}/4</div><h2>Aventura en pausa</h2><p>Explorá sin límites, derrotá minijefes y buscá el portal que aparece cerca al vencer un guardián.</p><div class="modal-stats"><span>🗝️ ${G.chests} cofres</span><span>🪄 ${Object.keys(G.artifacts).length} reliquias</span><span>🩸 ${G.amulets.length} maldiciones</span></div><div class="modal-buttons"><button class="gold-btn" data-action="resume">▶ CONTINUAR</button><button class="secondary-btn" data-action="testChest">🎁 COFRE DE PRUEBA</button><button class="secondary-btn" data-action="allSpells">✨ PROBAR 5 ELEMENTOS</button><button class="secondary-btn" data-action="testMini">⚔️ INVOCAR MINIJEFЕ</button><button class="secondary-btn" data-action="testBoss">👑 INVOCAR JEFE DE ZONA</button><button class="secondary-btn" data-action="testZone">🗺️ IR AL PRÓXIMO BIOMA (DEMO)</button><button class="secondary-btn" data-action="restart">↻ REINICIAR</button><button class="secondary-btn" data-action="exit">⌂ MENÚ</button></div>`;
 }};
shop=function(){oldShop();};
renderSidebar=function(){oldSidebar();if(!G||!G.artifacts)return;
 let items=Object.entries(G.artifacts).map(([id,lv])=>`<div class="info-item"><span class="info-icon">${ARTIFACTS[id].icon}</span>${ARTIFACTS[id].name} · Nv.${lv}</div>`).join('');
 let curse=G.amulets.map(id=>`<div class="info-item"><span class="info-icon">${CURSES[id].icon}</span>${CURSES[id].name}</div>`).join('');
 if(items||curse)$('weaponsInfo').insertAdjacentHTML('beforeend',items+curse);
 if($('zoneLabel'))$('zoneLabel').textContent=`${BIOMES[G.biome].emoji} ${BIOMES[G.biome].name.toUpperCase()} · ${G.biome+1}/4`;
 if($('chestCount'))$('chestCount').textContent=G.chests;
};
renderHud=function(){oldHud();if(G&&G.biome!==undefined&&$('zoneLabel'))$('zoneLabel').textContent=`${BIOMES[G.biome].emoji} ${BIOMES[G.biome].short} · ${G.biome+1}/4`;if(G&&G.biome!==undefined&&$('chestCount'))$('chestCount').textContent=G.chests;};
function dropChest(x,y,origin='random',free=false){if(!G||G.chestsWorld.length>=2)return;G.chestsWorld.push({x,y,origin,open:false,gleam:rand(0,6),free});}
function chestRarity(){let r=Math.random()*100;if(G.amulets.includes('voideye'))r=Math.min(99.99,r+9);let n=0;for(const it of RARITIES){n+=it.chance;if(r<n)return it}return RARITIES[0]}
function grantArtifact(id){if(!G||!ARTIFACTS[id])return;G.artifacts[id]=Math.min(3,(G.artifacts[id]||0)+1);G.artifactTimers[id]=.4;}
function grantReward(reward){if(!G)return;const p=G.player;
 if(reward.type==='artifact'){grantArtifact(reward.id);toast(`${ARTIFACTS[reward.id].icon} ${ARTIFACTS[reward.id].name}`,2)}
 else if(reward.type==='spell'){G.weapons[reward.id]=Math.min(5,(G.weapons[reward.id]||0)+reward.boost);toast(`✨ ${reward.name} · Nv. ${G.weapons[reward.id]}`,2)}
 else if(reward.type==='heal'){p.hp=Math.min(p.maxHp,p.hp+reward.amount);toast(`❤️ +${reward.amount} vida`,2)}
 else if(reward.type==='coins'){G.coinsEarned+=reward.amount;toast(`🪙 +${reward.amount} monedas`,2)}
 else if(reward.type==='power'){G.power=Math.min(2.75,G.power*(1+reward.amount));toast(`✨ +${Math.round(reward.amount*100)}% daño`,2)}
 G.recentRewards.push(reward.name);renderSidebar();audio(900,.15,'triangle',.045);
}
function rollChestReward(rar){const w=['fire','ice','lightning','earth','wind'];const eligible=w.filter(id=>G.weapons[id]<5);
 const available=Object.keys(ARTIFACTS),newOnes=available.filter(id=>!G.artifacts[id]);
 const k=Math.random();
 if((rar.key==='mythic'||rar.key==='rare')&&k<.72){const arr=newOnes.length?newOnes:available;const id=arr[Math.floor(Math.random()*arr.length)];return {type:'artifact',id,name:ARTIFACTS[id].name,icon:ARTIFACTS[id].icon,desc:ARTIFACTS[id].desc}}
 if((rar.key==='mythic'||rar.key==='rare')&&k>=.72){return {type:'power',amount:rar.key==='mythic'?.16:.08,name:rar.key==='mythic'?'Ritual de poder mítico':'Bendición arcana',icon:'✨',desc:'Aumenta permanentemente el daño de esta partida.'}}
 if(eligible.length&&(rar.key==='uncommon'||k<.58)){const id=eligible[Math.floor(Math.random()*eligible.length)];let boost=rar.key==='uncommon'?2:1;return {type:'spell',id,boost,name:`${{fire:'Fuego',ice:'Hielo',lightning:'Rayo',earth:'Tierra',wind:'Viento'}[id]} elemental`,icon:{fire:'🔥',ice:'❄️',lightning:'⚡',earth:'🪨',wind:'🌪️'}[id],desc:`+${boost} nivel de un elemento`}}
 if(k<.78)return {type:'heal',amount:rar.key==='uncommon'?45:22,name:'Poción de vida',icon:'❤️',desc:'Recupera vida inmediatamente.'};
 return {type:'coins',amount:rar.key==='uncommon'?35:12,name:'Bolsa de oro',icon:'🪙',desc:'Monedas adicionales para la forja.'};
}
function showChest(chest){if(phase!=='playing'||!chest)return;chest.open=true;G.chestsWorld=G.chestsWorld.filter(c=>c!==chest);G.chests++;let rar=chestRarity();G.rarityCounts[rar.key]++;
 const curseOffer=(rar.key==='mythic'?.58:rar.key==='rare'?.38:rar.key==='uncommon'?.08:.02)>Math.random() && G.amulets.length<3;
 if(curseOffer){let ids=Object.keys(CURSES).filter(id=>!G.amulets.includes(id));if(ids.length){const id=ids[Math.floor(Math.random()*ids.length)];G.pendingLoot={rar,id,type:'curse'};phase='loot';setModal(`<div class="emblem">📿</div><div class="subline" style="color:${rar.hex}">COFRE ${rar.name}</div><h2>Amuleto maldito</h2><p>${CURSES[id].icon} <b>${CURSES[id].name}</b><br>${CURSES[id].desc}</p><div class="curse-trade"><span class="good">${CURSES[id].plus}</span><span class="bad">${CURSES[id].minus}</span></div><div class="modal-buttons"><button class="gold-btn" data-action="acceptCurse">ACEPTAR EL PACTO</button><button class="secondary-btn" data-action="refuseCurse">RECHAZAR · +20 🪙</button></div>`);renderSidebar();return}}
 const reward=rollChestReward(rar);G.pendingLoot={rar,reward,type:'reward'};phase='loot';setModal(`<div class="emblem">🎁</div><div class="subline" style="color:${rar.hex}">COFRE ${rar.name} · ${rar.chance}%</div><h2>${reward.icon} ${reward.name}</h2><p>${reward.desc}</p><div class="loot-rarity" style="--rar:${rar.hex}">✦ ${rar.name} ✦</div><div class="modal-buttons"><button class="gold-btn" data-action="claimLoot">RECOGER RECOMPENSA</button></div>`);renderSidebar();audio(700,.18,'triangle',.04);
}
function acceptCurse(id){if(!id||G.amulets.includes(id))return;const p=G.player;G.amulets.push(id);if(id==='sacrifice'){G.power=Math.min(2.75,G.power*1.23);p.maxHp=Math.max(20,Math.round(p.maxHp*.8));p.hp=Math.min(p.hp,p.maxHp)}
 if(id==='ashes'){}if(id==='tempest')p.speed*=.85;if(id==='fang')p.speed*=1.3;if(id==='shackle')p.speed*=.8;
 toast(`${CURSES[id].icon} ${CURSES[id].name}`,3);renderSidebar();}
function updateChestWorld(dt){G.chestTimer-=dt;const p=G.player;
 if(G.chestTimer<=0){G.chestTimer=rand(105,150);const a=rand(0,TWO),r=rand(190,300),x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;dropChest(x,y)}
 for(const chest of [...G.chestsWorld]){chest.gleam+=dt*3;if(Math.hypot(chest.x-p.x,chest.y-p.y)<35){showChest(chest);break}}
}
function zoneTransition(){if(!G.openPortal||G.biome>=BIOMES.length-1)return;
 G.biome++;G.biomeTime=0;G.zoneKills=0;G.openPortal=false;G.portal=null;G.zoneBossDefeated=false;G.zoneMiniSpawned=false;G.zoneMiniCount=0;G.chestsWorld=[];G.puddles=[];
 G.boss=null;G.bossArrived=false;G.miniSpawned=false;G.player.x=0;G.player.y=0;G.cam.x=0;G.cam.y=0;G.player.hp=Math.min(G.player.maxHp,G.player.hp+30);G.enemies=[];G.enemyBullets=[];G.bullets=[];G.gems=[];G.pickups=[];
 $('bossLife').classList.add('hidden');$('bossWarning').classList.add('hidden');G.chestTimer=rand(70,110);
 toast(`${BIOMES[G.biome].emoji} ¡Entraste a ${BIOMES[G.biome].name}!`,5);renderSidebar();audio(760,.24,'triangle',.06);
}
updatePlayer=function(dt){oldPlayer(dt);if(!G)return;const p=G.player;
 if(G.openPortal&&G.portal&&Math.hypot(p.x-G.portal.x,p.y-G.portal.y)<72)zoneTransition();
};
function buildBoss(){if(G.bossArrived||G.zoneBossDefeated)return;G.bossArrived=true;
 const a=rand(0,TWO),r=Math.max(view.w,view.h)*.66+80,bi=G.biome;
 const hp=[1050,1400,1750,2050][bi];G.boss={x:G.player.x+Math.cos(a)*r,y:G.player.y+Math.sin(a)*r,r:30+bi*3,hp,maxHp:hp,speed:[48,53,58,64][bi],damage:14+bi*3,hurt:0,attackTime:1.9,telegraph:null,shockTimer:0,extraTimer:2};
 $('bossWarning').textContent=`👑 ¡${BIOMES[bi].boss.toUpperCase()}!`;$('bossName').textContent=BIOMES[bi].boss.toUpperCase();
 $('bossWarning').classList.remove('hidden');$('bossLife').classList.remove('hidden');toast(`👑 ${BIOMES[bi].boss} ha llegado`,4);audio(175,.35,'sawtooth',.09)
}
bossSpawn=buildBoss;
bossDamage=function(amount){if(!G?.boss)return;const b=G.boss;b.hp-=amount;b.hurt=.14;sparkle(b.x+rand(-12,12),b.y+rand(-12,12),'#ebd58d',4,58);
 if(b.hp>0)return;
 G.boss=null;G.bossKilled=true;G.zoneBossDefeated=true;G.bossArrived=true;$('bossLife').classList.add('hidden');$('bossWarning').classList.add('hidden');
 G.gems.push(...Array.from({length:20},()=>({x:b.x+rand(-85,85),y:b.y+rand(-75,75),value:10,r:7})));
 dropChest(b.x,b.y,'boss',true);G.bossesDefeated++;G.coinsEarned+=70+G.biome*25;G.enemies=[];G.enemyBullets=[];G.puddles=[];
 if(G.biome===BIOMES.length-1){G.allBiomesDone=true;G.darknessDelay=95;toast('⚠️ Los cuatro reinos están libres... algo despierta en la oscuridad.',6)}else{G.openPortal=true;G.portal={x:G.player.x+155,y:G.player.y-10};toast('🏆 JEFE DERROTADO · BUSCÁ EL PORTAL CERCANO',5)}
};
function spawnChampion(){if(G.zoneMiniCount>=2&&!G.endless)return;G.zoneMiniSpawned=true;G.zoneMiniCount++;
 const types=[['entGuardian','champion'],['iceRevenant','frostGolem'],['cinderKnight','knight'],['thunderBeast','knight']];const names=[['Guardián Espinado','Capitán de los Huesos'],['Espectro del Glaciar','Gólem del Glaciar'],['Caballero de la Llama','Guardián de las Brasas'],['Bestia del Trueno','Caballero de la Tempestad']];const j=(G.zoneMiniCount-1)%2;spawnNear(types[G.biome][j],rand(280,430));let e=G.enemies[G.enemies.length-1];e.elite=true;e.miniBoss=true;e.hp*=1.8;e.maxHp=e.hp;e.r*=1.16;e.damage*=1.14;e.speed*=.92;e.title=names[G.biome][j];toast(`⚔️ ¡MINIJEFE: ${e.title}!`,4);audio(310,.23,'sawtooth',.045)
}
killEnemy=function(e){const elite=!!e.elite,x=e.x,y=e.y;oldKill(e);if(G){G.zoneKills++;if(elite){G.championDead=true;G.coinsEarned+=20;if(Math.random()<.18){dropChest(x,y,'elite',true);toast('🎁 ¡Botín excepcional de minijefe!',3)}else toast('⚔️ Minijefe derrotado · +20 monedas',2)}else if(Math.random()<(G.amulets.includes('voideye')?.0014:.00055)){dropChest(x,y,'drop')}}};
strike=function(target,amount,knock=0,slow=0){if(!target)return;let d=amount;
 if(G?.amulets.includes('ashes')&&G.attackSchool==='fire')d*=1.4;
 if(G?.amulets.includes('shackle')&&G.attackSchool==='earth')d*=1.45;
 if(target.type==='shield'&&target.guardTimer<=0){d*=.63;target.guardTimer=.8}
 if(target.type==='ghost'&&target.ghostHide>0)return;
 oldStrike(target,d,knock,slow)
};
function strikeSchool(t,d,school,knock=0,slow=0){G.attackSchool=school;strike(t,d,knock,slow);G.attackSchool='';}
function magicNumber(num){return Math.ceil(num*(G?.power||1))}
function spawnProjectile(e,type,dx,dy,d,sp=165){const mag=hypot(dx,dy);if(G.enemyBullets.length>100)return;
 G.enemyBullets.push({x:e.x,y:e.y,vx:dx/mag*sp,vy:dy/mag*sp,r:type==='poison'?8:6,ttl:4,damage:d,type,color:{poison:'#8ce8a1',arrow:'#e3d7a7',dark:'#e497e8',ice:'#82d4fa',fire:'#ff8e61',bolt:'#c0a2ff'}[type]})
}
function spawnEnemies(dt){const p=G.player,maxCount=120;G.spawnTimer-=dt;
 if(G.spawnTimer<0&&G.enemies.length<maxCount&&!G.openPortal){G.spawnTimer=Math.max(.27,.92-G.biome*.06-G.biomeTime*.0013-Math.max(0,G.wave-1)*.043)*(G.amulets.includes('voideye')?.83:1);
 const n=1+(G.biomeTime>65?1:0)+(G.biomeTime>130?1:0)+Math.min(2,Math.floor(Math.max(0,G.wave-1)/3));
 for(let i=0;i<n&&G.enemies.length<maxCount;i++){
 let roster=G.endless?[...BIOMES[0].roster,...BIOMES[1].roster,...BIOMES[2].roster,...BIOMES[3].roster,'voidling','voidling','voidling']:BIOMES[G.biome].roster;let maxTypes=G.endless?roster.length:G.biomeTime<35?3:G.biomeTime<75?5:roster.length;const type=roster[Math.floor(Math.random()*maxTypes)];
 spawnNear(type,rand(260,420));
 }}
 for(const e of G.enemies){if(e.dead)continue;
 e.hurt=Math.max(0,e.hurt-dt);e.slow=Math.max(0,(e.slow||0)-dt);e.guardTimer=Math.max(0,(e.guardTimer||0)-dt);e.ghostHide=Math.max(0,(e.ghostHide||0)-dt);e.specialTimer=(e.specialTimer??rand(1,3))-dt;
 const dx=p.x-e.x,dy=p.y-e.y,d=hypot(dx,dy),k=e.slow?.56:1;
 const ranged=['mage','shaman','archer','mirrorShade'].includes(e.type), distMin=ranged?170:0;
 let move=1;if(e.type==='ghost'&&e.ghostHide>0)move=1.6;
 if(d>distMin){e.x+=dx/d*e.speed*k*move*dt;e.y+=dy/d*e.speed*k*move*dt}
 if(d<e.r+p.r+3)damageHero(e.damage);
 if(e.specialTimer<=0&&d<500){
 e.specialTimer=rand(2.1,3.7);
 if(ranged){let type=e.type==='archer'?'arrow':e.type==='shaman'?'poison':e.type==='mirrorShade'?'ice':'dark';spawnProjectile(e,type,dx,dy,e.damage,e.type==='archer'?270:165)}
 if(['spider','ashCrawler','thornling'].includes(e.type)){G.puddles.push({x:e.x,y:e.y,r:30,ttl:5,damage:5,tick:0})}
 if(e.type==='ghost'){e.ghostHide=.6;e.x+=rand(-75,75);e.y+=rand(-70,70)}
 if(['bat','wolf','emberling','cryptHound','sparkWraith'].includes(e.type)){e.x+=dx/d*30;e.y+=dy/d*30}
 }
 }
 G.enemies=G.enemies.filter(e=>!e.dead&&Math.hypot(e.x-p.x,e.y-p.y)<1100);
 for(const b of G.enemyBullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.ttl-=dt;
 if(Math.hypot(b.x-p.x,b.y-p.y)<p.r+b.r){damageHero(b.damage);b.ttl=0}}
 G.enemyBullets=G.enemyBullets.filter(b=>b.ttl>0&&Math.abs(b.x-p.x)<950&&Math.abs(b.y-p.y)<950);
 for(const puddle of G.puddles){puddle.ttl-=dt;puddle.tick-=dt;if(puddle.tick<=0&&Math.hypot(puddle.x-p.x,puddle.y-p.y)<puddle.r+8){puddle.tick=.85;damageHero(puddle.damage)}}G.puddles=G.puddles.filter(q=>q.ttl>0)
}
updateEnemy=function(dt){spawnEnemies(dt)};
updateBoss=function(dt){oldBossUpdate(dt);if(!G?.boss||phase!=='playing')return;
 const b=G.boss,p=G.player;b.extraTimer-=dt;
 if(b.extraTimer<=0){b.extraTimer=rand(3,4.2);const bi=G.biome;
 if(b.darkness){for(let i=0;i<4;i++)spawnNear('voidling',rand(225,340));}
 if(bi===0){for(let i=0;i<3;i++)spawnNear('skeleton',rand(170,250))}
 if(bi===1){for(let i=0;i<7;i++){let a=i*TWO/7;spawnProjectile(b,'ice',Math.cos(a),Math.sin(a),12,200)}}
 if(bi===2){for(let i=0;i<3;i++)G.puddles.push({x:p.x+rand(-85,85),y:p.y+rand(-95,95),r:46,ttl:4,damage:8,tick:0})}
 if(bi===3){for(let i=0;i<(b.darkness?14:9);i++){let a=i*TWO/9+G.t*.3;spawnProjectile(b,'bolt',Math.cos(a),Math.sin(a),12,235)}}
 }
};
function artifactEffects(dt){if(!G)return;
 for(const [id,lv] of Object.entries(G.artifacts)){
 G.artifactTimers[id]=(G.artifactTimers[id]||0)-dt;
 if(G.artifactTimers[id]>0)continue;
 const art=ARTIFACTS[id];G.artifactTimers[id]=Math.max(.8,art.cool-lv*.38)/G.haste;
 const p=G.player,near=targetList(id==='stoneGuardian'?110:480);
 if(!near.length)continue;
 if(id==='emberRain'){for(let i=0;i<Math.min(3,lv+1);i++){const t=near[Math.min(i,near.length-1)];addArea(t.x,t.y,60+10*lv,'#ff9b47',.55,'flame');for(let e of targetList(60+10*lv,{x:t.x,y:t.y}))strikeSchool(e,(23+lv*14)*G.power,'fire',5);sparkle(t.x,t.y,'#ff9d51',13,100)}}
 else if(id==='frostNova'){addArea(p.x,p.y,120+lv*18,'#8cdefc',.6,'wind');for(let t of targetList(120+lv*18))strikeSchool(t,(18+lv*13)*G.power,'ice',4,2)}
 else if(id==='thunderTotem'){let hits=near.slice(0,lv+2);let line=[{x:p.x,y:p.y}];for(let e of hits){strikeSchool(e,(21+lv*11)*G.power,'lightning',3);line.push({x:e.x,y:e.y})}if(line.length>1)G.beams.push({points:line,life:.3,max:.3})}
 else if(id==='stoneGuardian'){for(let e of near.slice(0,3))strikeSchool(e,(20+lv*15)*G.power,'earth',11);addArea(p.x,p.y,100,'#c5ae86',.3,'rocks')}
 else if(id==='cycloneBlades'){addArea(p.x,p.y,100+lv*20,'#a5f5dc',.45,'wind');for(let e of targetList(100+lv*20))strikeSchool(e,(16+lv*11)*G.power,'wind',21)}
 }
}
updateAttacks=function(dt){oldUpdateAttacks(dt);if(phase==='playing')artifactEffects(dt)};
// En cada zona se activa un miniboss, seguido por un jefe; los límites del mapa son reales.
update=function(dt){if(phase!=='playing')return;
 G.t+=dt;G.biomeTime+=dt;
 updatePlayer(dt);if(phase!=='playing')return;
 updateEnemy(dt);if(phase!=='playing')return;
 updateAttacks(dt);if(phase!=='playing')return;
 updateBoss(dt);if(phase!=='playing')return;
 updateDrops(dt);if(phase!=='playing')return;
 updateChestWorld(dt);if(phase!=='playing')return;
 updateParticles(dt);
 if(!G.endless){if(G.biomeTime>=50&&G.zoneMiniCount<1)spawnChampion();if(G.biomeTime>=110&&G.zoneMiniCount<2)spawnChampion();}
 if(G.biomeTime>=170&&!G.bossArrived&&!G.zoneBossDefeated)buildBoss();
 if(G.darknessDelay>0){G.darknessDelay-=dt;if(G.darknessDelay<=0)spawnDarkness();}
 if(G.endless){G.waveTimer-=dt;if(G.waveTimer<=0)nextWave();}
 screenShake=Math.max(0,screenShake-dt*28);
};
// Pixel art de terreno por región, con fronteras, senderos y portales visibles.
drawTerrain=function(){if(!G){oldTerrain();return}const b=BIOMES[G.biome],w=view.w,h=view.h,p=G.player,cam=G.cam,t=64;
 ctx.fillStyle=b.soil;ctx.fillRect(0,0,w,h);
 const left=Math.floor((cam.x-w/2-70)/t),right=Math.ceil((cam.x+w/2+70)/t),top=Math.floor((cam.y-h/2-70)/t),bottom=Math.ceil((cam.y+h/2+70)/t);
 for(let j=top;j<=bottom;j++)for(let i=left;i<=right;i++){
 const sx=i*t-cam.x+w/2,sy=j*t-cam.y+h/2,hv=hash(i,j,G.biome*7+2);
 rect(sx,sy,t,t,hv>.6?b.floor:b.soil);
 if(hv>.83)rect(sx+3,sy+4,58,4,b.color);
 if(Math.abs((i*13+j*3)%14-7)<2&&hv<.66)rect(sx,sy,64,64,b.floor);
 for(let k=0;k<3;k++){
 const px=sx+hash(i,j,k+10)*54+4,py=sy+hash(i,j,k+20)*52+3,h1=hash(i,j,k+30);
 if(h1<.58){rect(px,py,3,7,b.dec);rect(px-3,py+3,8,3,b.accent)}
 else if(h1<.68){rect(px,py,7,5,b.brick);rect(px+1,py+1,3,2,'#ffffff35')}
 else if(h1<.72){rect(px,py,3,3,G.biome===2?'#ffab4e':b.accent)}
 }
 if(hv>.93){const x=sx+19,y=sy+29;
 rect(x-10,y+12,35,7,'#080d1680');rect(x,y-2,17,18,b.brick);rect(x+3,y-9,12,12,b.color);
 if(G.biome===0){rect(x-14,y-23,43,22,'#153626');rect(x-7,y-32,30,17,'#245840');rect(x,y-40,16,13,'#326d4b')}
 if(G.biome===1){rect(x-4,y-25,28,19,'#aedcec');rect(x,y-34,16,11,'#dcf6f6')}
 if(G.biome===2){rect(x-6,y-25,29,18,'#a24f33');rect(x,y-34,12,14,'#ec763a')}
 if(G.biome===3){rect(x-8,y-31,25,23,'#6e589b');rect(x,y-38,9,10,'#c2adf8')}
 }
 }
 // Mundo continuo, sin paredes ni límites invisibles.
 if(G.openPortal&&G.portal){const x=SX(G.portal.x),y=SY(G.portal.y),a=G.t*3;
 shadow(x,y+22,35,13);for(let i=0;i<4;i++){ctx.strokeStyle=i%2?b.accent:'#ebf7ff';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(x,y-7,22+i*5,34+i*3,a+i*.65,0,TWO);ctx.stroke()}rect(x-24,y+19,48,8,'#ffe2aa')}

};
// Enemigos nuevos con siluetas únicas y barra de vida; los originales conservan su dibujo.
paintEnemy=function(e){const x=SX(e.x),y=SY(e.y)+Math.sin(G.t*4+e.phase)*1.2;
 if(!['bat','shield','ghost','spider','shaman','archer','knight','champion','iceWisp','frostGolem','emberling','stormWisp'].includes(e.type))oldEnemyPaint(e);
 else if(x>-45&&y>-45&&x<view.w+45&&y<view.h+45){
 const r=e.r,hit=e.hurt>0;ctx.save();if(hit)ctx.globalAlpha=.63;
 shadow(x,y+r*.6,r*.9,r*.38);
 const sprite=(dx,dy,w,h,c)=>rect(x+dx,y+dy,w,h,c);
 switch(e.type){
 case 'bat':sprite(-15,-9,10,9,'#78508e');sprite(6,-9,10,9,'#78508e');sprite(-11,-15,6,6,'#9c73aa');sprite(6,-15,6,6,'#9c73aa');sprite(-6,-14,12,16,'#51345e');sprite(-4,-11,3,3,'#ff84a0');sprite(2,-11,3,3,'#ff84a0');break;
 case 'shield':sprite(-12,-18,25,31,'#464d61');sprite(-10,-26,21,16,'#e8dccb');sprite(-5,-21,3,3,'#303c40');sprite(4,-21,3,3,'#303c40');sprite(-16,-8,15,22,'#a4a8bd');sprite(-12,-4,7,14,'#d7bb70');sprite(11,-11,5,26,'#c0b7a4');break;
 case 'ghost':sprite(-15,-20,30,33,'#529f99');sprite(-12,-18,24,27,'#a1d6d0');sprite(-5,-11,5,5,'#354863');sprite(5,-11,5,5,'#354863');sprite(-14,7,7,11,'#71c1ba');sprite(0,10,6,9,'#86cfc7');sprite(11,6,5,12,'#71c1ba');break;
 case 'spider':sprite(-22,-10,12,4,'#a96e73');sprite(10,-10,12,4,'#a96e73');sprite(-19,3,11,4,'#a96e73');sprite(9,3,11,4,'#a96e73');sprite(-13,-15,26,25,'#663a50');sprite(-7,-10,14,12,'#bd556b');sprite(-5,-8,3,3,'#ffe8c0');sprite(4,-8,3,3,'#ffe8c0');break;
 case 'shaman':sprite(-12,-13,24,26,'#4b385f');sprite(-14,-23,28,14,'#7353a0');sprite(-7,-18,14,11,'#b3a5c9');sprite(-4,-15,3,4,'#e6b1ff');sprite(4,-15,3,4,'#e6b1ff');sprite(14,-20,4,34,'#b09b73');sprite(11,-26,10,10,'#98f9ad');break;
 case 'archer':sprite(-10,-17,21,29,'#435943');sprite(-12,-25,25,18,'#6e8761');sprite(-6,-19,13,12,'#cfb992');sprite(-5,-16,3,3,'#34443e');sprite(4,-16,3,3,'#34443e');sprite(13,-13,3,25,'#bda668');sprite(11,-13,12,3,'#e4d8b6');sprite(11,9,12,3,'#e4d8b6');break;
 case 'knight':case 'champion':{const s=e.type==='champion'?1.25:1;ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.translate(-x,-y);sprite(-13,-19,27,37,'#323d5b');sprite(-15,-25,30,20,'#8186a6');sprite(-6,-21,13,11,'#1f2835');sprite(-5,-17,4,4,'#f77773');sprite(4,-17,4,4,'#f77773');sprite(-15,-11,6,26,'#aea9bd');sprite(13,-11,6,26,'#afb0ca');sprite(17,-18,5,38,'#dbbc82');sprite(16,-23,8,11,'#c9d7e0');ctx.restore();break}
 case 'iceWisp':case 'stormWisp':case 'emberling':{const c=e.type==='iceWisp'?'#82e8f5':e.type==='emberling'?'#ff834d':'#bda7ff';sprite(-10,-9,20,20,c);sprite(-5,-15,10,8,c);sprite(-13,-3,6,7,'#f0f6fa');sprite(8,-3,6,7,'#f0f6fa');sprite(-5,-5,3,4,'#293b55');sprite(3,-5,3,4,'#293b55');break}
 case 'frostGolem':sprite(-16,-17,33,39,'#48647c');sprite(-18,-29,37,18,'#b0dcea');sprite(-11,-24,8,7,'#d4f8ff');sprite(5,-24,8,7,'#d4f8ff');sprite(-20,-8,9,24,'#9bcbd9');sprite(14,-9,9,25,'#9bcbd9');sprite(-12,12,10,16,'#849fbd');sprite(5,12,10,16,'#849fbd');break;
 }
 ctx.restore();
 if(e.hp<e.maxHp||e.elite){rect(x-17,y-38,34,5,'#13202b');rect(x-16,y-37,Math.max(0,32*e.hp/e.maxHp),3,e.elite?'#ffc46f':'#fb8c88')}
 }
 if(e.elite&&x>-40&&x<view.w+40&&y>-40&&y<view.h+40){ctx.strokeStyle='#eaba77';ctx.lineWidth=2;ctx.strokeRect(x-e.r-3,y-e.r-18,e.r*2+6,e.r*2+16);rect(x-5,y-52,10,6,'#f5d178');rect(x-10,y-47,5,5,'#f5d178');rect(x+5,y-47,5,5,'#f5d178')}
};
paintBoss=function(){
 if(!G.boss)return;
 const b=G.boss,x=SX(b.x),y=SY(b.y),bi=G.biome;
 if(bi===0){oldBossPaint();return;}
 shadow(x,y+26,38,12);
 // Personajes de 48–74 píxeles en escala 'pixel-perfect'.
 if(bi===1){ // Guardiana de Escarcha: corona de cristal, túnica glacial.
  rect(x-24,y-11,48,50,'#376388');rect(x-18,y-38,36,34,'#92b8d8');
  rect(x-11,y-31,23,19,'#d0f2f3');rect(x-9,y-26,6,5,'#21477c');rect(x+5,y-26,6,5,'#21477c');
  rect(x-17,y-50,35,12,'#b8e5fa');rect(x-7,y-65,15,17,'#edffff');rect(x-22,y-55,11,18,'#80dbf6');rect(x+13,y-55,11,18,'#80dbf6');
  rect(x-25,y+10,14,31,'#6db5c9');rect(x+11,y+10,14,31,'#6db5c9');rect(x+31,y-43,6,72,'#a9e8ff');rect(x+25,y-56,18,15,'#f1ffff');
 }else if(bi===2){ // Señor de las Brasas: armadura volcánica y cuernos.
  rect(x-27,y-18,54,58,'#573436');rect(x-22,y-34,44,28,'#a44f36');rect(x-15,y-31,30,23,'#3a3030');
  rect(x-11,y-26,8,7,'#ffcd5e');rect(x+4,y-26,8,7,'#ffcd5e');rect(x-15,y-51,12,25,'#e87536');rect(x+3,y-51,12,25,'#e87536');
  rect(x-22,y+9,44,8,'#f4813b');rect(x-31,y-8,12,32,'#9f5841');rect(x+19,y-8,12,32,'#9f5841');
  rect(x-22,y+35,16,18,'#bf5a33');rect(x+6,y+35,16,18,'#bf5a33');
  rect(x+32,y-30,11,57,'#775951');rect(x+28,y-40,19,15,'#ff9f4d');
 }else{ // Archimago Tormentoso: antifaz y orbes eléctricos.
  rect(x-22,y-24,44,62,'#24284c');rect(x-18,y-35,36,34,'#654a9f');
  rect(x-12,y-29,24,23,'#a7a1ce');rect(x-8,y-24,7,5,'#f2dcff');rect(x+3,y-24,7,5,'#f2dcff');
  rect(x-24,y-43,48,11,'#392d63');rect(x-12,y-56,24,16,'#8862b9');rect(x-5,y-67,10,11,'#cab0f5');
  rect(x-29,y+10,14,34,'#58448e');rect(x+15,y+10,14,34,'#58448e');
  rect(x+30,y-42,6,79,'#9879bd');rect(x+23,y-49,22,12,'#d7bfff');
  const a=G.t*2;for(let i=0;i<3;i++){let aa=a+i*Math.PI*2/3,px=x+Math.cos(aa)*48,py=y+Math.sin(aa)*36;rect(px-6,py-6,12,12,'#aa83ff');rect(px-2,py-2,4,4,'#fff1ff')}
 }
 ctx.lineWidth=2;ctx.strokeStyle=['#f6d4a4','#a6eaff','#fca95c','#c39dff'][bi];
 ctx.strokeRect(x-29,y-53,58,93);
 if(b.hurt>0){ctx.fillStyle='#fff4ec66';ctx.fillRect(x-28,y-48,56,89)}
};
paintPickups=function(){oldPickups();if(!G)return;
 for(const chest of G.chestsWorld){let x=SX(chest.x),y=SY(chest.y),glow=Math.sin(chest.gleam)*3;
 if(x<-50||y<-50||x>view.w+50||y>view.h+50)continue;
 shadow(x,y+17,22,7);rect(x-19,y-15,38,32,'#3d2a2a');rect(x-16,y-18,32,13,'#ad6d36');rect(x-15,y-18,30,7,'#f3cb65');rect(x-18,y-6,36,19,'#9a572f');rect(x-16,y+1,32,6,'#bb6d36');rect(x-5,y-10,11,19,'#f7d36d');rect(x-2,y-7,4,8,'#765424');rect(x-22,y-26-glow,4,4,'#fceab4');rect(x+19,y-22+glow,4,4,'#fceab4');
 }
};
paintMagic=function(){oldMagic();if(!G)return;
 for(const [id,lv] of Object.entries(G.artifacts)){
 const p=G.player,x=SX(p.x),y=SY(p.y),a=G.t*(id==='cycloneBlades'?2:1.2);
 if(id==='stoneGuardian'){let px=x+Math.cos(a)*57,py=y+Math.sin(a)*57;rect(px-9,py-9,20,20,'#8d7d62');rect(px-6,py-14,14,9,'#c0ab83');rect(px-3,py-6,4,4,'#71dba8');rect(px+5,py-6,4,4,'#71dba8')}
 if(id==='cycloneBlades'){for(let n=0;n<lv+2;n++){const aa=a+n*TWO/(lv+2),xx=x+Math.cos(aa)*66,yy=y+Math.sin(aa)*66;rect(xx-11,yy-4,22,8,'#b7f8e4');rect(xx-6,yy-7,12,14,'#61ceac')}}
 if(id==='thunderTotem'){rect(x-5,y+32,10,15,'#766b9c');rect(x-3,y+29,6,8,'#d6c1ff')}
 }
 for(const q of G.puddles){let x=SX(q.x),y=SY(q.y);ctx.fillStyle=G.biome===2?'#ff633866':'#8eea7790';ctx.beginPath();ctx.ellipse(x,y,q.r,q.r*.55,0,0,TWO);ctx.fill()}
};
// Botín y progreso de la zona sobre la interfaz del juego.
draw=function(){oldDraw();if(G){ctx.save();ctx.globalAlpha=.88;ctx.font='bold 12px ui-monospace,monospace';ctx.textAlign='center';
 if(G.openPortal&&G.portal){const xx=SX(G.portal.x),yy=SY(G.portal.y);ctx.fillStyle='#fff0af';ctx.fillText('PORTAL',Math.min(view.w-58,Math.max(58,xx)),Math.min(view.h-30,Math.max(40,yy-66)));if(xx<30||yy<30||xx>view.w-30||yy>view.h-30){const a=Math.atan2(yy-view.h/2,xx-view.w/2);ctx.fillText('➤',view.w/2+Math.cos(a)*(view.w/2-47),view.h/2+Math.sin(a)*(view.h/2-52))}}
 ctx.restore();}};
// Evento delegado del modal; los botones nuevos reutilizan la estructura de V2.1.
modal.addEventListener('click',e=>{
 const a=e.target.closest('[data-action]')?.dataset.action;
 if(!a)return;
 if(a==='testChest'&&G){phase='playing';overlay.classList.add('hidden');showChest({x:G.player.x,y:G.player.y,origin:'demo'});return}
 if(a==='testMini'&&G){phase='playing';overlay.classList.add('hidden');spawnChampion();return}
 if(a==='testZone'&&G){phase='playing';overlay.classList.add('hidden');if(G.biome<BIOMES.length-1){G.openPortal=true;zoneTransition()}else toast('⚡ Estás en el último bioma',3);return}
 if(a==='guide'){
 phase='guide';setModal(`<div class="emblem">📖</div><div class="subline">GUÍA DEL REINO</div><h2>Botín y mapas</h2><p>Los cofres tienen recompensas <b>comunes (55%), poco comunes (25%), raras (15%) y míticas (5%)</b>. Algunos contienen amuletos malditos: más poder a cambio de una penalización. Los élites siempre dejan un cofre.</p><div class="modal-stats"><span>🌲 Bosque Maldito</span><span>❄️ Ruinas Heladas</span><span>🔥 Tierras de Ceniza</span><span>⚡ Templo del Trueno</span></div><p>Un mini jefe aparece aproximadamente al minuto 1; el jefe del bioma, hacia el 2:40. Al vencerlo, buscá el <b>portal luminoso del este</b>. Tu progreso y hechizos continúan en el siguiente mapa.</p><div class="modal-buttons"><button class="gold-btn" data-action="exit">VOLVER AL MENÚ</button></div>`);return}
 if(phase==='loot'&&G.pendingLoot){let r=G.pendingLoot;
 if(a==='claimLoot'&&r.type==='reward'){grantReward(r.reward)}
 else if(a==='acceptCurse'&&r.type==='curse'){acceptCurse(r.id)}
 else if(a==='refuseCurse'&&r.type==='curse'){G.coinsEarned+=20;toast('🪙 Amuleto rechazado · +20 monedas',2)}
 else return;
 G.pendingLoot=null;phase='playing';overlay.classList.add('hidden');canvas.focus();return;
 }
 // El botón de invocar jefe original debe invocar al guardián de la zona sin avanzar el tiempo global.
 if(a==='testBoss'&&G){G.bossArrived=false;G.zoneBossDefeated=false;G.boss=null;buildBoss();G.t=Math.max(G.t,10)}
});
modal.addEventListener('click',e=>{if(e.target.closest('[data-action=testBoss]')){e.stopImmediatePropagation();if(G){phase='playing';overlay.classList.add('hidden');G.bossArrived=false;G.zoneBossDefeated=false;G.boss=null;buildBoss()}}},true);
window.pixelSurvivorStatus=()=>({phase,t:G?.t||0,kills:G?.kills||0,level:G?.level||1,enemies:G?.enemies.length||0,player:G?{x:G.player.x,y:G.player.y,hp:G.player.hp}:null,boss:!!G?.boss,bossName:G?.boss?(G.boss.darkness?'Oscuridad':BIOMES[G.biome].boss):null,spells:G?{...G.weapons}:null,biome:G?.biome||0,portal:!!G?.openPortal,chests: G?.chests||0,worldChests:G?.chestsWorld?.length||0,amulets:G?[...G.amulets]:[],artifacts:G?{...G.artifacts}:null,coins:saved.coins});

const oldGameOver=gameOver;
gameOver=function(won){oldGameOver(won);if(won){const h=modal.querySelector('h2');if(h)h.textContent='¡Los cuatro reinos están libres!';const pp=modal.querySelector('p');if(pp)pp.textContent='Derrotaste a los cuatro guardianes elementales. ¡Aventura completada!'}};
const originalHeroDamage=damageHero;damageHero=function(dmg){const extra=G?.amulets?.includes('ashes')?1.25:1;const fast=G?.amulets?.includes('fang')?1.3:1;originalHeroDamage(dmg*extra*fast)};
const originalEarth=earthEruption;earthEruption=function(){if(!G)return;G.attackSchool='earth';originalEarth();G.attackSchool=''};
const originalFireExplosion=fireExplosion;fireExplosion=function(...args){if(!G)return;G.attackSchool='fire';originalFireExplosion(...args);G.attackSchool=''};

/* V2.3 · Sprites originales en pixel art y selector de skins.
   Los cinco elementos y las mecánicas de los cuatro reinos permanecen intactos. */
const PX_FRAMES = {"hero_royal_0":[5,5,48,60],"hero_royal_1":[73,5,48,60],"hero_scarlet_0":[141,5,48,60],"hero_scarlet_1":[209,5,48,60],"hero_glacial_0":[277,5,48,60],"hero_glacial_1":[345,5,48,60],"hero_storm_0":[413,5,48,60],"hero_storm_1":[5,115,48,60],"enemy_skeleton":[73,115,48,60],"enemy_shield":[141,115,48,60],"enemy_goblin":[209,115,48,60],"enemy_wolf":[277,115,48,60],"enemy_orc":[345,115,48,60],"enemy_mage":[413,115,48,60],"enemy_bat":[5,225,48,60],"enemy_ghost":[73,225,48,60],"enemy_spider":[141,225,48,60],"enemy_shaman":[209,225,48,60],"enemy_archer":[277,225,48,60],"enemy_knight":[345,225,48,60],"enemy_champion":[413,225,48,60],"enemy_iceWisp":[5,335,48,60],"enemy_frostGolem":[73,335,48,60],"enemy_emberling":[141,335,48,60],"enemy_stormWisp":[209,335,48,60],"boss_0":[277,335,80,96],"boss_1":[345,335,80,96],"boss_2":[413,335,80,96],"boss_3":[5,445,80,96]};
const PX_SKINS = [
 {id:'royal',label:'Mago Real',desc:'Vestiduras reales azules y doradas'},
 {id:'scarlet',label:'Mago Escarlata',desc:'Túnica roja de fuego ancestral'},
 {id:'glacial',label:'Sabio Glacial',desc:'Ropaje de las ruinas heladas'},
 {id:'storm',label:'Hechicero de Tormenta',desc:'Indumentaria de rayos arcanos'}
];
if(!PX_SKINS.some(s=>s.id===saved.skin))saved.skin='royal';
const pxAtlas=new Image();pxAtlas.src='assets/pixel-atlas.png';
function drawSprite(id,x,y,w,h,mirror=false){
 const f=PX_FRAMES[id];if(!f||!pxAtlas.complete||!pxAtlas.naturalWidth)return false;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));if(mirror)ctx.scale(-1,1);
 ctx.drawImage(pxAtlas,f[0],f[1],f[2],f[3],-Math.round(w/2),-Math.round(h/2),w,h);ctx.restore();return true;
}
const v23HeroPrevious=paintHero,v23EnemyPrevious=paintEnemy,v23BossPrevious=paintBoss;
paintHero=function(){if(!G)return;const p=G.player,x=SX(p.x),y=SY(p.y);
 const bob=Math.sin(p.walk*12)*1.7,frame=Math.floor(p.walk*7)%2,inv=p.iframes>0&&Math.floor(p.iframes*15)%2===0;
 shadow(x,y+17,19,6);ctx.save();if(inv)ctx.globalAlpha=.52;
 const shown=drawSprite('hero_'+saved.skin+'_'+frame,x,y-3+bob,58,72,p.face<0);
 if(G.earthWard>0){ctx.strokeStyle='#d7b679';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,29,0,TWO);ctx.stroke()}
 ctx.restore();if(!shown)v23HeroPrevious();
};
paintEnemy=function(e){const x=SX(e.x),y=SY(e.y)+Math.sin(G.t*5+e.phase)*1.2;
 if(x<-80||y<-100||x>view.w+80||y>view.h+100)return;
 const width=(e.type==='frostGolem'||e.type==='champion')?60:(e.type==='orc'||e.type==='knight')?54:46;
 const height=(e.type==='frostGolem'||e.type==='champion')?74:60;
 shadow(x,y+e.r*.8,e.r*1.1,e.r*.4);ctx.save();if(e.hurt>0)ctx.globalAlpha=.63;
 const shown=drawSprite('enemy_'+e.type,x,y-6,width*(e.elite?1.18:1),height*(e.elite?1.18:1),(e.x>G.player.x));ctx.restore();
 if(!shown){v23EnemyPrevious(e);return}
 if(e.elite){ctx.strokeStyle='#edbc6a';ctx.lineWidth=2;ctx.strokeRect(x-e.r*1.2-3,y-e.r-30,e.r*2.4+6,e.r*2.5+25)}
 if(e.hp<e.maxHp){rect(x-17,y-height/2-8,34,4,'#181e30');rect(x-17,y-height/2-8,Math.max(0,34*e.hp/e.maxHp),4,e.elite?'#f9d177':'#e78b86')}
};
paintBoss=function(){if(!G?.boss)return;const b=G.boss,x=SX(b.x),y=SY(b.y),bi=G.biome;
 shadow(x,y+34,40,12);if(!drawSprite('boss_'+bi,x,y-8,105,126)){v23BossPrevious();return}
 ctx.strokeStyle=['#e7dcaa','#9de9ff','#ffba6b','#c49dff'][bi];ctx.lineWidth=2;
 ctx.strokeRect(x-43,y-60,86,113);if(b.hurt>0){ctx.fillStyle='#fff7ec66';ctx.fillRect(x-42,y-60,84,112)}
};
function skinPickerHTML(){return `<div class="skin-picker"><div class="skin-picker-label">ELEGÍ LA APARIENCIA DEL MAGO</div><div class="skin-grid">${PX_SKINS.map(sk=>`<button type="button" class="skin-option ${saved.skin===sk.id?'selected':''}" data-skin="${sk.id}" aria-pressed="${saved.skin===sk.id}"><img src="assets/skin-${sk.id}.png" alt=""><span>${sk.label}</span></button>`).join('')}</div><div class="skin-info">Las skins son cosméticas: no modifican el daño ni las estadísticas.</div></div>`}
const pxStartMenu=startMenu;startMenu=function(){pxStartMenu();const btns=modal.querySelector('.modal-buttons');if(btns)btns.insertAdjacentHTML('beforebegin',skinPickerHTML());updateSkinPortrait();}
function updateSkinPortrait(){const crest=$('heroCrest');if(crest)crest.innerHTML=`<img src="assets/skin-${saved.skin}.png" alt="${PX_SKINS.find(s=>s.id===saved.skin)?.label||'Mago'}">`;}
modal.addEventListener('click',e=>{const bt=e.target.closest('[data-skin]');if(!bt)return;
 const skin=bt.dataset.skin;if(!PX_SKINS.some(s=>s.id===skin))return;
 saved.skin=skin;store();updateSkinPortrait();
 modal.querySelectorAll('[data-skin]').forEach(el=>{const on=el.dataset.skin===skin;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on))});
 audio(850,.09,'triangle',.028);
});
const pxEmojiMap={
 '🧙‍♂️':'magic','🧙':'magic','🌲':'map','❄️':'ice','🔥':'fire','⚡':'lightning','🪨':'earth','🌪️':'wind',
 '❤️':'heart','♥️':'heart','💀':'skull','☠️':'skull','☠':'skull','👑':'crown','💎':'gem','🪙':'coin','🎁':'chest',
 '🗝️':'book','🪄':'magic','🩸':'sacrifice','🗺️':'map','⚔️':'sword','⚔':'sword','🥾':'foot','✨':'magic',
 '⏱':'clock','⏩':'haste','📿':'curse','👁️':'voideye','🐺':'wolf','📖':'book','▶':'play','🔊':'audio','🔇':'mute',
 '⌨️':'book','👆':'foot','🏆':'crown','⚠️':'curse','⚠':'curse','☄️':'emberRain','🔱':'thunderTotem',
 '🗿':'stoneGuardian','🌀':'wind','💠':'gem','🔷':'gem','🟢':'gem','⚪':'gem','↻':'portal','⌂':'map','↑':'speed'
};
const pxMapKeys=Object.keys(pxEmojiMap).sort((a,b)=>b.length-a.length);
const pxPattern=new RegExp(pxMapKeys.join('|'),'gu');
function substituteIcons(root){if(!root)return;const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 const nodes=[];while(walk.nextNode()){const n=walk.currentNode;const tag=n.parentElement?.tagName;if(['STYLE','SCRIPT','TEXTAREA','TITLE'].includes(tag))continue;if(pxMapKeys.some(k=>n.nodeValue.includes(k)))nodes.push(n)}
 for(const n of nodes){const f=document.createDocumentFragment();let last=0,txt=n.nodeValue;pxPattern.lastIndex=0;
 for(const m of txt.matchAll(pxPattern)){if(m.index>last)f.appendChild(document.createTextNode(txt.slice(last,m.index)));
 const img=document.createElement('img');img.className='ui-pixel-icon';img.src='assets/icons/'+pxEmojiMap[m[0]]+'.png';img.alt='';img.setAttribute('aria-hidden','true');f.appendChild(img);last=m.index+m[0].length}
 if(last<txt.length)f.appendChild(document.createTextNode(txt.slice(last)));n.parentNode?.replaceChild(f,n)}
}
const pxObserver=new MutationObserver(()=>{pxObserver.disconnect();substituteIcons(document.body);pxObserver.observe(document.body,{childList:true,subtree:true,characterData:true})});
substituteIcons(document.body);pxObserver.observe(document.body,{childList:true,subtree:true,characterData:true});
const pxStatusOld=window.pixelSurvivorStatus;window.pixelSurvivorStatus=()=>({...pxStatusOld(),skin:saved.skin,artLoaded:!!pxAtlas.naturalWidth});

/* V2.4: mundo libre, botín escaso con ruleta, Oscuridad y supervivencia infinita. */
Object.assign(PX_FRAMES, {
  "enemy_thornling":[73,445,48,60],"enemy_cryptHound":[141,445,48,60],
  "enemy_mirrorShade":[209,445,48,60],"enemy_ashCrawler":[277,445,48,60],
  "enemy_sparkWraith":[345,445,48,60],"enemy_voidling":[413,445,48,60],
  "enemy_entGuardian":[5,555,48,60],"enemy_iceRevenant":[73,555,48,60],
  "enemy_cinderKnight":[141,555,48,60],"enemy_thunderBeast":[209,555,48,60],
  "boss_darkness":[277,555,80,96]
});

// Ataques y salud en partidas extensas: la magia no puede multiplicarse ilimitadamente.
const v24GrantReward=grantReward;
grantReward=function(reward){v24GrantReward(reward);G.power=Math.min(2.75,G.power);G.haste=Math.min(1.4,G.haste)};
const v24DrawBoss=paintBoss;
paintBoss=function(){
 if(!G?.boss?.darkness){v24DrawBoss();return}
 const b=G.boss,x=SX(b.x),y=SY(b.y),pulse=Math.sin(G.t*2.3)*7;
 ctx.save();ctx.globalAlpha=.21+Math.sin(G.t*4)*.09;ctx.fillStyle='#9d4df4';ctx.beginPath();ctx.arc(x,y-10,104+pulse,0,TWO);ctx.fill();ctx.restore();
 shadow(x,y+66,66,18);
 drawSprite('boss_darkness',x,y-12,190+pulse,222+pulse);
 ctx.strokeStyle='#ad75ee';ctx.lineWidth=3;ctx.strokeRect(x-72,y-102,144,183);
 if(b.hurt>0){ctx.fillStyle='#ffffff66';ctx.fillRect(x-68,y-98,136,178)}
};
function spawnDarkness(){
 if(!G||G.darknessAwakened)return;G.darknessAwakened=true;
 const p=G.player,a=rand(0,TWO),d=rand(310,420),hp=5300+G.level*115;
 G.boss={x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,r:61,hp,maxHp:hp,speed:71,damage:26,hurt:0,attackTime:1.8,telegraph:null,shockTimer:0,extraTimer:1.8,darkness:true};
 G.bossArrived=true;$('bossWarning').textContent='☠ LA OSCURIDAD HA DESPERTADO';
 $('bossName').textContent='OSCURIDAD · SEÑOR DEL VACÍO';$('bossWarning').classList.remove('hidden');$('bossLife').classList.remove('hidden');
 toast('☠ EL QUINTO JEFE HA LLEGADO: OSCURIDAD',6);screenShake=14;audio(105,.7,'sawtooth',.08);
}
const v24BossDamage=bossDamage;
bossDamage=function(damage){
 if(!G?.boss?.darkness){v24BossDamage(damage);return}
 const b=G.boss;b.hp-=damage;b.hurt=.12;
 sparkle(b.x+rand(-24,24),b.y+rand(-32,32),'#c27bfb',6,70);
 if(b.hp>0)return;
 for(let i=0;i<38;i++)G.gems.push({x:b.x+rand(-120,120),y:b.y+rand(-110,110),value:14,r:7});
 dropChest(b.x,b.y,'darkness',true);G.coinsEarned+=400;
 G.boss=null;G.bossKilled=true;G.bossesDefeated=5;G.endless=true;G.wave=0;G.waveTimer=0;
 $('bossWarning').classList.add('hidden');$('bossLife').classList.add('hidden');
 G.enemies=[];G.enemyBullets=[];G.puddles=[];nextWave();
 toast('✦ OSCURIDAD VENCIDA · COMIENZA LA SUPERVIVENCIA INFINITA',6);
 audio(780,.5,'triangle',.06);
};
function spawnWaveMini(){
 if(!G||!G.endless)return;
 const types=['entGuardian','iceRevenant','cinderKnight','thunderBeast'];
 const name=['Guardián de la Raíz','Revenant Helado','Caballero Ardiente','Coloso del Trueno'];
 const k=(Math.floor(G.wave/2)-1)%types.length;
 spawnNear(types[k],rand(300,440));const e=G.enemies[G.enemies.length-1];
 e.elite=true;e.miniBoss=true;e.hp*=2+G.wave*.1;e.maxHp=e.hp;e.r*=1.18;e.damage*=1.18;e.title=name[k];
 toast(`⚔️ OLEADA ${G.wave} · ${e.title}`,4);
}
function nextWave(){
 if(!G||!G.endless)return;
 G.wave++;G.waveTimer=Math.max(34,60-G.wave*1.5);
 G.spawnTimer=Math.min(G.spawnTimer,.2);
 if(G.wave>1&&G.wave%2===0)spawnWaveMini();
 toast(`∞ OLEADA ${G.wave} · ¡SOBREVIVÍ!`,4);audio(300,.18,'triangle',.045);
}
const v24Hud=renderHud;
renderHud=function(){
 v24Hud();if(!G)return;
 const label=$('zoneLabel');
 if(G.endless)label.textContent=`∞ SUPERVIVENCIA · OLEADA ${G.wave}`;
 else if(G.boss?.darkness)label.textContent='☠ OSCURIDAD · JEFE FINAL';
 else if(G.darknessDelay>0)label.textContent=`☠ OSCURIDAD EN ${Math.ceil(G.darknessDelay)}s`;
};
// Cofres raros y transitorios: no quedan dos cofres inalcanzables bloqueando el mapa.
const v24DropChest=dropChest;
dropChest=function(x,y,origin='random',free=false){v24DropChest(x,y,origin,free);
 const chest=G?.chestsWorld?.[G.chestsWorld.length-1];if(chest&&chest.x===x&&chest.y===y)chest.ttl=145;
};
const v24ChestTick=updateChestWorld;
updateChestWorld=function(dt){
 G.chestsWorld=G.chestsWorld.filter(c=>(c.ttl=(c.ttl??145)-dt)>0);
 v24ChestTick(dt);
};
const V24_LOOT_PREVIEW=[
 {icon:'🔥',name:'Fuego'}, {icon:'❄️',name:'Hielo'}, {icon:'⚡',name:'Rayo'},
 {icon:'🪨',name:'Tierra'}, {icon:'🌪️',name:'Viento'}, {icon:'❤️',name:'Curación'},
 {icon:'🪙',name:'Monedas'}, {icon:'✨',name:'Daño arcano'},
 ...Object.values(ARTIFACTS).map(a=>({icon:a.icon,name:a.name})),
 {icon:'📿',name:'Amuleto maldito'}
];
function finishLootRoll(state){
 if(!G||phase!=='loot-roll'||G.pendingLoot!==state)return;
 const {rar,reward,id,type}=state;
 phase='loot';
 if(type==='curse')setModal(`<div class="emblem">📿</div><div class="subline" style="color:${rar.hex}">COFRE ${rar.name} · REVELADO</div><h2>¡Amuleto maldito!</h2><p>${CURSES[id].icon} <b>${CURSES[id].name}</b><br>${CURSES[id].desc}</p><div class="curse-trade"><span class="good">${CURSES[id].plus}</span><span class="bad">${CURSES[id].minus}</span></div><div class="modal-buttons"><button class="gold-btn" data-action="acceptCurse">ACEPTAR EL PACTO</button><button class="secondary-btn" data-action="refuseCurse">RECHAZAR · +20 🪙</button></div>`);
 else setModal(`<div class="emblem">🎁</div><div class="subline" style="color:${rar.hex}">COFRE ${rar.name} · REVELADO</div><h2>${reward.icon} ${reward.name}</h2><p>${reward.desc}</p><div class="loot-rarity" style="--rar:${rar.hex}">✦ ${rar.name} ✦</div><div class="modal-buttons"><button class="gold-btn" data-action="claimLoot">RECOGER RECOMPENSA</button></div>`);
 audio(950,.3,'triangle',.055);
}
showChest=function(chest){
 if(phase!=='playing'||!chest)return;
 chest.open=true;G.chestsWorld=G.chestsWorld.filter(c=>c!==chest);G.chests++;
 const rar=chestRarity();G.rarityCounts[rar.key]++;
 const odds=rar.key==='mythic'?.38:rar.key==='rare'?.25:rar.key==='uncommon'?.065:.01;
 const ids=Object.keys(CURSES).filter(id=>!G.amulets.includes(id));
 const curse=ids.length&&G.amulets.length<3&&Math.random()<odds;
 let state;
 if(curse){const id=ids[Math.floor(Math.random()*ids.length)];state={rar,id,type:'curse'};}
 else {const reward=rollChestReward(rar);state={rar,reward,type:'reward'};}
 G.pendingLoot=state;phase='loot-roll';keys={};joystick.id=null;joystick.dx=joystick.dy=0;
 const chosen=state.type==='curse'?{icon:'📿',name:CURSES[state.id].name}:{icon:state.reward.icon,name:state.reward.name};
 const slots=Array.from({length:36},(_,i)=>i===31?chosen:V24_LOOT_PREVIEW[Math.floor(Math.random()*V24_LOOT_PREVIEW.length)]);
 setModal(`<div class="emblem">🎰</div><div class="subline" style="color:${rar.hex}">COFRE ${rar.name}</div><h2>La ruleta arcana</h2><p>Los premios giran... ¿qué tesoro obtendrás?</p><div class="roulette-window" id="rouletteWindow"><div class="roulette-center"></div><div class="roulette-track" id="rouletteTrack">${slots.map(v=>`<div class="roulette-slot"><span class="roulette-icon">${v.icon}</span><b>${v.name}</b></div>`).join('')}</div></div><div class="roulette-hint">✦ EL DESTINO ESTÁ GIRANDO ✦</div>`);
 const windowEl=$('rouletteWindow'),track=$('rouletteTrack');
 const distance=(31+.5)*148-windowEl.clientWidth/2;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(phase!=='loot-roll'||G?.pendingLoot!==state||!track.isConnected)return;
  track.style.transition='transform 3s cubic-bezier(.12,.78,.13,1)';
  track.style.transform=`translate3d(-${distance}px,0,0)`;
 }));
 audio(450,.18,'triangle',.05);
 setTimeout(()=>finishLootRoll(state),3260);
 renderSidebar();
};
const v24PaintEnemy=paintEnemy;
paintEnemy=function(e){v24PaintEnemy(e);if(e.miniBoss){
 const x=SX(e.x),y=SY(e.y);if(x<-80||y<-100||x>view.w+80||y>view.h+100)return;
 ctx.lineWidth=2;ctx.strokeStyle='#f1c27b';ctx.strokeRect(x-30,y-43,60,78);
 rect(x-23,y-56,46,5,'#0d1525');rect(x-23,y-56,Math.max(0,46*e.hp/e.maxHp),5,'#f8b967');
 }};
// Read-only snapshot for QA and quick game balance checks.
const v24GameOver=gameOver;
gameOver=function(won){
 if(!G||G.ended)return;
 saved.bestWave=Math.max(saved.bestWave||0,G.wave||0);
 v24GameOver(false);
 if(G.wave>0){const stats=modal.querySelector('.modal-stats');if(stats)stats.insertAdjacentHTML('beforeend',`<span>∞ Oleada ${G.wave}</span>`)}
 renderSidebar();
};
const v24Status=window.pixelSurvivorStatus;
window.pixelSurvivorStatus=()=>({...v24Status(),wave:G?.wave||0,endless:!!G?.endless,darknessDelay:G?.darknessDelay||0,darknessAwakened:!!G?.darknessAwakened,bossesDefeated:G?.bossesDefeated||0,miniBosses:G?.zoneMiniCount||0,playerPower:G?.power||0,lootPhase:phase==='loot-roll'||phase==='loot'});

resize();startMenu();requestAnimationFrame(tick);
})();

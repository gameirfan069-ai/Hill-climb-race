import './style.css';

const app = document.querySelector('#app');
app.innerHTML = `
  <main class="game-shell">
    <canvas id="game" aria-label="RidgeRush Racing game"></canvas>
    <div class="topbar">
      <div class="brand"><span class="brand-icon">▲</span><div><b>RIDGERUSH</b><small>RACING</small></div></div>
      <div class="stats">
        <div class="stat"><span>🪙</span><b id="coins">0</b></div>
        <div class="stat"><span>⛽</span><b id="fuel">100%</b></div>
      </div>
      <button class="icon-btn" id="pauseBtn" aria-label="Pause">Ⅱ</button>
    </div>
    <div class="speed-card"><strong id="speed">0</strong><span>KM/H</span><div class="speed-track"><i id="speedbar"></i></div></div>
    <div class="mission"><span class="live-dot"></span><span id="missionText">DRIVE FAR • COLLECT COINS</span></div>
    <div class="center-overlay" id="overlay">
      <div class="panel">
        <div class="eyebrow">OFFROAD • PHYSICS • ADVENTURE</div>
        <h1>RIDGE<span>RUSH</span></h1>
        <p>Climb the ridges. Keep your wheels down. Chase the horizon.</p>
        <div class="vehicle-preview">🚙</div>
        <button class="primary" id="startBtn">START YOUR ENGINE <span>➜</span></button>
        <small>Touch controls • Best played in landscape</small>
      </div>
    </div>
    <div class="pause-overlay hidden" id="pauseOverlay">
      <div class="panel compact"><h2>PAUSED</h2><p>Catch your breath, racer.</p><button class="primary" id="resumeBtn">RESUME RACE</button><button class="secondary" id="restartBtn">RESTART</button></div>
    </div>
    <div class="bottom-hud">
      <div class="pedal-group"><button class="control brake" id="brake"><span>◀</span><small>BRAKE</small></button><div class="control-hint">LEAN BACK</div></div>
      <div class="bottom-center"><div class="distance"><span>DISTANCE</span><b id="distance">0 <small>m</small></b></div><div class="fuel-track"><i id="fuelbar"></i></div></div>
      <div class="pedal-group right"><button class="control gas" id="gas"><span>▶</span><small>THROTTLE</small></button><div class="control-hint">LEAN FORWARD</div></div>
    </div>
    <div class="toast" id="toast"></div>
  </main>
`;
const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
let W=0,H=0,dpr=1, raf=0, last=0;
let started=false, paused=false, gameOver=false;
let worldX=0, speed=0, fuel=100, coins=0, distance=0, airtime=0, toastTimer=0;
let throttle=false, brake=false, car={x:0,y:0,angle:0,vy:0,rot:0};
let pickups=[], particles=[], terrain=[], hills=[], lastPickupX=500;
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const groundY=x => {
  return H*0.72 + Math.sin(x*0.0032)*H*0.055 + Math.sin(x*0.008)*H*0.022 + Math.sin(x*0.00115+1.5)*H*0.04;
};
function resize(){
  dpr=Math.min(window.devicePixelRatio||1,2); W=window.innerWidth; H=window.innerHeight;
  canvas.width=Math.floor(W*dpr); canvas.height=Math.floor(H*dpr);
  canvas.style.width=W+'px'; canvas.style.height=H+'px'; ctx.setTransform(dpr,0,0,dpr,0,0);
  car.x=W*.29; car.y=groundY(worldX+W*.29)-28;
}
window.addEventListener('resize',resize);
function reset(){
  worldX=0; speed=0; fuel=100; coins=0; distance=0; airtime=0; gameOver=false;
  car={x:W*.29,y:groundY(worldX+W*.29)-30,angle:0,vy:0,rot:0};
  pickups=[]; particles=[]; lastPickupX=300; for(let x=250;x<10000;x+=rand(220,360)) spawnPickup(x);
  $('coins').textContent='0'; $('fuel').textContent='100%'; $('distance').innerHTML='0 <small>m</small>';
}
function spawnPickup(x){ pickups.push({x,y:groundY(x)-rand(75,115),r:10,taken:false}); }
function showToast(text){ $('toast').textContent=text; $('toast').classList.add('show'); toastTimer=1.8; }
function drawSky(){
  const g=ctx.createLinearGradient(0,0,0,H); g.addColorStop(0,'#10233f');g.addColorStop(.52,'#3c7290');g.addColorStop(1,'#f6b778');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // sun glow
  const sx=W*.76, sy=H*.23, glow=ctx.createRadialGradient(sx,sy,2,sx,sy,H*.16);
  glow.addColorStop(0,'rgba(255,235,170,.65)');glow.addColorStop(1,'rgba(255,218,150,0)');
  ctx.fillStyle=glow;ctx.fillRect(sx-H*.2,sy-H*.2,H*.4,H*.4);
  ctx.fillStyle='#ffe6a4';ctx.beginPath();ctx.arc(sx,sy,H*.045,0,Math.PI*2);ctx.fill();
  // distant ridges
  for(let layer=0;layer<3;layer++){
    const base=H*(.57+layer*.065), amp=H*(.10+layer*.018), shift=worldX*(.08+layer*.08);
    ctx.beginPath();ctx.moveTo(0,H);
    for(let x=0;x<=W+8;x+=8){let yy=base+Math.sin((x+shift)*(.002+layer*.0007)+layer)*amp+Math.sin((x+shift)*.006+layer*2)*amp*.22;ctx.lineTo(x,yy);}
    ctx.lineTo(W,H);ctx.closePath();
    ctx.fillStyle=['#304d68','#263f53','#20374a'][layer];ctx.fill();
  }
  // cloud streaks
  ctx.globalAlpha=.18;ctx.fillStyle='#fff';
  for(let i=0;i<5;i++){let x=((i*247-worldX*.12)%(W+220)+W+220)%(W+220)-80;let y=H*(.13+(i%3)*.08);ctx.fillRect(x,y,65,2);ctx.fillRect(x+18,y+6,42,2);}
  ctx.globalAlpha=1;
}
function drawTerrain(){
  const start=worldX-100, end=worldX+W+100;
  ctx.beginPath();ctx.moveTo(0,H);
  for(let x=start;x<=end;x+=5)ctx.lineTo(x-worldX,groundY(x));
  ctx.lineTo(W,H);ctx.closePath();
  const g=ctx.createLinearGradient(0,H*.61,0,H);g.addColorStop(0,'#4b8d55');g.addColorStop(.12,'#285d43');g.addColorStop(1,'#152d2d');
  ctx.fillStyle=g;ctx.fill();
  ctx.beginPath();for(let x=start;x<=end;x+=5){let sx=x-worldX, y=groundY(x);if(x===start)ctx.moveTo(sx,y);else ctx.lineTo(sx,y);}
  ctx.strokeStyle='#a5d77b';ctx.lineWidth=4;ctx.stroke();
  // little grass strokes
  for(let x=Math.floor(start/44)*44;x<end;x+=44){
    let sx=x-worldX,y=groundY(x);ctx.strokeStyle='rgba(196,226,133,.38)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(sx,y+3);ctx.lineTo(sx-3,y-5);ctx.moveTo(sx+4,y+2);ctx.lineTo(sx+7,y-4);ctx.stroke();
  }
}
function drawCoin(p){
  const x=p.x-worldX,y=p.y+Math.sin(performance.now()*.004+p.x)*4;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(performance.now()*.003+p.x)*.15);
  ctx.shadowColor='#ffd65c';ctx.shadowBlur=18;ctx.fillStyle='#ffc83d';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.strokeStyle='#fff0a3';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#fff0a3';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('$',0,.5);ctx.restore();
}
function drawCar(){
  const x=car.x,y=car.y;
  ctx.save();ctx.translate(x,y);ctx.rotate(car.angle);
  // shadow
  ctx.fillStyle='rgba(5,15,22,.3)';ctx.beginPath();ctx.ellipse(0,20,45,8,0,0,Math.PI*2);ctx.fill();
  // suspension
  ctx.strokeStyle='#202a31';ctx.lineWidth=4;
  ctx.beginPath();ctx.moveTo(-25,7);ctx.lineTo(-22,17);ctx.moveTo(25,7);ctx.lineTo(22,17);ctx.stroke();
  // wheels
  for(const wx of [-25,25]){
    ctx.fillStyle='#111a21';ctx.beginPath();ctx.arc(wx,13,11,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#81919a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(wx,13,6,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle='#c2cbd0';ctx.lineWidth=1.5;for(let a=0;a<4;a++){let an=a*Math.PI/2;ctx.beginPath();ctx.moveTo(wx,13);ctx.lineTo(wx+Math.cos(an)*5,13+Math.sin(an)*5);ctx.stroke();}
  }
  // body
  const body=ctx.createLinearGradient(0,-18,0,12);body.addColorStop(0,'#ffdc75');body.addColorStop(.45,'#f18a35');body.addColorStop(1,'#c84b2e');
  ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-42,5);ctx.lineTo(-38,-9);ctx.quadraticCurveTo(-35,-15,-19,-15);ctx.lineTo(-8,-27);ctx.quadraticCurveTo(0,-31,13,-25);ctx.lineTo(27,-12);ctx.lineTo(39,-9);ctx.lineTo(43,5);ctx.quadraticCurveTo(20,12,-42,5);ctx.fill();
  ctx.strokeStyle='#ffcb75';ctx.lineWidth=2;ctx.stroke();
  // windows
  ctx.fillStyle='#7ed4e5';ctx.beginPath();ctx.moveTo(-15,-16);ctx.lineTo(-5,-25);ctx.quadraticCurveTo(1,-27,9,-23);ctx.lineTo(18,-14);ctx.closePath();ctx.fill();
  ctx.fillStyle='#38657b';ctx.beginPath();ctx.moveTo(1,-24);ctx.lineTo(9,-22);ctx.lineTo(16,-14);ctx.lineTo(1,-14);ctx.closePath();ctx.fill();
  // bumper and lights
  ctx.fillStyle='#303f47';ctx.fillRect(32,1,14,5);ctx.fillStyle='#fff0ad';ctx.fillRect(35,-5,6,5);ctx.fillStyle='#f7f2dc';ctx.fillRect(-40,-4,5,5);
  ctx.fillStyle='#8d392b';ctx.fillRect(-12,6,22,3);
  ctx.restore();
}
function particleBurst(x,y,color,count=8){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-100,100),vy:rand(-140,-20),life:rand(.35,.8),max:.8,color});}
function drawParticles(dt){
  for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;if(p.life<=0){particles.splice(i,1);continue;}ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x-worldX,p.y,rand(1.5,3.5),0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=1;
}
function update(dt){
  if(!started||paused||gameOver)return;
  dt=Math.min(dt,.032);
  if(throttle&&fuel>0){speed+=90*dt;fuel-=2.5*dt;}else speed-=24*dt;
  if(brake)speed-=125*dt;
  speed=clamp(speed,0,235);fuel=clamp(fuel,0,100);
  worldX+=speed*dt*.9;distance=Math.floor(worldX/8);
  const wx=worldX+car.x, gy=groundY(wx)-25;
  const next=groundY(wx+8), prev=groundY(wx-8);
  const targetAngle=Math.atan2(next-prev,16);
  if(car.y>=gy-1){car.y=gy;car.vy=0;car.angle+=(targetAngle-car.angle)*Math.min(1,dt*7);airtime=0;}
  else {car.vy+=520*dt;car.y+=car.vy*dt;car.angle+=((throttle?.24:-.12)-car.angle)*dt*1.3;airtime+=dt;}
  if(car.y>H+60){gameOver=true;showToast('RACE OVER — TAP RESTART');}
  // coin collection
  for(const p of pickups){if(p.taken)continue;const px=p.x-worldX;if(Math.abs(px-car.x)<31&&Math.abs(p.y-car.y)<45){p.taken=true;coins++;$('coins').textContent=coins;particleBurst(p.x,p.y,'#ffdf69',12);showToast('+1 GOLD COIN');}}
  pickups=pickups.filter(p=>!p.taken&&p.x>worldX-100);
  if(fuel<25&&Math.floor(performance.now()/2000)%2===0)$('missionText').textContent='LOW FUEL • FIND A CAN';
  else $('missionText').textContent='DRIVE FAR • COLLECT COINS';
  if(fuel<=0&&speed<5){gameOver=true;showToast('OUT OF FUEL — RACE OVER');}
  $('fuel').textContent=Math.ceil(fuel)+'%';$('fuelbar').style.width=fuel+'%';
  $('speed').textContent=Math.round(speed);$('speedbar').style.width=(speed/235*100)+'%';
  $('distance').innerHTML=distance+' <small>m</small>';
  if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('show');}
}
function render(dt){
  drawSky();drawTerrain();
  for(const p of pickups)if(!p.taken&&p.x-worldX>-30&&p.x-worldX<W+30)drawCoin(p);
  drawParticles(dt);drawCar();
  // vignette
  const vg=ctx.createRadialGradient(W/2,H/2,H*.2,W/2,H/2,H*.8);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(5,12,20,.24)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}
function loop(t){const dt=(t-last)/1000||0;last=t;update(dt);render(dt);raf=requestAnimationFrame(loop);}
resize();reset();requestAnimationFrame(loop);
$('startBtn').addEventListener('click',()=>{reset();started=true;paused=false;$('overlay').classList.add('hidden');showToast('GO GO GO!');});
$('pauseBtn').addEventListener('click',()=>{if(!started)return;paused=true;$('pauseOverlay').classList.remove('hidden');});
$('resumeBtn').addEventListener('click',()=>{paused=false;$('pauseOverlay').classList.add('hidden');});
$('restartBtn').addEventListener('click',()=>{reset();started=true;paused=false;$('pauseOverlay').classList.add('hidden');});
function bindHold(id,setter){const el=$(id);const on=e=>{e.preventDefault();setter(true);el.classList.add('pressed');};const off=e=>{e.preventDefault();setter(false);el.classList.remove('pressed');};el.addEventListener('pointerdown',on);['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,off));}
bindHold('gas',v=>throttle=v);bindHold('brake',v=>brake=v);
window.addEventListener('keydown',e=>{if(e.code==='ArrowRight'||e.code==='KeyD')throttle=true;if(e.code==='ArrowLeft'||e.code==='KeyA')brake=true;if(e.code==='Space'){paused=!paused;$('pauseOverlay').classList.toggle('hidden',!paused);}});
window.addEventListener('keyup',e=>{if(e.code==='ArrowRight'||e.code==='KeyD')throttle=false;if(e.code==='ArrowLeft'||e.code==='KeyA')brake=false;});

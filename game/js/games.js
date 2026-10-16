/* Eleven factory mini-games, each with its own mechanic. They run in an overlay above the factory
   hall and resolve with { stars: 0..3, score }. stars 0 means the player may retry. */
import { TRACKS } from './regions.js';

const $ = (s, r = document) => r.querySelector(s);
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
const wait = ms => new Promise(r => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
const FONT = '"Readex Pro", system-ui, sans-serif';

let cssDone = false;
function css() {
  if (cssDone) return; cssDone = true;
  const s = el('style'); s.textContent = `
#mg{z-index:35;background:radial-gradient(120% 100% at 50% 0%,rgba(28,36,110,.55),rgba(10,14,48,.82));backdrop-filter:blur(3px)}
#mg .mg-top{position:absolute;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;padding:10px 14px;width:min(860px,calc(100% - 24px))}
#mg .mg-top .chip{flex:none;padding:4px 12px;border-radius:999px;color:#fff;font-size:12.5px;font-weight:600}
#mg .mg-top b{flex:1;min-width:0;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mg .mg-top .stat{flex:none;font-weight:700;font-size:16px;font-variant-numeric:tabular-nums;color:var(--navy);padding:4px 12px;border-radius:12px;background:rgba(42,53,144,.08)}
#mg .mg-top .x{flex:none;width:40px;height:40px;border-radius:12px;border:0;background:rgba(42,53,144,.08);color:var(--navy);font-size:18px}
@media (max-width:960px){#mg .mg-top{left:auto;right:12px;transform:none;width:calc(100% - 82px)}}
@media (max-width:520px){#mg .mg-top .chip{display:none}#mg .mg-top{gap:8px;padding:8px 10px}#mg .mg-top b{font-size:15.5px}#mg .mg-brief{font-size:13.5px;padding:8px 12px}}
#mg .mg-stage{position:absolute;left:50%;transform:translateX(-50%);top:calc(max(12px,env(safe-area-inset-top)) + 74px);bottom:max(14px,env(safe-area-inset-bottom));width:min(980px,calc(100% - 20px));display:flex;flex-direction:column;align-items:center;gap:12px}
#mg .mg-brief{width:min(760px,100%);padding:10px 16px;font-size:14.5px;line-height:1.7;color:var(--ink);text-align:center}
#mg canvas.mg-cv{flex:1;min-height:0;width:100%;border-radius:22px;touch-action:none;box-shadow:0 20px 50px -20px rgba(0,0,0,.6)}
#mg .mg-row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
#mg .mg-big{min-width:min(320px,90%);min-height:64px;font-size:20px}
#mg .opt{min-height:48px;padding:8px 16px;border-radius:14px;border:2px solid transparent;background:rgba(255,255,255,.92);color:var(--navy);font:600 15px ${FONT};cursor:pointer;transition:transform .15s,border-color .2s,background .2s}
#mg .opt:hover{transform:translateY(-2px)}
#mg .opt.sel{border-color:var(--violet);background:#efeafd}
#mg .opt.good{background:#2fb36d;color:#fff}
#mg .opt.bad{background:#e0464f;color:#fff}
#mg .shake{animation:shake .4s}
@keyframes shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
#mg .panel{padding:16px;width:min(760px,100%);max-height:100%;overflow:auto;box-sizing:border-box}
#mg .grid{display:grid;gap:10px;width:100%}
#mg .card3{aspect-ratio:3/4;perspective:700px;cursor:pointer}
#mg .card3 .in{position:relative;width:100%;height:100%;transition:transform .45s;transform-style:preserve-3d}
#mg .card3.flip .in,#mg .card3.done .in{transform:rotateY(180deg)}
#mg .card3 .f,#mg .card3 .b{position:absolute;inset:0;border-radius:16px;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:grid;place-items:center;box-shadow:0 8px 20px -10px rgba(0,0,0,.5)}
#mg .card3 .f{background:linear-gradient(135deg,#2a3590,#3c58a7 55%,#847bb8);color:#fff;font-size:clamp(22px,4vw,34px)}
#mg .card3 .b{background:#fff;transform:rotateY(180deg);flex-direction:column;align-content:center;gap:4px;padding:6px;text-align:center}
#mg .card3 .b i{font-style:normal;font-size:clamp(30px,6vw,52px);line-height:1}
#mg .card3 .b small{font-size:12px;font-weight:600;color:var(--navy)}
#mg .card3.done .b{background:#e6f7ee;outline:3px solid #2fb36d}
#mg .slot{min-height:54px;border-radius:14px;border:2px dashed rgba(255,255,255,.45);display:flex;align-items:center;gap:10px;padding:6px 12px;color:#fff;font-weight:600;font-size:14.5px}
#mg .slot.ok{border-style:solid;border-color:#2fb36d;background:rgba(47,179,109,.18)}
#mg .slot em{font-style:normal;flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.18)}
#mg .step{display:flex;align-items:center;gap:10px;text-align:start}
#mg .step i{font-style:normal;font-size:24px}
#mg .qtimer{width:min(760px,100%);height:10px;border-radius:999px;background:rgba(255,255,255,.2);overflow:hidden}
#mg .qtimer i{display:block;height:100%;background:linear-gradient(90deg,#f2c230,#e0464f);border-radius:inherit}
#mg .qq{font-size:clamp(18px,2.4vw,24px);font-weight:700;color:#fff;text-align:center;line-height:1.6;max-width:760px}
#mg .sweet{width:100%;aspect-ratio:1;border-radius:50%;box-shadow:inset 0 -6px 0 rgba(0,0,0,.18),0 4px 10px -4px rgba(0,0,0,.4)}
#mg .cell{aspect-ratio:1;border-radius:14px;background:#f6efe2;box-shadow:inset 0 0 0 2px #d9c9a8;display:grid;place-items:center;padding:12%;cursor:pointer}
#mg .cell.good{box-shadow:inset 0 0 0 3px #2fb36d}
#mg .cell.bad{box-shadow:inset 0 0 0 3px #e0464f}
#mg .pal{display:flex;gap:10px;justify-content:center}
#mg .pal button{width:58px;height:58px;border-radius:16px;border:3px solid transparent;background:#fff;padding:8px;cursor:pointer}
#mg .pal button.sel{border-color:var(--violet);transform:translateY(-3px)}
#mg .judge{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-top:1px solid rgba(42,53,144,.1);font-size:14px;line-height:1.6;text-align:start}
#mg .judge:first-child{border-top:0}
#mg .judge i{font-style:normal;font-size:22px}
`;
  document.head.append(s);
}

/* ---------- frame shared by every game ---------- */
function frame(F, { title, stat = '' }) {
  css();
  let root = $('#mg'); if (!root) { root = el('section', 'screen'); root.id = 'mg'; document.body.append(root); }
  root.innerHTML = ''; root.classList.add('on');
  const T = TRACKS[F.track];
  const top = el('div', 'mg-top glass', `<span class="chip" style="background:${T.color}">مسار ${T.name}</span><b>${title}</b><span class="stat">${stat}</span><button class="x" type="button" aria-label="خروج">✕</button>`);
  const stage = el('div', 'mg-stage'); root.append(top, stage);
  return { root, stage, setStat: v => { $('.stat', top).textContent = v; }, onExit: f => { $('.x', top).onclick = f; } };
}
function canvasIn(stage) {
  const cv = el('canvas', 'mg-cv'); stage.append(cv); const cx = cv.getContext('2d');
  const o = { cv, cx, w: 0, h: 0 };
  o.fit = () => { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); o.w = r.width; o.h = r.height; cv.width = r.width * d; cv.height = r.height * d; cx.setTransform(d, 0, 0, d, 0, 0); };
  requestAnimationFrame(o.fit); addEventListener('resize', o.fit); o.off = () => removeEventListener('resize', o.fit);
  o.pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  return o;
}
function rafLoop(fn) { let on = true, last = null; const f = now => { if (!on) return; if (last === null) last = now; const dt = Math.max(0, Math.min(.05, (now - last) / 1000)) * (window.__TS || 1); last = now; fn(dt, now / 1000); requestAnimationFrame(f); }; requestAnimationFrame(f); return () => { on = false; }; }
function rr(cx, x, y, w, h, r) { cx.beginPath(); cx.roundRect(x, y, w, h, r); }
function txt(cx, s, x, y, size, color = '#fff', weight = 700, align = 'center') { cx.font = `${weight} ${size}px ${FONT}`; cx.fillStyle = color; cx.textAlign = align; cx.direction = /[\u0600-\u06FF]/.test(s) ? 'rtl' : 'ltr'; cx.textBaseline = 'middle'; cx.fillText(s, x, y); }

/* ================= 1. the bottling line and the ambassador's ad (Coca-Cola, Ambassador) =================
   Part one: bottles run under the capping head; press as each one passes under it to seal it. A
   cracked bottle must be left for the reject arm; a golden one scores double. Part two: the ad studio:
   pick the scene and the line that fit the client's brief, and the poster is shot with the student
   as the campaign's ambassador. The poster can be saved. */
const IMG = {}; const img = src => IMG[src] ||= new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
function drawBottle(cx, x, base, s, { cap = false, gold = false, crack = false, t = 0, glint = 0 } = {}) {
  const h = 150 * s, w = 46 * s;
  cx.save(); cx.translate(x, base);
  if (gold) { const gg = cx.createRadialGradient(0, -h * .5, 4, 0, -h * .5, h * .9); gg.addColorStop(0, 'rgba(255,214,90,.55)'); gg.addColorStop(1, 'rgba(255,214,90,0)'); cx.fillStyle = gg; cx.beginPath(); cx.arc(0, -h * .5, h * .9, 0, 7); cx.fill(); }
  const body = () => { cx.beginPath(); cx.moveTo(-w * .42, 0); cx.quadraticCurveTo(-w * .5, -h * .04, -w * .5, -h * .12); cx.lineTo(-w * .46, -h * .3); cx.quadraticCurveTo(-w * .38, -h * .38, -w * .48, -h * .48); cx.lineTo(-w * .48, -h * .58); cx.quadraticCurveTo(-w * .48, -h * .74, -w * .2, -h * .86); cx.lineTo(-w * .17, -h * .97); cx.lineTo(w * .17, -h * .97); cx.lineTo(w * .2, -h * .86); cx.quadraticCurveTo(w * .48, -h * .74, w * .48, -h * .58); cx.lineTo(w * .48, -h * .48); cx.quadraticCurveTo(w * .38, -h * .38, w * .46, -h * .3); cx.lineTo(w * .5, -h * .12); cx.quadraticCurveTo(w * .5, -h * .04, w * .42, 0); cx.closePath(); };
  // glass and the dark drink inside
  body(); const lg = cx.createLinearGradient(-w / 2, 0, w / 2, 0); lg.addColorStop(0, '#2a0b05'); lg.addColorStop(.35, '#5a1a0c'); lg.addColorStop(.65, '#3a0f07'); lg.addColorStop(1, '#1c0703'); cx.fillStyle = lg; cx.fill();
  cx.save(); body(); cx.clip(); cx.fillStyle = 'rgba(255,255,255,.08)'; cx.fillRect(-w / 2, -h, w, h * .16);
  for (let k = 0; k < 6; k++) { const by = -((t * 60 + k * 23 * s) % (h * .7)) - h * .05, bx = Math.sin(k * 2.3 + t) * w * .25; cx.fillStyle = 'rgba(255,230,200,.35)'; cx.beginPath(); cx.arc(bx, by, 1.6 * s, 0, 7); cx.fill(); }
  cx.restore();
  // label: red band with a white wave
  cx.fillStyle = gold ? '#d9a521' : '#d71a28'; cx.fillRect(-w * .49, -h * .5, w * .98, h * .17);
  cx.strokeStyle = '#ffffff'; cx.lineWidth = 2.2 * s; cx.beginPath(); cx.moveTo(-w * .49, -h * .4); cx.bezierCurveTo(-w * .2, -h * .48, w * .1, -h * .32, w * .49, -h * .42); cx.stroke();
  // shine
  cx.fillStyle = 'rgba(255,255,255,.28)'; cx.beginPath(); cx.ellipse(-w * .28, -h * .62, w * .06, h * .2, 0, 0, 7); cx.fill();
  cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 1.2; body(); cx.stroke();
  if (crack) { cx.strokeStyle = '#f4f7ff'; cx.lineWidth = 2 * s; cx.beginPath(); cx.moveTo(-w * .3, -h * .75); cx.lineTo(-w * .05, -h * .64); cx.lineTo(-w * .2, -h * .56); cx.lineTo(w * .15, -h * .46); cx.moveTo(-w * .05, -h * .64); cx.lineTo(w * .2, -h * .7); cx.stroke(); }
  if (cap) { cx.fillStyle = gold ? '#f2c230' : '#c4151f'; cx.beginPath(); cx.roundRect(-w * .21, -h * 1.02, w * .42, h * .07, 2); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.4)'; cx.fillRect(-w * .18, -h * 1.01, w * .36, h * .015); }
  if (glint > 0) { cx.globalAlpha = glint; cx.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + t * 3; cx.beginPath(); cx.moveTo(0, -h * 1.05); cx.lineTo(Math.cos(a) * 16 * s, -h * 1.05 + Math.sin(a) * 16 * s); cx.lineTo(Math.cos(a + .2) * 4 * s, -h * 1.05 + Math.sin(a + .2) * 4 * s); cx.fill(); } cx.globalAlpha = 1; }
  cx.restore();
}
/* the three scenes the ad can be shot in */
function drawScene(cx, w, h, kind, t = 0) {
  if (kind === 'beach') {
    let g = cx.createLinearGradient(0, 0, 0, h * .62); g.addColorStop(0, '#2a9fe0'); g.addColorStop(1, '#bfe9ff'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    const sg = cx.createRadialGradient(w * .78, h * .2, 4, w * .78, h * .2, h * .3); sg.addColorStop(0, 'rgba(255,250,220,1)'); sg.addColorStop(.25, 'rgba(255,236,160,.9)'); sg.addColorStop(1, 'rgba(255,236,160,0)'); cx.fillStyle = sg; cx.fillRect(0, 0, w, h);
    g = cx.createLinearGradient(0, h * .55, 0, h * .72); g.addColorStop(0, '#1a8ccf'); g.addColorStop(1, '#5cc7e8'); cx.fillStyle = g; cx.fillRect(0, h * .55, w, h * .17);
    cx.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 9; i++) cx.fillRect((i * 97 + t * 20) % w, h * (.58 + (i % 3) * .04), 40, 2);
    g = cx.createLinearGradient(0, h * .7, 0, h); g.addColorStop(0, '#f3d9a4'); g.addColorStop(1, '#e2b877'); cx.fillStyle = g; cx.beginPath(); cx.moveTo(0, h * .72); cx.quadraticCurveTo(w * .5, h * .66, w, h * .73); cx.lineTo(w, h); cx.lineTo(0, h); cx.fill();
  } else if (kind === 'night') {
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b1030'); g.addColorStop(1, '#2a2350'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { cx.globalAlpha = .3 + (i * 37 % 10) / 14; cx.fillRect((i * 131) % w, (i * 71) % (h * .6), 2, 2); } cx.globalAlpha = 1;
    cx.fillStyle = '#f4efe0'; cx.beginPath(); cx.arc(w * .2, h * .2, h * .07, 0, 7); cx.fill(); cx.fillStyle = '#0b1030'; cx.beginPath(); cx.arc(w * .2 + h * .03, h * .19, h * .065, 0, 7); cx.fill();
    cx.fillStyle = '#3b2a4a'; cx.beginPath(); cx.moveTo(0, h * .78); cx.quadraticCurveTo(w * .3, h * .62, w * .6, h * .76); cx.quadraticCurveTo(w * .8, h * .68, w, h * .74); cx.lineTo(w, h); cx.lineTo(0, h); cx.fill();
  } else {
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e9edf3'); g.addColorStop(1, '#c9d1dc'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#b8c2cf'; for (let i = 0; i < 5; i++) cx.fillRect(w * (.08 + i * .19), h * .12, w * .14, h * .38);
    cx.fillStyle = '#8d6e52'; cx.fillRect(0, h * .74, w, h * .26); cx.fillStyle = '#7a5c43'; cx.fillRect(0, h * .74, w, 6);
  }
}
async function photo(F, A) {
  const fr = frame(F, { title: 'خط التعبئة وإعلان السفير', stat: '⏱ 35' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'اضغط <b>«أغلق»</b> أو المسافة عندما تكون العبوة تحت رأس الإغلاق تماماً. اترك العبوة <b>المشروخة</b> لذراع الرفض، والعبوة الذهبية نقاطها مضاعفة!'));
  const C = canvasIn(stage), btn = el('button', 'btn mg-big', '⬇ أغلق العبوة'); stage.append(btn);
  const logo = F.logo ? await img(F.logo) : null;
  const DUR = 35; let t = 0, spawn = .4, n = 0, score = 0, combo = 0, bestCombo = 0, capped = 0, missed = 0, wrongs = 0, rejected = 0, piston = 0, kick = 0, shake = 0, over = false;
  let bottles = [], fx = [], sparks = [];
  let resolve; const done = new Promise(r => resolve = r);
  const layout = () => { const { w, h } = C, s = Math.min(1.25, h / 420, w / 560), base = h * .74, capX = w * .52; return { w, h, s, base, capX, win: 46 * s * .42, rejX: capX + Math.min(w * .22, 220) }; };
  const press = () => {
    if (over || piston > 0) return; piston = .26; A.sfx('ui_click', .5);
    const L = layout(), cand = bottles.filter(b => !b.capped && !b.gone).sort((a, b) => Math.abs(a.x - L.capX) - Math.abs(b.x - L.capX))[0], d = cand ? Math.abs(cand.x - L.capX) : 1e9;
    if (!cand || d > L.win * 2.2) { combo = 0; fx.push({ x: L.capX, y: L.base - 190 * L.s, s: 'فارغ!', c: '#ffd0d0', life: 1 }); return; }
    if (cand.crack) { wrongs++; combo = 0; score = Math.max(0, score - 50); shake = .3; cand.gone = true; fx.push({ x: cand.x, y: L.base - 180 * L.s, s: 'مشروخة! −50', c: '#ff8a8a', life: 1.2 }); A.sfx('wrong', .6); for (let k = 0; k < 18; k++) sparks.push({ x: cand.x, y: L.base - 90 * L.s, vx: rand(-160, 160), vy: rand(-260, -60), life: .8, c: '#e9f2ff' }); return; }
    const perfect = d < L.win * .45, pts = (perfect ? 100 : 50) * (cand.gold ? 2 : 1) * (1 + Math.min(4, Math.floor(combo / 4)) * .25);
    cand.capped = true; cand.glint = 1; capped++; combo++; bestCombo = Math.max(bestCombo, combo); score += Math.round(pts);
    fx.push({ x: cand.x, y: L.base - 185 * L.s, s: `${perfect ? 'مثالي' : 'جيد'} +${Math.round(pts)}`, c: perfect ? '#ffe28a' : '#ffffff', life: 1 });
    A.sfx(perfect ? 'task_done' : 'points', .45); if (cand.gold) A.sfx('level_up', .35);
  };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); press(); });
  const kd = e => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) press(); } }; addEventListener('keydown', kd);
  C.cv.addEventListener('pointerdown', () => press());
  const stop = rafLoop(dt => {
    const { cx } = C, L = layout(), { w, h, s, base, capX } = L; if (!w) return;
    t += dt; const left = Math.max(0, DUR - t); fr.setStat(`⏱ ${Math.ceil(left)}`);
    const speed = (130 + t * 5.5) * s;
    spawn -= dt; if (spawn <= 0 && t < DUR - 1.5) { n++; const crack = n > 3 && Math.random() < .16, gold = !crack && n % 9 === 0; bottles.push({ x: -40, crack, gold, capped: false, glint: 0 }); spawn = Math.max(.42, 1.05 - t * .016) * (.85 + Math.random() * .3); }
    piston = Math.max(0, piston - dt); kick = Math.max(0, kick - dt); shake = Math.max(0, shake - dt);
    for (const b of bottles) {
      b.x += speed * dt; b.glint = Math.max(0, b.glint - dt * 2);
      if (!b.capped && !b.crack && !b.counted && b.x > capX + L.win * 2.2) { b.counted = true; missed++; combo = 0; fx.push({ x: b.x, y: base - 180 * s, s: 'فاتتك', c: '#ffb0b0', life: .9 }); A.sfx('wrong', .25); }
      if (b.crack && !b.gone && b.x > L.rejX) { b.gone = true; rejected++; kick = .3; fx.push({ x: L.rejX, y: base - 170 * s, s: 'رُفضت ✓', c: '#b8ffd0', life: 1 }); b.fly = { vx: 60, vy: -240 }; }
    }
    // the hall: brand red, soft lights, the logo watermark
    cx.save(); if (shake > 0) cx.translate(Math.sin(t * 90) * 5 * shake, 0);
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#a3121d'); g.addColorStop(.6, '#5e0911'); g.addColorStop(1, '#2a0408'); cx.fillStyle = g; cx.fillRect(-10, 0, w + 20, h);
    for (let i = 0; i < 5; i++) { const lx = w * (.1 + i * .2), rg = cx.createRadialGradient(lx, 0, 4, lx, 0, h * .7); rg.addColorStop(0, 'rgba(255,240,220,.16)'); rg.addColorStop(1, 'rgba(255,240,220,0)'); cx.fillStyle = rg; cx.fillRect(0, 0, w, h); }
    if (logo) { const lw = Math.min(w * .5, 420), lh = lw * logo.height / logo.width; cx.globalAlpha = .1; cx.drawImage(logo, w / 2 - lw / 2, h * .08, lw, lh); cx.globalAlpha = 1; }
    // conveyor: belt, rails, rollers
    cx.fillStyle = '#1d1f25'; cx.fillRect(-10, base, w + 20, 26 * s); cx.fillStyle = '#2c2f37'; for (let x = (t * speed) % (34 * s) - 34 * s; x < w; x += 34 * s) cx.fillRect(x, base + 3 * s, 16 * s, 5 * s);
    cx.fillStyle = '#c9ced6'; cx.fillRect(-10, base - 3 * s, w + 20, 4 * s); cx.fillStyle = '#8d939d'; cx.fillRect(-10, base + 26 * s, w + 20, 6 * s);
    for (let x = 0; x < w + 40; x += 70 * s) { cx.fillStyle = '#5a5f6a'; cx.fillRect(x, base + 32 * s, 8 * s, h - base); }
    // bottles
    for (const b of bottles) {
      if (b.fly) { b.fly.vy += 900 * dt; b.x += b.fly.vx * dt; b.dy = (b.dy || 0) + b.fly.vy * dt; b.rot = (b.rot || 0) + dt * 6; }
      if (b.gone && !b.fly) continue;
      cx.save(); cx.translate(b.x, base + (b.dy || 0)); cx.rotate(b.rot || 0); drawBottle(cx, 0, 0, s, { cap: b.capped, gold: b.gold, crack: b.crack, t: t + b.x * .01, glint: b.glint }); cx.restore();
    }
    bottles = bottles.filter(b => b.x < w + 60 && (b.dy || 0) < h);
    // the capping head: column, cap magazine, piston
    const top = base - 230 * s, pd = piston > 0 ? Math.sin((1 - piston / .26) * Math.PI) * 62 * s : 0;
    cx.fillStyle = '#9aa3ad'; cx.fillRect(capX - 70 * s, 0, 140 * s, top - 10 * s); cx.fillStyle = '#7d858f'; cx.fillRect(capX - 70 * s, top - 22 * s, 140 * s, 12 * s);
    cx.fillStyle = '#e8ebef'; rr(cx, capX - 46 * s, 14 * s, 92 * s, top - 60 * s, 10 * s); cx.fill();
    for (let k = 0; k < 6; k++) { cx.fillStyle = '#c4151f'; rr(cx, capX - 18 * s, 24 * s + k * 14 * s, 36 * s, 9 * s, 3); cx.fill(); }
    cx.fillStyle = '#c9ced6'; cx.fillRect(capX - 9 * s, top - 10 * s, 18 * s, 30 * s + pd); cx.fillStyle = '#2b3038'; rr(cx, capX - 24 * s, top + 16 * s + pd, 48 * s, 16 * s, 5); cx.fill();
    cx.fillStyle = piston > 0 ? '#ffd36a' : '#3ee07a'; cx.beginPath(); cx.arc(capX + 52 * s, top - 40 * s, 6 * s, 0, 7); cx.fill();
    // the window under the head
    cx.strokeStyle = 'rgba(255,226,138,.65)'; cx.setLineDash([6, 6]); cx.lineWidth = 2; cx.beginPath(); cx.moveTo(capX - L.win, top + 40 * s); cx.lineTo(capX - L.win, base - 2); cx.moveTo(capX + L.win, top + 40 * s); cx.lineTo(capX + L.win, base - 2); cx.stroke(); cx.setLineDash([]);
    // the reject arm
    const kx = L.rejX - 40 * s + (kick > 0 ? Math.sin((1 - kick / .3) * Math.PI) * 40 * s : 0);
    cx.fillStyle = '#5a5f6a'; cx.fillRect(L.rejX - 90 * s, base - 70 * s, 50 * s, 30 * s); cx.fillStyle = '#f2c230'; cx.fillRect(kx - 10 * s, base - 64 * s, 30 * s, 18 * s);
    txt(cx, 'رفض', L.rejX - 65 * s, base - 84 * s, 12 * s, '#ffd36a', 600);
    // sparks and labels
    for (const p of sparks) { p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; cx.globalAlpha = Math.max(0, p.life); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, 3, 3); } cx.globalAlpha = 1; sparks = sparks.filter(p => p.life > 0);
    for (const f of fx) { f.y -= 50 * dt; f.life -= dt; cx.globalAlpha = Math.max(0, Math.min(1, f.life * 2)); txt(cx, f.s, f.x, f.y, 20 * Math.max(.8, s), f.c); cx.globalAlpha = 1; } fx = fx.filter(f => f.life > 0);
    cx.restore();
    // score and streak
    txt(cx, score.toLocaleString('en'), w - 24, 34, 28, '#fff', 700, 'right'); txt(cx, 'نقاط', w - 24, 60, 13, 'rgba(255,255,255,.75)', 500, 'right');
    if (combo >= 3) txt(cx, `سلسلة ×${combo}`, 24, 34, 22, '#ffe28a', 700, 'left');
    const tl = Math.max(0, left / DUR); cx.fillStyle = 'rgba(255,255,255,.2)'; rr(cx, w * .3, h - 18, w * .4, 6, 3); cx.fill(); cx.fillStyle = '#ffe28a'; rr(cx, w * .3, h - 18, w * .4 * tl, 6, 3); cx.fill();
    if (t >= DUR && !over) { over = true; resolve(); }
  });
  await done; stop(); C.off(); removeEventListener('keydown', kd); btn.remove(); C.cv.remove(); stage.querySelector('.mg-brief').remove();
  const lineQ = capped / Math.max(1, capped + missed + wrongs * 1.5);
  A.sfx('level_up', .5);
  // ---- part two: the ambassador's ad
  const pose = await img(`assets/ui/${A.char || 'boy'}_pose_cut.webp`);
  const panel = el('div', 'panel glass');
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px"><b style="font-size:18px">استوديو الإعلان</b><span style="font-size:13px;color:var(--muted)">خط التعبئة: ${capped} عبوة · أفضل سلسلة ×${bestCombo}</span></div>
    <div style="padding:10px 12px;border-radius:14px;background:#fff7e0;border:1px solid #f2d27a;font-size:14.5px;line-height:1.7;margin-bottom:12px">📋 <b>طلب العميل:</b> حملة <b>صيفية منعشة</b> للشباب، تُعرض على لوحات الطرق في جدة.</div>
    <div style="font-weight:600;margin:4px 0 8px">١. اختر مكان التصوير</div><div id="ad-scene" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"></div>
    <div style="font-weight:600;margin:12px 0 8px">٢. اختر عبارة الإعلان</div><div class="mg-row" id="ad-line"></div>
    <div class="mg-row" style="margin-top:14px"><button class="btn" id="ad-shoot" type="button" disabled>📸 صوّر الإعلان</button></div>`;
  stage.append(panel);
  const scenes = [['beach', 'شاطئ وقت الظهيرة'], ['night', 'صحراء في الليل'], ['office', 'مكتب رسمي']].sort(() => Math.random() - .5);
  const lines = [['انتعش… الصيف أحلى معك', 1], ['جودة ثابتة منذ سنوات', 0], ['لحظة هدوء قبل النوم', 0]].sort(() => Math.random() - .5);
  let scene = null, line = null;
  for (const [k, name] of scenes) { const b = el('button', 'opt'), cvs = document.createElement('canvas'); cvs.width = 150; cvs.height = 84; cvs.style.cssText = 'display:block;width:100%;height:auto;aspect-ratio:150/84;border-radius:10px;margin-bottom:6px'; drawScene(cvs.getContext('2d'), 150, 84, k); b.append(cvs, name); b.style.padding = '8px'; b.onclick = () => { scene = k; A.sfx('ui_click'); panel.querySelectorAll('#ad-scene .opt').forEach(x => x.classList.toggle('sel', x === b)); $('#ad-shoot', panel).disabled = !(scene && line); }; $('#ad-scene', panel).append(b); }
  for (const [s2, ok] of lines) { const b = el('button', 'opt', s2); b.onclick = () => { line = [s2, ok]; A.sfx('ui_click'); panel.querySelectorAll('#ad-line .opt').forEach(x => x.classList.toggle('sel', x === b)); $('#ad-shoot', panel).disabled = !(scene && line); }; $('#ad-line', panel).append(b); }
  await new Promise(r => $('#ad-shoot', panel).onclick = r);
  A.sfx('panel_open', .8);
  // the poster
  const P = document.createElement('canvas'); P.width = 900; P.height = 1200; const px = P.getContext('2d');
  drawScene(px, 900, 1200, scene, 1.3);
  const vg = px.createLinearGradient(0, 760, 0, 1200); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)'); px.fillStyle = vg; px.fillRect(0, 0, 900, 1200);
  if (pose) { const ph = 820, pw = ph * pose.width / pose.height; px.drawImage(pose, 900 - pw - 10, 1200 - ph - 60, pw, ph); }
  for (const [bx, bs] of [[200, 2.3], [330, 2.7], [460, 2.3]]) drawBottle(px, bx, 1080, bs, { cap: true, t: 2 });
  px.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 26; k++) { px.beginPath(); px.arc(150 + (k * 53) % 380, 700 + (k * 97) % 330, 3 + k % 4, 0, 7); px.fill(); }
  px.textAlign = 'center'; px.direction = 'rtl'; px.fillStyle = '#fff'; let fs = 80; px.font = `700 ${fs}px "Readex Pro"`; while (px.measureText(line[0]).width > 800 && fs > 40) { fs -= 4; px.font = `700 ${fs}px "Readex Pro"`; } px.shadowColor = 'rgba(0,0,0,.45)'; px.shadowBlur = 18; px.fillText(line[0], 450, 190); px.shadowBlur = 0;
  if (logo) { const lw = 260, lh = lw * logo.height / logo.width; px.fillStyle = 'rgba(255,255,255,.92)'; px.beginPath(); px.roundRect(450 - lw / 2 - 20, 250, lw + 40, lh + 30, 18); px.fill(); px.drawImage(logo, 450 - lw / 2, 265, lw, lh); }
  px.fillStyle = 'rgba(255,255,255,.92)'; px.beginPath(); px.roundRect(30, 1130, 520, 50, 25); px.fill(); px.fillStyle = '#2a3590'; px.font = '600 26px "Readex Pro"'; px.fillText(`سفير الحملة: ${A.name || ''} · صناعيو المستقبل`, 290, 1164);
  const fit = (scene === 'beach' ? 1 : 0) + line[1];
  const stars = Math.max(0, Math.min(3, (lineQ >= .8 ? 2 : lineQ >= .5 ? 1 : 0) + (fit === 2 ? 1 : 0)));
  panel.innerHTML = '';
  const show = el('div', '', ''); show.style.cssText = 'display:grid;gap:12px;justify-items:center';
  P.style.cssText = 'width:min(300px,62vw);height:auto;border-radius:16px;box-shadow:0 24px 50px -20px rgba(0,0,0,.6);animation:cardIn .6s cubic-bezier(.2,.8,.2,1)';
  const verdict = fit === 2 ? '👍 العميل: هذا بالضبط ما طلبناه! صيفي ومنعش.' : scene !== 'beach' ? '🤔 العميل: الإعلان جميل، لكن المكان لا يوحي بالصيف والانتعاش.' : '🤔 العميل: المكان مناسب، لكن العبارة لا تناسب حملة صيفية للشباب.';
  const row = el('div', 'mg-row'), save = el('button', 'btn ghost', '⬇ حمّل إعلانك'), next = el('button', 'btn', 'متابعة');
  save.onclick = () => { const a = document.createElement('a'); a.download = 'ad-future-industrialists.png'; a.href = P.toDataURL('image/png'); a.click(); A.sfx('ui_click'); };
  row.append(save, next); show.append(P, el('div', '', `<b style="font-size:15px">${verdict}</b>`), row); panel.append(show);
  A.sfx(fit === 2 ? 'task_done' : 'points', .6);
  await new Promise(r => next.onclick = r);
  return { stars, score };
}

/* ================= 2. circuit: rotate tiles to power three satellites (KACST, Creative) ================= */
async function circuit(F, A) {
  const fr = frame(F, { title: F.title, stat: 'حركات: 0' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'اضغط على أي قطعة لتدويرها. أوصل الطاقة من المصدر ⚡ إلى الأقمار الصناعية الثلاثة 🛰️.'));
  const C = canvasIn(stage), N = 5;
  // bits: 1 up, 2 right, 4 down, 8 left
  const D = [[0, -1, 1, 4], [1, 0, 2, 8], [0, 1, 4, 1], [-1, 0, 8, 2]];
  const grid = Array.from({ length: N }, () => Array(N).fill(0));
  const src = [0, 2], targets = [[4, 0], [4, 4], [4, 2]];
  // carve random paths from the source to each target and record the openings
  const carve = (a, b) => { let [x, y] = a; while (x !== b[0] || y !== b[1]) { const opts = []; if (x < b[0]) opts.push(1); if (y < b[1]) opts.push(2); if (y > b[1]) opts.push(0); if (x > b[0]) opts.push(3); if (Math.random() < .25 && y > 0 && y < N - 1) opts.push(Math.random() < .5 ? 0 : 2); const d = D[opts[Math.random() * opts.length | 0]]; const nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; grid[y][x] |= d[2]; grid[ny][nx] |= d[3]; x = nx; y = ny; } };
  grid[src[1]][src[0]] |= 8; for (const [x, y] of targets) grid[y][x] |= 2;
  for (const tg of targets) carve(src, tg);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!grid[y][x]) grid[y][x] = [5, 3, 6][Math.random() * 3 | 0];
  const rot = v => ((v << 1) | (v >> 3)) & 15, solved = grid.map(r => r.slice());
  let minMoves = 0; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const k = Math.random() * 4 | 0; for (let i = 0; i < k; i++) grid[y][x] = rot(grid[y][x]); let v = grid[y][x], need = 0; while (v !== solved[y][x] && need < 4) { v = rot(v); need++; } minMoves += need % 4; }
  let moves = 0, anim = {}, t = 0, won = false;
  const powered = () => { const on = Array.from({ length: N }, () => Array(N).fill(false)); if (!(grid[src[1]][src[0]] & 8)) { /* source enters from the left */ } const q = [src]; on[src[1]][src[0]] = (grid[src[1]][src[0]] & 8) > 0; if (!on[src[1]][src[0]]) return on; while (q.length) { const [x, y] = q.shift(); for (const d of D) { if (!(grid[y][x] & d[2])) continue; const nx = x + d[0], ny = y + d[1]; if (nx < 0 || ny < 0 || nx >= N || ny >= N || on[ny][nx] || !(grid[ny][nx] & d[3])) continue; on[ny][nx] = true; q.push([nx, ny]); } } return on; };
  const targetOn = on => targets.map(([x, y]) => on[y][x] && (grid[y][x] & 2));
  const layout = () => { const { w, h } = C, s = Math.min((w - 160) / N, (h - 40) / N), ox = (w - s * N) / 2, oy = (h - s * N) / 2; return { s, ox, oy }; };
  const stop = rafLoop(dt => {
    const { cx, w, h } = C; if (!w) return; t += dt;
    const g = cx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0b1433'); g.addColorStop(1, '#1d2c6b'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { cx.fillStyle = `rgba(255,255,255,${.3 + .3 * Math.sin(t * 2 + i)})`; cx.fillRect((i * 97) % w, (i * 53) % h, 2, 2); }
    const { s, ox, oy } = layout(), on = powered(), tOn = targetOn(on);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const px = ox + x * s, py = oy + y * s, a = anim[`${x},${y}`] || 0; if (a) anim[`${x},${y}`] = Math.max(0, a - dt * 8);
      rr(cx, px + 3, py + 3, s - 6, s - 6, 12); cx.fillStyle = on[y][x] ? '#13305e' : '#162042'; cx.fill(); cx.strokeStyle = 'rgba(132,123,184,.35)'; cx.lineWidth = 1.5; cx.stroke();
      cx.save(); cx.translate(px + s / 2, py + s / 2); cx.rotate(-a * Math.PI / 2);
      const v = grid[y][x]; cx.strokeStyle = on[y][x] ? '#4fe3ff' : '#55608a'; cx.lineWidth = s * .16; cx.lineCap = 'round'; if (on[y][x]) { cx.shadowColor = '#4fe3ff'; cx.shadowBlur = 14; }
      for (const d of D) if (v & d[2]) { cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(d[0] * s / 2, d[1] * s / 2); cx.stroke(); }
      cx.beginPath(); cx.arc(0, 0, s * .12, 0, 7); cx.fillStyle = on[y][x] ? '#bff5ff' : '#7b86ad'; cx.fill(); cx.restore();
    }
    // source and satellites
    txt(cx, '⚡', ox - 40, oy + src[1] * s + s / 2, 34); cx.strokeStyle = '#4fe3ff'; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(ox - 18, oy + src[1] * s + s / 2); cx.lineTo(ox, oy + src[1] * s + s / 2); cx.stroke();
    targets.forEach(([x, y], i) => { const cy = oy + y * s + s / 2, lit = tOn[i]; cx.strokeStyle = lit ? '#4fe3ff' : '#55608a'; cx.beginPath(); cx.moveTo(ox + N * s, cy); cx.lineTo(ox + N * s + 18, cy); cx.stroke(); if (lit) { cx.fillStyle = 'rgba(79,227,255,.25)'; cx.beginPath(); cx.arc(ox + N * s + 44, cy, 30 + Math.sin(t * 5) * 4, 0, 7); cx.fill(); } txt(cx, '🛰️', ox + N * s + 44, cy, 32); });
  });
  const result = new Promise(res => {
    C.cv.addEventListener('pointerdown', async e => {
      if (won) return; const [mx, my] = C.pt(e), { s, ox, oy } = layout(), x = Math.floor((mx - ox) / s), y = Math.floor((my - oy) / s);
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      grid[y][x] = rot(grid[y][x]); anim[`${x},${y}`] = 1; moves++; fr.setStat(`حركات: ${moves}`); A.sfx('ui_click', .5);
      if (targetOn(powered()).every(Boolean)) { won = true; A.sfx('level_up', .6); await wait(1300); stop(); C.off(); res({ stars: moves <= minMoves + 6 ? 3 : moves <= minMoves + 16 ? 2 : 1, score: moves }); }
    });
  });
  return { result, stop: () => { stop(); C.off(); } };
}

/* ================= 3. pressure: hold to keep the gauge in the green (YORK, Discoverer) ================= */
async function pressure(F, A) {
  const fr = frame(F, { title: F.title, stat: '0%' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'اضغط مطوّلاً على الزر لتشغيل الضاغط، وارفع إصبعك لتخفيف الضغط. أبقِ المؤشر في المنطقة الخضراء حتى يكتمل الاختبار.'));
  const C = canvasIn(stage), btn = el('button', 'btn mg-big', '⬆️ اضغط مطوّلاً للضغط'); stage.append(btn);
  let p = 20, v = 0, hold = false, prog = 0, t = 0, gust = 0, zone = 62, done = false;
  const set = on => { hold = on; btn.style.transform = on ? 'scale(.97)' : ''; };
  const up = () => set(false); btn.addEventListener('pointerdown', e => { e.preventDefault(); set(true); }); addEventListener('pointerup', up); btn.addEventListener('pointerleave', up);
  const kd = e => { if (e.code === 'Space') { e.preventDefault(); set(true); } }, ku = e => { if (e.code === 'Space') set(false); };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  let resolve; const result = new Promise(r => resolve = r);
  const stop = rafLoop(dt => {
    const { cx, w, h } = C; if (!w || done) return; t += dt;
    gust += (Math.random() - .5) * dt * 60; gust *= .96; zone = 62 + Math.sin(t * .35) * 8;
    v += ((hold ? 38 : -30) + gust) * dt; v *= Math.pow(.9, dt * 60); p = Math.max(0, Math.min(100, p + v * dt * 6));
    const inZone = Math.abs(p - zone) < 9; if (inZone) prog = Math.min(1, prog + dt / 8); fr.setStat(`${Math.round(prog * 100)}%`);
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#eef3fa'); g.addColorStop(1, '#cfdbea'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    // gauge
    const tall = h > w * 1.1, R = tall ? Math.min(w * .4, h * .34) : Math.min(w * .32, h * .62), cxp = tall ? w / 2 : w * .58, cyp = tall ? h * .9 : h * .78;
    const ang = v2 => Math.PI + v2 / 100 * Math.PI;
    cx.lineWidth = R * .14; cx.lineCap = 'butt';
    cx.strokeStyle = '#dfe5ee'; cx.beginPath(); cx.arc(cxp, cyp, R, Math.PI, 2 * Math.PI); cx.stroke();
    cx.strokeStyle = '#f2c230'; cx.beginPath(); cx.arc(cxp, cyp, R, ang(zone - 18), ang(zone + 18)); cx.stroke();
    cx.strokeStyle = '#2fb36d'; cx.beginPath(); cx.arc(cxp, cyp, R, ang(zone - 9), ang(zone + 9)); cx.stroke();
    cx.strokeStyle = '#e0464f'; cx.beginPath(); cx.arc(cxp, cyp, R, ang(88), ang(100)); cx.stroke();
    for (let i = 0; i <= 10; i++) { const a = ang(i * 10); cx.strokeStyle = '#1b2263'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(cxp + Math.cos(a) * R * .8, cyp + Math.sin(a) * R * .8); cx.lineTo(cxp + Math.cos(a) * R * .9, cyp + Math.sin(a) * R * .9); cx.stroke(); }
    const a = ang(p); cx.strokeStyle = '#1b2263'; cx.lineWidth = 6; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(cxp, cyp); cx.lineTo(cxp + Math.cos(a) * R * .85, cyp + Math.sin(a) * R * .85); cx.stroke();
    cx.fillStyle = '#1b2263'; cx.beginPath(); cx.arc(cxp, cyp, 14, 0, 7); cx.fill();
    txt(cx, `${Math.round(p * 3.5)} PSI`, cxp, cyp - R * .35, Math.max(18, R * .14), '#1b2263');
    txt(cx, inZone ? 'ضغط مثالي ✓' : p > zone ? 'خفّف الضغط' : 'زد الضغط', cxp, cyp - R * .58, 16, inZone ? '#2fb36d' : '#e0464f', 600);
    // the unit under test cools as the test progresses
    const uw = tall ? Math.min(w * .5, 170) : Math.min(w * .2, 170), uh = uw * .75, ux = tall ? w / 2 - uw / 2 : w * .14, uy = tall ? h * .07 : h * .3;
    rr(cx, ux, uy, uw, uh, 10); cx.fillStyle = '#fff'; cx.fill(); cx.strokeStyle = '#c9d2df'; cx.lineWidth = 2; cx.stroke();
    cx.save(); cx.translate(ux + uw * .36, uy + uh / 2); cx.rotate(t * (6 + prog * 10)); for (let i = 0; i < 4; i++) { cx.rotate(Math.PI / 2); cx.fillStyle = '#9aa3b2'; cx.beginPath(); cx.ellipse(0, -uh * .18, uh * .08, uh * .2, 0, 0, 7); cx.fill(); } cx.restore();
    const temp = (32 - prog * 14).toFixed(1); txt(cx, `${temp}°`, ux + uw * .78, uy + uh * .45, 24, prog > .5 ? '#3c58a7' : '#e0464f'); txt(cx, 'YORK', ux + uw * .78, uy + uh * .2, 13, '#1f5fae', 700);
    rr(cx, ux, uy + uh + 16, uw, 12, 6); cx.fillStyle = '#dfe5ee'; cx.fill(); rr(cx, ux, uy + uh + 16, uw * prog, 12, 6); cx.fillStyle = '#2fb36d'; cx.fill();
    txt(cx, `${Math.round(t)} ث`, ux + uw / 2, uy + uh + 46, 15, '#5a6390', 600);
    if (p >= 99.5) { v = -60; A.sfx('wrong', .4); }
    if (prog >= 1) { done = true; A.sfx('level_up', .6); setTimeout(() => { cleanup(); resolve({ stars: t <= 16 ? 3 : t <= 26 ? 2 : 1, score: Math.round(t) }); }, 900); }
    if (t > 45 && !done) { done = true; cleanup(); resolve({ stars: 0, score: 0 }); }
  });
  const cleanup = () => { stop(); C.off(); removeEventListener('pointerup', up); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  return { result, stop: cleanup };
}

/* ================= 4. design: build the pack the client asked for (SADAFCO, Creative) ================= */
async function design(F, A) {
  const fr = frame(F, { title: F.title, stat: '' }), { stage } = fr;
  const briefs = [
    { text: 'عبوة حليب <b>بنكهة الفراولة</b> للأطفال، <b>صغيرة</b> وسهلة الحمل في الحقيبة المدرسية.', ans: { shape: 'pouch', color: 'pink', flavor: 'strawberry', size: 'small' } },
    { text: 'عبوة حليب <b>بالشوكولاتة</b> للعائلة، <b>كبيرة</b> وتحفظ في الثلاجة.', ans: { shape: 'carton', color: 'brown', flavor: 'choco', size: 'big' } },
    { text: 'حليب <b>بالموز</b> للرياضيين، في <b>زجاجة</b> عملية <b>صغيرة</b>.', ans: { shape: 'bottle', color: 'yellow', flavor: 'banana', size: 'small' } }
  ];
  const B = briefs[Math.random() * briefs.length | 0];
  stage.append(el('div', 'mg-brief glass', `📋 طلب العميل: ${B.text}`));
  const wrap = el('div', 'panel glass'); wrap.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:16px;align-items:center;flex:1;min-height:0;overflow:auto';
  const pv = el('canvas'); pv.style.cssText = 'width:100%;height:100%;min-height:220px;border-radius:16px;background:radial-gradient(circle at 50% 40%,#fff,#e8eef8)';
  const opts = el('div'); opts.style.cssText = 'display:grid;gap:10px';
  wrap.append(pv, opts); stage.append(wrap);
  if (innerWidth < 640) wrap.style.gridTemplateColumns = '1fr';
  const S = { shape: 'carton', color: 'blue', flavor: 'plain', size: 'small' };
  const groups = [['shape', 'الشكل', [['carton', 'كرتون'], ['bottle', 'زجاجة'], ['pouch', 'عبوة صغيرة']]], ['color', 'اللون', [['blue', '🔵 أزرق'], ['pink', '🩷 وردي'], ['brown', '🟤 بني'], ['yellow', '🟡 أصفر']]], ['flavor', 'النكهة', [['plain', 'سادة'], ['strawberry', '🍓 فراولة'], ['choco', '🍫 شوكولاتة'], ['banana', '🍌 موز']]], ['size', 'الحجم', [['small', '200 مل'], ['big', '1 لتر']]]];
  for (const [k, label, list] of groups) { const row = el('div'); row.innerHTML = `<small style="color:var(--muted);font-weight:600">${label}</small>`; const r = el('div', 'mg-row'); r.style.justifyContent = 'flex-start'; r.style.marginTop = '6px'; list.forEach(([v, l]) => { const b = el('button', 'opt' + (S[k] === v ? ' sel' : ''), l); b.onclick = () => { S[k] = v; [...r.children].forEach(c => c.classList.toggle('sel', c === b)); A.sfx('ui_click', .5); draw(); }; r.append(b); }); row.append(r); opts.append(row); }
  const go = el('button', 'btn', 'اعرض التصميم على لجنة التحكيم ✨'); opts.append(go);
  const col = { blue: ['#2f6fd0', '#cfe0fb'], pink: ['#e45b8f', '#fbd8e6'], brown: ['#7a4a26', '#ecd9c6'], yellow: ['#e0b21c', '#fbefc4'] };
  const icon = { plain: '🥛', strawberry: '🍓', choco: '🍫', banana: '🍌' };
  function draw() {
    const r = pv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); pv.width = r.width * d; pv.height = r.height * d; const cx = pv.getContext('2d'); cx.setTransform(d, 0, 0, d, 0, 0);
    const w = r.width, h = r.height, [c1, c2] = col[S.color], sc = (S.size === 'big' ? 1 : .72) * Math.min(w, h) / 300;
    cx.clearRect(0, 0, w, h); cx.save(); cx.translate(w / 2, h * .58); cx.scale(sc, sc);
    cx.fillStyle = 'rgba(0,0,0,.12)'; cx.beginPath(); cx.ellipse(0, 112, 80, 14, 0, 0, 7); cx.fill();
    if (S.shape === 'carton') { cx.fillStyle = '#fff'; cx.fillRect(-60, -80, 120, 190); cx.fillStyle = c1; cx.fillRect(-60, 30, 120, 80); cx.fillStyle = '#f2f2f2'; cx.beginPath(); cx.moveTo(-60, -80); cx.lineTo(0, -130); cx.lineTo(60, -80); cx.fill(); cx.fillStyle = c2; cx.fillRect(-6, -140, 12, 14); }
    else if (S.shape === 'bottle') { cx.fillStyle = c2; cx.beginPath(); cx.moveTo(-50, 110); cx.lineTo(-50, -40); cx.quadraticCurveTo(-50, -80, -22, -100); cx.lineTo(-22, -130); cx.lineTo(22, -130); cx.lineTo(22, -100); cx.quadraticCurveTo(50, -80, 50, -40); cx.lineTo(50, 110); cx.closePath(); cx.fill(); cx.fillStyle = c1; cx.fillRect(-26, -150, 52, 22); cx.fillStyle = '#fff'; cx.fillRect(-50, -10, 100, 80); }
    else { cx.fillStyle = c1; cx.beginPath(); cx.moveTo(-70, 110); cx.quadraticCurveTo(-80, 0, -60, -100); cx.lineTo(60, -100); cx.quadraticCurveTo(80, 0, 70, 110); cx.closePath(); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(14, -125, 16, 30); cx.fillStyle = c2; rr(cx, -50, -30, 100, 90, 14); cx.fill(); }
    cx.font = '52px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(icon[S.flavor], 0, S.shape === 'carton' ? -20 : 25);
    txt(cx, 'سدافكو', 0, S.shape === 'carton' ? 55 : S.shape === 'bottle' ? 58 : 80, 20, S.shape === 'carton' ? '#fff' : '#1b2263');
    txt(cx, S.size === 'big' ? '1 لتر' : '200 مل', 0, S.shape === 'carton' ? 88 : 98, 13, S.shape === 'carton' ? '#fff' : '#5a6390', 600);
    cx.restore();
  }
  requestAnimationFrame(draw); addEventListener('resize', draw);
  const result = new Promise(res => {
    go.onclick = async () => {
      removeEventListener('resize', draw); A.sfx('panel_open');
      const names = { shape: 'الشكل', color: 'اللون', flavor: 'النكهة', size: 'الحجم' }; let ok = 0;
      const lines = Object.keys(B.ans).map(k => { const good = S[k] === B.ans[k] || (k === 'color' && ((B.ans.flavor === 'strawberry' && S.color === 'pink') || (B.ans.flavor === 'choco' && S.color === 'brown') || (B.ans.flavor === 'banana' && S.color === 'yellow'))); if (good) ok++; return `<div class="judge"><i>${good ? '👍' : '🤔'}</i><span><b>${names[k]}:</b> ${good ? 'مناسب تماماً لطلب العميل' : 'يحتاج مراجعة حتى يناسب طلب العميل'}</span></div>`; });
      wrap.innerHTML = `<div style="grid-column:1/-1"><b style="font-size:18px">رأي لجنة التحكيم</b><div style="margin-top:8px">${lines.join('')}</div><div style="margin-top:10px;font-size:22px;text-align:center">${ok >= 2 ? '⭐'.repeat(ok - 1) : 'حاول مرة أخرى'}</div></div>`;
      A.sfx(ok >= 3 ? 'level_up' : 'points', .6); await wait(2600); res({ stars: ok === 4 ? 3 : ok === 3 ? 2 : ok === 2 ? 1 : 0, score: ok });
    };
  });
  return { result, stop: () => removeEventListener('resize', draw) };
}

/* ================= 5. crane: stack steel beams into a sculpture (Al Yamamah, Artist) ================= */
async function crane(F, A) {
  const fr = frame(F, { title: F.title, stat: '0 / 8' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'القضيب يتأرجح على الرافعة. اضغط على الشاشة لإفلاته فوق القضيب الذي تحته. الجزء الزائد يُقص، فكن دقيقاً!'));
  const C = canvasIn(stage); const GOAL = 8;
  let tower = [], cur = null, falling = null, cut = [], t = 0, camY = 0, over = false, ratios = [], sparks = [];
  const BH = 26;
  const init = () => { const { w } = C; tower = [{ x: w / 2 - 110, w: 220 }]; spawn(); };
  const spawn = () => { const top = tower[tower.length - 1]; cur = { w: top.w, phase: Math.random() * 6 }; };
  let resolve; const result = new Promise(r => resolve = r);
  const stop = rafLoop(dt => {
    const { cx, w, h } = C; if (!w) return; if (!tower.length) init(); t += dt;
    const groundY = h - 40, topY = groundY - tower.length * BH;
    camY += ((Math.max(0, h * .55 - topY)) - camY) * Math.min(1, dt * 4);
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b3445'); g.addColorStop(1, '#5a6272'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.save(); cx.translate(0, camY);
    cx.fillStyle = '#3a3f48'; cx.fillRect(0, groundY, w, 400);
    tower.forEach((b, i) => { const y = groundY - (i + 1) * BH; const gg = cx.createLinearGradient(0, y, 0, y + BH); gg.addColorStop(0, '#9aa3b0'); gg.addColorStop(.5, '#5d6573'); gg.addColorStop(1, '#3d434d'); cx.fillStyle = i === 0 ? '#2f3540' : gg; cx.fillRect(b.x, y, b.w, BH - 2); cx.fillStyle = 'rgba(255,255,255,.25)'; cx.fillRect(b.x, y, b.w, 3); });
    for (const c of cut) { c.vy += 900 * dt; c.y += c.vy * dt; c.r += c.vr * dt; cx.save(); cx.translate(c.x + c.w / 2, c.y + BH / 2); cx.rotate(c.r); cx.fillStyle = '#7d8592'; cx.fillRect(-c.w / 2, -BH / 2, c.w, BH - 2); cx.restore(); }
    cut = cut.filter(c => c.y < groundY + 300);
    const hookY = topY - BH * 4.4;
    if (cur && !falling) { const sw = Math.sin(t * (1.6 + tower.length * .12) + cur.phase); cur.x = w / 2 - cur.w / 2 + sw * Math.min(w * .32, 260); cx.strokeStyle = '#d9a21c'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(w / 2, hookY - 300); cx.lineTo(cur.x + cur.w / 2, hookY); cx.stroke(); cx.fillStyle = '#9aa3b0'; cx.fillRect(cur.x, hookY, cur.w, BH - 2); cx.fillStyle = 'rgba(255,255,255,.3)'; cx.fillRect(cur.x, hookY, cur.w, 3); }
    if (falling) {
      falling.vy += 1400 * dt; falling.y += falling.vy * dt; cx.fillStyle = '#9aa3b0'; cx.fillRect(falling.x, falling.y, falling.w, BH - 2);
      if (falling.y >= topY - BH) {
        const top = tower[tower.length - 1], l = Math.max(falling.x, top.x), r = Math.min(falling.x + falling.w, top.x + top.w), ow = r - l;
        if (ow <= 4) { cut.push({ ...falling, y: topY - BH, vy: 0, r: 0, vr: 3 }); falling = null; over = true; A.sfx('wrong', .6); setTimeout(() => finish(), 900); }
        else {
          if (falling.x < l) cut.push({ x: falling.x, w: l - falling.x, y: topY - BH, vy: 0, r: 0, vr: -2 }); if (falling.x + falling.w > r) cut.push({ x: r, w: falling.x + falling.w - r, y: topY - BH, vy: 0, r: 0, vr: 2 });
          tower.push({ x: l, w: ow }); ratios.push(ow / falling.w); falling = null; A.sfx('factory_metal', .5);
          for (let i = 0; i < 14; i++) sparks.push({ x: l + Math.random() * ow, y: topY - BH, vx: rand(-160, 160), vy: rand(-260, -60), life: rand(.3, .7) });
          fr.setStat(`${tower.length - 1} / ${GOAL}`);
          if (tower.length - 1 >= GOAL) { over = true; A.sfx('level_up', .6); setTimeout(() => finish(), 1000); } else spawn();
        }
      }
    }
    for (const s of sparks) { s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; cx.fillStyle = `rgba(255,${180 + Math.random() * 60 | 0},80,${Math.max(0, s.life * 1.6)})`; cx.fillRect(s.x, s.y, 3, 3); }
    sparks = sparks.filter(s => s.life > 0);
    cx.restore();
    // crane frame
    cx.fillStyle = '#e0a21c'; cx.fillRect(w * .1, 0, 14, h); cx.fillRect(w * .1, 14, w * .8, 12);
  });
  function finish() { stop(); C.off(); const n = tower.length - 1, avg = ratios.length ? ratios.reduce((a, b) => a + b) / ratios.length : 0; resolve({ stars: n >= GOAL ? (avg > .86 ? 3 : avg > .7 ? 2 : 1) : n >= 5 ? 1 : 0, score: n }); }
  C.cv.addEventListener('pointerdown', () => { if (!cur || falling || over) return; const { h } = C; const groundY = h - 40, topY = groundY - tower.length * BH; falling = { x: cur.x, w: cur.w, y: topY - BH * 4.4, vy: 0 }; A.sfx('ui_click', .4); });
  return { result, stop: () => { stop(); C.off(); } };
}

/* ================= 6. sort: remove the damaged dates before the box (Kareeda, Discoverer) ================= */
async function sort(F, A) {
  const fr = frame(F, { title: F.title, stat: '⏱ 40' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'اضغط على التمرة <b>التالفة</b> (المتشققة أو المصابة بالعفن أو الذابلة) لتبعدها. لا تضغط على التمور السليمة!'));
  const C = canvasIn(stage); let items = [], t = 0, spawnT = 0, good = 0, missed = 0, wrong = 0, removed = 0, total = 0, over = false, fx = [];
  const DUR = 40; let resolve; const result = new Promise(r => resolve = r);
  const stop = rafLoop(dt => {
    const { cx, w, h } = C; if (!w) return; t += dt; const left = Math.max(0, DUR - t); fr.setStat(`⏱ ${Math.ceil(left)}`);
    const speed = 110 + t * 4.5;
    spawnT -= dt; if (spawnT <= 0 && t < DUR - 2) { const bad = Math.random() < .38; const kind = bad ? ['crack', 'mold', 'dry'][Math.random() * 3 | 0] : 'good'; items.push({ x: -40, y: h * rand(.4, .66), kind, r: rand(0, Math.PI), s: kind === 'dry' ? .72 : rand(.92, 1.08) }); if (bad) total++; spawnT = rand(.45, .8) * (1 - t / 120); }
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f6ead6'); g.addColorStop(1, '#e2c9a2'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#3a3a40'; cx.fillRect(0, h * .32, w, h * .44); cx.fillStyle = '#46464e'; for (let x = (t * speed) % 40 - 40; x < w; x += 40) cx.fillRect(x, h * .32, 4, h * .44);
    // the box at the end
    const bx = w - 120; cx.fillStyle = '#7a5a2a'; rr(cx, bx, h * .28, 110, h * .52, 14); cx.fill(); cx.fillStyle = '#5c4220'; rr(cx, bx + 10, h * .32, 90, h * .44, 10); cx.fill(); txt(cx, 'الكريدا', bx + 55, h * .25, 15, '#7a5a2a');
    for (const it of items) {
      it.x += speed * dt; const R = Math.min(h * .07, 34) * it.s;
      cx.save(); cx.translate(it.x, it.y); cx.rotate(it.r);
      const gg = cx.createRadialGradient(-R * .3, -R * .3, 2, 0, 0, R * 1.4); gg.addColorStop(0, it.kind === 'dry' ? '#8a6a48' : '#8a3d18'); gg.addColorStop(1, it.kind === 'dry' ? '#4a3524' : '#3d160a');
      cx.fillStyle = gg; cx.beginPath(); cx.ellipse(0, 0, R * 1.4, R * .85, 0, 0, 7); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.35)'; cx.beginPath(); cx.ellipse(-R * .5, -R * .35, R * .5, R * .15, -.3, 0, 7); cx.fill();
      if (it.kind === 'crack') { cx.strokeStyle = '#f0d7b0'; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(-R * .9, -R * .1); cx.lineTo(-R * .2, R * .2); cx.lineTo(R * .3, -R * .25); cx.lineTo(R * .9, R * .1); cx.stroke(); }
      if (it.kind === 'mold') { cx.fillStyle = '#c9d8b6'; for (const [a, b, c] of [[-.4, -.2, .28], [.3, .1, .22], [.0, .35, .18]]) { cx.beginPath(); cx.arc(a * R, b * R, c * R, 0, 7); cx.fill(); } }
      if (it.kind === 'dry') { cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { cx.beginPath(); cx.moveTo(k * R * .4, -R * .7); cx.quadraticCurveTo(k * R * .4 + R * .2, 0, k * R * .4, R * .7); cx.stroke(); } }
      cx.restore();
      if (it.x > bx + 30 && !it.done) { it.done = true; if (it.kind !== 'good') { missed++; fx.push({ x: bx + 50, y: h * .2, s: '−', c: '#e0464f', life: 1 }); A.sfx('wrong', .35); } else good++; }
    }
    items = items.filter(i => i.x < bx + 40 && !i.gone);
    for (const f of fx) { f.y -= 40 * dt; f.life -= dt; cx.globalAlpha = Math.max(0, f.life); txt(cx, f.s, f.x, f.y, 26, f.c); cx.globalAlpha = 1; }
    fx = fx.filter(f => f.life > 0);
    txt(cx, `أُبعدت: ${removed}  ·  وصلت للعلبة: ${missed}  ·  أخطاء: ${wrong}`, w / 2, h * .88, 15, '#5c4220', 600);
    if (t >= DUR && !over) { over = true; stop(); C.off(); const acc = total ? removed / total : 1, pen = wrong * .08; const q = acc - pen; A.sfx(q > .6 ? 'level_up' : 'points', .6); resolve({ stars: q >= .85 ? 3 : q >= .65 ? 2 : q >= .4 ? 1 : 0, score: removed }); }
  });
  C.cv.addEventListener('pointerdown', e => {
    const [mx, my] = C.pt(e); const hit = items.find(i => !i.gone && Math.hypot(i.x - mx, i.y - my) < Math.min(C.h * .07, 34) * 1.6);
    if (!hit) return;
    if (hit.kind === 'good') { wrong++; fx.push({ x: hit.x, y: hit.y - 30, s: 'سليمة!', c: '#e0464f', life: 1 }); A.sfx('wrong', .4); }
    else { hit.gone = true; removed++; fx.push({ x: hit.x, y: hit.y - 30, s: '+10', c: '#2fb36d', life: 1 }); A.sfx('points', .45); }
  });
  return { result, stop: () => { stop(); C.off(); } };
}

/* ================= 7. fill: stop the water exactly at the line (Naqi, Creative) ================= */
async function fill(F, A) {
  const fr = frame(F, { title: F.title, stat: '1 / 6' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'اضغط مطوّلاً لتعبئة العبوة، وارفع إصبعك عندما يصل الماء إلى <b>الخط الأحمر</b>. انتبه: الماء يستمر قليلاً بعد التوقف!'));
  const C = canvasIn(stage), btn = el('button', 'btn mg-big', '💧 اضغط مطوّلاً للتعبئة'); stage.append(btn);
  const N = 6; let i = 0, level = 0, target = rand(.6, .85), hold = false, lag = 0, scores = [], t = 0, state = 'fill', msg = '', msgT = 0, slide = 0;
  const set = on => { if (state !== 'fill') return; if (!on && hold) { lag = .14; } hold = on; };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); set(true); }); const up = () => set(false); addEventListener('pointerup', up);
  const kd = e => { if (e.code === 'Space') { e.preventDefault(); set(true); } }, ku = e => { if (e.code === 'Space') set(false); };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  let resolve; const result = new Promise(r => resolve = r);
  const judge = () => {
    state = 'judge'; const d = Math.abs(level - target), sc = level > .99 ? 0 : d < .02 ? 100 : d < .05 ? 75 : d < .1 ? 45 : 0;
    scores.push(sc); msg = sc === 100 ? 'مثالي! 🎯' : sc >= 75 ? 'ممتاز' : sc >= 45 ? 'مقبول' : level > .99 ? 'فاضت العبوة!' : 'بعيد عن الخط'; msgT = 1.3; A.sfx(sc >= 75 ? 'task_done' : sc ? 'points' : 'wrong', .55);
    setTimeout(() => { i++; if (i >= N) { cleanup(); const avg = scores.reduce((a, b) => a + b) / N; A.sfx('level_up', .6); resolve({ stars: avg >= 80 ? 3 : avg >= 55 ? 2 : avg >= 30 ? 1 : 0, score: Math.round(avg) }); return; } slide = 1; level = 0; target = rand(.55, .88); state = 'fill'; fr.setStat(`${i + 1} / ${N}`); }, 1300);
  };
  const stop = rafLoop(dt => {
    const { cx, w, h } = C; if (!w) return; t += dt; slide = Math.max(0, slide - dt * 2.5); msgT = Math.max(0, msgT - dt);
    const rate = .32 + i * .07;
    if (state === 'fill') { if (hold) level += rate * dt; else if (lag > 0) { level += rate * dt; lag -= dt; if (lag <= 0 && level > .02) judge(); } if (level >= 1) { level = 1; hold = false; judge(); } }
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e8f6fd'); g.addColorStop(1, '#bfe3f5'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    const bw = Math.min(140, w * .22), bh = Math.min(h * .62, 330), bx = w / 2 - bw / 2 - slide * w * .6, by = h * .9 - bh;
    // nozzle + stream
    cx.fillStyle = '#7d8592'; cx.fillRect(w / 2 - 40, 0, 80, by - 50); cx.fillStyle = '#5a6270'; cx.fillRect(w / 2 - 12, by - 50, 24, 26);
    if ((hold || lag > 0) && state === 'fill') { cx.fillStyle = 'rgba(80,170,230,.8)'; cx.fillRect(w / 2 - 5, by - 24, 10, bh * (1 - level) + 24); }
    // bottle
    cx.save(); rr(cx, bx, by, bw, bh, 26); cx.clip();
    cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillRect(bx, by, bw, bh);
    const ly = by + bh * (1 - level); const wg = cx.createLinearGradient(0, ly, 0, by + bh); wg.addColorStop(0, '#6ec6f2'); wg.addColorStop(1, '#2a8fd0'); cx.fillStyle = wg;
    cx.beginPath(); cx.moveTo(bx, ly); for (let x = 0; x <= bw; x += 6) cx.lineTo(bx + x, ly + Math.sin(t * 9 + x * .1) * (hold ? 3 : 1.2)); cx.lineTo(bx + bw, by + bh); cx.lineTo(bx, by + bh); cx.closePath(); cx.fill();
    cx.restore();
    cx.strokeStyle = 'rgba(30,90,140,.5)'; cx.lineWidth = 3; rr(cx, bx, by, bw, bh, 26); cx.stroke();
    cx.fillStyle = '#1aa0c8'; cx.fillRect(bx + bw * .3, by - 16, bw * .4, 16);
    const ty = by + bh * (1 - target); cx.strokeStyle = '#e0464f'; cx.lineWidth = 3; cx.setLineDash([8, 6]); cx.beginPath(); cx.moveTo(bx - 20, ty); cx.lineTo(bx + bw + 20, ty); cx.stroke(); cx.setLineDash([]);
    rr(cx, bx + 14, by + bh * .55, bw - 28, bh * .2, 8); cx.fillStyle = 'rgba(255,255,255,.85)'; cx.fill(); txt(cx, 'نقي', bx + bw / 2, by + bh * .65, 20, '#1aa0c8');
    if (msgT > 0) txt(cx, msg, w / 2, h * .12, 28, '#1b2263');
    scores.forEach((s, k) => txt(cx, s >= 75 ? '★' : s ? '☆' : '✕', 30 + k * 30, 30, 22, s >= 75 ? '#e0b21c' : s ? '#9aa3b2' : '#e0464f'));
  });
  const cleanup = () => { stop(); C.off(); removeEventListener('pointerup', up); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  return { result, stop: cleanup };
}

/* ================= 8. pattern: rebuild the gift box from memory (Tozeen, Artist) ================= */
async function pattern(F, A) {
  const fr = frame(F, { title: F.title, stat: 'الجولة 1 / 2' }), { stage } = fr;
  const brief = el('div', 'mg-brief glass', 'احفظ ترتيب الحلويات في العلبة!'); stage.append(brief);
  const SW = [['#7a4a26', 'radial-gradient(circle at 35% 30%,#a8703e,#5a3216)', 'شوكولاتة'], ['#e9c46a', 'radial-gradient(circle at 35% 30%,#f7e2a1,#c79a3a)', 'معمول'], ['#5a2d12', 'radial-gradient(circle at 35% 30%,#8a4a22,#3d160a)', 'تمر محشو'], ['#e45b8f', 'radial-gradient(circle at 35% 30%,#ffb3cf,#c33a6c)', 'كعكة']];
  const box = el('div', 'panel glass'); box.style.cssText = 'display:grid;place-items:center;gap:14px;background:linear-gradient(160deg,#fbf3e4,#efe0c4)'; stage.append(box);
  let total = 0, right = 0;
  const round = async (cols, rows, kinds) => {
    const n = cols * rows, pat = Array.from({ length: n }, () => Math.random() * kinds | 0), mine = Array(n).fill(-1);
    box.innerHTML = ''; const grid = el('div', 'grid'); grid.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`; grid.style.width = `min(${cols * 118}px,100%)`;
    const cells = pat.map((k, i) => { const c = el('div', 'cell'); c.innerHTML = `<div class="sweet" style="background:${SW[k][1]}"></div>`; grid.append(c); return c; });
    box.append(grid);
    for (let s = 4; s > 0; s--) { brief.innerHTML = `احفظ الترتيب… <b>${s}</b>`; A.sfx('ui_hover', .4); await wait(1000); }
    cells.forEach(c => c.innerHTML = ''); brief.innerHTML = 'اختر نوع الحلوى من الأسفل ثم اضغط على مكانها في العلبة.';
    const pal = el('div', 'pal'); let sel = 0;
    SW.slice(0, kinds).forEach(([c, bg, name], k) => { const b = el('button', k === 0 ? 'sel' : '', `<div class="sweet" style="background:${bg}"></div>`); b.title = name; b.onclick = () => { sel = k; [...pal.children].forEach(x => x.classList.toggle('sel', x === b)); A.sfx('ui_click', .4); }; pal.append(b); });
    cells.forEach((c, i) => c.onclick = () => { mine[i] = sel; c.innerHTML = `<div class="sweet" style="background:${SW[sel][1]}"></div>`; A.sfx('pin_drop', .4); });
    const ok = el('button', 'btn', 'تحقق من العلبة ✓'); box.append(pal, ok);
    await new Promise(r => ok.onclick = r);
    let good = 0; cells.forEach((c, i) => { const g = mine[i] === pat[i]; if (g) good++; c.classList.add(g ? 'good' : 'bad'); if (!g) c.innerHTML = `<div class="sweet" style="background:${SW[pat[i]][1]};opacity:.5"></div>`; });
    total += n; right += good; A.sfx(good === n ? 'level_up' : good > n / 2 ? 'task_done' : 'wrong', .6);
    brief.innerHTML = `أصبت ${good} من ${n}`; ok.remove(); pal.remove(); await wait(1800);
  };
  const result = (async () => { await round(3, 3, 3); fr.setStat('الجولة 2 / 2'); await round(4, 3, 4); const q = right / total; return { stars: q >= .9 ? 3 : q >= .7 ? 2 : q >= .45 ? 1 : 0, score: right }; })();
  return { result, stop: () => {} };
}

/* ================= 9. memory: match the safety equipment (Petrochemicals, Discoverer) ================= */
async function memory(F, A) {
  const fr = frame(F, { title: F.title, stat: 'محاولات: 0' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'اقلب بطاقتين في كل مرة وطابق أدوات الوقاية المتشابهة.'));
  const ITEMS = [['⛑️', 'خوذة'], ['🥽', 'نظارة واقية'], ['🧤', 'قفازات'], ['🦺', 'سترة عاكسة'], ['🧯', 'طفاية حريق'], ['🎧', 'واقي الأذن']];
  const deck = shuffle([...ITEMS, ...ITEMS].map((it, i) => ({ it, i })));
  const grid = el('div', 'grid'); grid.style.cssText = `grid-template-columns:repeat(${innerWidth < 640 ? 4 : 6},minmax(0,1fr));width:min(820px,100%);max-height:100%`;
  stage.append(grid);
  let open = [], tries = 0, found = 0, lock = false;
  const result = new Promise(res => {
    deck.forEach(d => {
      const c = el('div', 'card3', `<div class="in"><div class="f">؟</div><div class="b"><i>${d.it[0]}</i><small>${d.it[1]}</small></div></div>`);
      c.onclick = async () => {
        if (lock || c.classList.contains('flip') || c.classList.contains('done')) return;
        c.classList.add('flip'); A.sfx('ui_click', .4); open.push([c, d]);
        if (open.length === 2) {
          lock = true; tries++; fr.setStat(`محاولات: ${tries}`); const [[c1, d1], [c2, d2]] = open; open = [];
          if (d1.it === d2.it) { await wait(350); c1.classList.add('done'); c2.classList.add('done'); found++; A.sfx('task_done', .5); if (found === ITEMS.length) { A.sfx('level_up', .6); await wait(900); res({ stars: tries <= 9 ? 3 : tries <= 13 ? 2 : 1, score: tries }); } }
          else { await wait(800); c1.classList.remove('flip'); c2.classList.remove('flip'); A.sfx('wrong', .3); }
          lock = false;
        }
      };
      grid.append(c);
    });
  });
  return { result, stop: () => {} };
}

/* ================= 10. order: desalination steps in sequence (Desalination, Creative) ================= */
async function order(F, A) {
  const fr = frame(F, { title: F.title, stat: 'أخطاء: 0' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', 'اضغط على المراحل بالترتيب الصحيح، من مياه البحر حتى تصل إلى بيوت الناس.'));
  const STEPS = [['🌊', 'سحب مياه البحر'], ['🧽', 'الترشيح الأولي وإزالة الشوائب'], ['🔬', 'التناضح العكسي: فصل الأملاح'], ['🧪', 'إضافة المعادن المفيدة'], ['✅', 'فحص جودة المياه'], ['🏙️', 'ضخ المياه إلى المدن']];
  const wrap = el('div', 'panel glass'); wrap.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px;background:rgba(18,30,80,.55);color:#fff;flex:1;min-height:0;overflow:auto';
  const slots = el('div', 'grid'), pool = el('div', 'grid'); wrap.append(slots, pool); stage.append(wrap);
  const slotEls = STEPS.map((s, i) => { const d = el('div', 'slot', `<em>${i + 1}</em><span>…</span>`); slots.append(d); return d; });
  let next = 0, mistakes = 0;
  const result = new Promise(res => {
    shuffle(STEPS.map((s, i) => ({ s, i }))).forEach(({ s, i }) => {
      const b = el('button', 'opt step', `<i>${s[0]}</i><span>${s[1]}</span>`);
      b.onclick = async () => {
        if (i === next) { slotEls[i].classList.add('ok'); slotEls[i].innerHTML = `<em>${i + 1}</em><span>${s[0]} ${s[1]}</span>`; b.remove(); next++; A.sfx('task_done', .45); if (next === STEPS.length) { A.sfx('level_up', .6); await wait(1100); res({ stars: mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1, score: mistakes }); } }
        else { mistakes++; fr.setStat(`أخطاء: ${mistakes}`); b.classList.add('bad', 'shake'); A.sfx('wrong', .4); setTimeout(() => b.classList.remove('bad', 'shake'), 450); }
      };
      pool.append(b);
    });
  });
  return { result, stop: () => {} };
}

/* ================= 11. quiz: the ambassador's challenge (Port, Ambassador) ================= */
async function quiz(F, A) {
  const fr = frame(F, { title: F.title, stat: '1 / 6' }), { stage } = fr;
  const Q = shuffle([
    ['كم عدد مسارات هاكثون صناعيو المستقبل؟', ['4 مسارات', 'مساران', '6 مسارات', '10 مسارات'], 0],
    ['أي مسار يبحث عن حلول لتحديات المصنع؟', ['المكتشف', 'الفنان', 'السفير', 'المبدع'], 0],
    ['أي مسار يحوّل مخلفات المصانع إلى أعمال فنية؟', ['الفنان', 'المكتشف', 'السفير', 'المبدع'], 0],
    ['أي مسار يصنع محتوى تسويقياً عن المصنع ومنتجاته؟', ['السفير', 'المبدع', 'المكتشف', 'الفنان'], 0],
    ['ما وظيفة الرافعة الجسرية في الميناء؟', ['تحميل الحاويات وتنزيلها', 'تحلية المياه', 'توليد الكهرباء', 'إطفاء الحرائق'], 0],
    ['لماذا نرتدي الخوذة داخل المصنع؟', ['لحماية الرأس من الإصابات', 'لأنها جزء من الزي فقط', 'لتدفئة الرأس', 'للزينة'], 0],
    ['إلى كم تصل جوائز هاكثون صناعيو المستقبل؟', ['200,000 ريال', '5,000 ريال', '500 ريال', '20,000,000 ريال'], 0],
    ['أي من هذه منتجات صناعة البتروكيماويات؟', ['البلاستيك', 'التمر', 'الحليب', 'القمح'], 0]
  ]).slice(0, 6);
  const timer = el('div', 'qtimer', '<i></i>'), qq = el('div', 'qq'), opts = el('div', 'grid'); opts.style.cssText = 'grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));width:min(760px,100%)';
  stage.append(timer, qq, opts);
  let score = 0, stopT = null;
  const ask = ([q, a, ci], k) => new Promise(res => {
    fr.setStat(`${k + 1} / ${Q.length}`); qq.textContent = q; opts.innerHTML = '';
    const order2 = shuffle(a.map((t, i) => ({ t, i }))), btns = [];
    let done = false; const t0 = performance.now(), D = 15000; const bar = timer.firstChild;
    const finish = (pick) => { if (done) return; done = true; stopT(); btns.forEach(b => { if (b._i === ci) b.classList.add('good'); else if (b._i === pick) b.classList.add('bad'); }); if (pick === ci) { score++; A.sfx('task_done', .5); } else A.sfx('wrong', .4); setTimeout(res, 1200); };
    order2.forEach(({ t, i }) => { const b = el('button', 'opt', t); b._i = i; b.onclick = () => finish(i); btns.push(b); opts.append(b); });
    stopT = rafLoop(() => { const k2 = 1 - (performance.now() - t0) / D; bar.style.width = Math.max(0, k2 * 100) + '%'; if (k2 <= 0) finish(-1); });
  });
  const result = (async () => { for (let k = 0; k < Q.length; k++) await ask(Q[k], k); A.sfx(score >= 4 ? 'level_up' : 'points', .6); return { stars: score >= 6 ? 3 : score >= 5 ? 2 : score >= 3 ? 1 : 0, score }; })();
  return { result, stop: () => stopT?.() };
}

const GAMES = { photo, circuit, pressure, design, crane, sort, fill, pattern, memory, order, quiz };

/* Run one mini-game. Resolves { stars, score } or { exit: true } if the player leaves. */
export async function runMiniGame(F, A) {
  const g = await GAMES[F.game](F, A);
  const root = $('#mg');
  const exit = new Promise(res => { $('.mg-top .x', root).onclick = () => { A.sfx('panel_close'); g.stop?.(); res({ exit: true }); }; });
  const out = await Promise.race([g.result, exit]);
  root.classList.remove('on'); root.innerHTML = '';
  return out;
}

/* Eleven factory mini-games, each with its own mechanic. They run in an overlay above the factory
   hall and resolve with { stars: 0..3, score }. stars 0 means the player may retry. */
import { TRACKS } from './regions.js';
import { EN, tx } from './i18n.js';

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
let curTrack = 'discoverer';
function frame(F, { title, stat = '' }) {
  css();
  let root = $('#mg'); if (!root) { root = el('section', 'screen'); root.id = 'mg'; document.body.append(root); }
  root.innerHTML = ''; root.classList.add('on');
  const T = TRACKS[curTrack];
  const top = el('div', 'mg-top glass', `<span class="chip" style="background:${T.color}">${tx(`مسار ${T.name}`, `Track: ${T.name}`)}</span><b>${title}</b><span class="stat">${stat}</span><button class="x" type="button" aria-label="${tx('خروج', 'Exit')}">✕</button>`);
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
function txt(cx, s, x, y, size, color = '#fff', weight = 700, align = 'center') { cx.font = `${weight} ${size}px ${FONT}`; cx.fillStyle = color; cx.textAlign = align; cx.direction = EN ? 'ltr' : /[\u0600-\u06FF]/.test(s) ? 'rtl' : 'ltr'; cx.textBaseline = 'middle'; cx.fillText(s, x, y); }

/* ================= 1. the bottling line and the ambassador's ad (Coca-Cola, Ambassador) =================
   Part one: bottles run under the capping head; press as each one passes under it to seal it. A
   cracked bottle must be left for the reject arm; a golden one scores double. Part two: the ad studio:
   pick the scene and the line that fit the client's brief, and the poster is shot with the student
   as the campaign's ambassador. The poster can be saved. */
const IMG = {}; const img = src => IMG[src] ||= new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
function drawBottle(cx, x, base, s, { cap = false, gold = false, crack = false, t = 0, glint = 0, level = 1 } = {}) {
  const h = 150 * s, w = 46 * s;
  cx.save(); cx.translate(x, base);
  if (gold) { const gg = cx.createRadialGradient(0, -h * .5, 4, 0, -h * .5, h * .9); gg.addColorStop(0, 'rgba(255,214,90,.55)'); gg.addColorStop(1, 'rgba(255,214,90,0)'); cx.fillStyle = gg; cx.beginPath(); cx.arc(0, -h * .5, h * .9, 0, 7); cx.fill(); }
  const body = () => { cx.beginPath(); cx.moveTo(-w * .42, 0); cx.quadraticCurveTo(-w * .5, -h * .04, -w * .5, -h * .12); cx.lineTo(-w * .46, -h * .3); cx.quadraticCurveTo(-w * .38, -h * .38, -w * .48, -h * .48); cx.lineTo(-w * .48, -h * .58); cx.quadraticCurveTo(-w * .48, -h * .74, -w * .2, -h * .86); cx.lineTo(-w * .17, -h * .97); cx.lineTo(w * .17, -h * .97); cx.lineTo(w * .2, -h * .86); cx.quadraticCurveTo(w * .48, -h * .74, w * .48, -h * .58); cx.lineTo(w * .48, -h * .48); cx.quadraticCurveTo(w * .38, -h * .38, w * .46, -h * .3); cx.lineTo(w * .5, -h * .12); cx.quadraticCurveTo(w * .5, -h * .04, w * .42, 0); cx.closePath(); };
  // glass and the dark drink inside
  body(); const lg = cx.createLinearGradient(-w / 2, 0, w / 2, 0); lg.addColorStop(0, '#2a0b05'); lg.addColorStop(.35, '#5a1a0c'); lg.addColorStop(.65, '#3a0f07'); lg.addColorStop(1, '#1c0703'); cx.fillStyle = lg; cx.fill();
  if (level < 1) { cx.save(); body(); cx.clip(); cx.fillStyle = 'rgba(228,236,248,.92)'; cx.fillRect(-w, -h * 1.02, w * 2, h * (1.02 - level)); cx.fillStyle = 'rgba(90,26,12,.9)'; cx.fillRect(-w, -h * level - 1.5 * s, w * 2, 3 * s); cx.restore(); }
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
  } else if (kind === 'heat') {
    // a city under the midday sun: shimmering air, pale towers
    let g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffb347'); g.addColorStop(.5, '#ffe2a8'); g.addColorStop(1, '#f2c27a'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    const sg = cx.createRadialGradient(w * .5, h * .16, 4, w * .5, h * .16, h * .4); sg.addColorStop(0, 'rgba(255,255,240,1)'); sg.addColorStop(.2, 'rgba(255,240,170,.9)'); sg.addColorStop(1, 'rgba(255,240,170,0)'); cx.fillStyle = sg; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#d9b48a'; for (let i = 0; i < 9; i++) { const bw = w * (.06 + (i % 3) * .02), bh = h * (.18 + ((i * 37) % 10) / 30); cx.fillRect(w * (i * .115), h * .78 - bh, bw, bh); }
    cx.fillStyle = '#e7c48e'; cx.fillRect(0, h * .78, w, h * .22);
    cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = Math.max(1, w / 300); for (let i = 0; i < 6; i++) { cx.beginPath(); const y = h * (.5 + i * .04); for (let x = 0; x <= w; x += 10) cx.lineTo(x, y + Math.sin(x * .05 + i + t) * h * .006); cx.stroke(); }
  } else if (kind === 'snow') {
    let g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9fc4e8'); g.addColorStop(1, '#e8f2fb'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#6f86a6'; cx.beginPath(); cx.moveTo(0, h * .7); cx.lineTo(w * .25, h * .3); cx.lineTo(w * .45, h * .6); cx.lineTo(w * .7, h * .22); cx.lineTo(w, h * .65); cx.lineTo(w, h); cx.lineTo(0, h); cx.fill();
    cx.fillStyle = '#ffffff'; cx.beginPath(); cx.moveTo(w * .18, h * .4); cx.lineTo(w * .25, h * .3); cx.lineTo(w * .32, h * .42); cx.fill(); cx.beginPath(); cx.moveTo(w * .62, h * .33); cx.lineTo(w * .7, h * .22); cx.lineTo(w * .78, h * .35); cx.fill();
    cx.fillStyle = '#f4f8fc'; cx.fillRect(0, h * .82, w, h * .18); for (let i = 0; i < 60; i++) { cx.beginPath(); cx.arc((i * 131) % w, (i * 71) % h, Math.max(1, w / 260), 0, 7); cx.fill(); }
  } else if (kind === 'ramadan') {
    let g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#141a4a'); g.addColorStop(1, '#3a2a5a'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#f6e7b8'; cx.beginPath(); cx.arc(w * .78, h * .18, h * .08, 0, 7); cx.fill(); cx.fillStyle = '#141a4a'; cx.beginPath(); cx.arc(w * .78 + h * .035, h * .165, h * .075, 0, 7); cx.fill();
    // lanterns on strings
    cx.strokeStyle = 'rgba(246,231,184,.6)'; cx.lineWidth = Math.max(1, w / 400); cx.beginPath(); cx.moveTo(0, h * .08); cx.quadraticCurveTo(w * .5, h * .22, w, h * .06); cx.stroke();
    for (let i = 1; i < 6; i++) { const x = w * i / 6, y = h * .08 + Math.sin(i / 6 * Math.PI) * h * .13; const lg = cx.createRadialGradient(x, y + h * .06, 2, x, y + h * .06, h * .09); lg.addColorStop(0, 'rgba(255,200,90,.9)'); lg.addColorStop(1, 'rgba(255,200,90,0)'); cx.fillStyle = lg; cx.beginPath(); cx.arc(x, y + h * .06, h * .09, 0, 7); cx.fill(); cx.fillStyle = '#e0a21c'; cx.beginPath(); cx.roundRect(x - w * .012, y + h * .03, w * .024, h * .06, 3); cx.fill(); }
    // the iftar table
    cx.fillStyle = '#7a4a26'; cx.fillRect(0, h * .74, w, h * .26); cx.fillStyle = '#f2e6cc'; cx.fillRect(0, h * .72, w, h * .05);
    cx.fillStyle = '#d9a521'; for (let i = 0; i < 4; i++) { cx.beginPath(); cx.ellipse(w * (.15 + i * .23), h * .73, w * .06, h * .015, 0, 0, 7); cx.fill(); }
  } else if (kind === 'sea') {
    let g = cx.createLinearGradient(0, 0, 0, h * .6); g.addColorStop(0, '#6fb8e8'); g.addColorStop(1, '#d6f0ff'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    // the plant on the shore
    cx.fillStyle = '#e9edf3'; cx.fillRect(w * .58, h * .38, w * .32, h * .2); cx.fillStyle = '#1f86c9'; for (let i = 0; i < 4; i++) cx.fillRect(w * (.6 + i * .075), h * .42, w * .05, h * .12); cx.fillStyle = '#c9d1dc'; cx.fillRect(w * .82, h * .22, w * .03, h * .18);
    g = cx.createLinearGradient(0, h * .56, 0, h); g.addColorStop(0, '#1a8ccf'); g.addColorStop(1, '#0e5c8f'); cx.fillStyle = g; cx.fillRect(0, h * .56, w, h * .44);
    cx.fillStyle = 'rgba(255,255,255,.6)'; for (let i = 0; i < 14; i++) cx.fillRect((i * 97 + t * 20) % w, h * (.6 + (i % 5) * .07), w * .06, Math.max(1, h / 400));
  } else {
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e9edf3'); g.addColorStop(1, '#c9d1dc'); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#b8c2cf'; for (let i = 0; i < 5; i++) cx.fillRect(w * (.08 + i * .19), h * .12, w * .14, h * .38);
    cx.fillStyle = '#8d6e52'; cx.fillRect(0, h * .74, w, h * .26); cx.fillStyle = '#7a5c43'; cx.fillRect(0, h * .74, w, 6);
  }
}
async function photo(F, A) {
  // like every mini-game: hand back { result, stop } right away so the close button works in both parts
  const fr = frame(F, { title: tx('خط التعبئة وإعلان السفير', 'Bottling line & ad'), stat: '⏱ 35' }), ctl = { stop() {} };
  return { result: photoRun(F, A, fr, ctl), stop: () => ctl.stop() };
}
async function photoRun(F, A, fr, ctl) {
  const { stage } = fr;
  stage.append(el('div', 'mg-brief glass', tx('اضغط <b>«أغلق»</b> أو المسافة عندما تكون العبوة تحت رأس الإغلاق تماماً. اترك العبوة <b>المشروخة</b> لذراع الرفض، والعبوة الذهبية نقاطها مضاعفة!', 'Press <b>Cap the bottle</b> or Space when a bottle is right under the capping head. Leave <b>cracked</b> bottles for the reject arm. Golden bottles score double!')));
  const C = canvasIn(stage), btn = el('button', 'btn mg-big', tx('⬇ أغلق العبوة', '⬇ Cap the bottle')); stage.append(btn);
  const logo = F.logo ? await img(F.logo) : null;
  const DUR = 35; let t = 0, spawn = .4, n = 0, score = 0, combo = 0, bestCombo = 0, capped = 0, missed = 0, wrongs = 0, rejected = 0, piston = 0, kick = 0, shake = 0, over = false;
  let bottles = [], fx = [], sparks = [];
  let resolve; const done = new Promise(r => resolve = r);
  const layout = () => { const { w, h } = C, s = Math.min(1.25, h / 420, w / 560), base = h * .74, capX = w * .52; return { w, h, s, base, capX, win: 46 * s * .42, rejX: capX + Math.min(w * .22, 220) }; };
  const press = () => {
    if (over || piston > 0) return; piston = .26; A.sfx('ui_click', .5);
    const L = layout(), cand = bottles.filter(b => !b.capped && !b.gone).sort((a, b) => Math.abs(a.x - L.capX) - Math.abs(b.x - L.capX))[0], d = cand ? Math.abs(cand.x - L.capX) : 1e9;
    if (!cand || d > L.win * 2.2) { combo = 0; fx.push({ x: L.capX, y: L.base - 190 * L.s, s: tx('فارغ!', 'Empty!'), c: '#ffd0d0', life: 1 }); return; }
    if (cand.crack) { wrongs++; combo = 0; score = Math.max(0, score - 50); shake = .3; cand.gone = true; fx.push({ x: cand.x, y: L.base - 180 * L.s, s: tx('مشروخة! −50', 'Cracked! −50'), c: '#ff8a8a', life: 1.2 }); A.sfx('wrong', .6); for (let k = 0; k < 18; k++) sparks.push({ x: cand.x, y: L.base - 90 * L.s, vx: rand(-160, 160), vy: rand(-260, -60), life: .8, c: '#e9f2ff' }); return; }
    const perfect = d < L.win * .45, pts = (perfect ? 100 : 50) * (cand.gold ? 2 : 1) * (1 + Math.min(4, Math.floor(combo / 4)) * .25);
    cand.capped = true; cand.glint = 1; capped++; combo++; bestCombo = Math.max(bestCombo, combo); score += Math.round(pts);
    fx.push({ x: cand.x, y: L.base - 185 * L.s, s: `${perfect ? tx('مثالي', 'Perfect') : tx('جيد', 'Good')} +${Math.round(pts)}`, c: perfect ? '#ffe28a' : '#ffffff', life: 1 });
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
      if (!b.capped && !b.crack && !b.counted && b.x > capX + L.win * 2.2) { b.counted = true; missed++; combo = 0; fx.push({ x: b.x, y: base - 180 * s, s: tx('فاتتك', 'Missed'), c: '#ffb0b0', life: .9 }); A.sfx('wrong', .25); }
      if (b.crack && !b.gone && b.x > L.rejX) { b.gone = true; rejected++; kick = .3; fx.push({ x: L.rejX, y: base - 170 * s, s: tx('رُفضت ✓', 'Rejected ✓'), c: '#b8ffd0', life: 1 }); b.fly = { vx: 60, vy: -240 }; }
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
    txt(cx, tx('رفض', 'Reject'), L.rejX - 65 * s, base - 84 * s, 12 * s, '#ffd36a', 600);
    // sparks and labels
    for (const p of sparks) { p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; cx.globalAlpha = Math.max(0, p.life); cx.fillStyle = p.c; cx.fillRect(p.x, p.y, 3, 3); } cx.globalAlpha = 1; sparks = sparks.filter(p => p.life > 0);
    for (const f of fx) { f.y -= 50 * dt; f.life -= dt; cx.globalAlpha = Math.max(0, Math.min(1, f.life * 2)); txt(cx, f.s, f.x, f.y, 20 * Math.max(.8, s), f.c); cx.globalAlpha = 1; } fx = fx.filter(f => f.life > 0);
    cx.restore();
    // score and streak
    txt(cx, score.toLocaleString('en'), w - 24, 34, 28, '#fff', 700, 'right'); txt(cx, tx('نقاط', 'points'), w - 24, 60, 13, 'rgba(255,255,255,.75)', 500, 'right');
    if (combo >= 3) txt(cx, tx(`سلسلة ×${combo}`, `Streak ×${combo}`), 24, 34, 22, '#ffe28a', 700, 'left');
    const tl = Math.max(0, left / DUR); cx.fillStyle = 'rgba(255,255,255,.2)'; rr(cx, w * .3, h - 18, w * .4, 6, 3); cx.fill(); cx.fillStyle = '#ffe28a'; rr(cx, w * .3, h - 18, w * .4 * tl, 6, 3); cx.fill();
    if (t >= DUR && !over) { over = true; resolve(); }
  });
  ctl.stop = () => { stop(); C.off(); removeEventListener('keydown', kd); };
  await done; ctl.stop = () => {}; stop(); C.off(); removeEventListener('keydown', kd); btn.remove(); C.cv.remove(); stage.querySelector('.mg-brief').remove();
  const lineQ = capped / Math.max(1, capped + missed + wrongs * 1.5);
  A.sfx('level_up', .5);
  // ---- part two: the ambassador's ad
  const fit = await adStudio(stage, F, A, { product: 'bottles', stat: tx(`خط التعبئة: ${capped} عبوة · أفضل سلسلة ×${bestCombo}`, `Line: ${capped} bottles · best streak ×${bestCombo}`),
    ask: tx('حملة <b>صيفية منعشة</b> للشباب، تُعرض على لوحات الطرق في جدة.', 'A <b>refreshing summer</b> campaign for young people, shown on billboards in Jeddah.'),
    scenes: [['beach', tx('شاطئ وقت الظهيرة', 'Midday beach'), 1], ['night', tx('صحراء في الليل', 'Desert at night'), 0], ['office', tx('مكتب رسمي', 'Formal office'), 0]],
    lines: [[tx('انتعش… الصيف أحلى معك', 'Refresh… summer is sweeter with you'), 1], [tx('جودة ثابتة منذ سنوات', 'Steady quality for years'), 0], [tx('لحظة هدوء قبل النوم', 'A calm moment before bed'), 0]] });
  const stars = Math.max(0, Math.min(3, (lineQ >= .8 ? 2 : lineQ >= .5 ? 1 : 0) + (fit === 2 ? 1 : 0)));
  return { stars, score };
}
/* the ad studio: pick the scene and the line that answer the client's brief; the poster is shot with the
   student as the campaign's ambassador and can be saved. Resolves how many of the two choices fit (0..2). */
/* the poster comes in three layouts; the student picks the one that suits the copy and the scene */
const AD_DESIGNS = [
  { name: tx('كلاسيكي', 'Classic'), hint: tx('عنوان فوق، والمنتج أمامك', 'Headline on top, product in front') },
  { name: tx('شريط الماركة', 'Brand bar'), hint: tx('شريط بلون الشركة يحمل العبارة', 'A bar in the company color holds the slogan') },
  { name: tx('أنيق', 'Elegant'), hint: tx('بطاقة بيضاء، والمنتج بالوسط', 'White card, product in the middle') }
];
/* the copy at the largest size (down to min) that fits maxW; a line still too long is cut with an ellipsis */
function fitText(px, text, maxW, size, min, weight = 700) {
  let fs = size; px.font = `${weight} ${fs}px "Readex Pro"`;
  while (px.measureText(text).width > maxW && fs > min) { fs -= 2; px.font = `${weight} ${fs}px "Readex Pro"`; }
  let t = text;
  if (px.measureText(t).width > maxW) { while (t.length > 4 && px.measureText(t + '…').width > maxW) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
  return t;
}
/* the poster at 900×1200: the scene, the product, the copy, the logo, and the ambassador's line */
/* the poster at 900×1200 in one of three layouts: the scene, the product, the copy, the logo, a campaign sticker and the ambassador */
function drawPoster(design, sc, M, copy, F, A, logo, pose) {
  const P = document.createElement('canvas'); P.width = 900; P.height = 1200; const px = P.getContext('2d');
  const brand = F.color || '#2a3590', gold = '#ffd23f', ink = '#1b2263';
  px.textAlign = 'center'; px.direction = EN ? 'ltr' : 'rtl';
  const rr = (x, y, w, h, r) => { px.beginPath(); px.roundRect(x, y, w, h, r); };
  // the logo on a white card; the company name stands in when there is no logo
  const logoAt = (cx, y, maxW, maxH) => {
    if (logo) { const lh = Math.min(maxH, maxW * logo.height / logo.width), lw = lh * logo.width / logo.height; px.fillStyle = 'rgba(255,255,255,.96)'; rr(cx - lw / 2 - 22, y, lw + 44, lh + 28, 20); px.fill(); px.drawImage(logo, cx - lw / 2, y + 14, lw, lh); return; }
    px.fillStyle = 'rgba(255,255,255,.96)'; rr(cx - 210, y, 420, 96, 20); px.fill(); px.fillStyle = brand; px.font = '800 46px "Readex Pro"'; px.fillText(F.name, cx, y + 64);
  };
  // a round gold sticker with the campaign name, turned a little
  const sticker = (cx, cy, r) => {
    if (!M.title) return;
    px.save(); px.translate(cx, cy); px.rotate(-.2);
    const g = px.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#f2b51e');
    px.shadowColor = 'rgba(0,0,0,.35)'; px.shadowBlur = 24; px.shadowOffsetY = 8;
    px.fillStyle = g; px.beginPath(); px.arc(0, 0, r, 0, 7); px.fill();
    px.shadowColor = 'transparent'; px.shadowBlur = 0; px.shadowOffsetY = 0;
    px.lineWidth = 5; px.strokeStyle = '#fff'; px.beginPath(); px.arc(0, 0, r - 10, 0, 7); px.stroke();
    px.fillStyle = ink; px.fillText(fitText(px, M.title, r * 1.6, 44, 18, 900), 0, 15);
    px.restore();
  };
  const topShade = () => { const g = px.createLinearGradient(0, 0, 0, 500); g.addColorStop(0, 'rgba(14,18,60,.82)'); g.addColorStop(1, 'rgba(14,18,60,0)'); px.fillStyle = g; px.fillRect(0, 0, 900, 500); };
  const bottomShade = () => { const g = px.createLinearGradient(0, 760, 0, 1200); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); px.fillStyle = g; px.fillRect(0, 0, 900, 1200); };
  // a soft light behind the product so it stands out from the scene
  const glow = (cx, cy, r) => { const g = px.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)'); px.fillStyle = g; px.fillRect(cx - r, cy - r, 2 * r, 2 * r); };
  const pic = (ph, bottom, right) => { if (!pose) return; const pw = ph * pose.width / pose.height; px.drawImage(pose, right - pw, bottom - ph, pw, ph); };
  if (design === 0) {
    drawScene(px, 900, 1200, sc, 1.3); topShade(); bottomShade();
    glow(360, 900, 330); pic(780, 1130, 900 - 14);
    drawHero(px, M.product, 360, 1060);
    px.fillStyle = '#fff'; px.shadowColor = 'rgba(0,0,0,.5)'; px.shadowBlur = 20; px.shadowOffsetY = 4; px.fillText(fitText(px, copy, 800, 92, 40, 800), 450, 218); px.shadowBlur = 0; px.shadowOffsetY = 0;
    px.fillStyle = gold; rr(360, 246, 180, 12, 6); px.fill();
    logoAt(150, 40, 170, 90); sticker(140, 470, 92);
  } else if (design === 1) {
    drawScene(px, 900, 1200, sc, 1.3); bottomShade();
    // a slanted band in the company's colour with a gold edge; the copy sits on it
    const bg = px.createLinearGradient(0, 0, 900, 0); bg.addColorStop(0, brand); bg.addColorStop(1, '#3c58a7');
    px.fillStyle = bg; px.beginPath(); px.moveTo(0, 60); px.lineTo(900, 0); px.lineTo(900, 310); px.lineTo(0, 370); px.closePath(); px.fill();
    px.fillStyle = gold; px.beginPath(); px.moveTo(0, 370); px.lineTo(900, 310); px.lineTo(900, 324); px.lineTo(0, 384); px.closePath(); px.fill();
    glow(380, 860, 340); pic(760, 1130, 900 - 14);
    drawHero(px, M.product, 380, 1050);
    px.fillStyle = '#fff'; px.shadowColor = 'rgba(0,0,0,.3)'; px.shadowBlur = 12; px.shadowOffsetY = 3; px.fillText(fitText(px, copy, 800, 84, 40, 800), 450, 218); px.shadowBlur = 0; px.shadowOffsetY = 0;
    logoAt(790, 18, 150, 80); sticker(150, 520, 90);
  } else {
    // a white card on a faded scene, framed in the company's colour, the copy in that colour, the product in the middle
    drawScene(px, 900, 1200, sc, 1.3); px.fillStyle = 'rgba(255,255,255,.82)'; px.fillRect(0, 0, 900, 1200);
    px.shadowColor = 'rgba(0,0,0,.2)'; px.shadowBlur = 40; px.shadowOffsetY = 16; px.fillStyle = '#fff'; rr(80, 90, 740, 1000, 40); px.fill(); px.shadowBlur = 0; px.shadowOffsetY = 0;
    px.strokeStyle = brand; px.lineWidth = 6; rr(110, 120, 680, 940, 30); px.stroke();
    logoAt(450, 150, 240, 120);
    px.fillStyle = brand; px.fillText(fitText(px, copy, 640, 84, 40, 800), 450, 480);
    px.fillStyle = gold; rr(400, 520, 100, 8, 4); px.fill();
    glow(450, 880, 330); drawHero(px, M.product, 450, 1000);
    sticker(730, 250, 84);
  }
  // the ambassador's name in a brand-coloured pill, cut to fit
  const cap = EN ? `Campaign ambassador: ${A.name || ''} · Future Industrialists` : `سفير الحملة: ${A.name || ''} · صناعيو المستقبل`;
  const pg = px.createLinearGradient(30, 0, 570, 0); pg.addColorStop(0, brand); pg.addColorStop(1, '#3c58a7');
  px.fillStyle = pg; rr(30, 1124, 540, 56, 28); px.fill();
  px.fillStyle = '#fff'; px.fillText(fitText(px, cap, 490, 26, 18, 700), 300, 1162);
  return P;
}
async function adStudio(stage, F, A, M) {
  const logo = F.logo ? await img(F.logo) : null;
  const pose = await img(`assets/ui/${A.char || 'boy'}_pose_cut.webp`);
  const panel = el('div', 'panel glass');
  panel.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px"><b style="font-size:18px">${tx('استوديو الإعلان', 'Ad studio')}</b><span style="font-size:13px;color:var(--muted)">${M.stat || F.name}</span></div>
    <div style="padding:10px 12px;border-radius:14px;background:#fff7e0;border:1px solid #f2d27a;font-size:14.5px;line-height:1.7;margin-bottom:12px">📋 <b>${tx('طلب العميل:', 'Client brief:')}</b> ${M.ask}</div>
    <div style="font-weight:600;margin:4px 0 8px">${tx('١. اختر مكان التصوير', '1. Pick a location')}</div><div id="ad-scene" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"></div>
    <div style="font-weight:600;margin:12px 0 8px">${tx('٢. اختر عبارة الإعلان', '2. Pick a slogan')}</div><div class="mg-row" id="ad-line"></div>
    <div style="font-weight:600;margin:12px 0 8px">${tx('٣. اختر تصميم البوستر', '3. Pick a poster design')}</div><div id="ad-design" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"></div>
    <div class="mg-row" style="margin-top:14px"><button class="btn" id="ad-shoot" type="button" disabled>${tx('📸 صوّر الإعلان', '📸 Shoot the ad')}</button></div>`;
  stage.append(panel);
  const scenes = shuffle(M.scenes.slice()), lines = shuffle(M.lines.slice());
  let scene = null, line = null, design = null;
  const ready = () => { $('#ad-shoot', panel).disabled = !(scene && line && design !== null); };
  // the three layouts, redrawn with the copy and scene chosen so far (the first ones until then)
  const previews = AD_DESIGNS.map(() => { const cv = document.createElement('canvas'); cv.width = 150; cv.height = 200; return cv; });
  const paint = () => { const sc = (scene || M.scenes[0])[0], cp = (line || M.lines[0])[0]; previews.forEach((cv, i) => { cv.getContext('2d').drawImage(drawPoster(i, sc, M, cp, F, A, logo, pose), 0, 0, cv.width, cv.height); }); };
  for (const [k, name, ok] of scenes) { const b = el('button', 'opt'), cvs = document.createElement('canvas'); cvs.width = 150; cvs.height = 84; cvs.style.cssText = 'display:block;width:100%;height:auto;aspect-ratio:150/84;border-radius:10px;margin-bottom:6px'; drawScene(cvs.getContext('2d'), 150, 84, k); b.append(cvs, name); b.style.padding = '8px'; b.onclick = () => { scene = [k, ok]; A.sfx('ui_click'); panel.querySelectorAll('#ad-scene .opt').forEach(x => x.classList.toggle('sel', x === b)); paint(); ready(); }; $('#ad-scene', panel).append(b); }
  for (const [s2, ok] of lines) { const b = el('button', 'opt', s2); b.onclick = () => { line = [s2, ok]; A.sfx('ui_click'); panel.querySelectorAll('#ad-line .opt').forEach(x => x.classList.toggle('sel', x === b)); paint(); ready(); }; $('#ad-line', panel).append(b); }
  AD_DESIGNS.forEach((d, i) => { const b = el('button', 'opt'); b.style.padding = '8px'; b.append(previews[i]); b.insertAdjacentHTML('beforeend', `<b style="display:block;margin-top:2px">${d.name}</b><small style="display:block;color:var(--muted);font-size:12px;line-height:1.5">${d.hint}</small>`); b.onclick = () => { design = i; A.sfx('ui_click'); panel.querySelectorAll('#ad-design .opt').forEach(x => x.classList.toggle('sel', x === b)); ready(); }; $('#ad-design', panel).append(b); });
  paint();
  await new Promise(r => $('#ad-shoot', panel).onclick = r);
  A.sfx('panel_open', .8);
  const P = drawPoster(design, scene[0], M, line[0], F, A, logo, pose);
  const fit = scene[1] + line[1];
  panel.innerHTML = '';
  const show = el('div', '', ''); show.style.cssText = 'display:grid;gap:12px;justify-items:center';
  P.style.cssText = 'width:min(300px,62vw);height:auto;border-radius:16px;box-shadow:0 24px 50px -20px rgba(0,0,0,.6);animation:cardIn .6s cubic-bezier(.2,.8,.2,1)';
  const verdict = fit === 2 ? tx('👍 العميل: هذا بالضبط ما طلبناه!', '👍 Client: that is exactly what we asked for!') : !scene[1] ? tx('🤔 العميل: الإعلان جميل، لكن المكان لا يناسب فكرة الحملة.', '🤔 Client: nice ad, but the place does not fit the campaign idea.') : tx('🤔 العميل: المكان مناسب، لكن العبارة لا تناسب فكرة الحملة.', '🤔 Client: good place, but the slogan does not fit the campaign idea.');
  const row = el('div', 'mg-row'), save = el('button', 'btn ghost', tx('⬇ حمّل إعلانك', '⬇ Save your ad')), next = el('button', 'btn', tx('متابعة', 'Continue'));
  save.onclick = () => { const a = document.createElement('a'); a.download = 'ad-future-industrialists.png'; a.href = P.toDataURL('image/png'); a.click(); A.sfx('ui_click'); };
  row.append(save, next); show.append(P, el('div', '', `<b style="font-size:15px">${verdict}</b>`), row); panel.append(show);
  A.sfx(fit === 2 ? 'task_done' : 'points', .6);
  await new Promise(r => next.onclick = r);
  return fit;
}
/* a split air-conditioner: a white body with a gloss, a navy louvre, a blue status light and air streaming down */
function drawAC(px, x, base) {
  px.save(); px.translate(x, base - 230); px.scale(1.15, 1.15);
  const sh = px.createRadialGradient(0, 0, 10, 0, 0, 280); sh.addColorStop(0, 'rgba(10,14,50,.42)'); sh.addColorStop(1, 'rgba(10,14,50,0)');
  px.save(); px.translate(0, 152); px.scale(1, .16); px.fillStyle = sh; px.beginPath(); px.arc(0, 0, 280, 0, 7); px.fill(); px.restore();
  const body = px.createLinearGradient(0, -150, 0, 20); body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#d6dfec');
  px.fillStyle = body; px.beginPath(); px.roundRect(-230, -150, 460, 170, 42); px.fill();
  px.strokeStyle = 'rgba(31,38,102,.16)'; px.lineWidth = 2; px.stroke();
  px.fillStyle = 'rgba(255,255,255,.75)'; px.beginPath(); px.roundRect(-214, -140, 428, 24, 12); px.fill();
  px.fillStyle = '#1f5fae'; px.font = '800 36px "Readex Pro"'; px.textAlign = 'left'; px.fillText('YORK', -196, -88);
  px.fillStyle = '#4fd0ff'; px.shadowColor = '#4fd0ff'; px.shadowBlur = 16; px.beginPath(); px.arc(190, -92, 8, 0, 7); px.fill(); px.shadowBlur = 0;
  const slot = px.createLinearGradient(0, -40, 0, 0); slot.addColorStop(0, '#2b3592'); slot.addColorStop(1, '#1b2263');
  px.fillStyle = slot; px.beginPath(); px.roundRect(-200, -38, 400, 36, 16); px.fill();
  px.fillStyle = 'rgba(196,211,239,.35)'; for (let k = 0; k < 9; k++) px.fillRect(-180 + k * 44, -26, 22, 4);
  px.lineCap = 'round';
  for (let k = 0; k < 5; k++) {
    const fx = -160 + k * 80, g = px.createLinearGradient(0, 22, 0, 150);
    g.addColorStop(0, 'rgba(127,208,255,.95)'); g.addColorStop(1, 'rgba(127,208,255,0)');
    px.strokeStyle = g; px.lineWidth = 9; px.beginPath(); px.moveTo(fx, 22); px.bezierCurveTo(fx + (k % 2 ? 18 : -18), 60, fx + (k % 2 ? -18 : 18), 110, fx, 150); px.stroke();
  }
  px.restore();
}
/* the product at the front of the poster */
function drawHero(px, product, x, base) {
  if (product === 'bottles') { for (const [bx, bs] of [[x - 130, 2.3], [x, 2.7], [x + 130, 2.3]]) drawBottle(px, bx, base, bs, { cap: true, t: 2 }); px.fillStyle = 'rgba(255,255,255,.75)'; for (let k = 0; k < 26; k++) { px.beginPath(); px.arc(x - 180 + (k * 53) % 380, base - 380 + (k * 97) % 330, 3 + k % 4, 0, 7); px.fill(); } return; }
  if (product === 'ac') { drawAC(px, x, base); return; }
  if (product === 'dates') { px.save(); px.translate(x, base - 120); px.fillStyle = 'rgba(0,0,0,.25)'; px.beginPath(); px.ellipse(0, 130, 230, 26, 0, 0, 7); px.fill(); px.fillStyle = '#c9a13a'; px.beginPath(); px.roundRect(-220, -40, 440, 160, 18); px.fill(); px.fillStyle = '#f6e7b8'; px.fillRect(-220, -40, 440, 30); for (let k = 0; k < 7; k++) { px.save(); px.translate(-165 + k * 55, -50 + (k % 2) * 8); px.rotate(-.5 + (k % 3) * .3); drawDate(px, 26, 'good', k); px.restore(); } px.fillStyle = '#fff'; px.font = '700 44px "Readex Pro"'; px.textAlign = 'center'; px.direction = EN ? 'ltr' : 'rtl'; px.fillText(tx('الكريدا', 'Al Kareeda'), 0, 80); px.restore(); return; }
  if (product === 'water') { px.save(); px.translate(x, base - 230); const g = px.createLinearGradient(0, -200, 0, 200); g.addColorStop(0, '#bfe9ff'); g.addColorStop(1, '#1f86c9'); px.fillStyle = g; px.beginPath(); px.moveTo(0, -210); px.bezierCurveTo(60, -110, 170, -10, 170, 70); px.bezierCurveTo(170, 170, 90, 220, 0, 220); px.bezierCurveTo(-90, 220, -170, 170, -170, 70); px.bezierCurveTo(-170, -10, -60, -110, 0, -210); px.fill(); px.fillStyle = 'rgba(255,255,255,.55)'; px.beginPath(); px.ellipse(-70, 40, 26, 70, -.3, 0, 7); px.fill(); px.restore(); }
}

/* ================= the ad campaign on its own (York, Al Kareeda, Desalination) ================= */
async function ad(F, A, M) {
  const fr = frame(F, { title: M.title, stat: '' }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', M.brief));
  const result = (async () => { const fit = await adStudio(stage, F, A, M); return { stars: fit === 2 ? 3 : fit === 1 ? 1 : 0, score: fit }; })();
  return { result, stop: () => {} };
}

/* ================= the product's story as a comic strip (Ambassador) =================
   The scenes of the journey come shuffled: put them in order, then choose the title. The strip is
   drawn as a page the student can save, signed with their name. */
async function story(F, A, M) {
  const fr = frame(F, { title: M.title, stat: tx('أخطاء: 0', 'Mistakes: 0') }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', M.brief));
  const [tA, tB] = M.tint || ['#fff4e0', '#e08a1e'];
  const wrap = el('div', 'panel glass'); wrap.style.cssText = `display:grid;gap:12px;flex:1;min-height:0;overflow:auto;background:linear-gradient(160deg,${tA},#ffffff)`; stage.append(wrap);
  const strip = el('div', 'grid'); strip.style.gridTemplateColumns = `repeat(${innerWidth < 640 ? 3 : 6},minmax(0,1fr))`;
  const frames = M.panels.map((p, i) => { const d = el('div', '', `<span style="font-size:13px;font-weight:700;color:${tB}">${i + 1}</span>`); d.style.cssText = `aspect-ratio:3/4;border-radius:14px;border:2px dashed ${tB}88;background:#fff;display:grid;place-items:center;align-content:center;gap:4px;padding:6px;text-align:center;font-size:12.5px;font-weight:600;color:#1b2263`; strip.append(d); return d; });
  const pool = el('div', 'mg-row'); wrap.append(strip, pool);
  let next = 0, mistakes = 0;
  const result = new Promise(res => {
    shuffle(M.panels.map((p, i) => ({ p, i }))).forEach(({ p, i }) => {
      const b = el('button', 'opt step', `<i>${p[0]}</i><span>${p[1]}</span>`); b.style.maxWidth = '260px';
      b.onclick = async () => {
        if (i !== next) { mistakes++; fr.setStat(tx(`أخطاء: ${mistakes}`, `Mistakes: ${mistakes}`)); b.classList.add('bad', 'shake'); A.sfx('wrong', .4); setTimeout(() => b.classList.remove('bad', 'shake'), 450); return; }
        const f = frames[i]; f.style.border = `2px solid ${tB}`; f.style.background = `linear-gradient(180deg,#fff,${tA})`; f.innerHTML = `<span style="font-size:clamp(30px,5vw,46px);line-height:1">${p[0]}</span><span>${p[1]}</span>`; f.animate([{ transform: 'scale(.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 300, easing: 'ease-out' });
        b.remove(); next++; A.sfx('task_done', .45);
        if (next < M.panels.length) return;
        // all in order: now the title
        await wait(500); pool.innerHTML = `<div style="width:100%;text-align:center;font-weight:700;color:#1b2263;margin-bottom:4px">${tx('اختر عنواناً لقصتك المصوّرة', 'Pick a title for your comic')}</div>`;
        let cap = null; await new Promise(r => shuffle(M.captions.slice()).forEach(c => { const o = el('button', 'opt', c[0]); o.onclick = () => { cap = c; A.sfx('ui_click'); r(); }; pool.append(o); }));
        // the page
        const P = document.createElement('canvas'); P.width = 1200; P.height = 900; const px = P.getContext('2d');
        px.fillStyle = tA; px.fillRect(0, 0, 1200, 900); px.fillStyle = tB; px.fillRect(0, 0, 1200, 120);
        px.fillStyle = '#fff'; px.textAlign = 'center'; px.direction = EN ? 'ltr' : 'rtl'; px.font = '700 52px "Readex Pro"'; px.fillText(cap[0], 600, 80);
        M.panels.forEach((p, k) => { const c = k % 3, r = Math.floor(k / 3), x = 1200 - 60 - (c + 1) * 360 + 10, y = 160 + r * 350; px.fillStyle = '#fff'; px.beginPath(); px.roundRect(x, y, 340, 320, 22); px.fill(); px.strokeStyle = '#1b2263'; px.lineWidth = 5; px.stroke();
          px.font = '120px serif'; px.textAlign = 'center'; px.direction = 'ltr'; px.fillText(p[0], x + 170, y + 170); px.fillStyle = '#1b2263'; px.direction = EN ? 'ltr' : 'rtl'; px.font = '600 26px "Readex Pro"'; px.fillText(p[1], x + 170, y + 270, 310); px.fillStyle = tB; px.beginPath(); px.arc(x + 300, y + 40, 22, 0, 7); px.fill(); px.fillStyle = '#fff'; px.font = '700 24px "Readex Pro"'; px.fillText(String(k + 1), x + 300, y + 49); });
        px.fillStyle = '#5a6390'; px.font = '500 24px "Readex Pro"'; px.textAlign = 'center'; px.fillText(tx(`قصة مصوّرة بقلم ${A.name || ''} · ${F.name} · صناعيو المستقبل`, `Comic by ${A.name || ''} · ${F.name} · Future Industrialists`), 600, 880);
        const ok = cap[1] === 1, stars = (mistakes <= 1 ? 2 : mistakes <= 3 ? 1 : 0) + (ok ? 1 : 0);
        wrap.innerHTML = ''; const show = el('div'); show.style.cssText = 'display:grid;gap:12px;justify-items:center';
        P.style.cssText = 'width:min(520px,92%);height:auto;border-radius:16px;box-shadow:0 24px 50px -20px rgba(0,0,0,.5)';
        const row = el('div', 'mg-row'), save = el('button', 'btn ghost', tx('⬇ حمّل قصتك', '⬇ Save your comic')), go = el('button', 'btn', tx('متابعة', 'Continue'));
        save.onclick = () => { const a = document.createElement('a'); a.download = 'story-future-industrialists.png'; a.href = P.toDataURL('image/png'); a.click(); A.sfx('ui_click'); };
        row.append(save, go); show.append(P, el('div', '', `<b style="font-size:15px">${ok ? tx('👍 عنوان رائع يحكي القصة كلها!', '👍 A great title for the whole story!') : tx('🤔 القصة مرتبة، لكن العنوان لا يعبّر عنها تماماً.', '🤔 The story is in order, but the title does not quite fit it.')}</b>`), row); wrap.append(show);
        A.sfx(stars >= 2 ? 'level_up' : 'points', .6);
        go.onclick = () => res({ stars, score: mistakes });
      };
      pool.append(b);
    });
  });
  return { result, stop: () => {} };
}

/* ================= 2. circuit: rotate tiles to power three satellites (KACST, Creative) ================= */
async function circuit(F, A, M) {
  const fr = frame(F, { title: M.title, stat: tx('حركات: 0', 'Moves: 0') }), { stage } = fr;
  const TG = M.targets || ['🛰️', '🛰️', '🛰️'], SRC = M.src || '⚡', BG = M.bg || ['#0b1433', '#1d2c6b'];
  stage.append(el('div', 'mg-brief glass', tx(`اضغط على أي قطعة لتدويرها. ${M.brief.replace(/^دوّر القطع /, '')} ${TG.join(' ')}`, `Tap any piece to rotate it. ${M.brief.replace(/^دوّر القطع /, '')} ${TG.join(' ')}`)));
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
    const g = cx.createLinearGradient(0, 0, w, h); g.addColorStop(0, BG[0]); g.addColorStop(1, BG[1]); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    if (M.stars) for (let i = 0; i < 40; i++) { cx.fillStyle = `rgba(255,255,255,${.3 + .3 * Math.sin(t * 2 + i)})`; cx.fillRect((i * 97) % w, (i * 53) % h, 2, 2); }
    else { cx.strokeStyle = 'rgba(255,255,255,.05)'; cx.lineWidth = 1; for (let x = 0; x < w; x += 28) { cx.beginPath(); cx.moveTo(x, 0); cx.lineTo(x, h); cx.stroke(); } for (let y = 0; y < h; y += 28) { cx.beginPath(); cx.moveTo(0, y); cx.lineTo(w, y); cx.stroke(); } }
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
    txt(cx, SRC, ox - 40, oy + src[1] * s + s / 2, 34); cx.strokeStyle = '#4fe3ff'; cx.lineWidth = 6; cx.beginPath(); cx.moveTo(ox - 18, oy + src[1] * s + s / 2); cx.lineTo(ox, oy + src[1] * s + s / 2); cx.stroke();
    targets.forEach(([x, y], i) => { const cy = oy + y * s + s / 2, lit = tOn[i]; cx.strokeStyle = lit ? '#4fe3ff' : '#55608a'; cx.beginPath(); cx.moveTo(ox + N * s, cy); cx.lineTo(ox + N * s + 18, cy); cx.stroke(); if (lit) { cx.fillStyle = 'rgba(79,227,255,.25)'; cx.beginPath(); cx.arc(ox + N * s + 44, cy, 30 + Math.sin(t * 5) * 4, 0, 7); cx.fill(); } txt(cx, TG[i], ox + N * s + 44, cy, 32); });
  });
  const result = new Promise(res => {
    C.cv.addEventListener('pointerdown', async e => {
      if (won) return; const [mx, my] = C.pt(e), { s, ox, oy } = layout(), x = Math.floor((mx - ox) / s), y = Math.floor((my - oy) / s);
      if (x < 0 || y < 0 || x >= N || y >= N) return;
      grid[y][x] = rot(grid[y][x]); anim[`${x},${y}`] = 1; moves++; fr.setStat(tx(`حركات: ${moves}`, `Moves: ${moves}`)); A.sfx('ui_click', .5);
      if (targetOn(powered()).every(Boolean)) { won = true; A.sfx('level_up', .6); await wait(1300); stop(); C.off(); res({ stars: moves <= minMoves + 6 ? 3 : moves <= minMoves + 16 ? 2 : 1, score: moves }); }
    });
  });
  return { result, stop: () => { stop(); C.off(); } };
}

/* what sits in the test rig: an AC unit, a satellite in its chamber, a sealed bottle, an RO membrane vessel */
function drawUnit(cx, kind, ux, uy, uw, uh, t, prog, F) {
  if (kind === 'ac') {
    rr(cx, ux, uy, uw, uh, 10); cx.fillStyle = '#fff'; cx.fill(); cx.strokeStyle = '#c9d2df'; cx.lineWidth = 2; cx.stroke();
    cx.save(); cx.translate(ux + uw * .36, uy + uh / 2); cx.rotate(t * (6 + prog * 10)); for (let i = 0; i < 4; i++) { cx.rotate(Math.PI / 2); cx.fillStyle = '#9aa3b2'; cx.beginPath(); cx.ellipse(0, -uh * .18, uh * .08, uh * .2, 0, 0, 7); cx.fill(); } cx.restore();
    txt(cx, `${(32 - prog * 14).toFixed(1)}°`, ux + uw * .78, uy + uh * .45, 24, prog > .5 ? '#3c58a7' : '#e0464f'); txt(cx, 'YORK', ux + uw * .78, uy + uh * .2, 13, '#1f5fae', 700);
  } else if (kind === 'sat') {
    rr(cx, ux - 6, uy - 6, uw + 12, uh + 12, 16); cx.fillStyle = '#121b3f'; cx.fill(); cx.strokeStyle = '#4fe3ff55'; cx.lineWidth = 2; cx.stroke();
    const mx = ux + uw / 2, my = uy + uh / 2 + Math.sin(t * 1.5) * 3;
    cx.fillStyle = '#2b5fd9'; for (const sd of [-1, 1]) { cx.fillRect(mx + sd * uw * .16 - (sd < 0 ? uw * .3 : 0), my - uh * .12, uw * .3, uh * .24); cx.strokeStyle = '#9ec3ff'; cx.lineWidth = 1; for (let k = 1; k < 4; k++) { const x = mx + sd * uw * .16 - (sd < 0 ? uw * .3 : 0) + k * uw * .075; cx.beginPath(); cx.moveTo(x, my - uh * .12); cx.lineTo(x, my + uh * .12); cx.stroke(); } }
    rr(cx, mx - uw * .14, my - uh * .22, uw * .28, uh * .44, 6); cx.fillStyle = '#d9b23a'; cx.fill(); cx.fillStyle = '#e8ecf5'; cx.beginPath(); cx.arc(mx, my - uh * .3, uw * .06, 0, 7); cx.fill();
    txt(cx, `${Math.round(-40 + prog * 60)}°C`, ux + uw / 2, uy + uh + 4 - uh * .02, 13, '#9ec3ff', 600);
  } else if (kind === 'bottle') {
    const bx = ux + uw * .35, bw = uw * .3, bh = uh * .95; cx.fillStyle = 'rgba(255,255,255,.7)'; rr(cx, bx, uy + uh * .1, bw, bh * .9, 12); cx.fill();
    cx.fillStyle = '#6ec6f2'; rr(cx, bx + 3, uy + uh * .3, bw - 6, bh * .68, 10); cx.fill(); cx.fillStyle = '#1aa0c8'; cx.fillRect(bx + bw * .25, uy, bw * .5, uh * .12);
    cx.strokeStyle = '#1aa0c8'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(bx + bw / 2, uy); cx.lineTo(bx + bw / 2, uy - 14); cx.lineTo(ux + uw, uy - 14); cx.stroke();
    for (let k = 0; k < 5; k++) { const y = uy + uh * (.9 - ((t * .4 + k / 5) % 1) * .55); cx.fillStyle = 'rgba(255,255,255,.8)'; cx.beginPath(); cx.arc(bx + bw * (.3 + (k % 3) * .2), y, 2.5, 0, 7); cx.fill(); }
  } else if (kind === 'membrane') {
    for (let k = 0; k < 3; k++) { const y = uy + k * uh * .34; rr(cx, ux, y, uw, uh * .26, uh * .13); const gg = cx.createLinearGradient(0, y, 0, y + uh * .26); gg.addColorStop(0, '#ffffff'); gg.addColorStop(1, '#c9d6e3'); cx.fillStyle = gg; cx.fill(); cx.fillStyle = '#1f86c9'; cx.fillRect(ux - 4, y + 2, 10, uh * .26 - 4); cx.fillRect(ux + uw - 6, y + 2, 10, uh * .26 - 4);
      for (let d = 0; d < 6; d++) { const x = ux + 14 + ((t * 40 * (1 + prog) + d * 30) % (uw - 28)); cx.fillStyle = 'rgba(31,134,201,.55)'; cx.beginPath(); cx.arc(x, y + uh * .13, 3, 0, 7); cx.fill(); } }
  }
}

/* ================= 3. pressure: hold to keep the gauge in the green (YORK, Discoverer) ================= */
async function pressure(F, A, M) {
  const fr = frame(F, { title: M.title, stat: '0%' }), { stage } = fr;
  const HINT = M.hint || [tx('خفّف الضغط', 'Ease off'), tx('زد الضغط', 'Push harder'), tx('ضغط مثالي ✓', 'Just right ✓')], BG = M.bg || ['#eef3fa', '#cfdbea'], ink = M.dark ? '#e8ecff' : '#1b2263', unit = M.unit || 'PSI', scale = M.scale || (v => Math.round(v * 3.5));
  stage.append(el('div', 'mg-brief glass', tx(`${M.brief} اضغط مطوّلاً ثم ارفع إصبعك لتخفّف.`, `${M.brief} Hold to press, then let go to ease off.`)));
  const C = canvasIn(stage), btn = el('button', 'btn mg-big', M.hold || tx('⬆️ اضغط مطوّلاً للضغط', '⬆️ Hold to press')); stage.append(btn);
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
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, BG[0]); g.addColorStop(1, BG[1]); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    // gauge
    const tall = h > w * 1.1, R = tall ? Math.min(w * .4, h * .34) : Math.min(w * .32, h * .62), cxp = tall ? w / 2 : w * .58, cyp = tall ? h * .9 : h * .78;
    const ang = v2 => Math.PI + v2 / 100 * Math.PI;
    cx.lineWidth = R * .14; cx.lineCap = 'butt';
    cx.strokeStyle = M.dark ? '#2a3566' : '#dfe5ee'; cx.beginPath(); cx.arc(cxp, cyp, R, Math.PI, 2 * Math.PI); cx.stroke();
    cx.strokeStyle = '#f2c230'; cx.beginPath(); cx.arc(cxp, cyp, R, ang(zone - 18), ang(zone + 18)); cx.stroke();
    cx.strokeStyle = '#2fb36d'; cx.beginPath(); cx.arc(cxp, cyp, R, ang(zone - 9), ang(zone + 9)); cx.stroke();
    cx.strokeStyle = '#e0464f'; cx.beginPath(); cx.arc(cxp, cyp, R, ang(88), ang(100)); cx.stroke();
    for (let i = 0; i <= 10; i++) { const a = ang(i * 10); cx.strokeStyle = ink; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(cxp + Math.cos(a) * R * .8, cyp + Math.sin(a) * R * .8); cx.lineTo(cxp + Math.cos(a) * R * .9, cyp + Math.sin(a) * R * .9); cx.stroke(); }
    const a = ang(p); cx.strokeStyle = ink; cx.lineWidth = 6; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(cxp, cyp); cx.lineTo(cxp + Math.cos(a) * R * .85, cyp + Math.sin(a) * R * .85); cx.stroke();
    cx.fillStyle = ink; cx.beginPath(); cx.arc(cxp, cyp, 14, 0, 7); cx.fill();
    txt(cx, `${scale(p)} ${unit}`, cxp, cyp - R * .35, Math.max(18, R * .14), ink);
    txt(cx, inZone ? HINT[2] : p > zone ? HINT[0] : HINT[1], cxp, cyp - R * .58, 16, inZone ? '#2fb36d' : '#e0464f', 600);
    // the thing under test
    const uw = tall ? Math.min(w * .5, 170) : Math.min(w * .2, 170), uh = uw * .75, ux = tall ? w / 2 - uw / 2 : w * .14, uy = tall ? h * .07 : h * .3;
    drawUnit(cx, M.thing || 'ac', ux, uy, uw, uh, t, prog, F);
    rr(cx, ux, uy + uh + 16, uw, 12, 6); cx.fillStyle = M.dark ? '#2a3566' : '#dfe5ee'; cx.fill(); rr(cx, ux, uy + uh + 16, uw * prog, 12, 6); cx.fillStyle = '#2fb36d'; cx.fill();
    txt(cx, tx(`${Math.round(t)} ث`, `${Math.round(t)} s`), ux + uw / 2, uy + uh + 46, 15, M.dark ? '#aab3e0' : '#5a6390', 600);
    if (p >= 99.5) { v = -60; A.sfx('wrong', .4); }
    if (prog >= 1) { done = true; A.sfx('level_up', .6); setTimeout(() => { cleanup(); resolve({ stars: t <= 16 ? 3 : t <= 26 ? 2 : 1, score: Math.round(t) }); }, 900); }
    if (t > 45 && !done) { done = true; cleanup(); resolve({ stars: 0, score: 0 }); }
  });
  const cleanup = () => { stop(); C.off(); removeEventListener('pointerup', up); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  return { result, stop: cleanup };
}

/* ================= 4. design: build the pack the client asked for (Artist) =================
   The same studio for juice cartons, milk, boxes of dates and shipping containers: pick the options
   that answer the brief, the preview updates live, and a jury reads out what fits and what does not. */
const PACK_COL = {
  blue: ['#2f6fd0', '#cfe0fb'], pink: ['#e45b8f', '#fbd8e6'], brown: ['#7a4a26', '#ecd9c6'], yellow: ['#e0b21c', '#fbefc4'], orange: ['#f08a1c', '#ffe2bf'],
  red: ['#d7262f', '#fbd1d3'], green: ['#2f9a4a', '#d4f0da'], gold: ['#c9a13a', '#f6e7b8'], white: ['#c9cfd8', '#ffffff']
};
const FLAVOR_ICON = { plain: '🥛', strawberry: '🍓', choco: '🍫', banana: '🍌', orange: '🍊', apple: '🍏', mango: '🥭', berry: '🍓', almond: '🌰' };
function drawPack(cx, w, h, S, M) {
  const [c1, c2] = PACK_COL[S.color] || PACK_COL.blue, big = S.size === 'big';
  cx.clearRect(0, 0, w, h); cx.save(); cx.translate(w / 2, h * .58);
  const emoji = (e, x, y, sz) => { cx.font = `${sz}px serif`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(e, x, y); };
  if (M.product === 'container') {
    const sc = Math.min(w, h) / 300, L = (S.shape === '40' ? 230 : 130) * sc, H = 92 * sc, x0 = -L / 2, y0 = -H / 2;
    cx.fillStyle = 'rgba(0,0,0,.14)'; cx.beginPath(); cx.ellipse(0, H / 2 + 10 * sc, L * .55, 10 * sc, 0, 0, 7); cx.fill();
    cx.fillStyle = c1; cx.fillRect(x0, y0, L, H);
    cx.strokeStyle = 'rgba(0,0,0,.18)'; cx.lineWidth = 2; for (let x = x0 + 8 * sc; x < x0 + L; x += 9 * sc) { cx.beginPath(); cx.moveTo(x, y0 + 4); cx.lineTo(x, y0 + H - 4); cx.stroke(); }
    if (S.flavor === 'stripe') { cx.fillStyle = c2; cx.fillRect(x0, -H * .12, L, H * .24); }
    if (S.flavor === 'wave') { cx.fillStyle = c2; cx.beginPath(); cx.moveTo(x0, H * .1); for (let x = 0; x <= L; x += 4) cx.lineTo(x0 + x, H * .1 + Math.sin(x / L * Math.PI * 4) * H * .12); cx.lineTo(x0 + L, y0 + H); cx.lineTo(x0, y0 + H); cx.fill(); }
    if (S.flavor === 'palm') emoji('🌴', x0 + L * .78, 0, H * .62);
    cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.lineWidth = 3; cx.strokeRect(x0, y0, L, H);
    const lw = S.size === 'big' ? L * .42 : L * .2; cx.fillStyle = 'rgba(255,255,255,.92)'; rr(cx, x0 + L * .08, -lw * .18, lw, lw * .36, 6); cx.fill(); txt(cx, M.brand, x0 + L * .08 + lw / 2, 0, lw * .16, '#1b2263');
    cx.restore(); return;
  }
  const sc = (big ? 1 : .72) * Math.min(w, h) / 300; cx.scale(sc, sc);
  cx.fillStyle = 'rgba(0,0,0,.12)'; cx.beginPath(); cx.ellipse(0, 112, 80, 14, 0, 0, 7); cx.fill();
  if (M.product === 'dates') {
    if (S.shape === 'box') { cx.fillStyle = c1; cx.fillRect(-90, -40, 180, 150); cx.fillStyle = c2; cx.fillRect(-90, -40, 180, 26); cx.strokeStyle = 'rgba(0,0,0,.2)'; cx.lineWidth = 3; cx.strokeRect(-90, -40, 180, 150); }
    else if (S.shape === 'tin') { cx.fillStyle = c1; cx.beginPath(); cx.ellipse(0, 100, 95, 22, 0, 0, 7); cx.fill(); cx.fillRect(-95, -20, 190, 120); cx.fillStyle = c2; cx.beginPath(); cx.ellipse(0, -20, 95, 22, 0, 0, 7); cx.fill(); }
    else { cx.fillStyle = c1; cx.beginPath(); cx.ellipse(0, 60, 120, 48, 0, 0, 7); cx.fill(); cx.fillStyle = c2; cx.beginPath(); cx.ellipse(0, 52, 104, 36, 0, 0, 7); cx.fill(); }
    // dates inside or on top
    const n = S.shape === 'tray' ? 9 : 5; for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * (S.shape === 'tray' ? 22 : 30), y = S.shape === 'tray' ? 44 + (k % 2) * 12 : S.shape === 'tin' ? -26 : -30; cx.save(); cx.translate(x, y); cx.rotate(-.4 + (k % 3) * .3); drawDate(cx, 10, 'good', k); if (S.flavor === 'almond') { cx.fillStyle = '#f2dcb0'; cx.beginPath(); cx.ellipse(0, -4, 6, 3, 0, 0, 7); cx.fill(); } if (S.flavor === 'choco') { cx.fillStyle = '#5a3216'; cx.beginPath(); cx.ellipse(2, 0, 13, 8, 0, 0, 7); cx.fill(); } cx.restore(); }
    txt(cx, M.brand, 0, S.shape === 'tray' ? 120 : 50, 24, S.color === 'white' ? '#7a5a2a' : '#fff'); txt(cx, big ? tx('1 كغ', '1 kg') : tx('250 غ', '250 g'), 0, S.shape === 'tray' ? 146 : 82, 14, S.color === 'white' ? '#7a5a2a' : '#fff', 600);
    cx.restore(); return;
  }
  // drinks: juice and milk
  if (S.shape === 'carton') { cx.fillStyle = '#fff'; cx.fillRect(-60, -80, 120, 190); cx.fillStyle = c1; cx.fillRect(-60, 30, 120, 80); cx.fillStyle = '#f2f2f2'; cx.beginPath(); cx.moveTo(-60, -80); cx.lineTo(0, -130); cx.lineTo(60, -80); cx.fill(); cx.fillStyle = c2; cx.fillRect(-6, -140, 12, 14); }
  else if (S.shape === 'bottle') { cx.fillStyle = c2; cx.beginPath(); cx.moveTo(-50, 110); cx.lineTo(-50, -40); cx.quadraticCurveTo(-50, -80, -22, -100); cx.lineTo(-22, -130); cx.lineTo(22, -130); cx.lineTo(22, -100); cx.quadraticCurveTo(50, -80, 50, -40); cx.lineTo(50, 110); cx.closePath(); cx.fill(); cx.fillStyle = c1; cx.fillRect(-26, -150, 52, 22); cx.fillStyle = '#fff'; cx.fillRect(-50, -10, 100, 80); }
  else { cx.fillStyle = c1; cx.beginPath(); cx.moveTo(-70, 110); cx.quadraticCurveTo(-80, 0, -60, -100); cx.lineTo(60, -100); cx.quadraticCurveTo(80, 0, 70, 110); cx.closePath(); cx.fill(); cx.fillStyle = '#fff'; cx.fillRect(14, -125, 16, 30); cx.fillStyle = c2; rr(cx, -50, -30, 100, 90, 14); cx.fill(); }
  emoji(FLAVOR_ICON[S.flavor] || '🥛', 0, S.shape === 'carton' ? -20 : 25, 52);
  txt(cx, M.brand, 0, S.shape === 'carton' ? 55 : S.shape === 'bottle' ? 58 : 80, 20, S.shape === 'carton' ? '#fff' : '#1b2263');
  txt(cx, big ? tx('1 لتر', '1 L') : tx('200 مل', '200 ml'), 0, S.shape === 'carton' ? 88 : 98, 13, S.shape === 'carton' ? '#fff' : '#5a6390', 600);
  cx.restore();
}
async function design(F, A, M) {
  const fr = frame(F, { title: M.title, stat: '' }), { stage } = fr;
  const B = M.briefs[Math.random() * M.briefs.length | 0];
  stage.append(el('div', 'mg-brief glass', tx(`📋 طلب العميل: ${B.text}`, `📋 Client brief: ${B.text}`)));
  const wrap = el('div', 'panel glass'); wrap.style.cssText = 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:16px;align-items:center;flex:1;min-height:0;overflow:auto';
  const pv = el('canvas'); pv.style.cssText = 'width:100%;height:100%;min-height:220px;border-radius:16px;background:radial-gradient(circle at 50% 40%,#fff,#e8eef8)';
  const opts = el('div'); opts.style.cssText = 'display:grid;gap:10px';
  wrap.append(pv, opts); stage.append(wrap);
  if (innerWidth < 640) wrap.style.gridTemplateColumns = '1fr';
  const S = Object.fromEntries(M.groups.map(([k, , list]) => [k, list[0][0]]));
  for (const [k, label, list] of M.groups) { const row = el('div'); row.innerHTML = `<small style="color:var(--muted);font-weight:600">${label}</small>`; const r = el('div', 'mg-row'); r.style.justifyContent = 'flex-start'; r.style.marginTop = '6px'; list.forEach(([v, l]) => { const b = el('button', 'opt' + (S[k] === v ? ' sel' : ''), l); b.onclick = () => { S[k] = v; [...r.children].forEach(c => c.classList.toggle('sel', c === b)); A.sfx('ui_click', .5); draw(); }; r.append(b); }); row.append(r); opts.append(row); }
  const go = el('button', 'btn', tx('اعرض التصميم على لجنة التحكيم ✨', 'Show the judges ✨')); go.style.cssText = 'position:sticky;bottom:0;z-index:2;box-shadow:0 -10px 24px -10px rgba(255,255,255,.9),0 12px 26px -10px rgba(42,53,144,.8)'; opts.append(go);
  opts.querySelectorAll('.mg-row').forEach(r => { r.style.gap = '6px'; }); opts.style.gap = '6px';
  function draw() { const r = pv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); pv.width = r.width * d; pv.height = r.height * d; const cx = pv.getContext('2d'); cx.setTransform(d, 0, 0, d, 0, 0); drawPack(cx, r.width, r.height, S, M); }
  requestAnimationFrame(draw); addEventListener('resize', draw);
  const result = new Promise(res => {
    go.onclick = async () => {
      removeEventListener('resize', draw); A.sfx('panel_open');
      // what the brief asks for is judged; a colour that suits the flavour also counts when the brief names no colour
      const names = Object.fromEntries(M.groups.map(([k, l]) => [k, l])), keys = M.groups.map(([k]) => k).filter(k => k in B.ans || (k === 'color' && M.match[B.ans.flavor]));
      let ok = 0;
      const lines = keys.map(k => { const want = k in B.ans ? B.ans[k] : M.match[B.ans.flavor], good = S[k] === want || (k === 'color' && !('color' in B.ans) && M.match[S.flavor] === S.color && S.flavor === B.ans.flavor); if (good) ok++; return `<div class="judge"><i>${good ? '👍' : '🤔'}</i><span><b>${names[k]}:</b> ${good ? tx('مناسب تماماً لطلب العميل', 'Matches the client brief') : tx('يحتاج مراجعة حتى يناسب طلب العميل', 'Needs another look to match the brief')}</span></div>`; });
      const q = ok / keys.length, stars = q === 1 ? 3 : q >= .7 ? 2 : q >= .45 ? 1 : 0;
      const snap = pv.toDataURL('image/png');
      wrap.innerHTML = `<div style="grid-column:1/-1;display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:14px;align-items:center"><img src="${snap}" alt="" style="width:100%;border-radius:14px;background:#fff"><div><b style="font-size:18px">${tx('رأي لجنة التحكيم', 'The judges say')}</b><div style="margin-top:8px">${lines.join('')}</div><div style="margin-top:10px;font-size:22px;text-align:center">${stars ? '⭐'.repeat(stars) : tx('حاول مرة أخرى', 'Try again')}</div></div></div>`;
      A.sfx(stars >= 2 ? 'level_up' : 'points', .6); await wait(2800); res({ stars, score: ok });
    };
  });
  return { result, stop: () => removeEventListener('resize', draw) };
}

/* ================= 5. crane: stack steel beams into a sculpture (Al Yamamah, Artist) ================= */
/* one piece of the sculpture: a steel bar, a rocket stage, a shrink-wrapped pack of bottles, a membrane tube */
function drawBlock(cx, kind, x, y, w, h, i = 1) {
  if (kind === 'rocket') { const g = cx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9d1de'); cx.fillStyle = g; rr(cx, x, y, w, h - 2, 6); cx.fill(); cx.fillStyle = i % 3 === 0 ? '#e0464f' : '#2a3590'; cx.fillRect(x, y + h * .35, w, h * .22); cx.fillStyle = 'rgba(0,0,0,.15)'; for (let k = x + 14; k < x + w - 6; k += 22) cx.fillRect(k, y + 3, 2, h - 8); return; }
  if (kind === 'pack') { cx.fillStyle = 'rgba(160,215,240,.95)'; rr(cx, x, y, w, h - 2, 6); cx.fill(); cx.fillStyle = 'rgba(255,255,255,.55)'; for (let k = x + 6; k < x + w - 10; k += 16) { rr(cx, k, y + 3, 10, h - 8, 4); cx.fill(); } cx.fillStyle = '#1aa0c8'; cx.fillRect(x, y + h * .45, w, 4); return; }
  if (kind === 'tube') { const g = cx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, '#dfe7ef'); g.addColorStop(1, '#a9b8c8'); cx.fillStyle = g; rr(cx, x, y, w, h - 2, (h - 2) / 2); cx.fill(); cx.fillStyle = '#1f86c9'; rr(cx, x, y, Math.min(14, w / 4), h - 2, 4); cx.fill(); rr(cx, x + w - Math.min(14, w / 4), y, Math.min(14, w / 4), h - 2, 4); cx.fill(); return; }
  const gg = cx.createLinearGradient(0, y, 0, y + h); gg.addColorStop(0, '#9aa3b0'); gg.addColorStop(.5, '#5d6573'); gg.addColorStop(1, '#3d434d'); cx.fillStyle = gg; cx.fillRect(x, y, w, h - 2); cx.fillStyle = 'rgba(255,255,255,.25)'; cx.fillRect(x, y, w, 3);
}
async function crane(F, A, M) {
  const fr = frame(F, { title: M.title, stat: '0 / 8' }), { stage } = fr, KIND = M.block || 'steel', BGc = M.bg || ['#2b3445', '#5a6272'];
  stage.append(el('div', 'mg-brief glass', tx(`${M.brief} اضغط على الشاشة لإفلات القطعة المتأرجحة، والجزء الزائد يُقص!`, `${M.brief} Tap the screen to drop the swinging piece. Any extra part is cut off!`)));
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
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, BGc[0]); g.addColorStop(1, BGc[1]); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.save(); cx.translate(0, camY);
    cx.fillStyle = '#3a3f48'; cx.fillRect(0, groundY, w, 400);
    tower.forEach((b, i) => { const y = groundY - (i + 1) * BH; if (i === 0) { cx.fillStyle = '#2f3540'; cx.fillRect(b.x, y, b.w, BH - 2); } else drawBlock(cx, KIND, b.x, y, b.w, BH, i); });
    for (const c of cut) { c.vy += 900 * dt; c.y += c.vy * dt; c.r += c.vr * dt; cx.save(); cx.translate(c.x + c.w / 2, c.y + BH / 2); cx.rotate(c.r); cx.globalAlpha = .8; drawBlock(cx, KIND, -c.w / 2, -BH / 2, c.w, BH); cx.globalAlpha = 1; cx.restore(); }
    cut = cut.filter(c => c.y < groundY + 300);
    const hookY = topY - BH * 4.4;
    if (cur && !falling) { const sw = Math.sin(t * (1.6 + tower.length * .12) + cur.phase); cur.x = w / 2 - cur.w / 2 + sw * Math.min(w * .32, 260); cx.strokeStyle = '#d9a21c'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(w / 2, hookY - 300); cx.lineTo(cur.x + cur.w / 2, hookY); cx.stroke(); drawBlock(cx, KIND, cur.x, hookY, cur.w, BH, tower.length); }
    if (falling) {
      falling.vy += 1400 * dt; falling.y += falling.vy * dt; drawBlock(cx, KIND, falling.x, falling.y, falling.w, BH, tower.length);
      if (falling.y >= topY - BH) {
        const top = tower[tower.length - 1], l = Math.max(falling.x, top.x), r = Math.min(falling.x + falling.w, top.x + top.w), ow = r - l;
        if (ow <= 4) { cut.push({ ...falling, y: topY - BH, vy: 0, r: 0, vr: 3 }); falling = null; over = true; A.sfx('wrong', .6); setTimeout(() => finish(), 900); }
        else {
          if (falling.x < l) cut.push({ x: falling.x, w: l - falling.x, y: topY - BH, vy: 0, r: 0, vr: -2 }); if (falling.x + falling.w > r) cut.push({ x: r, w: falling.x + falling.w - r, y: topY - BH, vy: 0, r: 0, vr: 2 });
          tower.push({ x: l, w: ow }); ratios.push(ow / falling.w); falling = null; A.sfx(KIND === 'steel' ? 'factory_metal' : 'pin_drop', .5);
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

/* a Sukkari date lying on its side: golden-amber, plump, a pale cap where it hung on the bunch,
   fine wrinkles in the skin. Damaged ones: split open to the pale flesh, grey-white mould, or shrivelled. */
function drawDate(cx, R, kind, seed = 0) {
  const L = R * 1.5, H = R * .82, dry = kind === 'dry';
  const body = () => { cx.beginPath(); cx.moveTo(-L, H * .05); cx.bezierCurveTo(-L * .95, -H * 1.15, L * .9, -H * 1.12, L * 1.02, -H * .02); cx.bezierCurveTo(L * 1.05, H * .7, L * .55, H * 1.08, 0, H * 1.02); cx.bezierCurveTo(-L * .62, H * 1.05, -L * 1.04, H * .62, -L, H * .05); cx.closePath(); };
  cx.fillStyle = 'rgba(40,25,10,.25)'; cx.beginPath(); cx.ellipse(R * .1, H * 1.05, L * .9, H * .25, 0, 0, 7); cx.fill();
  const g = cx.createLinearGradient(0, -H, 0, H);
  if (dry) { g.addColorStop(0, '#a88a64'); g.addColorStop(1, '#5b4430'); } else { g.addColorStop(0, '#dc9a52'); g.addColorStop(.5, '#a95c22'); g.addColorStop(1, '#6a3410'); }
  body(); cx.fillStyle = g; cx.fill();
  // wrinkles along the length, deeper on a shrivelled date
  cx.save(); body(); cx.clip(); cx.lineCap = 'round';
  cx.strokeStyle = dry ? 'rgba(45,28,12,.6)' : 'rgba(110,55,15,.32)'; cx.lineWidth = dry ? R * .07 : R * .045;
  for (let k = 0; k < (dry ? 7 : 4); k++) { const y = -H * .7 + k * (H * 1.4 / (dry ? 6 : 3)), w = Math.sin(seed + k * 1.7) * H * .12; cx.beginPath(); cx.moveTo(-L * .85, y + w); cx.bezierCurveTo(-L * .3, y - w * 2, L * .3, y + w * 2, L * .85, y - w); cx.stroke(); }
  // a soft matte sheen on top (dates are not glossy)
  const sh = cx.createLinearGradient(0, -H, 0, 0); sh.addColorStop(0, dry ? 'rgba(255,240,210,.12)' : 'rgba(255,236,190,.35)'); sh.addColorStop(1, 'rgba(255,236,190,0)'); cx.fillStyle = sh; cx.fillRect(-L, -H * 1.2, L * 2, H * 1.1);
  if (kind === 'crack') {
    // a long split along the skin, the pale flesh showing through
    const top = [], bot = []; for (let k = 0; k <= 8; k++) { const u = -.62 + k * .155, j = Math.sin(seed * 5 + k * 2.1) * H * .06; top.push([u * L, -H * .2 + j - Math.sin(k / 8 * Math.PI) * H * .12]); bot.push([u * L, -H * .2 + j + Math.sin(k / 8 * Math.PI) * H * .14]); }
    cx.beginPath(); top.forEach(([px, py], k) => k ? cx.lineTo(px, py) : cx.moveTo(px, py)); bot.reverse().forEach(([px, py]) => cx.lineTo(px, py)); cx.closePath();
    cx.fillStyle = '#f3d7a0'; cx.fill(); cx.strokeStyle = '#5e2c0c'; cx.lineWidth = R * .07; cx.lineJoin = 'round'; cx.stroke();
  }
  if (kind === 'mold') {
    for (const [a, b, r] of [[-.45, -.3, .42], [.25, -.05, .34], [-.05, .4, .28], [.6, .35, .22]]) { const mg = cx.createRadialGradient(a * L, b * H, 0, a * L, b * H, r * R * 1.3); mg.addColorStop(0, 'rgba(232,236,226,.95)'); mg.addColorStop(.6, 'rgba(196,206,184,.85)'); mg.addColorStop(1, 'rgba(196,206,184,0)'); cx.fillStyle = mg; cx.beginPath(); cx.arc(a * L, b * H, r * R * 1.3, 0, 7); cx.fill(); }
    cx.fillStyle = 'rgba(120,140,100,.75)'; for (let k = 0; k < 14; k++) { cx.beginPath(); cx.arc(Math.sin(seed * 3 + k * 2.3) * L * .7, Math.cos(seed * 2 + k * 1.9) * H * .6, R * .045, 0, 7); cx.fill(); }
  }
  cx.restore();
  // the cap at the stem end
  cx.fillStyle = dry ? '#c7ad7f' : '#f0d39a'; cx.beginPath(); cx.ellipse(-L * .96, 0, R * .13, R * .26, 0, 0, 7); cx.fill();
  cx.strokeStyle = 'rgba(120,80,30,.5)'; cx.lineWidth = 1.2; cx.stroke();
}

/* ================= 6. sort: quality control on the line (Discoverer) =================
   Dates, bottles, milk cartons or shipping containers pass by; tap every faulty one before it reaches
   the end of the line, and leave the good ones alone. */
function drawMilk(cx, R, kind) {
  const w = R * 1.5, h = R * 2.6;
  cx.fillStyle = 'rgba(0,0,0,.18)'; cx.beginPath(); cx.ellipse(0, h * .52, w * .7, R * .18, 0, 0, 7); cx.fill();
  cx.fillStyle = '#ffffff'; cx.beginPath(); cx.moveTo(-w / 2, h * .5); cx.lineTo(-w / 2, -h * .2); cx.lineTo(0, -h * .42); cx.lineTo(w / 2, -h * .2); cx.lineTo(w / 2, h * .5); cx.closePath(); cx.fill();
  cx.fillStyle = '#e4e9f1'; cx.fillRect(-w * .1, -h * .5, w * .2, h * .1);
  if (kind !== 'nolabel') { cx.fillStyle = '#1c4fa0'; cx.fillRect(-w / 2, h * .08, w, h * .3); cx.fillStyle = '#fff'; cx.font = `700 ${R * .36}px ${FONT}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('🥛', 0, -h * .05); txt(cx, tx('سدافكو', 'Sadafco'), 0, h * .23, R * .3, '#fff'); }
  if (kind === 'dent') { cx.fillStyle = 'rgba(40,50,80,.35)'; cx.beginPath(); cx.ellipse(w * .2, -h * .02, w * .22, h * .14, .3, 0, 7); cx.fill(); cx.strokeStyle = 'rgba(40,50,80,.55)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(w / 2, -h * .2); cx.quadraticCurveTo(w * .1, -h * .02, w / 2, h * .2); cx.stroke(); }
  if (kind === 'leak') { cx.fillStyle = '#f4f8ff'; cx.beginPath(); cx.ellipse(w * .1, h * .56, w * .7, R * .16, 0, 0, 7); cx.fill(); cx.strokeStyle = '#c9d4e6'; cx.lineWidth = 1.5; cx.stroke(); for (const dx of [-.15, .2]) { cx.fillStyle = '#ffffff'; cx.beginPath(); cx.ellipse(w * dx, h * .4, R * .08, R * .14, 0, 0, 7); cx.fill(); cx.strokeStyle = '#c9d4e6'; cx.stroke(); } }
  cx.strokeStyle = 'rgba(0,0,0,.18)'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(-w / 2, h * .5); cx.lineTo(-w / 2, -h * .2); cx.lineTo(0, -h * .42); cx.lineTo(w / 2, -h * .2); cx.lineTo(w / 2, h * .5); cx.closePath(); cx.stroke();
}
function drawBox(cx, R, kind, seed) {
  const w = R * 3.4, h = R * 1.5, col = ['#2f6fd0', '#d7262f', '#2f9a4a', '#f08a1c'][Math.floor(seed * 7) % 4];
  cx.fillStyle = 'rgba(0,0,0,.2)'; cx.fillRect(-w / 2 + 4, h / 2, w, R * .14);
  cx.fillStyle = col; cx.fillRect(-w / 2, -h / 2, w, h);
  cx.strokeStyle = 'rgba(0,0,0,.2)'; cx.lineWidth = 1.5; for (let x = -w / 2 + 6; x < w / 2; x += 7) { cx.beginPath(); cx.moveTo(x, -h / 2 + 3); cx.lineTo(x, h / 2 - 3); cx.stroke(); }
  if (kind === 'dent') { const g = cx.createRadialGradient(-w * .1, 0, 2, -w * .1, 0, h * .55); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = g; cx.beginPath(); cx.ellipse(-w * .1, 0, h * .6, h * .45, 0, 0, 7); cx.fill(); cx.strokeStyle = 'rgba(255,255,255,.5)'; cx.lineWidth = 2; cx.beginPath(); cx.arc(-w * .1, 0, h * .45, Math.PI * 1.1, Math.PI * 1.7); cx.stroke(); }
  if (kind === 'rust') { cx.fillStyle = '#8a4a1c'; for (let k = 0; k < 7; k++) { cx.beginPath(); cx.ellipse(-w * .4 + ((seed * 13 + k * .37) % 1) * w * .8, -h * .3 + ((seed * 7 + k * .61) % 1) * h * .6, R * (.18 + (k % 3) * .08), R * .12, k, 0, 7); cx.fill(); } }
  if (kind === 'open') { cx.fillStyle = '#16181c'; cx.fillRect(w / 2 - h * .9, -h / 2 + 2, h * .9, h - 4); cx.fillStyle = col; cx.beginPath(); cx.moveTo(w / 2, -h / 2); cx.lineTo(w / 2 + h * .7, -h / 2 - h * .15); cx.lineTo(w / 2 + h * .7, h / 2 + h * .15); cx.lineTo(w / 2, h / 2); cx.fill(); cx.strokeStyle = 'rgba(0,0,0,.35)'; cx.stroke(); }
  else { cx.strokeStyle = 'rgba(0,0,0,.4)'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(w / 2 - h * .45, -h / 2 + 3); cx.lineTo(w / 2 - h * .45, h / 2 - 3); cx.stroke(); }
  cx.strokeStyle = 'rgba(0,0,0,.4)'; cx.lineWidth = 2.5; cx.strokeRect(-w / 2, -h / 2, w, h);
}
async function sort(F, A, M) {
  const fr = frame(F, { title: M.title, stat: '⏱ 40' }), { stage } = fr, KIND = M.item || 'date', DEF = Object.keys(M.defects), BG = M.bg || ['#f6ead6', '#e2c9a2'];
  stage.append(el('div', 'mg-brief glass', M.brief.replace(/: اضغط/, ':<br>اضغط') + tx(' لا تضغط على السليمة!', ' Do not tap the good ones!')));
  const upright = KIND === 'bottle' || KIND === 'milk';
  const C = canvasIn(stage); let items = [], t = 0, spawnT = 0, good = 0, missed = 0, wrong = 0, removed = 0, total = 0, over = false, fx = [];
  const DUR = 40; let resolve; const result = new Promise(r => resolve = r);
  const size = () => Math.min(C.h * .07, 34);
  const stop = rafLoop(dt => {
    const { cx, w, h } = C; if (!w) return; t += dt; const left = Math.max(0, DUR - t); fr.setStat(`⏱ ${Math.ceil(left)}`);
    const speed = (KIND === 'container' ? 90 : 110) + t * 4.5;
    spawnT -= dt; if (spawnT <= 0 && t < DUR - 2) { const bad = Math.random() < .38; const kind = bad ? DEF[Math.random() * DEF.length | 0] : 'good'; items.push({ x: -60, y: upright ? h * .56 : h * rand(.42, .64), kind, seed: Math.random() * 10, r: upright || KIND === 'container' ? 0 : rand(-.3, .3), s: kind === 'dry' ? .72 : rand(.94, 1.06) }); if (bad) total++; spawnT = rand(.5, .85) * (1 - t / 120) * (KIND === 'container' ? 1.4 : 1); }
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, BG[0]); g.addColorStop(1, BG[1]); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    cx.fillStyle = '#3a3a40'; cx.fillRect(0, h * .32, w, h * .44); cx.fillStyle = '#46464e'; for (let x = (t * speed) % 40 - 40; x < w; x += 40) cx.fillRect(x, h * .32, 4, h * .44);
    // where the good ones go
    const bx = w - 120; cx.fillStyle = M.boxColor || '#7a5a2a'; rr(cx, bx, h * .28, 110, h * .52, 14); cx.fill(); cx.fillStyle = 'rgba(0,0,0,.25)'; rr(cx, bx + 10, h * .32, 90, h * .44, 10); cx.fill(); txt(cx, M.box || F.short, bx + 55, h * .25, 15, M.boxColor || '#7a5a2a');
    for (const it of items) {
      it.x += speed * dt; const R = size() * it.s;
      cx.save(); cx.translate(it.x, it.y); cx.rotate(it.r);
      if (KIND === 'date') drawDate(cx, R, it.kind, it.seed);
      else if (KIND === 'bottle') drawBottle(cx, 0, R * 1.7, R * 3.3 / 150 * 1.03, { cap: it.kind !== 'nocap', crack: it.kind === 'crack', level: it.kind === 'low' ? .55 : 1, t });
      else if (KIND === 'milk') drawMilk(cx, R, it.kind);
      else drawBox(cx, R, it.kind, it.seed);
      cx.restore();
      if (it.x > bx + 30 && !it.done) { it.done = true; if (it.kind !== 'good') { missed++; fx.push({ x: bx + 50, y: h * .2, s: '−', c: '#e0464f', life: 1 }); A.sfx('wrong', .35); } else good++; }
    }
    items = items.filter(i => i.x < bx + 40 && !i.gone);
    for (const f of fx) { f.y -= 40 * dt; f.life -= dt; cx.globalAlpha = Math.max(0, f.life); txt(cx, f.s, f.x, f.y, 26, f.c); cx.globalAlpha = 1; }
    fx = fx.filter(f => f.life > 0);
    txt(cx, tx(`أُبعدت: ${removed}  ·  فاتتك: ${missed}  ·  أخطاء: ${wrong}`, `Removed: ${removed}  ·  Missed: ${missed}  ·  Mistakes: ${wrong}`), w / 2, h * .88, 15, '#3d3328', 600);
    if (t >= DUR && !over) { over = true; stop(); C.off(); const acc = total ? removed / total : 1, pen = wrong * .08; const q = acc - pen; A.sfx(q > .6 ? 'level_up' : 'points', .6); resolve({ stars: q >= .85 ? 3 : q >= .65 ? 2 : q >= .4 ? 1 : 0, score: removed }); }
  });
  C.cv.addEventListener('pointerdown', e => {
    const [mx, my] = C.pt(e), R = size(); const hit = items.find(i => !i.gone && Math.abs(i.x - mx) < R * (KIND === 'container' ? 2.2 : 1.6) && Math.abs(i.y - my) < R * (upright ? 2.2 : 1.6));
    if (!hit) return;
    if (hit.kind === 'good') { wrong++; fx.push({ x: hit.x, y: hit.y - 40, s: tx('سليمة!', 'Good one!'), c: '#e0464f', life: 1 }); A.sfx('wrong', .4); }
    else { hit.gone = true; removed++; fx.push({ x: hit.x, y: hit.y - 40, s: `${M.defects[hit.kind]} ✓`, c: '#2fb36d', life: 1 }); A.sfx('points', .45); }
  });
  return { result, stop: () => { stop(); C.off(); } };
}

/* the port's version of filling: containers stack on the ship and it settles into the water; stop at the load line */
function drawShipLoad(cx, w, h, level, target, slide, t, loading) {
  const sea = h * .62, L = Math.min(w * .7, 560), x0 = w / 2 - L / 2 - slide * w * .7, draft = 18 + level * 70, hullH = 110, top = sea - hullH + draft;
  cx.fillStyle = '#2a7fb8'; cx.fillRect(0, sea, w, h - sea);
  // hull with the load line painted on it
  cx.fillStyle = '#24496e'; cx.beginPath(); cx.moveTo(x0, top); cx.lineTo(x0 + L, top); cx.lineTo(x0 + L - 40, top + hullH); cx.lineTo(x0 + 30, top + hullH); cx.closePath(); cx.fill();
  cx.fillStyle = '#c4362c'; cx.fillRect(x0 + 20, top + hullH * .62, L - 55, hullH * .38);
  const ly = top + hullH - (18 + target * 70); cx.strokeStyle = '#e0464f'; cx.lineWidth = 4; cx.setLineDash([10, 6]); cx.beginPath(); cx.moveTo(x0 + 10, ly); cx.lineTo(x0 + L - 20, ly); cx.stroke(); cx.setLineDash([]);
  cx.fillStyle = '#fff'; cx.beginPath(); cx.arc(x0 + L * .5, ly, 10, 0, 7); cx.fill(); cx.strokeStyle = '#e0464f'; cx.lineWidth = 3; cx.stroke(); cx.beginPath(); cx.moveTo(x0 + L * .5 - 16, ly); cx.lineTo(x0 + L * .5 + 16, ly); cx.stroke();
  // containers stacked by how much has been loaded
  const cols = ['#2f6fd0', '#d7262f', '#2f9a4a', '#f08a1c', '#7a4a26'], n = Math.floor(level * 40);
  for (let k = 0; k < n; k++) { const c = k % 10, r = Math.floor(k / 10), cw = (L - 120) / 10; cx.fillStyle = cols[(k * 7) % 5]; cx.fillRect(x0 + 60 + c * cw, top - (r + 1) * 22, cw - 3, 20); }
  cx.fillStyle = '#e9edf3'; cx.fillRect(x0 + L - 90, top - 80, 50, 80); cx.fillStyle = '#9fb4c9'; for (let k = 0; k < 3; k++) cx.fillRect(x0 + L - 84 + k * 15, top - 70, 10, 8);
  // the sea over the bottom of the hull, waves moving
  cx.fillStyle = 'rgba(42,127,184,.88)'; cx.beginPath(); cx.moveTo(0, sea); for (let x = 0; x <= w; x += 8) cx.lineTo(x, sea + Math.sin(t * 2 + x * .05) * 3); cx.lineTo(w, h); cx.lineTo(0, h); cx.fill();
  // the gantry crane lowering a box
  cx.fillStyle = '#e0a21c'; cx.fillRect(w * .5 - 4, 0, 8, sea - hullH - 120); cx.fillRect(w * .5 - 120, 0, 240, 10);
  if (loading) { cx.fillStyle = cols[n % 5]; cx.fillRect(w * .5 - 24, sea - hullH - 130 + Math.sin(t * 8) * 4, 48, 20); }
}

/* ================= 7. fill: stop the water exactly at the line (Naqi, Creative) ================= */
async function fill(F, A, M) {
  const fr = frame(F, { title: M.title, stat: '1 / 6' }), { stage } = fr, LQ = M.liquid || ['#6ec6f2', '#2a8fd0'], BG = M.bg || ['#e8f6fd', '#bfe3f5'];
  stage.append(el('div', 'mg-brief glass', M.ship ? tx(`${M.brief} انتبه: الرافعة تُنزل حاوية أخيرة بعد التوقف!`, `${M.brief} Careful: the crane lowers one last container after you stop!`) : tx(`${M.brief.replace(/تماماً\.?$/, '')}<b>تماماً</b>. انتبه: ${M.word || 'السائل'} يستمر قليلاً بعد التوقف!`, `${M.brief} <b>Careful:</b> ${M.word || 'the liquid'} keeps flowing a bit after you stop!`)));
  const C = canvasIn(stage), btn = el('button', 'btn mg-big', tx(`${M.icon || '💧'} اضغط مطوّلاً ${M.ship ? 'للتحميل' : 'للتعبئة'}`, `${M.icon || '💧'} Hold to ${M.ship ? 'load' : 'fill'}`)); stage.append(btn);
  const N = 6; let i = 0, level = 0, target = rand(.6, .85), hold = false, lag = 0, scores = [], t = 0, state = 'fill', msg = '', msgT = 0, slide = 0;
  const set = on => { if (state !== 'fill') return; if (!on && hold) { lag = .14; } hold = on; };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); set(true); }); const up = () => set(false); addEventListener('pointerup', up);
  const kd = e => { if (e.code === 'Space') { e.preventDefault(); set(true); } }, ku = e => { if (e.code === 'Space') set(false); };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  let resolve; const result = new Promise(r => resolve = r);
  const judge = () => {
    state = 'judge'; const d = Math.abs(level - target), sc = level > .99 ? 0 : d < .02 ? 100 : d < .05 ? 75 : d < .1 ? 45 : 0;
    scores.push(sc); msg = sc === 100 ? tx('مثالي! 🎯', 'Perfect! 🎯') : sc >= 75 ? tx('ممتاز', 'Great') : sc >= 45 ? tx('مقبول', 'Fair') : level > .99 ? tx('فاضت العبوة!', 'Overflowed!') : tx('بعيد عن الخط', 'Off the line'); msgT = 1.3; A.sfx(sc >= 75 ? 'task_done' : sc ? 'points' : 'wrong', .55);
    setTimeout(() => { i++; if (i >= N) { cleanup(); const avg = scores.reduce((a, b) => a + b) / N; A.sfx('level_up', .6); resolve({ stars: avg >= 80 ? 3 : avg >= 55 ? 2 : avg >= 30 ? 1 : 0, score: Math.round(avg) }); return; } slide = 1; level = 0; target = rand(.55, .88); state = 'fill'; fr.setStat(`${i + 1} / ${N}`); }, 1300);
  };
  const stop = rafLoop(dt => {
    const { cx, w, h } = C; if (!w) return; t += dt; slide = Math.max(0, slide - dt * 2.5); msgT = Math.max(0, msgT - dt);
    const rate = .32 + i * .07;
    if (state === 'fill') { if (hold) level += rate * dt; else if (lag > 0) { level += rate * dt; lag -= dt; if (lag <= 0 && level > .02) judge(); } if (level >= 1) { level = 1; hold = false; judge(); } }
    const g = cx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, BG[0]); g.addColorStop(1, BG[1]); cx.fillStyle = g; cx.fillRect(0, 0, w, h);
    if (M.ship) { drawShipLoad(cx, w, h, level, target, slide, t, hold || lag > 0); if (msgT > 0) txt(cx, msg, w / 2, h * .12, 28, '#1b2263'); scores.forEach((s2, k) => txt(cx, s2 >= 75 ? '★' : s2 ? '☆' : '✕', 30 + k * 30, 30, 22, s2 >= 75 ? '#e0b21c' : s2 ? '#9aa3b2' : '#e0464f')); return; }
    const bw = Math.min(140, w * .22), bh = Math.min(h * .62, 330), bx = w / 2 - bw / 2 - slide * w * .6, by = h * .9 - bh;
    // nozzle + stream
    cx.fillStyle = '#7d8592'; cx.fillRect(w / 2 - 40, 0, 80, by - 50); cx.fillStyle = '#5a6270'; cx.fillRect(w / 2 - 12, by - 50, 24, 26);
    if ((hold || lag > 0) && state === 'fill') { cx.fillStyle = LQ[1]; cx.globalAlpha = .85; cx.fillRect(w / 2 - 5, by - 24, 10, bh * (1 - level) + 24); cx.globalAlpha = 1; }
    // bottle
    cx.save(); rr(cx, bx, by, bw, bh, 26); cx.clip();
    cx.fillStyle = 'rgba(255,255,255,.55)'; cx.fillRect(bx, by, bw, bh);
    const ly = by + bh * (1 - level); const wg = cx.createLinearGradient(0, ly, 0, by + bh); wg.addColorStop(0, LQ[0]); wg.addColorStop(1, LQ[1]); cx.fillStyle = wg;
    cx.beginPath(); cx.moveTo(bx, ly); for (let x = 0; x <= bw; x += 6) cx.lineTo(bx + x, ly + Math.sin(t * 9 + x * .1) * (hold ? 3 : 1.2)); cx.lineTo(bx + bw, by + bh); cx.lineTo(bx, by + bh); cx.closePath(); cx.fill();
    cx.restore();
    cx.strokeStyle = 'rgba(30,90,140,.5)'; cx.lineWidth = 3; rr(cx, bx, by, bw, bh, 26); cx.stroke();
    cx.fillStyle = M.cap || '#1aa0c8'; cx.fillRect(bx + bw * .3, by - 16, bw * .4, 16);
    const ty = by + bh * (1 - target); cx.strokeStyle = '#e0464f'; cx.lineWidth = 3; cx.setLineDash([8, 6]); cx.beginPath(); cx.moveTo(bx - 20, ty); cx.lineTo(bx + bw + 20, ty); cx.stroke(); cx.setLineDash([]);
    rr(cx, bx + 14, by + bh * .55, bw - 28, bh * .2, 8); cx.fillStyle = 'rgba(255,255,255,.85)'; cx.fill(); txt(cx, M.label || F.short, bx + bw / 2, by + bh * .65, 20, M.cap || '#1aa0c8');
    if (msgT > 0) txt(cx, msg, w / 2, h * .12, 28, '#1b2263');
    scores.forEach((s, k) => txt(cx, s >= 75 ? '★' : s ? '☆' : '✕', 30 + k * 30, 30, 22, s >= 75 ? '#e0b21c' : s ? '#9aa3b2' : '#e0464f'));
  });
  const cleanup = () => { stop(); C.off(); removeEventListener('pointerup', up); removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
  return { result, stop: cleanup };
}

/* ================= 8. pattern: rebuild the gift box from memory (Tozeen, Artist) ================= */
async function pattern(F, A, M) {
  const fr = frame(F, { title: M.title, stat: tx('الجولة 1 / 2', 'Round 1 / 2') }), { stage } = fr;
  const brief = el('div', 'mg-brief glass', M.brief); stage.append(brief);
  const SW = M.items.map(([bg, name]) => [null, bg, name]), rad = M.square ? '14%' : '50%';
  const box = el('div', 'panel glass'); box.style.cssText = `display:grid;place-items:center;gap:14px;background:${M.box || 'linear-gradient(160deg,#fbf3e4,#efe0c4)'}`; stage.append(box);
  let total = 0, right = 0;
  const round = async (cols, rows, kinds) => {
    const n = cols * rows, pat = Array.from({ length: n }, () => Math.random() * kinds | 0), mine = Array(n).fill(-1);
    box.innerHTML = ''; const grid = el('div', 'grid'); grid.style.gridTemplateColumns = `repeat(${cols},minmax(0,1fr))`; grid.style.width = `min(${cols * 118}px,100%)`;
    const cells = pat.map((k, i) => { const c = el('div', 'cell'); c.innerHTML = `<div class="sweet" style="background:${SW[k][1]};border-radius:${rad}"></div>`; grid.append(c); return c; });
    box.append(grid);
    for (let s = 4; s > 0; s--) { brief.innerHTML = tx(`احفظ الترتيب… <b>${s}</b>`, `Memorize the pattern… <b>${s}</b>`); A.sfx('ui_hover', .4); await wait(1000); }
    cells.forEach(c => c.innerHTML = ''); brief.innerHTML = tx('اختر نوع الحلوى من الأسفل ثم اضغط على مكانها في العلبة.', 'Pick a sweet from below, then tap its spot in the box.');
    const pal = el('div', 'pal'); let sel = 0;
    SW.slice(0, kinds).forEach(([c, bg, name], k) => { const b = el('button', k === 0 ? 'sel' : '', `<div class="sweet" style="background:${bg};border-radius:${rad}"></div><small style="display:block;font-size:10.5px;margin-top:2px;color:var(--navy)">${name}</small>`); b.title = name; b.onclick = () => { sel = k; [...pal.children].forEach(x => x.classList.toggle('sel', x === b)); A.sfx('ui_click', .4); }; pal.append(b); });
    cells.forEach((c, i) => c.onclick = () => { mine[i] = sel; c.innerHTML = `<div class="sweet" style="background:${SW[sel][1]};border-radius:${rad}"></div>`; A.sfx('pin_drop', .4); });
    const ok = el('button', 'btn', tx('تحقق من العلبة ✓', 'Check the box ✓')); box.append(pal, ok);
    await new Promise(r => ok.onclick = r);
    let good = 0; cells.forEach((c, i) => { const g = mine[i] === pat[i]; if (g) good++; c.classList.add(g ? 'good' : 'bad'); if (!g) c.innerHTML = `<div class="sweet" style="background:${SW[pat[i]][1]};border-radius:${rad};opacity:.5"></div>`; });
    total += n; right += good; A.sfx(good === n ? 'level_up' : good > n / 2 ? 'task_done' : 'wrong', .6);
    brief.innerHTML = tx(`أصبت ${good} من ${n}`, `${good} of ${n} right`); ok.remove(); pal.remove(); await wait(1800);
  };
  const result = (async () => { await round(3, 3, 3); fr.setStat(tx('الجولة 2 / 2', 'Round 2 / 2')); await round(4, 3, 4); const q = right / total; return { stars: q >= .9 ? 3 : q >= .7 ? 2 : q >= .45 ? 1 : 0, score: right }; })();
  return { result, stop: () => {} };
}

/* ================= 9. memory: match the safety equipment (Petrochemicals, Discoverer) ================= */
async function memory(F, A) {
  const fr = frame(F, { title: F.title, stat: tx('محاولات: 0', 'Tries: 0') }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', tx('اقلب بطاقتين في كل مرة وطابق أدوات الوقاية المتشابهة.', 'Flip two cards at a time and match the pairs of safety gear.')));
  const ITEMS = [['⛑️', tx('خوذة', 'Hard hat')], ['🥽', tx('نظارة واقية', 'Goggles')], ['🧤', tx('قفازات', 'Gloves')], ['🦺', tx('سترة عاكسة', 'Hi-vis vest')], ['🧯', tx('طفاية حريق', 'Fire extinguisher')], ['🎧', tx('واقي الأذن', 'Ear muffs')]];
  const deck = shuffle([...ITEMS, ...ITEMS].map((it, i) => ({ it, i })));
  const grid = el('div', 'grid'); grid.style.cssText = `grid-template-columns:repeat(${innerWidth < 640 ? 4 : 6},minmax(0,1fr));width:min(820px,100%);max-height:100%`;
  stage.append(grid);
  let open = [], tries = 0, found = 0, lock = false;
  const result = new Promise(res => {
    deck.forEach(d => {
      const c = el('div', 'card3', `<div class="in"><div class="f">${tx('؟', '?')}</div><div class="b"><i>${d.it[0]}</i><small>${d.it[1]}</small></div></div>`);
      c.onclick = async () => {
        if (lock || c.classList.contains('flip') || c.classList.contains('done')) return;
        c.classList.add('flip'); A.sfx('ui_click', .4); open.push([c, d]);
        if (open.length === 2) {
          lock = true; tries++; fr.setStat(tx(`محاولات: ${tries}`, `Tries: ${tries}`)); const [[c1, d1], [c2, d2]] = open; open = [];
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
async function order(F, A, M) {
  const fr = frame(F, { title: M.title, stat: tx('أخطاء: 0', 'Mistakes: 0') }), { stage } = fr;
  stage.append(el('div', 'mg-brief glass', tx(`${M.brief} اضغط على المحطات واحدة واحدة بالترتيب.`, `${M.brief} Tap the stations one by one, in order.`)));
  const STEPS = M.steps;
  const wrap = el('div', 'panel glass'); wrap.style.cssText = `display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px;background:${M.bg || 'rgba(18,30,80,.55)'};color:#fff;flex:1;min-height:0;overflow:auto`;
  const slots = el('div', 'grid'), pool = el('div', 'grid'); wrap.append(slots, pool); stage.append(wrap);
  const slotEls = STEPS.map((s, i) => { const d = el('div', 'slot', `<em>${i + 1}</em><span>…</span>`); slots.append(d); return d; });
  let next = 0, mistakes = 0;
  const result = new Promise(res => {
    shuffle(STEPS.map((s, i) => ({ s, i }))).forEach(({ s, i }) => {
      const b = el('button', 'opt step', `<i>${s[0]}</i><span>${s[1]}</span>`);
      b.onclick = async () => {
        if (i === next) { slotEls[i].classList.add('ok'); slotEls[i].innerHTML = `<em>${i + 1}</em><span>${s[0]} ${s[1]}</span>`; b.remove(); next++; A.sfx('task_done', .45); if (next === STEPS.length) { A.sfx('level_up', .6); await wait(1100); res({ stars: mistakes <= 1 ? 3 : mistakes <= 3 ? 2 : 1, score: mistakes }); } }
        else { mistakes++; fr.setStat(tx(`أخطاء: ${mistakes}`, `Mistakes: ${mistakes}`)); b.classList.add('bad', 'shake'); A.sfx('wrong', .4); setTimeout(() => b.classList.remove('bad', 'shake'), 450); }
      };
      pool.append(b);
    });
  });
  return { result, stop: () => {} };
}

/* ================= 11. quiz: the ambassador's challenge (Port, Ambassador) ================= */
async function quiz(F, A, M) {
  const fr = frame(F, { title: M.title, stat: '1 / 6' }), { stage } = fr;
  const Q = shuffle(M.q.map(([q, a]) => [q, a, 0])).slice(0, 6);
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

const GAMES = { photo, ad, story, circuit, pressure, design, crane, sort, fill, pattern, memory, order, quiz };

/* Run one factory's mission on the chosen track. Resolves { stars, score } or { exit: true } if the player leaves. */
export async function runMiniGame(F, A, M) {
  curTrack = M.track; const g = await GAMES[M.game](F, A, M);
  const root = $('#mg');
  const exit = new Promise(res => { $('.mg-top .x', root).onclick = () => { A.sfx('panel_close'); g.stop?.(); res({ exit: true }); }; });
  const out = await Promise.race([g.result, exit]);
  root.classList.remove('on'); root.innerHTML = '';
  return out;
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRegion, LAYOUT } from './world.js';
import { makeBus } from './bus.js';
import { buildInterior } from './interior.js';
import { runMiniGame } from './games.js';
import { REGIONS, ORDER, TRACKS, ALL } from './regions.js';
import { makeDoll, animateDoll } from './doll.js';
import { canvas, toTex } from './tex.js';
import { Ambient } from './fx.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const Q = new URLSearchParams(location.search);
const touch = matchMedia('(pointer: coarse)').matches; if (touch) document.body.classList.add('touch');
const wait = ms => new Promise(r => setTimeout(r, ms));
const frame = () => new Promise(requestAnimationFrame);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp = THREE.MathUtils.clamp;
const store = { get(k, d) { try { const v = localStorage.getItem('fi.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('fi.' + k, JSON.stringify(v)); } catch {} } };

/* ---------------- audio: music + effects, each with its own volume ----------------
   Everything runs through one Web Audio graph (a music bus and an effects bus), so the volume sliders
   also work on iPhones, where <audio>.volume is read-only. Two <audio> decks cross-fade the music; the
   short effects are decoded once and played from memory. Browsers allow sound only after the first
   tap, so the graph is unlocked on the first touch, click or key (and tried at load for returning visitors). */
const SFX = ['ui_click', 'ui_hover', 'task_done', 'wrong', 'points', 'level_up', 'panel_open', 'panel_close', 'step_1', 'step_2', 'step_3', 'step_4', 'step_5', 'factory_metal', 'pin_drop'];
const Audio_ = {
  musicVol: store.get('music', .8), sfxVol: store.get('sfx', .9), name: '', ctx: null, decks: [], cur: 0, buf: {}, primed: false,
  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
    const c = this.ctx = new AC();
    this.mBus = c.createGain(); this.mBus.gain.value = this.musicVol; this.mBus.connect(c.destination);
    this.sBus = c.createGain(); this.sBus.gain.value = this.sfxVol; this.sBus.connect(c.destination);
    this.decks = [0, 1].map(() => {
      const a = new Audio(); a.preload = 'auto'; const g = c.createGain(); g.gain.value = 0; c.createMediaElementSource(a).connect(g).connect(this.mBus);
      a.addEventListener('playing', () => this.ui()); a.addEventListener('pause', () => this.ui()); return { a, g, t: 0 };
    });
    for (const n of SFX) fetch(`assets/sfx/${n}.mp3`).then(r => r.arrayBuffer()).then(d => c.decodeAudioData(d)).then(b => { this.buf[n] = b; }).catch(() => {});
    c.addEventListener('statechange', () => { this.ui(); if (this.running) this.resumeTrack(); });
    return true;
  },
  get running() { return this.ctx?.state === 'running'; },
  music(name, { loop = true, vol = .5 } = {}) {
    const old = this.decks[this.cur];
    if (this.name === name && old && !old.a.paused) return;
    this.name = name; if (!this.init()) return;
    const now = this.ctx.currentTime; this.cur ^= 1; const nw = this.decks[this.cur];
    if (old) { old.g.gain.cancelScheduledValues(now); old.g.gain.setValueAtTime(old.g.gain.value, now); old.g.gain.linearRampToValueAtTime(0, now + .9); clearTimeout(old.t); old.t = setTimeout(() => old.a.pause(), 950); }
    clearTimeout(nw.t); nw.a.src = `assets/music/${name}.mp3`; nw.a.loop = loop;
    nw.g.gain.cancelScheduledValues(now); nw.g.gain.setValueAtTime(0, now); nw.g.gain.linearRampToValueAtTime(vol, now + .9);
    if (this.running || this.primed) nw.a.play().catch(() => {});
  },
  resumeTrack() { const d = this.decks[this.cur]; if (this.name && d?.a.paused && !d.a.ended && d.a.src.includes('/music/')) d.a.play().catch(() => {}); },
  sfx(name, vol = .7) {
    if (!this.running || this.sfxVol <= 0 || !this.buf[name]) return;
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain(); src.buffer = this.buf[name]; g.gain.value = vol; src.connect(g).connect(this.sBus); src.start();
  },
  setMusic(v) { this.musicVol = v; store.set('music', v); if (this.mBus) this.mBus.gain.value = v; this.ui(); },
  setSfx(v) { this.sfxVol = v; store.set('sfx', v); if (this.sBus) this.sBus.gain.value = v; this.ui(); },
  unlock() {
    if (!this.init()) return;
    if (!this.running && !document.hidden) this.ctx.resume().catch(() => {});
    // iOS lets an <audio> element start later on its own only if it was started once inside a tap,
    // so both decks play a moment of silence on the first one
    if (!this.primed) {
      this.primed = true;
      for (const o of this.decks) if (o.a.paused && !o.a.src.includes('/music/')) { o.a.src = 'assets/sfx/silence.mp3'; o.a.play().catch(() => { this.primed = false; }); }
    }
    this.resumeTrack();
  },
  ui() { const d = this.decks[this.cur]; document.body.classList.toggle('playing', !!d && !d.a.paused && this.running && this.musicVol > 0); $('#snd-wave').style.display = this.musicVol > 0 || this.sfxVol > 0 ? '' : 'none'; }
};
const A = { sfx: (n, v) => Audio_.sfx(n, v) };
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) addEventListener(ev, () => Audio_.unlock(), { capture: true });
// a hidden tab goes quiet and picks the music up again on return
document.addEventListener('visibilitychange', () => { if (!Audio_.ctx) return; if (document.hidden) Audio_.ctx.suspend(); else if (Audio_.primed) Audio_.ctx.resume().catch(() => {}); });
// returning visitors whose browser already allows sound hear the theme on the very first screen
if (!Q.get('auto')) { try { if (Audio_.init() && Audio_.running) Audio_.music('menu', { vol: .55 }); } catch {} }
const sp = $('#settings');
$('#snd').addEventListener('click', e => { e.stopPropagation(); sp.hidden = !sp.hidden; Audio_.sfx(sp.hidden ? 'panel_close' : 'panel_open', .5); });
addEventListener('pointerdown', e => { if (!sp.hidden && !sp.contains(e.target) && !$('#snd').contains(e.target)) sp.hidden = true; });
const vm = $('#vol-music'), vs = $('#vol-sfx');
vm.value = Math.round(Audio_.musicVol * 100); vs.value = Math.round(Audio_.sfxVol * 100);
const paintR = (el, out) => { el.style.setProperty('--v', el.value + '%'); $(out).textContent = el.value + '%'; };
paintR(vm, '#vm-out'); paintR(vs, '#vs-out');
vm.addEventListener('input', () => { Audio_.setMusic(vm.value / 100); paintR(vm, '#vm-out'); });
vs.addEventListener('input', () => { Audio_.setSfx(vs.value / 100); paintR(vs, '#vs-out'); });
vs.addEventListener('change', () => Audio_.sfx('ui_click'));
$('#mute-all').addEventListener('click', () => { const on = Audio_.musicVol > 0 || Audio_.sfxVol > 0; vm.value = vs.value = on ? 0 : 80; vm.dispatchEvent(new Event('input')); vs.dispatchEvent(new Event('input')); });

/* ---------------- state ---------------- */
const saved = store.get('save', {});
const S = { char: saved.char || 'boy', done: saved.done || {}, region: null, loc: 0, mode: 'menu', cine: false };
const nameOf = c => c === 'boy' ? 'فهد' : 'سارة';
const persist = () => store.set('save', { char: S.char, done: S.done });
const points = () => Object.values(S.done).reduce((a, s) => a + s * 100, 0);
const doneCount = () => Object.values(S.done).filter(s => s > 0).length;
const badgeSet = () => new Set(ALL.filter(f => S.done[f.id] > 0).map(f => f.track));
const regionDone = r => REGIONS[r].factories.filter(f => S.done[f.id] > 0).length;

function show(id) { $$('.screen').forEach(s => { if (s.id !== 'mg') s.classList.toggle('on', s.id === id); }); $('#home').hidden = !['hud', 'mhud', 'ride'].includes(id); }
function toast(t, ms = 2600) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), ms); }
const flash = () => { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); };
$$('button').forEach(b => b.addEventListener('pointerenter', () => !touch && Audio_.sfx('ui_hover', .25)));

/* ---------------- menus ---------------- */
const spFx = new Ambient($('#sp-net'), { motes: 24, net: touch ? 22 : 34, netArea: [0, 0, 1, 1], color: '200,190,255', mouse: true }); spFx.start();
$('#splash').addEventListener('pointerdown', () => {
  if ($('#splash').classList.contains('out')) return;
  Audio_.unlock(); Audio_.music('menu', { vol: .55 }); Audio_.sfx('panel_open', .5);
  $('#splash').classList.add('out'); setTimeout(() => { spFx.stop(); showTitle(); }, 750);
});
const ART = 1672 / 941, tFx = new Ambient($('#t-fx'), { motes: touch ? 36 : 60, net: 14, netArea: [.42, .02, .56, .3] });
const par = { x: 0, y: 0, t: 0 };
function layoutTitle() {
  const vw = innerWidth, vh = innerHeight, sw = Math.max(vw, vh * ART), sh = sw / ART, fx = vw / vh < 1 ? .3 : .5;
  const left = Math.min(0, Math.max(vw - sw, vw / 2 - fx * sw)), top = Math.min(0, Math.max(vh - sh, vh * .52 - .6 * sh));
  Object.assign($('#t-scene').style, { width: sw + 'px', height: sh + 'px', left: left + 'px', top: top + 'px' }); tFx.resize();
}
addEventListener('resize', () => { if ($('#title').classList.contains('on')) layoutTitle(); });
function showTitle() { S.mode = 'menu'; show('title'); layoutTitle(); const t = $('#title'); t.classList.remove('go', 'leave'); void t.offsetWidth; t.classList.add('go'); tFx.start(); Audio_.music('menu', { vol: .55 }); }
addEventListener('pointermove', e => { par.x = e.clientX / innerWidth - .5; par.y = e.clientY / innerHeight - .5; par.t = performance.now(); });
addEventListener('deviceorientation', e => { if (e.gamma == null) return; par.x = clamp(e.gamma / 50, -.5, .5); par.y = clamp((e.beta - 45) / 60, -.5, .5); par.t = performance.now(); });
(function parallax() {
  if ($('#title').classList.contains('on')) {
    let { x, y } = par; if (performance.now() - par.t > 2500) { const k = performance.now() / 1000; x = Math.sin(k * .35) * .35; y = Math.cos(k * .27) * .2; }
    $$('#t-scene .par').forEach(l => { const d = +l.dataset.d; l.style.transform = `translate3d(${-x * d * 2}px,${-y * d}px,0)`; });
  }
  requestAnimationFrame(parallax);
})();
$('#start').addEventListener('click', () => { Audio_.sfx('panel_open'); $('#title').classList.add('leave'); setTimeout(flash, 380); setTimeout(() => { tFx.stop(); show('pick'); pickFx.start(); }, 760); });
const pickFx = new Ambient($('#pick-fx'), { motes: 30, net: 20, netArea: [0, 0, 1, 1], color: '200,190,255', mouse: true });
const regFx = new Ambient($('#reg-fx'), { motes: 30, net: 20, netArea: [0, 0, 1, 1], color: '200,190,255', mouse: true });
$$('[data-back]').forEach(b => b.addEventListener('click', () => {
  Audio_.sfx('panel_close'); const to = b.dataset.back;
  if (b.id === 'reg-back' && RW) { show('hud'); S.mode = 'world'; return; }
  if (to === 'title') showTitle(); else { show(to); (to === 'pick' ? pickFx : regFx).start(); }
}));
$$('.pcard').forEach(b => b.addEventListener('click', () => {
  Audio_.sfx('task_done', .5); $$('.pcard').forEach(x => x.classList.toggle('sel', x === b));
  S.char = b.dataset.c; persist();
  setTimeout(() => showRegions(), 420);
}));
function showRegions(travel = false) {
  $('#reg-title').textContent = travel ? 'إلى أي منطقة تسافر؟' : 'إلى أين تتجه الرحلة؟';
  $$('.rcard').forEach(c => { const r = c.dataset.r, n = regionDone(r); c.querySelector('.tag').textContent = n === 3 ? 'مكتملة ✓' : `${n} / 3`; c.classList.toggle('cur', r === S.region); });
  show('regions'); regFx.start();
}
$$('.rcard').forEach(b => b.addEventListener('click', () => { Audio_.sfx('ui_click'); startRegion(b.dataset.r); }));
$('#home').addEventListener('click', () => { Audio_.sfx('panel_close'); leaveAnyFactory(); showTitle(); });

/* ---------------- renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 4000);
// portrait phones get a wider lens so the street and the factory floor still fit
const fitCam = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < .8 ? 64 : camera.aspect < 1.2 ? 56 : 50; camera.updateProjectionMatrix(); };
addEventListener('resize', fitCam); fitCam();
const clock = new THREE.Clock();

let RW = null, bus = null, player = null, marker = null, orbit = null, IN = null, curF = null;
const dolls = {};

/* ---------------- loading screen ---------------- */
const TIPS = ['في كل مصنع لعبة مختلفة حسب مساره: المكتشف، المبدع، الفنان، والسفير.', 'اجمع الشارات الأربع لتصبح من صناعيو المستقبل.', 'جوائز هاكثون صناعيو المستقبل تصل إلى 200,000 ريال.', 'انتبه لعلامات السلامة داخل المصنع… قد تكون جزءاً من مهمتك!', 'زيارة المصانع تكشف لك كيف تُصنع الأشياء التي تستخدمها كل يوم.'];
const ldFx = new Ambient($('#ld-fx'), { motes: touch ? 30 : 50, net: 12, netArea: [0, .02, 1, .3] });
const prog = { v: 0 }; THREE.DefaultLoadingManager.onProgress = (u, a, b) => { prog.v = Math.max(prog.v, a / b); };
async function loadingScreen({ img, kicker, title, sub, from = 'انطلاق', to = 'المصنع', tips = TIPS, task, min = 2400 }) {
  show('loading'); prog.v = 0; $('#ld-bg').style.backgroundImage = `url(${img})`; $('#ld-kicker').textContent = kicker; $('#ld-title').textContent = title; $('#ld-sub').textContent = sub;
  $('.pin.a').lastChild.textContent = from; $('.pin.b').lastChild.textContent = to;
  $$('.ld-head > *').forEach(e => { e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; }); ldFx.start();
  const tipEl = $('#ld-tip'); let ti = Math.random() * tips.length | 0; tipEl.textContent = tips[ti];
  const tipT = setInterval(() => { tipEl.style.opacity = 0; setTimeout(() => { ti = (ti + 1) % tips.length; tipEl.textContent = tips[ti]; tipEl.style.opacity = 1; }, 350); }, 3400);
  const road = $('.road'), pct = $('#ld-pct'), t0 = performance.now(); let shown = 0, doneTask = false, out;
  const set = v => { shown = v; road.style.setProperty('--p', v); pct.textContent = Math.round(v * 100) + '%'; }; set(0);
  const tick = setInterval(() => { const el = (performance.now() - t0) / min, target = doneTask ? 1 : Math.min(.92, Math.max(el * .7, prog.v * .9)); set(shown + (target - shown) * .18); }, 60);
  try { out = await task(); } finally { doneTask = true; }
  while (performance.now() - t0 < min || shown < .995) await wait(60);
  clearInterval(tick); clearInterval(tipT); set(1); await wait(300); ldFx.stop();
  return out;
}

/* ---------------- regions ---------------- */
async function startRegion(key) {
  const R = REGIONS[key];
  Audio_.music('bus_trip', { vol: .5 }); S.mode = 'loading';
  await loadingScreen({ img: R.img, kicker: S.region && S.region !== key ? 'السفر بالباص إلى' : 'المنطقة', title: R.name, sub: `${R.sub} · ${R.factories.map(f => f.short).join(' · ')}`, from: S.region ? REGIONS[S.region].name : 'البيت', to: R.name, task: () => loadRegion(key) });
  S.region = key; S.loc = 0; enterRegion();
}
async function loadRegion(key) {
  if (RW && RW.key === key) return;
  if (RW) { RW.scene.remove(bus, marker, player?.root); RW.dispose(); RW = null; }
  const w = await buildRegion(renderer, key); w.key = key;
  bus ||= await makeBus(); w.scene.add(bus);
  marker ||= makeMarker(); w.scene.add(marker);
  player = await getPlayer(S.char, w.tint); w.scene.add(player.root);
  w.yard = [[8, 9], [16, 9], [8, 20], [16, 20]].map(([x, z]) => [LAYOUT.SCHOOL_X + x, -40 + z, .5]);
  renderer.toneMappingExposure = w.exposure;
  if (renderer.compileAsync) await renderer.compileAsync(w.scene, camera).catch(() => {});
  RW = w;
}
async function getPlayer(kind, tint) {
  dolls[kind] ||= { root: null, doll: await makeDoll(kind), speed: 0, yaw: 0 };
  const p = dolls[kind]; p.root = p.doll.root;
  p.root.traverse(o => { if (o.material?.color && !o.userData.blob) o.material.color.set(tint); });
  if (!p.root.userData.blob) { const [c, x] = canvas(128, 128); const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(10,14,40,.42)'); g.addColorStop(1, 'rgba(10,14,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: toTex(c), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = .02; blob.userData.blob = true; blob.renderOrder = 1; p.root.add(blob); p.blob = blob; p.root.userData.blob = true; }
  return p;
}
function makeMarker() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 48), new THREE.MeshBasicMaterial({ color: '#847bb8', transparent: true, opacity: .85, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#9b93d6', transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 3; g.add(beam);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 4), new THREE.MeshStandardMaterial({ color: '#3c58a7', emissive: '#3c58a7', emissiveIntensity: .6 })); arrow.rotation.x = Math.PI; arrow.position.y = 3.4; g.add(arrow); g.userData = { arrow, ring };
  return g;
}
const L = () => RW.locs[S.loc];
const busDoor = () => new THREE.Vector3(bus.position.x + 4.82, .2, 7.4);

/* ---------------- input ---------------- */
const keys = {}; let joy = { x: 0, y: 0 }, camYaw = Math.PI, camPitch = .3, drag = null, skip = false;
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE' && S.mode === 'world') act(); if (['Space', 'Enter', 'Escape'].includes(e.code) && S.cine) skip = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
const cv = $('#c');
cv.addEventListener('pointerdown', e => { if (S.mode === 'world') { drag = { x: e.clientX, y: e.clientY, yaw: camYaw, pitch: camPitch }; cv.setPointerCapture(e.pointerId); } });
cv.addEventListener('pointermove', e => { if (!drag) return; camYaw = drag.yaw - (e.clientX - drag.x) * .006; camPitch = clamp(drag.pitch + (e.clientY - drag.y) * .004, .12, .9); });
cv.addEventListener('pointerup', () => { drag = null; });
const jo = $('#joy'), knob = jo.querySelector('i');
jo.addEventListener('pointerdown', e => { jo.setPointerCapture(e.pointerId); joyMove(e); });
jo.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') joyMove(e); });
jo.addEventListener('pointerup', () => { joy = { x: 0, y: 0 }; knob.style.transform = ''; });
function joyMove(e) { const r = jo.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx); joy = { x: Math.cos(a) * d, y: Math.sin(a) * d }; knob.style.transform = `translate(${joy.x * 38}px,${joy.y * 38}px)`; }
$('#act').addEventListener('click', () => act());
$('#skip').addEventListener('click', () => { skip = true; });
$('#ride-skip').addEventListener('click', () => { skip = true; });

/* ---------------- how-to cards ---------------- */
const seen = Q.get('auto') ? { world: 1 } : store.get('seen', {});
function howto(key, title, items, force = false) {
  if (seen[key] && !force) return Promise.resolve(); seen[key] = 1; store.set('seen', seen);
  $('#ht-title').textContent = title; $('#ht-list').innerHTML = items.map(([i, t]) => `<li><i>${i}</i><span>${t}</span></li>`).join('');
  $('#howto').classList.add('on'); Audio_.sfx('panel_open', .4);
  return new Promise(r => $('#ht-ok').onclick = () => { Audio_.sfx('ui_click'); $('#howto').classList.remove('on'); r(); });
}

/* ---------------- HUD ---------------- */
function updateHUD() {
  $('#st-pts').textContent = points().toLocaleString('en'); $('#st-fac').textContent = `${doneCount()}/12`; $('#st-bdg').textContent = `${badgeSet().size}/4`;
  $('#av').style.backgroundImage = `url(assets/ui/${S.char}_front_cut.webp)`; $('#who-name').textContent = nameOf(S.char); $('#who-region').textContent = REGIONS[S.region]?.name || '';
  if (!RW) return;
  const x0 = LAYOUT.SCHOOL_X - 20, x1 = LAYOUT.FACT_X[2] + 20, pos = x => `${clamp((x - x0) / (x1 - x0), 0, 1) * 100}%`;
  $('#mini-labels').innerHTML = RW.locs.map(l => `<span class="${l.kind === 'factory' && S.done[l.f.id] ? 'd' : ''}" style="left:${pos(l.x)}">${l.kind === 'school' ? 'المدرسة' : l.f.short}</span>`).join('');
  $('#mini').dataset.ok = '1'; $('#mini').pos = pos;
  // mission card
  const loc = L(), chip = $('#m-chip');
  if (loc.kind === 'school') { chip.textContent = 'نقطة الانطلاق'; chip.style.background = ''; $('#m-title').textContent = 'اركب باص صناعيو المستقبل'; $('#m-text').textContent = 'اخرج من بوابة المدرسة، اعبر ممر المشاة، واركب الباص المنتظر عند المحطة.'; $('#m-step').textContent = `${REGIONS[S.region].name} · ${regionDone(S.region)}/3 مصانع`; $('#m-reward').textContent = ''; }
  else if (!S.done[loc.f.id]) { const T = TRACKS[loc.f.track]; chip.textContent = `مسار ${T.name}`; chip.style.background = T.color; $('#m-title').textContent = `ادخل ${loc.f.name}`; $('#m-text').textContent = `اعبر ممر المشاة إلى البوابة. مهمتك: ${loc.f.title}.`; $('#m-step').textContent = `${REGIONS[S.region].name} · ${regionDone(S.region)}/3 مصانع`; $('#m-reward').textContent = 'حتى +300 نقطة'; }
  else { chip.textContent = 'أُنجزت ✓'; chip.style.background = '#2fb36d'; $('#m-title').textContent = 'ارجع إلى الباص'; $('#m-text').textContent = regionDone(S.region) === 3 ? 'أنجزت مصانع هذه المنطقة كلها! اركب الباص وسافر إلى منطقة أخرى.' : 'أنجزت مهمة هذا المصنع. اركب الباص إلى المصنع التالي.'; $('#m-step').textContent = `${REGIONS[S.region].name} · ${regionDone(S.region)}/3 مصانع`; $('#m-reward').textContent = '⭐'.repeat(S.done[loc.f.id]); }
  // objective marker
  const toGate = loc.kind === 'factory' && !S.done[loc.f.id];
  if (toGate) marker.position.set(loc.x, .05, -12.2); else { const d = busDoor(); marker.position.set(d.x, .22, 8.6); }
  marker.userData.ring.material.color.set(toGate ? TRACKS[loc.f.track].color : '#847bb8');
}

/* ---------------- arrival in a region: a short establishing shot, then play ---------------- */
async function enterRegion() {
  const loc = L(); bus.position.set(loc.busX, .02, LAYOUT.LANE_Z); bus.userData.door(0);
  player.root.visible = true; player.root.position.set(loc.x + 1.5, .03, -25); player.yaw = 0; camYaw = Math.PI; camPitch = .28;
  show('hud'); $('#hud').classList.add('cine'); S.cine = true; skip = false; S.mode = 'intro'; updateHUD();
  Audio_.music(REGIONS[S.region].music, { vol: .55 });
  const t0 = performance.now(), D = 4200;
  while (!skip) {
    const k = Math.min(1, (performance.now() - t0) / D), e = ease(k);
    camera.position.set(loc.x + 60 - e * 56, 42 - e * 37, 40 - e * 76); camera.lookAt(loc.x + (1 - e) * 10, 1.5, -20 - e * 6);
    sunAt(camera.position.x, -10); RW.update(1 / 60); animateDoll(player.doll, 1 / 60, 0, 'back', camera.position, player.root.position);
    renderer.render(RW.scene, camera); await frame(); if (k >= 1) break;
  }
  $('#hud').classList.remove('cine'); S.cine = false; S.mode = 'world'; skip = false; follow(0, true);
  await howto('world', 'كيف تلعب؟', touch ? [['🕹️', 'حرّك الشخصية بعصا التحكم أسفل الشاشة'], ['👆', 'اسحب على الشاشة لتدوير الكاميرا'], ['🟣', 'اتبع الدائرة البنفسجية: من المدرسة إلى الباص، ثم إلى المصانع'], ['🚌', 'في كل مصنع لعبة مختلفة، والباص ينقلك بين المصانع والمناطق']] :
    [['⌨️', 'تحرّك بالأسهم أو W A S D · Shift للجري'], ['🖱️', 'اسحب بالفأرة لتدوير الكاميرا'], ['🟣', 'اتبع الدائرة البنفسجية: من المدرسة إلى الباص، ثم إلى المصانع'], ['🚌', 'اضغط E أو الزر الظاهر للتفاعل · في كل مصنع لعبة مختلفة']]);
  toast(`مرحباً بك في ${REGIONS[S.region].name}! الباص بانتظارك عند بوابة المدرسة 🚌`, 3400);
}
function sunAt(x, z) { RW.sun.position.set(x, 0, z).addScaledVector(RW.sunDir, 120); RW.sun.target.position.set(x, 0, z); }

/* ---------------- walking ---------------- */
let near = null, stepT = 0, justArrived = false;
// the camera slides in when a palm trunk or a lamp post would come between it and the student,
// and rises over the roof when the bus is in the way
function camClear(tgt, dist) {
  const dx = Math.sin(camYaw) * Math.cos(camPitch), dz = Math.cos(camYaw) * Math.cos(camPitch), near = RW.colliders.filter(([cx, cz]) => Math.abs(cx - tgt.x) < 10 && Math.abs(cz - tgt.z) < 10);
  for (let i = 1; i <= 16; i++) {
    const d = dist * i / 16, x = tgt.x + dx * d, z = tgt.z + dz * d;
    if (near.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + .45)) return Math.max(1.6, d - .5);
  }
  return dist;
}
function busInWay(tgt, want) {
  if (!bus) return false;
  for (let i = 1; i <= 12; i++) { const k = i / 12, x = tgt.x + (want.x - tgt.x) * k, z = tgt.z + (want.z - tgt.z) * k; if (Math.abs(x - bus.position.x) < 6.8 && z > 3.6 && z < 7.6) return true; }
  return false;
}
let camDist = 6, camLift = 0;
function follow(dt, snap = false) {
  const r = player.root, tgt = new THREE.Vector3(r.position.x, r.position.y + 1.3, r.position.z), full = touch ? 6.6 : 6, want0 = camClear(tgt, full);
  camDist = snap || want0 < camDist ? want0 : camDist + (want0 - camDist) * Math.min(1, dt * 2.5); const dist = camDist;
  const want = new THREE.Vector3(tgt.x + Math.sin(camYaw) * Math.cos(camPitch) * dist, tgt.y + Math.sin(camPitch) * dist, tgt.z + Math.cos(camYaw) * Math.cos(camPitch) * dist);
  // the bus in the way: lift a little and swing round to the open side, unless the player is steering the view
  const blocked = busInWay(tgt, want), lift = blocked ? Math.max(0, 7 - want.y) : 0; camLift = snap ? lift : camLift + (lift - camLift) * Math.min(1, dt * 4); want.y += camLift;
  if (blocked && !drag) { const goal = r.position.z > bus.position.z ? 0 : Math.PI, dy = Math.atan2(Math.sin(goal - camYaw), Math.cos(goal - camYaw)); camYaw += dy * Math.min(1, dt * 2.2); }
  if (snap) camera.position.copy(want); else camera.position.lerp(want, Math.min(1, dt * 6)); camera.lookAt(tgt);
}
function act() {
  if (S.mode !== 'world') return;
  if (near === 'gate') enterFactory(L().f);
  else if (near === 'bus') openRoute();
}
function walk(dt) {
  const p = player, r = p.root, loc = L();
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
  let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + joy.y;
  const mag = Math.min(1, Math.hypot(ix, iz)), run = keys.ShiftLeft || keys.ShiftRight || (mag > .95 && touch);
  const target = mag > .1 ? (run ? 5.4 : 3.1) : 0; p.speed += (target - p.speed) * Math.min(1, dt * 8);
  let face = null;
  if (mag > .1) {
    const ang = Math.atan2(ix, iz) + camYaw, dx = Math.sin(ang), dz = Math.cos(ang);
    const ox = r.position.x, oz = r.position.z; let nx = ox + dx * p.speed * dt, nz = oz + dz * p.speed * dt;
    // walkable area: the street around this stop, plus the school yard through its gate
    nx = clamp(nx, loc.x - 36, loc.x + 36); nz = Math.min(nz, 12.6);
    const yard = loc.kind === 'school';
    if (oz < -14.2) { nx = clamp(nx, loc.x - 20.5, loc.x + 20.5); nz = Math.max(nz, -33); if (nz > -14.2 && Math.abs(nx - loc.x) > 3.4) nz = -14.4; }
    else if (nz < -13.4 && !(yard && Math.abs(nx - loc.x) < 3.4)) nz = -13.4;
    if (nx > bus.position.x - 6.4 && nx < bus.position.x + 6.4 && nz > 4.1 && nz < 7) { nx = ox; nz = oz; }
    for (const [cx, cz, cr] of [...RW.colliders, ...RW.yard]) { const ddx = nx - cx, ddz = nz - cz, d = Math.hypot(ddx, ddz), min = cr + .3; if (d < min && d > 1e-4) { nx = cx + ddx / d * min; nz = cz + ddz / d * min; } }
    r.position.x = nx; r.position.z = nz;
    p.yaw = ang; face = Math.cos(ang - camYaw) > 0 ? 'front' : 'back';
    const onWalk = nz > 7.8 || (nz < -7.8 && nz > -13.2) || Math.abs(nz) < .8; r.position.y += ((nz < -13.2 ? .03 : onWalk ? .2 : .02) - r.position.y) * Math.min(1, dt * 12);
    stepT -= dt * (p.speed / 3); if (stepT <= 0) { Audio_.sfx(`step_${1 + (Math.random() * 5 | 0)}`, .2); stepT = .42; }
  }
  animateDoll(p.doll, dt, p.speed, face, camera.position, r.position);
  follow(dt);
  sunAt(r.position.x, r.position.z);
  // interactions
  const door = busDoor(), dBus = Math.hypot(r.position.x - door.x, r.position.z - door.z);
  const dGate = loc.kind === 'factory' ? Math.hypot(r.position.x - loc.x, r.position.z + 12.8) : 99;
  if (dBus > 4) justArrived = false;
  near = dGate < 3.4 && !S.done[loc.f?.id] ? 'gate' : dBus < 2.8 && !justArrived ? 'bus' : dGate < 3.4 ? 'gate' : null;
  const btn = $('#act'); btn.classList.toggle('on', !!near); if (near) btn.textContent = near === 'gate' ? (S.done[loc.f.id] ? '🔁 العب مرة أخرى' : `ادخل ${loc.f.short}`) : '🚌 اركب الباص';
  const t = performance.now() / 1000; marker.userData.arrow.position.y = 3.2 + Math.sin(t * 2.4) * .25; marker.userData.arrow.rotation.y = t;
  // minimap
  const pos = $('#mini').pos; if (pos) { $('#mini-me').style.left = pos(r.position.x); $('#mini-bus').style.left = pos(bus.position.x); }
}

/* ---------------- the bus: route menu, boarding, the ride, arrival ---------------- */
function openRoute() {
  S.mode = 'menu'; Audio_.sfx('panel_open', .5);
  const list = $('#route-list'); list.innerHTML = '';
  RW.locs.forEach((l, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.disabled = i === S.loc;
    if (l.kind === 'school') b.innerHTML = `<span class="ic" style="background-image:url(assets/img/logo-mark.webp)"></span><span class="tx"><b>المدرسة</b><small>نقطة الانطلاق</small></span><span class="st"></span>`;
    else { const st = S.done[l.f.id] || 0; b.innerHTML = `<span class="ic" style="${l.f.logo ? `background-image:url(${l.f.logo})` : `background:${l.f.color}`}"></span><span class="tx"><b>${l.f.name}</b><small>مسار ${TRACKS[l.f.track].name} · ${l.f.title}</small></span><span class="st">${st ? '★'.repeat(st) + '☆'.repeat(3 - st) : 'جديد'}</span>`; }
    if (i === S.loc) b.querySelector('small').textContent = 'أنت هنا الآن';
    b.onclick = () => { Audio_.sfx('ui_click'); $('#route').classList.remove('on'); rideTo(i); };
    list.append(b);
  });
  $('#route').classList.add('on');
}
$('#route-close').onclick = () => { Audio_.sfx('panel_close'); $('#route').classList.remove('on'); S.mode = 'world'; };
$('#route-region').onclick = () => { Audio_.sfx('ui_click'); $('#route').classList.remove('on'); showRegions(true); };

async function cine(fn) { S.cine = true; skip = false; if (marker) marker.visible = false; let last = performance.now(); for (;;) { const now = performance.now(), dt = Math.min(.05, (now - last) / 1000); last = now; RW.update(dt); if (fn(dt) === false || skip) break; renderer.render(RW.scene, camera); await frame(); } S.cine = false; if (marker) marker.visible = true; }
async function rideTo(dest) {
  S.mode = 'ride'; show('hud'); $('#hud').classList.add('cine'); $('#act').classList.remove('on');
  const door = busDoor(), from = player.root.position.clone(), D = RW.locs[dest];
  // board: the doors open, the student walks in
  Audio_.sfx('panel_open', .6);
  camera.position.set(door.x + 6, 2.6, 15); camera.lookAt(door.x, 1.4, 7.2);
  let k = 0; await cine(dt => { k += dt / 1.6; bus.userData.door(Math.min(1, k * 2)); const e = ease(Math.min(1, k)); player.root.position.lerpVectors(from, new THREE.Vector3(door.x, .2, 7.2), e); player.speed = 2.4; animateDoll(player.doll, dt, 2.4, 'back', camera.position, player.root.position); return k < 1; });
  player.root.visible = false; bus.userData.door(0);
  // the ride
  show('ride'); $('#ride-to').textContent = D.name;
  const x0 = LAYOUT.SCHOOL_X - 20, x1 = LAYOUT.FACT_X[2] + 20, pos = x => clamp((x - x0) / (x1 - x0), 0, 1) * 100;
  $('#ride-stops').innerHTML = RW.locs.map(l => `<span style="left:${pos(l.x)}%">${l.kind === 'school' ? 'المدرسة' : l.f.short}</span>`).join('');
  Audio_.music('bus_trip', { vol: .5 });
  const shots = [
    (x, t) => [[x + 7 - t * 3, 2, 17], [x, 1.9, LAYOUT.LANE_Z]],
    (x, t) => [[x - 17, 6.5, 10], [x + 8, 2, LAYOUT.LANE_Z]],
    (x, t) => [[x + 15 + t, 1.1, 9], [x - 2, 2.2, LAYOUT.LANE_Z]],
    (x, t) => [[x - 26 + t * 4, 34, 42], [x + 14, 0, -6]]
  ];
  const drive = async (a, b, mode) => {
    const dist = b - a, T = mode === 'full' ? Math.max(6, dist / 20) : 3.4; let t = 0, prev = a, shotT = 0, shot = (Math.random() * 4) | 0;
    await cine(dt => {
      t = Math.min(T, t + dt); const u = t / T, e = mode === 'full' ? (1 - Math.cos(u * Math.PI)) / 2 : mode === 'out' ? u * u : 1 - (1 - u) * (1 - u);
      const x = a + dist * e; bus.position.x = x; const v = (x - prev) / Math.max(dt, 1e-4); prev = x; for (const w of bus.userData.wheels) w.rotation.z -= v * dt / .52;
      shotT += dt; if (shotT > 3.4) { shotT = 0; shot = (shot + 1) % shots.length; }
      const [cp, lk] = shots[shot](x, shotT); camera.position.set(...cp); camera.lookAt(...lk);
      sunAt(x, 0); $('#ride-fill').style.width = pos(x) + '%';
      return t < T;
    });
  };
  const a = bus.position.x, b = D.busX;
  if (b > a && b - a < 900) await drive(a, b, 'full');
  else { await drive(a, a + 80, 'out'); if (!skip) { flash(); await wait(200); } await drive(b - 90, b, 'in'); }
  bus.position.x = b; skip = false;
  // arrive: doors open, the student steps down
  S.loc = dest; show('hud'); $('#hud').classList.add('cine'); updateHUD();
  Audio_.music(REGIONS[S.region].music, { vol: .55 }); Audio_.sfx('panel_open', .6);
  const d2 = busDoor(); player.root.visible = true; player.root.position.set(d2.x, .2, 7.2);
  const to = new THREE.Vector3(d2.x - .4, .2, 9.6);
  camera.position.set(d2.x + 5, 2.6, 14.5); camera.lookAt(d2.x, 1.3, 8);
  k = 0; await cine(dt => { k += dt / 1.5; bus.userData.door(Math.min(1, k * 2.5)); player.root.position.lerpVectors(new THREE.Vector3(d2.x, .2, 7.2), to, ease(Math.min(1, k))); player.speed = 2.4; animateDoll(player.doll, dt, 2.4, 'front', camera.position, player.root.position); return k < 1; });
  bus.userData.door(0); player.speed = 0; player.root.position.copy(to);
  camYaw = .35; camPitch = .3; follow(0, true); justArrived = D.kind === 'factory'; $('#hud').classList.remove('cine'); S.mode = 'world'; skip = false;
  toast(D.kind === 'school' ? 'وصلت إلى المدرسة' : `وصلت إلى ${D.name} · اعبر ممر المشاة إلى البوابة`, 3200);
}

/* ---------------- factories ---------------- */
let found = 0, hover = null, hintT = 0, hints = 0, startT = 0;
async function enterFactory(F) {
  if (S.mode !== 'world') return;
  S.mode = 'loading'; curF = F; Audio_.sfx('panel_open');
  IN = await loadingScreen({ img: REGIONS[S.region].img, kicker: 'داخل المصنع', title: F.short, sub: `${F.name} · مسار ${TRACKS[F.track].name}`, from: 'البوابة', to: 'خط الإنتاج', min: 1700,
    tips: [F.brief, 'في كل مصنع لعبة مختلفة. اجمع 3 نجوم لتحصل على أعلى النقاط.'],
    task: async () => { const I = await buildInterior(renderer, F); if (renderer.compileAsync) await renderer.compileAsync(I.scene, camera).catch(() => {}); return I; } });
  await playFactory(F);
}
async function playFactory(F) {
  const T = TRACKS[F.track];
  if (F.game === 'hazard') {
    S.mode = 'factory'; show('mhud'); Audio_.music('factory_1', { vol: .5 });
    const far = camera.aspect < .8 ? 1.45 : camera.aspect < 1.2 ? 1.2 : 1;
    camera.position.copy(IN.view.target).add(IN.view.pos.clone().sub(IN.view.target).multiplyScalar(far)); camera.lookAt(IN.view.target);
    orbit = new OrbitControls(camera, renderer.domElement); orbit.target.copy(IN.view.target); orbit.enablePan = false; orbit.enableDamping = true;
    orbit.minDistance = 5; orbit.maxDistance = 22 * far; orbit.maxPolarAngle = 1.35; orbit.minPolarAngle = .35; orbit.update();
    IN.hazards.forEach(h => { h.found = false; }); found = 0; hints = 0; hintT = 0; startT = performance.now(); renderDots(); labels.forEach(l => l.el.remove()); labels.length = 0;
    if (!IN.ring) { IN.ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.15, 48), new THREE.MeshBasicMaterial({ color: '#f2c230', transparent: true, opacity: .9, depthTest: false })); IN.ring.rotation.x = -Math.PI / 2; IN.ring.renderOrder = 5; IN.ring.visible = false; IN.scene.add(IN.ring); }
    await howto('f-' + F.id, `مسار ${T.name}: ${F.title}`, [['🔎', F.brief], [touch ? '👆' : '🖱️', touch ? 'اسحب لتدوير الكاميرا · كبّر بإصبعين أو بزر ＋' : 'اسحب لتدوير الكاميرا · كبّر بعجلة الفأرة أو بزر ＋'], ['✅', 'اضغط على الخطر عندما تجده لتسجّله'], ['💡', 'محتار؟ اضغط «تلميح» · وتقدر تخرج من المصنع بأي وقت']]);
    return;
  }
  // a mini-game in front of the working factory
  S.mode = 'minigame'; show('none'); Audio_.music(F.game === 'quiz' || F.game === 'memory' ? 'factory_2' : 'factory_1', { vol: .5 });
  await howto('f-' + F.id, `مسار ${T.name}: ${F.title}`, [['🎯', F.brief], ['⭐', 'كلما كان أداؤك أدق حصلت على نجوم أكثر (حتى 3 نجوم)'], ['✕', 'تقدر تخرج من اللعبة بأي وقت من زر الإغلاق']]);
  const out = await runMiniGame(F, A);
  if (out.exit) { leaveFactory('خرجت من المصنع · يمكنك العودة في أي وقت'); return; }
  await showResult(F, out.stars);
}
function renderDots() { $('#m-dots').innerHTML = IN.hazards.map(h => `<i class="${h.found ? 'on' : ''}"></i>`).join(''); $('#m-count').textContent = `${IN.hazards.filter(h => h.found).length} / ${IN.hazards.length}`; }
const labels = [];
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let downAt = null;
function pickHazard(e) { ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(IN.hazards.map(z => z.mesh))[0]; return h ? h.object.userData.hz : null; }
cv.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
cv.addEventListener('pointermove', e => { if (S.mode !== 'factory' || e.pointerType === 'touch') return; const hz = pickHazard(e); hover = hz && !hz.found ? hz : null; cv.style.cursor = hover ? 'pointer' : ''; });
cv.addEventListener('pointerup', e => {
  if (S.mode !== 'factory' || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 10) return;
  const hz = pickHazard(e); if (!hz) { Audio_.sfx('ui_click', .25); return; } if (hz.found) return;
  hz.found = true; found++; Audio_.sfx('task_done'); Audio_.sfx('points', .5); renderDots(); hintT = 0; hover = null;
  const el = document.createElement('div'); el.className = 'label3d'; el.textContent = '✓ ' + hz.label; $('#labels').append(el); labels.push({ el, hz });
  if (found === IN.hazards.length) setTimeout(async () => { const secs = (performance.now() - startT) / 1000; orbit?.dispose(); orbit = null; await showResult(curF, hints === 0 && secs < 90 ? 3 : hints <= 1 ? 2 : 1); }, 900);
});
$('#exit-fac').addEventListener('click', () => { Audio_.sfx('panel_close'); leaveFactory('خرجت من المصنع · يمكنك العودة في أي وقت'); });
function zoom(f) { if (!orbit) return; const off = camera.position.clone().sub(orbit.target); camera.position.copy(orbit.target).add(off.setLength(clamp(off.length() * f, orbit.minDistance, orbit.maxDistance))); orbit.update(); Audio_.sfx('ui_click', .3); }
$('#zin').addEventListener('click', () => zoom(.8)); $('#zout').addEventListener('click', () => zoom(1.25));
$('#hint').addEventListener('click', () => { const left = IN?.hazards.find(h => !h.found); if (!left) return; hints++; Audio_.sfx('panel_open', .4); hover = left; toast('تلميح: ' + ({ oil: 'انظر إلى ممر المشاة الأخضر', exit: 'تفقّد مخرج الطوارئ على الجدار الأيمن', panel: 'هل كل الأبواب على الجدار الأيسر مغلقة؟' })[left.key], 3000); setTimeout(() => { if (hover === left) hover = null; }, 2500); });

async function showResult(F, stars) {
  S.mode = 'result'; const T = TRACKS[F.track], before = badgeSet().has(F.track), prevBest = S.done[F.id] || 0;
  if (stars > prevBest) { S.done[F.id] = stars; persist(); }
  const gained = Math.max(0, stars - prevBest) * 100, newBadge = stars > 0 && !before;
  $('#done-badge').src = T.badge; $('#done-badge').style.filter = stars ? '' : 'grayscale(1) opacity(.5)';
  $('#done-title').textContent = stars ? (stars === 3 ? 'أداء مذهل!' : 'أحسنت!') : 'حاول مرة أخرى';
  $('#done-stars').innerHTML = [0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}">★</i>`).join('');
  $('#done-text').textContent = stars ? `أنهيت مهمة «${F.title}» في ${F.name}.${newBadge ? ` حصلت على شارة ${T.name}!` : ''}` : 'لم تكتمل المهمة هذه المرة. أعد المحاولة لتحصل على نجومك.';
  $('#done-pts').textContent = gained ? `+${gained} نقطة` : stars ? 'سجّلت أفضل نتيجة لديك سابقاً' : '';
  $('#done-retry').hidden = stars === 3; $('#done-ok').textContent = stars ? 'متابعة الرحلة' : 'خروج من المصنع';
  show('done'); Audio_.music(stars ? 'mission_complete' : 'factory_2', { loop: false, vol: .7 }); if (stars) Audio_.sfx('level_up', .6);
  return new Promise(res => {
    $('#done-retry').onclick = async () => { Audio_.sfx('ui_click'); res(); await playFactory(F); };
    $('#done-ok').onclick = () => { Audio_.sfx('ui_click'); res(); leaveFactory(stars ? `+${gained} نقطة · ${'⭐'.repeat(stars)}` : ''); if (doneCount() === 12 && stars) setTimeout(finale, 900); else if (regionDone(S.region) === 3 && stars) setTimeout(() => toast(`أنجزت مصانع ${REGIONS[S.region].name} كلها! اركب الباص وسافر إلى منطقة أخرى 🗺️`, 4200), 1200); };
  });
}
function leaveFactory(msg) {
  orbit?.dispose(); orbit = null; labels.forEach(l => l.el.remove()); labels.length = 0; cv.style.cursor = ''; hover = null;
  if (IN) { IN.dispose(); IN = null; }
  const loc = L(); player.root.visible = true; player.root.position.set(loc.x, .2, -11.6); player.yaw = 0; camYaw = .25; camPitch = .3; follow(0, true);
  S.mode = 'world'; show('hud'); Audio_.music(REGIONS[S.region].music, { vol: .55 }); updateHUD(); if (msg) toast(msg, 2600);
}
function leaveAnyFactory() { orbit?.dispose(); orbit = null; if (IN) { IN.dispose(); IN = null; } $('#mg')?.classList.remove('on'); }

/* ---------------- the finale ---------------- */
let finT = 0;
function finale() {
  S.mode = 'menu'; show('final'); Audio_.music('awards', { loop: false, vol: .8 }); clearTimeout(finT); finT = setTimeout(() => { if ($('#final').classList.contains('on')) Audio_.music('theme_song', { vol: .6 }); }, 11000);
  $('#fin-text').textContent = `${nameOf(S.char)}، زرت 12 مصنعاً في 4 مناطق وجمعت شارات المسارات.`;
  $('#fin-badges').innerHTML = Object.entries(TRACKS).map(([k, t]) => `<img src="${t.badge}" alt="${t.name}" class="${badgeSet().has(k) ? '' : 'off'}">`).join('');
  $('#fin-pts').textContent = `${points().toLocaleString('en')} نقطة`;
  const c = $('#fin-fx'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
  const cols = ['#847bb8', '#3c58a7', '#f2c230', '#2fb36d', '#ffffff', '#e45b8f'], ps = Array.from({ length: 160 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height, v: 60 + Math.random() * 120, r: Math.random() * 6, s: 4 + Math.random() * 6, c: cols[Math.random() * cols.length | 0] }));
  let last = performance.now(); (function fx(now) { if (!$('#final').classList.contains('on')) return; const dt = clamp((now - last) / 1000, 0, .05); last = now; x.clearRect(0, 0, c.width, c.height); for (const p of ps) { p.y += p.v * dt; p.r += dt * 4; if (p.y > c.height + 10) p.y = -10; x.save(); x.translate(p.x + Math.sin(p.r) * 10, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); } requestAnimationFrame(fx); })(last);
}
$('#fin-ok').onclick = () => { Audio_.sfx('ui_click'); show('hud'); S.mode = 'world'; Audio_.music(REGIONS[S.region].music, { vol: .55 }); };

/* ---------------- loop ---------------- */
function loop() {
  const dt = Math.min(.05, clock.getDelta());
  if (S.mode === 'world' && RW) { RW.update(dt); walk(dt); renderer.render(RW.scene, camera); }
  else if (S.mode === 'factory' && IN) {
    IN.update(dt); orbit?.update();
    for (const { el, hz } of labels) { const v = hz.anchor.clone().project(camera); el.style.display = v.z < 1 ? '' : 'none'; el.style.left = (v.x * .5 + .5) * innerWidth + 'px'; el.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; }
    IN.ring.visible = !!hover; if (hover) { IN.ring.position.set(hover.mesh.position.x, .05, hover.mesh.position.z); IN.ring.scale.setScalar(1 + Math.sin(performance.now() / 160) * .08); }
    hintT += dt; if (hintT > 25) { hintT = 0; toast('محتار؟ اضغط زر «تلميح» 💡', 2400); }
    renderer.render(IN.scene, camera);
  }
  else if ((S.mode === 'minigame' || S.mode === 'result') && IN) {
    IN.update(dt); const t = performance.now() / 1000; camera.position.set(Math.sin(t * .08) * 14, 6 + Math.sin(t * .13), 12 + Math.cos(t * .08) * 4); camera.lookAt(0, 1.2, -2);
    renderer.render(IN.scene, camera);
  }
  else if ((S.mode === 'menu' || S.mode === 'result') && RW && ($('#route').classList.contains('on') || $('#done').classList.contains('on') || $('#regions').classList.contains('on'))) { RW.update(dt); renderer.render(RW.scene, camera); }
  requestAnimationFrame(loop);
}
loop();

/* ---------------- test hooks for automated screenshots ---------------- */
window.__game = { S, show, Audio_, startRegion, enterFactory, rideTo, act, camera, busDoor, L, get bus() { return bus; }, get RW() { return RW; }, get player() { return player; }, get IN() { return IN; } };
(async () => {
  const auto = Q.get('auto');
  if (!auto) { window.__ready = true; return; }
  $('#splash').classList.remove('on'); spFx.stop(); S.char = Q.get('c') || S.char;
  if (auto === 'title') { showTitle(); }
  else if (auto === 'mg') { const F = ALL.find(f => f.id === Q.get('id')); show('none'); runMiniGame(F, A); }
  else {
    const F = Q.get('id') ? ALL.find(f => f.id === Q.get('id')) : null, r = F ? F.region : Q.get('r') || 'riyadh';
    skip = true; await startRegion(r);
    while (S.mode !== 'world') { skip = true; await wait(100); }
    if (auto === 'ride') { rideTo(+(Q.get('to') || 1)); await wait(+(Q.get('t') || 4000)); }
    else if (F) { const i = RW.locs.findIndex(l => l.f?.id === F.id); S.loc = i; bus.position.x = RW.locs[i].busX; player.root.position.set(F ? RW.locs[i].x : 0, .2, -11.5); updateHUD(); if (auto === 'factory') { S.mode = 'world'; enterFactory(F); while (!IN || S.mode === 'loading') await wait(100); if (Q.get('ht') === '0') { await wait(300); $('#ht-ok').click(); } await wait(+(Q.get('t') || 800)); } }
  }
  window.__ready = true;
})();

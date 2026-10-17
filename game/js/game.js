import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildRegion } from './world.js';
import { C, WALL, BAYS, NET, BOUNDS, routeBus, polyAt, groundY, onRoad } from './city.js';
import { makeBus, makeBusGLB } from './bus.js';
import { buildInterior } from './interior.js';
import { missionFor } from './missions.js';
import { runMiniGame } from './games.js';
import { REGIONS, ORDER, TRACKS, ALL } from './regions.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { makeDoll, animateDoll } from './doll.js';
import { canvas, toTex } from './tex.js';
import { Ambient } from './fx.js';
import { makeLife } from './life.js';
import { makeSignals } from './signals.js';
import { makeRobot } from './robot.js';
import { addTour, GEAR_GEO, GEAR_MAT, FSTYLE } from './tour.js';
const CITY_GEARS = [[-110, -85.5, 1.2], [-90, 33, 1.2], [-175, 105, 1.2], [82, -17, 1.2], [175, -40, 1.2], [65, 60, 1.75]];
import { TOUR, PPE, PPE_ICON } from './content.js';
import { buildFinale, certificate } from './finale.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const Q = new URLSearchParams(location.search);
const touch = matchMedia('(pointer: coarse)').matches; if (touch) document.body.classList.add('touch');
const wait = ms => new Promise(r => setTimeout(r, ms));
const frame = () => new Promise(requestAnimationFrame);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const clamp = THREE.MathUtils.clamp;
const TS = +Q.get('ts') || 1; window.__TS = TS; // test runs can speed time up
const store = { get(k, d) { try { const v = localStorage.getItem('fi.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } }, set(k, v) { try { localStorage.setItem('fi.' + k, JSON.stringify(v)); } catch {} } };

/* ---------------- audio: music + effects, each with its own volume ----------------
   Everything runs through one Web Audio graph (a music bus and an effects bus), so the volume sliders
   also work on iPhones, where <audio>.volume is read-only. Two <audio> decks cross-fade the music; the
   short effects are decoded once and played from memory. Browsers allow sound only after the first
   tap, so the graph is unlocked on the first touch, click or key (and tried at load for returning visitors). */
const SFX = ['ui_click', 'ui_hover', 'task_done', 'wrong', 'points', 'level_up', 'panel_open', 'panel_close', 'step_1', 'step_2', 'step_3', 'step_4', 'step_5', 'factory_metal', 'pin_drop', 'bus_brake', 'bus_door_open', 'bus_door_close', 'bus_horn', 'jump', 'land'];
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
const A = { sfx: (n, v) => Audio_.sfx(n, v), get char() { return S.char; }, get name() { return fullName(); } };
/* the coach's diesel engine, synthesized live: it loops without a seam and its pitch follows the bus */
const Engine = {
  on: false,
  start() {
    if (this.on || !Audio_.running) return; const c = Audio_.ctx; this.on = true;
    this.out = c.createGain(); this.out.gain.value = 0; this.out.connect(Audio_.sBus);
    this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 220; this.lp.Q.value = .9; this.lp.connect(this.out);
    const chug = c.createGain(); chug.gain.value = .55; chug.connect(this.lp);
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth'; this.o1.frequency.value = 32; this.o1.connect(chug);
    this.o2 = c.createOscillator(); this.o2.type = 'square'; this.o2.frequency.value = 16; const g2 = c.createGain(); g2.gain.value = .45; this.o2.connect(g2).connect(chug);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.ns = c.createBufferSource(); this.ns.buffer = nb; this.ns.loop = true;
    const nf = c.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 140; nf.Q.value = .8; const ng = c.createGain(); ng.gain.value = .4; this.ns.connect(nf).connect(ng).connect(chug);
    // the diesel's firing pulses: a low LFO beating the level
    this.lfo = c.createOscillator(); this.lfo.frequency.value = 14; const lg = c.createGain(); lg.gain.value = .3; this.lfo.connect(lg).connect(chug.gain);
    for (const n of [this.o1, this.o2, this.ns, this.lfo]) n.start();
  },
  set(rpm, vol) {
    if (!this.on) return; const t = Audio_.ctx.currentTime, f = 30 + rpm * 40;
    this.o1.frequency.setTargetAtTime(f, t, .2); this.o2.frequency.setTargetAtTime(f / 2, t, .2); this.lfo.frequency.setTargetAtTime(f / 2.2, t, .2);
    this.lp.frequency.setTargetAtTime(190 + rpm * 560, t, .25); this.out.gain.setTargetAtTime(vol, t, .3);
  }
};
let busV = 0;
function updateEngine() {
  if (!RW || !bus || !Audio_.running) return; Engine.start();
  const audible = ['world', 'intro', 'ride', 'drive'].includes(S.mode) || $('#route').classList.contains('on'), d = camera.position.distanceTo(bus.position);
  Engine.set(clamp(.06 + Math.abs(busV) / 22, 0, 1), audible ? .5 * Math.pow(clamp(1 - d / 55, 0, 1), 1.4) * (S.mode === 'ride' ? 1.2 : 1) : 0);
}
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
$('#robot-on').checked = store.get('robot', true);
$('#robot-on').addEventListener('change', e => { S.robot = e.target.checked; store.set('robot', S.robot); Audio_.sfx('ui_click'); if (!S.robot) { talkQ.q.length = 0; talkQ.cur = null; if (!talkQ.busy) $('#talk').hidden = true; } else robo?.wave(1.5); });
$('#mute-all').addEventListener('click', () => { const on = Audio_.musicVol > 0 || Audio_.sfxVol > 0; vm.value = vs.value = on ? 0 : 80; vm.dispatchEvent(new Event('input')); vs.dispatchEvent(new Event('input')); });

/* ---------------- state ---------------- */
const saved = store.get('save', {});
const S = { robot: store.get('robot', true), char: saved.char || 'boy', name: saved.name || '', track: saved.track || null, done: saved.done || {}, xp: saved.xp || 0, gears: saved.gears || {}, facts: saved.facts || {}, quiz: saved.quiz || {}, region: null, loc: 0, mode: 'menu', cine: false };
// the student's own name: the first word in speech and on the HUD, the full name on the pass and the certificate
const fullName = () => S.name.trim() || (S.char === 'boy' ? 'فهد' : 'سارة');
const nameOf = () => fullName().split(/\s+/)[0];
const persist = () => store.set('save', { char: S.char, name: S.name, track: S.track, done: S.done, xp: S.xp, gears: S.gears, facts: S.facts, quiz: S.quiz });
/* progress is kept per track ("creative:rabie" → stars), so the same factory can be visited again on another track */
const trackOf = () => S.track || 'discoverer';
const MS = F => missionFor(F, trackOf());
const dk = (fid, t = trackOf()) => `${t}:${fid}`;
const best = (fid, t) => S.done[dk(fid, t)] || 0;
for (const k of Object.keys(S.done)) if (!k.includes(':')) { const f = ALL.find(x => x.id === k); if (f) S.done[`${f.track}:${k}`] = Math.max(S.done[`${f.track}:${k}`] || 0, S.done[k]); delete S.done[k]; }
const points = () => Object.values(S.done).reduce((a, s) => a + s * 100, 0) + S.xp;
const doneCount = t => ALL.filter(f => best(f.id, t) > 0).length;
const badgeSet = () => new Set(Object.keys(TRACKS).filter(t => ALL.some(f => best(f.id, t) > 0)));
const regionDone = r => REGIONS[r].factories.filter(f => best(f.id) > 0).length;

function show(id) { $$('.screen').forEach(s => { if (s.id !== 'mg') s.classList.toggle('on', s.id === id); }); $('#home').hidden = !['hud', 'mhud', 'ride', 'drive'].includes(id); $('#cam').hidden = !['hud', 'drive'].includes(id); }
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
const nameFx = new Ambient($('#name-fx'), { motes: 30, net: 20, netArea: [0, 0, 1, 1], color: '200,190,255', mouse: true });
const trkFx = new Ambient($('#trk-fx'), { motes: 30, net: 20, netArea: [0, 0, 1, 1], color: '200,190,255', mouse: true });
const FX = { pick: pickFx, namecard: nameFx, tracks: trkFx, regions: regFx };
/* the four tracks: the choice decides every factory's mission */
function showTracks() {
  $('#track-list').innerHTML = Object.entries(TRACKS).map(([k, t]) => { const n = doneCount(k); return `<button class="tcard${S.track === k ? ' sel' : ''}" type="button" data-t="${k}" style="--c:${t.color}">${n ? `<span class="done">${n}/12</span>` : ''}<img src="${t.badge}" alt=""><b>${t.name}</b><p>${t.desc}</p><ul class="tm">${t.missions.map(([i, n]) => `<li><i>${i}</i>${n}</li>`).join('')}</ul><span class="sk">${t.skills.map(x => `<i>${x}</i>`).join('')}</span></button>`; }).join('');
  $$('#track-list .tcard').forEach(b => { b.addEventListener('pointerenter', () => !touch && Audio_.sfx('ui_hover', .25)); b.addEventListener('click', () => { Audio_.sfx('task_done', .5); $$('#track-list .tcard').forEach(x => x.classList.toggle('sel', x === b)); S.track = b.dataset.t; persist(); setTimeout(() => showRegions(), 420); }); });
  show('tracks'); trkFx.start();
}
$$('[data-back]').forEach(b => b.addEventListener('click', () => {
  Audio_.sfx('panel_close'); const to = b.dataset.back;
  if (b.id === 'reg-back' && RW) { show('hud'); S.mode = 'world'; return; }
  if (to === 'title') showTitle(); else if (to === 'namecard') showNameCard(); else if (to === 'tracks') showTracks(); else { show(to); FX[to]?.start(); }
}));
$$('.pcard').forEach(b => b.addEventListener('click', () => {
  Audio_.sfx('task_done', .5); $$('.pcard').forEach(x => x.classList.toggle('sel', x === b));
  S.char = b.dataset.c; persist();
  setTimeout(() => showNameCard(), 420);
}));
/* the participant's card: the full name is asked once and kept for the certificate */
function showNameCard() {
  $('#id-photo').style.backgroundImage = `url(assets/ui/${S.char}_front_cut.webp)`;
  const inp = $('#id-name'); inp.value = S.name; inp.placeholder = S.char === 'boy' ? 'مثال: فهد عبدالله القحطاني' : 'مثال: سارة محمد العتيبي'; inp.classList.remove('bad'); $('#id-err').textContent = '';
  show('namecard'); nameFx.start(); if (!touch) setTimeout(() => inp.focus(), 500);
}
$('#id-form').addEventListener('submit', e => {
  e.preventDefault(); const inp = $('#id-name'), v = inp.value.replace(/\s+/g, ' ').trim();
  const bad = v.length < 3 ? 'اكتب اسمك الكامل كما تريده على الشهادة' : !/^[\p{L}\p{M} .'-]+$/u.test(v) ? 'استخدم الحروف فقط في الاسم' : v.split(' ').length < 2 ? 'اكتب اسمك واسم العائلة على الأقل' : '';
  if (bad) { inp.classList.remove('bad'); void inp.offsetWidth; inp.classList.add('bad'); $('#id-err').textContent = bad; Audio_.sfx('wrong', .4); return; }
  S.name = v; persist(); inp.blur(); Audio_.sfx('task_done', .5); setTimeout(() => showTracks(), 250);
});
$('#id-name').addEventListener('input', () => { $('#id-name').classList.remove('bad'); $('#id-err').textContent = ''; });
function showRegions(travel = false) {
  $('#reg-title').textContent = travel ? 'إلى أي منطقة تسافر؟' : 'إلى أين تتجه الرحلة؟';
  { const T = TRACKS[trackOf()]; $('#reg-sub').innerHTML = `<span class="trk-chip" style="--c:${T.color}"><img src="${T.badge}" alt="">مسار ${T.name}</span> في كل منطقة مدرسة تنطلق منها، وثلاثة مصانع بمهام مسارك`; }
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
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .25, 4000);
// portrait phones get a wider lens so the street and the factory floor still fit
const fitCam = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.fov = camera.aspect < .8 ? 64 : camera.aspect < 1.2 ? 56 : 50; camera.updateProjectionMatrix(); };
addEventListener('resize', fitCam); fitCam();
const clock = new THREE.Clock();

let RW = null, bus = null, player = null, marker = null, orbit = null, IN = null, curF = null, life = null, signals = null;
const dolls = {};

/* ---------------- loading screen ---------------- */
const TIPS = ['مسارك يحدد مهمتك في كل مصنع: المكتشف يفحص، المبدع يبتكر، الفنان يصمم، والسفير يروّج.', 'اجمع الشارات الأربع لتصبح من صناعيو المستقبل.', 'جوائز هاكثون صناعيو المستقبل تصل إلى 200,000 ريال.', 'انتبه لعلامات السلامة داخل المصنع… قد تكون جزءاً من مهمتك!', 'زيارة المصانع تكشف لك كيف تُصنع الأشياء التي تستخدمها كل يوم.'];
const ldFx = new Ambient($('#ld-fx'), { motes: touch ? 30 : 50, net: 12, netArea: [0, .02, 1, .3] });
const prog = { v: 0 }; THREE.DefaultLoadingManager.onProgress = (u, a, b) => { prog.v = Math.max(prog.v, a / b); };
/* the loading screen is a boarding pass: a ticket for a trip between regions, a visitor's pass for a factory.
   The coach (or the hard hat) travels the route left to right as things load, then the pass is stamped. */
function drawQR(seed) {
  const c = $('#tk-qr'), x = c.getContext('2d'), N = 25; let s = seed * 7919 + 13; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  x.fillStyle = '#fff'; x.fillRect(0, 0, N, N); x.fillStyle = '#1b2263';
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) if (r() < .5) x.fillRect(i, j, 1, 1);
  for (const [cx, cy] of [[0, 0], [N - 7, 0], [0, N - 7]]) { x.fillStyle = '#fff'; x.fillRect(cx, cy, 8, 8); x.fillStyle = '#1b2263'; x.fillRect(cx, cy, 7, 7); x.fillStyle = '#fff'; x.fillRect(cx + 1, cy + 1, 5, 5); x.fillStyle = '#1b2263'; x.fillRect(cx + 2, cy + 2, 3, 3); }
}
async function loadingScreen({ img, kicker, title, sub, from = 'البيت', to = 'المصنع', kind = 'trip', meta2 = '', tips = TIPS, task, min = 2400 }) {
  show('loading'); prog.v = 0; $('#ld-bg').style.backgroundImage = `url(${img})`; $('#ld-kicker').textContent = kicker; $('#ld-title').textContent = title; $('#ld-sub').textContent = sub;
  const trip = kind === 'trip', no = 100 + (Math.random() * 899 | 0);
  $('#tk-kind').textContent = trip ? 'تذكرة رحلة · باص المبادرة' : 'تصريح زيارة المصنع'; $('#tk-no').textContent = `FI-${no}`;
  $('#tk-from').textContent = from; $('#tk-to').textContent = to; $('#tk-name').textContent = fullName(); $('#tk-av').style.backgroundImage = `url(assets/ui/${S.char}_front_cut.webp)`;
  $('#tk-m2k').textContent = trip ? 'الوجهة' : 'المسار'; $('#tk-m2').textContent = meta2 || to;
  $('#tk-m3k').textContent = trip ? 'البوابة' : 'الوردية'; $('#tk-m3').textContent = trip ? String(1 + no % 6) : 'صباحية';
  $('#tk-m4k').textContent = trip ? 'المقعد' : 'الخوذة'; $('#tk-m4').textContent = trip ? `${String(1 + no % 14).padStart(2, '0')}${'ABCD'[no % 4]}` : 'صفراء';
  $('#tk-stamp').textContent = trip ? 'تم الصعود ✓' : 'مسموح بالدخول ✓'; $('#tk-stamp').classList.remove('on');
  $('#tk-mover').innerHTML = $(trip ? '#tk-bus' : '#tk-hat').innerHTML; drawQR(no);
  $('#tk-stat').textContent = 'جاري التجهيز';
  for (const e of [...$$('.ld-head > *'), $('.tk-wrap')]) { e.style.animation = 'none'; void e.offsetWidth; e.style.animation = ''; } ldFx.start();
  const tipEl = $('#ld-tip'); let ti = Math.random() * tips.length | 0; tipEl.textContent = tips[ti];
  const tipT = setInterval(() => { tipEl.style.opacity = 0; setTimeout(() => { ti = (ti + 1) % tips.length; tipEl.textContent = tips[ti]; tipEl.style.opacity = 1; }, 350); }, 3400);
  const path = $('#tk-path'), len = path.getTotalLength(), done = $('#tk-done'), mover = $('#tk-mover'), track = $('.tk-track'), pct = $('#ld-pct'), t0 = performance.now();
  let shown = 0, doneTask = false, out;
  const set = v => {
    shown = v; pct.textContent = Math.round(v * 100) + '%'; done.style.strokeDashoffset = 1 - v;
    const w = track.clientWidth, h = track.clientHeight, a = path.getPointAtLength(v * len), b = path.getPointAtLength(Math.min(len, v * len + 4)), c = path.getPointAtLength(Math.max(0, v * len - 4));
    const ang = Math.atan2((b.y - c.y) * h / 70, (b.x - c.x) * w / 400);
    mover.style.left = a.x / 400 * w + 'px'; mover.style.top = a.y / 70 * h + 'px'; mover.style.transform = `rotate(${ang}rad)`;
  }; set(0);
  const tick = setInterval(() => { const el = (performance.now() - t0) / min, target = doneTask ? 1 : Math.min(.92, Math.max(el * .7, prog.v * .9)); set(shown + (target - shown) * .18); }, 60);
  try { out = await task(); } finally { doneTask = true; }
  while (performance.now() - t0 < min || shown < .995) await wait(60);
  clearInterval(tick); clearInterval(tipT); set(1);
  // the stamp comes down on the pass
  $('#tk-stat').textContent = 'جاهز'; $('#tk-stamp').classList.add('on'); Audio_.sfx('pin_drop', .7); await wait(850); ldFx.stop();
  return out;
}

/* ---------------- regions ---------------- */
async function startRegion(key) {
  const R = REGIONS[key];
  Audio_.music('bus_trip', { vol: .5 }); S.mode = 'loading';
  await loadingScreen({ img: R.img, kicker: S.region && S.region !== key ? 'السفر بالباص إلى' : 'المنطقة', title: R.name, sub: `${R.sub} · ${R.factories.map(f => f.short).join(' · ')}`, from: S.region && S.region !== key ? REGIONS[S.region].name : 'البيت', to: R.name, meta2: R.sub, task: () => loadRegion(key) });
  S.region = key; S.loc = 0; enterRegion();
}
async function loadRegion(key) {
  if (RW && RW.key === key) return;
  if (RW) { RW.scene.remove(bus, marker, player?.root); if (robo) RW.scene.remove(robo.group); RW.dispose(); RW = null; life = null; signals = null; }
  const w = await buildRegion(renderer, key); w.key = key;
  bus ||= await makeBusGLB().catch(e => { console.warn('bus model', e); return makeBus(); }); w.scene.add(bus);
  marker ||= makeMarker(); w.scene.add(marker);
  player = await getPlayer(S.char, w.tint); w.scene.add(player.root);
  robo ||= await makeRobot().catch(e => { console.warn('robot', e); return null; }); if (robo) w.scene.add(robo.group);
  signals = makeSignals(w.scene, NET); w.colliders.push(...signals.colliders);
  life = await makeLife(w.scene, { signals }).catch(e => { console.warn('street life', e); return null; });
  // golden gears hidden around the district (one is up high: it takes a jump)
  w.gears = CITY_GEARS.map(([x, z, y], i) => { const id = `city-${key}-${i}`, m = new THREE.Mesh(GEAR_GEO, GEAR_MAT); m.position.set(x, y, z); m.scale.setScalar(1.3); m.castShadow = true; m.visible = !S.gears[id]; w.scene.add(m); return { id, m, y }; });
  renderer.toneMappingExposure = w.exposure;
  if (renderer.compileAsync) await renderer.compileAsync(w.scene, camera).catch(() => {});
  RW = w;
}
async function getPlayer(kind, tint) {
  if (!dolls[kind]) { const hero = await loadHero(kind); dolls[kind] = hero ? { hero, speed: 0, yaw: 0 } : { doll: await makeDoll(kind), speed: 0, yaw: 0 }; }
  const p = dolls[kind]; p.root = p.hero ? p.hero.root : p.doll.root;
  if (!p.hero) p.root.traverse(o => { if (o.material?.color && !o.userData.blob) o.material.color.set(tint); });
  if (!p.root.userData.blob) { const [c, x] = canvas(128, 128); const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(10,14,40,.42)'); g.addColorStop(1, 'rgba(10,14,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: toTex(c), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = .02; blob.userData.blob = true; blob.renderOrder = 1; p.root.add(blob); p.blob = blob; p.root.userData.blob = true; }
  return p;
}
/* 3D characters: rigged GLB files with Mixamo bone names. Clips are picked by name (walk, run, idle) from
   every file listed; a kind without a model keeps the paper-doll rig. */
const HEROES = { boy: ['assets/chars/boy.glb'], girl: ['assets/chars/girl.glb'] }, HERO_H = 1.5;
async function loadHero(kind) {
  const files = HEROES[kind]; if (!files) return null;
  try {
    const loader = new GLTFLoader(), [main, ...extra] = await Promise.all(files.map(f => loader.loadAsync(f)));
    const model = main.scene, box = new THREE.Box3().setFromObject(model), s = HERO_H / (box.max.y - box.min.y);
    model.scale.setScalar(s); model.position.y = -box.min.y * s;
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    const baseY = model.position.y;
    const clips = [main, ...extra].flatMap(g => g.animations), mixer = new THREE.AnimationMixer(model), act = {};
    for (const [k, re] of [['walk', /walk/i], ['run', /run|jog/i], ['idle', /idle|breath|stand/i]]) { const c = clips.find(x => re.test(x.name)); if (c) act[k] = mixer.clipAction(c); }
    if (!act.walk && clips[0]) act.walk = mixer.clipAction(clips[0]);
    for (const a of Object.values(act)) { a.play(); a.setEffectiveWeight(0); }
    const bones = {}; model.traverse(o => { if (o.isBone) bones[o.name.replace(/^mixamorig:?/, '')] = o; });
    const root = new THREE.Group(); root.add(model);
    const h = { root, model, mixer, act, bones, baseY, w: { walk: 0, run: 0 }, yaw: 0, t: 0, last: null, tweak: [] };
    h.pace = { walk: pace(h, act.walk), run: pace(h, act.run) };
    return h;
  } catch (e) { console.warn('hero model', kind, e); return null; }
}
// metres per second a clip covers at normal speed: how fast the planted foot slides back under the body
function pace(h, action) {
  const foot = h.bones.LeftFoot; if (!action || !foot) return 1;
  const c = action.getClip(), v = new THREE.Vector3(), N = 96, zs = [];
  for (const a of Object.values(h.act)) a.setEffectiveWeight(a === action ? 1 : 0);
  for (let i = 0; i <= N; i++) { h.mixer.setTime(c.duration * i / N); h.root.updateMatrixWorld(true); zs.push(foot.getWorldPosition(v).z); }
  for (const a of Object.values(h.act)) a.setEffectiveWeight(0); h.mixer.setTime(0);
  const back = []; for (let i = 1; i <= N; i++) { const d = (zs[i] - zs[i - 1]) / (c.duration / N); if (d < 0) back.push(-d); }
  back.sort((a, b) => a - b); return back.length ? Math.max(.3, back[back.length >> 1]) : 1;
}
function faceHero(yaw) { const h = player?.hero; if (h) { h.yaw = h.model.rotation.y = yaw; h.last = null; } }
/* speed in m/s, or null to take it from how far the character moved this frame */
function animatePlayer(p, dt, speed, face) {
  if (!p.hero) { animateDoll(p.doll, dt, speed ?? p.speed, face, camera.position, p.root.position); return; }
  const h = p.hero, pos = p.root.position;
  h.last ||= pos.clone();
  const dx = pos.x - h.last.x, dz = pos.z - h.last.z, moved = Math.hypot(dx, dz) < 2 ? Math.hypot(dx, dz) : 0; h.last.copy(pos);
  const v = speed ?? (dt > 0 ? moved / dt : 0);
  if (moved > 1e-4 && v > .3) h.yaw = Math.atan2(dx, dz);
  const turn = Math.atan2(Math.sin(h.yaw - h.model.rotation.y), Math.cos(h.yaw - h.model.rotation.y)); h.model.rotation.y += turn * Math.min(1, dt * 10);
  // walk and run blend by speed; standing still eases back to the rest pose (or the idle clip)
  const moveK = clamp(v / .5, 0, 1), runK = h.act.run ? clamp((v - 2.4) / 1.2, 0, 1) : 0, f = Math.min(1, dt * 8);
  h.w.walk += (moveK * (1 - runK) - h.w.walk) * f; h.w.run += (moveK * runK - h.w.run) * f;
  h.act.walk?.setEffectiveWeight(h.w.walk); h.act.run?.setEffectiveWeight(h.w.run); h.act.idle?.setEffectiveWeight(1 - h.w.walk - h.w.run);
  if (h.act.walk) h.act.walk.timeScale = p.jy > .05 ? .25 : clamp(v / h.pace.walk, .7, 3);
  if (h.act.run) h.act.run.timeScale = clamp(v / h.pace.run, .7, 1.8);
  // small procedural touches: breathing and a glance around while standing, a forward lean when hurrying
  for (const [b, ax, a] of h.tweak) b.rotation[ax] -= a; h.tweak.length = 0;
  h.mixer.update(dt); h.t += dt;
  const still = clamp(1 - h.w.walk - h.w.run, 0, 1), B = h.bones, add = (b, ax, a) => { if (b && a) { b.rotation[ax] += a; h.tweak.push([b, ax, a]); } };
  if (!h.act.idle) { add(B.Spine2, 'x', Math.sin(h.t * 2.1) * .02 * still); add(B.Head, 'y', Math.sin(h.t * .45) * .2 * still); add(B.LeftArm, 'z', Math.sin(h.t * 2.1) * .02 * still); add(B.RightArm, 'z', -Math.sin(h.t * 2.1) * .02 * still); }
  if (!h.act.run) add(B.Spine, 'x', clamp((v - 2) / 1.6, 0, 1) * .14);
}

function makeMarker() {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 48), new THREE.MeshBasicMaterial({ color: '#847bb8', transparent: true, opacity: .85, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = .05; g.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#9b93d6', transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 3; g.add(beam);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 4), new THREE.MeshStandardMaterial({ color: '#3c58a7', emissive: '#3c58a7', emissiveIntensity: .6 })); arrow.rotation.x = Math.PI; arrow.position.y = 3.4; g.add(arrow); g.userData = { arrow, ring };
  return g;
}
const L = () => RW.locs[S.loc];
const UPV = new THREE.Vector3(0, 1, 0);
// the coach's door in the world, wherever it stands and however it is turned
const busDoor = () => { const d = bus.userData.doorPos; return new THREE.Vector3(d.x, 0, d.z + .2).applyAxisAngle(UPV, bus.rotation.y).add(bus.position).setY(.2); };
function parkAt(id) { const b = BAYS[id]; S.bay = id; bus.position.set(b.x, .02, b.z); bus.rotation.y = b.yaw; bus.userData.door(0); }
const locOfBay = id => RW.locs.findIndex(l => l.bay?.id === id);
/* is (x, z) inside a footprint (centre, yaw, half length, half width), grown by m? cars face +z at yaw 0, the coach +x */
function inBox(x, z, cx, cz, yaw, hl, hw, m = 0, car = false) { const dx = x - cx, dz = z - cz, c = Math.cos(yaw), s = Math.sin(yaw), al = car ? dx * s + dz * c : dx * c - dz * s, la = car ? dx * c - dz * s : dx * s + dz * c; return Math.abs(al) < hl + m && Math.abs(la) < hw + m; }
const inBus = (x, z, m = 0) => inBox(x, z, bus.position.x, bus.position.z, bus.rotation.y, bus.userData.halfLen, bus.userData.halfWid, m);
const heightAt = (x, z) => { for (const [x0, z0, x1, z1, y] of RW.pads) if (x >= x0 && x <= x1 && z >= z0 && z <= z1) return y; return groundY(x, z); };
const angTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/* ---------------- input ---------------- */
const keys = {}; let joy = { x: 0, y: 0 }, camYaw = Math.PI, camPitch = .3, drag = null, skip = false;
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'Space' && (S.mode === 'world' || S.mode === 'tour') && !talkQ.busy) { e.preventDefault(); if (!e.repeat) jumpReq = true; } if (e.code === 'KeyE' && (S.mode === 'world' || S.mode === 'tour') && !talkQ.busy) act(); if (e.code === 'KeyE' && S.mode === 'drive') driveAct(); if (e.code === 'KeyH' && S.mode === 'drive' && !e.repeat) honk(); if (e.code === 'KeyC' && !e.repeat && ['world', 'tour', 'drive'].includes(S.mode) && !talkQ.busy) cycleCam(); if (['Space', 'Enter', 'Escape'].includes(e.code) && S.cine) skip = true; });
addEventListener('keyup', e => { keys[e.code] = false; });
const cv = $('#c');
cv.addEventListener('pointerdown', e => { if (S.mode === 'world' || S.mode === 'tour') { drag = { x: e.clientX, y: e.clientY, yaw: camYaw, pitch: camPitch }; cv.setPointerCapture(e.pointerId); } });
cv.addEventListener('pointermove', e => { if (!drag) return; camYaw = drag.yaw - (e.clientX - drag.x) * .006; camPitch = clamp(drag.pitch + (e.clientY - drag.y) * .004, .12, .9); });
cv.addEventListener('pointerup', () => { drag = null; });
for (const jo of [$('#joy'), $('#joy2')]) {
  const knob = jo.querySelector('i');
  const move = e => { const r = jo.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx); joy = { x: Math.cos(a) * d, y: Math.sin(a) * d }; knob.style.transform = `translate(${joy.x * 38}px,${joy.y * 38}px)`; };
  jo.addEventListener('pointerdown', e => { jo.setPointerCapture(e.pointerId); move(e); });
  jo.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') move(e); });
  jo.addEventListener('pointerup', () => { joy = { x: 0, y: 0 }; knob.style.transform = ''; });
}
$('#act').addEventListener('click', () => act());
$('#jump').addEventListener('pointerdown', e => { e.preventDefault(); if (S.mode === 'world' || S.mode === 'tour') jumpReq = true; });
$('#skip').addEventListener('click', () => { skip = true; });
$('#ride-skip').addEventListener('click', () => { skip = true; });

/* ---------------- how-to cards ---------------- */
const seen = Q.get('auto') ? { world: 1, robot: 1 } : store.get('seen', {});
function howto(key, title, items, force = false) {
  if (seen[key] && !force) return Promise.resolve(); seen[key] = 1; store.set('seen', seen);
  $('#ht-title').textContent = title; $('#ht-list').innerHTML = items.map(([i, t]) => `<li><i>${i}</i><span>${t}</span></li>`).join('');
  $('#howto').classList.add('on'); Audio_.sfx('panel_open', .4);
  return new Promise(r => $('#ht-ok').onclick = () => { Audio_.sfx('ui_click'); $('#howto').classList.remove('on'); r(); });
}

/* ---------------- HUD ---------------- */
/* the district from above: streets, the places, the coach, the student and where to go next */
function drawMap(cv, { route = null, target = null } = {}) {
  if (!RW || !cv || !cv.offsetWidth) return;
  const dpr = Math.min(2, devicePixelRatio || 1), W = cv.offsetWidth, H = cv.offsetHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const x = cv.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
  const B = BOUNDS, k = Math.min((W - 8) / (B.x1 - B.x0), (H - 8) / (B.z1 - B.z0)), ox = (W - (B.x1 - B.x0) * k) / 2, oz = (H - (B.z1 - B.z0) * k) / 2;
  const P = (wx, wz) => [ox + (wx - B.x0) * k, oz + (wz - B.z0) * k];
  x.fillStyle = 'rgba(214,190,150,.35)'; x.beginPath(); x.roundRect(2, 2, W - 4, H - 4, 10); x.fill();
  x.fillStyle = 'rgba(255,255,255,.75)'; for (let i = 0; i < C.XS.length - 1; i++) for (let j = 0; j < C.ZS.length - 1; j++) { const [a1, b1] = P(C.XS[i] + C.HW, C.ZS[j] + C.HW), [a2, b2] = P(C.XS[i + 1] - C.HW, C.ZS[j + 1] - C.HW); x.beginPath(); x.roundRect(a1, b1, a2 - a1, b2 - b1, 3); x.fill(); }
  x.strokeStyle = '#5b6488'; x.lineCap = 'round'; x.lineWidth = Math.max(3, C.HW * 2 * k);
  for (const [n1, n2] of NET.edges) { x.beginPath(); x.moveTo(...P(n1.x, n1.z)); x.lineTo(...P(n2.x, n2.z)); x.stroke(); }
  if (route) { x.strokeStyle = '#847bb8'; x.lineWidth = 2.5; x.setLineDash([4, 3]); x.beginPath(); route.pts.forEach((q, i) => { const [a1, b1] = P(q.x, q.y); i ? x.lineTo(a1, b1) : x.moveTo(a1, b1); }); x.stroke(); x.setLineDash([]); }
  x.font = `600 ${W > 240 ? 10 : 9}px "Readex Pro"`; x.textAlign = 'center'; x.direction = 'rtl';
  for (const l of RW.locs) {
    const [a1, b1] = P(l.gate.x, l.gate.z), col = l.kind === 'school' ? '#1e8a5a' : best(l.f.id) ? '#2fb36d' : TRACKS[trackOf()].color;
    x.fillStyle = col; x.beginPath(); x.arc(a1, b1, 4, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke();
    // names only where they help: the school and wherever the student is headed
    if (l.kind === 'school' || (target && Math.hypot(target.x - l.gate.x, target.z - l.gate.z) < 20) || W > 300) { const lab = l.kind === 'school' ? 'المدرسة' : l.f.short, ly = b1 + (l.side > 0 ? 14 : -8); x.lineWidth = 3; x.strokeStyle = 'rgba(255,255,255,.9)'; x.strokeText(lab, a1, ly); x.fillStyle = '#1b2263'; x.fillText(lab, a1, ly); }
  }
  if (target) { const [a1, b1] = P(target.x, target.z), r = 6 + Math.sin(performance.now() / 180) * 1.6; x.strokeStyle = '#f2b51e'; x.lineWidth = 2; x.beginPath(); x.arc(a1, b1, r, 0, 7); x.stroke(); }
  { const [a1, b1] = P(bus.position.x, bus.position.z); x.save(); x.translate(a1, b1); x.rotate(-bus.rotation.y); x.fillStyle = '#2a3590'; x.beginPath(); x.roundRect(-6, -3.5, 12, 7, 2); x.fill(); x.fillStyle = '#fff'; x.fillRect(2.5, -2.5, 2, 5); x.restore(); }
  if (player?.root.visible) { const r0 = player.root.position, [a1, b1] = P(r0.x, r0.z), yaw = player.hero ? player.hero.model.rotation.y : player.yaw || 0; x.save(); x.translate(a1, b1); x.rotate(Math.atan2(Math.cos(yaw), Math.sin(yaw))); x.fillStyle = '#e94b6a'; x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(7, 0); x.lineTo(-4, 4.5); x.lineTo(-2, 0); x.lineTo(-4, -4.5); x.closePath(); x.fill(); x.stroke(); x.restore(); }
}
const HUD = { target: null, mapT: 0 };
function updateHUD() {
  $('#st-pts').textContent = points().toLocaleString('en'); $('#st-fac').textContent = `${doneCount()}/12`; $('#st-bdg').textContent = `${badgeSet().size}/4`;
  $('#av').style.backgroundImage = `url(assets/ui/${S.char}_front_cut.webp)`; $('#who-name').textContent = nameOf(); $('#who-region').textContent = `${REGIONS[S.region]?.name || ''} · ⚙ ${Object.keys(S.gears).length}`;
  if (!RW) return;
  // mission card
  const loc = L(), chip = $('#m-chip'), step = `${REGIONS[S.region].name} · ${regionDone(S.region)}/3 مصانع`;
  if (loc.kind === 'school') { chip.textContent = 'نقطة الانطلاق'; chip.style.background = ''; $('#m-title').textContent = 'اركب باص صناعيو المستقبل'; $('#m-text').textContent = 'باص المبادرة واقف عند بوابة المدرسة مباشرة. امشِ إلى بابه واركب.'; $('#m-reward').textContent = ''; }
  else if (!best(loc.f.id)) { const T = TRACKS[trackOf()]; chip.textContent = `مسار ${T.name}`; chip.style.background = T.color; $('#m-title').textContent = `ادخل ${loc.f.name}`; $('#m-text').textContent = `البوابة أمامك على نفس الرصيف. مهمتك: ${MS(loc.f).title}.`; $('#m-reward').textContent = 'حتى +300 نقطة'; }
  else { chip.textContent = 'أُنجزت ✓'; chip.style.background = '#2fb36d'; $('#m-title').textContent = 'ارجع إلى الباص'; $('#m-text').textContent = regionDone(S.region) === 3 ? 'أنجزت مصانع هذه المنطقة كلها! اركب الباص وسافر إلى منطقة أخرى.' : 'أنجزت مهمة هذا المصنع. اركب الباص إلى المصنع التالي.'; $('#m-reward').textContent = '⭐'.repeat(best(loc.f.id)); }
  $('#m-step').textContent = step;
  // where to go: the gate of an unfinished factory where the coach stands, otherwise the coach's door
  const toGate = loc.kind === 'factory' && !best(loc.f.id) && S.bay === loc.bay.id, t = toGate ? loc.gate : busDoor();
  marker.position.set(t.x, .22, t.z); HUD.target = t;
  marker.userData.ring.material.color.set(toGate ? TRACKS[trackOf()].color : '#847bb8');
}

/* ---------------- the trip journal: every region, every factory, what was learned and found ---------------- */
function openJournal() {
  Audio_.sfx('panel_open', .5);
  $('#jr-av').style.backgroundImage = `url(assets/ui/${S.char}_front_cut.webp)`; $('#jr-title').textContent = `دفتر رحلة ${fullName()}`;
  $('#jr-sub').textContent = `مسار ${TRACKS[trackOf()].name} · ${points().toLocaleString('en')} نقطة · ${doneCount()}/12 مصانع · ⚙ ${Object.keys(S.gears).length} تروس ذهبية`;
  $('#jr-badges').innerHTML = Object.entries(TRACKS).map(([k, t]) => `<div class="${badgeSet().has(k) ? '' : 'off'}"><img src="${t.badge}" alt="">${t.name}</div>`).join('');
  $('#jr-regions').innerHTML = ORDER.map(r => {
    const R = REGIONS[r], cg = CITY_GEARS.filter((_, i) => S.gears[`city-${r}-${i}`]).length;
    return `<div class="jr-reg"><div><b>${R.name}</b><small>${regionDone(r)}/3 مصانع · ⚙ ${cg}/${CITY_GEARS.length} في المدينة</small></div>` + R.factories.map(f => {
      const st = best(f.id), q = S.quiz[f.id] || 0;
      return `<div class="jr-f">${f.logo ? `<img src="${f.logo}" alt="">` : `<i class="dot" style="background:${f.color}"></i>`}<span>${f.name}</span><span class="st">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</span><span class="chips"><i class="${(S.facts[f.id] || 0) === 3 ? 'ok' : ''}">📖 ${S.facts[f.id] || 0}/3</i><i class="${q >= 2 ? 'ok' : ''}">✓ ${q}/3</i><i class="${S.gears[f.id] ? 'ok' : ''}">⚙ ${S.gears[f.id] ? '✓' : '—'}</i></span><span class="stamp ${q >= 2 ? 'on' : ''}" title="ختم المصنع">${q >= 2 ? '✓' : ''}</span></div>`;
    }).join('') + '</div>';
  }).join('');
  $('#journal').classList.add('on');
}
$('#who').addEventListener('click', openJournal);
$('#jr-x').addEventListener('click', () => { Audio_.sfx('panel_close', .5); $('#journal').classList.remove('on'); });
$('#journal').addEventListener('click', e => { if (e.target.id === 'journal') { Audio_.sfx('panel_close', .5); $('#journal').classList.remove('on'); } });

/* ---------------- arrival in a region: a short establishing shot, then play ---------------- */
async function enterRegion() {
  const sc = RW.locs[0]; parkAt(sc.bay.id); S.loc = 0;
  const [yx, yz] = sc.yard, py = yz - sc.side * 5.5; player.root.visible = true; player.root.position.set(yx + 1.5, .06, py); player.speed = 0;
  const face = sc.side > 0 ? Math.PI : 0; faceHero(face); camYaw = sc.side > 0 ? 0 : Math.PI; camPitch = .42;
  show('hud'); $('#hud').classList.add('cine'); S.cine = true; skip = false; S.mode = 'intro'; updateHUD();
  Audio_.music(REGIONS[S.region].music, { vol: .55 });
  // from high over the district, past the plaza, down behind the student
  const end = new THREE.Vector3(yx + 1.5, 1.25, py).add(new THREE.Vector3(Math.sin(camYaw) * Math.cos(camPitch), Math.sin(camPitch), Math.cos(camYaw) * Math.cos(camPitch)).multiplyScalar(5.6));
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(60, 130, 210), new THREE.Vector3(-20, 80, 110), new THREE.Vector3(-70, 40, 30), new THREE.Vector3(yx + 14, 12, py + 20), end]);
  const look = [new THREE.Vector3(-40, 0, -20), new THREE.Vector3(-110, 8, -47), new THREE.Vector3(-110, 3, 0), new THREE.Vector3(yx, 1.4, py)];
  const t0 = performance.now(), D = 7000, lk = new THREE.Vector3();
  while (!skip) {
    const k = Math.min(1, (performance.now() - t0) / D), e = ease(k);
    camera.position.copy(path.getPoint(e));
    const f = e * (look.length - 1), i = Math.min(look.length - 2, Math.floor(f)); lk.lerpVectors(look[i], look[i + 1], ease(f - i)); camera.lookAt(lk);
    sunAt(camera.position.x * .5, camera.position.z * .5); RW.update(1 / 60); animatePlayer(player, 1 / 60, 0, 'back');
    renderer.render(RW.scene, camera); await frame(); if (k >= 1) break;
  }
  $('#hud').classList.remove('cine'); S.cine = false; S.mode = 'world'; skip = false; follow(0, true);
  robo?.place(new THREE.Vector3(yx - .2, 0, py - sc.side * 1.6), .2);
  if (!seen.robot && S.robot) { seen.robot = 1; store.set('seen', seen); S.mode = 'menu'; await say(`أهلاً ${nameOf()}! أنا مِرشد، مرشدك في الرحلة. باص المبادرة واقف عند بوابة المدرسة، وفي كل مصنع مهمة وترس ذهبي مخبّأ. (تقدر تخفيني من الإعدادات ⚙)`, { wait: true }); S.mode = 'world'; }
  await howto('world', 'كيف تلعب؟', touch ? [['🕹️', 'حرّك الشخصية بعصا التحكم أسفل الشاشة'], ['👆', 'اسحب على الشاشة لتدوير الكاميرا'], ['🚌', 'باص المبادرة يقف عند بوابة كل مكان، فلا تقطع الشارع لتركبه'], ['🗺️', 'الخريطة في الأعلى تريك الباص والمصانع ووجهتك']] :
    [['⌨️', 'تحرّك بالأسهم أو W A S D · Shift للجري · Space للقفز'], ['🖱️', 'اسحب بالفأرة لتدوير الكاميرا'], ['🚌', 'باص المبادرة يقف عند بوابة كل مكان، فلا تقطع الشارع لتركبه'], ['🗺️', 'الخريطة في الأعلى تريك الباص والمصانع ووجهتك · E للتفاعل']]);
  toast(`مرحباً بك في ${REGIONS[S.region].name}! باص المبادرة بانتظارك عند بوابة المدرسة 🚌`, 3400);
}
// the shadow camera follows the student in whole shadow-map texels, so shadows and the ground under them don't shimmer
const _sr = new THREE.Vector3(), _su = new THREE.Vector3(), _sp = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
function sunAt(x, z) {
  const sh = RW.sun.shadow, texel = (sh.camera.right - sh.camera.left) / sh.mapSize.x, d = RW.sunDir;
  _sr.crossVectors(UP, d).normalize(); _su.crossVectors(d, _sr).normalize(); _sp.set(x, 0, z);
  const a = _sp.dot(_sr), b = _sp.dot(_su); _sp.addScaledVector(_sr, Math.round(a / texel) * texel - a).addScaledVector(_su, Math.round(b / texel) * texel - b);
  RW.sun.target.position.copy(_sp); RW.sun.position.copy(_sp).addScaledVector(d, 120);
}

/* ---------------- walking ---------------- */
let near = null, nearGate = -1, stepT = 0, justArrived = false, jumpReq = false;
// the camera slides in when a palm trunk or a lamp post would come between it and the student,
// and rises over the roof when the coach is in the way; indoors it stays inside the hall
function camClear(tgt, dist, circles, pitch = camPitch) {
  const dx = Math.sin(camYaw) * Math.cos(pitch), dz = Math.cos(camYaw) * Math.cos(pitch), close = circles.filter(([cx, cz]) => Math.abs(cx - tgt.x) < 10 && Math.abs(cz - tgt.z) < 10);
  for (let i = 1; i <= 16; i++) {
    const d = dist * i / 16, x = tgt.x + dx * d, z = tgt.z + dz * d;
    if (close.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr + .45)) return Math.max(1.6, d - .5);
  }
  return dist;
}
function busInWay(tgt, want) {
  if (!bus) return false;
  for (let i = 1; i <= 12; i++) { const k = i / 12; if (inBus(tgt.x + (want.x - tgt.x) * k, tgt.z + (want.z - tgt.z) * k, .4)) return true; }
  return false;
}
const worldSpace = () => ({ world: true, boxes: RW.boxes, circles: RW.colliders, bounds: BOUNDS, height: x => x, solid: (x, z) => inBus(x, z, .3) || (life?.traffic || []).some(c => inBox(x, z, c.x, c.z, c.yaw, c.len / 2, 1, .3, true)) });
/* four ways to watch: close behind, far behind, from above, and through the student's own eyes.
   The same button switches the driving view: chase, far chase, from above, and the driver's seat. */
const CAMS = [{ k: 'near', t: '🎥 الكاميرا: قريبة' }, { k: 'far', t: '🔭 الكاميرا: بعيدة' }, { k: 'top', t: '🛰️ الكاميرا: من فوق' }, { k: 'eye', t: '👀 الكاميرا: بعيونك' }];
const DCAMS = ['🎥 خلف الباص', '🔭 بعيدة', '🛰️ من فوق', '🚌 مقعد السائق'];
let camMode = 0;
function cycleCam() {
  camMode = (camMode + 1) % CAMS.length; Audio_.sfx('ui_click', .5); $('#cam').dataset.m = CAMS[camMode].k;
  toast(S.mode === 'drive' ? DCAMS[camMode] : CAMS[camMode].t + (camMode === 3 ? ' · اسحب لتلتفت' : ''), 1600);
  if (S.mode === 'world' || S.mode === 'tour') follow(0, true);
}
$('#cam').addEventListener('click', cycleCam);
let camDist = 6, camLift = 0;
function follow(dt, snap = false, sp = null) {
  sp ||= S.mode === 'tour' && IN ? tourSpace() : worldSpace();
  const r = player.root, mode = CAMS[camMode].k;
  if (mode === 'eye') {
    // eye height, looking where the student walks; drag left and right to turn, up and down to look
    const eye = new THREE.Vector3(r.position.x, r.position.y + (player.jy || 0) + (player.hero ? 1.42 : 1.3), r.position.z), el = -(camPitch - .3) * 1.4;
    const look = eye.clone().add(new THREE.Vector3(-Math.sin(camYaw) * Math.cos(el), Math.sin(el), -Math.cos(camYaw) * Math.cos(el)).multiplyScalar(8));
    eye.addScaledVector(new THREE.Vector3(-Math.sin(camYaw), 0, -Math.cos(camYaw)), .12);
    if (snap) camera.position.copy(eye); else camera.position.lerp(eye, Math.min(1, dt * 14)); camera.lookAt(look); return;
  }
  const pitch = mode === 'top' ? 1.16 : mode === 'far' ? Math.min(.95, camPitch + .14) : camPitch;
  const tgt = new THREE.Vector3(r.position.x, r.position.y + 1.25, r.position.z), base = player.hero ? (touch ? 5.8 : 5.2) : (touch ? 6.6 : 6);
  const full = base * (mode === 'far' ? 2 : mode === 'top' ? (sp.indoor ? 1.5 : 3.2) : 1);
  let want0 = mode === 'top' ? full : camClear(tgt, full, sp.circles, pitch);
  if (sp.indoor) { const b = sp.bounds, dx = Math.sin(camYaw), dz = Math.cos(camYaw); for (let d = want0; d > 1.6; d -= .25) { const x = tgt.x + dx * d * Math.cos(pitch), z = tgt.z + dz * d * Math.cos(pitch); if (x > b.x0 - .2 && x < b.x1 + .2 && z > b.z0 - .2 && z < b.z1 + .2 && tgt.y + Math.sin(pitch) * d < 8.2) { want0 = d; break; } want0 = d; } }
  camDist = snap || want0 < camDist ? want0 : camDist + (want0 - camDist) * Math.min(1, dt * 2.5); const dist = camDist;
  const want = new THREE.Vector3(tgt.x + Math.sin(camYaw) * Math.cos(pitch) * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(camYaw) * Math.cos(pitch) * dist);
  // the coach in the way: lift a little and swing round to the open side, unless the player is steering the view
  const blocked = sp.world && mode !== 'top' && busInWay(tgt, want), lift = blocked ? Math.max(0, 7 - want.y) : 0; camLift = snap ? lift : camLift + (lift - camLift) * Math.min(1, dt * 4); want.y += camLift;
  if (blocked && !drag) { const ax = bus.position.x - r.position.x, az = bus.position.z - r.position.z, goal = Math.atan2(-ax, -az); camYaw += angTo(camYaw, goal) * Math.min(1, dt * 2.2); }
  if (snap) camera.position.copy(want); else camera.position.lerp(want, Math.min(1, dt * 6)); camera.lookAt(tgt);
}
function act() {
  if (S.mode === 'tour') return tourAct();
  if (S.mode !== 'world') return;
  if (near === 'gate') { S.loc = nearGate; enterFactory(L().f); }
  else if (near === 'bus') openRoute();
}
/* the student on foot, in the street or on a factory floor */
function moveStudent(dt, sp) {
  const p = player, r = p.root;
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
  let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + joy.y;
  // on a touch screen, pushing the stick past about two-thirds breaks into a run
  const mag = Math.min(1, Math.hypot(ix, iz)), run = keys.ShiftLeft || keys.ShiftRight || (mag > .72 && touch);
  const target = mag > .1 ? (p.hero ? (run ? 3.9 : 2.1) : (run ? 5.6 : 3.3)) : 0; p.speed += (target - p.speed) * Math.min(1, dt * 8);
  p.jy ??= 0; p.jv ??= 0; const feet = r.position.y + p.jy;
  let face = null;
  if (mag > .1) {
    const ang = Math.atan2(ix, iz) + camYaw, dx = Math.sin(ang), dz = Math.cos(ang);
    const ox = r.position.x, oz = r.position.z; let nx = clamp(ox + dx * p.speed * dt, sp.bounds.x0, sp.bounds.x1), nz = clamp(oz + dz * p.speed * dt, sp.bounds.z0, sp.bounds.z1);
    // walls and buildings (boxes) push out along the shallowest side; posts and trunks (circles) push out radially
    for (const [x0, z0, x1, z1] of sp.boxes) {
      const a = x0 - .3, b = x1 + .3, c = z0 - .3, d = z1 + .3; if (nx <= a || nx >= b || nz <= c || nz >= d) continue;
      const m = Math.min(nx - a, b - nx, nz - c, d - nz); if (m === nx - a) nx = a; else if (m === b - nx) nx = b; else if (m === nz - c) nz = c; else nz = d;
    }
    for (const [cx, cz, cr] of sp.circles) { const ddx = nx - cx, ddz = nz - cz, d = Math.hypot(ddx, ddz), min = cr + .3; if (d < min && d > 1e-4) { nx = cx + ddx / d * min; nz = cz + ddz / d * min; } }
    // the coach, the cars, a crate too high to step on
    if (sp.solid(nx, nz, feet)) { nx = ox; nz = oz; }
    r.position.x = nx; r.position.z = nz;
    p.yaw = ang; face = Math.cos(ang - camYaw) > 0 ? 'front' : 'back';
    stepT -= dt * (p.speed / (p.hero ? 1.5 : 3)); if (stepT <= 0) { if (p.jy === 0) Audio_.sfx(`step_${1 + (Math.random() * 5 | 0)}`, .2); stepT = .42; }
  }
  const gy = sp.world ? heightAt(r.position.x, r.position.z) : sp.height(r.position.x, r.position.z, feet);
  // stepping up is quick; walking off a crate drops you onto the floor
  if (gy > r.position.y) { const up = gy - r.position.y; r.position.y = gy; if (p.jy > 0) p.jy = Math.max(0, p.jy - up); }
  else r.position.y += (gy - r.position.y) * Math.min(1, dt * (sp.indoor ? 18 : 12));
  if (jumpReq && p.jy === 0) { p.jv = 5.4; Audio_.sfx('jump', .5); } jumpReq = false;
  if (p.jy > 0 || p.jv > 0) { p.jv -= 15 * dt; p.jy = Math.max(0, p.jy + p.jv * dt); if (p.jy === 0) { p.jv = 0; Audio_.sfx('land', .5); } }
  if (p.hero) p.hero.model.position.y = p.hero.baseY + p.jy;
  if (p.blob) p.blob.scale.setScalar(1 - Math.min(.55, p.jy * .35));
  animatePlayer(p, dt, p.speed, face);
  follow(dt, false, sp);
}
function walk(dt) {
  const r = player.root;
  moveStudent(dt, worldSpace());
  sunAt(r.position.x, r.position.z);
  guide(dt, HUD.target, r.position.y);
  // interactions: a factory gate, or the coach's door, whichever is nearer
  const door = busDoor(), dBus = Math.hypot(r.position.x - door.x, r.position.z - door.z);
  let gd = 2.6; nearGate = -1; RW.locs.forEach((l, i) => { if (l.kind !== 'factory') return; const d = Math.hypot(r.position.x - l.gate.x, r.position.z - l.gate.z); if (d < gd) { gd = d; nearGate = i; } });
  if (dBus > 4) justArrived = false;
  near = nearGate >= 0 && (dBus >= 2.8 || justArrived || gd < dBus) ? 'gate' : dBus < 2.8 && !justArrived ? 'bus' : null;
  const btn = $('#act'); btn.classList.toggle('on', !!near);
  if (near) { const t = near === 'gate' ? (best(RW.locs[nearGate].f.id) ? '🔁 زُر المصنع مرة أخرى' : `ادخل ${RW.locs[nearGate].f.short}`) : '🚌 اركب الباص'; if (btn.textContent !== t) btn.textContent = t; }
  const t = performance.now() / 1000; marker.userData.arrow.position.y = 3.2 + Math.sin(t * 2.4) * .25; marker.userData.arrow.rotation.y = t;
  if ((HUD.mapT -= dt) <= 0) { HUD.mapT = .1; drawMap($('#mini-cv'), { target: HUD.target }); }
  // gears: spin, and collect the one you walk (or jump) into
  const feet = r.position.y + (player.jy || 0);
  for (const g of RW.gears) {
    if (!g.m.visible) continue; g.m.rotation.y = t * 1.8; g.m.position.y = g.y + Math.sin(t * 2.2 + g.y) * .08;
    if (Math.hypot(r.position.x - g.m.position.x, r.position.z - g.m.position.z) < 1.1 && feet >= g.y - 1.25) {
      g.m.visible = false; S.gears[g.id] = 1; S.xp += 50; persist(); Audio_.sfx('level_up', .6); flash(); updateHUD();
      const n = RW.gears.filter(x => !x.m.visible).length; say(n === RW.gears.length ? `جمعت كل تروس ${REGIONS[S.region].name} الذهبية! ⚙️ أنت مستكشف حقيقي.` : `ترس ذهبي! ⚙️ +50 · وجدت ${n} من ${RW.gears.length} في هذه المدينة.`, { wait: false });
    }
  }
}

/* ---------------- the coach: route menu, boarding, the ride, arrival ---------------- */
function openRoute() {
  S.mode = 'menu'; Audio_.sfx('panel_open', .5);
  const list = $('#route-list'); list.innerHTML = '';
  const dv = document.createElement('button'); dv.type = 'button'; dv.className = 'drive-me';
  dv.innerHTML = `<span class="ic" style="background:var(--grad);display:grid;place-items:center;font-size:22px">🚌</span><span class="tx"><b>سُق الباص بنفسك</b><small>شوارع وتقاطعات وإشارات · توقّف في موقف أي بوابة</small></span><span class="st">جديد</span>`;
  dv.onclick = () => { Audio_.sfx('ui_click'); $('#route').classList.remove('on'); startDrive(); }; list.append(dv);
  RW.locs.forEach((l, i) => {
    const b = document.createElement('button'), here = l.bay.id === S.bay; b.type = 'button'; b.disabled = here;
    if (l.kind === 'school') b.innerHTML = `<span class="ic" style="background-image:url(assets/img/logo-mark.webp)"></span><span class="tx"><b>المدرسة</b><small>نقطة الانطلاق</small></span><span class="st"></span>`;
    else { const st = best(l.f.id); b.innerHTML = `<span class="ic" style="${l.f.logo ? `background-image:url(${l.f.logo})` : `background:${l.f.color}`}"></span><span class="tx"><b>${l.f.name}</b><small>مسار ${TRACKS[trackOf()].name} · ${MS(l.f).title}</small></span><span class="st">${st ? '★'.repeat(st) + '☆'.repeat(3 - st) : 'جديد'}</span>`; }
    if (here) b.querySelector('small').textContent = 'الباص هنا الآن';
    b.onclick = () => { Audio_.sfx('ui_click'); $('#route').classList.remove('on'); rideTo(i); };
    list.append(b);
  });
  $('#route').classList.add('on');
}
$('#route-close').onclick = () => { Audio_.sfx('panel_close'); $('#route').classList.remove('on'); S.mode = 'world'; };
$('#route-region').onclick = () => { Audio_.sfx('ui_click'); $('#route').classList.remove('on'); showRegions(true); };

async function cine(fn) { S.cine = true; skip = false; if (marker) marker.visible = false; let last = performance.now(); for (;;) { const now = performance.now(), dt = Math.min(.05, (now - last) / 1000) * TS; last = now; RW.update(dt); robo?.update(dt); if (fn(dt) === false || skip) break; renderer.render(RW.scene, camera); await frame(); } S.cine = false; if (marker) marker.visible = true; }
// the side of the coach the door is on, as a unit vector on the ground
const doorSide = () => new THREE.Vector3(Math.sin(bus.rotation.y), 0, Math.cos(bus.rotation.y));
async function board() {
  S.mode = 'ride'; show('hud'); $('#hud').classList.add('cine'); $('#act').classList.remove('on');
  const door = busDoor(), from = player.root.position.clone(), out = doorSide(), fw = new THREE.Vector3(Math.cos(bus.rotation.y), 0, -Math.sin(bus.rotation.y));
  Audio_.sfx('bus_door_open', .8);
  // مِرشد hops in first
  if (robo) { robo.look = null; robo.target.copy(door).addScaledVector(out, -.6); robo.floor = .9; }
  camera.position.copy(door).addScaledVector(out, 7).addScaledVector(fw, 5).setY(2.6); camera.lookAt(door.x, 1.4, door.z);
  let k = 0; await cine(dt => { k += dt / 1.6; bus.userData.door(Math.min(1, k * 2)); const e = ease(Math.min(1, k)); player.root.position.lerpVectors(from, door.clone().addScaledVector(out, -.3), e); player.speed = 2.4; animatePlayer(player, dt, null, 'back'); return k < 1; });
  player.root.visible = false; bus.userData.door(0); Audio_.sfx('bus_door_close', .8); setTimeout(() => Audio_.sfx('bus_horn', .45), 900);
}
/* drive the coach along a route: it keeps to its lane, waits at red lights and behind cars, slows into turns */
let busPrio = null;
function coachStep(R, st, dt, { ghost = false } = {}) {
  const P = new THREE.Vector2(), Dv = new THREE.Vector2(), bh = bus.userData;
  let gap = R.len - st.s; busPrio = null;
  for (const sp of R.stops) if (sp.at > st.s + bh.halfLen - 1) { if (sp.at - st.s < 60) busPrio = sp.lane; const g = signals?.state(sp.lane) || 'go'; if (g === 'stop' || (g === 'amber' && sp.at - st.s - bh.halfLen > st.v * st.v / 8 + 2)) gap = Math.min(gap, sp.at - st.s - bh.halfLen - .8); break; }
  if (!ghost) for (let d = bh.halfLen; d < Math.min(gap + bh.halfLen, 34); d += 1.5) { polyAt(R, st.s + d, P); if ((life?.traffic || []).some(c => Math.hypot(c.x - P.x, c.z - P.y) < 2.4)) { gap = Math.min(gap, d - bh.halfLen - 3.5); break; } }
  // ease off before a bend: the heading change over the next 12 m
  polyAt(R, st.s + 1, P, Dv); const h0 = Math.atan2(Dv.y, Dv.x); polyAt(R, st.s + 12, P, Dv); const bend = Math.abs(angTo(h0, Math.atan2(Dv.y, Dv.x)));
  const want = Math.min(st.vmax, bend > 1 ? 4.5 : bend > .4 ? 7 : 16, Math.sqrt(Math.max(0, 2 * 3.2 * gap)));
  const dv = want - st.v; st.v = Math.max(0, st.v + (dv > 0 ? Math.min(dv, 2.4 * dt) : Math.max(dv, -6 * dt)));
  st.s = Math.min(R.len, st.s + st.v * dt);
  const a = polyAt(R, Math.max(0, st.s - 2), new THREE.Vector2()), b = polyAt(R, Math.min(R.len, st.s + 2), new THREE.Vector2()), c2 = polyAt(R, st.s, P);
  const yaw = Math.atan2(-(b.y - a.y), b.x - a.x), px = bus.position.x, pz = bus.position.z;
  bus.position.set(c2.x, .02, c2.y); bus.rotation.y += angTo(bus.rotation.y, yaw) * Math.min(1, dt * 7);
  bus.userData.roll(Math.hypot(c2.x - px, c2.y - pz)); busV = st.v;
}
async function rideTo(dest) {
  const D = RW.locs[dest], from = RW.locs[locOfBay(S.bay)], R = routeBus(S.bay, D.bay.id); await board();
  show('ride'); $('#ride-to').textContent = D.name;
  $('#ride-stops').innerHTML = `<span style="left:4%">${from?.kind === 'factory' ? from.f.short : 'المدرسة'}</span><span style="left:96%">${D.kind === 'school' ? 'المدرسة' : D.f.short}</span>`;
  Audio_.music('bus_trip', { vol: .5 });
  // camera shots taken relative to the coach: alongside, chasing, low in front, a drone above
  const shots = [
    (p, f, r, t) => [p.clone().addScaledVector(r, -13).addScaledVector(f, 3 - t * .6).setY(3), p.clone().addScaledVector(f, 3).setY(1.8)],
    (p, f, r) => [p.clone().addScaledVector(f, -16).setY(7), p.clone().addScaledVector(f, 10).setY(1.5)],
    (p, f, r, t) => [p.clone().addScaledVector(f, 15 - t * 1.5).addScaledVector(r, -3.5).setY(1.3), p.clone().setY(2)],
    (p, f, r, t) => [p.clone().addScaledVector(f, -24 + t * 2).addScaledVector(r, -22).setY(30), p.clone().addScaledVector(f, 14)]
  ];
  const st = { s: 0, v: 0, vmax: 16 }; let shot = Math.random() * 4 | 0, shotT = 0, stuck = 0, cut = true;
  await cine(dt => {
    coachStep(R, st, dt, { ghost: stuck > 8 }); stuck = st.v < .3 ? stuck + dt : 0;
    const p = bus.position.clone(), f = new THREE.Vector3(Math.cos(bus.rotation.y), 0, -Math.sin(bus.rotation.y)), r = new THREE.Vector3(Math.sin(bus.rotation.y), 0, Math.cos(bus.rotation.y));
    shotT += dt; if (shotT > 4.2) { shotT = 0; shot = (shot + 1) % shots.length; cut = true; }
    const [cp, lk] = shots[shot](p, f, r, shotT); if (cut) { camera.position.copy(cp); cut = false; } else camera.position.lerp(cp, Math.min(1, dt * 4)); camera.lookAt(lk);
    sunAt(p.x, p.z); $('#ride-fill').style.width = st.s / R.len * 100 + '%';
    return st.s < R.len - .02;
  });
  if (skip) { flash(); const b = BAYS[D.bay.id]; bus.position.set(b.x, .02, b.z); bus.rotation.y = b.yaw; }
  parkAt(D.bay.id); skip = false; busV = 0; Audio_.sfx('bus_brake', .75);
  await alight(dest);
}
// arrive: the air brakes hiss, the doors open, the student steps down onto the sidewalk by the gate
async function alight(dest) {
  const D = RW.locs[dest]; let k = 0;
  S.mode = 'ride'; S.loc = dest; show('hud'); $('#hud').classList.add('cine'); updateHUD();
  Audio_.music(REGIONS[S.region].music, { vol: .55 }); setTimeout(() => Audio_.sfx('bus_door_open', .8), 350);
  const d2 = busDoor(), out = doorSide(), fw = new THREE.Vector3(Math.cos(bus.rotation.y), 0, -Math.sin(bus.rotation.y));
  const a = d2.clone().addScaledVector(out, -.3), to = d2.clone().addScaledVector(out, 1.3); player.root.visible = true; player.root.position.copy(a);
  camera.position.copy(d2).addScaledVector(out, 6.5).addScaledVector(fw, 4.5).setY(2.6); camera.lookAt(d2.x, 1.3, d2.z);
  await cine(dt => { k += dt / 1.5; bus.userData.door(Math.min(1, k * 2.5)); player.root.position.lerpVectors(a, to, ease(Math.min(1, k))); player.speed = 2.4; animatePlayer(player, dt, null, 'front'); return k < 1; });
  bus.userData.door(0); Audio_.sfx('bus_door_close', .6); player.speed = 0; player.root.position.copy(to);
  // look along the sidewalk toward the gate
  // the camera behind the student along the sidewalk, looking toward the gate
  const g = D.gate, gy = Math.atan2(g.x - to.x, g.z - to.z), cv2 = new THREE.Vector3(to.x - g.x, 0, to.z - g.z).normalize().addScaledVector(out, .15); faceHero(gy); camYaw = Math.atan2(cv2.x, cv2.z); camPitch = .34; follow(0, true);
  { let fx = to.x - camera.position.x, fz = to.z - camera.position.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl; robo?.place(new THREE.Vector3(to.x - fz * 1.3 + fx * .5, 0, to.z + fx * 1.3 + fz * .5), to.y + .6); }
  justArrived = true; $('#hud').classList.remove('cine'); S.mode = 'world'; skip = false;
  toast(D.kind === 'school' ? 'وصلت إلى المدرسة' : `وصلت إلى ${D.name} · البوابة أمامك`, 3200);
}

/* ---------------- driving the coach yourself ---------------- */
const DV = { v: 0, steer: 0, near: null, bump: 0, red: 0, front: null };
const KMH = 3.6, VMAX = 16, VREV = -4, WHEELBASE = 4.4;
async function startDrive() {
  await board();
  // the coach is already in its own lane: the wheel is yours
  skip = false; DV.v = 0; DV.steer = 0; DV.near = null; DV.front = null; DV.red = 0; chaseD = 15;
  S.mode = 'drive'; show('drive'); $('#hud').classList.remove('cine'); marker.visible = false; document.body.classList.add('driving');
  Audio_.music('bus_trip', { vol: .4 });
  toast(touch ? 'حرّك عصا التحكم: للأمام تسارع، للخلف فرامل، يمين ويسار للتوجيه' : 'W للتسارع · S للفرامل · A و D للتوجيه · احترم الإشارات وتوقّف في موقف أي بوابة', 4200);
}
/* behind and above the coach; it comes in closer rather than end up inside a palm */
let chaseD = 15;
function chaseCam(x, z, yaw, dt) {
  const fx = Math.cos(yaw), fz = -Math.sin(yaw); let want = 15;
  for (const [cx, cz, cr] of RW.colliders) {
    if (cr < .45) continue; const t = -((cx - x) * fx + (cz - z) * fz); if (t < 3 || t > want + 1) continue;
    const lat = Math.abs((cx - x) * fz - (cz - z) * fx); if (lat < 2.2) want = Math.max(7, t - 2);
  }
  if (camMode === 1) want = Math.max(want, 11) * 1.7;
  chaseD += (want - chaseD) * Math.min(1, dt * (want < chaseD ? 6 : 1.5));
  if (camMode === 2) { camera.position.lerp(new THREE.Vector3(x - fx * 8, 46, z - fz * 8), Math.min(1, dt * 3)); camera.lookAt(x + fx * 6, 0, z + fz * 6); return; }
  if (camMode === 3) { const h = bus.userData.halfLen; camera.position.set(x + fx * (h - .9), 2.75, z + fz * (h - .9)); camera.lookAt(x + fx * 30, 1.2, z + fz * 30); return; }
  camera.position.lerp(new THREE.Vector3(x - fx * chaseD, 3 + chaseD * .23, z - fz * chaseD), Math.min(1, dt * 3)); camera.lookAt(x + fx * 9, 1.8, z + fz * 9);
}
function honk() { Audio_.sfx('bus_horn', .6); }
$('#dv-horn').addEventListener('click', honk);
$('#dv-act').addEventListener('click', () => driveAct());
// all four corners of the coach must stay on the road (a little overhang onto the kerb is fine)
function busFits(x, z, yaw) {
  const bh = bus.userData, c = Math.cos(yaw), s = Math.sin(yaw), L2 = bh.halfLen - .45, W2 = bh.halfWid - .55;
  for (const [a, b] of [[L2, W2], [L2, -W2], [-L2, W2], [-L2, -W2], [0, W2], [0, -W2]]) if (!onRoadPt(x + a * c + b * s, z - a * s + b * c)) return false;
  return true;
}
const onRoadPt = (x, z) => onRoad(x, z, -.05);
function driveStep(dt) {
  const bh = bus.userData;
  const up = keys.KeyW || keys.ArrowUp || joy.y < -.35, down = keys.KeyS || keys.ArrowDown || joy.y > .35;
  const steerIn = ((keys.KeyA || keys.ArrowLeft) ? 1 : 0) - ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - (Math.abs(joy.x) > .15 ? joy.x : 0);
  if (up) DV.v += (DV.v < 0 ? 8 : 3.2 * (1 - DV.v / (VMAX + 4))) * dt;
  else if (down) { const was = DV.v; DV.v -= (DV.v > .3 ? 8 : 2) * dt; if (was > 9 && DV.v <= 9) Audio_.sfx('bus_brake', .35); }
  else DV.v -= Math.sign(DV.v) * Math.min(Math.abs(DV.v), (.5 + Math.abs(DV.v) * .05) * dt);
  DV.v = clamp(DV.v, VREV, VMAX);
  // the wheel turns at a steady rate and lets go gently; tighter lock at walking pace
  const lock = .62 - clamp(Math.abs(DV.v) / VMAX, 0, 1) * .34;
  DV.steer += clamp(steerIn * lock - DV.steer, -2.2 * dt, 2.2 * dt);
  const ox = bus.position.x, oz = bus.position.z, oy = bus.rotation.y;
  const yaw = oy + DV.v * Math.tan(DV.steer) / WHEELBASE * dt;
  let x = ox + Math.cos(yaw) * DV.v * dt, z = oz - Math.sin(yaw) * DV.v * dt, ny = yaw;
  if (!busFits(x, z, ny)) {
    // brushing a kerb: ease off it rather than stop dead; keep whichever nearby pose still fits
    const tries = [[x, z, ny + .035], [x, z, ny - .035], [x, oz, oy], [ox, z, oy], [ox, oz, oy + .03], [ox, oz, oy - .03], [ox, oz, oy]];
    [x, z, ny] = tries.find(([a, b, c]) => busFits(a, b, c)) || [ox, oz, oy];
    if (Math.abs(DV.v) > 5 && DV.bump <= 0) { Audio_.sfx('factory_metal', .25); DV.bump = 1.2; } DV.v *= 1 - Math.min(.5, dt * 2.5);
  }
  // cars are solid
  for (const c of life?.traffic || []) {
    if (!inBox(c.x, c.z, x, z, ny, bh.halfLen, bh.halfWid, .2) && !inBox(c.x + Math.sin(c.yaw) * c.len * .4, c.z + Math.cos(c.yaw) * c.len * .4, x, z, ny, bh.halfLen, bh.halfWid) && !inBox(c.x - Math.sin(c.yaw) * c.len * .4, c.z - Math.cos(c.yaw) * c.len * .4, x, z, ny, bh.halfLen, bh.halfWid)) continue;
    x = ox; z = oz; ny = oy; if (Math.abs(DV.v) > 2 && DV.bump <= 0) { Audio_.sfx('factory_metal', .35); DV.bump = .8; toast('انتبه! اصطدمت بسيارة 🚗', 1600); } DV.v = 0; break;
  }
  DV.bump -= dt;
  bus.position.set(x, .02, z); bus.rotation.y = ny; busV = DV.v; bus.userData.roll((x - ox) * Math.cos(ny) - (z - oz) * Math.sin(ny));
  // running a red light: the front of the coach crosses a stop line while that approach is red
  const f = new THREE.Vector2(x + Math.cos(ny) * bh.halfLen, z - Math.sin(ny) * bh.halfLen);
  if (DV.front) for (const sg of signals?.list || []) for (const Lq of sg.appr) {
    // across the whole half of the road that approaches the junction (both lanes)
    const p1 = Lq.pts[1], a0 = (DV.front.x - p1.x) * Lq.d.x + (DV.front.y - p1.y) * Lq.d.y, a1 = (f.x - p1.x) * Lq.d.x + (f.y - p1.y) * Lq.d.y, lat = (f.x - p1.x) * Lq.r.x + (f.y - p1.y) * Lq.r.y;
    if (a0 < 0 && a1 >= 0 && lat > -C.CAR - .3 && lat < C.HW - C.CAR + .3 && signals.state(Lq) === 'stop') { DV.red++; Audio_.sfx('wrong', .5); toast('⚠️ تجاوزت الإشارة الحمراء! انتظر الأخضر في المرة القادمة', 2600); }
  }
  DV.front = f; busPrio = null;
  for (const sg of signals?.list || []) for (const Lq of sg.appr) { const p1 = Lq.pts[1], al = (f.x - p1.x) * Lq.d.x + (f.y - p1.y) * Lq.d.y, lat = (f.x - p1.x) * Lq.r.x + (f.y - p1.y) * Lq.r.y; if (al > -50 && al < 0 && lat > -C.CAR - .3 && lat < C.HW - C.CAR + .3 && Math.cos(ny) * Lq.d.x - Math.sin(ny) * Lq.d.y > .7) busPrio = Lq; }
  chaseCam(x, z, ny, dt);
  sunAt(x, z);
  // bays: slow down in one to get off
  let best = null; for (const l of RW.locs) { const b = l.bay, d = Math.hypot(x - b.x, z - b.z); if (d < 9 && Math.cos(angTo(ny, b.yaw)) > .7 && (!best || d < best.d)) best = { l, i: RW.locs.indexOf(l), d }; }
  DV.near = best; const btn = $('#dv-act'), name = best ? (best.l.kind === 'school' ? 'المدرسة' : best.l.f.short) : '';
  btn.classList.toggle('on', !!best); if (best) { const t = Math.abs(DV.v) < 1.2 ? `🚏 انزل عند ${name}` : `خفّف السرعة للتوقف عند ${name}`; if (btn.textContent !== t) btn.textContent = t; }
  $('#dv-kmh').textContent = Math.round(Math.abs(DV.v) * KMH);
  const goal = RW.locs.filter(l => l.kind === 'factory' && !best(l.f.id))[0] || RW.locs[0];
  $('#dv-next').textContent = `${goal.kind === 'school' ? 'المدرسة' : goal.f.short} · ${Math.round(Math.hypot(goal.bay.x - x, goal.bay.z - z))} م`;
  if ((HUD.mapT -= dt) <= 0) { HUD.mapT = .1; drawMap($('#dv-map'), { target: goal.bay }); }
}
async function driveAct() {
  const n = DV.near; if (S.mode !== 'drive' || !n || Math.abs(DV.v) > 1.2) return;
  S.mode = 'ride'; show('hud'); $('#hud').classList.add('cine'); Audio_.sfx('bus_brake', .7);
  // pull in neatly beside the gate
  const b = n.l.bay, x0 = bus.position.x, z0 = bus.position.z, y0 = bus.rotation.y; let k = 0;
  await cine(dt => { k = Math.min(1, k + dt / 1.2); const e = ease(k), px = bus.position.x, pz = bus.position.z; bus.position.set(x0 + (b.x - x0) * e, .02, z0 + (b.z - z0) * e); bus.rotation.y = y0 + angTo(y0, b.yaw) * e; bus.userData.roll(Math.hypot(bus.position.x - px, bus.position.z - pz)); busV = 0; return k < 1; });
  parkAt(b.id); DV.v = 0; document.body.classList.remove('driving'); await alight(n.i); marker.visible = true;
  if (DV.red) setTimeout(() => toast(`قطعت ${DV.red} ${DV.red === 1 ? 'إشارة حمراء' : 'إشارات حمراء'} في هذه الجولة 🚦`, 3200), 3400);
}

/* ---------------- مِرشد: the guide who goes everywhere with the student ---------------- */
let robo = null;
const talkQ = { busy: false, q: [], cur: null };
/* a line from the guide. Most lines show for a moment and go (queued, never in the way); wait: true
   holds the game until the player taps. With the guide switched off, short lines become toasts. */
function say(text, { role = '', wait = false, ms = 0 } = {}) {
  if (!S.robot) { if (!wait) toast(text, ms || Math.max(2600, text.length * 60)); return Promise.resolve(); }
  if (!wait) { talkQ.q.push([text, ms]); pumpTalk(); return Promise.resolve(); }
  talkQ.q.length = 0; clearTimeout(talkQ.h); talkQ.cur = null;
  const box = $('#talk'), out = $('#t-text'); $('#t-role').textContent = role || (IN ? `مرشدك في ${TV.F?.short || 'المصنع'}` : 'مرشدك في الرحلة');
  box.hidden = false; box.classList.remove('soft'); out.textContent = ''; robo?.talk(Math.min(6, text.length / 18 + 1)); Audio_.sfx('panel_open', .25); $('#t-next').style.visibility = '';
  let i = 0, done = false; clearInterval(say.t);
  say.t = setInterval(() => { i = Math.min(text.length, i + 2); out.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(say.t); done = true; } }, 28);
  talkQ.busy = true;
  return new Promise(res => {
    const next = e => { if (e?.type === 'keydown' && !['KeyE', 'Space', 'Enter'].includes(e.code)) return; if (!done) { clearInterval(say.t); out.textContent = text; done = true; return; } box.removeEventListener('click', next); removeEventListener('keydown', next); box.hidden = true; talkQ.busy = false; Audio_.sfx('ui_click', .3); res(); pumpTalk(); };
    setTimeout(() => { box.addEventListener('click', next); addEventListener('keydown', next); }, 250);
  });
}
function pumpTalk() {
  if (talkQ.busy || talkQ.cur) return; const n = talkQ.q.shift(); if (!n) return;
  const [text, ms] = n, box = $('#talk'), out = $('#t-text'); talkQ.cur = n;
  $('#t-role').textContent = IN ? `مرشدك في ${TV.F?.short || 'المصنع'}` : 'مرشدك في الرحلة';
  box.hidden = false; box.classList.add('soft'); out.textContent = text; $('#t-next').style.visibility = 'hidden'; robo?.talk(Math.min(5, text.length / 18 + 1));
  const close = () => { if (talkQ.cur !== n) return; box.hidden = true; box.classList.remove('soft'); talkQ.cur = null; box.onclick = null; pumpTalk(); };
  box.onclick = close; talkQ.h = setTimeout(close, ms || Math.max(2800, text.length * 65));
}
async function sayAll(lines, opt) { for (const l of lines) await say(l, opt); }
/* the guide floats beside the student, or a little ahead toward where to go next */
function guide(dt, lead = null, floorY = 0) {
  if (!robo) return; const r = player.root.position;
  // the camera's forward and right on the ground: the guide stays to the right of the student, a step further away
  let fx = r.x - camera.position.x, fz = r.z - camera.position.z; const fl = Math.hypot(fx, fz) || 1; fx /= fl; fz /= fl; const rx = -fz, rz = fx;
  const tgt = new THREE.Vector3(r.x + rx * 1.3 + fx * .5, 0, r.z + rz * 1.3 + fz * .5);
  if (lead) { const dx = lead.x - r.x, dz = lead.z - r.z, L = Math.hypot(dx, dz); if (L > 6) tgt.set(r.x + dx / L * 1.8 + rx * .7, 0, r.z + dz / L * 1.8 + rz * .7); }
  robo.target.copy(tgt); robo.floor = floorY + .6; robo.look = !$('#talk').hidden ? camera.position : null; robo.update(dt);
}

/* ---------------- factories: a walk-through visit ---------------- */
const TV = { F: null, M: null, tour: null, ppe: false, facts: new Set(), mission: null, quiz: null, gear: false, busy: false, hz: false, hzT: 0, hints: 0, next: null };
async function enterFactory(F) {
  if (S.mode !== 'world') return;
  S.mode = 'loading'; curF = F; Audio_.sfx('panel_open'); const M = MS(F), T = TRACKS[trackOf()];
  IN = await loadingScreen({ img: REGIONS[S.region].img, kicker: 'زيارة المصنع', title: F.short, sub: `${F.name} · مسار ${T.name}`, from: 'البوابة', to: 'خط الإنتاج', kind: 'pass', meta2: T.name, min: 1700,
    tips: [M.brief, 'ارتدِ معدات الوقاية، اقرأ المحطات الثلاث، أنجز المهمة، ثم اختبار المشرف.', 'في كل مصنع ترس ذهبي مخبّأ… ابحث عنه!'],
    task: async () => { const I = await buildInterior(renderer, F, M); I.tour = addTour(I, F, M); if (renderer.compileAsync) await renderer.compileAsync(I.scene, camera).catch(() => {}); return I; } });
  await startTour(F);
}
async function startTour(F) {
  Object.assign(TV, { F, M: MS(F), bit: {}, cd: {}, tour: IN.tour, ppe: false, facts: new Set(), mission: null, quiz: null, gear: !!S.gears[F.id], busy: true, hz: false, hints: 0 });
  if (TV.gear) TV.tour.gear.visible = false;
  RW.scene.remove(player.root); IN.scene.add(player.root); player.root.visible = true; player.root.position.copy(TV.tour.spawn); player.root.position.y = 0; player.speed = 0;
  // facing the lockers, the camera outside the glass of the gear room
  faceHero(0); camYaw = Math.PI; camPitch = .3; follow(0, true, tourSpace());
  if (robo) { RW.scene.remove(robo.group); IN.scene.add(robo.group); robo.place(new THREE.Vector3(-17.6, 0, 9.6)); }
  show('hud'); document.body.classList.add('in-tour'); S.mode = 'tour'; renderTour();
  Audio_.music('factory_1', { vol: .42 });
  await howto('tour', 'جولة المصنع', [['🦺', 'ابدأ بخزانة معدات الوقاية: اختر ما يحتاجه هذا المصنع'], ['📖', 'اقرأ محطات المعلومات الثلاث على الممر الأخضر'], ['★', 'أنجز مهمة المصنع عند الشاشة الكبيرة'], ['✓', 'أجب عن أسئلة المشرف لتحصل على ختم المصنع · وابحث عن الترس الذهبي ⚙️']]);
  say(`أهلاً بك في ${F.name}! ابدأ من خزانة معدات الوقاية 🦺`);
  TV.busy = false;
}
const tourSpace = () => ({ indoor: true, boxes: IN.boxes, circles: IN.circles, bounds: IN.bounds,
  height: (x, z, feet) => { let h = 0; for (const [x0, z0, x1, z1, hh] of TV.tour.platforms) if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && feet >= hh - .35) h = Math.max(h, hh); return h; },
  solid: (x, z, feet) => TV.tour.platforms.some(([x0, z0, x1, z1, hh]) => x > x0 - .25 && x < x1 + .25 && z > z0 - .25 && z < z1 + .25 && feet < hh - .35) });
function renderTour() {
  const F = TV.F, T = TRACKS[TV.M.track], C = TOUR[F.id];
  $('#tc-logo').src = F.logo || 'assets/img/logo-mark.webp'; $('#tc-name').textContent = F.name; $('#tc-track').textContent = `مسار ${T.name} · ${TV.M.title}`;
  const steps = [['ppe', '🦺', 'معدات الوقاية', TV.ppe, ''], ['facts', '📖', 'محطات المعلومات', TV.facts.size === 3, `${TV.facts.size}/3`], ['mission', '★', `المهمة: ${TV.M.title}`, TV.mission != null, TV.mission != null ? '⭐'.repeat(TV.mission) : ''], ['quiz', '✓', 'اختبار المشرف', TV.quiz != null, TV.quiz != null ? `${TV.quiz}/3` : ''], ['gear', '⚙', 'الترس الذهبي (سرّي)', TV.gear, '']];
  const now = !TV.ppe ? 'ppe' : TV.mission == null ? (TV.facts.size < 3 ? 'facts' : 'mission') : TV.quiz == null ? 'quiz' : '';
  $('#tc-list').innerHTML = steps.map(([k, i, t, ok, v]) => `<li class="${ok ? 'ok' : k === now ? 'now' : ''}"><em>${ok ? '✓' : i}</em><span>${t}</span><small>${v}</small></li>`).join('');
  // the marker over the next place to go
  const ic = TV.tour.icons; for (const k in ic) ic[k].visible = false;
  if (!TV.ppe) { ic.ppe.visible = true; TV.next = TV.tour.points.ppe; }
  else {
    TV.tour.kiosks.forEach(k => { ic['k' + k.i].visible = !TV.facts.has(k.i); });
    ic.mission.visible = TV.mission == null; ic.quiz.visible = TV.mission != null && TV.quiz == null;
    const k = TV.tour.kiosks.find(k => !TV.facts.has(k.i));
    TV.next = TV.mission == null ? (k && TV.facts.size < 3 ? new THREE.Vector3(k.x, 0, k.z) : TV.tour.points.mission) : TV.quiz == null ? TV.tour.points.quiz : TV.tour.points.exit;
  }
  $('#st-pts').textContent = points().toLocaleString('en');
}
let tnear = null;
function tourStep(dt) {
  IN.update(dt); TV.tour.update(dt);
  const sp = tourSpace();
  if (TV.busy || talkQ.busy) { player.speed = 0; animatePlayer(player, dt, 0, null); follow(dt, false, sp); }
  else moveStudent(dt, sp);
  const r = player.root.position, feet = r.y + (player.jy || 0);
  hazardsBite(dt, r);
  guide(dt, TV.next, 0);
  // the golden gear: walk (or jump) into it
  const g = TV.tour.gear; if (!TV.gear && g.visible && Math.hypot(r.x - g.position.x, r.z - g.position.z) < 1 && feet > .55) {
    TV.gear = true; g.visible = false; S.gears[TV.F.id] = 1; S.xp += 50; persist(); Audio_.sfx('level_up', .6); flash(); renderTour();
    say('وجدت الترس الذهبي! ⚙️ هذا من أسرار المصنع: +50 نقطة.', { wait: false });
  }
  // what is within reach
  const P = TV.tour.points, d2 = p => Math.hypot(r.x - p.x, r.z - p.z);
  tnear = null;
  if (TV.hz) { const h = IN.hazards.find(h => !h.found && Math.hypot(r.x - h.anchor.x, r.z - h.anchor.z) < 3.3); if (h) tnear = { k: 'hz', h, t: '⚠️ بلّغ عن هذا الخطر' }; }
  if (!tnear) {
    if (d2(P.ppe) < 1.9) tnear = { k: 'ppe', t: TV.ppe ? '🦺 معدات الوقاية' : '🦺 افتح خزانة معدات الوقاية' };
    else if (d2(P.exit) < 1.4) tnear = { k: 'exit', t: '🚪 اخرج من المصنع' };
    else if (TV.ppe) {
      const k = TV.tour.kiosks.find(k => Math.hypot(r.x - k.x, r.z - k.z) < 1.7);
      if (k) tnear = { k: 'fact', i: k.i, t: `📖 اقرأ المحطة ${k.i + 1}` };
      else if (d2(P.mission) < 2.1) tnear = { k: 'mission', t: TV.mission == null ? '▶ ابدأ المهمة' : TV.mission < 3 ? '🔁 أعد المهمة لنجوم أكثر' : '★ المهمة مكتملة' };
      else if (d2(P.quiz) < 2.1) tnear = { k: 'quiz', t: TV.mission == null ? '📝 اختبار المشرف (بعد المهمة)' : TV.quiz == null ? '📝 اختبار المشرف' : '🏁 أنهِ الزيارة' };
    }
  }
  const btn = $('#act'); btn.classList.toggle('on', !!tnear && !TV.busy && !talkQ.busy); if (tnear && btn.textContent !== tnear.t) btn.textContent = tnear.t;
  if (TV.hz) { TV.hzT += dt; if (TV.hzT > 30) { TV.hzT = 0; const left = IN.hazards.find(h => !h.found); if (left) { TV.hints++; say('تلميح: ' + left.hint, { wait: false }); } } }
}
/* the safety mission's hazards are real: oil makes you slip, the open panel throws sparks and pushes you back */
function hazardsBite(dt, r) {
  TV.slipT = Math.max(0, (TV.slipT || 0) - dt); TV.shake = Math.max(0, (TV.shake || 0) - dt);
  const h = player.hero; if (h) h.model.rotation.z = TV.slipT > 0 ? Math.sin(TV.slipT * 28) * .35 * TV.slipT : 0;
  if (TV.shake > 0) camera.position.add(new THREE.Vector3((Math.random() - .5) * TV.shake * .5, (Math.random() - .5) * TV.shake * .3, (Math.random() - .5) * TV.shake * .5));
  if (TV.M.game !== 'hazard' || !IN.fx) return;
  const push = (cx, cz, to) => { let dx = r.x - cx, dz = r.z - cz; const L = Math.hypot(dx, dz) || 1; r.x = cx + dx / L * to; r.z = cz + dz / L * to; player.speed = 0; };
  TV.bit ||= {}; TV.cd ||= {};
  for (const [k, f] of Object.entries(IN.fx)) {
    const d = f.line ? Math.abs(r.x - f.x) : Math.hypot(r.x - f.x, r.z - f.z), near = f.line ? d < f.r && Math.abs(r.z - f.z) < 2.6 : d < f.r;
    if (!near || (TV.cd[k] || 0) > performance.now()) continue;
    const found = IN.hazards.find(h => h.key === k)?.found; TV.cd[k] = performance.now() + 2500;
    if (k === 'oil' || k === 'cable') {
      // a slip or a trip: the student staggers back the way they came
      if (TV.slipT > 0) continue;
      if (k === 'cable') { r.x += Math.sign(r.x - f.x || 1) * 1.4; player.speed = 0; } else push(f.x, f.z, f.r + 1);
      TV.slipT = 1.1; TV.shake = .5; Audio_.sfx('wrong', .55); setTimeout(() => Audio_.sfx('land', .7), 250);
      if (!TV.bit[k]) { TV.bit[k] = 1; say(k === 'oil' ? (found ? 'انتبه! الزيت ما زال هنا حتى يُنظّف.' : '⚠️ كدت تنزلق! بقعة زيت على ممر المشاة… هذا خطر حقيقي على العمال.') : (found ? 'السلك ما زال هنا… انتبه لخطواتك.' : '⚠️ تعثّرت بسلك ممدود عبر الممر! هذا خطر على كل من يمشي هنا.')); }
    } else {
      push(f.x, f.z, f.r + .6); TV.shake = .6; Audio_.sfx(k === 'panel' || k === 'spark' ? 'factory_metal' : 'wrong', .6); if (k === 'panel' || k === 'spark') flash();
      if (!TV.bit[k]) { TV.bit[k] = 1; say({ panel: '⚡ ابتعد! لوحة الكهرباء مفتوحة والأسلاك مكشوفة. لا تلمسها أبداً.', spark: '🔥 الشرر يتطاير على الممر! اللحام يحتاج ستارة تحمي المارّين.', guard: '⚙️ ابتعد! الترس يدور مكشوفاً… قد يسحب اليد أو الملابس.', stack: '📦 الصناديق تهتز فوقك! التكديس المائل قد يسقط على أحد.', leak: '💨 البخار حار جداً! صمام مكسور يسرّب البخار على الممر.' }[k] || '⚠️ خطر!'); }
    }
  }
}
async function tourAct() {
  if (!tnear || TV.busy || talkQ.busy) return; const n = tnear, C = TOUR[TV.F.id];
  TV.busy = true; $('#act').classList.remove('on');
  try {
    if (n.k === 'ppe') { if (!TV.ppe) await openPPE(); else say(C.why.ar); }
    else if (n.k === 'fact') await openFact(n.i);
    else if (n.k === 'mission') { if (TV.mission === 3) say('أنجزت المهمة بثلاث نجوم! توجّه إلى مكتب المشرف.'); else await startMission(); }
    else if (n.k === 'quiz') { if (TV.mission == null) say('أنجز مهمة المصنع أولاً، ثم تعال إلى المشرف.'); else if (TV.quiz == null) await openQuiz(); else await finishTour(); }
    else if (n.k === 'exit') { if (TV.quiz != null || await confirmLeave()) { TV.busy = false; leaveFactory(TV.quiz != null ? '' : 'خرجت من المصنع · يمكنك العودة لإكمال الجولة'); return; } }
    else if (n.k === 'hz') await reportHazard(n.h);
  } finally { TV.busy = false; renderTour(); }
}
async function confirmLeave() { say('خرجت قبل إكمال الجولة. تقدر ترجع في أي وقت لتكملها.'); return true; }
/* ---- gear lockers: choose exactly what this floor needs ---- */
function openPPE() {
  const C = TOUR[TV.F.id], need = C.ppe, keys = Object.keys(PPE).sort(() => Math.random() - .5), sel = new Set(), ov = $('#ppe'), grid = $('#ppe-grid'), ok = $('#ppe-ok'), note = $('#ppe-note');
  $('#ppe-sub').textContent = `اختر ${need.length} معدات يحتاجها العامل في ${TV.F.name}. فكّر: ما الخطر هنا؟`;
  grid.innerHTML = keys.map(k => `<button type="button" data-k="${k}"><svg viewBox="0 0 24 24">${PPE_ICON[k]}</svg>${PPE[k].ar}</button>`).join('');
  note.textContent = `اختر ${need.length} معدات`; ok.disabled = true; ov.classList.add('on'); Audio_.sfx('panel_open', .5);
  let tries = 0;
  return new Promise(res => {
    grid.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k;
      grid.querySelectorAll('.good,.bad').forEach(x => x.classList.remove('good', 'bad'));
      if (sel.has(k)) sel.delete(k); else if (sel.size < need.length) sel.add(k); else return Audio_.sfx('wrong', .3);
      b.classList.toggle('sel', sel.has(k)); Audio_.sfx('ui_click', .4); ok.disabled = sel.size !== need.length; note.textContent = `${sel.size} / ${need.length}`;
    };
    ok.onclick = async () => {
      tries++; const wrong = [...sel].filter(k => !need.includes(k));
      grid.querySelectorAll('button').forEach(b => { if (sel.has(b.dataset.k)) b.classList.add(need.includes(b.dataset.k) ? 'good' : 'bad'); });
      if (wrong.length) { Audio_.sfx('wrong', .5); note.textContent = `${wrong.map(k => PPE[k].ar).join(' و')} ${wrong.length > 1 ? 'ليست' : 'ليس'} ما يحتاجه هذا المصنع. بدّل وجرّب مرة أخرى.`; return; }
      Audio_.sfx('task_done'); ok.disabled = true; await wait(700); ov.classList.remove('on');
      TV.ppe = true; S.xp += tries === 1 ? 40 : 15; persist(); equip(need); TV.tour.openGate(); Audio_.sfx('bus_door_open', .4); renderTour();
      say(`${tries === 1 ? 'صحيح من أول مرة! ' : ''}${C.why.ar}`, { ms: 6500 }); say('البوابة انفتحت: اقرأ المحطات الثلاث على الممر الأخضر، ثم المهمة في آخره.');
      res();
    };
  });
}
/* hard hat or hairnet on the student's head while on the floor */
let headGear = null;
function equip(list) {
  unequip(); const h = player.hero, head = h?.bones.Head; if (!head) return;
  const hat = list.includes('helmet'), net = list.includes('hairnet') || list.includes('coat');
  if (!hat && !net) return;
  const g = new THREE.Group();
  if (hat) { const m = new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: .35, metalness: .1 }); const dome = new THREE.Mesh(new THREE.SphereGeometry(.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1, .85, 1.08); g.add(dome); const brim = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .015, 28), m); brim.scale.z = 1.12; g.add(brim); const ridge = new THREE.Mesh(new THREE.BoxGeometry(.03, .025, .26), m); ridge.position.y = .12; g.add(ridge); }
  else { const m = new THREE.MeshStandardMaterial({ color: '#f4f7fb', roughness: .9 }); const cap = new THREE.Mesh(new THREE.SphereGeometry(.155, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); cap.scale.set(1, .8, 1.1); g.add(cap); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  // hang it on the head bone, sized and placed in world units
  h.root.updateMatrixWorld(true); const wp = head.getWorldPosition(new THREE.Vector3()), ws = head.getWorldScale(new THREE.Vector3()).x, top = wp.clone().add(new THREE.Vector3(0, .17, .01));
  head.add(g); g.position.copy(head.worldToLocal(top)); g.scale.setScalar(1 / ws); g.quaternion.copy(head.getWorldQuaternion(new THREE.Quaternion()).invert()); headGear = g;
}
function unequip() { headGear?.parent?.remove(headGear); headGear = null; }
/* ---- information kiosks ---- */
function openFact(i) {
  const f = TOUR[TV.F.id].facts[i], T = TRACKS[TV.M.track], ov = $('#fact'), isNew = !TV.facts.has(i);
  const FS = FSTYLE[TV.F.id] || FSTYLE.rabie; ov.className = `ovl th-${FS.theme}`; ov.style.setProperty('--fc', TV.F.color);
  $('#fact-n').textContent = i + 1; $('#fact-n').style.background = T.color; $('#fact-ic').textContent = FS.ic[i]; $('#fact-t').textContent = f.t.ar; $('#fact-b').textContent = f.b.ar;
  ov.classList.add('on'); Audio_.sfx('panel_open', .5);
  return new Promise(res => { $('#fact-ok').onclick = async () => {
    ov.classList.remove('on'); Audio_.sfx('ui_click');
    if (isNew) { TV.facts.add(i); S.xp += 20; S.facts[TV.F.id] = Math.max(S.facts[TV.F.id] || 0, TV.facts.size); persist(); Audio_.sfx('points', .45); renderTour();
      await say(TV.facts.size === 3 ? 'قرأت المحطات الثلاث! الآن أنت جاهز للمهمة عند الشاشة الكبيرة.' : `معلومة جديدة في دفترك (+20). باقي ${3 - TV.facts.size} ${3 - TV.facts.size === 1 ? 'محطة' : 'محطات'}.`, { wait: false }); }
    res(); }; });
}
/* ---- the factory's mission ---- */
async function startMission() {
  const F = TV.F, M = TV.M, T = TRACKS[M.track];
  if (M.game === 'hazard') {
    IN.hazards.forEach(h => { h.found = false; }); TV.hz = true; TV.hzT = 0; TV.hints = 0; TV.hzStart = performance.now();
    say(`مهمتك: ${M.brief}`, { ms: 6000 }); say('عندما تقف قرب الخطر اضغط «بلّغ». وانتبه على نفسك!');
    return;
  }
  if (TV.facts.size < 3) await say('تقدر تبدأ الآن، لكن معلومات المحطات ستفيدك كثيراً في اختبار المشرف!', { wait: false });
  S.mode = 'minigame'; show('none'); document.body.classList.remove('in-tour'); $('#talk').hidden = true; Audio_.music(M.game === 'quiz' || M.game === 'story' ? 'factory_2' : 'factory_1', { vol: .5 });
  await howto(`f-${M.track}-${F.id}`, `مسار ${T.name}: ${M.title}`, [['🎯', M.brief], ['⭐', 'كلما كان أداؤك أدق حصلت على نجوم أكثر (حتى 3 نجوم)'], ['✕', 'تقدر تخرج من اللعبة بأي وقت من زر الإغلاق']]);
  const out = await runMiniGame(F, A, M);
  S.mode = 'tour'; show('hud'); document.body.classList.add('in-tour'); follow(0, true, tourSpace()); Audio_.music('factory_1', { vol: .42 });
  if (out.exit) return say('رجعنا إلى المصنع. تقدر تبدأ المهمة متى ما أردت.', { wait: false });
  await missionDone(out.stars);
}
/* a small two-way question card; resolves with the chosen value */
function choice(title, text, opts) {
  const ov = $('#ask'); $('#ask-t').textContent = title; $('#ask-b').textContent = text;
  $('#ask-row').innerHTML = opts.map(([t], i) => `<button class="btn${i ? ' ghost' : ''}" type="button" data-i="${i}">${t}</button>`).join('');
  ov.classList.add('on'); Audio_.sfx('panel_open', .5);
  return new Promise(res => { $('#ask-row').onclick = e => { const b = e.target.closest('button'); if (!b) return; Audio_.sfx('ui_click'); ov.classList.remove('on'); res(opts[+b.dataset.i][1]); }; });
}
async function missionDone(stars) {
  const was = TV.mission; TV.mission = Math.max(TV.mission ?? 0, stars); renderTour();
  Audio_.sfx(stars ? 'level_up' : 'wrong', .6);
  // straight on to the supervisor, or later from the office at the back of the hall
  if (stars && TV.quiz == null) {
    const go = await choice(`${'⭐'.repeat(stars)} ${stars === 3 ? 'أداء مذهل!' : 'أحسنت!'}`, 'أنجزت مهمة المصنع. آخر خطوة: ثلاثة أسئلة من مشرف المصنع عمّا تعلّمته في المحطات.', [['📝 اختبار المشرف الآن', true], ['لاحقاً', false]]);
    if (go) return openQuiz();
    return say('مكتب المشرف خلف المصنع، اتبع السهم متى ما كنت جاهزاً.', { wait: false });
  }
  say(stars ? `${'⭐'.repeat(stars)} ${stars === 3 ? 'أداء مذهل!' : 'أحسنت!'} ${was == null ? 'آخر خطوة: اختبار المشرف في المكتب خلف المصنع.' : ''}` : 'لم تكتمل المهمة. جرّب مرة أخرى من الشاشة.');
}
async function reportHazard(h) {
  h.found = true; IN.fixHazard?.(h.key); Audio_.sfx('task_done'); Audio_.sfx('points', .5); TV.hzT = 0;
  const n = IN.hazards.filter(x => x.found).length; renderTour();
  await say(`✓ ${h.label} — أحسنت ملاحظتك! (${n}/${IN.hazards.length})`, { wait: false });
  if (n === IN.hazards.length) { TV.hz = false; const secs = (performance.now() - TV.hzStart) / 1000; await wait(900); await missionDone(TV.hints === 0 && secs < 120 ? 3 : TV.hints <= 1 ? 2 : 1); }
}
/* ---- the supervisor's quiz ---- */
function openQuiz() {
  const qs = TOUR[TV.F.id].facts, ov = $('#quiz'), dots = [...$('#quiz-dots').children]; let i = 0, score = 0;
  dots.forEach(d => d.className = ''); ov.classList.add('on'); Audio_.sfx('panel_open', .5);
  return new Promise(res => {
    const ask = () => {
      const f = qs[i], opts = f.a.map((a, k) => [a.ar, k === 0]).sort(() => Math.random() - .5); dots[i].className = 'on';
      $('#quiz-q').textContent = f.q.ar; $('#quiz-opts').innerHTML = opts.map(([t, ok], k) => `<button type="button" data-ok="${ok ? 1 : 0}">${t}</button>`).join('');
      $('#quiz-opts').onclick = async e => {
        const b = e.target.closest('button'); if (!b || $('#quiz-opts').dataset.lock) return; $('#quiz-opts').dataset.lock = 1;
        const ok = b.dataset.ok === '1'; b.classList.add(ok ? 'good' : 'bad'); if (!ok) $('#quiz-opts').querySelector('[data-ok="1"]').classList.add('good');
        Audio_.sfx(ok ? 'task_done' : 'wrong', .55); dots[i].className = ok ? 'ok' : 'no'; if (ok) score++;
        await wait(1100); delete $('#quiz-opts').dataset.lock; i++;
        if (i < qs.length) ask(); else { ov.classList.remove('on'); TV.quiz = score; S.xp += score * 30; S.quiz[TV.F.id] = Math.max(S.quiz[TV.F.id] || 0, score); persist(); renderTour(); await finishTour(); res(); }
      };
    };
    ask();
  });
}
async function finishTour() {
  const F = TV.F;
  say(TV.quiz >= 2 ? `أجبت ${TV.quiz} من 3! تستحق ختم ${F.short} في دفتر رحلتك. 🏅` : `أجبت ${TV.quiz} من 3. المعلومات في المحطات الثلاث… تقدر تراجعها وتعود.`); await wait(1600);
  await showResult(F, TV.mission || 0);
}

async function showResult(F, stars) {
  S.mode = 'result'; const T = TRACKS[trackOf()], before = badgeSet().has(trackOf()), prevBest = best(F.id);
  if (stars > prevBest) { S.done[dk(F.id)] = stars; persist(); }
  const gained = Math.max(0, stars - prevBest) * 100, newBadge = stars > 0 && !before;
  $('#done-badge').src = T.badge; $('#done-badge').style.filter = stars ? '' : 'grayscale(1) opacity(.5)';
  $('#done-title').textContent = stars ? (stars === 3 ? 'أداء مذهل!' : 'أحسنت!') : 'حاول مرة أخرى';
  $('#done-stars').innerHTML = [0, 1, 2].map(i => `<i class="${i < stars ? 'on' : ''}">★</i>`).join('');
  $('#done-text').innerHTML = (stars ? `أنهيت زيارة ${F.name}.${newBadge ? ` حصلت على شارة ${T.name}!` : ''}` : 'لم تكتمل المهمة هذه المرة. أعد المحاولة لتحصل على نجومك.')
    + `<span class="brk"><i>🦺 ${TV.ppe ? '✓' : '—'}</i><i>📖 ${TV.facts.size}/3</i><i>✓ ${TV.quiz ?? 0}/3</i><i>⚙ ${TV.gear ? '✓' : '؟'}</i></span>`;
  $('#done-pts').textContent = gained ? `+${gained} نقطة` : stars ? 'سجّلت أفضل نتيجة لديك سابقاً' : '';
  $('#done-retry').hidden = stars === 3; $('#done-retry').textContent = '🔁 أعد المهمة'; $('#done-ok').textContent = stars ? 'متابعة الرحلة' : 'خروج من المصنع';
  show('done'); Audio_.music(stars ? 'mission_complete' : 'factory_2', { loop: false, vol: .7 }); if (stars) Audio_.sfx('level_up', .6);
  return new Promise(res => {
    $('#done-retry').onclick = () => { Audio_.sfx('ui_click'); res(); S.mode = 'tour'; show('hud'); document.body.classList.add('in-tour'); follow(0, true, tourSpace()); Audio_.music('factory_1', { vol: .42 }); say('ارجع إلى شاشة المهمة متى ما أردت.', { wait: false }); };
    $('#done-ok').onclick = () => { Audio_.sfx('ui_click'); res(); leaveFactory(stars ? `+${gained} نقطة · ${'⭐'.repeat(stars)}` : ''); if (doneCount() === 12 && stars) setTimeout(finale, 900); else if (regionDone(S.region) === 3 && stars) setTimeout(() => toast(`أنجزت مصانع ${REGIONS[S.region].name} كلها! اركب الباص وسافر إلى منطقة أخرى 🗺️`, 4200), 1200); };
  });
}
function leaveFactory(msg) {
  unequip(); $('#talk').hidden = true; document.body.classList.remove('in-tour'); TV.hz = false; TV.busy = false;
  if (IN) { IN.scene.remove(player.root); if (robo) IN.scene.remove(robo.group); IN.dispose(); IN = null; }
  RW.scene.add(player.root); if (robo) RW.scene.add(robo.group);
  // back out of the gate onto the sidewalk, facing the street with the camera on the street side
  const loc = L(), g = loc.gate; player.root.visible = true; player.root.position.set(g.x, .2, g.z - loc.side * 1.2); faceHero(loc.side > 0 ? Math.PI : 0); camYaw = (loc.side > 0 ? Math.PI : 0) + .25; camPitch = .3; follow(0, true); justArrived = false;
  robo?.place(player.root.position.clone().add(new THREE.Vector3(1.2, 0, -loc.side * .8)), .35);
  S.mode = 'world'; show('hud'); Audio_.music(REGIONS[S.region].music, { vol: .55 }); updateHUD(); if (msg) toast(msg, 2600);
}
function leaveAnyFactory() { unequip(); $('#talk').hidden = true; document.body.classList.remove('in-tour'); if (IN) { IN.scene.remove(player.root); if (robo) IN.scene.remove(robo.group); IN.dispose(); IN = null; RW?.scene.add(player.root); if (robo) RW?.scene.add(robo.group); } $('#mg')?.classList.remove('on'); }

/* ---------------- the finale ---------------- */
let FIN = null;
async function finale() {
  S.mode = 'finale'; Audio_.music('theme_song', { vol: .75 }); $('#talk').hidden = true;
  const badges = Object.entries(TRACKS).map(([k, t]) => ({ src: t.badge, on: badgeSet().has(k), name: t.name, color: t.color, main: k === trackOf() }));
  FIN = await buildFinale(renderer, { badges, name: fullName(), track: TRACKS[trackOf()].name }); FIN.camK = 0; $('#final').classList.remove('cert');
  // the student on the podium, مِرشد beside, everyone facing the camera
  player.root.parent?.remove(player.root); FIN.scene.add(player.root); player.root.visible = true; player.root.position.copy(FIN.podium); faceHero(0); player.speed = 0;
  if (robo) { robo.group.parent?.remove(robo.group); FIN.scene.add(robo.group); robo.place(new THREE.Vector3(1.6, 0, .6), 1.5); robo.look = null; robo.wave(30); }
  show('final'); $('#fin-cert').classList.remove('on');
  $('#fin-h').textContent = `مبروك يا ${nameOf()}!`;
  $('#fin-text').textContent = `زرت ${doneCount()} مصنعاً في 4 مناطق، وجمعت ${badgeSet().size} شارات و${Object.keys(S.gears).length} تروس ذهبية. أنت الآن من صناعيو المستقبل.`;
  const cert = await certificate({ name: fullName(), char: S.char, factories: doneCount(), regions: 4, points: points(), gears: Object.keys(S.gears).length, badges, track: TRACKS[trackOf()], date: new Date().toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' }) });
  $('#fin-img').src = cert.toDataURL('image/png');
  $('#fin-dl').onclick = () => { const a = document.createElement('a'); a.download = 'future-industrialist-certificate.png'; a.href = $('#fin-img').src; a.click(); Audio_.sfx('ui_click'); };
  setTimeout(() => { if (S.mode === 'finale') { $('#fin-cert').classList.add('on'); $('#final').classList.add('cert'); Audio_.sfx('level_up', .5); } }, 7000);
}
function finaleStep(dt) {
  FIN.update(dt); animatePlayer(player, dt, 0, null); if (robo) { robo.target.set(1.6, 0, .6); robo.floor = 1.5; robo.update(dt); }
  const t = performance.now() / 1000, cert = $('#fin-cert').classList.contains('on'), a = t * .14;
  FIN.camK += ((cert ? 1 : 0) - FIN.camK) * Math.min(1, dt * 1.2); const k = FIN.camK, r = 5.2 + Math.sin(t * .23) * .6 + k * 6;
  camera.position.set(Math.sin(a) * r, 2.5 + Math.sin(t * .3) * .3 + k * 2.6, Math.cos(a) * r + 1.2); camera.lookAt(0, 2.5 + k * 1.6, 0);
}
$('#fin-ok').onclick = () => {
  Audio_.sfx('ui_click'); FIN.scene.remove(player.root); if (robo) FIN.scene.remove(robo.group); FIN.dispose(); FIN = null;
  RW.scene.add(player.root); if (robo) RW.scene.add(robo.group);
  show('hud'); S.mode = 'world'; follow(0, true); Audio_.music(REGIONS[S.region].music, { vol: .55 });
};

/* ---------------- loop ---------------- */
function loop() {
  const dt = Math.min(.05, clock.getDelta()) * TS; updateEngine();
  if (robo) robo.group.visible = S.robot && (!!player?.root.visible || S.mode === 'finale');
  if (player?.hero) { const fp = camMode === 3 && (S.mode === 'world' || S.mode === 'tour'); player.hero.model.visible = !fp; if (player.blob) player.blob.visible = !fp; }
  if (life && RW && (['world', 'intro', 'ride', 'drive'].includes(S.mode) || $('#route').classList.contains('on'))) {
    const pr = player.root.position, bh = bus.userData;
    if (S.mode !== 'ride' && S.mode !== 'drive') busPrio = null;
    signals?.update(dt, player.root.visible ? pr : null, busPrio);
    life.update(dt, [{ x: bus.position.x, z: bus.position.z, yaw: bus.rotation.y, halfLen: bh.halfLen, halfWid: bh.halfWid }, ...(player.root.visible ? [{ x: pr.x, z: pr.z, person: true }] : [])], camera.position);
  }
  if (S.mode === 'world' && RW) { RW.update(dt); walk(dt); renderer.render(RW.scene, camera); }
  else if (S.mode === 'drive' && RW) { RW.update(dt); driveStep(dt); renderer.render(RW.scene, camera); }
  else if (S.mode === 'tour' && IN) { tourStep(dt); if (window.__cam) { camera.position.set(...window.__cam.p); camera.lookAt(...window.__cam.l); } renderer.render(IN.scene, camera); }
  else if (S.mode === 'finale' && FIN) { finaleStep(dt); renderer.render(FIN.scene, camera); }
  else if ((S.mode === 'minigame' || S.mode === 'result') && IN) {
    IN.update(dt); const t = performance.now() / 1000; camera.position.set(Math.sin(t * .08) * 14, 6 + Math.sin(t * .13), 12 + Math.cos(t * .08) * 4); camera.lookAt(0, 1.2, -2);
    renderer.render(IN.scene, camera);
  }
  else if ((S.mode === 'menu' || S.mode === 'result') && RW && ($('#route').classList.contains('on') || $('#done').classList.contains('on') || $('#regions').classList.contains('on'))) { RW.update(dt); renderer.render(RW.scene, camera); }
  requestAnimationFrame(loop);
}
loop();

/* ---------------- test hooks for automated screenshots ---------------- */
window.__game = { renderer, TV, TOUR, missionDone, S, show, Audio_, loadingScreen, BAYS, NET, routeBus, parkAt, drawMap, get signals() { return signals; }, startDrive, DV, get life() { return life; }, startRegion, enterFactory, rideTo, act, camera, busDoor, L, get bus() { return bus; }, get RW() { return RW; }, get player() { return player; }, get IN() { return IN; } };
(async () => {
  const auto = Q.get('auto');
  if (!auto) { window.__ready = true; return; }
  $('#splash').classList.remove('on'); spFx.stop(); S.char = Q.get('c') || S.char; if (Q.get('track')) S.track = Q.get('track'); if (Q.get('name')) S.name = Q.get('name');
  if (auto === 'title') { showTitle(); }
  else if (auto === 'finale') { skip = true; await startRegion('riyadh'); while (S.mode !== 'world') { skip = true; await wait(100); } S.track ||= 'creative'; for (const f of ALL) S.done[dk(f.id)] = 3; await finale(); }
  else if (auto === 'mg') { const F = ALL.find(f => f.id === Q.get('id')); show('none'); runMiniGame(F, A, MS(F)).then(r => { window.__mgResult = r; }); }
  else {
    const F = Q.get('id') ? ALL.find(f => f.id === Q.get('id')) : null, r = F ? F.region : Q.get('r') || 'riyadh';
    skip = true; await startRegion(r);
    while (S.mode !== 'world') { skip = true; await wait(100); }
    if (auto === 'ride') { rideTo(+(Q.get('to') || 1)); await wait(+(Q.get('t') || 4000)); }
    else if (F) { const i = RW.locs.findIndex(l => l.f?.id === F.id), l = RW.locs[i]; S.loc = i; parkAt(l.bay.id); player.root.position.set(l.gate.x, .2, l.gate.z); updateHUD(); if (auto === 'factory') { S.mode = 'world'; enterFactory(F); while (!IN || S.mode === 'loading') await wait(100); if (Q.get('ht') === '0') { await wait(300); $('#ht-ok').click(); } await wait(+(Q.get('t') || 800)); } }
  }
  window.__ready = true;
})();

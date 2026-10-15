import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { buildWorld } from './world.js';
import { makeBus } from './bus.js';
import { buildFactory } from './factory.js';
import { canvas, toTex } from './tex.js';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const Q = new URLSearchParams(location.search);
const touch = matchMedia('(pointer: coarse)').matches; if (touch) document.body.classList.add('touch');

/* ---------------- audio ---------------- */
const Audio_ = {
  on: true, cur: null, name: '', vol: .55,
  music(name, { loop = true, vol = this.vol } = {}) {
    if (this.name === name) return; this.name = name;
    const old = this.cur, a = new Audio(`assets/music/${name}.mp3`); a.loop = loop; a.volume = 0; a.preload = 'auto';
    this.cur = a; if (this.on) a.play().catch(() => {});
    this.fade(a, vol, 900); if (old) this.fade(old, 0, 900, () => old.pause());
  },
  fade(a, to, ms, done) { const from = a.volume, t0 = performance.now(); const step = now => { const k = Math.min(1, (now - t0) / ms); a.volume = Math.min(1, Math.max(0, from + (to - from) * k)); if (k < 1) requestAnimationFrame(step); else done?.(); }; requestAnimationFrame(step); },
  sfx(name, vol = .7) { if (!this.on) return; const a = new Audio(`assets/sfx/${name}.ogg`); a.volume = vol; a.play().catch(() => {}); },
  toggle() { this.on = !this.on; if (this.cur) { if (this.on) this.cur.play().catch(() => {}); else this.cur.pause(); } $('#snd-wave').style.display = this.on ? '' : 'none'; }
};
$('#snd').addEventListener('click', () => Audio_.toggle());

/* ---------------- state + screens ---------------- */
const S = { char: 'boy', name: 'فهد', pts: 0, badges: 0, factories: 0, mode: 'menu' };
function show(id) { $$('.screen').forEach(s => s.classList.toggle('on', s.id === id)); $('#home').hidden = !['hud', 'mhud'].includes(id); }
$$('button').forEach(b => b.addEventListener('pointerenter', () => !touch && Audio_.sfx('ui_hover', .25)));
$('#start').addEventListener('click', () => { Audio_.sfx('ui_click'); Audio_.music('menu'); show('pick'); });
$('#title').addEventListener('click', e => { if (e.target.id !== 'start') Audio_.music('menu'); });
$$('[data-back]').forEach(b => b.addEventListener('click', () => { Audio_.sfx('panel_close'); show(b.dataset.back); }));
$$('.pcard').forEach(b => b.addEventListener('click', () => {
  Audio_.sfx('task_done', .5); $$('.pcard').forEach(x => x.classList.toggle('sel', x === b));
  S.char = b.dataset.c; S.name = S.char === 'boy' ? 'فهد' : 'سارة';
  setTimeout(() => show('regions'), 350);
}));
$$('.rcard').forEach(b => b.addEventListener('click', () => {
  if (b.classList.contains('locked')) { Audio_.sfx('wrong', .5); toast('هذه المنطقة قادمة قريباً'); return; }
  Audio_.sfx('ui_click'); startRegion(b.dataset.r);
}));
$('#home').addEventListener('click', () => { Audio_.sfx('panel_close'); S.mode = 'menu'; show('title'); Audio_.music('menu'); });
function toast(t, ms = 2400) { const e = $('#toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), ms); }

/* ---------------- renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('#c'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, touch ? 1.25 : 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, .1, 4000);
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); });

let world = null, factory = null, active = null, player = null, sun = null, W = null, gateMarker = null, orbit = null;
const clock = new THREE.Clock();

/* ---------------- loading ---------------- */
const TIPS = ['في كل مصنع مهمة مختلفة حسب مسارك: المكتشف، المبدع، الفنان، والسفير.', 'اجمع الشارات الأربع لتصبح من صناعيي المستقبل.', 'جوائز هاكثون صناعيو المستقبل تصل إلى 200,000 ريال.', 'انتبه لعلامات السلامة داخل المصنع… قد تكون جزءاً من مهمتك!'];
async function startRegion(r) {
  show('loading'); $('#loading').style.backgroundImage = 'url(assets/ui/load_riyadh.webp)';
  $('#ld-title').textContent = 'الطريق إلى الرياض · المدينة الصناعية الثانية';
  let ti = 0; $('#ld-tip').textContent = TIPS[0]; const tipT = setInterval(() => { ti = (ti + 1) % TIPS.length; $('#ld-tip').textContent = TIPS[ti]; }, 3200);
  Audio_.music('bus_trip');
  const bar = $('#ld-bar'); let shown = 0;
  THREE.DefaultLoadingManager.onProgress = (u, a, b) => { shown = Math.max(shown, a / b); bar.style.width = (8 + shown * 84) + '%'; };
  if (!world) await initWorld();
  await placePlayer();
  bar.style.width = '100%'; clearInterval(tipT);
  await new Promise(r => setTimeout(r, 500));
  enterWorld();
}

async function initWorld() {
  const scene = new THREE.Scene();
  const hdr = await new RGBELoader().loadAsync('assets/sky_1k.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; scene.environmentIntensity = .85;
  const sky = new Sky(); sky.scale.setScalar(3500); scene.add(sky);
  const su = sky.material.uniforms; su.turbidity.value = 3.5; su.rayleigh.value = 1.2; su.mieCoefficient.value = .004; su.mieDirectionalG.value = .8;
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(42), THREE.MathUtils.degToRad(-35)); su.sunPosition.value.copy(sunDir);
  scene.fog = new THREE.FogExp2('#d8e1ea', .0019);
  sun = new THREE.DirectionalLight('#fff1dc', 3); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 220 }); sun.shadow.bias = -.0003; sun.shadow.normalBias = .03;
  sun.userData.dir = sunDir.clone(); scene.add(sun, sun.target);
  W = await buildWorld(scene);
  const bus = await makeBus(); bus.position.set(6, .02, 5.6); scene.add(bus);
  // mission marker at the factory gate
  gateMarker = new THREE.Group(); gateMarker.position.copy(W.gate).setY(.05);
  const ringM = new THREE.MeshBasicMaterial({ color: '#847bb8', transparent: true, opacity: .85 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.4, 48), ringM); ring.rotation.x = -Math.PI / 2; gateMarker.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 6, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#9b93d6', transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false })); beam.position.y = 3; gateMarker.add(beam);
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(.45, .9, 4), new THREE.MeshStandardMaterial({ color: '#3c58a7', emissive: '#3c58a7', emissiveIntensity: .6 })); arrow.rotation.x = Math.PI; arrow.position.y = 3.4; gateMarker.add(arrow); gateMarker.userData.arrow = arrow;
  scene.add(gateMarker);
  world = { scene, colliders: collidersFor() };
}
function collidersFor() {
  const c = [];
  for (let x = -120; x <= 160; x += 13) c.push([x, 0, .5]);
  for (let x = -114; x <= 160; x += 26) c.push([x, 0, .3]);
  for (let x = -110; x <= 170; x += 15) c.push([x + 4, -11.5, .5]);
  return c;
}

/* ---------------- player ---------------- */
const gltf = new GLTFLoader();
async function exists(url) { try { const r = await fetch(url, { method: 'HEAD' }); return r.ok; } catch { return false; } }
async function placePlayer() {
  if (player) world.scene.remove(player.root);
  player = await makePlayer(S.char);
  player.root.position.set(-5, .2, 9.6); player.yaw = Math.PI + .62; camYaw = .62; camPitch = .3;
  world.scene.add(player.root);
  $('#av').style.backgroundImage = `url(assets/ui/${S.char}_front_cut.webp)`; $('#who-name').textContent = S.name;
}
/* A rigged GLB from Meshy if present (assets/chars/<kind>.glb + <kind>_<anim>.glb), else a cut-out of the concept art. */
async function makePlayer(kind) {
  const root = new THREE.Group(); const p = { root, kind, speed: 0, yaw: 0, mixer: null, actions: {}, sprite: null, t: 0 };
  // soft contact shadow
  const [c, x] = canvas(128, 128); const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(10,14,40,.45)'); g.addColorStop(1, 'rgba(10,14,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: toTex(c), transparent: true, depthWrite: false })); blob.rotation.x = -Math.PI / 2; blob.position.y = .02; root.add(blob);
  if (await exists(`assets/chars/${kind}.glb`)) {
    const g0 = await gltf.loadAsync(`assets/chars/${kind}.glb`); const model = g0.scene;
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const box = new THREE.Box3().setFromObject(model), h = box.max.y - box.min.y; model.scale.multiplyScalar(1.55 / h); model.position.y = -box.min.y * 1.55 / h;
    const holder = new THREE.Group(); holder.add(model); root.add(holder); p.holder = holder;
    p.mixer = new THREE.AnimationMixer(model);
    const clips = [...g0.animations];
    for (const a of ['idle', 'walk', 'run', 'wave', 'cheer']) if (await exists(`assets/chars/${kind}_${a}.glb`)) { const ga = await gltf.loadAsync(`assets/chars/${kind}_${a}.glb`); ga.animations.forEach(cl => { cl.name = a; clips.push(cl); }); }
    const pick = re => clips.find(cl => re.test(cl.name));
    for (const [k, re] of [['idle', /idle|stand/i], ['walk', /walk/i], ['run', /run/i], ['cheer', /cheer|victory|wave/i]]) { const cl = pick(re); if (cl) p.actions[k] = p.mixer.clipAction(cl); }
    p.actions.idle?.play(); p.cur = 'idle';
  } else {
    const tl = new THREE.TextureLoader(); const load = u => new Promise(r => tl.load(u, t => { t.colorSpace = THREE.SRGBColorSpace; r(t); }));
    const [front, back] = await Promise.all([load(`assets/ui/${kind}_front_cut.webp`), load(`assets/ui/${kind}_back_cut.webp`)]);
    const mat = new THREE.SpriteMaterial({ map: back, transparent: true, alphaTest: .4 });
    const sp = new THREE.Sprite(mat); sp.center.set(.5, 0); const ar = back.image.width / back.image.height; sp.scale.set(1.55 * ar, 1.55, 1); root.add(sp);
    p.sprite = sp; p.tex = { front, back }; p.ar = { front: front.image.width / front.image.height, back: ar };
  }
  return p;
}
function setAction(p, name) {
  if (!p.mixer || p.cur === name || !p.actions[name]) return;
  const next = p.actions[name], prev = p.actions[p.cur]; next.reset().play(); if (prev) next.crossFadeFrom(prev, .25, false); p.cur = name;
}

/* ---------------- input ---------------- */
const keys = {}; let joy = { x: 0, y: 0 }, camYaw = .35, camPitch = .32, drag = null;
addEventListener('keydown', e => { keys[e.code] = true; if (e.code === 'KeyE' && S.mode === 'world' && nearGate) enterFactory(); });
addEventListener('keyup', e => { keys[e.code] = false; });
const cv = $('#c');
cv.addEventListener('pointerdown', e => { if (S.mode === 'world') { drag = { x: e.clientX, y: e.clientY, yaw: camYaw, pitch: camPitch }; cv.setPointerCapture(e.pointerId); } });
cv.addEventListener('pointermove', e => { if (!drag) return; camYaw = drag.yaw - (e.clientX - drag.x) * .006; camPitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * .004, .12, .9); });
cv.addEventListener('pointerup', () => { drag = null; });
const jo = $('#joy'), knob = jo.querySelector('i');
jo.addEventListener('pointerdown', e => { jo.setPointerCapture(e.pointerId); joyMove(e); });
jo.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'touch') joyMove(e); });
jo.addEventListener('pointerup', () => { joy = { x: 0, y: 0 }; knob.style.transform = ''; });
function joyMove(e) { const r = jo.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), d = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), a = Math.atan2(dy, dx); joy = { x: Math.cos(a) * d, y: Math.sin(a) * d }; knob.style.transform = `translate(${joy.x * 38}px,${joy.y * 38}px)`; }
$('#act').addEventListener('click', () => { if (nearGate) enterFactory(); });

/* ---------------- world mode ---------------- */
let nearGate = false, stepT = 0, missionDone = false;
function enterWorld() {
  S.mode = 'world'; active = world.scene; show('hud'); Audio_.music('riyadh', { vol: .4 });
  toast('وصلت إلى المدينة الصناعية الثانية بالرياض 🚌', 3200);
  updateStats();
}
function updateStats() { $('#st-pts').textContent = S.pts.toLocaleString('en'); $('#st-fac').textContent = `${S.factories}/1`; $('#st-bdg').textContent = S.badges; }
function worldUpdate(dt) {
  const p = player, r = p.root;
  let ix = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + joy.x;
  let iz = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0) + joy.y;
  const mag = Math.min(1, Math.hypot(ix, iz)), run = keys.ShiftLeft || keys.ShiftRight || mag > .95 && touch;
  const target = mag > .1 ? (run ? 5.2 : 3) : 0; p.speed += (target - p.speed) * Math.min(1, dt * 8);
  if (mag > .1) {
    const ang = Math.atan2(ix, iz) + camYaw; // movement relative to the camera
    const dx = Math.sin(ang), dz = Math.cos(ang);
    let nx = r.position.x + dx * p.speed * dt, nz = r.position.z + dz * p.speed * dt;
    // walkable area: both sidewalks and the road, through the gate only near it
    const inGate = nx > -25.2 && nx < -18.8;
    nx = THREE.MathUtils.clamp(nx, -70, 70); nz = THREE.MathUtils.clamp(nz, inGate ? -14.2 : -13.2, 12.6);
    if (nx > -.3 && nx < 12.3 && nz > 4.2 && nz < 7) { nx = r.position.x; nz = r.position.z; } // the bus
    for (const [cx, cz, cr] of world.colliders) { const ddx = nx - cx, ddz = nz - cz, d = Math.hypot(ddx, ddz), min = cr + .3; if (d < min) { nx = cx + ddx / d * min; nz = cz + ddz / d * min; } }
    r.position.x = nx; r.position.z = nz;
    p.yaw = THREE.MathUtils.lerp(p.yaw, ang, Math.min(1, dt * 10));
    // street level vs sidewalk height
    const onWalk = nz > 7.8 || nz < -7.8 || Math.abs(nz) < .8; r.position.y += ((onWalk ? .2 : .02) - r.position.y) * Math.min(1, dt * 12);
    stepT -= dt * (p.speed / 3); if (stepT <= 0) { Audio_.sfx(`step_${1 + (Math.random() * 5 | 0)}`, .22); stepT = .42; }
  }
  if (p.mixer) { p.holder.rotation.y = p.yaw; setAction(p, p.speed > 4 ? (p.actions.run ? 'run' : 'walk') : p.speed > .4 ? 'walk' : 'idle'); p.mixer.update(dt); }
  else {
    // cut-out: back view when walking away from the camera, front when coming towards it
    const away = Math.cos(p.yaw - camYaw) > 0 ? 'front' : 'back';
    if (p.speed < .3 && p.face) {} else p.face = away;
    const tx = p.tex[p.face]; if (p.sprite.material.map !== tx) { p.sprite.material.map = tx; p.sprite.scale.x = 1.55 * p.ar[p.face]; }
    p.t += dt * p.speed * 3.2; const b = Math.abs(Math.sin(p.t)) * .045 * Math.min(1, p.speed);
    p.sprite.position.y = b; p.sprite.scale.y = 1.55 * (1 - b * .4);
  }
  // camera follows behind
  const tgt = new THREE.Vector3(r.position.x, r.position.y + 1.35, r.position.z), dist = 6.2;
  const want = new THREE.Vector3(tgt.x + Math.sin(camYaw) * Math.cos(camPitch) * dist, tgt.y + Math.sin(camPitch) * dist, tgt.z + Math.cos(camYaw) * Math.cos(camPitch) * dist);
  camera.position.lerp(want, Math.min(1, dt * 6)); camera.lookAt(tgt);
  // keep the sun's shadow box around the player
  sun.position.copy(r.position).addScaledVector(sun.userData.dir, 120); sun.target.position.copy(r.position);
  // gate marker
  const t = performance.now() / 1000; gateMarker.userData.arrow.position.y = 3.2 + Math.sin(t * 2.4) * .25; gateMarker.userData.arrow.rotation.y = t;
  gateMarker.visible = !missionDone;
  nearGate = !missionDone && r.position.distanceTo(new THREE.Vector3(W.gate.x, r.position.y, W.gate.z)) < 3.2;
  $('#act').classList.toggle('on', nearGate);
  const d = Math.hypot(r.position.x - W.gate.x, r.position.z - W.gate.z);
  if (!missionDone) { $('#m-bar').style.width = Math.max(10, Math.min(50, 50 - (d - 3) * 1.4)) + '%'; }
}

/* ---------------- factory mission ---------------- */
let found = 0;
async function enterFactory() {
  if (S.mode !== 'world') return;
  S.mode = 'loading'; Audio_.sfx('panel_open'); show('loading');
  $('#loading').style.backgroundImage = 'url(assets/ui/load_riyadh.webp)'; $('#ld-title').textContent = 'مصنع الربيع للأغذية · خط إنتاج العصائر'; $('#ld-tip').textContent = 'مهمتك كمكتشف: لاحظ ما يهدد سلامة العاملين، وسجّل كل خطر تجده.';
  const bar = $('#ld-bar'); bar.style.width = '30%';
  if (!factory) { factory = await buildFactory(renderer); }
  bar.style.width = '100%'; await new Promise(r => setTimeout(r, 400));
  S.mode = 'factory'; active = factory.scene; show('mhud'); Audio_.music('factory_1', { vol: .4 });
  camera.position.copy(factory.view.pos); camera.lookAt(factory.view.target);
  orbit = new OrbitControls(camera, renderer.domElement); orbit.target.copy(factory.view.target); orbit.enablePan = false; orbit.enableDamping = true;
  orbit.minDistance = 6; orbit.maxDistance = 22; orbit.maxPolarAngle = 1.35; orbit.minPolarAngle = .35; orbit.update();
  found = factory.hazards.filter(h => h.found).length; renderDots(); hintT = 0;
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let downAt = null, hintT = 0;
cv.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
cv.addEventListener('pointerup', e => {
  if (S.mode !== 'factory' || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 8) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(factory.hazards.map(h => h.mesh))[0];
  if (!hit) return;
  const hz = hit.object.userData.hz; if (hz.found) return;
  hz.found = true; found++; S.pts += 100; Audio_.sfx('task_done'); Audio_.sfx('points', .5); renderDots(); addLabel(hz); hintT = 0;
  if (found === factory.hazards.length) setTimeout(missionComplete, 900);
});
function renderDots() { $('#m-dots').innerHTML = factory.hazards.map(h => `<i class="${h.found ? 'on' : ''}"></i>`).join(''); }
const labels = [];
function addLabel(hz) { const el = document.createElement('div'); el.className = 'label3d'; el.textContent = '✓ ' + hz.label; $('#labels').append(el); labels.push({ el, hz }); }
function factoryUpdate(dt) {
  factory.update(dt); orbit.update();
  for (const { el, hz } of labels) { const v = hz.anchor.clone().project(camera); el.style.display = v.z < 1 ? '' : 'none'; el.style.left = (v.x * .5 + .5) * innerWidth + 'px'; el.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; }
  hintT += dt; if (hintT > 25) { hintT = 0; const left = factory.hazards.find(h => !h.found); if (left) toast('تلميح: ' + ({ oil: 'انظر إلى ممر المشاة الأخضر', exit: 'تفقّد مخرج الطوارئ', panel: 'هل كل الأبواب مغلقة كما يجب؟' })[left.key]); }
}
function missionComplete() {
  Audio_.music('mission_complete', { loop: false, vol: .7 }); Audio_.sfx('level_up', .6);
  S.badges = 1; S.factories = 1; missionDone = true; show('done');
}
$('#done-ok').addEventListener('click', () => {
  Audio_.sfx('ui_click'); orbit?.dispose(); orbit = null; labels.forEach(l => l.el.remove()); labels.length = 0;
  S.mode = 'world'; active = world.scene; show('hud'); Audio_.music('riyadh', { vol: .4 }); updateStats();
  player.root.position.set(W.gate.x, .2, W.gate.z + 2.5); camYaw = Math.PI * .1;
  $('#m-title').textContent = 'المحطة التالية: القصيم'; $('#m-text').textContent = 'حصلت على شارة المكتشف! ارجع إلى الباص لتنتقل إلى القصيم وتبدأ مسار المبدع (قريباً).';
  $('#m-bar').style.width = '100%'; $('#m-step').textContent = 'اكتملت المهمة'; toast('+300 نقطة · شارة المكتشف', 2600);
});

/* ---------------- loop ---------------- */
function loop() {
  const dt = Math.min(.05, clock.getDelta());
  if (S.mode === 'world' && world) { worldUpdate(dt); renderer.render(world.scene, camera); }
  else if (S.mode === 'factory' && factory) { factoryUpdate(dt); renderer.render(factory.scene, camera); }
  else if (active) renderer.render(active, camera);
  requestAnimationFrame(loop);
}
loop();
// test hooks for automated screenshots
window.__game = { S, startRegion, enterFactory, show, get player() { return player; }, get factory() { return factory; }, setCam(y, p) { camYaw = y; camPitch = p; } };
if (Q.get('auto') === 'world') { S.char = Q.get('c') || 'boy'; S.name = S.char === 'boy' ? 'فهد' : 'سارة'; startRegion('riyadh').then(() => window.__ready = true); }
else if (Q.get('auto') === 'factory') { startRegion('riyadh').then(() => enterFactory()).then(() => window.__ready = true); }
else window.__ready = true;

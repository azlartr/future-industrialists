import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, loadImg, pbr, BRAND, network, grad, noise2 } from './tex.js';
import { makePalm } from './palm.js';

/* A street in Riyadh's 2nd Industrial City: a 4-lane road along x with a palm median,
   a sidewalk with a bus stop on +z, and the YORK factory across the road on -z. */
const gl = new GLTFLoader(), models = {};
async function model(name) {
  if (!models[name]) models[name] = gl.loadAsync(`assets/models/${name}/${name}.gltf`).then(g => { g.scene.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } }); return g.scene; });
  return (await models[name]).clone(true);
}
function m(g, mat, cast = true) { const o = new THREE.Mesh(g, mat); o.castShadow = cast; o.receiveShadow = true; return o; }
function box(w, h, d, mat, x, y, z, cast = true) { const o = m(new THREE.BoxGeometry(w, h, d), mat, cast); o.position.set(x, y, z); return o; }

/* box UVs scaled to world metres, so tiled textures keep a constant size */
function worldUV(g, scale = 1) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    if (ay > .5) uv.setXY(i, p.getX(i) / scale, p.getZ(i) / scale);
    else if (ax > .5) uv.setXY(i, p.getZ(i) / scale, p.getY(i) / scale);
    else uv.setXY(i, p.getX(i) / scale, p.getY(i) / scale);
  }
  return g;
}
function tbox(w, h, d, mat, x, y, z, scale = 1) { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); worldUV(g, scale); return m(g, mat); }

function curbTex() { const [c, x] = canvas(256, 32); for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#111317' : '#f2c230'; x.fillRect(i * 64, 0, 64, 32); } const t = toTex(c); t.wrapS = THREE.RepeatWrapping; return t; }

function facadeGlass(cols, rows, seed = 1, tint = [150, 175, 205]) {
  const [c, x] = canvas(512, 1024), n = noise2(seed);
  const cw = 512 / cols, rh = 1024 / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = n(i * .7, j * .35) * .5 + Math.random() * .12, k = .55 + v * .5;
    x.fillStyle = `rgb(${tint[0] * k | 0},${tint[1] * k | 0},${tint[2] * k | 0})`; x.fillRect(i * cw, j * rh, cw, rh);
    if (Math.random() < .25) { x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(i * cw, j * rh, cw, rh * .5); }
  }
  x.fillStyle = 'rgba(60,66,80,.85)'; for (let i = 0; i <= cols; i++) x.fillRect(i * cw - 2, 0, 4, 1024); for (let j = 0; j <= rows; j++) x.fillRect(0, j * rh - 3, 512, 6);
  return toTex(c);
}
function facadeStone(cols, rows, seed = 2) {
  const [c, x] = canvas(512, 512), n = noise2(seed);
  x.fillStyle = '#d9c3a0'; x.fillRect(0, 0, 512, 512);
  for (let j = 0; j < 512; j += 4) for (let i = 0; i < 512; i += 4) { const v = n(i / 30, j / 30); x.fillStyle = `rgba(120,90,50,${v * .12})`; x.fillRect(i, j, 4, 4); }
  const cw = 512 / cols, rh = 512 / rows;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const wx = i * cw + cw * .22, wy = j * rh + rh * .28, ww = cw * .56, wh = rh * .5;
    x.fillStyle = '#3c4656'; x.fillRect(wx, wy, ww, wh); x.fillStyle = 'rgba(160,190,220,.35)'; x.fillRect(wx, wy, ww, wh * .4);
    x.fillStyle = '#b39a76'; x.fillRect(wx - 3, wy + wh, ww + 6, 5);
  }
  return toTex(c);
}

async function sign(img, w, h, { pad = .08, bg = '#ffffff', round = 30 } = {}) {
  const im = await loadImg(img), W = 1024, H = Math.round(1024 * h / w), [c, x] = canvas(W, H);
  x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, W, H, round); x.fill();
  const r = Math.min(W * (1 - pad * 2) / im.width, H * (1 - pad * 2) / im.height);
  x.drawImage(im, (W - im.width * r) / 2, (H - im.height * r) / 2, im.width * r, im.height * r);
  return toTex(c);
}
async function fiAd() {
  const W = 2048, H = 1024, [c, x] = canvas(W, H);
  x.fillStyle = grad(x, 0, 0, W, H, [[0, BRAND.navy], [.6, BRAND.blue], [1, BRAND.violet]]); x.fillRect(0, 0, W, H);
  network(x, W, H, { n: 60, link: 260, color: 'rgba(255,255,255,.16)', dot: 'rgba(255,255,255,.5)', lw: 2.4, seed: 9 });
  const logo = await loadImg('assets/img/logo.webp');
  x.fillStyle = '#fff'; x.beginPath(); x.arc(W - 380, H / 2, 300, 0, 7); x.fill();
  const r = 440 / Math.max(logo.width, logo.height); x.drawImage(logo, W - 380 - logo.width * r / 2, H / 2 - logo.height * r / 2, logo.width * r, logo.height * r);
  x.fillStyle = '#fff'; x.textAlign = 'right'; x.direction = 'rtl';
  x.font = '700 150px "Readex Pro"'; x.fillText('اكتشف مصانعنا', W - 760, 420);
  x.font = '400 78px "Readex Pro"'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText('جيل وطني يرى الصناعة من الداخل', W - 760, 560);
  x.fillStyle = '#fff'; x.beginPath(); x.roundRect(170, 680, 640, 130, 65); x.fill(); x.fillStyle = BRAND.navy; x.font = '600 66px "Readex Pro"'; x.textAlign = 'center'; x.fillText('هاكثون 2026', 490, 770);
  return toTex(c);
}
async function partnerAd(img, line) {
  const W = 2048, H = 1024, [c, x] = canvas(W, H);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
  x.fillStyle = grad(x, 0, H - 170, W, H, [[0, BRAND.violet], [1, BRAND.navy]]); x.fillRect(0, H - 170, W, 170);
  const im = await loadImg(img), r = Math.min(1500 / im.width, 640 / im.height); x.drawImage(im, (W - im.width * r) / 2, 70 + (680 - im.height * r) / 2, im.width * r, im.height * r);
  x.fillStyle = '#fff'; x.font = '600 74px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText(line, W / 2, H - 60);
  return toTex(c);
}

function billboard(tex, w = 12, h = 6, pole = 9) {
  const g = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: '#8a9099', metalness: .8, roughness: .35 }), dark = new THREE.MeshStandardMaterial({ color: '#2b2f37', metalness: .6, roughness: .4 });
  g.add(m(new THREE.CylinderGeometry(.42, .5, pole, 24), steel)); g.children[0].position.y = pole / 2;
  const frame = m(new RoundedBoxGeometry(w + .5, h + .5, .6, 3, .12), dark); frame.position.y = pole + h / 2 - .4; g.add(frame);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: .55, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: .12 })); face.position.set(0, pole + h / 2 - .4, .31); face.receiveShadow = true; g.add(face);
  const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -.31; g.add(back);
  const walk = box(w + .4, .08, 1, dark, 0, pole - .75, .7); g.add(walk);
  for (let i = -2; i <= 2; i++) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.2, 8), dark); arm.rotation.x = Math.PI / 2.6; arm.position.set(i * w / 5, pole - .5, .9); g.add(arm); const hd = box(.5, .12, .25, dark, i * w / 5, pole - .2, 1.35); g.add(hd); }
  return g;
}

/* ---------- Riyadh skyline ---------- */
function kingdomCentre(glass) {
  const s = new THREE.Shape();
  s.moveTo(-31, 0); s.bezierCurveTo(-31, 120, -26, 230, -12, 300); s.lineTo(12, 300); s.bezierCurveTo(26, 230, 31, 120, 31, 0); s.closePath();
  const hole = new THREE.Path(); hole.moveTo(-22, 196); hole.bezierCurveTo(-20, 250, -8, 284, 0, 286); hole.bezierCurveTo(8, 284, 20, 250, 22, 196); hole.closePath(); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: 34, bevelEnabled: true, bevelThickness: 7, bevelSize: 2.5, bevelSegments: 6, curveSegments: 48 }); g.translate(0, 0, -17);
  const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 60, p.getY(i) / 300);
  const o = new THREE.Group(); o.add(m(g, glass));
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 3.5, 12), new THREE.MeshStandardMaterial({ color: '#3a4250', metalness: .7, roughness: .3 })); bridge.position.y = 292; o.add(bridge);
  return o;
}
function faisaliah(glass, gold) {
  const o = new THREE.Group();
  const body = m(new THREE.CylinderGeometry(2, 30, 245, 4, 12), glass); body.rotation.y = Math.PI / 4; body.position.y = 122; o.add(body);
  const beamM = new THREE.MeshStandardMaterial({ color: '#c9c2b4', roughness: .7 });
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3.2, 250, 8), beamM); const r = 31; b.position.set(Math.cos(a) * r / 2, 125, Math.sin(a) * r / 2); b.lookAt(0, 250, 0); b.rotateX(Math.PI / 2); o.add(b); }
  const ball = m(new THREE.SphereGeometry(11, 40, 30), gold); ball.position.y = 200; o.add(ball);
  const sp = m(new THREE.CylinderGeometry(.3, 1.2, 30, 8), beamM); sp.position.y = 260; o.add(sp);
  return o;
}

export async function buildWorld(scene) {
  const W = { };
  // ground
  const sand = pbr('aerial_sand', [260, 260]);
  const ground = m(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ ...sand, color: '#e9c99a', roughness: 1 }), false);
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // road
  const asph = pbr('clean_asphalt', [100, 4]);
  const road = m(new THREE.PlaneGeometry(800, 15.6), new THREE.MeshStandardMaterial({ ...asph, color: '#9a9a9a', roughness: .92 }), false);
  road.rotation.x = -Math.PI / 2; road.position.y = .02; scene.add(road);
  const paint = new THREE.MeshStandardMaterial({ color: '#f4f4f0', roughness: .6 }), yellow = new THREE.MeshStandardMaterial({ color: '#f0bf2a', roughness: .6 });
  const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(3, .14), paint, 400), mm = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  let k = 0; for (const z of [4.3, -4.3]) for (let x = -390; x < 390; x += 9) { mm.compose(new THREE.Vector3(x, .035, z), q, new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(k++, mm); }
  dash.count = k; dash.receiveShadow = true; scene.add(dash);
  for (const z of [7.55, -7.55]) { const l = m(new THREE.PlaneGeometry(800, .16), paint, false); l.rotation.x = -Math.PI / 2; l.position.set(0, .035, z); scene.add(l); }
  for (const z of [1.1, -1.1]) { const l = m(new THREE.PlaneGeometry(800, .14), yellow, false); l.rotation.x = -Math.PI / 2; l.position.set(0, .035, z); scene.add(l); }
  // zebra crossing towards the factory gate (world x = -22)
  for (let z = -7.2; z <= 7.2; z += 1) { if (Math.abs(z) < 1) continue; const st = m(new THREE.PlaneGeometry(4, .5), paint, false); st.rotation.x = -Math.PI / 2; st.position.set(-22, .036, z); scene.add(st); }
  // median with painted curbs and palms
  const curbT = curbTex(); curbT.repeat.set(200, 1);
  const curbM = new THREE.MeshStandardMaterial({ map: curbT, roughness: .7 });
  for (const z of [.8, -.8]) { const c = m(new THREE.BoxGeometry(800, .25, .2), curbM); c.position.set(0, .125, z); scene.add(c); }
  const gravel = pbr('sand_01', [200, 1]);
  const med = m(new THREE.BoxGeometry(800, .22, 1.4), new THREE.MeshStandardMaterial({ ...gravel, color: '#c9a77a' })); med.position.y = .11; scene.add(med);
  // sidewalks
  const pav = pbr('concrete_pavers', [1, 1]);
  const pavM = new THREE.MeshStandardMaterial({ ...pav, color: '#e2ddd3' });
  for (const [z0, z1] of [[7.8, 13], [-13, -7.8]]) {
    scene.add(tbox(800, .2, z1 - z0, pavM, 0, .1, (z0 + z1) / 2, 2.2));
    const c = m(new THREE.BoxGeometry(800, .22, .22), curbM); c.position.set(0, .11, z0 > 0 ? z0 : z1); scene.add(c);
  }
  // palms on the median and a row along the far sidewalk
  let seed = 1;
  for (let x = -120; x <= 160; x += 13) { const p = makePalm(7.5 + ((x * 7) % 5) * .4, seed++); p.position.set(x, .22, 0); scene.add(p); }
  for (let x = -110; x <= 170; x += 15) { const p = makePalm(6.5 + ((x * 3) % 4) * .4, seed++); p.position.set(x + 4, .2, -11.5); scene.add(p); }
  // street lamps + props on the near sidewalk
  // modern double-arm LED street lights on the median
  const poleM = new THREE.MeshStandardMaterial({ color: '#9aa1ab', metalness: .7, roughness: .35 }), ledM = new THREE.MeshStandardMaterial({ color: '#f7f9ff', emissive: '#eaf2ff', emissiveIntensity: .6 });
  for (let x = -114; x <= 160; x += 26) {
    const g = new THREE.Group(); g.position.set(x, .22, 0);
    const pole = m(new THREE.CylinderGeometry(.09, .17, 11, 16), poleM); pole.position.y = 5.5; g.add(pole);
    for (const s of [-1, 1]) {
      const arm = m(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 10.4, 0), new THREE.Vector3(0, 11.2, s * 1.4), new THREE.Vector3(0, 11.1, s * 2.8)), 16, .055, 8), poleM); g.add(arm);
      const head = m(new RoundedBoxGeometry(.38, .12, .9, 2, .04), poleM); head.position.set(0, 11.08, s * 3.1); g.add(head);
      const led = new THREE.Mesh(new THREE.PlaneGeometry(.3, .8), ledM); led.rotation.x = Math.PI / 2; led.position.set(0, 11.015, s * 3.1); g.add(led);
    }
    scene.add(g);
  }
  const bin = await model('metal_trash_can'); bin.children.slice(1).forEach(c => c.visible = false); bin.position.set(17.5, .2, 12.1); scene.add(bin);
  const ub = await model('utility_box_01'); ub.position.set(-14, .2, 12.4); scene.add(ub);
  for (const x of [-22, 26]) { const s = await model('shrub_02'); s.scale.setScalar(.9); s.position.set(x, .2, 11.8); scene.add(s); }

  // ---------- bus stop ----------
  const stop = new THREE.Group(); stop.position.set(4, .2, 10.6);
  const steel = new THREE.MeshStandardMaterial({ color: '#d7dbe2', metalness: .85, roughness: .25 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#dfe9f2', metalness: 0, roughness: .05, transmission: 0, transparent: true, opacity: .28, side: THREE.DoubleSide, envMapIntensity: 1.5 });
  const roofS = m(new RoundedBoxGeometry(7.2, .22, 2.6, 4, .1), new THREE.MeshPhysicalMaterial({ color: BRAND.navy, roughness: .35, clearcoat: .6 })); roofS.position.set(0, 2.9, 0); stop.add(roofS);
  for (const x of [-3.3, 3.3]) for (const z of [1, -1]) { const p = m(new THREE.CylinderGeometry(.06, .06, 2.8, 12), steel); p.position.set(x, 1.4, z); stop.add(p); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(6.6, 2.3), glassM); back.position.set(0, 1.4, -1.05); stop.add(back);
  const bench = m(new RoundedBoxGeometry(3.6, .1, .55, 2, .04), new THREE.MeshStandardMaterial({ color: '#b07a4a', roughness: .6 })); bench.position.set(-.6, .5, -.6); stop.add(bench);
  const adT = await fiAd();
  const lb = m(new RoundedBoxGeometry(1.4, 2.4, .2, 3, .06), steel); lb.position.set(3.05, 1.4, 0); lb.rotation.y = Math.PI / 2; stop.add(lb);
  const adFace = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.1), new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: .35, map: await posterTex() })); adFace.rotation.y = -Math.PI / 2; adFace.position.set(2.94, 1.4, 0); stop.add(adFace);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .4), new THREE.MeshStandardMaterial({ map: stopTag(), roughness: .4 })); tag.position.set(-1.8, 2.9, 1.312); stop.add(tag);
  scene.add(stop);

  // ---------- billboards ----------
  const b1 = billboard(adT); b1.position.set(-34, 0, 17); b1.rotation.y = .35; scene.add(b1);
  const b2 = billboard(await partnerAd('assets/img/r-cocacola.webp', 'شريك النجاح · الرياض'), 11, 5.5, 8.5); b2.position.set(52, 0, -18); b2.rotation.y = -.25; scene.add(b2);

  // ---------- factory (YORK) across the road ----------
  const fac = new THREE.Group(); fac.position.set(4, 0, -40);
  const clad = pbr('box_profile_metal_sheet', [1, 1]);
  const cladM = new THREE.MeshStandardMaterial({ normalMap: clad.normalMap, roughnessMap: clad.roughnessMap, normalScale: new THREE.Vector2(1.4, 1.4), color: '#e9edf2', metalness: .45, roughness: .45 });
  const hall = tbox(64, 13, 30, cladM, 0, 6.5, 0, 2.5); fac.add(hall);
  const band = box(64.2, 1.6, 30.2, new THREE.MeshStandardMaterial({ color: '#0b7a35', metalness: .3, roughness: .35 }), 0, 12.2, 0); fac.add(band);
  const plinth = box(64.3, 1.2, 30.3, new THREE.MeshStandardMaterial({ color: '#8d939c', roughness: .8 }), 0, .6, 0); fac.add(plinth);
  // glazed office block
  const offT = facadeGlass(10, 6, 3); offT.wrapS = offT.wrapT = THREE.RepeatWrapping; offT.repeat.set(1.5, 1);
  const offGlass = new THREE.MeshPhysicalMaterial({ map: offT, metalness: .55, roughness: .08, clearcoat: 1, envMapIntensity: 1.3 });
  const off = box(20, 15, 12, offGlass, -26, 7.5, 18); fac.add(off);
  const offRoof = box(20.6, .7, 12.6, new THREE.MeshStandardMaterial({ color: '#e9ecf0', roughness: .5 }), -26, 15.2, 18); fac.add(offRoof);
  const canopy = box(9, .35, 4, new THREE.MeshStandardMaterial({ color: '#f4f5f8', metalness: .3, roughness: .3 }), -26, 4.2, 25.5); fac.add(canopy);
  // logo sign on the hall
  const yorkT = await sign('assets/img/r-alrabie.webp', 16, 7.5, { pad: .1 });
  const ys = new THREE.Mesh(new THREE.PlaneGeometry(16, 7.5), new THREE.MeshStandardMaterial({ map: yorkT, roughness: .35, emissive: '#ffffff', emissiveMap: yorkT, emissiveIntensity: .1 })); ys.position.set(12, 7.4, 15.22); fac.add(ys);
  const ysFrame = box(16.6, 8.1, .25, new THREE.MeshStandardMaterial({ color: '#d6dbe3', metalness: .7, roughness: .3 }), 12, 7.4, 15.08); fac.add(ysFrame);
  // loading docks
  for (let i = 0; i < 3; i++) { const d = box(4.2, 4.6, .3, new THREE.MeshStandardMaterial({ color: '#7b8592', metalness: .5, roughness: .45 }), -6 + i * 6, 2.3, 15.05); fac.add(d); }
  // silos, stacks, roof units
  const stainless = new THREE.MeshStandardMaterial({ color: '#d5d9df', metalness: .92, roughness: .28 });
  for (let i = 0; i < 3; i++) { const s = m(new THREE.CylinderGeometry(3.2, 3.2, 20, 40), stainless); s.position.set(38 + i * 7.2, 10, -4); fac.add(s); const cap = m(new THREE.ConeGeometry(3.3, 2, 40), stainless); cap.position.set(38 + i * 7.2, 21, -4); fac.add(cap); for (const y of [4, 10, 16]) { const r = m(new THREE.TorusGeometry(3.22, .1, 8, 48), new THREE.MeshStandardMaterial({ color: '#0b7a35' }), false); r.rotation.x = Math.PI / 2; r.position.set(38 + i * 7.2, y, -4); fac.add(r); } }
  for (const x of [20, 25]) { const st = m(new THREE.CylinderGeometry(.8, 1, 22, 24), new THREE.MeshStandardMaterial({ color: '#f1f2f4', roughness: .4, metalness: .4 })); st.position.set(x, 11, -8); fac.add(st); const bd = m(new THREE.CylinderGeometry(.82, .82, 1.6, 24), new THREE.MeshStandardMaterial({ color: '#0b7a35' })); bd.position.set(x, 20, -8); fac.add(bd); }
  for (let i = 0; i < 6; i++) { const ac = await model('exterior_aircon_unit'); ac.scale.setScalar(3.2); ac.position.set(-20 + i * 7, 13.9, -2 + (i % 2) * 6); fac.add(ac); }
  // perimeter wall + gate sign
  const wallM = new THREE.MeshStandardMaterial({ ...pbr('white_sandstone_bricks', [1, 1]), color: '#efe2cc' });
  // wall in two runs with an 8 m gate opening at local x = -26
  fac.add(tbox(17, 2.2, .4, wallM, -38.5, 1.1, 26, 1.6));
  fac.add(tbox(85, 2.2, .4, wallM, 20.5, 1.1, 26, 1.6));
  const pillarM = new THREE.MeshStandardMaterial({ color: '#2b3038', metalness: .5, roughness: .4 });
  for (const x of [-30.2, -21.8]) fac.add(box(.6, 4.6, .6, pillarM, x, 2.3, 26));
  fac.add(box(9, .5, .6, pillarM, -26, 4.75, 26));
  const gateT = await gateSign();
  const gs = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.6), new THREE.MeshStandardMaterial({ map: gateT, roughness: .4 })); gs.position.set(-26, 5.85, 26.05); fac.add(gs);
  fac.add(box(7.4, 1.9, .3, pillarM, -26, 5.85, 25.85));
  const arm = box(7.2, .12, .12, new THREE.MeshStandardMaterial({ color: '#d93030', roughness: .5 }), -26.3, 1.05, 26.6); arm.rotation.z = .9; arm.position.x = -28.6; arm.position.y = 2.6; fac.add(arm);
  for (let i = 0; i < 3; i++) { const b = await model('concrete_road_barrier'); b.scale.setScalar(1.4); b.position.set(-42 + i * 2.4, 0, 28.6); fac.add(b); }
  // a walkway from the gate to the office entrance
  const walkM = new THREE.MeshStandardMaterial({ ...pbr('concrete_pavers', [1, 1]), color: '#d9d4ca' });
  fac.add(tbox(5, .06, 8, walkM, -26, .03, 22, 2.2));
  scene.add(fac);

  // ---------- the rest of the industrial city: warehouses between the factory and the skyline ----------
  const shedM = [new THREE.MeshStandardMaterial({ normalMap: clad.normalMap, color: '#e4e7ec', metalness: .4, roughness: .5 }), new THREE.MeshStandardMaterial({ normalMap: clad.normalMap, color: '#d9d2c4', metalness: .3, roughness: .6 })];
  const roofM = [new THREE.MeshStandardMaterial({ color: '#2f63a8', metalness: .4, roughness: .45 }), new THREE.MeshStandardMaterial({ color: '#9aa3ad', metalness: .5, roughness: .4 }), new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: .5, roughness: .4 })];
  let rs = 11; const rr = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 46; i++) {
    const x = -260 + (i % 12) * 48 + rr() * 10, z = -95 - Math.floor(i / 12) * 42 - rr() * 8, w = 30 + rr() * 14, d = 22 + rr() * 10, h = 8 + rr() * 6;
    if (Math.abs(x - 4) < 50 && z > -100) continue;
    const g = new THREE.BoxGeometry(w, h, d); g.translate(x, h / 2, z); worldUV(g, 2.5); scene.add(m(g, shedM[i % 2]));
    const r = new THREE.Mesh(new THREE.BoxGeometry(w + .4, .5, d + .4), roofM[i % 3]); r.position.set(x, h + .25, z); r.receiveShadow = true; scene.add(r);
  }
  const urban = m(new THREE.PlaneGeometry(1600, 700), new THREE.MeshStandardMaterial({ color: '#cbbfa9', roughness: 1 }), false); urban.rotation.x = -Math.PI / 2; urban.position.set(0, .01, -560); scene.add(urban);

  // ---------- Riyadh skyline ----------
  const skyGlass = new THREE.MeshPhysicalMaterial({ map: facadeGlass(14, 60, 7, [120, 150, 185]), metalness: .7, roughness: .12, clearcoat: 1, envMapIntensity: 1.2 });
  const kc = kingdomCentre(skyGlass); kc.position.set(160, 0, -520); kc.rotation.y = -.25; scene.add(kc);
  const gold = new THREE.MeshStandardMaterial({ color: '#d8b46a', metalness: 1, roughness: .2 });
  const fz = faisaliah(new THREE.MeshPhysicalMaterial({ map: facadeGlass(10, 40, 9, [110, 140, 160]), metalness: .7, roughness: .12 }), gold); fz.position.set(-120, 0, -640); scene.add(fz);
  let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const stoneMats = [1, 2, 3].map(i => new THREE.MeshStandardMaterial({ map: facadeStone(6, 8, i), roughness: .85 }));
  const glassMats = [3, 4, 5].map(i => new THREE.MeshPhysicalMaterial({ map: facadeGlass(8, 30, i + 10, i % 2 ? [125, 160, 190] : [150, 160, 170]), metalness: .6, roughness: .12 }));
  for (let i = 0; i < 150; i++) {
    const x = -520 + rnd() * 1100, z = -260 - rnd() * 520, tall = rnd() < .2, h = tall ? 60 + rnd() * 110 : 12 + rnd() * 30, w = tall ? 20 + rnd() * 18 : 26 + rnd() * 30, d = 20 + rnd() * 20;
    if (Math.abs(x - 160) < 50 && z < -470) continue;
    const mat = tall ? glassMats[i % 3] : stoneMats[i % 3];
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * w / 30, uv.getY(j) * h / (tall ? 60 : 24));
    mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
    const b = m(g, mat, false); b.position.set(x, h / 2, z); scene.add(b);
  }
  W.gate = new THREE.Vector3(-22, 0, -13.4); W.busStop = new THREE.Vector3(4, 0, 10.6);
  return W;
}

async function posterTex() {
  const W = 512, H = 896, [c, x] = canvas(W, H);
  x.fillStyle = grad(x, 0, 0, 0, H, [[0, BRAND.violet], [1, BRAND.navy]]); x.fillRect(0, 0, W, H);
  network(x, W, H, { n: 30, link: 160, color: 'rgba(255,255,255,.18)', dot: 'rgba(255,255,255,.5)', lw: 1.6, seed: 4 });
  const logo = await loadImg('assets/img/logo.webp'); x.fillStyle = '#fff'; x.beginPath(); x.arc(W / 2, 290, 170, 0, 7); x.fill();
  const r = 250 / Math.max(logo.width, logo.height); x.drawImage(logo, W / 2 - logo.width * r / 2, 290 - logo.height * r / 2, logo.width * r, logo.height * r);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 64px "Readex Pro"'; x.fillText('شارك في', W / 2, 580); x.fillText('الهاكثون', W / 2, 660);
  x.font = '400 34px "Readex Pro"'; x.fillText('200,000 ريال جوائز', W / 2, 740);
  return toTex(c);
}
function stopTag() {
  const [c, x] = canvas(512, 128); x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 128);
  x.fillStyle = BRAND.navy; x.font = '600 50px "Readex Pro"'; x.textAlign = 'center'; x.direction = 'rtl'; x.fillText('محطة المدينة الصناعية', 256, 82);
  return toTex(c);
}
async function gateSign() {
  const W = 1400, H = 320, [c, x] = canvas(W, H); x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#0b7a35'; x.fillRect(0, H - 30, W, 30);
  x.fillStyle = '#1b2263'; x.font = '700 92px "Readex Pro"'; x.textAlign = 'right'; x.direction = 'rtl'; x.fillText('مصنع الربيع للأغذية', W - 50, 150);
  x.fillStyle = '#5a6380'; x.font = '400 54px "Readex Pro"'; x.fillText('المدينة الصناعية · الرياض', W - 50, 245);
  const im = await loadImg('assets/img/r-alrabie.webp'); const r = 240 / im.height; x.drawImage(im, 40, 30, im.width * r, im.height * r);
  return toTex(c);
}

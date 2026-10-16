import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, BRAND } from './tex.js';
import { TRACKS } from './regions.js';
import { TOUR } from './content.js';

/* The walk-through inside a factory hall. The student comes in at the front-left door into a small
   gear room (lockers), steps through the safety gate onto the production floor, reads three
   information kiosks along the green walkway, starts the factory's mission at the terminal, and
   finishes at the supervisor's booth. A golden gear is tucked away somewhere on the floor. */
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: .2, ...o });
function mk(geo, mat, x, y, z, cast = true) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; return o; }
const box = (w, h, d, mat, x, y, z) => mk(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
function screenTex(title, sub, n, color) {
  const [c, x] = canvas(512, 352); x.fillStyle = '#0d1b3a'; x.fillRect(0, 0, 512, 352);
  const g = x.createLinearGradient(0, 0, 512, 0); g.addColorStop(0, color); g.addColorStop(1, '#847bb8'); x.fillStyle = g; x.fillRect(0, 0, 512, 10);
  x.fillStyle = color; x.beginPath(); x.arc(256, 112, 62, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = '700 72px "Readex Pro"'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, 256, 116);
  x.direction = 'rtl'; x.font = '700 44px "Readex Pro"'; x.fillText(title, 256, 226); x.font = '500 28px "Readex Pro"'; x.fillStyle = '#9fb3e8'; x.fillText(sub, 256, 290);
  return toTex(c);
}
function signTex(lines, bg = '#f2c230', fg = '#1b2263') {
  const [c, x] = canvas(1024, 192); x.fillStyle = bg; x.fillRect(0, 0, 1024, 192);
  for (let i = -2; i < 22; i++) { x.fillStyle = i % 2 ? '#1b2263' : bg; x.beginPath(); x.moveTo(i * 52, 192); x.lineTo(i * 52 + 26, 172); x.lineTo(i * 52 + 52, 172); x.lineTo(i * 52 + 26, 192); x.fill(); }
  x.fillStyle = fg; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 64px "Readex Pro"'; x.fillText(lines[0], 512, 84); if (lines[1]) { x.font = '500 38px "Readex Pro"'; x.fillText(lines[1], 512, 142); }
  return toTex(c);
}
function iconTex(glyph, color) {
  const [c, x] = canvas(128, 128); x.fillStyle = color; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
  x.fillStyle = '#fff'; x.font = '700 60px "Readex Pro", "Segoe UI Emoji", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(glyph, 64, 68);
  return toTex(c);
}
function gearGeo() {
  const s = new THREE.Shape(), N = 10, R1 = .32, R2 = .42;
  for (let i = 0; i < N * 2; i++) { const a0 = i / (N * 2) * Math.PI * 2, a1 = (i + 1) / (N * 2) * Math.PI * 2, r = i % 2 ? R1 : R2; const p0 = [Math.cos(a0 + .05) * r, Math.sin(a0 + .05) * r], p1 = [Math.cos(a1 - .05) * r, Math.sin(a1 - .05) * r]; if (i === 0) s.moveTo(...p0); else s.lineTo(...p0); s.lineTo(...p1); }
  const h = new THREE.Path(); h.absarc(0, 0, .13, 0, Math.PI * 2, true); s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth: .1, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 }); g.center(); return g;
}
export const GEAR_GEO = gearGeo();
export const GEAR_MAT = new THREE.MeshStandardMaterial({ color: '#f2c230', metalness: .9, roughness: .22, emissive: '#7a5200', emissiveIntensity: .35 });

export function addTour(IN, F) {
  const scene = IN.scene, T = TRACKS[F.track], C = TOUR[F.id], anim = [];
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#dfeefa', roughness: .05, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false });
  const frameM = std('#2b3038', { metalness: .6, roughness: .35 }), brand = std(F.color), white = std('#f2f4f7');
  // the door the student comes in by, on the front wall
  scene.add(box(2.6, 3, .2, frameM, -16, 1.5, 12.88)); scene.add(box(2.2, 2.7, .1, new THREE.MeshStandardMaterial({ color: '#9fc3e0', metalness: .3, roughness: .1 }), -16, 1.35, 12.8));
  { const ex = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .45), new THREE.MeshStandardMaterial({ map: signTex(['مدخل الزوار', 'VISITORS'], '#0f9d58', '#fff'), emissive: '#fff', emissiveIntensity: .2 })); ex.position.set(-16, 3.4, 12.7); ex.rotation.y = Math.PI; scene.add(ex); }
  // the gear room: glass partition with a safety gate onto the floor
  const part = [[-15.95, 8.5, 7.9, .1], [-12, 9, .1, 1], [-12, 12.15, .1, 1.5]];
  for (const [x, z, w, d] of part) { scene.add(mk(new THREE.BoxGeometry(w, 2.4, d), glassM, x, 1.2, z, false)); scene.add(box(w + .06, .08, d + .06, frameM, x, 2.42, z)); }
  IN.boxes.push([-19.9, 8.4, -12, 8.6], [-12.1, 8.5, -11.9, 9.5], [-12.1, 11.4, -11.9, 12.9]);
  const gate = [new THREE.Group(), new THREE.Group()], stripeT = (() => { const [c, x] = canvas(64, 256); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#1b2263' : '#f2c230'; x.fillRect(0, i * 32, 64, 32); } return toTex(c); })();
  gate.forEach((g, i) => { g.position.set(-12, 0, i ? 11.4 : 9.4); scene.add(g); const leaf = mk(new THREE.BoxGeometry(.08, 1.1, 1), new THREE.MeshStandardMaterial({ map: stripeT, roughness: .5 }), 0, .7, i ? -.5 : .5); g.add(leaf); });
  const gateBox = [-12.15, 9.4, -11.85, 11.4]; IN.boxes.push(gateBox);
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(4, .75), new THREE.MeshStandardMaterial({ map: signTex(['منطقة الإنتاج', 'الدخول بمعدات الوقاية فقط']), roughness: .5 })); banner.position.set(-11.9, 3.35, 10.4); banner.rotation.y = Math.PI / 2; scene.add(banner);
  const lockerM = std(F.color, { metalness: .5, roughness: .35 }), ventM = std('#1e2430');
  for (let i = 0; i < 6; i++) { const x = -18.6 + i * .95; scene.add(box(.9, 2.1, .55, lockerM, x, 1.05, 12.45)); for (let k = 0; k < 3; k++) scene.add(box(.5, .03, .02, ventM, x, 1.75 - k * .07, 12.16)); scene.add(box(.04, .22, .04, white, x + .3, 1.1, 12.16)); }
  IN.boxes.push([-19.9, 12.1, -13.6, 12.9]);
  scene.add(box(3.4, .1, .5, std('#b07a4a', { roughness: .6 }), -16.2, .48, 10.9)); IN.boxes.push([-17.9, 10.6, -14.5, 11.2]);
  // information kiosks along the green walkway
  const kiosks = C.facts.map((f, i) => {
    const x = -8 + i * 10, z = 6.95, g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
    g.add(mk(new THREE.CylinderGeometry(.05, .07, 1.25, 12), frameM, 0, .62, 0)); g.add(mk(new THREE.CylinderGeometry(.35, .4, .06, 24), frameM, 0, .03, 0));
    const t = screenTex(f.t.ar, "اقرأ المعلومة", String(i + 1), T.color), scr = new THREE.Group(); scr.position.set(0, 1.4, 0); scr.rotation.x = .45; g.add(scr);
    scr.add(mk(new RoundedBoxGeometry(.98, .7, .07, 3, .02), frameM, 0, 0, 0)); const face = new THREE.Mesh(new THREE.PlaneGeometry(.9, .62), new THREE.MeshStandardMaterial({ map: t, emissive: '#fff', emissiveMap: t, emissiveIntensity: .75 })); face.position.z = -.04; face.rotation.y = Math.PI; scr.add(face);
    g.rotation.y = 0; IN.circles.push([x, z, .45]);
    return { x, z: z - 1.2, i };
  });
  // the mission terminal at the far end of the walkway
  const term = new THREE.Group(); term.position.set(16.2, 0, 4.7); term.rotation.y = -Math.PI / 2; scene.add(term);
  term.add(mk(new RoundedBoxGeometry(1.5, 1.05, .8, 3, .08), white, 0, .53, 0)); term.add(box(1.6, .08, .9, brand, 0, 1.08, 0));
  const tt = screenTex(F.title, 'ابدأ المهمة', '★', T.color), tscr = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .95), new THREE.MeshStandardMaterial({ map: tt, emissive: '#fff', emissiveMap: tt, emissiveIntensity: .8 }));
  tscr.position.set(0, 1.75, -.15); tscr.rotation.x = -.15; term.add(tscr); term.add(box(1.5, 1.05, .06, frameM, 0, 1.75, -.2));
  IN.boxes.push([15.7, 3.9, 16.7, 5.5]);
  // the supervisor's booth at the back right
  const booth = new THREE.Group(); scene.add(booth);
  booth.add(mk(new THREE.BoxGeometry(5.8, 2.6, .1), glassM, 17, 1.3, -8.6, false)); booth.add(mk(new THREE.BoxGeometry(.1, 2.6, 3.4), glassM, 14.1, 1.3, -11.2, false));
  booth.add(box(5.9, .12, 4.4, frameM, 17, 2.66, -10.75)); booth.add(box(1.6, .9, .7, std('#b07a4a'), 15, .45, -10)); booth.add(box(.6, .5, .05, frameM, 15, 1.2, -10.2));
  const bs = new THREE.Mesh(new THREE.PlaneGeometry(3, .55), new THREE.MeshStandardMaterial({ map: signTex(['مكتب المشرف', 'SUPERVISOR'], '#ffffff', '#1b2263'), roughness: .5 })); bs.position.set(17, 3.05, -8.54); scene.add(bs);
  IN.boxes.push([14, -12.9, 19.9, -8.5]);
  // the golden gear on a crate: one jump up
  const crateM = std('#c69c64', { roughness: .8 }); scene.add(box(1.3, .72, 1.3, crateM, -18, .36, -7.4)); scene.add(box(1, .5, 1, crateM, -16.6, .25, -7.5));
  const platforms = [[-18.65, -8.05, -17.35, -6.75, .72], [-17.1, -8, -16.1, -7, .5]];
  const gear = new THREE.Mesh(GEAR_GEO, GEAR_MAT); gear.position.set(-18, 1.25, -7.4); gear.castShadow = true; scene.add(gear);
  const gl = new THREE.PointLight('#ffd36a', 3, 4); gl.position.set(-18, 1.6, -7.4); scene.add(gl);
  anim.push(t => { gear.rotation.y = t * 1.6; gear.position.y = 1.25 + Math.sin(t * 2.3) * .06; });
  // floating markers over the next station
  const mkIcon = (glyph, color) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(glyph, color), depthTest: false, transparent: true })); s.scale.setScalar(.7); s.renderOrder = 9; s.visible = false; scene.add(s); return s; };
  const icons = { ppe: mkIcon('⛑', '#e0a21c'), k0: mkIcon('1', T.color), k1: mkIcon('2', T.color), k2: mkIcon('3', T.color), mission: mkIcon('★', '#847bb8'), quiz: mkIcon('✓', '#2fb36d') };
  icons.ppe.position.set(-16, 2.7, 12); kiosks.forEach((k, i) => icons['k' + i].position.set(k.x, 2.6, 6.95)); icons.mission.position.set(16.2, 3.2, 4.7); icons.quiz.position.set(15, 2.3, -10);
  let gt = 0, gateOpen = 0, gateWant = 0;
  return {
    kiosks, gear, platforms, icons,
    spawn: new THREE.Vector3(-16, 0, 10.1),
    points: { ppe: new THREE.Vector3(-16, 0, 11.2), mission: new THREE.Vector3(15.1, 0, 4.7), quiz: new THREE.Vector3(13.4, 0, -10.1), exit: new THREE.Vector3(-16, 0, 12.2) },
    openGate() { gateWant = 1; const i = IN.boxes.indexOf(gateBox); if (i >= 0) IN.boxes.splice(i, 1); },
    update(dt) {
      gt += dt; for (const f of anim) f(gt);
      gateOpen += (gateWant - gateOpen) * Math.min(1, dt * 3); gate[0].rotation.y = gateOpen * 1.5; gate[1].rotation.y = -gateOpen * 1.5;
      for (const k in icons) icons[k].position.y += Math.sin(gt * 2.4 + k.length) * .002;
    }
  };
}

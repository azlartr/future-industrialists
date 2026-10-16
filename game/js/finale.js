import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, loadImg, BRAND, network, grad } from './tex.js';

/* The graduation night: a round stage under sweeping spotlights, the initiative's logo on a giant
   screen, the four track badges flying in to circle the student, fireworks and confetti, and مِرشد
   cheering alongside. The camera circles the stage while the Future Industrialists song plays. */
export async function buildFinale(renderer, { badges }) {
  const scene = new THREE.Scene(), anim = [];
  scene.background = new THREE.Color('#070b26'); scene.fog = new THREE.Fog('#070b26', 40, 120);
  scene.add(new THREE.HemisphereLight('#8ea2ff', '#120a2a', .55));
  const key = new THREE.DirectionalLight('#fff4e0', 1.4); key.position.set(6, 14, 10); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10 }); scene.add(key);
  // the stage: stepped discs with a glowing rim
  const stageM = new THREE.MeshStandardMaterial({ color: '#1b2263', metalness: .5, roughness: .35 }), topM = new THREE.MeshStandardMaterial({ color: '#2a3590', metalness: .4, roughness: .3 });
  const disc = (r, h, y, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + .1, h, 72), mat); m.position.y = y; m.receiveShadow = true; m.castShadow = true; scene.add(m); return m; };
  disc(7, .5, .25, stageM); disc(5.6, .5, .75, topM); disc(2.2, .5, 1.25, new THREE.MeshStandardMaterial({ color: '#f2f3fb', metalness: .2, roughness: .25 }));
  const rimM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#847bb8', emissiveIntensity: 2.4 });
  for (const [r, y] of [[7.02, .5], [5.62, 1], [2.22, 1.5]]) { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .05, 8, 120), rimM); t.rotation.x = Math.PI / 2; t.position.y = y; scene.add(t); }
  anim.push(t => { rimM.emissive.setHSL(.7 + Math.sin(t * .6) * .06, .6, .55); });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ color: '#0d1238', metalness: .6, roughness: .25 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  // the giant screen with the logo and the network pattern
  const [sc, sx] = canvas(2048, 1024); sx.fillStyle = grad(sx, 0, 0, 2048, 1024, [[0, BRAND.navy], [.55, BRAND.blue], [1, BRAND.violet]]); sx.fillRect(0, 0, 2048, 1024);
  network(sx, 2048, 1024, { n: 70, link: 260, color: 'rgba(255,255,255,.16)', dot: 'rgba(255,255,255,.6)', lw: 2.4, seed: 21 });
  try { const lg = await loadImg('assets/img/logo_white.webp'), r = 640 / lg.height; sx.drawImage(lg, 1024 - lg.width * r / 2, 90, lg.width * r, 640); } catch {}
  sx.fillStyle = '#fff'; sx.textAlign = 'center'; sx.direction = 'rtl'; sx.font = '700 120px "Readex Pro"'; sx.fillText('حفل صناعيو المستقبل', 1024, 900);
  const st = toTex(sc), screen = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshStandardMaterial({ map: st, emissive: '#fff', emissiveMap: st, emissiveIntensity: .85 })); screen.position.set(0, 8.5, -12); scene.add(screen);
  const frame = new THREE.Mesh(new RoundedBoxGeometry(23, 12, .5, 4, .2), new THREE.MeshStandardMaterial({ color: '#111633', metalness: .6, roughness: .3 })); frame.position.set(0, 8.5, -12.3); scene.add(frame);
  // sweeping spotlights with visible beams
  const beamM = new THREE.MeshBasicMaterial({ color: '#c9c3ff', transparent: true, opacity: .09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const spots = [];
  for (const sxp of [-11, 11, -6, 6]) {
    const sp = new THREE.SpotLight(sxp < 0 ? '#9d8cff' : '#ffd9a0', 120, 40, .32, .5, 1.6); sp.position.set(sxp, 16, 6); sp.target.position.set(0, 1, 0); scene.add(sp, sp.target);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(3.2, 18, 32, 1, true), beamM); beam.geometry.translate(0, -9, 0); beam.position.copy(sp.position); scene.add(beam);
    spots.push({ sp, beam, ph: sxp });
  }
  anim.push(t => spots.forEach(({ sp, beam, ph }) => { const a = t * .7 + ph; sp.target.position.set(Math.sin(a) * 4, 1, Math.cos(a * 1.3) * 3); beam.lookAt(sp.target.position); beam.rotateX(-Math.PI / 2); }));
  // the four badges: they fly in from far away and circle above the student
  const badgeG = new THREE.Group(); badgeG.position.y = 4.4; scene.add(badgeG);
  const bm = [];
  for (let i = 0; i < badges.length; i++) {
    const tex = await new THREE.TextureLoader().loadAsync(badges[i].src).catch(() => null); if (tex) tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.CircleGeometry(.9, 48), new THREE.MeshStandardMaterial({ map: tex, transparent: true, emissive: '#fff', emissiveMap: tex, emissiveIntensity: badges[i].on ? .55 : .05, side: THREE.DoubleSide, color: badges[i].on ? '#fff' : '#555' }));
    badgeG.add(m); bm.push({ m, a0: i / badges.length * Math.PI * 2 });
  }
  let bt = 0; anim.push((t, dt) => { bt += dt; bm.forEach(({ m, a0 }, i) => { const k = THREE.MathUtils.clamp((bt - .8 - i * .5) / 1.6, 0, 1), e = 1 - Math.pow(1 - k, 3), a = a0 + t * .5, r = 3.4 + (1 - e) * 30; m.position.set(Math.cos(a) * r, Math.sin(t * 1.4 + i) * .25 + (1 - e) * 12, Math.sin(a) * r); m.lookAt(0, m.position.y, 0); m.rotateY(Math.PI); m.scale.setScalar(.4 + e * .6); }); });
  // fireworks: bursts of additive points
  const fw = [], fwG = new THREE.BufferGeometry(), N = 2400, pos = new Float32Array(N * 3), colA = new Float32Array(N * 3);
  fwG.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fwG.setAttribute('color', new THREE.BufferAttribute(colA, 3));
  const fwM = new THREE.PointsMaterial({ size: .32, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(fwG, fwM); pts.frustumCulled = false; scene.add(pts);
  const parts = Array.from({ length: N }, () => ({ life: 0, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, c: new THREE.Color() })); let pi = 0, fwT = .3;
  const pal = ['#847bb8', '#f2c230', '#6ff3ff', '#ffffff', '#e45b8f', '#2fb36d'];
  anim.push((t, dt) => {
    fwT -= dt; if (fwT <= 0) { fwT = .45 + Math.random() * .6; const cx = (Math.random() - .5) * 40, cy = 14 + Math.random() * 10, cz = -18 - Math.random() * 14, col = new THREE.Color(pal[Math.random() * pal.length | 0]);
      for (let k = 0; k < 160; k++) { const p = parts[pi = (pi + 1) % N], u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = 7 + Math.random() * 3; p.x = cx; p.y = cy; p.z = cz; p.vx = Math.sqrt(1 - u * u) * Math.cos(th) * s; p.vy = u * s; p.vz = Math.sqrt(1 - u * u) * Math.sin(th) * s; p.life = 1.6 + Math.random() * .6; p.c.copy(col); } }
    for (let k = 0; k < N; k++) { const p = parts[k]; if (p.life <= 0) { pos[k * 3 + 1] = -99; continue; } p.life -= dt; p.vy -= 6 * dt; p.vx *= .985; p.vz *= .985; p.vy *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; const f = Math.min(1, p.life); colA[k * 3] = p.c.r * f; colA[k * 3 + 1] = p.c.g * f; colA[k * 3 + 2] = p.c.b * f; }
    fwG.attributes.position.needsUpdate = true; fwG.attributes.color.needsUpdate = true;
  });
  // confetti over the stage
  const CN = 420, conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(.12, .22), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .5 }), CN), cd = [], mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < CN; i++) { cd.push({ x: (Math.random() - .5) * 18, y: 6 + Math.random() * 14, z: (Math.random() - .5) * 14, r: Math.random() * 6, v: 1 + Math.random() * 1.5, s: Math.random() * 3 }); conf.setColorAt(i, new THREE.Color(pal[i % pal.length])); }
  scene.add(conf);
  anim.push((t, dt) => { for (let i = 0; i < CN; i++) { const c = cd[i]; c.y -= c.v * dt; c.r += dt * 3; if (c.y < 0) c.y = 16; e.set(c.r, c.r * .7, c.s); q.setFromEuler(e); mm.compose(new THREE.Vector3(c.x + Math.sin(t + c.s) * .6, c.y, c.z), q, one); conf.setMatrixAt(i, mm); } conf.instanceMatrix.needsUpdate = true; });
  let t = 0;
  return {
    scene, podium: new THREE.Vector3(0, 1.5, 0),
    update(dt) { t += dt; for (const f of anim) f(t, dt); },
    dispose() { scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(mt => { for (const k in mt) if (mt[k]?.isTexture) mt[k].dispose(); mt.dispose(); }); }); }
  };
}

/* the certificate: a landscape page with the student's name, the visit in numbers and the badges */
export async function certificate({ name, char, factories, regions, points, gears, badges, date }) {
  const W = 1600, H = 1130, [c, x] = canvas(W, H);
  x.fillStyle = '#fbfaff'; x.fillRect(0, 0, W, H);
  x.fillStyle = grad(x, 0, 0, W, H, [[0, BRAND.navy], [.55, BRAND.blue], [1, BRAND.violet]]); x.fillRect(0, 0, W, 26); x.fillRect(0, H - 26, W, 26); x.fillRect(0, 0, 26, H); x.fillRect(W - 26, 0, 26, H);
  x.strokeStyle = 'rgba(132,123,184,.55)'; x.lineWidth = 3; x.strokeRect(54, 54, W - 108, H - 108);
  x.save(); x.globalAlpha = .07; network(x, W, H, { n: 60, link: 230, color: '#2a3590', dot: '#2a3590', lw: 2, seed: 33 }); x.restore();
  try { const lg = await loadImg('assets/img/logo.webp'), r = 190 / lg.height; x.drawImage(lg, W / 2 - lg.width * r / 2, 90, lg.width * r, 190); } catch {}
  x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#5a6390'; x.font = '500 40px "Readex Pro"'; x.fillText('شهادة إتمام رحلة', W / 2, 340);
  x.fillStyle = '#1b2263'; x.font = '700 92px "Readex Pro"'; x.fillText('صناعي المستقبل', W / 2, 440);
  x.font = '500 38px "Readex Pro"'; x.fillStyle = '#5a6390'; x.fillText('تشهد مبادرة صناعيو المستقبل بأنّ', W / 2, 520);
  x.fillStyle = BRAND.violet; x.font = '700 84px "Readex Pro"'; x.fillText(name, W / 2, 620);
  x.strokeStyle = 'rgba(132,123,184,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 280, 650); x.lineTo(W / 2 + 280, 650); x.stroke();
  x.fillStyle = '#1b2263'; x.font = '500 36px "Readex Pro"'; x.fillText(`زار ${factories} مصنعاً في ${regions} مناطق، وتعرّف على خطوط الإنتاج ومعدات السلامة`, W / 2, 720);
  x.fillText('وأنجز مهمات المكتشف والمبدع والفنان والسفير.', W / 2, 772);
  // badges
  const bs = 120, bx0 = W / 2 - (badges.length * (bs + 30) - 30) / 2;
  for (let i = 0; i < badges.length; i++) { try { const im = await loadImg(badges[i].src); x.globalAlpha = badges[i].on ? 1 : .25; x.drawImage(im, bx0 + i * (bs + 30), 810, bs, bs); x.globalAlpha = 1; } catch {} }
  // numbers and the date
  x.font = '600 30px "Readex Pro"'; x.fillStyle = '#5a6390';
  x.fillText(`${points.toLocaleString('en')} نقطة · ${gears} تروس ذهبية`, W / 2, 1000);
  x.textAlign = 'right'; x.fillText(date, W - 110, 1040); x.textAlign = 'left'; x.direction = 'ltr'; x.fillText('Future Industrialists · futureindustrialist.org', 110, 1040);
  // the student's portrait in a seal
  try { const im = await loadImg(`assets/ui/${char}_front_cut.webp`); x.save(); x.beginPath(); x.arc(220, 560, 120, 0, 7); x.fillStyle = '#e8e6f6'; x.fill(); x.clip(); const r = 300 / im.height; x.drawImage(im, 220 - im.width * r / 2, 440, im.width * r, 300); x.restore(); x.strokeStyle = '#f2c230'; x.lineWidth = 8; x.beginPath(); x.arc(220, 560, 124, 0, 7); x.stroke(); } catch {}
  x.save(); x.translate(W - 220, 560); x.fillStyle = '#f2c230'; for (let i = 0; i < 24; i++) { x.rotate(Math.PI / 12); x.beginPath(); x.moveTo(0, -118); x.lineTo(14, -100); x.lineTo(-14, -100); x.fill(); } x.beginPath(); x.arc(0, 0, 102, 0, 7); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 34px "Readex Pro"'; x.fillText('معتمد', 0, -6); x.font = '500 22px "Readex Pro"'; x.fillText('2026', 0, 30); x.restore();
  return c;
}

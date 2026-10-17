import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, loadImg, BRAND, network, grad } from './tex.js';
import { tx, fx } from './i18n.js';

/* The graduation night: a round stage under sweeping spotlights, the initiative's logo on a giant
   screen, the four track badges flying in to circle the student, fireworks and confetti, and مِرشد
   cheering alongside. The camera circles the stage while the Future Industrialists song plays. */
export async function buildFinale(renderer, { badges, name = '', track = '' }) {
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
  // the giant LED wall: a calm glow behind the logo, the student's name in gold, nothing busy
  const [sc, sx] = canvas(2048, 1024);
  { const g = sx.createRadialGradient(1024, 430, 40, 1024, 520, 1250); g.addColorStop(0, '#4f63c9'); g.addColorStop(.45, '#26318a'); g.addColorStop(1, '#0b1040'); sx.fillStyle = g; sx.fillRect(0, 0, 2048, 1024); }
  // soft rays from behind the logo
  sx.save(); sx.translate(1024, 380); for (let i = 0; i < 28; i++) { sx.rotate(Math.PI * 2 / 28); const rg = sx.createLinearGradient(0, 0, 0, -1100); rg.addColorStop(0, 'rgba(200,195,255,.10)'); rg.addColorStop(1, 'rgba(200,195,255,0)'); sx.fillStyle = rg; sx.beginPath(); sx.moveTo(-18, 0); sx.lineTo(-70, -1100); sx.lineTo(70, -1100); sx.lineTo(18, 0); sx.fill(); } sx.restore();
  // two thin rings round the logo
  sx.strokeStyle = 'rgba(242,194,48,.55)'; sx.lineWidth = 4; sx.beginPath(); sx.arc(1024, 380, 330, 0, 7); sx.stroke();
  sx.strokeStyle = 'rgba(255,255,255,.18)'; sx.lineWidth = 2; sx.beginPath(); sx.arc(1024, 380, 352, 0, 7); sx.stroke();
  try { const lg = await loadImg('assets/img/logo_white.webp'), r = Math.min(520 / lg.height, 560 / lg.width); sx.drawImage(lg, 1024 - lg.width * r / 2, 380 - lg.height * r / 2, lg.width * r, lg.height * r); } catch {}
  sx.textAlign = 'center'; sx.direction = 'rtl'; sx.textBaseline = 'alphabetic';
  let fs = 132; sx.font = `700 ${fs}px "Readex Pro"`; const nm = name || ''; while (sx.measureText(nm).width > 1700 && fs > 70) { fs -= 6; sx.font = `700 ${fs}px "Readex Pro"`; }
  sx.shadowColor = 'rgba(242,194,48,.55)'; sx.shadowBlur = 30; sx.fillStyle = '#ffd65a'; sx.fillText(nm, 1024, 855); sx.shadowBlur = 0;
  sx.fillStyle = 'rgba(255,255,255,.82)'; sx.font = '500 54px "Readex Pro"'; sx.fillText(track ? tx(`خرّيج مسار ${track} · دفعة 2026`, `Graduate of the ${track} track · Class of 2026`) : tx('خرّيج رحلة صناعيو المستقبل · دفعة 2026', 'Graduate of the Future Industrialists journey · Class of 2026'), 1024, 950);
  // a fine LED grid over everything
  sx.fillStyle = 'rgba(0,0,20,.16)'; for (let y = 0; y < 1024; y += 6) sx.fillRect(0, y, 2048, 2);
  const st = toTex(sc), screen = new THREE.Mesh(new THREE.PlaneGeometry(22, 11), new THREE.MeshStandardMaterial({ map: st, emissive: '#fff', emissiveMap: st, emissiveIntensity: .9, roughness: .6 })); screen.position.set(0, 8.5, -12); scene.add(screen);
  const frame = new THREE.Mesh(new RoundedBoxGeometry(23, 12, .5, 4, .2), new THREE.MeshStandardMaterial({ color: '#111633', metalness: .6, roughness: .3 })); frame.position.set(0, 8.5, -12.3); scene.add(frame);
  // slim light columns either side of the wall, breathing in the brand colours
  const colM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#6f63c9', emissiveIntensity: .9 });
  for (const x of [-13.4, 13.4]) for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new RoundedBoxGeometry(.32, 11 - k * 2.2, .32, 2, .1), colM); c.position.set(x + Math.sign(x) * k * .7, 8.5 - k * 1.1, -12.1 + k * .3); scene.add(c); }
  anim.push(t => { colM.emissive.setHSL(.69 + Math.sin(t * .8) * .04, .6, .42 + Math.sin(t * 2.4) * .06); });
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

/* the certificate: a landscape page with the student's full name, the visit in numbers and the track logos */
export async function certificate({ name, char, factories, regions, points, gears, badges, track = null, date }) {
  const W = 1600, H = 1130, [c, x] = canvas(W, H);
  x.fillStyle = '#fbfaff'; x.fillRect(0, 0, W, H);
  x.fillStyle = grad(x, 0, 0, W, H, [[0, BRAND.navy], [.55, BRAND.blue], [1, BRAND.violet]]); x.fillRect(0, 0, W, 26); x.fillRect(0, H - 26, W, 26); x.fillRect(0, 0, 26, H); x.fillRect(W - 26, 0, 26, H);
  x.strokeStyle = 'rgba(132,123,184,.55)'; x.lineWidth = 3; x.strokeRect(54, 54, W - 108, H - 108);
  x.save(); x.globalAlpha = .045; network(x, W, H, { n: 40, link: 220, color: '#2a3590', dot: '#2a3590', lw: 2, seed: 33 }); x.restore();
  try { const lg = await loadImg('assets/img/logo-mark.webp'), r = 130 / lg.height; x.drawImage(lg, W / 2 - lg.width * r / 2, 84, lg.width * r, 130); } catch {}
  x.textAlign = 'center'; x.direction = 'rtl'; x.fillStyle = '#5a6390'; x.font = '500 38px "Readex Pro"'; x.fillText(tx('شهادة إتمام رحلة', 'Certificate of completion'), W / 2, 270);
  x.fillStyle = '#1b2263'; x.font = '700 104px "Readex Pro"'; x.fillText(tx('صناعيو المستقبل', 'Future Industrialists'), W / 2, 380);
  x.font = '500 36px "Readex Pro"'; x.fillStyle = '#5a6390'; x.fillText(tx('تشهد مبادرة صناعيو المستقبل بأنّ', 'Future Industrialists certifies that'), W / 2, 452);
  let fs = 80; x.font = `700 ${fs}px "Readex Pro"`; while (x.measureText(name).width > 900 && fs > 44) { fs -= 4; x.font = `700 ${fs}px "Readex Pro"`; }
  x.fillStyle = BRAND.violet; x.fillText(name, W / 2, 548);
  x.strokeStyle = 'rgba(132,123,184,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 330, 578); x.lineTo(W / 2 + 330, 578); x.stroke();
  x.fillStyle = '#1b2263'; x.font = '500 34px "Readex Pro"';
  x.fillText(tx(`زار ${factories} مصنعاً في ${regions} مناطق، وتعرّف على خطوط الإنتاج ومعدات السلامة،`, `Visited ${factories} factories in ${regions} regions, learning about production lines and safety gear,`), W / 2, 640);
  x.fillText(track ? tx(`وأتمّ مهمات مسار ${fx(track, 'name')} بنجاح.`, `Completed the ${fx(track, 'name')} track missions.`) : tx('وأنجز مهمات مسارات المكتشف والمبدع والفنان والسفير.', 'Completed the missions of the Discoverer, Creator, Artist and Ambassador tracks.'), W / 2, 690);
  // the track logos, each with its name; the earned ones in full colour
  const bs = 112, gap = 70, bx0 = W / 2 - (badges.length * (bs + gap) - gap) / 2;
  for (let i = 0; i < badges.length; i++) {
    const b = badges[i], cx0 = bx0 + i * (bs + gap) + bs / 2;
    if (b.main) { x.fillStyle = 'rgba(242,194,48,.18)'; x.beginPath(); x.arc(cx0, 790, bs * .66, 0, 7); x.fill(); x.strokeStyle = '#f2c230'; x.lineWidth = 4; x.stroke(); }
    try { const im = await loadImg(b.src); x.globalAlpha = b.on ? 1 : .22; x.drawImage(im, cx0 - bs / 2, 790 - bs / 2, bs, bs); x.globalAlpha = 1; } catch {}
    x.fillStyle = b.on ? (b.color || '#1b2263') : '#b9bdd6'; x.font = `${b.main ? 700 : 600} 27px "Readex Pro"`; x.fillText(b.name || '', cx0, 890);
  }
  // numbers and the date
  x.font = '600 30px "Readex Pro"'; x.fillStyle = '#5a6390';
  x.fillText(`${points.toLocaleString('en')} ${tx('نقطة', 'points')} · ${gears} ${gears === 1 ? tx('ترس ذهبي', 'golden gear') : tx('تروس ذهبية', 'golden gears')}`, W / 2, 975);
  x.textAlign = 'right'; x.fillText(date, W - 110, 1040); x.textAlign = 'left'; x.direction = 'ltr'; x.fillText('Future Industrialists · futureindustrialist.org', 110, 1040);
  // the student's portrait in a seal
  try { const im = await loadImg(`assets/ui/${char}_front_cut.webp`); x.save(); x.beginPath(); x.arc(230, 470, 120, 0, 7); x.fillStyle = '#e8e6f6'; x.fill(); x.clip(); const r = 300 / im.height; x.drawImage(im, 230 - im.width * r / 2, 350, im.width * r, 300); x.restore(); x.strokeStyle = '#f2c230'; x.lineWidth = 8; x.beginPath(); x.arc(230, 470, 124, 0, 7); x.stroke(); } catch {}
  x.save(); x.translate(W - 230, 470); x.fillStyle = '#f2c230'; for (let i = 0; i < 24; i++) { x.rotate(Math.PI / 12); x.beginPath(); x.moveTo(0, -118); x.lineTo(14, -100); x.lineTo(-14, -100); x.fill(); } x.beginPath(); x.arc(0, 0, 102, 0, 7); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.direction = 'rtl'; x.font = '700 34px "Readex Pro"'; x.fillText(tx('معتمد', 'Certified'), 0, -6); x.font = '500 22px "Readex Pro"'; x.fillText('2026', 0, 30); x.restore();
  return c;
}

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { canvas, toTex, loadImg } from './tex.js';

/* مِرشد: the initiative's little hover-robot. It floats beside the student in the city and in every
   factory, turns to look at whoever it talks to, blinks, and its antenna lights up when it speaks. */
export async function makeRobot() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const white = new THREE.MeshPhysicalMaterial({ color: '#f6f7fb', roughness: .28, clearcoat: 1, clearcoatRoughness: .2 });
  const violet = new THREE.MeshPhysicalMaterial({ color: '#847bb8', roughness: .35, metalness: .3, clearcoat: .8 });
  const navy = new THREE.MeshStandardMaterial({ color: '#1b2263', roughness: .4, metalness: .3 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0c1030', roughness: .08, metalness: .2, clearcoat: 1 });
  const eyeM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#6ff3ff', emissiveIntensity: 2.2 });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; return o; };
  // torso: an egg with a violet belt and the logo on the chest
  const torso = mesh(new THREE.SphereGeometry(.34, 32, 24), white, 0, .55, 0); torso.scale.set(1, 1.12, .92); body.add(torso);
  const belt = mesh(new THREE.TorusGeometry(.33, .035, 10, 40), violet, 0, .5, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(1, .92, 1); body.add(belt);
  try {
    const lg = await loadImg('assets/img/logo-mark.webp'), [c, x] = canvas(256, 256); x.fillStyle = '#fff'; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill();
    const r = 190 / Math.max(lg.width, lg.height); x.drawImage(lg, 128 - lg.width * r / 2, 128 - lg.height * r / 2, lg.width * r, lg.height * r);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(.11, 32), new THREE.MeshStandardMaterial({ map: toTex(c), roughness: .4 })); badge.position.set(0, .62, .305); badge.rotation.x = -.18; body.add(badge);
  } catch {}
  // head: rounded box with a dark visor and two glowing eyes
  const head = new THREE.Group(); head.position.y = 1.07; body.add(head);
  head.add(mesh(new RoundedBoxGeometry(.58, .42, .46, 5, .16), white));
  const visor = mesh(new RoundedBoxGeometry(.48, .28, .06, 4, .05), glass, 0, -.01, .21); head.add(visor);
  const eyes = []; for (const sx of [-.1, .1]) { const e = mesh(new THREE.CapsuleGeometry(.032, .05, 4, 10), eyeM, sx, 0, .248); head.add(e); eyes.push(e); }
  const mouth = mesh(new THREE.TorusGeometry(.045, .01, 6, 16, Math.PI), eyeM, 0, -.07, .248); mouth.rotation.z = Math.PI; head.add(mouth);
  for (const sx of [-1, 1]) { const ear = mesh(new THREE.CylinderGeometry(.07, .07, .06, 20), violet, sx * .3, 0, 0); ear.rotation.z = Math.PI / 2; head.add(ear); }
  const stalk = mesh(new THREE.CylinderGeometry(.012, .012, .2, 8), navy, 0, .3, 0); head.add(stalk);
  const tipM = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#f2c230', emissiveIntensity: 1.5 }), tip = mesh(new THREE.SphereGeometry(.045, 16, 12), tipM, 0, .42, 0); head.add(tip);
  // arms: little paddles that wave when it talks
  const arms = []; for (const sx of [-1, 1]) { const sh = new THREE.Group(); sh.position.set(sx * .36, .7, 0); body.add(sh); const a = mesh(new THREE.CapsuleGeometry(.055, .22, 6, 12), white, 0, -.15, 0); sh.add(a); const h = mesh(new THREE.SphereGeometry(.07, 14, 10), violet, 0, -.3, 0); sh.add(h); sh.rotation.z = sx * .35; arms.push(sh); }
  // the hover jet under it and a soft light on the ground
  const jet = new THREE.Mesh(new THREE.ConeGeometry(.16, .3, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#8fd8ff', transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending })); jet.position.y = .08; jet.rotation.x = Math.PI; body.add(jet);
  const ring = mesh(new THREE.TorusGeometry(.17, .03, 8, 28), navy, 0, .2, 0); ring.rotation.x = Math.PI / 2; body.add(ring);
  const [sc, sx] = canvas(64, 64); const gr = sx.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(120,200,255,.55)'); gr.addColorStop(1, 'rgba(120,200,255,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 64, 64);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: toTex(sc), transparent: true, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = .03; g.add(glow);
  body.position.y = .55; g.scale.setScalar(.62);
  let t = Math.random() * 10, blink = 2, talk = 0, wave = 0, yaw = 0;
  const R = {
    group: g, head,
    pos: new THREE.Vector3(), target: new THREE.Vector3(), look: null, floor: 0,
    /* speak for a while (antenna and mouth light up, arms move) */
    talk(sec = 2) { talk = Math.max(talk, sec); },
    wave(sec = 1.6) { wave = Math.max(wave, sec); },
    place(p, floor = 0) { R.pos.copy(p); R.target.copy(p); R.floor = floor; g.position.copy(p); },
    update(dt) {
      t += dt;
      // glide toward the target, bob in the air
      const d = R.target.clone().sub(R.pos), dist = d.length();
      if (dist > .01) R.pos.addScaledVector(d, Math.min(1, dt * (dist > 6 ? 3.2 : 1.8)));
      g.position.set(R.pos.x, R.floor + Math.sin(t * 2.1) * .06, R.pos.z);
      body.rotation.z = THREE.MathUtils.clamp(-d.x * .05, -.2, .2) + Math.sin(t * 1.3) * .03; body.rotation.x = THREE.MathUtils.clamp(d.z * .05, -.2, .2);
      // turn toward who it is looking at, otherwise the way it moves
      const lk = R.look ? Math.atan2(R.look.x - R.pos.x, R.look.z - R.pos.z) : dist > .3 ? Math.atan2(d.x, d.z) : yaw;
      yaw += Math.atan2(Math.sin(lk - yaw), Math.cos(lk - yaw)) * Math.min(1, dt * 5); g.rotation.y = yaw;
      head.rotation.y = Math.sin(t * .7) * .15; head.rotation.x = Math.sin(t * .9) * .05;
      blink -= dt; const b = blink < .12 ? .15 : 1; if (blink < 0) blink = 2 + Math.random() * 3; for (const e of eyes) e.scale.y = b;
      talk = Math.max(0, talk - dt); wave = Math.max(0, wave - dt);
      tipM.emissiveIntensity = talk > 0 ? 2 + Math.sin(t * 18) * 1.2 : 1.2; mouth.scale.y = talk > 0 ? 1 + Math.abs(Math.sin(t * 14)) * 1.4 : 1;
      arms[0].rotation.z = -.35 - (talk > 0 ? Math.abs(Math.sin(t * 5)) * .4 : 0); arms[1].rotation.z = .35 + (wave > 0 ? 1.9 + Math.sin(t * 12) * .45 : talk > 0 ? Math.abs(Math.sin(t * 5 + 1)) * .4 : 0);
      jet.scale.y = .8 + Math.random() * .4; glow.material.opacity = .7 + Math.sin(t * 2.1) * .2;
    }
  };
  g.traverse(o => { if (o.isMesh && o !== jet && o !== glow) o.castShadow = true; });
  return R;
}

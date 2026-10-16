import * as THREE from 'three';
import { canvas, toTex } from './tex.js';

/* Traffic lights at every zebra crossing: a three-lamp head for each direction of traffic and a
   red/green walking-man signal facing across the road. They cycle on their own; a student waiting
   at the kerb works like the push button, and the light stays red while someone is still crossing. */
const ON = { red: '#ff2a2a', amber: '#ffb21e', green: '#22e06a' }, OFF = { red: '#2c0b0b', amber: '#2c2108', green: '#0a2412' };
function manTex(col, walking) {
  const [c, x] = canvas(128, 160); x.fillStyle = '#0d0f13'; x.fillRect(0, 0, 128, 160);
  x.fillStyle = col; x.strokeStyle = col; x.lineCap = 'round'; x.lineWidth = 13;
  x.beginPath(); x.arc(64, 30, 13, 0, 7); x.fill();
  const leg = walking ? 26 : 10, arm = walking ? 24 : 6;
  x.beginPath(); x.moveTo(64, 50); x.lineTo(64, 96); x.stroke();
  x.beginPath(); x.moveTo(64, 96); x.lineTo(64 - leg, 140); x.moveTo(64, 96); x.lineTo(64 + leg * .7, 140); x.stroke();
  x.beginPath(); x.moveTo(64, 58); x.lineTo(64 - arm, 88); x.moveTo(64, 58); x.lineTo(64 + arm, 84); x.stroke();
  return toTex(c);
}
let TEX = null;
export function makeSignals(scene, xs) {
  TEX ||= { stop: manTex('#ff3b3b', false), walk: manTex('#2cff7a', true) };
  const poleM = new THREE.MeshStandardMaterial({ color: '#2b2f37', metalness: .6, roughness: .4 }), boxM = new THREE.MeshStandardMaterial({ color: '#15171c', roughness: .55 });
  const lampG = new THREE.CircleGeometry(.12, 20), colliders = [];
  const list = xs.map(x => {
    const sg = { x, phase: 'go', t: 4 + Math.random() * 8, lamps: [], peds: [], shown: '' };
    // near side for eastbound traffic, far side for westbound
    for (const [px, pz, face] of [[x - 3.4, 8.7, -1], [x + 3.4, -8.7, 1]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 4.3, 12), poleM); pole.position.set(px, 2.15, pz); pole.castShadow = true; scene.add(pole);
      colliders.push([px, pz, .25]);
      const head = new THREE.Group(); head.position.set(px, 3.7, pz); head.rotation.y = face * Math.PI / 2; scene.add(head);
      const box = new THREE.Mesh(new THREE.BoxGeometry(.38, 1.06, .26), boxM); box.castShadow = true; head.add(box);
      ['red', 'amber', 'green'].forEach((k, i) => {
        const m = new THREE.MeshStandardMaterial({ color: '#111', emissive: OFF[k], emissiveIntensity: 1.6 });
        const l = new THREE.Mesh(lampG, m); l.position.set(0, .32 - i * .32, .135); head.add(l);
        const visor = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .14, 16, 1, true, -Math.PI / 2, Math.PI), boxM); visor.rotation.x = Math.PI / 2; visor.position.set(0, .34 - i * .32, .2); head.add(visor);
        sg.lamps.push({ k, m });
      });
      // the walking-man signal faces the people waiting on the other side of the road
      const ped = new THREE.Group(); ped.position.set(px, 2.55, pz); ped.rotation.y = face < 0 ? Math.PI : 0; scene.add(ped);
      ped.add(new THREE.Mesh(new THREE.BoxGeometry(.34, .44, .18), boxM));
      const pm = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: TEX.stop, emissiveIntensity: 1.4 });
      const face2 = new THREE.Mesh(new THREE.PlaneGeometry(.28, .35), pm); face2.position.z = .095; ped.add(face2); sg.peds.push(pm);
      const btn = new THREE.Mesh(new THREE.BoxGeometry(.14, .2, .1), new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: .5 })); btn.position.set(px - face * .1, 1.15, pz + (face < 0 ? -.08 : .08)); scene.add(btn);
    }
    return sg;
  });
  function paint(sg, blinkOff) {
    const key = sg.phase + (blinkOff ? '0' : '1'); if (sg.shown === key) return; sg.shown = key;
    const lit = sg.phase === 'go' ? 'green' : sg.phase === 'amber' ? 'amber' : 'red';
    for (const { k, m } of sg.lamps) m.emissive.set(k === lit ? ON[k] : OFF[k]);
    for (const pm of sg.peds) { const walk = sg.phase === 'stop'; pm.emissiveMap = walk ? TEX.walk : TEX.stop; pm.emissiveIntensity = walk && blinkOff ? .15 : 1.4; pm.needsUpdate = true; }
  }
  let clock = 0;
  return {
    list, colliders,
    /* p: the student's position (or null while on the bus) */
    update(dt, p) {
      clock += dt;
      for (const sg of list) {
        sg.t -= dt;
        const atKerb = p && Math.abs(p.x - sg.x) < 4.5 && Math.abs(p.z) > 7.3 && Math.abs(p.z) < 12;
        const onCrossing = p && Math.abs(p.x - sg.x) < 3 && Math.abs(p.z) < 7.9;
        if (sg.phase === 'go' && (atKerb || onCrossing) && sg.t > 2.2) sg.t = 2.2;
        if (sg.phase === 'stop' && onCrossing && sg.t < 1.5) sg.t = 1.5;
        if (sg.t <= 0) {
          if (sg.phase === 'go') { sg.phase = 'amber'; sg.t = 2.6; }
          else if (sg.phase === 'amber') { sg.phase = 'stop'; sg.t = 11; }
          else { sg.phase = 'go'; sg.t = 16 + Math.random() * 10; }
        }
        paint(sg, sg.phase === 'stop' && sg.t < 3.5 && Math.floor(clock * 3) % 2 === 0);
      }
    }
  };
}

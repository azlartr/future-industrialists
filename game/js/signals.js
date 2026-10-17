import * as THREE from 'three';
import { canvas, toTex } from './tex.js';
import { C, onRoad } from './city.js';

/* Traffic lights at the avenue's junctions. Each approach gets its own green in turn (so nothing
   ever crosses a moving stream). A student waiting at a corner works like the push button for a walk
   phase on every zebra, and the lights hold red while someone is still on a crossing. The initiative's
   coach gets bus priority: the lights turn to its approach as it comes up. */
const ON = { red: '#ff2a2a', amber: '#ffb21e', green: '#22e06a' }, OFF = { red: '#2c0b0b', amber: '#2c2108', green: '#0a2412' };
const T_GREEN = 7, T_AMBER = 2.5, T_CLEAR = 1.2, T_WALK = 8;
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
export function makeSignals(scene, NET) {
  TEX ||= { stop: manTex('#ff3b3b', false), walk: manTex('#2cff7a', true) };
  const poleM = new THREE.MeshStandardMaterial({ color: '#2b2f37', metalness: .6, roughness: .4 }), boxM = new THREE.MeshStandardMaterial({ color: '#15171c', roughness: .55 });
  const btnM = new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: .5 });
  const lampG = new THREE.CircleGeometry(.12, 20), visG = new THREE.CylinderGeometry(.15, .15, .14, 16, 1, true, -Math.PI / 2, Math.PI), colliders = [];
  const pole = (x, z, h = 4.3) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, h, 12), poleM); p.position.set(x, .2 + h / 2, z); p.castShadow = true; scene.add(p); colliders.push([x, z, .25]); };
  const pedHead = (sg, x, z, yaw) => {
    const ped = new THREE.Group(); ped.position.set(x, 2.75, z); ped.rotation.y = yaw; scene.add(ped);
    ped.add(new THREE.Mesh(new THREE.BoxGeometry(.34, .44, .18), boxM));
    const pm = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: TEX.stop, emissiveIntensity: 1.4 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(.26, .34), pm); face.position.z = .095; ped.add(face); sg.peds.push(pm);
    const b = new THREE.Mesh(new THREE.BoxGeometry(.12, .16, .08), btnM); b.position.set(0, -1.35, .06); ped.add(b);
  };
  const list = NET.nodes.filter(n => n.signal).map((n, k) => {
    const sg = { node: n, x: n.x, z: n.z, appr: n.inL, cur: k % n.inL.length, phase: 'green', t: 3 + k * 2.3, peds: [], heads: new Map(), want: false, shown: '' };
    for (const L of n.inL) {
      // the pole stands on the right-hand corner just before the stop line, the head facing the drivers
      const p = L.pts[L.pts.length - 1], r = L.r, d = L.d, px = p.x + r.x * (C.HW - C.CAR + .9) - d.x * .6, pz = p.y + r.y * (C.HW - C.CAR + .9) - d.y * .6;
      pole(px, pz);
      const head = new THREE.Group(); head.position.set(px, 3.9, pz); head.rotation.y = Math.atan2(-d.x, -d.y); scene.add(head);
      const bx = new THREE.Mesh(new THREE.BoxGeometry(.38, 1.06, .26), boxM); bx.castShadow = true; head.add(bx);
      const lamps = ['red', 'amber', 'green'].map((key, i) => {
        const m = new THREE.MeshStandardMaterial({ color: '#111', emissive: OFF[key], emissiveIntensity: 1.6 });
        const l = new THREE.Mesh(lampG, m); l.position.set(0, .32 - i * .32, .135); head.add(l);
        const v = new THREE.Mesh(visG, boxM); v.rotation.x = Math.PI / 2; v.position.set(0, .34 - i * .32, .2); head.add(v);
        return { key, m };
      });
      sg.heads.set(L, lamps);
      // walk signals at both ends of this arm's zebra, each facing the far kerb
      pedHead(sg, px, pz, Math.atan2(-r.x, -r.y));
      const ox = p.x - r.x * (C.CAR + C.HW + .9) - d.x * .6, oz = p.y - r.y * (C.CAR + C.HW + .9) - d.y * .6;
      pole(ox, oz, 3.1); pedHead(sg, ox, oz, Math.atan2(r.x, r.y));
    }
    return sg;
  });
  const sgOf = new Map(list.map(s => [s.node, s]));
  function state(L) {
    const sg = sgOf.get(L.to); if (!sg) return 'go';
    if (sg.appr[sg.cur].appr !== L.appr) return 'stop'; // the coach's kerb lane shares its arm's light
    return sg.phase === 'green' ? 'go' : sg.phase === 'amber' ? 'amber' : 'stop';
  }
  function paint(sg) {
    for (const [L, lamps] of sg.heads) { const st = state(L), on = st === 'go' ? 'green' : st === 'amber' ? 'amber' : 'red'; for (const l of lamps) l.m.emissive.set(l.key === on ? ON[l.key] : OFF[l.key]); }
  }
  list.forEach(paint);
  return {
    list, colliders, state, sgOf,
    walk(n) { const sg = sgOf.get(n); return !!sg && sg.phase === 'walk'; },
    /* p: the student's position on foot (or null); prio: the lane the coach is coming up on (or null) */
    update(dt, p, prio = null) {
      for (const sg of list) {
        const d = p ? Math.hypot(p.x - sg.x, p.z - sg.z) : 99, road = !!p && onRoad(p.x, p.z);
        const waiting = d > 5 && d < 15 && !road, crossing = d < 12 && road, mine = prio && prio.to === sg.node ? sg.appr.findIndex(a => a.appr === prio.appr) : -1;
        if (waiting) sg.want = true;
        sg.t -= dt;
        if (mine >= 0 && !sg.want) { if (sg.phase === 'green' && sg.cur === mine) sg.t = Math.max(sg.t, 2.5); else { sg.next = mine; if (sg.phase === 'green') sg.t = Math.min(sg.t, 1); } }
        if (sg.phase === 'green' && sg.want) sg.t = Math.min(sg.t, 1.5);
        if (sg.t <= 0) {
          if (sg.phase === 'green') { sg.phase = 'amber'; sg.t = T_AMBER; }
          else if (sg.phase === 'amber') { sg.phase = 'clear'; sg.t = T_CLEAR; }
          else if (sg.phase === 'clear') {
            if (sg.want) { sg.phase = 'walk'; sg.t = T_WALK; sg.want = false; }
            else { sg.cur = sg.next ?? (sg.cur + 1) % sg.appr.length; sg.next = null; sg.phase = 'green'; sg.t = T_GREEN; }
          } else if (sg.phase === 'walk') {
            if (crossing) sg.t = .5; // still on the zebra: the traffic keeps waiting
            else { sg.cur = sg.next ?? (sg.cur + 1) % sg.appr.length; sg.next = null; sg.phase = 'green'; sg.t = T_GREEN; }
          }
        }
        const blink = sg.phase === 'walk' && sg.t < 3 && Math.floor(sg.t * 3) % 2 === 0;
        const key = sg.phase + sg.cur + (sg.phase === 'walk' ? (blink ? 'b' : 'w') : '');
        if (key !== sg.shown) { sg.shown = key; paint(sg); const m = sg.phase === 'walk' && !blink ? TEX.walk : TEX.stop; for (const pm of sg.peds) { pm.emissiveMap = m; pm.needsUpdate = true; } }
      }
    }
  };
}

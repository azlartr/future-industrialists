import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { NET, polyAt } from './city.js';

/* Traffic through the district. Every car follows the lanes and, at a junction, picks a way on
   (mostly straight on). It keeps its distance to the car ahead, waits at red lights, takes turns at
   give-way junctions (one car at a time inside), and stops well short of anyone on the road: the
   student on foot, or the coach. */
const CARS = [['sedan', 5], ['suv', 4], ['suv-luxury', 3], ['sedan-sports', 2], ['hatchback-sports', 2], ['taxi', 2], ['van', 2], ['delivery', 2], ['truck', 2], ['police', .6], ['ambulance', .4], ['garbage-truck', .5]];
const CAR_LEN = 4.4, COUNT = 34;
let protos = null;
const loader = new GLTFLoader();
async function loadCars() {
  if (protos) return protos; protos = {};
  await Promise.all(CARS.map(async ([n]) => { const g = await loader.loadAsync(`assets/cars/${n}.glb`); protos[n] = g.scene; }));
  // one scale for the whole kit, from the sedan: about 4.4 m long
  const b = new THREE.Box3().setFromObject(protos.sedan), k = CAR_LEN / (b.max.z - b.min.z);
  for (const s of Object.values(protos)) { s.userData.k = k; s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  return protos;
}
function pick(list) { const tot = list.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot; for (const [n, w] of list) if ((r -= w) <= 0) return n; return list[0][0]; }
function choose(L) {
  const opts = L.next.filter(c => c.turn !== 'U'); if (!opts.length) return L.next[0];
  return opts[pick(opts.map((c, i) => [i, c.turn === 'S' ? 3 : c.turn === 'R' ? 1.6 : 1.2]))];
}
const P = new THREE.Vector2(), D = new THREE.Vector2();

export async function makeLife(scene, { signals }) {
  const cars = await loadCars();
  const group = new THREE.Group(); group.name = 'life'; scene.add(group);
  const traffic = [], lanes = NET.lanes, total = lanes.reduce((a, L) => a + L.len, 0);
  for (let i = 0; i < COUNT; i++) {
    const name = pick(CARS), src = cars[name], o = src.clone(true), k = src.userData.k;
    o.scale.setScalar(k); group.add(o);
    const size = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
    const wheels = []; o.traverse(n => { if (/^wheel-(front|back)-(left|right)/.test(n.name)) wheels.push(n); }); // not the SUV's spare on the tailgate
    // a free spot on a lane, chosen by length
    let L, s, tries = 0;
    do { let r = Math.random() * total; L = lanes.find(l => (r -= l.len) <= 0) || lanes[0]; s = 4 + Math.random() * Math.max(1, L.len - 8); tries++; }
    while (tries < 40 && traffic.some(c => c.seg === L && Math.abs(c.s - s) < 14));
    const c = { o, name, len: size.z, wheels, r: .3 * k, vmax: 9 + Math.random() * 4, seg: L, s, v: 0, next: choose(L), wait: 0, x: 0, z: 0, yaw: 0 };
    polyAt(L, s, P, D); c.x = P.x; c.z = P.y; c.yaw = Math.atan2(D.x, D.y); traffic.push(c);
  }
  const ahead = (path, d) => { for (const p of path) if (d >= p.off && d <= p.off + p.seg.len) return polyAt(p.seg, d - p.off, P); return null; };
  return {
    group, traffic,
    /* obstacles: [{ x, z, person } | { x, z, yaw, halfLen, halfWid }] — the student on foot and the coach */
    update(dt, obstacles = [], cam) {
      for (const c of traffic) {
        const seg = c.seg, path = [{ seg, off: -c.s }];
        if (seg.kind === 'lane') { path.push({ seg: c.next, off: seg.len - c.s }); path.push({ seg: c.next.to, off: seg.len - c.s + c.next.len }); }
        else path.push({ seg: seg.to, off: seg.len - c.s });
        let gap = 70;
        // the car ahead, on this stretch or the next ones
        for (const o of traffic) if (o !== c) for (const p of path) if (o.seg === p.seg) { const dd = p.off + o.s; if (dd > 0) gap = Math.min(gap, dd - (c.len + o.len) / 2 - 2); }
        // the junction at the end of this lane: lights, or a turn at a give-way junction
        if (seg.kind === 'lane') {
          const toEnd = seg.len - c.s, n = seg.to;
          let stop = false;
          if (n.signal) { const st = signals?.state(seg) || 'go'; stop = st === 'stop' || (st === 'amber' && toEnd > c.v * c.v / 10 + 1.5); }
          else if (!n.round && !n.bend) { if (n.lock && n.lock !== c && c.wait < 7) stop = true; else if (toEnd < 4 + c.v * 1.2) n.lock = c; }
          if (stop) gap = Math.min(gap, toEnd - c.len / 2 - .6);
        }
        // cars from other streams across this car's path (joining a roundabout, merging): give way to them,
        // unless this car is already inside the junction and they are still waiting on their lane
        if (c.wait < 6) for (let d = c.len / 2 + 1; d < Math.min(gap + c.len, 24); d += 2) {
          const p = ahead(path, d); if (!p) break; const px = p.x, pz = p.y; let hit = false;
          for (const o of traffic) {
            if (o === c || path.some(pp => pp.seg === o.seg) || (c.seg.kind === 'conn' && o.seg.kind === 'lane')) continue;
            if (Math.abs(px - o.x) < 3 && Math.abs(pz - o.z) < 3 && Math.hypot(px - o.x, pz - o.z) < 2.6) { gap = Math.min(gap, d - c.len / 2 - 2.5); hit = true; break; }
          }
          if (hit) break;
        }
        // anyone in the way: sample the road ahead
        const look = Math.min(gap + c.len, 40);
        for (let d = c.len / 2; d < look && obstacles.length; d += 1.5) {
          const p = ahead(path, d); if (!p) break; let hit = false;
          for (const ob of obstacles) {
            if (ob.person) { if (Math.hypot(p.x - ob.x, p.y - ob.z) < 1.9) { gap = Math.min(gap, d - c.len / 2 - 3.5); hit = true; } }
            else { const dx = p.x - ob.x, dz = p.y - ob.z, ca = Math.cos(ob.yaw), sa = Math.sin(ob.yaw), al = dx * ca - dz * sa, la = dx * sa + dz * ca; if (Math.abs(al) < ob.halfLen + .6 && Math.abs(la) < ob.halfWid + .9) { gap = Math.min(gap, d - c.len / 2 - 1.5); hit = true; } }
          }
          if (hit) break;
        }
        // speed: what the gap allows, slower into a turn
        let want = Math.min(c.vmax, seg.vmax, Math.sqrt(Math.max(0, 2 * 6 * (gap - 1))));
        if (seg.kind === 'lane') want = Math.min(want, Math.sqrt(c.next.vmax ** 2 + 2 * 3 * Math.max(0, seg.len - c.s)));
        const dv = want - c.v; c.v += dv > 0 ? Math.min(dv, 2.6 * dt) : Math.max(dv, (gap < 3 ? -16 : -8) * dt); c.v = Math.max(0, c.v);
        c.wait = c.v < .2 ? c.wait + dt : 0;
        c.s += c.v * dt;
        while (c.s > c.seg.len) {
          c.s -= c.seg.len;
          if (c.seg.kind === 'lane') c.seg = c.next;
          else { if (c.seg.node.lock === c) c.seg.node.lock = null; c.seg = c.seg.to; c.next = choose(c.seg); }
        }
        if (c.wait > 9) for (const n of NET.nodes) if (n.lock === c) n.lock = null;
        polyAt(c.seg, c.s, P, D);
        c.x = P.x; c.z = P.y; const yaw = Math.atan2(D.x, D.y), dy = Math.atan2(Math.sin(yaw - c.yaw), Math.cos(yaw - c.yaw)); c.yaw += dy * Math.min(1, dt * 8);
        c.o.position.set(c.x, .02, c.z); c.o.rotation.y = c.yaw;
        if (!cam || cam.distanceToSquared(c.o.position) < 9000) for (const w of c.wheels) w.rotation.x += c.v * dt / c.r;
      }
    }
  };
}

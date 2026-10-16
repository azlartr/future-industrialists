import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

/* Street life around the player: traffic in the lanes and students on the sidewalks.
   Only a window around the focus point (the player or the bus) is simulated; anything that
   leaves the window is recycled to its far edge, so the 1.3 km road always feels busy. */
const CARS = [['sedan', 5], ['suv', 4], ['suv-luxury', 3], ['sedan-sports', 2], ['hatchback-sports', 2], ['taxi', 2], ['van', 2], ['delivery', 2], ['truck', 2], ['police', .6], ['ambulance', .4], ['garbage-truck', .5]];
// eastbound inner lane, both westbound lanes; the eastbound curb lane belongs to the bus
const LANES = [{ z: 2.75, dir: 1 }, { z: -2.75, dir: -1 }, { z: -5.9, dir: -1 }];
const WIN = 210, CAR_LEN = 4.4, ROAD_END = 640;
let protos = null, people = null;
const loader = new GLTFLoader();

async function loadCars() {
  if (protos) return protos; protos = {};
  await Promise.all(CARS.map(async ([n]) => { const g = await loader.loadAsync(`assets/cars/${n}.glb`); protos[n] = g.scene; }));
  // one scale for the whole kit, from the sedan: about 4.4 m long
  const b = new THREE.Box3().setFromObject(protos.sedan), k = CAR_LEN / (b.max.z - b.min.z);
  for (const s of Object.values(protos)) { s.userData.k = k; s.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
  return protos;
}
async function loadPeople() {
  if (people) return people;
  const [m, w] = await Promise.all(['man', 'woman'].map(n => loader.loadAsync(`assets/chars/npc_${n}.glb`)));
  return (people = [m, w].map(g => {
    const b = new THREE.Box3().setFromObject(g.scene); g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    return { scene: g.scene, clip: g.animations.find(a => /walk/i.test(a.name)) || g.animations[0], h: b.max.y - b.min.y, y0: -b.min.y };
  }));
}
function pick(list) { const tot = list.reduce((a, [, w]) => a + w, 0); let r = Math.random() * tot; for (const [n, w] of list) if ((r -= w) <= 0) return n; return list[0][0]; }

export async function makeLife(scene, { sea = false } = {}) {
  const [cars, folk] = await Promise.all([loadCars(), loadPeople()]);
  const group = new THREE.Group(); group.name = 'life'; scene.add(group);
  const traffic = [], walkers = [];
  // ---- traffic
  for (const lane of LANES) for (let i = 0; i < 7; i++) {
    const name = pick(CARS), src = cars[name], o = src.clone(true), k = src.userData.k;
    o.scale.setScalar(k); o.rotation.y = lane.dir * Math.PI / 2; group.add(o);
    const wheels = []; o.traverse(n => { if (/^wheel/.test(n.name)) wheels.push(n); });
    const len = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3()).x;
    traffic.push({ o, lane, x: 0, v: 0, vmax: 9 + Math.random() * 6, wheels, len, r: .3 * k, slot: i });
  }
  // ---- people on the sidewalks (and on the corniche promenade where there is sea)
  const paths = [8.9, 12.3, -9.2, -10.4, ...(sea ? [14.6, 14.6] : [])];
  for (let i = 0; i < 14; i++) {
    const P = folk[i % 2], o = cloneSkinned(P.scene), s = 1.5 / P.h * (1 + Math.random() * .18);
    const root = new THREE.Group(); o.scale.setScalar(s); o.position.y = P.y0 * s; root.add(o); group.add(root);
    const mixer = new THREE.AnimationMixer(o), act = mixer.clipAction(P.clip); act.play(); act.time = Math.random() * P.clip.duration;
    walkers.push({ root, o, mixer, act, z: paths[i % paths.length] + (Math.random() - .5) * .5, x: 0, v: 0, vmax: .95 + Math.random() * .45, tx: 0, wait: Math.random() * 3, w: 0, yaw: 0 });
  }
  let placed = false;
  function place(focus) {
    traffic.forEach(c => { c.x = focus + (c.slot / 7 - .5) * 2 * WIN + Math.random() * 18; c.v = c.vmax * .8; });
    walkers.forEach(p => { p.x = focus + (Math.random() - .5) * 160; p.tx = p.x + (Math.random() - .5) * 60; });
    placed = true;
  }
  const tmp = new THREE.Vector3();
  return {
    group, traffic, walkers, place,
    /* focus: x the window follows; obstacles: [{x, z, halfLen, halfWid}] cars must stop for; cam: camera position */
    update(dt, focus, obstacles, cam) {
      if (!placed) place(focus);
      // traffic: keep a safe gap to whatever is ahead in the lane
      for (const c of traffic) {
        const dir = c.lane.dir; let gap = 1e9;
        for (const d of traffic) if (d !== c && d.lane === c.lane) { const g = (d.x - c.x) * dir; if (g > 0 && g < gap) gap = g - (c.len + d.len) / 2; }
        for (const ob of obstacles) if (Math.abs(ob.z - c.lane.z) < ob.halfWid + .95) { const g = (ob.x - c.x) * dir; if (g > -ob.halfLen && g < gap + ob.halfLen) gap = Math.min(gap, g - ob.halfLen - c.len / 2); }
        const want = Math.max(0, Math.min(c.vmax, (gap - 4) * .8));
        c.v += Math.max(-9 * dt, Math.min(3 * dt, want - c.v));
        c.x += dir * c.v * dt;
        // recycle cars that leave the window, or the road
        const off = c.x - focus;
        if (Math.abs(off) > WIN + 10 || Math.abs(c.x) > ROAD_END) {
          let nx = focus - Math.sign(off) * WIN; nx = THREE.MathUtils.clamp(nx, -ROAD_END + 5, ROAD_END - 5);
          const busy = traffic.some(d => d !== c && d.lane === c.lane && Math.abs(d.x - nx) < 14);
          if (!busy) { c.x = nx; c.v = c.vmax * .7; }
        }
        c.o.position.set(c.x, .02, c.lane.z);
        for (const w of c.wheels) w.rotation.x += c.v * dt / c.r;
      }
      // people: stroll to a point, pause a little, pick another; keep clear of the player
      for (const p of walkers) {
        if (p.wait > 0) { p.wait -= dt; p.v = Math.max(0, p.v - dt * 3); }
        else {
          const d = p.tx - p.x;
          if (Math.abs(d) < .3) { p.wait = 1.5 + Math.random() * 5; p.tx = p.x + (Math.random() < .5 ? -1 : 1) * (10 + Math.random() * 50); }
          else { const blocked = obstacles.some(ob => ob.person && Math.abs(ob.z - p.z) < 1 && (ob.x - p.x) * Math.sign(d) > 0 && Math.abs(ob.x - p.x) < 1.6); p.v += ((blocked ? 0 : p.vmax) - p.v) * Math.min(1, dt * 4); p.yaw = d > 0 ? Math.PI / 2 : -Math.PI / 2; }
          p.x += Math.sign(d) * p.v * dt;
        }
        if (Math.abs(p.x - focus) > 120) { p.x = focus + (p.x < focus ? 1 : -1) * (90 + Math.random() * 20); p.tx = p.x + (focus - p.x) * .3; }
        p.root.position.set(p.x, .2, p.z);
        p.o.rotation.y += Math.atan2(Math.sin(p.yaw - p.o.rotation.y), Math.cos(p.yaw - p.o.rotation.y)) * Math.min(1, dt * 6);
        // walk blends out to the rest pose when standing; far-away people are not animated
        p.w += ((p.v > .1 ? 1 : 0) - p.w) * Math.min(1, dt * 6); p.act.setEffectiveWeight(p.w); p.act.timeScale = Math.max(.6, p.v / .7);
        if (!cam || cam.distanceTo(tmp.set(p.x, 1, p.z)) < 80) p.mixer.update(dt);
      }
    }
  };
}

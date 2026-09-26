// ===== 数学 / 物理 / 射线工具 =====
import * as THREE from 'three';

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function makeAABB(cx, cy, cz, w, h, d) {
  return {
    min: new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
    max: new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2),
  };
}

export function aabbOverlaps(a, b) {
  return a.min.x < b.max.x && a.max.x > b.min.x &&
         a.min.y < b.max.y && a.max.y > b.min.y &&
         a.min.z < b.max.z && a.max.z > b.min.z;
}

// 角色碰撞体（脚部中心 pos + 宽高）
export class Body {
  constructor(x, y, z, w, h) {
    this.pos = new THREE.Vector3(x, y, z);   // 脚底中心
    this.vel = new THREE.Vector3();
    this.w = w; this.h = h;
    this.grounded = false;
  }
  aabb(out, pos = this.pos, h = this.h) {
    out.min.set(pos.x - this.w / 2, pos.y, pos.z - this.w / 2);
    out.max.set(pos.x + this.w / 2, pos.y + h, pos.z + this.w / 2);
    return out;
  }
}

const _tmp = { min: new THREE.Vector3(), max: new THREE.Vector3() };
const _step = { min: new THREE.Vector3(), max: new THREE.Vector3() };

function overlapsAt(body, pos, h, colliders) {
  const b = body.aabb(_tmp, pos, h);
  for (let i = 0; i < colliders.length; i++) {
    if (aabbOverlaps(b, colliders[i])) return colliders[i];
  }
  return null;
}

// 逐轴移动 + 碰撞解决 + 台阶跨越
export function moveBody(body, dt, colliders, stepHeight = 0.56) {
  const p = body.pos, v = body.vel;

  // Y 轴
  p.y += v.y * dt;
  let hit = overlapsAt(body, p, body.h, colliders);
  if (hit) {
    if (v.y <= 0) { p.y = hit.max.y; body.grounded = true; }
    else { p.y = hit.min.y - body.h - 0.001; }
    v.y = 0;
  } else if (v.y !== 0) {
    body.grounded = false;
  }
  // 地面吸附：防止走台阶抖动
  if (body.grounded || v.y === 0) {
    const down = p.clone(); down.y -= 0.08;
    const below = overlapsAt(body, down, body.h, colliders);
    if (!below && v.y === 0) body.grounded = false;
  }

  // X / Z 轴（带台阶跨越）
  for (const axis of ['x', 'z']) {
    const d = v[axis] * dt;
    if (d === 0) continue;
    p[axis] += d;
    hit = overlapsAt(body, p, body.h, colliders);
    if (hit) {
      // 尝试上台阶
      const rise = hit.max.y - p.y;
      if (body.grounded && rise > 0 && rise <= stepHeight) {
        const raised = p.clone(); raised.y = hit.max.y + 0.001;
        if (!overlapsAt(body, raised, body.h, colliders)) {
          p.y = raised.y;
          continue;
        }
      }
      // 推出
      if (d > 0) p[axis] = hit.min[axis === 'x' ? 'x' : 'z'] - body.w / 2 - 0.001;
      else p[axis] = hit.max[axis === 'x' ? 'x' : 'z'] + body.w / 2 + 0.001;
      v[axis] = 0;
    }
  }
}

// 射线 vs AABB（slab），返回 t 或 -1
export function rayAABB(o, d, box, maxT) {
  let tmin = 0, tmax = maxT;
  for (const ax of ['x', 'y', 'z']) {
    const inv = 1 / d[ax];
    let t0 = (box.min[ax] - o[ax]) * inv;
    let t1 = (box.max[ax] - o[ax]) * inv;
    if (inv < 0) { const t = t0; t0 = t1; t1 = t; }
    tmin = t0 > tmin ? t0 : tmin;
    tmax = t1 < tmax ? t1 : tmax;
    if (tmax < tmin) return -1;
  }
  return tmin;
}

export function raySphere(o, d, c, r, maxT) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  const disc = b * b - cc;
  if (disc < 0) return -1;
  const t = -b - Math.sqrt(disc);
  return (t >= 0 && t <= maxT) ? t : -1;
}

// 世界射线：返回最近命中 { t, point, normal, box } 或 null
const _n = new THREE.Vector3();
export function raycastWorld(o, d, maxDist, colliders) {
  let best = -1, bestBox = null;
  for (let i = 0; i < colliders.length; i++) {
    const t = rayAABB(o, d, colliders[i], maxDist);
    if (t >= 0 && (best < 0 || t < best)) { best = t; bestBox = colliders[i]; }
  }
  if (best < 0) return null;
  const point = new THREE.Vector3(o.x + d.x * best, o.y + d.y * best, o.z + d.z * best);
  // 近似法线：找点最靠近的面
  const eps = 0.02;
  _n.set(0, 1, 0);
  if (Math.abs(point.x - bestBox.min.x) < eps) _n.set(-1, 0, 0);
  else if (Math.abs(point.x - bestBox.max.x) < eps) _n.set(1, 0, 0);
  else if (Math.abs(point.z - bestBox.min.z) < eps) _n.set(0, 0, -1);
  else if (Math.abs(point.z - bestBox.max.z) < eps) _n.set(0, 0, 1);
  else if (Math.abs(point.y - bestBox.min.y) < eps) _n.set(0, -1, 0);
  return { t: best, point, normal: _n.clone(), box: bestBox };
}

// 视线检测：a → b 之间无遮挡返回 true
const _dir = new THREE.Vector3();
export function segmentClear(a, b, colliders) {
  _dir.subVectors(b, a);
  const dist = _dir.length();
  if (dist < 0.001) return true;
  _dir.multiplyScalar(1 / dist);
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (a.x > c.min.x && a.x < c.max.x && a.y > c.min.y && a.y < c.max.y && a.z > c.min.z && a.z < c.max.z) continue;
    const t = rayAABB(a, _dir, c, dist - 0.05);
    if (t >= 0) return false;
  }
  return true;
}

// 偏航/俯仰 → 方向向量（yaw=0 朝 -Z）
export function yawPitchDir(yaw, pitch, out) {
  const cp = Math.cos(pitch);
  out.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
  return out;
}

// 圆锥扩散
const _rx = new THREE.Vector3(), _ry = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
export function applySpread(dir, spread, out) {
  _rx.crossVectors(dir, _up).normalize();
  if (_rx.lengthSq() < 0.5) _rx.set(1, 0, 0);
  _ry.crossVectors(dir, _rx).normalize();
  const a = Math.random() * Math.PI * 2;
  const r = (Math.random() + Math.random()) * 0.5 * spread; // 近似高斯
  out.copy(dir)
    .addScaledVector(_rx, Math.cos(a) * r)
    .addScaledVector(_ry, Math.sin(a) * r)
    .normalize();
  return out;
}

// A* 寻路（节点: {pos, edges:[{to, cost}]}）
export function findPath(nodes, startIdx, goalIdx) {
  if (startIdx < 0 || goalIdx < 0 || startIdx >= nodes.length || goalIdx >= nodes.length) return null;
  const open = [startIdx];
  const came = new Map(), g = new Map([[startIdx, 0]]);
  const f = new Map([[startIdx, nodes[startIdx].pos.distanceTo(nodes[goalIdx].pos)]]);
  const inOpen = new Set([startIdx]);
  while (open.length) {
    let bi = 0, bf = Infinity;
    for (let i = 0; i < open.length; i++) {
      const fv = f.get(open[i]) ?? Infinity;
      if (fv < bf) { bf = fv; bi = i; }
    }
    const cur = open.splice(bi, 1)[0];
    inOpen.delete(cur);
    if (cur === goalIdx) {
      const path = [cur];
      let c = cur;
      while (came.has(c)) { c = came.get(c); path.unshift(c); }
      return path;
    }
    for (const e of nodes[cur].edges) {
      const ng = g.get(cur) + e.cost;
      if (ng < (g.get(e.to) ?? Infinity)) {
        came.set(e.to, cur); g.set(e.to, ng);
        f.set(e.to, ng + nodes[e.to].pos.distanceTo(nodes[goalIdx].pos));
        if (!inOpen.has(e.to)) { open.push(e.to); inOpen.add(e.to); }
      }
    }
  }
  return null;
}

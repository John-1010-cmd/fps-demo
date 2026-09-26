// ===== 武器系统：枪械 / 近战 / 投掷物 / 视模 =====
import * as THREE from 'three';
import { WEAPONS, MELEE, THROWABLES, MELEE_ORDER, CONFIG } from './config.js';
import { applySpread, rand, clamp } from './utils.js';

const _dir = new THREE.Vector3(), _sdir = new THREE.Vector3();

export class Weapon {
  constructor(id) {
    this.def = WEAPONS[id];
    this.id = id;
    this.ammo = this.def.mag;
    this.reserve = this.def.reserve;
    this.cooldown = 0;
    this.reloading = 0;
    this.bloom = 0;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.bloom = Math.max(0, this.bloom - this.def.bloomRecover * dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = this.def.mag - this.ammo;
        const take = Math.min(need, this.reserve);
        this.ammo += take; this.reserve -= take;
        this.reloading = 0;
        return 'reloadDone';
      }
    }
    return null;
  }

  startReload(game, shooter) {
    if (this.reloading > 0 || this.ammo >= this.def.mag || this.reserve <= 0) return false;
    this.reloading = this.def.reloadTime;
    if (game) game.onReloadStart(shooter, this);
    return true;
  }

  currentSpread(shooter) {
    const d = this.def;
    let s = (shooter.ads ? d.spreadAds : d.spreadHip) + this.bloom;
    s += clamp(shooter.speed2D / 6, 0, 1) * (shooter.ads ? 0.006 : 0.014);
    if (!shooter.grounded) s += 0.03;
    if (shooter.crouching) s *= 0.75;
    return s;
  }

  tryFire(game, shooter) {
    const d = this.def;
    if (this.cooldown > 0 || this.reloading > 0 || shooter.switchTimer > 0 || !shooter.alive) return false;
    if (this.ammo <= 0) {
      if (shooter.isPlayer) game.audio.dryFire();
      this.startReload(game, shooter);
      return false;
    }
    this.ammo--;
    this.cooldown = 60 / d.rpm;
    this.bloom = Math.min(this.bloom + d.bloomPerShot, d.bloomMax);

    shooter.getAimDir(_dir);
    const origin = shooter.getAimOrigin();
    shooter.applyRecoil(d.recoil, rand(-d.recoilSide, d.recoilSide));

    const pellets = d.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      applySpread(_dir, this.currentSpread(shooter), _sdir);
      game.executeShot(shooter, this, origin, _sdir, i === 0);
    }
    if (this.ammo === 0) this.startReload(game, shooter);
    return true;
  }
}

// ---------- 近战武器 ----------
export class MeleeWeapon {
  constructor() {
    this.variant = 'knife';
    this.cooldown = 0;
    this.swingT = 0;
    this.shurikens = MELEE.shuriken.count;
    this.reloading = 0;
  }
  get def() {
    const m = MELEE[this.variant];
    return {
      id: 'melee', name: m.name, short: m.short, auto: true,
      scoped: false, zoomFov: CONFIG.baseFov, switchTime: 0.28,
      moveMult: 1.08, reloadTime: 0,
    };
  }
  get bloom() { return 0; }
  currentSpread() { return 0; }
  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.swingT = Math.max(0, this.swingT - dt);
  }
  reset() {
    this.variant = 'knife';
    this.cooldown = 0; this.swingT = 0;
    this.shurikens = MELEE.shuriken.count;
  }
  cycle() {
    const i = MELEE_ORDER.indexOf(this.variant);
    this.variant = MELEE_ORDER[(i + 1) % MELEE_ORDER.length];
    return this.variant;
  }
  tryFire(game, shooter) {
    if (this.cooldown > 0 || shooter.switchTimer > 0 || !shooter.alive) return false;
    const m = MELEE[this.variant];
    if (this.variant === 'shuriken') {
      if (this.shurikens <= 0) { this.variant = 'knife'; return false; }
      this.shurikens--;
      game.throwShuriken(shooter, m);
    } else {
      game.meleeAttack(shooter, m);
    }
    this.cooldown = 1 / m.rate;
    this.swingT = m.swing;
    return true;
  }
}

// ---------- 视模皮肤 ----------
function texCanvas(draw, w = 256, h = 256) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const texWoodFine = texCanvas((g, w, h) => {
  g.fillStyle = '#7a5230'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `rgba(${rand(50, 90)},${rand(30, 55)},${rand(15, 30)},${rand(0.25, 0.6)})`;
    g.lineWidth = rand(1, 3);
    g.beginPath();
    const y = rand(0, h);
    g.moveTo(0, y);
    g.bezierCurveTo(w * 0.3, y + rand(-6, 6), w * 0.7, y + rand(-6, 6), w, y + rand(-4, 4));
    g.stroke();
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = 'rgba(40,22,10,0.5)';
    g.beginPath(); g.ellipse(rand(0, w), rand(0, h), rand(3, 8), rand(2, 4), rand(0, 3), 0, 7); g.fill();
  }
});
const texGunmetal = texCanvas((g, w, h) => {
  g.fillStyle = '#33373d'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 200; i++) {
    g.fillStyle = `rgba(${rand(50, 90)},${rand(55, 95)},${rand(60, 100)},${rand(0.05, 0.2)})`;
    g.fillRect(rand(0, w), rand(0, h), rand(4, 40), 1);
  }
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 2);
});

export function buildViewModel(id) {
  const g = new THREE.Group();
  const metal = new THREE.MeshPhongMaterial({ map: texGunmetal, shininess: 70 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x23262b, shininess: 35 });
  const wood = new THREE.MeshPhongMaterial({ map: texWoodFine, shininess: 18 });
  const steel = new THREE.MeshPhongMaterial({ color: 0xb8bec6, shininess: 120 });
  const olive = new THREE.MeshPhongMaterial({ color: 0x4a5238, shininess: 25 });
  const glove = new THREE.MeshPhongMaterial({ color: 0x3d4038, shininess: 10 });
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const cyl = new THREE.CylinderGeometry(1, 1, 1, 12);
  const add = (mat, x, y, z, w, h, d, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(w, h, d);
    if (rx) m.rotation.x = rx;
    g.add(m); return m;
  };
  const addCyl = (mat, x, y, z, r, len, alongZ = true) => {
    const m = new THREE.Mesh(cyl, mat);
    m.position.set(x, y, z); m.scale.set(r, len, r);
    if (alongZ) m.rotation.x = Math.PI / 2;
    g.add(m); return m;
  };
  // 双手（手套）
  const hands = (hx1, hy1, hz1, hx2, hy2, hz2) => {
    add(glove, hx1, hy1, hz1, 0.075, 0.07, 0.1);
    add(glove, hx2, hy2, hz2, 0.075, 0.07, 0.1);
  };
  const muzzle = new THREE.Object3D();

  switch (id) {
    case 'rifle':
      add(metal, 0, 0, -0.1, 0.075, 0.11, 0.55);
      add(wood, 0, -0.01, -0.42, 0.072, 0.092, 0.22);
      addCyl(metal, 0, 0.015, -0.62, 0.015, 0.3);
      addCyl(dark, 0, 0.015, -0.76, 0.022, 0.05);
      add(wood, 0, -0.03, 0.26, 0.07, 0.13, 0.24);
      add(wood, 0, -0.1, 0.08, 0.05, 0.12, 0.07);
      add(metal, 0, -0.13, -0.12, 0.05, 0.18, 0.09, 0.35);
      add(dark, 0, 0.075, -0.5, 0.014, 0.05, 0.014);
      add(dark, 0, 0.068, 0.05, 0.03, 0.035, 0.05);
      add(metal, 0, 0.045, -0.32, 0.05, 0.03, 0.12);  // 导气箍
      hands(0.02, -0.1, 0.06, -0.01, -0.06, -0.4);
      muzzle.position.set(0, 0.015, -0.79);
      break;
    case 'shotgun':
      add(metal, 0, 0, -0.05, 0.07, 0.1, 0.5);
      addCyl(metal, 0, 0.02, -0.55, 0.017, 0.42);
      addCyl(dark, 0, -0.035, -0.5, 0.016, 0.36);     // 管式弹仓
      add(wood, 0, -0.035, -0.42, 0.06, 0.07, 0.14);  // 护木泵
      add(wood, 0, -0.04, 0.26, 0.07, 0.13, 0.22);
      add(wood, 0, -0.1, 0.1, 0.05, 0.11, 0.06);
      add(dark, 0, 0.06, -0.72, 0.014, 0.04, 0.014);
      add(metal, 0, 0.058, -0.05, 0.02, 0.012, 0.3);  // 肋条
      hands(0.02, -0.1, 0.08, -0.01, -0.04, -0.42);
      muzzle.position.set(0, 0.02, -0.78);
      break;
    case 'sniper':
      add(olive, 0, 0, -0.05, 0.062, 0.1, 0.7);
      addCyl(metal, 0, 0.01, -0.68, 0.014, 0.55);
      addCyl(dark, 0, 0.01, -0.94, 0.02, 0.05);       // 制退器
      add(olive, 0, -0.04, 0.34, 0.066, 0.13, 0.3);
      addCyl(dark, 0, 0.1, -0.1, 0.03, 0.22);         // 瞄准镜
      addCyl(dark, 0, 0.1, -0.22, 0.036, 0.03);
      addCyl(dark, 0, 0.1, 0.02, 0.036, 0.03);
      add(dark, 0, 0.055, -0.1, 0.014, 0.05, 0.014);
      add(metal, 0.055, -0.02, 0.02, 0.05, 0.018, 0.018);
      add(olive, 0, -0.09, 0.36, 0.05, 0.06, 0.1);    // 托腮板
      hands(0.02, -0.1, 0.1, -0.01, -0.05, -0.3);
      muzzle.position.set(0, 0.01, -0.97);
      break;
    case 'pistol':
      add(steel, 0, 0.02, -0.06, 0.045, 0.055, 0.24);
      add(dark, 0, -0.02, -0.02, 0.042, 0.05, 0.18);
      add(dark, 0, -0.08, 0.05, 0.04, 0.14, 0.06);
      add(dark, 0, 0.062, -0.15, 0.012, 0.028, 0.012);
      add(dark, 0, 0.06, 0.04, 0.012, 0.024, 0.02);
      add(steel, 0.026, 0.01, 0.02, 0.008, 0.03, 0.03); // 击锤
      hands(0, -0.12, 0.05, 0, -0.12, 0.05);
      muzzle.position.set(0, 0.02, -0.19);
      break;
    case 'knife':
      add(dark, 0, -0.02, 0.05, 0.035, 0.05, 0.14);   // 柄
      add(steel, 0, 0.01, -0.16, 0.012, 0.045, 0.3);  // 刃
      add(steel, 0, 0.028, -0.3, 0.01, 0.02, 0.06);   // 刀尖
      add(dark, 0, -0.005, -0.02, 0.045, 0.06, 0.02); // 护手
      hands(0, -0.02, 0.05, 0, -0.02, 0.05);
      muzzle.position.set(0, 0, -0.3);
      break;
    case 'axe':
      add(wood, 0, -0.05, -0.02, 0.035, 0.05, 0.5);   // 木柄
      add(steel, 0, 0.03, -0.26, 0.02, 0.12, 0.09);   // 斧头
      add(steel, 0, 0.03, -0.3, 0.014, 0.16, 0.04);   // 斧刃
      hands(0, -0.06, 0.08, 0, -0.05, -0.08);
      muzzle.position.set(0, 0, -0.3);
      break;
    case 'shovel':
      add(wood, 0, -0.04, 0, 0.032, 0.045, 0.46);
      add(steel, 0, -0.01, -0.28, 0.1, 0.02, 0.14);   // 铲头
      add(steel, 0, -0.01, -0.36, 0.06, 0.018, 0.05);
      hands(0, -0.05, 0.1, 0, -0.04, -0.05);
      muzzle.position.set(0, 0, -0.35);
      break;
    case 'shuriken': {
      const star = new THREE.Group();
      const m1 = new THREE.Mesh(geo, dark); m1.scale.set(0.16, 0.008, 0.03);
      const m2 = new THREE.Mesh(geo, dark); m2.scale.set(0.03, 0.008, 0.16);
      const m3 = new THREE.Mesh(geo, steel); m3.scale.set(0.1, 0.006, 0.02); m3.rotation.y = Math.PI / 4;
      const m4 = new THREE.Mesh(geo, steel); m4.scale.set(0.02, 0.006, 0.1); m4.rotation.y = Math.PI / 4;
      star.add(m1, m2, m3, m4);
      star.position.set(0, 0, -0.15);
      g.add(star);
      g.userData.spin = star;
      hands(0, -0.05, -0.05, 0, -0.05, -0.05);
      muzzle.position.set(0, 0, -0.2);
      break;
    }
  }
  g.add(muzzle);
  g.traverse((m) => { m.frustumCulled = false; if (m.isMesh) m.renderOrder = 10; });
  return { group: g, muzzle };
}

// ---------- 投掷物（手雷/烟雾弹/闪光弹） ----------
export class Throwable {
  constructor(pos, vel, thrower, game, type = 'frag') {
    this.type = type;
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.thrower = thrower;
    this.game = game;
    this.fuse = game.cfg.grenade.fuse;
    this.r = game.cfg.grenade.radiusPhys;
    const def = THROWABLES[type];
    this.mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.13, 10),
      new THREE.MeshPhongMaterial({ color: def.color, shininess: 50 })
    );
    this.mesh.position.copy(pos);
    game.scene.add(this.mesh);
  }

  update(dt) {
    const cfg = this.game.cfg.grenade;
    this.fuse -= dt;
    if (this.fuse <= 0) { this.game.detonate(this); return false; }

    this.vel.y -= cfg.gravity * dt;
    const colliders = this.game.world.colliders;
    for (const ax of ['x', 'y', 'z']) {
      this.pos[ax] += this.vel[ax] * dt;
      for (const c of colliders) {
        if (this.pos.x + this.r > c.min.x && this.pos.x - this.r < c.max.x &&
            this.pos.y + this.r > c.min.y && this.pos.y - this.r < c.max.y &&
            this.pos.z + this.r > c.min.z && this.pos.z - this.r < c.max.z) {
          if (ax === 'y') {
            if (this.vel.y < 0) {
              this.pos.y = c.max.y + this.r;
              if (Math.abs(this.vel.y) > 2) this.game.onNadeBounce(this.pos);
              this.vel.y = -this.vel.y * cfg.bounce;
              this.vel.x *= 0.75; this.vel.z *= 0.75;
            } else { this.pos.y = c.min.y - this.r; this.vel.y = -this.vel.y * cfg.bounce; }
          } else {
            const sign = this.vel[ax] > 0 ? 1 : -1;
            this.pos[ax] = (sign > 0 ? c.min[ax] - this.r : c.max[ax] + this.r);
            if (Math.abs(this.vel[ax]) > 2) this.game.onNadeBounce(this.pos);
            this.vel[ax] = -this.vel[ax] * cfg.bounce;
          }
          break;
        }
      }
    }
    if (this.pos.y < -2.5) return false; // 落水
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.x += dt * 6; this.mesh.rotation.z += dt * 4;
    return true;
  }

  dispose() { this.game.scene.remove(this.mesh); }
}

// ---------- 手里剑 ----------
const _sv = new THREE.Vector3();
export class Shuriken {
  constructor(pos, dir, thrower, game, def) {
    this.pos = pos.clone();
    this.vel = dir.clone().multiplyScalar(def.speed);
    this.thrower = thrower;
    this.game = game;
    this.def = def;
    this.stuck = 0;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshPhongMaterial({ color: 0x2a2d33, shininess: 80 });
    this.mesh = new THREE.Group();
    const a = new THREE.Mesh(geo, mat); a.scale.set(0.17, 0.008, 0.035);
    const b = new THREE.Mesh(geo, mat); b.scale.set(0.035, 0.008, 0.17);
    this.mesh.add(a, b);
    this.mesh.position.copy(pos);
    game.scene.add(this.mesh);
    this.spin = 0;
  }

  update(dt) {
    if (this.stuck > 0) {
      this.stuck -= dt;
      return this.stuck > 0;
    }
    this.vel.y -= 4.5 * dt;
    const step = _sv.copy(this.vel).multiplyScalar(dt);
    const len = step.length();
    // 世界命中
    const hit = len > 0 && this.game.raycast(this.pos, _sv.normalize(), len);
    // 敌人命中
    for (const s of this.game.soldiers) {
      if (!s.alive || s.team === this.thrower.team) continue;
      const dx = s.pos.x - this.pos.x, dz = s.pos.z - this.pos.z;
      if (dx * dx + dz * dz > 0.45) continue;
      const relY = this.pos.y - s.pos.y;
      if (relY < -0.1 || relY > s.height + 0.15) continue;
      const head = relY > s.height - 0.45;
      s.takeDamage(head ? this.def.damage * 1.8 : this.def.damage, this.thrower, head ? 'head' : 'body', this.pos, 'shuriken');
      this.game.onShurikenHit(this.pos, true);
      return false;
    }
    if (hit) {
      this.pos.copy(hit.point).addScaledVector(hit.normal, 0.02);
      this.mesh.position.copy(this.pos);
      this.game.onShurikenHit(this.pos, false);
      this.stuck = 3;
      return true;
    }
    this.pos.addScaledVector(this.vel, dt);
    if (this.pos.y < -2.5) return false;
    this.spin += dt * 22;
    this.mesh.rotation.y = this.spin;
    this.mesh.position.copy(this.pos);
    return true;
  }

  dispose() { this.game.scene.remove(this.mesh); }
}

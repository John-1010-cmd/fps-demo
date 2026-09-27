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

// 拉丝冷钢（刀身/手里剑/刃口金属拉丝与高光）
const texBrushedSteel = texCanvas((g, w, h) => {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#c2c9d2');
  grad.addColorStop(0.5, '#e6edf4');
  grad.addColorStop(1, '#b4bec8');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 350; i++) {
    const alpha = rand(0.05, 0.22);
    g.fillStyle = Math.random() > 0.45 ? `rgba(255,255,255,${alpha})` : `rgba(35,45,55,${alpha})`;
    g.fillRect(rand(0, w), rand(0, h), rand(25, w), 1);
  }
  const hi = g.createLinearGradient(0, 0, w, 0);
  hi.addColorStop(0, 'rgba(255,255,255,0)');
  hi.addColorStop(0.48, 'rgba(255,255,255,0.22)');
  hi.addColorStop(0.52, 'rgba(255,255,255,0.3)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hi;
  g.fillRect(0, 0, w, h);
});

// 战术防滑握柄（深黑橡胶菱格纹）
const texGripRubber = texCanvas((g, w, h) => {
  g.fillStyle = '#1c1e22';
  g.fillRect(0, 0, w, h);
  g.lineWidth = 1.6;
  const step = 16;
  for (let x = -w; x < w * 2; x += step) {
    g.strokeStyle = 'rgba(0,0,0,0.5)';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x + h, h); g.stroke();
    g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.09)';
    g.beginPath(); g.moveTo(x + 1, 0); g.lineTo(x + h + 1, h); g.stroke();
  }
  for (let i = 0; i < 240; i++) {
    const v = rand(25, 55);
    g.fillStyle = `rgba(${v},${v},${v},${rand(0.12, 0.3)})`;
    g.fillRect(rand(0, w), rand(0, h), 2, 2);
  }
});

// 战术黑涂层（斧头/工兵铲黑钢耐磨面）
const texTacticalCoating = texCanvas((g, w, h) => {
  g.fillStyle = '#26292e';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 300; i++) {
    const v = rand(45, 80);
    g.fillStyle = `rgba(${v},${v + 2},${v + 4},${rand(0.06, 0.2)})`;
    g.fillRect(rand(0, w), rand(0, h), rand(3, 16), rand(1, 3));
  }
  for (let y = 0; y < h; y += 28) {
    g.fillStyle = 'rgba(12,14,18,0.35)';
    g.fillRect(0, y, w, 2);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(0, y + 2, w, 1);
  }
});

export function buildViewModel(id) {
  const g = new THREE.Group();
  const metal = new THREE.MeshPhongMaterial({ map: texGunmetal, shininess: 70 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x23262b, shininess: 35 });
  const wood = new THREE.MeshPhongMaterial({ map: texWoodFine, shininess: 18 });
  const steel = new THREE.MeshPhongMaterial({ color: 0xb8bec6, shininess: 120 });
  const olive = new THREE.MeshPhongMaterial({ color: 0x4a5238, shininess: 25 });
  const glove = new THREE.MeshPhongMaterial({ color: 0x3d4038, shininess: 10 });
  const brushedSteel = new THREE.MeshPhongMaterial({ map: texBrushedSteel, shininess: 140, specular: 0x8fa0b2 });
  const tacticalSteel = new THREE.MeshPhongMaterial({ map: texTacticalCoating, shininess: 80, specular: 0x47515a });
  const grip = new THREE.MeshPhongMaterial({ map: texGripRubber, shininess: 28 });
  const bladeEdge = new THREE.MeshPhongMaterial({ color: 0xdee7f0, shininess: 160, specular: 0xffffff });
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
    add(glove, hx1, hy1, hz1, 0.075, 0.07, 0.1).userData.viewHand = true;
    add(glove, hx2, hy2, hz2, 0.075, 0.07, 0.1).userData.viewHand = true;
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
      // CF 军用匕首风格：前窄后宽拉丝钢刀身 + 黑色防滑柄 + 独立战术护手片 + 尾部配重盖
      add(grip, 0, -0.02, 0.055, 0.034, 0.048, 0.13);            // 黑色防滑柄
      add(dark, 0, -0.02, 0.035, 0.036, 0.05, 0.012);            // 防滑环圈
      add(tacticalSteel, 0, -0.02, 0.125, 0.038, 0.052, 0.016);  // 柄尾钢配重盖
      add(tacticalSteel, 0, -0.01, -0.018, 0.048, 0.072, 0.016); // 独立护手片
      add(dark, 0, -0.032, -0.018, 0.036, 0.024, 0.018);         // 下护手止动卡突
      add(brushedSteel, 0, 0.006, -0.11, 0.014, 0.048, 0.17);    // 刀身后段(宽)
      add(brushedSteel, 0, 0.012, -0.23, 0.011, 0.038, 0.11);    // 刀身前段(窄)
      add(dark, 0, 0.026, -0.13, 0.013, 0.01, 0.21);             // 刀背战术脊骨
      add(brushedSteel, 0, 0.024, -0.295, 0.009, 0.022, 0.05, 0.15); // 斜切刀尖
      add(bladeEdge, 0, -0.012, -0.18, 0.007, 0.012, 0.28);      // 银白高光开刃口
      hands(0, -0.02, 0.05, 0, -0.02, 0.05);
      muzzle.position.set(0, 0, -0.3);
      break;
    case 'axe':
      // CF 军用手斧风格：深色战术斧刃(楔形厚实) + 银白宽弧刃口 + 木质手柄加防滑套
      add(wood, 0, -0.05, -0.02, 0.032, 0.048, 0.5);             // 木柄主干
      add(grip, 0, -0.05, 0.08, 0.036, 0.052, 0.12);             // 后握把防滑胶套
      add(grip, 0, -0.05, -0.08, 0.036, 0.052, 0.11);            // 前握把防滑胶套
      add(tacticalSteel, 0, -0.05, 0.235, 0.036, 0.052, 0.018);   // 斧柄尾部钢盖
      add(tacticalSteel, 0, -0.035, -0.24, 0.04, 0.065, 0.08);    // 斧颈加固钢套
      add(tacticalSteel, 0, 0.035, -0.25, 0.024, 0.11, 0.09);     // 战术斧身中段(楔形主基座)
      add(tacticalSteel, 0, 0.052, -0.19, 0.022, 0.055, 0.04);    // 斧背破障重锤角
      add(tacticalSteel, 0, 0.072, -0.18, 0.016, 0.025, 0.025);   // 斧背破障尖角
      add(tacticalSteel, 0, 0.035, -0.295, 0.016, 0.14, 0.05);    // 楔形前倾斧板
      add(bladeEdge, 0, 0.035, -0.325, 0.008, 0.175, 0.028);      // 银白月牙主刃缘
      add(bladeEdge, 0, 0.105, -0.315, 0.007, 0.04, 0.02);       // 斧刃上飞角
      add(bladeEdge, 0, -0.035, -0.315, 0.007, 0.04, 0.02);      // 斧刃下挑角
      add(dark, 0, 0.035, -0.26, 0.026, 0.045, 0.03);            // 斧侧战术减重凹槽
      hands(0, -0.06, 0.08, 0, -0.05, -0.08);
      muzzle.position.set(0, 0, -0.3);
      break;
    case 'shovel':
      // CF 军用铁铲风格：木柄 + 尾端D形握把 + 战术钢制宽扁铲头(顶部踏肩与中脊) + 侧前刃口
      add(wood, 0, -0.04, 0.02, 0.03, 0.036, 0.42);              // 木柄主干
      add(tacticalSteel, -0.028, -0.04, 0.25, 0.012, 0.03, 0.06); // D把左侧支臂
      add(tacticalSteel, 0.028, -0.04, 0.25, 0.012, 0.03, 0.06);  // D把右侧支臂
      add(wood, 0, -0.04, 0.275, 0.066, 0.026, 0.022);           // D形横握木
      add(tacticalSteel, 0, -0.04, 0.288, 0.072, 0.03, 0.01);     // D把尾部护钢
      add(tacticalSteel, 0, -0.032, -0.195, 0.036, 0.042, 0.07);  // 铲颈加固钢套
      add(dark, 0, -0.032, -0.22, 0.04, 0.046, 0.015);           // 铲颈紧固箍环
      add(tacticalSteel, 0, 0.002, -0.25, 0.136, 0.02, 0.025);    // 顶部双侧冲压踏肩
      add(tacticalSteel, 0, -0.01, -0.305, 0.128, 0.012, 0.11);   // 宽扁主铲板
      add(brushedSteel, 0, 0.001, -0.305, 0.024, 0.016, 0.10);   // 铲面中脊冲压加强棱
      add(tacticalSteel, 0, -0.01, -0.375, 0.098, 0.011, 0.06);   // 铲板梯形前段
      add(bladeEdge, 0, -0.01, -0.41, 0.086, 0.007, 0.016);      // 铲头前端利刃
      add(bladeEdge, -0.062, -0.01, -0.315, 0.006, 0.008, 0.09); // 左侧劈砍刃
      add(bladeEdge, 0.062, -0.01, -0.315, 0.006, 0.008, 0.09);  // 右侧劈砍刃
      hands(0, -0.05, 0.1, 0, -0.04, -0.05);
      muzzle.position.set(0, 0, -0.35);
      break;
    case 'shuriken': {
      // 八芒星飞镖视模：主十字刃 + 45°斜向刃组 + 中心圆柱轮毂 + 拉丝钢材质
      const star = new THREE.Group();
      // 正十字主刃组（拉丝钢）
      const b1 = new THREE.Mesh(geo, brushedSteel); b1.scale.set(0.165, 0.007, 0.032);
      const b2 = new THREE.Mesh(geo, brushedSteel); b2.scale.set(0.032, 0.007, 0.165);
      // 正十字开刃锋尖
      const e1 = new THREE.Mesh(geo, bladeEdge); e1.scale.set(0.176, 0.005, 0.016);
      const e2 = new THREE.Mesh(geo, bladeEdge); e2.scale.set(0.016, 0.005, 0.176);
      // 45° 斜向第二组刃（形成八芒星视感）
      const d1 = new THREE.Mesh(geo, brushedSteel); d1.scale.set(0.155, 0.007, 0.03); d1.rotation.y = Math.PI / 4;
      const d2 = new THREE.Mesh(geo, brushedSteel); d2.scale.set(0.03, 0.007, 0.155); d2.rotation.y = Math.PI / 4;
      // 45° 斜向开刃锋尖
      const de1 = new THREE.Mesh(geo, bladeEdge); de1.scale.set(0.164, 0.005, 0.014); de1.rotation.y = Math.PI / 4;
      const de2 = new THREE.Mesh(geo, bladeEdge); de2.scale.set(0.014, 0.005, 0.164); de2.rotation.y = Math.PI / 4;
      // 中心圆形轮毂（圆柱体）
      const hubOuter = new THREE.Mesh(cyl, tacticalSteel); hubOuter.scale.set(0.028, 0.012, 0.028);
      const hubInner = new THREE.Mesh(cyl, dark); hubInner.scale.set(0.014, 0.014, 0.014);
      star.add(b1, b2, e1, e2, d1, d2, de1, de2, hubOuter, hubInner);
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

export class DroppedWeapon {
  constructor(scene, colliders, source, origin, yaw, bodyVelocity) {
    this.scene = scene;
    this.colliders = colliders;
    this.age = 0;
    this.restY = null;
    this.velocity = new THREE.Vector3(
      -Math.sin(yaw) * 1.8 + bodyVelocity.x * 0.2,
      2.9 + Math.max(0, bodyVelocity.y * 0.25),
      -Math.cos(yaw) * 1.8 + bodyVelocity.z * 0.2
    );
    this.spin = new THREE.Vector3(3.4, 2.6, 5.2);
    this.mesh = new THREE.Group();
    const model = new THREE.Group();
    model.scale.copy(source.scale);
    for (const part of source.children) model.add(part.clone(true));
    const hands = [];
    model.traverse((part) => {
      if (part.userData.viewHand) hands.push(part);
      else if (part.isMesh) {
        part.renderOrder = 0;
        part.frustumCulled = true;
        part.castShadow = true;
      }
    });
    for (const hand of hands) hand.parent.remove(hand);
    model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
    this.mesh.add(model);
    this.mesh.position.copy(origin);
    this.mesh.rotation.order = 'YXZ';
    this.mesh.rotation.y = yaw;
    scene.add(this.mesh);
  }

  update(dt) {
    this.age += dt;
    if (this.age >= 6) return false;
    if (this.restY !== null) {
      this.mesh.rotation.x = this.mesh.rotation.x + (0 - this.mesh.rotation.x) * Math.min(dt * 10, 1);
      this.mesh.rotation.z = this.mesh.rotation.z + (Math.PI / 2 - this.mesh.rotation.z) * Math.min(dt * 10, 1);
      return true;
    }

    const bottom = this.mesh.position.y - 0.11;
    this.velocity.y -= CONFIG.player.gravity * dt;
    this.mesh.position.addScaledVector(this.velocity, dt);
    this.mesh.rotation.x += this.spin.x * dt;
    this.mesh.rotation.y += this.spin.y * dt;
    this.mesh.rotation.z += this.spin.z * dt;

    if (this.velocity.y < 0) {
      let support = -Infinity;
      const p = this.mesh.position;
      for (const c of this.colliders) {
        if (c.max.y > bottom + 0.015 || c.max.y < p.y - 0.11) continue;
        if (p.x < c.min.x - 0.06 || p.x > c.max.x + 0.06 ||
            p.z < c.min.z - 0.06 || p.z > c.max.z + 0.06) continue;
        support = Math.max(support, c.max.y);
      }
      if (support !== -Infinity) {
        p.y = support + 0.11;
        this.velocity.x *= 0.4;
        this.velocity.z *= 0.4;
        if (this.velocity.y < -1) {
          this.velocity.y *= -0.22;
          this.spin.multiplyScalar(0.35);
        } else {
          this.velocity.set(0, 0, 0);
          this.spin.set(0, 0, 0);
          this.restY = support;
        }
      }
    }
    return this.mesh.position.y > -8;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.clear();
  }
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
    if (this.pos.y < -3.9) return false; // 落水（水面 -4.2，地道内可用）
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
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);
    const mat = new THREE.MeshPhongMaterial({ map: texBrushedSteel, shininess: 120 });
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x23262b, shininess: 40 });
    this.mesh = new THREE.Group();
    const a = new THREE.Mesh(geo, mat); a.scale.set(0.17, 0.008, 0.035);
    const b = new THREE.Mesh(geo, mat); b.scale.set(0.035, 0.008, 0.17);
    const c = new THREE.Mesh(geo, mat); c.scale.set(0.155, 0.007, 0.03); c.rotation.y = Math.PI / 4;
    const d = new THREE.Mesh(geo, mat); d.scale.set(0.03, 0.007, 0.155); d.rotation.y = Math.PI / 4;
    const hub = new THREE.Mesh(cylGeo, darkMat); hub.scale.set(0.026, 0.012, 0.026);
    this.mesh.add(a, b, c, d, hub);
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
    if (this.pos.y < -3.9) return false; // 落水（水面 -4.2，地道内可用）
    this.spin += dt * 22;
    this.mesh.rotation.y = this.spin;
    this.mesh.position.copy(this.pos);
    return true;
  }

  dispose() { this.game.scene.remove(this.mesh); }
}

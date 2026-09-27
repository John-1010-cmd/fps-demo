// ===== 士兵基类 / 玩家控制器 / AI 机器人 =====
import * as THREE from 'three';
import { CONFIG, WEAPONS, GUN_ORDER, MELEE, MELEE_ORDER, THROWABLES, THROW_ORDER, DIFFICULTY, TEAM } from './config.js';
import { Body, moveBody, yawPitchDir, segmentClear, clamp, lerp, damp, rand, pick, findPath } from './utils.js';
import { Weapon, MeleeWeapon, buildViewModel } from './weapons.js';

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();

// ---------- 人形模型 ----------
// 双方阵营使用差异化模型（设计稿：assets/concepts/ 保卫者=SWAT 制式装具 / 潜伏者=沙漠民兵）
// builder 已拆到 js/soldier_models/（共享工具 common.js），返回接口 { group, legL, legR, arms, head, weapon, gunTip }
import { buildSwatMesh } from './soldier_models/swat.js';
import { buildMilitiaMesh } from './soldier_models/militia.js';

function buildSoldierMesh(teamKey) {
  const T = TEAM[teamKey];
  return teamKey === 'A' ? buildSwatMesh(T) : buildMilitiaMesh(T);
}

function makeNameTag(name, cssColor) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const g2 = c.getContext('2d');
  g2.font = 'bold 34px Microsoft YaHei, Arial';
  g2.textAlign = 'center';
  g2.shadowColor = '#000'; g2.shadowBlur = 6;
  g2.fillStyle = cssColor;
  g2.fillText(name, 128, 42);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }));
  s.scale.set(1.05, 0.26, 1);
  s.position.y = 1.28;   // 胸前，与身体重叠显示
  return s;
}

// ---------- 士兵基类 ----------
export class Soldier {
  constructor(game, team, name, isPlayer = false) {
    this.game = game;
    this.team = team;
    this.name = name;
    this.isPlayer = isPlayer;
    const P = CONFIG.player;
    this.body = new Body(0, 0, 0, P.radius * 2, P.height);
    this.yaw = 0; this.pitch = 0;
    this.hp = P.hp; this.maxHp = P.hp;
    this.alive = false;
    this.crouching = false;
    this.ads = 0;             // 0~1 开镜插值
    this.adsHeld = false;
    this.weapons = { rifle: new Weapon('rifle'), shotgun: new Weapon('shotgun'), pistol: new Weapon('pistol'), sniper: new Weapon('sniper') };
    this.meleeWeapon = new MeleeWeapon();
    this.currentWeaponId = 'rifle';
    this.switchTimer = 0;
    this.throwables = { frag: CONFIG.grenade.count, smoke: THROWABLES.smoke.count, flash: THROWABLES.flash.count };
    this.throwableSel = 'frag';
    this.blindUntil = 0;
    this.grenades = CONFIG.grenade.count;
    this.kills = 0; this.deaths = 0; this.assists = 0;
    this.damagedBy = new Map();
    this.lastDamageAt = -99;
    this.lastShotAt = -99;
    this.spawnProtectUntil = 0;
    this.speed2D = 0;
    this.walkPhase = 0;
    this.deadTimer = 0;
    this.mesh = null;
  }

  get weapon() { return this.currentWeaponId === 'melee' ? this.meleeWeapon : this.weapons[this.currentWeaponId]; }
  get pos() { return this.body.pos; }
  get grounded() { return this.body.grounded; }
  get height() { return this.crouching ? CONFIG.player.crouchHeight : CONFIG.player.height; }
  get eyeHeight() { return this.height * CONFIG.player.eyeRatio; }

  getAimOrigin() {
    return _v1.set(this.pos.x, this.pos.y + this.eyeHeight, this.pos.z);
  }
  getAimDir(out) { return yawPitchDir(this.yaw, this.pitch, out); }

  getMuzzleWorld(out) {
    // 机器人：取模型枪口实际位置；玩家由视模枪口覆盖
    if (this.mesh && this.mesh.gunTip) {
      return this.mesh.gunTip.getWorldPosition(out);
    }
    this.getAimDir(out);
    return out.multiplyScalar(0.85)
      .add(_v2.set(this.pos.x, this.pos.y + this.eyeHeight - 0.18, this.pos.z));
  }

  applyRecoil(up, side) {
    this.pitch = clamp(this.pitch + up, -1.5, 1.5);
    this.yaw += side;
  }

  switchWeapon(id) {
    if (id === this.currentWeaponId || this.switchTimer > 0) return false;
    if (id !== 'melee' && !this.weapons[id]) return false;
    this.weapon.reloading = 0;
    this.currentWeaponId = id;
    this.switchTimer = this.weapon.def.switchTime;
    if (this.isPlayer) this.game.audio.uiClick();
    return true;
  }

  switchSlot(slot) {
    // 1-4 枪械, 5 近战(连按轮换), 6 投掷物(连按轮换, 不切枪)
    if (slot === 6) {
      const i = THROW_ORDER.indexOf(this.throwableSel);
      this.throwableSel = THROW_ORDER[(i + 1) % THROW_ORDER.length];
      if (this.isPlayer) this.game.audio.uiClick();
      return;
    }
    if (slot === 5) {
      if (this.currentWeaponId === 'melee' && this.switchTimer <= 0) {
        this.meleeWeapon.cycle();
        if (this.isPlayer) this.game.audio.uiClick();
        return;
      }
      this.switchWeapon('melee');
      return;
    }
    const id = GUN_ORDER[slot - 1];
    if (id) this.switchWeapon(id);
  }

  takeDamage(dmg, attacker, part, hitPoint, weaponId) {
    if (!this.alive || this.game.time < this.spawnProtectUntil) return false;
    const prevHp = this.hp;
    this.hp -= dmg;
    if (attacker && attacker.isPlayer && attacker !== this && attacker.team !== this.team) {
      this.game.trackDamage(this, Math.min(dmg, prevHp));
    }
    if (attacker && attacker !== this && attacker.team !== this.team) {
      this.damagedBy.set(attacker, this.game.time);
    }
    this.lastDamageAt = this.game.time;
    if (hitPoint) this.game.effects.blood(hitPoint);
    if (this.isPlayer) this.game.onPlayerHurt(attacker, dmg);
    if (this.hp <= 0) {
      this.hp = 0;
      this.die(attacker, part === 'head', weaponId);
      return true;
    }
    return false;
  }

  die(attacker, headshot, weaponId) {
    if (!this.alive) return;
    this.alive = false;
    this.deaths++;
    this.deadTimer = 0;
    this.ads = 0;
    if (attacker && attacker !== this) attacker.kills++;
    if (!weaponId && attacker) {
      weaponId = attacker.currentWeaponId === 'melee' ? attacker.meleeWeapon.variant : attacker.currentWeaponId;
    }
    for (const [source, t] of this.damagedBy) {
      if (source !== attacker && source !== this && this.game.time - t <= 8) {
        source.assists++;
      }
    }
    this.damagedBy.clear();
    this.game.dropWeapon(this);
    if (this.mesh) this.mesh.weapon.visible = false;
    if (this.isPlayer) {
      for (const id in this.viewModels) this.viewModels[id].group.visible = false;
    }
    this.game.onKill(attacker, this, weaponId || 'rifle', headshot);
  }

  heal(dt) {
    if (this.alive && this.hp < this.maxHp && this.game.time - this.lastDamageAt > CONFIG.player.regenDelay) {
      this.hp = Math.min(this.maxHp, this.hp + CONFIG.player.regenRate * dt);
    }
  }

  buildMesh(showTag) {
    if (!this.mesh) {
      this.mesh = buildSoldierMesh(this.team);
      if (showTag) {
        this.nameTag = makeNameTag(this.name, TEAM[this.team].css);
        this.mesh.group.add(this.nameTag);
      }
      this.game.scene.add(this.mesh.group);
    }
  }

  syncMesh(dt) {
    if (!this.mesh) return;
    const m = this.mesh.group;
    m.position.copy(this.pos);
    if (!this.alive) {
      // 倒地动画
      this.deadTimer += dt;
      const f = Math.min(this.deadTimer / 0.28, 1);
      m.rotation.x = -Math.PI / 2 * f;
      this.mesh.arms.rotation.x = damp(this.mesh.arms.rotation.x, -0.65, 9, dt);
      this.mesh.arms.rotation.z = damp(this.mesh.arms.rotation.z, 0.28, 9, dt);
      this.mesh.legL.rotation.x = damp(this.mesh.legL.rotation.x, 0, 8, dt);
      this.mesh.legR.rotation.x = damp(this.mesh.legR.rotation.x, 0, 8, dt);
      m.position.y = this.pos.y + 0.15 * f;
      if (this.deadTimer > 2.6) m.position.y -= (this.deadTimer - 2.6) * 0.45;
      m.visible = this.deadTimer < 4.2;
      return;
    }
    m.rotation.x = 0;
    m.rotation.y = this.yaw;
    const crouchF = this.crouching ? 0.78 : 1;
    m.scale.y = damp(m.scale.y, crouchF, 12, dt);
    this.mesh.arms.rotation.x = this.pitch;
    this.mesh.head.rotation.x = this.pitch * 0.45;
    // 腿部摆动
    const sp = clamp(this.speed2D / CONFIG.player.sprint, 0, 1);
    if (sp > 0.05 && this.grounded) {
      this.walkPhase += dt * (6 + sp * 6);
      this.mesh.legL.rotation.x = Math.sin(this.walkPhase) * 0.65 * sp;
      this.mesh.legR.rotation.x = -Math.sin(this.walkPhase) * 0.65 * sp;
    } else {
      this.mesh.legL.rotation.x = damp(this.mesh.legL.rotation.x, 0, 10, dt);
      this.mesh.legR.rotation.x = damp(this.mesh.legR.rotation.x, 0, 10, dt);
    }
  }

  updateCommon(dt) {
    this.switchTimer = Math.max(0, this.switchTimer - dt);
    this.meleeWeapon.update(dt);
    for (const id in this.weapons) {
      const r = this.weapons[id].update(dt);
      if (r === 'reloadDone' && this.isPlayer && id === this.currentWeaponId) this.game.audio.reload(2);
    }
    this.heal(dt);
    this.speed2D = Math.hypot(this.body.vel.x, this.body.vel.z);
  }

  moveBody(dt) {
    moveBody(this.body, dt, this.game.world.colliders, CONFIG.player.stepHeight);
  }
}

// ---------- 玩家控制器 ----------
export class PlayerController extends Soldier {
  constructor(game) {
    super(game, 'A', '玩家', true);
    this.keys = new Set();
    this.fireHeld = false;
    this.fireClicked = false;
    this.sensitivity = 1;
    this.viewModels = {};
    this.vmGroup = new THREE.Group();
    this.recoilP = 0; this.recoilY = 0;
    this.swayX = 0; this.swayY = 0;
    this.bobPhase = 0;
    this.fovMult = 1;
    this.stepAcc = 0;
    this.autoPilot = false;   // autotest 用
    this.nadeKeyCd = 0;
    this.deathFromY = null;
  }

  attachCamera(camera) {
    this.camera = camera;
    camera.add(this.vmGroup);
    for (const id of [...GUN_ORDER, ...MELEE_ORDER]) {
      const vm = buildViewModel(id);
      vm.group.visible = false;
      vm.group.scale.setScalar(0.85);
      vm.group.position.set(0.24, -0.23, -0.45);
      this.vmGroup.add(vm.group);
      this.viewModels[id] = vm;
    }
    this.viewModels.rifle.group.visible = true;
  }

  get activeVmId() {
    return this.currentWeaponId === 'melee' ? this.meleeWeapon.variant : this.currentWeaponId;
  }

  getMuzzleWorld(out) {
    const vm = this.viewModels && this.viewModels[this.activeVmId];
    if (vm) return vm.muzzle.getWorldPosition(out);
    return super.getMuzzleWorld(out);
  }

  onMouseMove(dx, dy) {
    if (!this.alive) return;
    const zoomF = this.ads > 0.5 ? this.weapon.def.zoomFov / CONFIG.baseFov : 1;
    const s = this.sensitivity * 0.0022 * zoomF;
    this.yaw -= dx * s;
    this.pitch = clamp(this.pitch - dy * s, -1.45, 1.45);
    this.swayX = clamp(this.swayX + dx * 0.0004, -0.03, 0.03);
    this.swayY = clamp(this.swayY + dy * 0.0004, -0.03, 0.03);
  }

  applyRecoil(up, side) {
    super.applyRecoil(up * 0.55, side * 0.55);
    this.climbP = (this.climbP || 0) + up * 0.55;   // 永久上跳部分（缓慢自动回复）
    this.recoilP += up;
    this.recoilY += side;
  }

  update(dt) {
    if (this.alive && this.deadTimer > 0) { this.deadTimer = 0; this.deathFromY = null; }
    this.updateCommon(dt);
    this.nadeKeyCd = Math.max(0, this.nadeKeyCd - dt);
    // 后坐上跳自动回复
    if (this.climbP > 0) {
      const rec = Math.min(this.climbP, this.climbP * 4.5 * dt + 0.012 * dt);
      this.pitch = clamp(this.pitch - rec, -1.45, 1.45);
      this.climbP -= rec;
    }
    if (!this.alive) { this.updateDeathCam(dt); return; }

    if (this.autoPilot) this._autoInput(dt);

    const k = this.keys, P = CONFIG.player;
    // 蹲伏
    const wantCrouch = k.has('ControlLeft') || k.has('KeyC');
    if (wantCrouch !== this.crouching) {
      if (wantCrouch) this.crouching = true;
      else {
        // 检查头顶空间
        this.body.h = CONFIG.player.height;
        const test = this.body.aabb(_tmpAABB, this.pos, CONFIG.player.height);
        let blocked = false;
        for (const c of this.game.world.colliders) {
          if (test.min.x < c.max.x && test.max.x > c.min.x &&
              test.min.y < c.max.y && test.max.y > c.min.y &&
              test.min.z < c.max.z && test.max.z > c.min.z) { blocked = true; break; }
        }
        if (!blocked) this.crouching = false;
      }
    }
    this.body.h = this.height;

    // 移动
    let fx = 0, fz = 0;
    if (k.has('KeyW')) fz -= 1;
    if (k.has('KeyS')) fz += 1;
    if (k.has('KeyA')) fx -= 1;
    if (k.has('KeyD')) fx += 1;
    const sprinting = k.has('ShiftLeft') && fz < 0 && !this.adsHeld && !this.crouching;
    const def = this.weapon.def;
    let speed = this.crouching ? P.crouch : sprinting ? P.sprint : P.walk;
    speed *= def.moveMult * (this.adsHeld ? 0.62 : 1);

    const len = Math.hypot(fx, fz);
    let wishX = 0, wishZ = 0;
    if (len > 0) {
      fx /= len; fz /= len;
      // forward = (-sinYaw, -cosYaw)，right = (cosYaw, -sinYaw)
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      wishX = (fx * cos + fz * sin) * speed;
      wishZ = (fz * cos - fx * sin) * speed;
    }
    const accel = this.grounded ? P.accel : P.airAccel;
    this.body.vel.x = damp(this.body.vel.x, wishX, accel / 4, dt);
    this.body.vel.z = damp(this.body.vel.z, wishZ, accel / 4, dt);

    // 跳跃
    if (k.has('Space') && this.grounded) {
      this.body.vel.y = P.jump;
      this.body.grounded = false;
    }
    this.body.vel.y -= P.gravity * dt;
    this.moveBody(dt);

    // ADS 插值（近战不可开镜）
    const adsTarget = (this.adsHeld && this.alive && this.switchTimer <= 0 && this.currentWeaponId !== 'melee') ? 1 : 0;
    this.ads = damp(this.ads, adsTarget, 14, dt);

    // 开火
    if (this.fireHeld || this.fireClicked) {
      if (def.auto ? this.fireHeld : this.fireClicked) {
        this.weapon.tryFire(this.game, this);
      }
    }
    this.fireClicked = false;

    // 脚步声
    if (this.grounded && this.speed2D > 0.8) {
      this.stepAcc += this.speed2D * dt;
      const stride = sprinting ? 3.4 : 2.6;
      if (this.stepAcc > stride) {
        this.stepAcc = 0;
        this.game.audio.footstep(0, 0, sprinting);
      }
    } else this.stepAcc = 0;

    this.updateCamera(dt, sprinting);
  }

  updateDeathCam(dt) {
    if (!this.camera) return;
    this.deadTimer += dt;
    const f = Math.min(this.deadTimer / 0.9, 1);
    const e = 1 - (1 - f) * (1 - f);
    if (this.deathFromY == null) {
      this.deathFromY = this.camera.position.y;
    }
    for (const id in this.viewModels) this.viewModels[id].group.visible = false;
    const cam = this.camera;
    cam.position.set(this.pos.x, this.deathFromY + (this.pos.y + 0.32 - this.deathFromY) * e, this.pos.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = this.yaw;
    cam.rotation.x = this.pitch + (0.25 - this.pitch) * e;
    cam.rotation.z = 0;
  }

  updateCamera(dt, sprinting) {
    if (!this.camera) return;
    const cam = this.camera, P = CONFIG.player;
    // 位置
    const eye = this.pos.y + this.eyeHeight;
    cam.position.set(this.pos.x, eye, this.pos.z);
    // 走路晃动
    const spF = clamp(this.speed2D / P.sprint, 0, 1);
    if (this.grounded && spF > 0.05) {
      this.bobPhase += dt * (5 + spF * 7);
      cam.position.y += Math.sin(this.bobPhase * 2) * 0.028 * spF * (1 - this.ads * 0.7);
      cam.position.x += Math.cos(this.bobPhase) * 0.014 * spF * (1 - this.ads * 0.7);
    }
    // 后座回弹
    this.recoilP = damp(this.recoilP, 0, 8, dt);
    this.recoilY = damp(this.recoilY, 0, 8, dt);
    this.swayX = damp(this.swayX, 0, 9, dt);
    this.swayY = damp(this.swayY, 0, 9, dt);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = this.yaw + this.recoilY;
    cam.rotation.x = this.pitch + this.recoilP;
    cam.rotation.z = this.swayX * 0.5;
    // FOV
    const def = this.weapon.def;
    const targetFov = lerp(CONFIG.baseFov * (sprinting ? 1.05 : 1), def.zoomFov, this.ads);
    if (Math.abs(cam.fov - targetFov) > 0.1) {
      cam.fov = damp(cam.fov, targetFov, 16, dt);
      cam.updateProjectionMatrix();
    }
    // 视模动画
    const vmId = this.activeVmId;
    const vm = this.viewModels[vmId];
    for (const id in this.viewModels) this.viewModels[id].group.visible = id === vmId && !(def.scoped && this.ads > 0.6);
    if (vm) {
      const g = vm.group;
      const isMelee = this.currentWeaponId === 'melee';
      const adsPos = _v1.set(0, -0.148, -0.34);
      const hipPos = _v2.set(isMelee ? 0.2 : 0.24, isMelee ? -0.26 : -0.23, -0.45);
      g.position.lerpVectors(hipPos, adsPos, this.ads);
      // 呼吸/摆动
      g.position.x += this.swayX * (1 - this.ads * 0.85);
      g.position.y += this.swayY * (1 - this.ads * 0.85);
      // 后座顿挫
      g.position.z += this.recoilP * 1.6;
      g.rotation.x = this.recoilP * 2.2;
      g.rotation.z = 0;
      // 近战挥砍动画
      if (isMelee && this.meleeWeapon.swingT > 0) {
        const m = MELEE[this.meleeWeapon.variant];
        const f = 1 - this.meleeWeapon.swingT / m.swing;  // 0→1
        const sw = Math.sin(f * Math.PI);
        g.position.x -= sw * 0.22;
        g.position.z -= sw * 0.18;
        g.rotation.x -= sw * 0.9;
        g.rotation.z = -sw * 0.5;
      }
      // 换弹下沉
      if (this.weapon.reloading > 0 && def.reloadTime > 0) {
        const f = Math.sin(Math.min(1, 1 - this.weapon.reloading / def.reloadTime) * Math.PI);
        g.position.y -= f * 0.16;
        g.rotation.x -= f * 0.7;
      }
      // 切枪抬起
      if (this.switchTimer > 0) {
        const f = this.switchTimer / def.switchTime;
        g.position.y -= f * 0.25;
      }
      // 手里剑旋转
      if (g.userData.spin) g.userData.spin.rotation.y += dt * 3;
    }
  }

  _autoInput(dt) {
    // autotest：自动漫游+射击+切枪+投掷，用于无人值守验证
    const t = this.game.time;
    // pose 参数：固定姿态截图验证
    if (this.pose === 'sniper') { this.currentWeaponId = 'sniper'; this.adsHeld = true; this.fireHeld = false; }
    else if (this.pose === 'shotgun') { this.currentWeaponId = 'shotgun'; }
    else if (this.pose === 'melee') { this.currentWeaponId = 'melee'; this.fireHeld = Math.sin(t * 3) > 0; }
    else if (this.pose === 'smoke') { this.throwableSel = 'smoke'; if (Math.random() < dt * 0.8) this.throwGrenade(); }
    else if (this.pose === 'flash') { this.throwableSel = 'flash'; if (Math.random() < dt * 0.8) this.throwGrenade(); }
    else if (this.pose === 'stay') { this.keys.clear(); this.fireHeld = false; return; }
    this.keys.add('KeyW');
    this.yaw += Math.sin(t * 0.5) * dt * 0.8;
    if (Math.random() < dt * 0.15) this.keys.add('Space');
    else this.keys.delete('Space');
    if (!this.pose) {
      this.fireHeld = Math.sin(t * 0.9) > 0.3;
      if (Math.random() < dt * 0.2) this.switchSlot(1 + Math.floor(Math.random() * 5));
      if (Math.random() < dt * 0.15) this.switchSlot(6);
      if (Math.random() < dt * 0.12) this.throwGrenade();
      if (Math.random() < dt * 0.08) this.adsHeld = !this.adsHeld;
    }
  }

  throwGrenade() {
    const count = this.throwables[this.throwableSel];
    if (count <= 0 || !this.alive || this.nadeKeyCd > 0) return;
    this.nadeKeyCd = 0.8;
    this.throwables[this.throwableSel]--;
    this.game.throwGrenade(this);
  }
}
const _tmpAABB = { min: new THREE.Vector3(), max: new THREE.Vector3() };

// ---------- AI 机器人 ----------
export class BotController extends Soldier {
  constructor(game, team, name, difficulty) {
    super(game, team, name, false);
    this.diff = DIFFICULTY[difficulty] || DIFFICULTY.normal;
    this.thinkT = rand(0, 0.1);
    this.path = null; this.pathIdx = 0;
    this.goalNode = -1;
    this.repathT = 0;
    this.target = null;              // 当前可见敌人
    this.lastKnown = new THREE.Vector3();
    this.lastSeenAt = -99;
    this.reactAt = 0;                // 可开火时刻
    this.aimErr = this.diff.aimErr;
    this.burstLeft = 0;
    this.burstPauseT = 0;
    this.strafeDir = 1;
    this.strafeT = 0;
    this.stuckT = 0;
    this.lastPos = new THREE.Vector3();
    this.alertPos = null;
    this.buildMesh(team === this.game.playerTeam);
  }

  hearNoise(pos) {
    if (!this.alive || this.target) return;
    this.alertPos = pos.clone();
    this.path = null;   // 重新规划去查看
  }

  update(dt) {
    this.updateCommon(dt);
    if (!this.alive) { this.syncMesh(dt); return; }

    this.thinkT -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = CONFIG.bot.thinkInterval;
      this.think();
    }
    this.updateAim(dt);
    this.updateMove(dt);
    this.updateFire(dt);
    this.syncMesh(dt);
  }

  // 感知：找最近可见敌人
  think() {
    const g = this.game;
    if (g.time < this.blindUntil) { this.target = null; return; }  // 被闪光致盲
    let best = null, bd = Infinity;
    const eye = this.getAimOrigin().clone();
    const fwd = this.getAimDir(_v3).clone();
    for (const s of g.soldiers) {
      if (!s.alive || s.team === this.team) continue;
      _v1.set(s.pos.x, s.pos.y + s.height * 0.6, s.pos.z);
      const d = _v1.distanceTo(eye);
      if (d > CONFIG.bot.viewDist) continue;
      _v2.subVectors(_v1, eye).normalize();
      if (_v2.dot(fwd) < CONFIG.bot.fovCos && d > 3) continue;
      if (!segmentClear(eye, _v1, g.world.colliders)) continue;
      if (g.smokeBlocked(eye, _v1)) continue;
      if (d < bd) { bd = d; best = s; }
    }
    if (best) {
      if (this.target !== best) {
        this.target = best;
        this.reactAt = g.time + this.diff.reaction * rand(0.7, 1.4);
        this.aimErr = this.diff.aimErr * rand(1.5, 2.5);
      }
      this.lastKnown.copy(best.pos);
      this.lastSeenAt = g.time;
      this.alertPos = null;
    } else {
      if (this.target) {
        this.target = null;
        this.burstLeft = 0;
      }
    }
  }

  updateAim(dt) {
    if (this.target && this.target.alive) {
      // 瞄准目标胸口→头部区间
      const t = this.target;
      const ex = this.pos.x, ey = this.pos.y + this.eyeHeight, ez = this.pos.z;
      _v1.set(t.pos.x - ex, t.pos.y + t.height * (Math.random() < 0.25 ? 0.9 : 0.62) - ey, t.pos.z - ez);
      const dist = _v1.length();
      const wantYaw = Math.atan2(-_v1.x, -_v1.z);
      const wantPitch = Math.asin(clamp(_v1.y / Math.max(dist, 0.001), -1, 1));
      // 平滑转向
      let dy = wantYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      const turn = (5.5 + this.diff.aimDecay * 3) * dt;
      this.yaw += clamp(dy, -turn, turn);
      this.pitch += clamp(wantPitch - this.pitch, -turn, turn);
      // 误差随时间收敛
      this.aimErr = Math.max(this.diff.aimErr * 0.35, this.aimErr - this.diff.aimDecay * dt * this.diff.aimErr * 3);
    } else {
      // 朝移动方向看
      if (Math.hypot(this.body.vel.x, this.body.vel.z) > 0.5) {
        const wantYaw = Math.atan2(-this.body.vel.x, -this.body.vel.z);
        let dy = wantYaw - this.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        this.yaw += clamp(dy, -3.2 * dt, 3.2 * dt);
      }
      this.pitch = damp(this.pitch, 0, 3, dt);
      this.aimErr = this.diff.aimErr * 1.5;
    }
  }

  updateMove(dt) {
    const P = CONFIG.player;
    let wishX = 0, wishZ = 0, speed = P.walk * 0.95;
    const g = this.game;

    if (this.target && this.target.alive) {
      // 交战移动：保持距离 + 侧移
      const d = this.pos.distanceTo(this.target.pos);
      _v1.subVectors(this.target.pos, this.pos).setY(0).normalize();
      _v2.set(-_v1.z, 0, _v1.x);  // 侧向
      this.strafeT -= dt;
      if (this.strafeT <= 0) {
        this.strafeT = rand(0.5, 1.2) / this.diff.strafe;
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;
        this.crouching = Math.random() < 0.22;
      }
      let fwd = 0;
      if (d > 26) fwd = 1; else if (d < 6) fwd = -0.7;
      wishX = (_v1.x * fwd + _v2.x * this.strafeDir) ;
      wishZ = (_v1.z * fwd + _v2.z * this.strafeDir);
      speed = P.walk * (this.crouching ? 0.45 : 0.8);
    } else {
      this.crouching = false;
      // 路径跟随
      if (!this.path || this.pathIdx >= this.path.length) this.pickNewPath();
      if (this.path && this.pathIdx < this.path.length) {
        const node = g.world.waypoints.nodes[this.path[this.pathIdx]];
        _v1.subVectors(node.pos, this.pos); _v1.y = 0;
        const d = _v1.length();
        if (d < 0.7) {
          this.pathIdx++;
        } else {
          _v1.normalize();
          wishX = _v1.x; wishZ = _v1.z;
          speed = P.walk * (this.alertPos ? 1.05 : 0.95);
        }
      }
    }

    const wl = Math.hypot(wishX, wishZ);
    if (wl > 0.01) {
      wishX = wishX / wl * speed;
      wishZ = wishZ / wl * speed;
    }
    this.body.vel.x = damp(this.body.vel.x, wishX, 9, dt);
    this.body.vel.z = damp(this.body.vel.z, wishZ, 9, dt);
    this.body.vel.y -= P.gravity * dt;
    this.body.h = this.height;
    this.moveBody(dt);

    // 卡住检测 → 跳跃 / 重新寻路
    if (wl > 0.1) {
      if (this.pos.distanceToSquared(this.lastPos) < 0.02 * dt * 60 * 0.016) {
        this.stuckT += dt;
        if (this.stuckT > 0.5 && this.grounded) { this.body.vel.y = P.jump * 0.9; }
        if (this.stuckT > 1.6) { this.path = null; this.stuckT = 0; }
      } else this.stuckT = 0;
    }
    this.lastPos.copy(this.pos);
  }

  pickNewPath() {
    const g = this.game;
    const nodes = g.world.waypoints.nodes;
    if (!nodes.length) return;
    const start = g.world.nearestNode(this.pos);
    let goalPos = null;
    if (this.target) goalPos = this.target.pos;
    else if (this.alertPos) { goalPos = this.alertPos; }
    else if (g.time - this.lastSeenAt < 6) goalPos = this.lastKnown;
    if (goalPos) {
      this.goalNode = g.world.nearestNode(goalPos);
    } else {
      // 随机巡逻，偏向敌方半场
      const enemySign = this.team === 'A' ? -1 : 1;
      for (let tries = 0; tries < 12; tries++) {
        const i = Math.floor(Math.random() * nodes.length);
        const n = nodes[i];
        const bias = n.pos.z * enemySign > 0 ? 2 : 1;
        if (Math.random() * 3 < bias) { this.goalNode = i; break; }
      }
    }
    this.path = findPath(nodes, start, this.goalNode);
    this.pathIdx = this.path ? 1 : 0;
    this.repathT = CONFIG.bot.repathInterval * rand(0.8, 1.3);
  }

  updateFire(dt) {
    this.repathT -= dt;
    if (this.repathT <= 0 && !this.target) { this.repathT = 999; this.path = null; }
    if (!this.target || !this.target.alive) return;
    if (this.game.time < this.reactAt) return;
    // 视线仍通畅才开火（think 已确认）
    if (this.burstPauseT > 0) {
      this.burstPauseT -= dt;
      return;
    }
    if (this.burstLeft <= 0) {
      this.burstLeft = Math.round(rand(this.diff.burst[0], this.diff.burst[1]));
    }
    // 瞄准偏差足够小才开枪
    if (this.aimErr < this.diff.aimErr * 2.6) {
      if (this.weapon.tryFire(this.game, this)) {
        this.burstLeft--;
        if (this.burstLeft <= 0) this.burstPauseT = rand(0.35, 0.8) / this.diff.strafe;
      }
    }
  }

  // AI 命中方向叠加误差
  getAimDir(out) {
    yawPitchDir(this.yaw + rand(-this.aimErr, this.aimErr),
      clamp(this.pitch + rand(-this.aimErr, this.aimErr), -1.45, 1.45), out);
    return out;
  }
}

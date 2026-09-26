// ===== 游戏主逻辑：状态机 / 命中判定 / 比赛流程 =====
import * as THREE from 'three';
import { CONFIG, WEAPONS, MELEE, THROWABLES, TEAM, BOT_NAMES } from './config.js';
import { raycastWorld, raySphere, rayAABB, segmentClear, clamp, lerp, damp, rand } from './utils.js';
import { buildWorld } from './map.js';
import { Effects } from './effects.js';
import { AudioEngine } from './audio.js';
import { HUD } from './hud.js';
import { Throwable, Shuriken } from './weapons.js';
import { PlayerController, BotController } from './soldiers.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _muzzle = new THREE.Vector3();
const _headC = new THREE.Vector3(), _hitP = new THREE.Vector3();
const _bodyBox = { min: new THREE.Vector3(), max: new THREE.Vector3() };

export class Game {
  constructor() {
    this.cfg = CONFIG;
    this.state = 'menu';
    this.time = 0;
    this.timeLeft = CONFIG.match.timeLimit;
    this.scores = { A: 0, B: 0 };
    this.playerTeam = 'A';
    this.soldiers = [];
    this.projectiles = [];
    this.smokeVolumes = [];
    this.respawnQueue = [];
    this.multiKills = 0;
    this.lastKillAt = -99;
    this.totalKills = 0;
    this.autotest = false;
    this.fpsEma = 60;
    this.stats = { shots: 0, hits: 0 };
    this.settings = { sens: 1, fov: 75, volume: 0.8, quality: 'medium', fps: true, difficulty: 'normal' };
  }

  init() {
    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.32;
    document.getElementById('app').appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CONFIG.baseFov, innerWidth / innerHeight, 0.05, 1600);
    this.scene.add(this.camera);
    // 相机补光：保证第一人称武器视模可读
    const fill = new THREE.PointLight(0xfff2e0, 0.85, 2.6, 1.6);
    fill.position.set(0.1, 0.05, -0.2);
    this.camera.add(fill);

    this.world = buildWorld(this.scene);
    this.effects = new Effects(this.scene);
    this.audio = new AudioEngine();
    this.hud = new HUD();
    this.hud.initMinimap(this.world);

    this.player = new PlayerController(this);
    this.player.attachCamera(this.camera);
    this.soldiers.push(this.player);

    this.bindInput();
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  applySettings(s) {
    this.settings = { ...this.settings, ...s };
    CONFIG.baseFov = this.settings.fov;
    this.player.sensitivity = this.settings.sens;
    this.audio.setVolume(this.settings.volume);
    this.hud.setFpsVisible(this.settings.fps);
    const q = this.settings.quality;
    this.renderer.setPixelRatio(q === 'high' ? Math.min(devicePixelRatio, 2) : q === 'medium' ? 1.25 : 1);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.world.sun.castShadow = q !== 'low';
    if (this.camera.fov !== CONFIG.baseFov && this.state !== 'playing') {
      this.camera.fov = CONFIG.baseFov;
      this.camera.updateProjectionMatrix();
    }
  }

  // ---------- 比赛流程 ----------
  startMatch() {
    this.cleanupMatch();
    this.state = 'playing';
    this.time = 0;
    this.timeLeft = CONFIG.match.timeLimit;
    this.scores = { A: 0, B: 0 };
    this.totalKills = 0;
    this.firstBlood = false;
    this.hud.show();
    this.hud.setScores(0, 0);
    this.hud.setTimer(this.timeLeft);

    // 玩家
    this.resetSoldier(this.player, this.pickSpawn('A'));
    this.player.sensitivity = this.settings.sens;
    this.player.autoPilot = this.autotest;

    // 机器人
    const namesA = [...BOT_NAMES.A].sort(() => Math.random() - 0.5);
    const namesB = [...BOT_NAMES.B].sort(() => Math.random() - 0.5);
    for (let i = 0; i < CONFIG.match.teamSize - 1; i++) {
      const b = new BotController(this, 'A', `保卫者·${namesA[i % namesA.length]}`, this.settings.difficulty);
      this.resetSoldier(b, this.pickSpawn('A'));
      this.soldiers.push(b);
    }
    for (let i = 0; i < CONFIG.match.teamSize; i++) {
      const b = new BotController(this, 'B', `潜伏者·${namesB[i % namesB.length]}`, this.settings.difficulty);
      this.resetSoldier(b, this.pickSpawn('B'));
      this.soldiers.push(b);
    }
    this.hud.banner('战斗开始', `率先取得 ${CONFIG.match.scoreLimit} 次击杀`, 2200);
    if (!this.autotest) this.lockPointer();
  }

  cleanupMatch() {
    for (const s of this.soldiers) {
      if (s.mesh) { this.scene.remove(s.mesh.group); s.mesh = null; }
    }
    this.soldiers = this.soldiers.filter(s => s.isPlayer);
    for (const p of this.projectiles) p.dispose();
    this.projectiles = [];
    this.smokeVolumes = [];
    this.respawnQueue = [];
    this.hud.hideRespawn();
    this.hud.el.killfeed.innerHTML = '';
  }

  endMatch() {
    this.state = 'over';
    document.exitPointerLock?.();
    const a = this.scores.A, b = this.scores.B;
    const win = a > b;
    const tie = a === b;
    document.getElementById('end-title').textContent = tie ? '平局' : win ? '胜 利' : '失 败';
    document.getElementById('end-title').style.color = tie ? '#cfd6dd' : win ? '#e8b64c' : '#ff5a4d';
    document.getElementById('end-score').textContent = `${a} : ${b}`;
    this.hud.updateScoreboard(this.soldiers, document.getElementById('end-body'));
    this.audio.win(win && !tie);
    this.showOverlay('menu-end');
    this.hud.hide();
  }

  quitToMenu() {
    this.state = 'menu';
    document.exitPointerLock?.();
    this.cleanupMatch();
    this.hud.hide();
    this.showOverlay('menu-main');
  }

  // ---------- 出生 / 重生 ----------
  pickSpawn(team) {
    const spawns = this.world.spawns[team];
    let best = spawns[0], bestScore = -1;
    for (const sp of spawns) {
      let minD = Infinity;
      for (const s of this.soldiers) {
        if (!s.alive || s.team === team) continue;
        minD = Math.min(minD, sp.distanceTo(s.pos));
      }
      const score = minD + Math.random() * 3;
      if (score > bestScore) { bestScore = score; best = sp; }
    }
    return best;
  }

  resetSoldier(s, pos) {
    s.body.pos.copy(pos);
    s.body.vel.set(0, 0, 0);
    s.body.h = CONFIG.player.height;
    s.hp = s.maxHp;
    s.alive = true;
    s.crouching = false;
    s.ads = 0; s.adsHeld = false;
    s.yaw = s.team === 'A' ? 0 : Math.PI;
    s.pitch = 0;
    s.throwables = { frag: CONFIG.grenade.count, smoke: THROWABLES.smoke.count, flash: THROWABLES.flash.count };
    s.throwableSel = 'frag';
    s.meleeWeapon.reset();
    s.blindUntil = 0;
    s.grenades = CONFIG.grenade.count;
    s.spawnProtectUntil = this.time + CONFIG.match.spawnProtect;
    s.switchTimer = 0;
    s.currentWeaponId = 'rifle';
    for (const id in s.weapons) {
      const w = s.weapons[id];
      w.ammo = w.def.mag; w.reserve = w.def.reserve;
      w.reloading = 0; w.cooldown = 0; w.bloom = 0;
    }
    if (s.mesh) {
      s.mesh.group.visible = true;
      s.mesh.group.rotation.x = 0;
    }
    if (s.isPlayer) {
      s.keys.clear(); s.fireHeld = false;
      this.hud.hideRespawn();
    } else {
      s.path = null; s.target = null; s.alertPos = null;
      s.lastSeenAt = -99; s.burstLeft = 0;
    }
  }

  // ---------- 射击判定 ----------
  raycast(origin, dir, maxDist) { return raycastWorld(origin, dir, maxDist, this.world.colliders); }

  executeShot(shooter, weapon, origin, dir, fx = true) {
    const def = weapon.def;
    shooter.lastShotAt = this.time;
    this.stats.shots++;
    const maxDist = 200;
    const wHit = raycastWorld(origin, dir, maxDist, this.world.colliders);
    let bestT = wHit ? wHit.t : maxDist;
    let victim = null, part = null;

    for (const s of this.soldiers) {
      if (!s.alive || s === shooter || s.team === shooter.team) continue;
      _headC.set(s.pos.x, s.pos.y + s.height - 0.17, s.pos.z);
      const th = raySphere(origin, dir, _headC, 0.26, bestT);
      _bodyBox.min.set(s.pos.x - 0.34, s.pos.y, s.pos.z - 0.34);
      _bodyBox.max.set(s.pos.x + 0.34, s.pos.y + s.height, s.pos.z + 0.34);
      const tb = rayAABB(origin, dir, _bodyBox, bestT);
      let t = -1, p = null;
      if (th >= 0 && (tb < 0 || th <= tb + 0.02)) { t = th; p = 'head'; }
      else if (tb >= 0) { t = tb; p = 'body'; }
      if (t >= 0 && t < bestT) { bestT = t; victim = s; part = p; }
    }

    _hitP.copy(dir).multiplyScalar(bestT).add(origin);

    // 表现（霰弹只有第一颗触发火光/声音/后座镜头）
    shooter.getMuzzleWorld(_muzzle);
    if (fx) {
      this.effects.muzzleFlash(_muzzle, weapon.id === 'sniper' || weapon.id === 'shotgun');
      const sp = this.spatial(shooter.pos);
      this.audio.shot(weapon.id, sp.dist, sp.pan);
      if (shooter.isPlayer) this.effects.shake(weapon.id === 'rifle' || weapon.id === 'pistol' ? 0.07 : 0.22);
    }
    this.effects.tracer(_muzzle, _hitP, def.tracer);

    // 伤害
    if (victim) {
      let dmg = def.damage;
      if (bestT > def.rangeStart) {
        dmg *= lerp(1, def.minDmgMult, clamp((bestT - def.rangeStart) / (def.rangeEnd - def.rangeStart), 0, 1));
      }
      if (part === 'head') dmg *= def.headMult;
      this.stats.hits++;
      const died = victim.takeDamage(dmg, shooter, part, _hitP);
      if (shooter.isPlayer) {
        this.hud.hitmarker(died, part === 'head');
        if (fx) this.audio.hit(part === 'head');
      }
    } else if (wHit && bestT < maxDist) {
      this.effects.impact(wHit.point, wHit.normal);
    }

    if (!fx) return;

    // 子弹擦过玩家耳边的音效
    if (!shooter.isPlayer && this.player.alive && shooter.team !== this.player.team) {
      const eye = _v.set(this.player.pos.x, this.player.pos.y + this.player.eyeHeight, this.player.pos.z);
      const t = clamp(_v2.subVectors(eye, origin).dot(dir), 0, bestT);
      const closest = _v2.copy(dir).multiplyScalar(t).add(origin);
      const d = closest.distanceTo(eye);
      if (d < 1.3 && d > 0.3) this.audio.whiz(d * 2, this.spatial(shooter.pos).pan);
    }

    // AI 听觉
    for (const s of this.soldiers) {
      if (s.isPlayer || !s.alive || s.team === shooter.team) continue;
      const d = s.pos.distanceTo(shooter.pos);
      if (d < CONFIG.bot.hearGunshot * s.diff.hearMult) s.hearNoise(shooter.pos);
    }
  }

  spatial(pos) {
    const camP = this.camera.position;
    _v.subVectors(pos, camP);
    const dist = _v.length();
    if (dist < 0.01) return { dist, pan: 0 };
    _v.multiplyScalar(1 / dist);
    const yaw = this.player.yaw;
    const pan = _v.x * Math.cos(yaw) - _v.z * Math.sin(yaw);
    return { dist, pan: clamp(pan, -1, 1) };
  }

  // ---------- 投掷物 / 近战 / 手里剑 ----------
  throwGrenade(soldier) {
    const type = soldier.throwableSel;
    const origin = soldier.getAimOrigin().clone();
    const dir = soldier.getAimDir(new THREE.Vector3());
    dir.y += 0.16; dir.normalize();
    const vel = dir.multiplyScalar(CONFIG.grenade.throwSpeed);
    vel.x += soldier.body.vel.x * 0.5; vel.z += soldier.body.vel.z * 0.5;
    this.projectiles.push(new Throwable(origin, vel, soldier, this, type));
    this.audio.nadeThrow();
    if (soldier.isPlayer) this.hud.setWeapon(soldier);
  }

  detonate(t) {
    t.dispose();
    if (t.type === 'frag') this.explodeFrag(t);
    else if (t.type === 'smoke') this.detonateSmoke(t);
    else if (t.type === 'flash') this.detonateFlash(t);
  }

  explodeFrag(g) {
    this.effects.explosion(g.pos);
    const sp = this.spatial(g.pos);
    this.audio.explosion(sp.dist, sp.pan);
    const dCam = this.camera.position.distanceTo(g.pos);
    if (dCam < 30) this.effects.shake(clamp(1 - dCam / 30, 0.1, 0.9));

    const cfg = CONFIG.grenade;
    for (const s of this.soldiers) {
      if (!s.alive || s.team === g.thrower.team) continue;
      _v.set(s.pos.x, s.pos.y + s.height * 0.55, s.pos.z);
      const d = _v.distanceTo(g.pos);
      if (d > cfg.radius) continue;
      _v2.copy(g.pos); _v2.y += 0.25;
      if (!this.losFree(_v2, _v)) continue;
      const dmg = lerp(cfg.maxDmg, cfg.minDmg, clamp(d / cfg.radius, 0, 1));
      s.takeDamage(dmg, g.thrower, 'body', null, 'frag');
    }
  }

  detonateSmoke(t) {
    const def = THROWABLES.smoke;
    this.effects.smokeCloud(t.pos, def.dur);
    this.smokeVolumes.push({ pos: t.pos.clone(), r: def.radius, until: this.time + def.dur });
    const sp = this.spatial(t.pos);
    this.audio.smokePop(sp.dist, sp.pan);
  }

  detonateFlash(t) {
    const def = THROWABLES.flash;
    this.effects.explosion(t.pos);   // 复用爆闪视觉
    const sp = this.spatial(t.pos);
    this.audio.flashbang(sp.dist, sp.pan);
    const blast = _v2.copy(t.pos); blast.y += 0.2;
    for (const s of this.soldiers) {
      if (!s.alive) continue;
      const eye = _v.set(s.pos.x, s.pos.y + s.eyeHeight, s.pos.z);
      const d = eye.distanceTo(blast);
      if (d > def.radius) continue;
      if (!this.losFree(blast, eye)) continue;
      // 朝向判定：越正对爆点致盲越久
      s.getAimDir(_muzzle);
      const facing = _muzzle.dot(_v.subVectors(blast, eye).normalize());
      if (facing < 0.05) continue;
      const dur = (0.8 + 2.6 * (1 - d / def.radius)) * clamp(facing * 1.6, 0.35, 1);
      s.blindUntil = Math.max(s.blindUntil, this.time + dur);
      if (s.isPlayer) {
        this.hud.flashWhite(dur);
        this.audio.tinnitus(dur);
      }
    }
  }

  smokeBlocked(a, b) {
    for (const v of this.smokeVolumes) {
      // 线段-球体相交
      _v.subVectors(b, a);
      const len = _v.length();
      if (len < 0.01) continue;
      _v.multiplyScalar(1 / len);
      const t = clamp(_muzzle.subVectors(v.pos, a).dot(_v), 0, len);
      const cx = a.x + _v.x * t, cy = a.y + _v.y * t, cz = a.z + _v.z * t;
      const dx = v.pos.x - cx, dy = v.pos.y - cy, dz = v.pos.z - cz;
      if (dx * dx + dy * dy + dz * dz < v.r * v.r) return true;
    }
    return false;
  }

  meleeAttack(soldier, m) {
    this.audio.meleeSwing();
    const origin = soldier.getAimOrigin().clone();
    const fwd = soldier.getAimDir(new THREE.Vector3());
    for (const s of this.soldiers) {
      if (!s.alive || s === soldier || s.team === soldier.team) continue;
      _v.set(s.pos.x, s.pos.y + s.height * 0.55, s.pos.z);
      const d = _v.distanceTo(origin);
      if (d > m.range) continue;
      _v.subVectors(_v, origin).normalize();
      if (_v.dot(fwd) < 0.5) continue;   // 60° 挥砍弧
      if (!this.losFree(origin, _v.set(s.pos.x, s.pos.y + s.height * 0.55, s.pos.z))) continue;
      const died = s.takeDamage(m.damage, soldier, 'body', _v, soldier.meleeWeapon.variant);
      this.audio.meleeHit();
      if (soldier.isPlayer) {
        this.hud.hitmarker(died, false);
        this.effects.shake(0.12);
      }
      break;  // 单次挥砍只命中一个目标
    }
  }

  throwShuriken(soldier, m) {
    const origin = soldier.getAimOrigin().clone();
    origin.addScaledVector(soldier.getAimDir(new THREE.Vector3()), 0.4);
    const dir = soldier.getAimDir(new THREE.Vector3());
    dir.y += 0.05; dir.normalize();
    this.projectiles.push(new Shuriken(origin, dir, soldier, this, m));
    this.audio.meleeSwing();
  }

  onShurikenHit(pos, isFlesh) {
    const sp = this.spatial(pos);
    this.audio.meleeHit(sp.dist, sp.pan);
    if (!isFlesh) this.effects.impact(pos, _v.set(0, 1, 0));
  }

  losFree(a, b) {
    return segmentClear(a, b, this.world.colliders);
  }

  onNadeBounce(pos) {
    const sp = this.spatial(pos);
    this.audio.nadeBounce(sp.dist, sp.pan);
  }

  onReloadStart(shooter, weapon) {
    const sp = this.spatial(shooter.pos);
    this.audio.reload(0, sp.dist, sp.pan);
    setTimeout(() => this.audio.reload(1, sp.dist, sp.pan), weapon.def.reloadTime * 500);
  }

  // ---------- 击杀 ----------
  onKill(attacker, victim, weaponId, headshot) {
    const suicide = !attacker || attacker === victim;
    if (!suicide && attacker.team !== victim.team) {
      this.scores[attacker.team]++;
      this.hud.setScores(this.scores.A, this.scores.B);
    }
    const wName = suicide ? '意外' : (WEAPONS[weaponId]?.short || MELEE[weaponId]?.short || THROWABLES[weaponId]?.short || weaponId);
    this.hud.killfeed(
      suicide ? victim.name : attacker.name,
      suicide ? victim.team : attacker.team,
      victim.name, victim.team, wName, headshot
    );

    // 播报
    if (!this.firstBlood && !suicide) {
      this.firstBlood = true;
      this.hud.banner('首杀', `${attacker.name} 拿下首杀`, 1500);
    }
    if (attacker && attacker.isPlayer && !suicide) {
      if (this.time - this.lastKillAt < 4.5) this.multiKills++;
      else this.multiKills = 1;
      this.lastKillAt = this.time;
      if (this.multiKills >= 2) {
        const labels = ['', '', '双杀！', '三连杀！', '四连杀！', '超神连杀！'];
        this.hud.banner(labels[Math.min(this.multiKills, 5)], `连续击杀 x${this.multiKills}`, 1300);
        this.audio.multikill(this.multiKills);
      }
    }

    // 重生排队
    this.respawnQueue.push({ soldier: victim, at: this.time + CONFIG.match.respawnDelay });
    if (victim.isPlayer) {
      this.multiKills = 0;
      this.hud.showRespawn(suicide ? '你把自己炸飞了' : `被 ${attacker.name} 使用 ${wName} 击杀`);
      this.hud.setScope(false);
      this.effects.shake(0.5);
    }

    this.totalKills++;
    if (this.scores.A >= CONFIG.match.scoreLimit || this.scores.B >= CONFIG.match.scoreLimit) {
      this.endMatch();
    }
  }

  onPlayerHurt(attacker, dmg) {
    this.hud.damageFlash(clamp(dmg / 50, 0.35, 0.85));
    this.audio.hurt();
    this.effects.shake(clamp(dmg / 120, 0.1, 0.4));
    if (attacker && attacker.alive) {
      _v.subVectors(attacker.pos, this.player.pos);
      const angle = Math.atan2(-_v.x, -_v.z);
      this.hud.dirHit(angle, this.player.yaw);
    }
  }

  // ---------- 输入 ----------
  bindInput() {
    const canvas = this.renderer.domElement;
    const overlayIds = ['menu-main', 'menu-settings', 'menu-help', 'menu-pause', 'menu-end', 'loading'];

    this.showOverlay = (id) => {
      for (const o of overlayIds) document.getElementById(o).classList.toggle('visible', o === id);
      if (!id) for (const o of overlayIds) document.getElementById(o).classList.remove('visible');
    };

    this.lockPointer = () => {
      if (this.autotest) return;
      canvas.requestPointerLock?.();
    };

    canvas.addEventListener('click', () => {
      if (this.state === 'playing' && !document.pointerLockElement) this.lockPointer();
    });

    document.addEventListener('pointerlockchange', () => {
      const locked = !!document.pointerLockElement;
      if (!locked && this.state === 'playing' && !this.autotest) {
        this.state = 'paused';
        this.showOverlay('menu-pause');
      }
      if (locked && this.state === 'paused') {
        this.state = 'playing';
        this.showOverlay(null);
      }
    });
    document.addEventListener('pointerlockerror', () => {
      this.hud.setHint('点击画面锁定鼠标以继续');
      setTimeout(() => this.hud.setHint(''), 2500);
    });

    addEventListener('keydown', (e) => {
      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.state === 'playing') this.hud.toggleScoreboard(true, this.soldiers);
        return;
      }
      if (this.state !== 'playing') return;
      this.player.keys.add(e.code);
      if (e.code === 'KeyR') this.player.weapon.startReload?.(this, this.player);
      if (e.code === 'KeyG') this.player.throwGrenade();
      if (e.code.startsWith('Digit')) {
        const n = parseInt(e.code.slice(5));
        if (n >= 1 && n <= 6) this.player.switchSlot(n);
      }
      if (e.code === 'Space') e.preventDefault();
    });
    addEventListener('keyup', (e) => {
      if (e.code === 'Tab') { this.hud.toggleScoreboard(false, this.soldiers); return; }
      this.player.keys.delete(e.code);
    });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement && this.state === 'playing') {
        this.player.onMouseMove(e.movementX, e.movementY);
      }
    });
    addEventListener('mousedown', (e) => {
      if (this.state !== 'playing' || (!document.pointerLockElement && !this.autotest)) return;
      if (e.button === 0) { this.player.fireHeld = true; this.player.fireClicked = true; }
      if (e.button === 2) this.player.adsHeld = true;
      if (e.button === 1) { e.preventDefault(); this.player.throwGrenade(); }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.player.fireHeld = false;
      if (e.button === 2) this.player.adsHeld = false;
    });
    addEventListener('wheel', (e) => {
      if (this.state !== 'playing') return;
      const order = ['rifle', 'shotgun', 'sniper', 'pistol', 'melee'];
      let i = order.indexOf(this.player.currentWeaponId);
      if (i < 0) i = 0;
      i = (i + (e.deltaY > 0 ? 1 : order.length - 1)) % order.length;
      this.player.switchWeapon(order[i]);
    }, { passive: true });
    addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- 主循环 ----------
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.fpsEma = this.fpsEma * 0.95 + (1 / Math.max(dt, 0.0001)) * 0.05;

    if (this.state === 'playing') {
      this.time += dt;
      this.timeLeft = Math.max(0, CONFIG.match.timeLimit - this.time);

      this.player.update(dt);
      for (const s of this.soldiers) if (!s.isPlayer) s.update(dt);

      // 投掷物 / 手里剑
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        if (!this.projectiles[i].update(dt)) {
          this.projectiles[i].dispose();
          this.projectiles.splice(i, 1);
        }
      }
      // 烟幕清理
      for (let i = this.smokeVolumes.length - 1; i >= 0; i--) {
        if (this.time > this.smokeVolumes[i].until) this.smokeVolumes.splice(i, 1);
      }

      // 重生
      for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
        const r = this.respawnQueue[i];
        if (r.soldier.isPlayer) this.hud.setRespawnTimer(r.at - this.time);
        if (this.time >= r.at) {
          this.respawnQueue.splice(i, 1);
          this.resetSoldier(r.soldier, this.pickSpawn(r.soldier.team));
        }
      }

      this.world.update(dt);
      this.effects.update(dt);
      this.effects.applyShake(this.camera, this.time);

      // 队友名牌：准星接近/扫过时浮现，移开后渐隐
      for (const s of this.soldiers) {
        if (s.isPlayer || !s.nameTag) continue;
        let target = 0;
        if (s.alive) {
          _v.set(s.pos.x, s.pos.y + 1.5, s.pos.z);
          const d = _v.distanceTo(this.camera.position);
          if (d < 70) {
            _v.sub(this.camera.position).normalize();
            this.camera.getWorldDirection(_v2);
            const dot = _v.dot(_v2);
            if (dot > 0.992) {   // 准星附近 ~7° 内
              _v.set(s.pos.x, s.pos.y + 1.5, s.pos.z);
              if (this.losFree(this.camera.position, _v)) {
                target = clamp((dot - 0.992) / 0.005, 0.2, 0.95);
              }
            }
          }
        }
        const mat = s.nameTag.material;
        mat.opacity = damp(mat.opacity, target, target > mat.opacity ? 14 : 1.8, dt);
      }

      // HUD
      const p = this.player;
      this.hud.setHealth(p.hp, p.maxHp);
      this.hud.setWeapon(p);
      this.hud.setStance(p.crouching ? '蹲伏' : p.keys.has('ShiftLeft') && p.speed2D > 4.5 ? '冲刺' : '站立',
        p.hp < p.maxHp && this.time - p.lastDamageAt > CONFIG.player.regenDelay);
      const spreadPx = 5 + p.weapon.currentSpread(p) * 620 * (CONFIG.baseFov / this.camera.fov);
      const scoped = p.weapon.def.scoped && p.ads > 0.6;
      this.hud.setScope(scoped);
      this.hud.setCrosshair(spreadPx, !scoped && p.alive);
      this.hud.setTimer(this.timeLeft);
      this.hud.setFps(this.fpsEma);
      this.hud.drawMinimap(this.soldiers, p, this.time);

      if (this.timeLeft <= 0) this.endMatch();
    }

    this.renderer.render(this.scene, this.camera);
  }
}

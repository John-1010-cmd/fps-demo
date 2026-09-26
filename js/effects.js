// ===== 特效：粒子 / 曳光 / 枪口火光 / 爆炸 / 震屏 =====
import * as THREE from 'three';
import { rand, clamp } from './utils.js';

function dotTexture(soft = true) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(soft ? 0.4 : 0.8, 'rgba(255,255,255,0.6)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
}

const MAXP = 900;

class ParticlePool {
  constructor(scene, texture, blending) {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(MAXP * 3);
    this.col = new Float32Array(MAXP * 3);
    this.vel = new Float32Array(MAXP * 3);
    this.life = new Float32Array(MAXP);   // 剩余寿命
    this.life0 = new Float32Array(MAXP);
    this.grav = new Float32Array(MAXP);
    this.baseCol = new Float32Array(MAXP * 3);
    this.head = 0;
    this.alive = 0;
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.PointsMaterial({
      size: 0.14, map: texture, vertexColors: true, transparent: true,
      blending, depthWrite: false, sizeAttenuation: true,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < MAXP; i++) this.pos[i * 3 + 1] = -999;
  }
  emit(x, y, z, vx, vy, vz, life, r, g, b, grav = 9) {
    const i = this.head;
    this.head = (this.head + 1) % MAXP;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = this.life0[i] = life;
    this.baseCol[i * 3] = r; this.baseCol[i * 3 + 1] = g; this.baseCol[i * 3 + 2] = b;
    this.grav[i] = grav;
  }
  update(dt) {
    for (let i = 0; i < MAXP; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -999; this.col[i * 3] = 0; this.col[i * 3 + 1] = 0; this.col[i * 3 + 2] = 0; continue; }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = this.life[i] / this.life0[i];
      this.col[i * 3] = this.baseCol[i * 3] * f;
      this.col[i * 3 + 1] = this.baseCol[i * 3 + 1] * f;
      this.col[i * 3 + 2] = this.baseCol[i * 3 + 2] * f;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.trauma = 0;
    const tex = dotTexture();
    this.sparks = new ParticlePool(scene, tex, THREE.AdditiveBlending);   // 火花/血雾/火焰
    this.smoke = new ParticlePool(scene, tex, THREE.NormalBlending);    // 烟/尘

    // 曳光弹池
    this.tracers = [];
    const tGeo = new THREE.BoxGeometry(0.03, 0.03, 1);
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({
        color: 0xffc36b, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.visible = false; scene.add(m);
      this.tracers.push({ mesh: m, life: 0 });
    }

    // 枪口火光精灵池
    this.flashes = [];
    const flashMat = new THREE.SpriteMaterial({
      map: dotTexture(false), color: 0xffc36b, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(flashMat.clone());
      s.visible = false; scene.add(s);
      this.flashes.push({ sprite: s, life: 0 });
    }

    // 光源池（枪口/爆炸共用）
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xffb060, 0, 14, 2);
      scene.add(l);
      this.lights.push({ light: l, life: 0, life0: 1, peak: 0 });
    }

    // 爆炸火球池
    this.booms = [];
    const bGeo = new THREE.SphereGeometry(1, 16, 12);
    for (let i = 0; i < 4; i++) {
      const m = new THREE.Mesh(bGeo, new THREE.MeshBasicMaterial({
        color: 0xffa040, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      m.visible = false; scene.add(m);
      this.booms.push({ mesh: m, life: 0 });
    }

    // 烟幕云团
    this.smokeTex = dotTexture(true);
    this.clouds = [];
  }

  smokeCloud(pos, dur = 13) {
    const sprites = [];
    for (let i = 0; i < 15; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: this.smokeTex, color: 0xc2c7cc, transparent: true, opacity: 0, depthWrite: false,
      }));
      s.position.set(pos.x + rand(-1.8, 1.8), pos.y + rand(0.2, 2.4), pos.z + rand(-1.8, 1.8));
      const sc = rand(2.2, 3.2);
      s.scale.set(sc, sc, 1);
      this.scene.add(s);
      sprites.push({ s, grow: rand(0.3, 0.6), lift: rand(0.04, 0.16), o: rand(0.5, 0.68) });
    }
    this.clouds.push({ sprites, start: performance.now() / 1000, dur });
  }

  shake(amount) { this.trauma = clamp(this.trauma + amount, 0, 1); }

  tracer(from, to, color = 0xffc36b) {
    let best = this.tracers[0];
    for (const t of this.tracers) if (t.life < best.life) best = t;
    const m = best.mesh;
    m.material.color.setHex(color);
    const len = from.distanceTo(to);
    m.position.copy(from).lerp(to, 0.5);
    m.scale.set(1, 1, Math.max(len, 0.1));
    m.lookAt(to);
    m.visible = true;
    m.material.opacity = 0.85;
    best.life = 0.08;
  }

  muzzleFlash(pos, big = false) {
    let best = this.flashes[0];
    for (const f of this.flashes) if (f.life < best.life) best = f;
    best.sprite.position.copy(pos);
    const s = big ? rand(0.5, 0.75) : rand(0.28, 0.42);
    best.sprite.scale.set(s, s, 1);
    best.sprite.material.rotation = rand(0, 6.28);
    best.sprite.visible = true;
    best.sprite.material.opacity = 0.95;
    best.life = 0.05;
    this._light(pos, 0xffb060, big ? 5 : 3, 0.05);
  }

  impact(point, normal) {
    for (let i = 0; i < 7; i++) {
      const s = rand(2, 6);
      this.sparks.emit(
        point.x, point.y, point.z,
        (normal.x + rand(-0.7, 0.7)) * s, (normal.y + rand(0.1, 0.9)) * s, (normal.z + rand(-0.7, 0.7)) * s,
        rand(0.15, 0.4), 1.0, 0.8, 0.45, 11);
    }
    for (let i = 0; i < 3; i++) {
      this.smoke.emit(point.x, point.y, point.z,
        normal.x * rand(0.2, 0.8), rand(0.4, 1), normal.z * rand(0.2, 0.8),
        rand(0.4, 0.8), 0.28, 0.27, 0.25, -0.5);
    }
  }

  blood(point) {
    for (let i = 0; i < 10; i++) {
      const s = rand(1, 4);
      this.sparks.emit(point.x, point.y, point.z,
        rand(-1, 1) * s, rand(0.5, 2.5), rand(-1, 1) * s,
        rand(0.2, 0.45), 0.55, 0.05, 0.03, 10);
    }
  }

  explosion(pos) {
    // 火球
    let b = this.booms[0];
    for (const x of this.booms) if (x.life < b.life) b = x;
    b.mesh.position.copy(pos);
    b.mesh.visible = true; b.life = 0.5;
    // 火光 + 烟尘 + 火花
    for (let i = 0; i < 26; i++) {
      const a = rand(0, Math.PI * 2), e = rand(-0.4, 1), s = rand(3, 11);
      this.sparks.emit(pos.x, pos.y + 0.2, pos.z,
        Math.cos(a) * s, e * s * 0.8 + 3, Math.sin(a) * s,
        rand(0.25, 0.6), 1.0, rand(0.4, 0.7), 0.2, 9);
    }
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2), s = rand(0.8, 3.2);
      this.smoke.emit(pos.x, pos.y + rand(0.1, 0.8), pos.z,
        Math.cos(a) * s, rand(1.5, 4), Math.sin(a) * s,
        rand(0.9, 1.8), 0.22, 0.21, 0.2, -1.2);
    }
    this._light(pos, 0xff9040, 30, 0.4);
  }

  _light(pos, color, intensity, life) {
    let best = this.lights[0];
    for (const l of this.lights) if (l.life < best.life) best = l;
    best.light.position.copy(pos);
    best.light.position.y += 0.3;
    best.light.color.setHex(color);
    best.light.intensity = intensity;
    best.peak = intensity;
    best.life = best.life0 = life;
  }

  update(dt) {
    this.sparks.update(dt);
    this.smoke.update(dt);
    for (const t of this.tracers) {
      if (t.life > 0) {
        t.life -= dt;
        t.mesh.material.opacity = Math.max(0, t.life / 0.08) * 0.85;
        if (t.life <= 0) t.mesh.visible = false;
      }
    }
    for (const f of this.flashes) {
      if (f.life > 0) {
        f.life -= dt;
        f.sprite.material.opacity = Math.max(0, f.life / 0.05) * 0.95;
        if (f.life <= 0) f.sprite.visible = false;
      }
    }
    for (const l of this.lights) {
      if (l.life > 0) {
        l.life -= dt;
        l.light.intensity = Math.max(0, l.life / l.life0) * l.peak;
      }
    }
    for (const b of this.booms) {
      if (b.life > 0) {
        b.life -= dt;
        const f = 1 - b.life / 0.5;
        b.mesh.scale.setScalar(0.5 + f * 5.5);
        b.mesh.material.opacity = Math.max(0, 0.9 - f * 1.1);
        if (b.life <= 0) b.mesh.visible = false;
      }
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.6);

    // 烟幕云团动画
    const now = performance.now() / 1000;
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      const age = now - c.start;
      if (age > c.dur) {
        for (const sp of c.sprites) { this.scene.remove(sp.s); sp.s.material.dispose(); }
        this.clouds.splice(i, 1);
        continue;
      }
      const fade = Math.min(1, age / 0.8) * Math.min(1, (c.dur - age) / 2.8);
      for (const sp of c.sprites) {
        sp.s.material.opacity = sp.o * fade;
        const s = sp.s.scale.x + sp.grow * dt;
        sp.s.scale.set(s, s, 1);
        sp.s.position.y += sp.lift * dt;
      }
    }
  }

  // 相机震动偏移（在相机定位后调用）
  applyShake(camera, t) {
    if (this.trauma <= 0) return;
    const s = this.trauma * this.trauma;
    camera.rotation.x += Math.sin(t * 91) * 0.028 * s;
    camera.rotation.y += Math.cos(t * 83) * 0.028 * s;
    camera.rotation.z += Math.sin(t * 71) * 0.02 * s;
  }
}

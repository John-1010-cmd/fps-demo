// ===== HUD / 小地图 / 播报 =====
import { TEAM, CONFIG, THROWABLES, MELEE } from './config.js';
import { clamp } from './utils.js';

const $ = (id) => document.getElementById(id);

const SKULL_SVG_PATH = 'M12 2C6.48 2 2 6.48 2 12c0 2.85 1.2 5.42 3.12 7.24L6.5 22h11l1.38-2.76C20.8 17.42 22 14.85 22 12c0-5.52-4.48-10-10-10zm-3.5 8a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zm7 0a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z';

export class HUD {
  constructor() {
    this.el = {
      hud: $('hud'), minimap: $('minimap'),
      scoreBlue: $('score-blue'), scoreRed: $('score-red'), timer: $('match-timer'),
      killfeed: $('killfeed'), fps: $('fps-counter'),
      crosshair: $('crosshair'), hitmarker: $('hitmarker'),
      scope: $('scope-overlay'), vignette: $('vignette'), dirHit: $('dir-hit'),
      banner: $('banner'), bannerMain: $('banner-main'), bannerSub: $('banner-sub'),
      healthBar: $('health-bar'), healthNum: $('health-num'),
      stance: $('stance-txt'), regen: $('regen-txt'),
      weaponName: $('weapon-name'), ammoMag: $('ammo-mag'), ammoReserve: $('ammo-reserve'),
      nadeCount: $('nade-count'), reloadTxt: $('reload-txt'),
      nadeRow: $('nade-row'), flash: $('flash-overlay'),
      hint: $('hint'),
      respawn: $('respawn-overlay'), respawnKiller: $('respawn-killer'), respawnTimer: $('respawn-timer'),
      scoreboard: $('scoreboard'), sbBody: $('sb-body'),
      error: $('error-overlay'),
      damageReport: $('damage-report'), killstreak: $('killstreak'), ksText: $('ks-text'),
      killCounter: $('kill-counter'), killNum: $('kill-num'),
    };
    this._bannerT = null;
    this._hmT = null;
    this._drT = null;
    this._ksT = null;
    this._mmStatic = null;
    this.el.fps.style.display = 'none';
    this._kc = 0;
  }

  show() { this.el.hud.classList.remove('hidden'); }
  hide() { this.el.hud.classList.add('hidden'); }

  setFpsVisible(v) { this.el.fps.style.display = v ? 'block' : 'none'; }
  setFps(v) { this.el.fps.textContent = Math.round(v); }

  setHealth(hp, maxHp) {
    const f = clamp(hp / maxHp, 0, 1);
    this.el.healthBar.style.width = (f * 100).toFixed(1) + '%';
    this.el.healthBar.classList.toggle('low', f < 0.35);
    this.el.healthNum.textContent = Math.ceil(hp);
  }

  setStance(text, regen) {
    this.el.stance.textContent = text;
    this.el.regen.textContent = regen ? '回复中 +' : '';
  }

  setWeapon(player) {
    const w = player.weapon;
    this.el.weaponName.textContent = w.def.name;
    if (player.currentWeaponId === 'melee') {
      const mv = player.meleeWeapon;
      if (mv.variant === 'shuriken') {
        this.el.ammoMag.textContent = mv.shurikens;
        this.el.ammoMag.classList.toggle('empty', mv.shurikens === 0);
        this.el.ammoReserve.textContent = '枚';
      } else {
        this.el.ammoMag.textContent = '—';
        this.el.ammoMag.classList.remove('empty');
        this.el.ammoReserve.textContent = '';
      }
      this.el.reloadTxt.textContent = '连按 5 切换：刀/斧/铲/手里剑';
    } else {
      this.el.ammoMag.textContent = w.ammo;
      this.el.ammoMag.classList.toggle('empty', w.ammo === 0);
      this.el.ammoReserve.textContent = w.reserve;
      this.el.reloadTxt.textContent = w.reloading > 0 ? '换弹中...' : (w.ammo === 0 && w.reserve === 0 ? '弹药耗尽' : '');
    }
    const t = THROWABLES[player.throwableSel];
    this.el.nadeCount.textContent = `${t.name}×${player.throwables[player.throwableSel]}`;
    this.el.nadeRow.title = 'G 投掷 / 6 切换类型';
  }

  flashWhite(dur = 2) {
    const f = this.el.flash;
    f.style.transition = 'none';
    f.style.opacity = 0.98;
    requestAnimationFrame(() => {
      f.style.transition = `opacity ${(dur + 0.6).toFixed(2)}s ease-out`;
      f.style.opacity = 0;
    });
  }

  setScores(a, b) {
    this.el.scoreBlue.textContent = a;
    this.el.scoreRed.textContent = b;
  }

  setKillCount(n) {   // 底部中央个人击杀累计，增加时跳动
    if (n === this._kc) return;
    const up = n > this._kc;
    this._kc = n;
    this.el.killNum.textContent = n;
    if (up) {
      const kc = this.el.killCounter;
      kc.classList.remove('pop'); void kc.offsetWidth; kc.classList.add('pop');
    }
  }

  setTimer(sec, countdown = true) {
    const m = Math.floor(sec / 60), s = Math.max(0, Math.floor(sec % 60));
    this.el.timer.textContent = `${m}:${String(s).padStart(2, '0')}`;
    this.el.timer.style.color = (countdown && sec < 60) ? '#ff5a4d' : '';
  }

  setCrosshair(gapPx, visible) {
    this.el.crosshair.style.setProperty('--ch-gap', gapPx.toFixed(1) + 'px');
    this.el.crosshair.classList.toggle('hidden', !visible);
  }

  setScope(v) { this.el.scope.classList.toggle('visible', v); }

  hitmarker(kill, head) {
    const h = this.el.hitmarker;
    h.classList.remove('fade');
    h.classList.add('show');
    h.classList.toggle('kill', !!kill);
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => { h.classList.remove('show'); h.classList.add('fade'); }, kill ? 220 : 90);
  }

  damageFlash(strength = 0.7) {
    const v = this.el.vignette;
    v.style.opacity = strength;
    clearTimeout(this._vigT);
    this._vigT = setTimeout(() => { v.style.opacity = 0; }, 160);
  }

  dirHit(angleWorld, playerYaw) {
    // 相对朝向旋转伤害方向弧
    const rel = angleWorld - playerYaw;
    const d = this.el.dirHit;
    d.style.transform = `rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg)`;
    d.style.opacity = 0.95;
    clearTimeout(this._dirT);
    this._dirT = setTimeout(() => { d.style.opacity = 0; }, 500);
  }

  killfeed(attackerName, attackerTeam, victimName, victimTeam, weaponShort, headshot) {
    const div = document.createElement('div');
    div.className = 'kf-entry';
    const a = attackerTeam === 'A' ? 'blue' : 'red';
    const v = victimTeam === 'A' ? 'blue' : 'red';
    const hsIcon = `<span class="hs"><svg viewBox="0 0 24 24" width="12" height="12" style="vertical-align:-2px;" fill="#ffb84d"><path fill-rule="evenodd" d="${SKULL_SVG_PATH}"/></svg></span>`;
    div.innerHTML = `<span class="${a}">${attackerName}</span><span class="wpn">[${weaponShort}]</span>${headshot ? hsIcon : ''}<span class="${v}">${victimName}</span>`;
    this.el.killfeed.appendChild(div);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.firstChild.remove();
    setTimeout(() => { div.classList.add('out'); setTimeout(() => div.remove(), 600); }, 4600);
  }

  banner(main, sub = '', dur = 1600) {
    const b = this.el.banner;
    this.el.bannerMain.textContent = main;
    this.el.bannerSub.textContent = sub;
    b.classList.remove('fade'); b.classList.add('show');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => { b.classList.remove('show'); b.classList.add('fade'); }, dur);
  }

  showRespawn(killerText) {
    this.el.respawn.classList.add('visible');
    this.el.respawnKiller.textContent = killerText;
  }
  setRespawnTimer(t) { this.el.respawnTimer.textContent = Math.ceil(t); }
  hideRespawn() { this.el.respawn.classList.remove('visible'); }

  damageReport(map) {
    if (!this.el.damageReport) return;
    const list = map ? Array.from(map.values()).sort((a, b) => (b.dmg || 0) - (a.dmg || 0)).slice(0, 6) : [];
    let rows = '';
    if (list.length === 0) {
      rows = '<div class="dr-row">本回合未对敌人造成伤害</div>';
    } else {
      rows = list.map(e => `<div class="dr-row"><span class="dr-name">对 ${e.name}</span><span class="dr-dmg">造成 ${Math.round(e.dmg)} 伤害</span></div>`).join('');
    }
    this.el.damageReport.innerHTML = `<div class="dr-title">◆ 伤害输出</div>${rows}`;
    this.el.damageReport.classList.add('visible');
    clearTimeout(this._drT);
    this._drT = setTimeout(() => this.hideDamageReport(), 6500);
  }

  hideDamageReport() {
    clearTimeout(this._drT);
    if (this.el.damageReport) this.el.damageReport.classList.remove('visible');
  }

  killstreak(n, headshot) {
    const ks = this.el.killstreak;
    if (!ks) return;
    const labels = ['击杀', '双杀', '三连杀', '四连杀', '超神连杀'];
    const tier = Math.min(Math.max(1, n || 1), 5);
    const text = labels[tier - 1];
    ks.className = `ks-${tier}`;
    if (headshot) {
      ks.classList.add('ks-hs');
      const skullSvg = `<svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path fill-rule="evenodd" d="${SKULL_SVG_PATH}"/></svg>`;
      if (this.el.ksText) this.el.ksText.innerHTML = skullSvg + text;
    } else {
      ks.classList.remove('ks-hs');
      if (this.el.ksText) this.el.ksText.innerHTML = text;
    }
    ks.classList.remove('show', 'fade');
    void this.el.killstreak.offsetWidth;
    ks.classList.add('show');
    clearTimeout(this._ksT);
    this._ksT = setTimeout(() => {
      ks.classList.remove('show');
      ks.classList.add('fade');
    }, 1400);
  }

  setHint(text) {
    this.el.hint.textContent = text;
    this.el.hint.classList.toggle('visible', !!text);
  }

  toggleScoreboard(v, soldiers) {
    this.el.scoreboard.classList.toggle('visible', v);
    if (v) this.updateScoreboard(soldiers, this.el.sbBody);
  }

  updateScoreboard(soldiers, tbody) {
    const rows = [...soldiers].sort((x, y) => (x.team === y.team ? y.kills - x.kills : x.team < y.team ? -1 : 1));
    tbody.innerHTML = rows.map(s => {
      const c = s.team === 'A' ? TEAM.A.css : TEAM.B.css;
      const kd = (s.kills / Math.max(1, s.deaths)).toFixed(2);
      return `<tr class="${s.isPlayer ? 'me' : ''} ${s.alive ? '' : 'dead'}">
        <td style="color:${c}">${s.isPlayer ? '▶ ' : ''}${s.name}</td>
        <td>${s.kills}</td><td>${s.assists}</td><td>${s.deaths}</td><td>${kd}</td></tr>`;
    }).join('');
  }

  // ---------- 小地图 ----------
  initMinimap(world) {
    const S = 176 / 25.2;
    const mapH = Math.ceil(85.2 * S);
    const c = document.createElement('canvas');
    c.width = 176;
    c.height = mapH;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(8,14,20,0.9)';
    g.fillRect(0, 0, 176, mapH);
    // 甲板
    const px = (x) => (x + 12.6) * S;
    const py = (z) => (z + 42.6) * S;
    g.fillStyle = '#2a3540';
    g.fillRect(0, 0, 176, mapH);
    g.strokeStyle = 'rgba(232,182,76,0.6)';
    g.strokeRect(0, 0, 176, mapH);
    // 障碍
    for (const m of world.minimap) {
      const shade = m.h > 2.5 ? '#6a7683' : m.h > 1.5 ? '#566270' : '#414c58';
      g.fillStyle = shade;
      g.fillRect(px(m.x - m.w / 2), py(m.z - m.d / 2), Math.max(m.w * S, 2), Math.max(m.d * S, 2));
    }
    this._mmStatic = c;
  }

  drawMinimap(soldiers, player, time) {
    const ctx = this.el.minimap.getContext('2d');
    const S = 176 / 25.2;
    const px = (x) => (x + 12.6) * S;
    const py = (z) => (z + 42.6) * S;

    const camX = clamp(px(player.pos.x) - 88, 0, Math.max(0, 176 - 176));
    const camY = clamp(py(player.pos.z) - 88, 0, Math.ceil(85.2 * S) - 176);

    if (this._mmStatic) {
      ctx.drawImage(this._mmStatic, camX, camY, 176, 176, 0, 0, 176, 176);
    } else {
      ctx.clearRect(0, 0, 176, 176);
    }

    for (const s of soldiers) {
      if (!s.alive || s.isPlayer) continue;
      const sx = px(s.pos.x) - camX;
      const sy = py(s.pos.z) - camY;
      if (sx < 0 || sx > 176 || sy < 0 || sy > 176) continue;
      if (s.team === player.team) {
        ctx.fillStyle = '#4da3ff';
      } else {
        // 敌人仅在近期开火时暴露
        if (time - (s.lastShotAt || -99) > 3) continue;
        ctx.fillStyle = '#ff5a4d';
      }
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, 7);
      ctx.fill();
    }
    // 玩家箭头
    if (player.alive) {
      const x = px(player.pos.x) - camX;
      const y = py(player.pos.z) - camY;
      const ang = Math.atan2(-Math.cos(player.yaw), -Math.sin(player.yaw));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(6, 0); ctx.lineTo(-4, -4); ctx.lineTo(-2, 0); ctx.lineTo(-4, 4);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  error(msg) {
    this.el.error.textContent += msg + '\n';
    this.el.error.classList.add('visible');
  }
}

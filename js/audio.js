// ===== Web Audio 合成音效（无外部音频资源） =====
import { clamp, rand } from './utils.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.8;
    this.listener = { pos: null, right: null }; // 由 game 每帧更新
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { this.enabled = false; return; }
    this.ctx = new AC();
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 5;
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.comp); this.comp.connect(this.ctx.destination);
    this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
    this.amb = this.ctx.createGain(); this.amb.gain.value = 0.5; this.amb.connect(this.master);
    // 共享噪声缓冲
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this._startAmbient();
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  // 距离衰减 + 声像
  _spatial(dist, pan = 0, refDist = 8, maxDist = 70) {
    const g = clamp(refDist / (refDist + dist * dist * 0.09), 0, 1);
    if (dist > maxDist) return null;
    return { gain: g, pan: clamp(pan, -1, 1) };
  }

  _out(dist, pan, refDist, maxDist) {
    const s = this._spatial(dist, pan, refDist, maxDist);
    if (!s) return null;
    const g = this.ctx.createGain(); g.gain.value = s.gain;
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = s.pan;
      g.connect(p); p.connect(this.sfx);
    } else g.connect(this.sfx);
    return g;
  }

  _noise(dur, { f0 = 2000, f1 = 400, type = 'lowpass', gain = 1, q = 0.8 } = {}) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    src.playbackRate.value = rand(0.92, 1.08);
    const flt = this.ctx.createBiquadFilter();
    flt.type = type; flt.Q.value = q;
    flt.frequency.setValueAtTime(f0, this.ctx.currentTime);
    flt.frequency.exponentialRampToValueAtTime(Math.max(f1, 30), this.ctx.currentTime + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    src.connect(flt); flt.connect(g);
    src.start(); src.stop(this.ctx.currentTime + dur + 0.05);
    return g;
  }

  _tone(freq, dur, { type = 'square', gain = 0.3, slide = 0 } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), this.ctx.currentTime + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); o.start(); o.stop(this.ctx.currentTime + dur + 0.05);
    return g;
  }

  // ---- 具体音效 ----
  shot(kind, dist = 0, pan = 0) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, kind === 'sniper' ? 14 : 9, 120);
    if (!out) return;
    if (kind === 'sniper') {
      this._noise(0.42, { f0: 3600, f1: 90, gain: 1.6 }).connect(out);
      this._tone(65, 0.3, { type: 'sine', gain: 0.9, slide: -35 }).connect(out);
    } else if (kind === 'shotgun') {
      this._noise(0.26, { f0: 2000, f1: 130, gain: 1.5, q: 0.6 }).connect(out);
      this._tone(95, 0.16, { type: 'sine', gain: 0.8, slide: -50 }).connect(out);
    } else if (kind === 'rifle') {
      this._noise(0.14, { f0: 2800, f1: 240, gain: 1.15 }).connect(out);
      this._tone(160, 0.06, { type: 'sawtooth', gain: 0.32, slide: -90 }).connect(out);
    } else {
      this._noise(0.09, { f0: 3400, f1: 500, gain: 0.85 }).connect(out);
      this._tone(240, 0.045, { type: 'square', gain: 0.2, slide: -140 }).connect(out);
    }
  }

  dryFire() { if (!this.ctx) return; this._tone(1400, 0.03, { gain: 0.16 }).connect(this.sfx); }

  reload(stage, dist = 0, pan = 0) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, 6, 30); if (!out) return;
    const f = [900, 500, 1300][stage % 3];
    this._tone(f, 0.05, { type: 'square', gain: 0.22, slide: -f * 0.4 }).connect(out);
  }

  footstep(dist = 0, pan = 0, run = false) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, 3.2, 24); if (!out) return;
    this._noise(0.07, { f0: run ? 900 : 700, f1: 120, gain: run ? 0.4 : 0.26, q: 1.4 }).connect(out);
  }

  hit(head = false) {  // 命中反馈（攻击方）
    if (!this.ctx) return;
    this._tone(head ? 2100 : 1500, 0.05, { gain: 0.3 }).connect(this.sfx);
  }

  hurt() {  // 被打
    if (!this.ctx) return;
    this._tone(220, 0.12, { type: 'sawtooth', gain: 0.25, slide: -120 }).connect(this.sfx);
    this._noise(0.08, { f0: 700, f1: 200, gain: 0.25 }).connect(this.sfx);
  }

  whiz(dist, pan) { // 子弹擦过
    if (!this.ctx) return;
    const out = this._out(dist, pan, 2, 10); if (!out) return;
    this._noise(0.12, { f0: 5000, f1: 800, type: 'bandpass', gain: 0.4, q: 2 }).connect(out);
  }

  explosion(dist = 0, pan = 0) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, 22, 220); if (!out) return;
    this._noise(0.85, { f0: 1500, f1: 45, gain: 2.2, q: 0.5 }).connect(out);
    this._tone(52, 0.7, { type: 'sine', gain: 1.4, slide: -28 }).connect(out);
    this._noise(0.25, { f0: 6000, f1: 1200, type: 'highpass', gain: 0.4 }).connect(out);
  }

  nadeBounce(dist, pan) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, 5, 30); if (!out) return;
    this._tone(700, 0.04, { gain: 0.3, slide: -350 }).connect(out);
  }

  nadeThrow() {
    if (!this.ctx) return;
    this._noise(0.18, { f0: 900, f1: 2200, type: 'bandpass', gain: 0.2, q: 1.5 }).connect(this.sfx);
  }

  meleeSwing() {
    if (!this.ctx) return;
    this._noise(0.14, { f0: 600, f1: 2600, type: 'bandpass', gain: 0.22, q: 2 }).connect(this.sfx);
  }

  meleeHit(dist = 0, pan = 0) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, 6, 40); if (!out) return;
    this._tone(180, 0.08, { type: 'square', gain: 0.35, slide: -110 }).connect(out);
    this._noise(0.07, { f0: 1100, f1: 250, gain: 0.4 }).connect(out);
  }

  smokePop(dist = 0, pan = 0) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, 12, 80); if (!out) return;
    this._noise(0.5, { f0: 900, f1: 150, gain: 0.7 }).connect(out);
    this._tone(300, 0.12, { gain: 0.3, slide: -160 }).connect(out);
    // 持续喷发声
    const n = this._noise(2.2, { f0: 5000, f1: 3000, type: 'highpass', gain: 0.12 });
    n.connect(out);
  }

  flashbang(dist = 0, pan = 0) {
    if (!this.ctx) return;
    const out = this._out(dist, pan, 18, 160); if (!out) return;
    this._noise(0.3, { f0: 5000, f1: 500, gain: 1.6 }).connect(out);
    this._tone(180, 0.2, { type: 'sine', gain: 0.8, slide: -100 }).connect(out);
  }

  tinnitus(dur = 2) {  // 闪光耳鸣
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 3300;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.sfx);
    o.start(); o.stop(this.ctx.currentTime + dur + 0.05);
  }

  uiClick() { if (!this.ctx) return; this._tone(880, 0.05, { gain: 0.18 }).connect(this.sfx); }

  beep(final = false) {
    if (!this.ctx) return;
    this._tone(final ? 1320 : 880, final ? 0.3 : 0.09, { gain: 0.28 }).connect(this.sfx);
  }

  multikill(n) { // 连杀播报音
    if (!this.ctx) return;
    const base = 660 + n * 110;
    [0, 0.09, 0.18].forEach((t, i) => {
      setTimeout(() => this.ctx && this._tone(base + i * 160, 0.1, { gain: 0.24 }).connect(this.sfx), t * 1000);
    });
  }

  killConfirm() { // 击杀确认音
    if (!this.ctx) return;
    this._tone(1900, 0.06, { gain: 0.22 }).connect(this.sfx);
    setTimeout(() => this.ctx && this._tone(2600, 0.09, { gain: 0.16 }).connect(this.sfx), 40);
  }

  _killOut(spatial) {
    if (!spatial) return this.sfx;
    const out = this._out(spatial.dist, spatial.pan, 4, 28);
    if (!out) return null;
    const g = this.ctx.createGain();
    g.gain.value = 0.5;
    g.connect(out);
    return g;
  }

  _killTone(out, freq, delay, dur, gain, type = 'sine', endFreq = freq) {
    const start = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, start);
    if (endFreq !== freq) o.frequency.exponentialRampToValueAtTime(endFreq, start + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, start);
    g.gain.linearRampToValueAtTime(gain, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    o.connect(g); g.connect(out);
    o.start(start); o.stop(start + dur + 0.02);
  }

  headshotKill(spatial) {
    if (!this.ctx) return;
    const out = this._killOut(spatial); if (!out) return;
    this._noise(0.04, { f0: 7800, f1: 4200, type: 'highpass', gain: 0.28 }).connect(out);
    this._killTone(out, 3100, 0.06, 0.12, 0.24);
    this._killTone(out, 4100, 0.15, 0.14, 0.28);
    this._killTone(out, 5200, 0.25, 0.22, 0.32);
  }

  fragKill(spatial) {
    if (!this.ctx) return;
    const lastAt = spatial ? this.lastRemoteFragKillAt : this.lastLocalFragKillAt;
    if (lastAt !== undefined && this.ctx.currentTime - lastAt < 0.15) return;
    const out = this._killOut(spatial); if (!out) return;
    if (spatial) this.lastRemoteFragKillAt = this.ctx.currentTime;
    else this.lastLocalFragKillAt = this.ctx.currentTime;
    this._killTone(out, 740, 0.30, 0.22, 0.36, 'triangle', 500);
    this._killTone(out, 530, 0.55, 0.29, 0.42, 'triangle', 290);
    this._killTone(out, 1060, 0.55, 0.18, 0.14, 'sine', 600);
  }

  meleeKill(spatial) {
    if (!this.ctx) return;
    const out = this._killOut(spatial); if (!out) return;
    this._killTone(out, 1430, 0.12, 0.30, 0.32, 'triangle', 650);
    this._killTone(out, 2030, 0.12, 0.23, 0.19, 'sine', 1050);
    this._killTone(out, 360, 0.31, 0.14, 0.12, 'square', 240);
  }

  win(win) {
    if (!this.ctx) return;
    const notes = win ? [523, 659, 784, 1046] : [392, 330, 262, 196];
    notes.forEach((f, i) => setTimeout(() => this.ctx &&
      this._tone(f, 0.28, { type: 'triangle', gain: 0.3 }).connect(this.sfx), i * 170));
  }

  _startAmbient() {
    // 海浪：循环噪声 + 低通 + 缓慢 LFO
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass'; flt.frequency.value = 320;
    const g = this.ctx.createGain(); g.gain.value = 0.16;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.14;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.07;
    lfo.connect(lfoG); lfoG.connect(g.gain);
    src.connect(flt); flt.connect(g); g.connect(this.amb);
    src.start(); lfo.start();
    // 偶尔海鸥
    const gull = () => {
      if (this.ctx) {
        const t = this._tone(rand(1000, 1400), 0.35, { type: 'sine', gain: 0.05, slide: -500 });
        t.connect(this.amb);
        setTimeout(gull, rand(8000, 22000));
      }
    };
    setTimeout(gull, 6000);
  }
}

// ===== 全局配置 =====
export const CONFIG = {
  baseFov: 75,
  player: {
    height: 1.75, crouchHeight: 1.28, radius: 0.35, eyeRatio: 0.93,
    walk: 4.3, sprint: 6.5, crouch: 2.2,
    accel: 42, airAccel: 11, friction: 10.5,
    jump: 5.4, gravity: 15, stepHeight: 0.56,
    hp: 100, regenDelay: 5, regenRate: 16,
  },
  match: {
    teamSize: 5, scoreLimit: 50, timeLimit: 600,
    respawnDelay: 3, spawnProtect: 2,
  },
  // 伤害部位倍率（腹部/四肢伤害折减；相对受害者身高划分：腿部 <45% 身高、腹部 45%~68%、胸部 >68%，爆头仍走头部球体判定和 def.headMult）
  hitZones: { chest: 1.0, abdomen: 0.92, legs: 0.72 },
  grenade: {
    count: 2, fuse: 2.6, radius: 7.5, maxDmg: 112, minDmg: 14,
    throwSpeed: 17.5, gravity: 14, bounce: 0.42, radiusPhys: 0.12,
  },
  bot: {
    thinkInterval: 0.1, repathInterval: 2.5,
    viewDist: 65, fovCos: -0.25,   // cos(105°) 视角
    hearGunshot: 45,
  },
};

export const WEAPONS = {
  rifle: {
    id: 'rifle', name: 'AK-47 突击步枪', short: 'AK-47', slot: 1,
    auto: true, rpm: 600, damage: 30, headMult: 2.0,
    mag: 30, reserve: 120, reloadTime: 2.2, switchTime: 0.45,
    spreadHip: 0.020, spreadAds: 0.0055, bloomPerShot: 0.0055, bloomMax: 0.035, bloomRecover: 0.09,
    recoil: 0.0115, recoilSide: 0.004,
    rangeStart: 28, rangeEnd: 75, minDmgMult: 0.62,
    zoomFov: 50, scoped: false, moveMult: 1.0,
    tracer: 0xffc36b, shotGain: 1.0,
  },
  pistol: {
    id: 'pistol', name: 'M9 手枪', short: 'M9', slot: 2,
    auto: false, rpm: 380, damage: 24, headMult: 2.0,
    mag: 15, reserve: 60, reloadTime: 1.5, switchTime: 0.3,
    spreadHip: 0.013, spreadAds: 0.004, bloomPerShot: 0.011, bloomMax: 0.04, bloomRecover: 0.14,
    recoil: 0.017, recoilSide: 0.005,
    rangeStart: 15, rangeEnd: 48, minDmgMult: 0.5,
    zoomFov: 58, scoped: false, moveMult: 1.05,
    tracer: 0xfff2b0, shotGain: 0.7,
  },
  sniper: {
    id: 'sniper', name: 'AWM 狙击枪', short: 'AWM', slot: 3,
    auto: false, rpm: 46, damage: 96, headMult: 2.1,
    mag: 5, reserve: 25, reloadTime: 3.1, switchTime: 0.7,
    spreadHip: 0.055, spreadAds: 0.0011, bloomPerShot: 0.06, bloomMax: 0.08, bloomRecover: 0.05,
    recoil: 0.06, recoilSide: 0.01,
    rangeStart: 90, rangeEnd: 160, minDmgMult: 0.9,
    zoomFov: 8, scoped: true, moveMult: 0.92,
    tracer: 0xbfe3ff, shotGain: 1.5,
  },
  shotgun: {
    id: 'shotgun', name: 'M870 霰弹枪', short: 'M870', slot: 2,
    auto: false, rpm: 70, damage: 11, headMult: 1.5, pellets: 9,
    mag: 6, reserve: 30, reloadTime: 2.8, switchTime: 0.5,
    spreadHip: 0.046, spreadAds: 0.033, bloomPerShot: 0.02, bloomMax: 0.05, bloomRecover: 0.06,
    recoil: 0.05, recoilSide: 0.012,
    rangeStart: 8, rangeEnd: 30, minDmgMult: 0.22,
    zoomFov: 56, scoped: false, moveMult: 0.98,
    tracer: 0xffa050, shotGain: 1.3,
  },
};
// 数字键槽位（枪械）
export const GUN_ORDER = ['rifle', 'shotgun', 'sniper', 'pistol'];
export const WEAPON_ORDER = GUN_ORDER;
// 循环切枪顺序（Q / E / 滚轮）：槽位 1→2→3→4→近战
export const CYCLE_ORDER = [...GUN_ORDER, 'melee'];

// 近战武器（手里剑为投掷型近战）
export const MELEE = {
  knife:   { name: '军用匕首', short: '匕首', damage: 55, rate: 1.7, range: 2.3, swing: 0.32 },
  axe:     { name: '军用手斧', short: '斧头', damage: 92, rate: 0.9, range: 2.4, swing: 0.45 },
  shovel:  { name: '工兵铁铲', short: '铁铲', damage: 70, rate: 1.2, range: 2.5, swing: 0.38 },
  shuriken:{ name: '手里剑', short: '手里剑', damage: 65, rate: 1.5, range: 60, count: 5, speed: 30, swing: 0.2 },
};
export const MELEE_ORDER = ['knife', 'axe', 'shovel', 'shuriken'];

// 投掷物
export const THROWABLES = {
  frag:  { name: '手雷',   short: '手雷', count: 2, color: 0x3a4a32 },
  smoke: { name: '烟雾弹', short: '烟雾', count: 2, color: 0x8a8f96, dur: 13, radius: 4.5 },
  flash: { name: '闪光弹', short: '闪光', count: 2, color: 0xc9b34a, radius: 20 },
};
export const THROW_ORDER = ['frag', 'smoke', 'flash'];

export const DIFFICULTY = {
  easy:   { label: '简单', reaction: 0.62, aimErr: 0.055, aimDecay: 0.75, burst: [2, 4], strafe: 0.9, hearMult: 0.7 },
  normal: { label: '普通', reaction: 0.38, aimErr: 0.032, aimDecay: 1.15, burst: [3, 6], strafe: 1.2, hearMult: 1.0 },
  hard:   { label: '困难', reaction: 0.2,  aimErr: 0.017, aimDecay: 1.7,  burst: [4, 8], strafe: 1.6, hearMult: 1.3 },
};

export const TEAM = {
  A: { name: '保卫者', color: 0x4da3ff, css: '#4da3ff', cloth: 0x2e4a66, skin: 0xc9a184 },
  B: { name: '潜伏者', color: 0xff5a4d, css: '#ff5a4d', cloth: 0x6e5a33, skin: 0xb08a63 },
};

export const BOT_NAMES = {
  A: ['海鹰', '礁石', '浪花', '瞭望', '铁锚', '汽笛', '灯塔', '怒涛', '深潜', '破浪'],
  B: ['豺狼', '毒蝎', '夜枭', '沙暴', '鬼火', '黑帆', '毒蛇', '秃鹫', '雪豹', '荒原'],
};

// ===== 启动 / 菜单装配 / 设置持久化 =====
import { Game } from './game.js';
import { CONFIG } from './config.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

// 错误兜底（便于截图诊断）
let errorCount = 0;
function reportError(msg) {
  errorCount++;
  const el = $('error-overlay');
  el.textContent += msg + '\n';
  el.classList.add('visible');
  if (params.get('autotest')) document.title = 'AUTOTEST_ERR';
}
addEventListener('error', (e) => reportError(`[JS] ${e.message} @ ${(e.filename || '').split('/').pop()}:${e.lineno}`));
addEventListener('unhandledrejection', (e) => reportError(`[Promise] ${e.reason}`));

const game = new Game();
try {
  game.init();
} catch (err) {
  reportError('[Init] ' + (err.stack || err.message));
  throw err;
}

// ---------- 设置持久化 ----------
const SETTINGS_KEY = 'fps_transport_ship_settings';
function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; } catch { return {}; }
}
function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(game.settings)); } catch { }
}

const ui = {
  sens: $('set-sens'), fov: $('set-fov'), volume: $('set-volume'),
  quality: $('set-quality'), fps: $('set-fps'),
};
function syncSettingsUI() {
  const s = game.settings;
  ui.sens.value = s.sens; ui.fov.value = s.fov; ui.volume.value = s.volume;
  ui.quality.value = s.quality; ui.fps.checked = s.fps;
  $('set-sens-val').textContent = Number(s.sens).toFixed(1);
  $('set-fov-val').textContent = s.fov;
  $('set-volume-val').textContent = Math.round(s.volume * 100) + '%';
  document.querySelector(`input[name=difficulty][value=${s.difficulty || 'normal'}]`)?.click?.() ??
    document.querySelectorAll('input[name=difficulty]').forEach(r => r.checked = r.value === s.difficulty);
}
function readSettingsUI() {
  game.applySettings({
    sens: parseFloat(ui.sens.value),
    fov: parseInt(ui.fov.value),
    volume: parseFloat(ui.volume.value),
    quality: ui.quality.value,
    fps: ui.fps.checked,
    difficulty: document.querySelector('input[name=difficulty]:checked')?.value || 'normal',
  });
  saveSettings();
  syncSettingsUI();
}
for (const el of [ui.sens, ui.fov, ui.volume, ui.quality, ui.fps]) {
  el.addEventListener('input', readSettingsUI);
}
document.querySelectorAll('input[name=difficulty]').forEach(r => r.addEventListener('change', readSettingsUI));

game.applySettings({ ...loadSettings() });
syncSettingsUI();

// ---------- 菜单按钮 ----------
let settingsFrom = 'menu-main';
const clickSfx = () => { game.audio.init(); game.audio.uiClick(); };

$('btn-start').onclick = () => {
  clickSfx();
  game.audio.init();
  game.showOverlay(null);
  game.startMatch();
};
$('btn-settings').onclick = () => { clickSfx(); settingsFrom = 'menu-main'; game.showOverlay('menu-settings'); };
$('btn-help').onclick = () => { clickSfx(); game.showOverlay('menu-help'); };
$('btn-settings-back').onclick = () => {
  clickSfx();
  game.showOverlay(settingsFrom === 'menu-pause' && game.state === 'paused' ? 'menu-pause' : 'menu-main');
};
$('btn-help-back').onclick = () => { clickSfx(); game.showOverlay('menu-main'); };
$('btn-resume').onclick = () => { clickSfx(); game.lockPointer(); };
$('btn-pause-settings').onclick = () => { clickSfx(); settingsFrom = 'menu-pause'; game.showOverlay('menu-settings'); };
$('btn-quit').onclick = () => { clickSfx(); game.quitToMenu(); };
$('btn-restart').onclick = () => { clickSfx(); game.audio.init(); game.showOverlay(null); game.startMatch(); };
$('btn-end-menu').onclick = () => { clickSfx(); game.quitToMenu(); };
// 暂停面板任意点击尝试恢复锁定
$('menu-pause').addEventListener('click', (e) => {
  if (e.target.id === 'menu-pause') game.lockPointer();
});

// ---------- 就绪 ----------
$('load-progress').style.width = '100%';
$('load-text').textContent = '完成';
setTimeout(() => {
  $('loading').classList.remove('visible');
  if (params.get('autotest')) {
    // 自动化冒烟测试：直接开局，玩家自动漫游
    game.autotest = true;
    const lim = parseInt(params.get('limit'));
    if (lim > 0) CONFIG.match.scoreLimit = lim;
    game.showOverlay(null);
    game.startMatch();
    game.player.pose = params.get('pose');
    let frames = 0;
    const count = () => { frames++; requestAnimationFrame(count); };
    requestAnimationFrame(count);
    setTimeout(() => {
      if (errorCount === 0) {
        document.title = `AUTOTEST_OK frames=${frames} killsA=${game.scores.A} killsB=${game.scores.B} shots=${game.stats.shots} hits=${game.stats.hits} t=${game.time.toFixed(0)}`;
      }
    }, 8000);
    // ?debug=1 时输出 AI 诊断面板
    if (params.get('debug')) {
      const el = $('error-overlay');
      el.classList.add('visible');
      setInterval(() => {
        const bots = game.soldiers.filter(s => !s.isPlayer);
        const lines = bots.map(s =>
          `${s.name} (${s.pos.x | 0},${(s.pos.y * 10 | 0) / 10},${s.pos.z | 0}) ` +
          `${s.alive ? 'alive' : 'DEAD'} tgt:${s.target ? s.target.name.slice(0, 2) : '-'} ` +
          `path:${s.path ? s.path.length - s.pathIdx : '-'} ammo:${s.weapons.rifle.ammo} hp:${s.hp | 0}`);
        el.textContent = `t=${game.time.toFixed(0)} shots=${game.stats.shots} hits=${game.stats.hits} A:${game.scores.A} B:${game.scores.B}\n` + lines.join('\n');
      }, 1000);
    }
  } else {
    game.showOverlay('menu-main');
  }
}, 150);

window.__game = game; // 调试用

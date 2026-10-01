# 01 · 环境复验与最小能力样例

> v1.2 · 2026-10-01。下一轮实施前重新执行；本篇没有继承的 `[x]` 或固定测试数量。
> 环境测试通过只证明工具可运行，不证明人物已经达标。

## 1. 约束与准入

- 先完成 00 篇 M-pre；D-01已于2026-10-01由用户确认，按内部GLB验证路线执行，不再重复请求该授权。M0能力验证仍为待执行。
- 默认 Shell 是 **PowerShell**。本规划不混用 Bash 的 `\` 续行、`grep`、`mkdir -p`、内联 `VAR=...`，不复制 Bash shim 为 Windows `py -3` 启动器。
- 使用已存在的 Python 3.10+ 与 Node；先探测再安装。forge 核心为标准库，不能为“验证零依赖”强制 pip install，更不改全局 pip 镜像或用户 PATH。
- 运行时和 skill 的本机路径是可探测输入，不是所有机器的常量。可选视觉库用独立环境；不污染已验证的核心解释器。
- 只读查验外部 skill，禁止改测试预期/文档哈希、全仓换行设置或 checkout 其文件来凑全绿。

## 2. PowerShell 统一调用约定

以下是后续篇目代码块的共同前置，需在实施终端先执行。路径存在性失败时先定位，不自动切换另一版解释器重跑失败测试。

```powershell
$ErrorActionPreference = 'Stop'
$Repo = 'C:/hzc/GitRepo/John-1010-cmd/fps-demo'
$Base = 'C:/Users/developer/.agents/skills/img2threejs'
$Character = 'C:/Users/developer/.agents/skills/img2-character'
$Py = 'C:/Users/developer/AppData/Roaming/uv/python/cpython-3.13-windows-x86_64-none/python.exe'
$RunId = Get-Date -Format 'yyyyMMdd-HHmmss'
$Run = Join-Path $Repo ".img2threejs/runs/$RunId"
$env:PYTHONUTF8 = '1'
$env:PYTHONIOENCODING = 'utf-8'
Set-Location -LiteralPath $Repo
foreach ($p in @($Base, $Character, $Py)) {
  if (-not (Test-Path -LiteralPath $p)) { throw "未找到前置路径：$p" }
}
& $Py -X utf8 -c 'import sys; print(sys.executable); print(sys.version); assert sys.version_info >= (3,10); assert sys.flags.utf8_mode == 1'
if ($LASTEXITCODE -ne 0) { throw 'Python 运行时验证失败' }
node --version
if ($LASTEXITCODE -ne 0) { throw 'Node 运行时不可用' }
New-Item -ItemType Directory -Path $Run -Force | Out-Null

function Invoke-Forge {
  param([string]$Script, [string[]]$Arguments = @())
  & $Py -X utf8 (Join-Path $Base "forge/$Script") @Arguments
  if ($LASTEXITCODE -ne 0) { throw "forge 命令失败（不可当成解释器缺失回退）：$Script，exit=$LASTEXITCODE" }
}
function Invoke-Character {
  param([string]$Script, [string[]]$Arguments = @())
  & $Py -X utf8 (Join-Path $Character "tools/$Script") @Arguments
  if ($LASTEXITCODE -ne 0) { throw "character 命令失败：$Script，exit=$LASTEXITCODE" }
}
```

`$RunId` 创建后即固定，恢复时读取原 run 元数据，不能每次 resume 生成新 ID 来清零修正次数。若本机缓存解释器不存在，先探测 `Get-Command`、`uv python find` 或 `py -3` 的真实 Windows 可执行路径，再更新 `$Py` 并记录；不能把 shell 文件当 `.exe`。

`$ErrorActionPreference` 不保证所有 PowerShell 版本会将原生命令非零转成异常，因此每条关键命令显式检查退出码。不要用 `python3 ... || py -3 ...` 掩盖业务失败。

## 3. 版本与 CLI 契约锁定

在 run 的 `toolchain.json` 与 `command-help/` 保存：

- Python 可执行路径、版本、UTF-8 状态；Node 版本与启动方式。
- base/character/harness 的 resolved path、版本、Git revision（若有）以及使用脚本的 SHA-256。路径别名指向同一 checkout 时记录真实路径，避免双份漂移。
- 项目 Three.js 从 `js/vendor/three.module.js` 核验 `REVISION`；本次规划查验为 **r160**，实施时仍需记录，不按最新版 API 猜测。
- 所用入口的 `--help`，包括 state 的 init/mark、next、assessment、spec、landmarks、camera、delight、bake descriptor、review、rig、parity。先查 help 再构造命令。

已核验的调用形式示例：

```powershell
Invoke-Forge 'state.py' @('init','--help')
Invoke-Forge 'state.py' @('mark','--help')
Invoke-Forge 'stage1_intake/delight_albedo.py' @('--help')
Invoke-Forge 'stage3_build/bake_projected_texture.py' @('--help')
Invoke-Character 'rig_mesh_parity.py' @('--help')
Invoke-Character 'rig_validate_payload.py' @('--help')
Invoke-Character 'rig_glb_reference.py' @('--help')
```

若 harness 本机入口存在，调用 Node 入口而非先创建全局 shim：

```powershell
$Harness = 'C:/Users/developer/.img2/harness/bin/img2.mjs'
if (-not (Test-Path -LiteralPath $Harness)) { throw '需先定位已安装 img2 harness' }
node $Harness doctor
if ($LASTEXITCODE -ne 0) { throw 'img2 doctor 未通过' }
```

doctor 的插件数/告警数可变；准入看所需 provider 是否解析成功。`state.py init --help` 必须包含 `animated-character`，仍需实际 init/next 小样例验证 checklist、七 pass 的真实 ID 与 FINAL→rig 可达性，而非仅匹配帮助文本。profile 注册不等于存在 spec augmentation producer；无该产物就按 02 篇显式记录不适用，不创建假 augmentation。缺 profile 时报告锁定版本的安装需求；不修改 `plugins.json` 或 vendor 插件逻辑。

## 4. 测试策略：历史记录不替代重跑

从各自 skill 根执行核心与全量测试并保存 stdout/stderr、退出码、实际 tests/failures/errors/skips 与版本：

```powershell
Push-Location -LiteralPath $Base
try {
  & $Py -X utf8 -m unittest forge/tests/test_pipeline.py forge/tests/test_geodesic_skinning.py forge/tests/test_rig_gates.py
  if ($LASTEXITCODE -ne 0) { throw '核心流水线/骨骼测试失败' }
  & $Py -X utf8 -m unittest discover -s forge/tests
  $BaseFullExit = $LASTEXITCODE
} finally { Pop-Location }

Push-Location -LiteralPath $Character
try {
  & $Py -X utf8 -m unittest discover -s tests
  $CharacterFullExit = $LASTEXITCODE
} finally { Pop-Location }
```

- 全量失败逐个记录**测试名、错误、根因、与本项目链路关系**；不能把所有 WinError 2/1314、CRLF 或 runtime skip 一概判定无关。
- 默认要求相关套件无 failure/error。平台权限、可选 showcase 缺失或文档换行漂移仅能在证据充分、功能链路另有实测且明确记入豁免时放行；不能写“全量 100% OK”。影响投影、冻结、绑定或 runtime 的失败阻断 M0。
- 文档 hash 漂移先只读比对 LF-normalized 字节与锁定原始基准；与预期不同则可能真实版本漂移，停止排查。不要修改外部仓库 `core.autocrlf`、抹除本地修改或更新 expected hash。
- 测试 skip 不是 PASS。能力样例必须在**本项目 r160 浏览器**中实际运行，不能借 Python 测试来宣称 WebGL 可用。

## 5. M0 必做的三个纵向样例

新增项目工具属于待实现交付物，不假定 skill 中存在 `runtime/scripts/export_mesh_geometry.mjs` 或 `export_mesh_buffers.mjs`（本次查验该目录不存在）。统一项目工具责任见 02 篇。

### 5.1 评审台与浏览器 Runner

- 新建 `hero-review.html` / `js/demo/hero-review.js`：白模、规范相机、固定时刻、明确 ready/error、导出 mesh/缓冲区/部件清单。
- 新建 `scripts/hero/runner.mjs`：Node 驱动隔离 Chrome/CDP，等待应用 ready，捕获 PNG、读 JSON/二进制，写到指定 run。采用 Node 标准能力实现时先验证本机支持；若新增依赖，必须显式锁版本，不隐含依赖外部不存在的 runtime。
- Windows 后台启动隐藏窗口（Node `windowsHide: true` 或 PowerShell `Start-Process -WindowStyle Hidden`），独立临时浏览器 profile，仅关闭 runner 自己启动的进程。调试端口只监听 loopback，设超时、失败退出与清理；不接管/关闭用户 Chrome。
- 先探测常驻服务；不重启/杀进程、不抢占 8080。核验关键模块响应字节/哈希来自选定工作树。无服务时，可在记录启动/清理责任后启动本轮自有的隐藏预览服务，或请求用户启动；不能把旧服务/缓存当作 M0 已通过。
- 评审候选使用 `mode=review` 与 `stage=static`，有独立静态准入 schema；正式英雄工厂和三 clip 尚未存在不妨碍白模捕获，但静态 REVIEW_OK 不算英雄交付。
- 验证 02 篇七 pass/模板规范化、过期证据拒绝与 FINAL 状态适配；使用 M0 fixture 工作区，不把测试 state 当成正式人物进度。

准出：真截图不是占位图；缺模块、404、页面异常、超时均返回非零；覆盖页面先就绪后迟发错误/资源失败、重复命令和退出清理。FINAL 能到 rig 的证据不代表 M0 白模已变成正式人物。

### 5.2 投影像素落盘样例

- 自制带方向标记与遮挡的测试网格/图案，明确预期 UV、朝向、色彩空间与前后遮挡。
- 先用工具生成 descriptor，再由 `bake-runner.html` / `js/demo/bake-runner.js` 真正进行 UV-space 栅格化、源相机深度遮挡测试、像素读取与 PNG 落盘。
- 检查纹理正确进入 UV 而不是拍了一张模型截图；背面/被挡面不采到前面图案；图片行向/flipY、边界 padding、颜色线性化正确。
- runner 导出像素并写文件，不依赖网页无权限写任意磁盘或 `dump-dom` 自动保存 PNG。重跑比较内容哈希/像素误差，记录执行器版本。

准出：验证后的 PNG 可被 r160 工厂实际加载；输出坏路径/未加载源/缺 UV 必须失败；descriptor 本身不算纹理交付。

### 5.3 Rig 往返与动作失败样例

按已确认 D-01：最小连续关节网格 → 程序化 rig → 自生成 GLB → 插件读取 → 节点/joint/inverse-bind/track 映射验证 → r160 蒙皮播放 → 采样 → parity/gates。

至少证明：
- 使用非平凡的 joint order（不等于场景遍历顺序）、非零 bind TRS、技术节点与可辨别轨道；独立解码二进制 GLB，与导出前运行时逐项比较，不能只让导出器比较自己的 JSON。
- 正常动作的轨道预期与实际骨骼/顶点一致；添加 display 旋转/平移后仍正确。GLB float32 序列化误差单独声明容差，不能放宽原生 G1/G3 等门禁阈值。
- 分别在运行时或导出文件一侧故意错 track target、交换 joint order/逆绑定、漏骨架、NaN 权重、改变冻结 position、删除必需 clip，验收必须失败；两侧一起改错后仍一致不是有效负例。
- 固定 walk 虚拟行进速度/接触窗口后注入滑步/缺单侧支撑、令参考姿态权重变化、合批分解后复位、复用旧 continue 证据，各自被项目检查拒绝。
- 完整原生 gate payload schema 的 producer 清单已列明；缺测为 unevaluated/error，非零返回不改成成功。
- 如果该样例不能实现，正式人物 rig 停在前置，不把命名字典当 GLB 导出成功。

## 6. 可选视觉扩展

MediaPipe/SAM2/Depth 等仅在观察到具体弱点后引入；先阅读锁定版 adapter 文档及 `--help`，在隔离环境完成 health、权重 provenance 与测试。不得凭空写 `prefetch/health` 子命令或假设会自动回退。

人物脸遮挡与风格化可能使 landmark 模型误判；手工标注是允许路线。`extract_landmarks.py` 只生成通用引导与待填数据，未校准的默认点不是 anatomy 实测。单目 depth 仅相对线索，不当成厘米深度。

## 7. M0 检查表（待执行）

- [ ] 新 run、输入备份与基准提交明确；D-01路线授权已获用户确认（2026-10-01），但本项基线与后续能力验收仍待执行。
- [ ] 解释器/Node/r160/skill 版本与 CLI 帮助归档。
- [ ] 相关测试通过；全量异常与 skip 有单项处置，无夸大全绿。
- [ ] 本项目评审台、PNG 烘焙与 rig 往返三个样例成功，静态候选/正式 rig 不形成循环依赖。
- [ ] 模板 ID/七 pass/阈值/预算规范化，单份 state 寻址、FINAL→rig 与过期证据拒绝可实测；相关适配 CLI/schema 已归档。
- [ ] 错误注入能可靠失败；ready、截图、像素、缓冲区均可导出。
- [ ] 无全局环境/外部 skill/用户进程/游戏实现的附带修改。

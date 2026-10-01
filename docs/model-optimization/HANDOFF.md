# 模型精细化重实施 · 完整交接（重新编写）

> 状态快照：**2026-10-01，Asia/Shanghai**；对应规划 **v1.2**。
> 旧 HANDOFF 已按用户要求删除，本文件从当前仓库/工具/输入实测重新编写，未读取旧交接或旧 reviews 正文。
> **文档二次复审已完成，等待用户检查；正式 M-pre/M0、人物与 Phase 2 均未实施/验收。**

## 1. 接手先看：当前停在哪、下一步是什么

1. 读本文件 1～4 节确认请求、状态、已批准事项与输入。不要从旧 stash 或 ignored 缓存恢复实现/通过记录。
2. 读 [总规划](plan/00-master-plan.md) 确认范围与顺序；执行前必读 [唯一契约](plan/02-pipeline-conventions.md)，不要凭交接里的摘要另建接口。
3. **当前下一步是用户检查 v1.2 规划。**用户要求开始实施后，先完成正式 M-pre，再按 [环境篇](plan/01-environment-setup.md) 实现/验证 M0 的三个纵向样例；不是直接做 militia 成品。
4. M0 真实准出后才启动 [militia](plan/03-hero-militia.md)。先形体检查点，完整准出再做 [SWAT](plan/04-hero-swat.md)，两个人物通过才进 [武器篇](plan/06-phase2-weapons.md)。
5. 每次续接先复核工作树/输入哈希、读对应 run 的 state 与失败证据，执行 next；更新本交接的状态/下一步/证据指针，不复制历史 PASS。

**本次用户只要求清理旧交接/评审文档并二次复审规划，没有要求立即重实施。**因此本轮未创建项目执行器、spec/recipe、正式 run、GLB 或模型。

## 2. 用户要求与已确认事项（不能再当成待确认）

| 事项 | 当前结论 | 边界 |
|---|---|---|
| 原实现质量 | 用户不满意，决定 stash 后重实施 | 旧实现不作为新轮质量基线；本会话不 pop/apply 旧 stash |
| stash | 用户于2026-10-01说明已完成；本轮只读核验 | 文档修订仍在工作树，游戏/旧 demo 受管文件与 HEAD 一致；ignored 内容未被清除 |
| 旧 reviews/旧 HANDOFF | 用户授权删除并要求重写完整交接 | reviews 已不存在；旧 HANDOFF 删除后以本文件替换，未继承旧正文 |
| SWAT姿态 | **正/侧两视图都应双手持枪** | 前一轮已按用户要求生成并替换 v3；同一右手socket，不另做胸前悬挂分支 |
| D-01 | **用户原话：“允许内部生成GLB”**（2026-10-01） | 项目自生成验证夹具；骨架/几何仍程序化，demo不改成GLB加载，不引入外部角色/骨架 |
| 既定产品范围 | 独立人物展示、真实蒙皮与 idle/walk/aim、投影优先、静态T-pose分解，后续独立AK/M4 | 详细合同见00/02；不借模型工作修改游戏/HUD/音频/战斗 |

D-01 已满足**路线授权**，无须再次询问。它不代表 GLB 往返已实现、原生 G12 已通过、M0 已通过，也不包含 G6/G2 等验收例外授权。能力不成立时先报告实测失败，不偷偷变成自有降级门禁。

## 3. 工作树基线与真实进度

### 3.1 本轮只读核验的 Git 快照

- 仓库：`C:\hzc\GitRepo\John-1010-cmd\fps-demo`。
- 分支：`feature/faction-soldier-models`。
- HEAD：`0a224d0553eaa7592f87ada54c1e2451d2370509`。
- 本次查见 stash 提交：`97e7e57fc7c45a65f518671ab84a45f84af0a1eb`。
- 当时 `stash@{0}` 的描述：`On feature/faction-soldier-models: !!GitHub_Desktop<feature/faction-soldier-models>`。
- `stash@{0}` 是会变化的序号，上述 SHA 仅用于识别旧工作，不是恢复指令。
- 本轮最终预期差异仅本目录 **9 份 Markdown**：README、7份 plan、新 HANDOFF。新交接同名替换旧 tracked 文件，Git 显示 M 属正常，并不意味着旧文件未删。
- 本轮未执行 stash/pop/apply/reset/clean/checkout/commit 等 Git 写操作；未改游戏、demo、模型、工具、外部 skill 或概念图。

这只是**交接快照**。正式实施时重新核验并选定基线，将 commit/规划版本/输入/工具/游戏冻结哈希写入新 run 的 baseline；不要假定以后 HEAD/分支/服务还相同。

### 3.2 里程碑状态（尚未做的全部保留 pending）

| 项目 | 状态 | 已有事实 / 尚缺什么 |
|---|---|---|
| 规划v1.2二次复审 | 完成，待用户检查 | 9份文档、自审与范围核验；不是模型验收 |
| SWAT双手持枪v3 | 前轮已替换，本轮哈希一致 | 当前PNG/生成说明/旧图备份仍在；未重用旧crop/相机 |
| D-01路线授权 | 已确认 | 内部GLB验证可实施；尚无M0往返结果 |
| 用户stash | 已说明完成、仓库状态已核验 | 旧实现未恢复，ignored缓存仍留存 |
| 正式M-pre | pending | 尚无选定新run、正式baseline、游戏smoke/全部HTTP输入验证 |
| M0环境/三样例 | pending | 项目runner、真实像素烘焙、rig往返/失败注入等尚未实现 |
| M1a militia形体/完整 | pending | 无正式spec/工厂/2K纹理/rig/demo验收 |
| M1b SWAT | pending | 输入就绪，但须等待militia完整准出后独立实施 |
| M2a AK / M2b M4 | pending，独立输入尚缺 | 不阻断人物随附枪；不能宣称已做独立武器 |

### 3.3 实际存在/不存在的文件

**存在且仍是原低模基线**：`demo-militia.html`、`demo-swat.html`、`js/demo/militia-demo.js`、`js/demo/swat-demo.js`、`js/soldier_models/`。demo目前导入游戏低模/config并用原有驱动，不能说它们已经接英雄工厂、真mixer、PMREM或新ready协议。

**尚不存在的计划交付**：

- `js/hero_models/`；`js/demo/demo-common.js` / `hero-review.js` / `bake-runner.js`。
- `scripts/hero/` 的 runner/export-mesh/validate-asset/export-rig-glb。
- `hero-review.html`、`bake-runner.html`、`css/hero-demo.css`。
- `assets/hero/`；本目录 `specs/`、`recipes/`、`evidence/`、`rig-reports/`。
- Phase 2 `demo-ak47.html` / `demo-m4.html` 与对应入口。

`assets/textures/hero/` 目录存在但本轮核验**无文件**；目录存在不是已完成烘焙。未来产物路径/签名统一见02，表中“不存在”只是2026-10-01快照。

旧 ignored `.img2threejs/` 仍含 `hero-militia`、`hero-militia-topology`、shots、旧state说明、CDP脚本及浏览器profile等；本轮只看目录元数据，不读取旧评审正文/浏览器资料、不删除、不当新证据。正式使用新的 `runs/<run-id>/hero-<id>/`。

## 4. 输入资产、哈希与工作树外备份

### 4.1 当前唯一角色输入

| 资产 | 正式输入 | PNG尺寸 | SHA-256 |
|---|---|---|---|
| militia | `assets/concepts/militia-v3.png` | 1312×1199 | `cd4838685dc5e72635f198523b21a0468c2c8f620dec1c3811addf01de3a3d3d` |
| swat | `assets/concepts/swat-v3.png`（双手持枪修正） | 1312×1199 | `d5c7280a7c19b19b3cd75b1a2064b569a50885e94660b333a7586df583e55517` |

尺寸是整张双图复合画布，不是各crop有效分辨率，也不是相机标定数据。SWAT生成说明/完整提示词在 `assets/concepts/swat-v3.md`；其中旧历史段不代替2026-10-01当前图片与追加修正说明。

旧SWAT参考仅作备份：`swat-v3-before-two-hand-20261001.png`，SHA-256 `239b7b1ff4202d4252c0d43feee78cd1944898e8308d96e38f58c5739be30a05`；说明同名`.md`。**不作为投影源**。

### 4.2 已实际复制到工作树外的保全副本

本轮将两张正式PNG、对应`.md`及旧SWAT备份PNG/说明复制并逐文件校验到：

```text
C:\Users\developer\.codex\visualizations\2026\10\01\01a0f697-68b0-72e1-96de-b21ba9641c94\model-optimization-inputs-20261001\
```

目录中的 `input-backup-manifest.json` 记录6个文件的哈希/大小。这是当前本机外部副本，不声称云端或跨机器持久化；迁移机器/清理应用目录前另行保全。若正式输入丢失，先验证副本哈希，再恢复用户需要的明确文件，不能批量覆盖概念图目录。

`.gitignore` 明确忽略 `assets/concepts/` 和 `.img2threejs/`；普通stash不含untracked，`-u`也不含ignored。不能仅凭Git补丁/commit承诺恢复原图，也不建议盲目stash -a/删除缓存。

### 4.3 Phase 2仍缺输入

`assets/concepts/weapon-ak47-ref.png`、`weapon-m4-ref.png` 本轮均不存在。启动06篇时再请求独立高清多视图/关键局部及具体变体确认，不能用人物持枪crop或程序化木纹伪装成独立参考。人物随附轻量枪按人物原图实施，接口/socket/预算仍遵循02；两者输入manifest不能混用。

## 5. 二次复审具体修了什么（v1.1→v1.2）

| 风险 | 本轮修正 | 主要权威位置 |
|---|---|---|
| 把阶段简称直接传工具 | 明确七个机器pass ID；模板比例/特征阶段重映射，generic surface归入form/material；同步全部引用 | 02 §4.1，03/04/06 |
| 模板默认值更宽导致自动放行 | targetId统一；模板评分/critical/面数/draw等按项目契约规范化；optimization也要图像复评 | 02 §4.1/8/9 |
| 错用assessment字段/域开关 | `preSpecAssessment.anatomy`；区分profile、character轨道、观察domain与真实augmentation，不假定producer存在 | 02 §4.1，03/04 |
| 固定state/producer与FINAL阻塞 | 每资产唯一state；原step映射真实JS/导出/part-manifest schema；无target显式skipped；终态sweep不冒rig门禁 | 02 §4.2，01/06 |
| 静态pass提前依赖正式rig | 隔离pose/skin预检支持原图投影；interaction先结构协议，正式rig/UI后验收；review模式不冒英雄PASS | 02 §2.2/4，03/04/05 |
| 内部GLB自己证明自己 | 非遍历joint order/非零bind/技术节点；独立解析，与运行时对应；单侧错误注入应失败 | 01 §5.3，02 §6 |
| 最终权重变化但继续用旧PNG | posed positions/法线纳入烘焙依赖；变化超容差重烘焙；不重新freeze遮盖几何失败 | 02 §1/2.2，03/04 |
| 原生continue复用过期证据 | 项目验证拒绝stale，M0证明失效/恢复、计数保留，complete不压过项目失败 | 02 §4.3，01 |
| G8只测静止或事后拟合零滑动 | 固定虚拟路径/接触窗口，walk双侧支撑覆盖，保持姿态双足稳定另查 | 02 §7，03/05 |
| G10帧数与baseline混淆 | 三clip每blend模式48帧，基础至少48对；payload轴计数与实际双模式图数分开 | 02 §7，04/05 |
| 合批省draw后又拆冻结几何 | freeze前规划合批/语义pick；分解使用只读陈列代理，原几何不改、不重复显示，临时资源可释放 | 02 §3/8，05/06 |
| SWAT旧挂载词残留 | 删除旧参考挂载/换parent表述；明确只切姿态/动作/TRS，右手parent不变 | 04 |
| 看到初始ready就退出 | review/hero/legacy/weapon各自schema；runner持续至矩阵结束，迟发错误同样FAIL | 05 §2/9 |
| 旧排除条款与新用户要求冲突 | 旧文档删除、新交接写当前事实；stash是用户已完成动作，不要求再做一遍 | README/00/02/本文件 |

本表只说明**规划修改**；“修正了规划”不等于对应能力已实现。M0 的价值就是把这些契约变成真正可失败的能力样例。

## 6. 工具/环境快照与验证边界

### 6.1 本轮只读确认

| 项目 | 路径/版本 |
|---|---|
| Python | `C:\Users\developer\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe`，3.13.12 |
| Node | `C:\Program Files\nodejs\node.exe`，v24.14.0 |
| Three.js | 项目 `js/vendor/three.module.js`，REVISION=160 |
| base skill | `C:\Users\developer\.agents\skills\img2threejs`，SKILL版本2.0.0 |
| character skill | `C:\Users\developer\.agents\skills\img2-character`，SKILL版本0.2.0 |
| img2 harness | `C:\Users\developer\.img2\harness\bin\img2.mjs` 存在，package版本0.2.3 |
| 旧文提到的runtime scripts | `img2threejs/runtime/scripts` **不存在**，不能调用它完成导出 |

已核对 state init/mark、spec/assessment、part coverage、GLB reader、parity、rig gate 的真实 CLI，以及 workflow_state/orchestrate_passes/domain/gate 源码。这里只证明命令/schema边界，**本轮未运行doctor、全量suite、浏览器模型验收或M0样例**。正式toolchain必须重测并存脚本哈希/真实resolved路径，不能只复制上表版本。

PATH中的python/py入口可能是Bash shim，本机已有明确解释器，执行按01篇用真实exe和UTF-8；不要改用户PATH/全局环境/外部skill去凑测试通过。PowerShell原生命令非零要显式检查。

### 6.2 HTTP服务与浏览器

本轮只读请求 `http://localhost:8080/js/vendor/three.module.js` 得HTTP200，响应SHA-256与当前文件一致：`76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495`。

**单个共有vendor匹配不能证明所有页面/新模块/全部工作树根正确。**正式M-pre/M0还须核验选定工作树的新增关键模块/输入字节、缓存键与加载成功。没有打开模型页面、接管Chrome、启停服务或杀用户进程；不把静态HTTP200称为WebGL/截图/动作已通过。

M0的runner使用隔离profile、loopback调试端口、明确超时与进程所有权，Windows后台隐藏窗口；只关闭自己启动的进程。WebGL默认保留GPU并记录actual backend，不拿disable-gpu/software结果冒实机60FPS。

## 7. 下一轮实施：按顺序执行并满足每步完成条件

### 7.1 第一步：正式M-pre（不是恢复旧实现）

1. 复核用户已要求开始实施；读取00/02，记录当前HEAD/分支/status与v1.2文件哈希。仅保存本轮文档，旧stash保持不动。
2. 核验两个角色输入及外部副本。先解决hash不一致/缺图，保存全原图而非只保留crop。
3. 新建固定run ID，记录工具/服务基线、游戏冻结文件与低模API哈希；检查新run里无旧模型数据。
4. 写正式baseline；M0/各资产检查项初始化pending，记录明确下一步与阻断原因。

**完成条件**：可恢复输入、新run、明确基准与游戏隔离、服务寻址证据齐全。文档快照/ignored旧图片不能替代这一项。

### 7.2 第二步：M0环境/可达性与三样例

按01篇执行，不先做英雄外观；项目新工具责任在02 §10。推荐推进顺序：

1. 锁定解释器/版本/源码/help，运行相关suite，逐项处理失败/skip，保留stdout/stderr/退出码。
2. 用M0 fixture落实spec/recipe与项目报告schema；规范化ID/七pass/阈值/预算/引用，证明缺图/过期continue会失败。
3. 搭最小hero-review + 隔离runner/exporter，实际截图/缓冲区/错误采集；证明static review协议与完整hero分离。
4. 走真实state/next小样例，落实FINAL→rig的寻址与skipped原因；终态空报告不当rig PASS。
5. 投影样例：方向/遮挡测试图 → descriptor → 真UV-space像素执行 → PNG → r160加载与色彩/遮挡复验。
6. rig样例：连续关节网格 → 代码rig → 内部GLB → 独立读取 → joint/inverse-bind/track对应 → r160播放/区域运动 → parity/gates；包括显示wrapper后的空间验证。
7. 运行01/05规定的负例与资源清理，保存实际producer/覆盖/容差/原始native结果与项目summary。

**完成条件**：三个样例真运行，负例可失败，工具schema/CLI和恢复流程归档，核心检查无缺测/已知失败。若工具自身不支持规划流程，先形成受管适配并复验，不改外部skill、不用假结果推进人物。

### 7.3 第三步：militia试点

触发本步骤才读03及其指定character参考契约。观察/人工标注/crop先行；受管spec/recipe明确身份、左右、参考姿态和未知区；七pass逐次捕获/比较/评审，形体不达标就停形体。

正式rig的九步只在七pass与base FINAL后开始，保持freeze/parity与真实GLB映射；最终referencePose与烘焙输入一致性复验，再做完整demo、动画/脚接触/握持/分解/线框/资源/预算/游戏回归。用户可检查后才启动SWAT。

**完成条件**：03清单、02全部项目阻断项、原生报告/批准例外及可恢复证据齐全，无未解决critical；不是“文件已创建/页面标题OK”。

### 7.4 后续：SWAT与Phase 2

SWAT按04独立标注/相机/材质/权重/门禁，保留双手低戒备referencePose。头盔/露眼/背心层次/青色肩标/护膝靴逐项检查，不复制militia相机或分数。

Phase 2待两人物完整准出及独立输入就绪，按06实施showcase/character两档与六socket对齐/挂载回归。独立武器不套人体rig门禁，未做Reload/Fire不显示空按钮。

## 8. 续接时最容易误判的边界

- **单份state**：02定义 `$W/.img2threejs/state.json`。state/next/mark显式路径；FINAL `--workspace $W`；不能在repo默认state与`$W/state.json`之间复制双向编辑。
- **三个pose层级**：bind T-pose、参考低戒备pose、idle/walk/aim动作分开。投影姿态可临时预检，正式hero不能静态降级。
- **工具是描述/仲裁，不是神奇producer**：probe不是视觉判断，landmark是引导，camera是初猜，delight是近似，bake工具输出JSON不是PNG，门禁payload不能手填零差值。
- **自生成GLB不是独立造型真值**：可验证序列化/索引/运行时一致性，不能证明身份/动作自然；后者仍靠参考与区域/姿态/接触实测。
- **验收例外**：合法rigid导致G6全场景范围差异、小mesh不足native G2覆盖等在M0拿数据说明；当前没有这些用户批准。保留全场景FAIL与scope-adapted报告，核心缺件/错绑定/坏形变永远不是范围例外。
- **冻结不被交互破坏**：合批/语义pick/分解陈列规划在freeze前；仅只读代理展示，不改冻结geometry、不拆蒙皮本体；往返验证完整TRS/parent/hash与资源。
- **ready不等于整轮通过**：review/legacy/weapon各自schema；完整英雄必须rigged；runner直到矩阵结束都监听迟发错误。
- **原生与项目分开**：原始十二行/exit/verdict不改写；projectVerdict有自己的阻断项。无范围替换的原生全十二PASS才称ALL_PASS。
- **停止条件可执行**：3/pass、6total、平台期、缺输入、相关suite失败、核心producer缺失都真实停；保留历史计数/最佳候选，不开新ID重置，不抬评分放行。
- **预算看真实scope**：02是唯一数值表。Mesh/语义part数不是draw calls；shadow/wire/debug/explode另报；估算内存不是实测VRAM；未测某硬件不承诺它的60FPS。

## 9. 当前问题与以后需要用户介入的条件

本轮没有遗留已知的规划内部冲突；未来实现能力仍未知，不能用“文档自审通过”消除它们：

| 条件 | 下一步 | 是否现在需要确认 |
|---|---|---|
| 用户还未检查v1.2/尚未要求实施 | 用户检查后再启动M-pre/M0 | 当前只请检查，不自动开始 |
| 自生成GLB/PNG/失效恢复等M0能力失败 | 停止，提交原始失败/替代方案与影响 | 不重复问已批准D-01；改路线才另问 |
| 需要native G6/G2等适用范围例外 | M0提供实测、原FAIL/coverage、替代项目检查，再请求具体结论 | 现在没有事实数据，不提前签豁免 |
| Phase 2独立参考/变体缺失 | 到06启动门再请求输入/确认 | 不阻断角色随附枪，也不伪造输入 |
| 参考歧义/隐藏区影响关键身份或预算无法兼容 | 给对比图、明确分歧/预算申请 | 不自行弱化关键特征 |
| 用户/工具/参考或工作树版本变化 | 更新基线并使受影响证据失效 | 不静默复用旧PASS |

## 10. 本轮自审、保全与未执行检查

### 10.1 已完成的文档级核验

- [x] README、00～06二次逐篇复审，对照本机真实工具源码/CLI修正，不读取旧排除正文。
- [x] 删除旧HANDOFF并重写完整续接文件；reviews已经不存在，不恢复旧目录。
- [x] SWAT当前输入/旧备份和militia原图的hash/尺寸核验；工作树外保全副本与source一致。
- [x] 文档链接/代码围栏/ID/状态路径/阶段/姿态/版本交叉核验；PowerShell示例AST解析。
- [x] `git diff --check`；本轮最终差异只限9份Markdown，26个非本目录tracked文件均无Git差异，已捕获有效哈希的25个文件与本轮开始时一致；中文文件名另以Git基线复核。
- [x] 本轮无实现/环境/参考图附带改动；未执行Git写操作、未接管浏览器或启停服务。

### 10.2 未执行、不能写PASS的项目

- [ ] 正式M-pre基线、新run与游戏smoke。
- [ ] doctor/核心与全量suite重跑、Windows终态子进程能力实测。
- [ ] 新项目runner/exporter/validator/GLB导出/PNG像素执行器与负例。
- [ ] hero-review/bake-runner的WebGL/截图/动画/PMREM/资源验证。
- [ ] 任何角色/武器建模、UV纹理、rig十二门、完整demo、实机性能或用户模型验收。

本机审计/保全目录：

```text
C:\Users\developer\.codex\visualizations\2026\10\01\01a0f697-68b0-72e1-96de-b21ba9641c94\
  planning-second-review-baseline.json       本轮修改前非文档hash/status快照
  planning-second-review-result.json         本轮文档自审实测摘要
  model-optimization-plan-v1.2.patch          仅9份Markdown的最终保全补丁
  model-optimization-inputs-20261001\         6份原图/说明副本及manifest
```

同目录旧 `planning-self-review-result.json`、`model-optimization-plan-v1.1.patch` 是前轮产物，可能含D-01待确认等过时状态，**不要应用它们覆盖v1.2**。外部副本不是Git提交，本轮也没有自动提交文档。

## 11. 后续维护交接的规则与记录模板

后续每次结束/暂停前更新第1/3/9节，详细合同仍引用02，不在这里复制一套新预算/签名。至少记录：

```text
快照日期/规划版本：
工作树/分支/HEAD及本轮允许改动范围：
正式run-id / asset-id / author-source与reference hash：
当前里程碑、机器pass ID、checklist step：
实际做完的工作与对应文件：
失败/缺测/例外（原始verdict、原因、用户批准记录）：
证据目录/工具版本/命令/退出码：
本pass修正计数/全程计数、是否达到停止条件：
本轮scope与游戏回归结果：
下一条具体动作、前置与完成条件：
需要用户检查/输入的明确内容：
```

没有实际run时保持pending，不能填假run-id/0洞/0足滑/PASS。更换参考/几何/UV/骨架/剪辑/渲染配置时，写明受影响的证据及重验入口。只读检查状态可从以下命令开始；这些不恢复stash、不初始化模型、不启动服务：

```powershell
Set-Location -LiteralPath 'C:/hzc/GitRepo/John-1010-cmd/fps-demo'
git status --short
git rev-parse HEAD
git branch --show-current
git stash list
Get-FileHash -LiteralPath @('assets/concepts/militia-v3.png','assets/concepts/swat-v3.png') -Algorithm SHA256
```

本次交接的最后结论：**规划v1.2与续接文档已准备好请用户检查；下一轮从M-pre/M0开始，不从旧模型或旧PASS开始。**

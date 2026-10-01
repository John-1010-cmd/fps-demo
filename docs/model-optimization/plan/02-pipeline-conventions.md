# 02 · 流水线唯一契约

> v1.2 · 2026-10-01。本篇统一命名、坐标、接口、纹理、质量与证据口径。其他篇只能引用，不能另创“权威”副本。
> 代码块使用 01 篇 PowerShell 前置。`<...>` 为待填参数，不是可原样执行的命令。

## 1. ID、目录与唯一事实源

资产 ID 固定为 **militia / swat / ak47 / m4**；显示名 M4A1 不改变 ID。禁止 `m4a1`、`hero-swat` 等混作资产 ID。

```text
docs/model-optimization/
  README.md
  plan/00..06-*.md
  HANDOFF.md                             当前进度/续接入口，不是验收契约
  specs/<id>.json                         受管 sculpt spec 唯一作者源
  recipes/<id>.json                       schema不足时的显式扩展配方
  evidence/<run-id>/<id>/                 新实施的受管验收摘要与关键图片
  rig-reports/<run-id>/<id>.md            原生门禁+项目验收，均标来源
assets/hero/<id>/
  build-manifest.json                    输入/版本/spec/配方/产物哈希
  rig-data.json                          角色导出读取后的骨架/剪辑派生数据
assets/textures/hero/
  militia-albedo.png / swat-albedo.png    人物最终单张2048² albedo
  ak47-wood-albedo.png / ak47-metal-albedo.png
  m4-receiver-albedo.png / m4-polymer-albedo.png
js/hero_models/
  militia.js / swat.js / ak47.js / m4.js
  common-rig.js / common-geometry.js      有验证用途才抽取，不提前建框架
js/demo/
  demo-common.js / hero-review.js / bake-runner.js
  militia-demo.js / swat-demo.js / ak47-demo.js / m4-demo.js
scripts/hero/
  runner.mjs / export-mesh.mjs / validate-asset.mjs
  export-rig-glb.mjs                     D-01已确认，M0待实现/验证
hero-review.html / bake-runner.html
css/hero-demo.css
.img2threejs/runs/<run-id>/hero-<id>/
  .img2threejs/state.json                此资产唯一 checklist state
  assessment.json / reference-manifest.json
  crops/ / landmarks/ / cameras/ / delight/ / bake/ / shots/
  meshes-before.json / meshes-after.json / mesh-manifest.json
  rig-reference.glb / rig-reference.json / rig-payload.json
  sampled-clips.json / rig-gate-payload.json / project-report.json
```

- spec 不放在 ignored 工作区作为唯一作者源；`state.py --state $State` 的 `--spec` 指向 `docs/.../specs/<id>.json` 的绝对路径。工作区快照标明“派生只读”，不得双向独立编辑。
- spec 先声明比例/材质/层级/feature/pivot，再实现。现有 schema 不支持 UV、动画或配方字段时，放入受管 recipe 并以路径/哈希关联，另做项目校验；禁止虚构 schema 字段或声称 validator 已验证未知字段。
- 作者源是 spec/recipe；GLB、rig-data、PNG、manifest 是可重建派生物，不是第二作者源。工厂消费受管数据或可验证的生成常量，不能手调造型数字后忘记源数据。
- 改作者源 → strict validate + 自有扩展校验 → 构建/烘焙 → 捕获/门禁 → 关联版本。任何几何/UV 改动使贴图、冻结、rig、截图失效；正确流程是退回相应 pass，保留旧 manifest 后重新验收，不能在失败的绑定后偷偷再 freeze。
- 输入原图被 Git ignore：记录 SHA-256、可恢复备份与取得方式。受管关键证据不能全部丢在 ignored run；不要求把每帧截图都入库，但最终四视角、关键特写、缺陷/修复对比和摘要必须保留。
- 旧 reviews/旧 HANDOFF 已按用户要求移除，不读取或恢复其结论。新 HANDOFF 只记录事实和下一步；新证据使用 `evidence/<run-id>/`，不重建旧评审目录。
- 新 run 不能仅用文件存在判定新产物。检查输入/作者源/生成代码/工具/几何/UV/pose/渲染配置的依赖哈希；review 元数据的追加不等于造型变更，实际依赖集的构成由 M0 schema 固化。每条 review 指向捕获时的作者源快照和依赖哈希，避免把后来追加 reviewHistory 的文件哈希循环当成同一构建的依据。

## 2. 坐标、左右与姿态

### 2.1 人物的两个空间

| 空间 | 前/上 | 解剖左/右 | 用途 |
|---|---|---|---|
| rig-local（建模/绑定/插件） | +Z / +Y | 左 +X，右 -X | spec、joint order、G7、局部测量 |
| display（人物展示根） | -Z / +Y | 左 -X，右 +X | 游戏风格朝向、机位、演示 |

全项目单位为米。`figureHeight=H` 从不含武器、地台或分解位移的角色 bind-pose 网格 bounds 测得，记录所含头部装备与网格 ID；不用画布高度、硬编码 1.75 或随动画变化的世界 AABB 当 H。局部比例阈值才归一化到 H，G1/G3/权重等按原生 schema 的变换/数值容差，不把所有数字乘 H。

display wrapper 只做 **Y 轴旋转 π** 和从网格 bounds 得到的居中/着地平移；不能用负缩放当旋转。所有 model/rig/parts 位于 wrapper 下。规范转换 `p_display = R_y(π) p_rig + offset`，对方向只应用旋转，不加平移。

- 原图中人物自己的左不等于画面左。militia 正面图中红臂章在画面右，即解剖左；rig-local 为 +X，display 为 -X。
- G7 在 rig-local 测，并由**参考图独立标注**左右节点；不能按点 x 正负重新命名左/右来让检查必然通过。
- 对称部件镜像仅 `x → -x`，z 不变；翻转 triangle winding 并处理法线/切线。镜像正确还需内外侧特征独立核验；非对称臂章不复制。
- 人物标准正面机位在 display 的 **-Z**，朝 +Z；解剖右侧机位 +X，朝 -X；背面 +Z，朝 -Z；左侧 -X，朝 +X。命名 front/right/back/left 指解剖方向，而非屏幕方向。相机四向是验收控制视角，不冒称对应参考图的精确相机。
- rig/referencePose/crop/camera 的坐标空间写入 manifest；不得拿一套截图符号套另一套骨骼局部坐标。

### 2.2 姿态分离

绑定姿态是稳定 T-pose；匹配参考的姿态是 `referencePose`，用于原画对照与投影；`idle/walk/aim` 是展示剪辑。原图不是 T-pose，也不是默认水平瞄准，不能用 T-pose 与原画直接投影全身。

静态 pass 可以在隔离实例中使用草案骨架/权重或受管形变生成 referencePose 与关节预检，须导出实际 posed positions，固定同一 bind geometry/UV/part ID；这只是预检，不标记正式 freeze/rig/gate done。interaction 阶段验证静态分件/pivot/socket/控制接口，完整动画诊断在正式 rig 九步后完成。

投影时在匹配参考的姿态建立 world-space 顶点/相机对应，将颜色写入同一 mesh 的**固定 UV**；恢复 bind pose 时 UV 不变。最终绑定后复验 referencePose 的表面位置/法线与烘焙输入：权重、骨架或姿态改变投影对应超过声明容差时，即使 bind geometry/UV 未变，也须使受影响 bake/材质/图片证据失效并重烘焙；不以旧 PNG 存在代替验证，几何未改则不重 freeze。若该方式局部不可用，则分区匹配/遮挡屏蔽并标注缺测，不假称已经双视图融合。正侧两图姿态不一致时分别拟合并记录，不强迫共享错误姿态。

### 2.3 武器空间

武器独立根默认 +Y 上、-Z 沿枪管、+X 为射手右，单位米；原点取 rightHandGrip 的握持框架。挂到人物 rig-local 时通过 socket 全变换对齐，不硬加 Y 轴旋转或假定手骨轴与武器一致。按当前姿态评估枪口，不能要求 referencePose 中斜向持枪时仍水平 -Z。

## 3. 工厂与运行时契约

纯 JS ES Module，`import * as THREE from 'three'` 与项目 r160 importmap 一致，不引入前端 Node 模块或不匹配的新版 addon。相同输入/种子产生相同顶点、索引、UV/rig 数据；不要求带时间戳/UUID 的完整 Three.js 对象 JSON 字节相同。禁止 `Math.random()` 影响可复现几何。

人物导出 `buildHeroMilitia(options)` / `buildHeroSwat(options)`，异步 resolve 后所有必需资源加载完成；失败 reject，不回静态低模冒充成功：

```javascript
// 契约形状示意，不是已存在的实现
{
  group,          // display wrapper，挂到 demo 的 modelRoot
  skinnedMesh,    // 主网格，必须是 skinnedMeshes[0] 的同一引用
  skinnedMeshes,  // 所有必需蒙皮网格数组；非空
  skeleton,      // 按实际 skin.joints 顺序的共享骨架
  mixer,         // 仅这一套 AnimationMixer，绑定完整模型根
  clips,         // 普通对象字典：idle / walk / aim，不是 Map
  anchors,       // 字典：socket_right_hand / socket_left_hand / socket_stock_contact
  parts,         // 字典：稳定 partId → PartRecord
  bounds,        // bind pose 的 THREE.Box3，明确测量空间
  resetPose,     // 显式停动作并还原所有 bind TRS；不在普通播放每帧调用
  dispose        // 幂等释放自有资源，不能释放另一实例/共享库资产
}
```

`options` 仅明确支持 `textureBaseUrl`、`castShadow`、`receiveShadow`（及必要的验证配置）；不要在 demo 传未定义 `teamColor` 改原图色。路径默认基于 `import.meta.url`/manifest 定位，不随网页相对层级漂移。

`PartRecord`：`node`（可为显式说明的语义代理）、稳定 `id`、`explodable`、`baseTransform`（位置/四元数/缩放完整 TRS）、`explodeVector`（含空间）、`attachment`/`skinningPolicy`；合批时另有真实 geometry range/instance/pick 与陈列代理映射，不能把一个空代理当渲染零件。字典与 spec 的部件清单一一对应。只展开**刚性独立组根**；child 同时展开会叠加两次，禁止。需蒙皮的袖口/布料层留在本体，不为了分解而割断它。

武器导出 `buildHeroAK47(options)` / `buildHeroM4(options)`：

```javascript
{
  group, parts, sockets, materials, bounds, dispose,
  actions // 普通对象；无次级机械动画时为空，UI不得显示可点击假按钮
}
```

武器 `options.variant` 为 `showcase` 或 `character`，默认独立页 `showcase`；角色页显式选 `character`。`parts` 沿用 PartRecord 字典。

`sockets` 只使用以下键：`rightHandGrip`、`leftHandGuard`、`stockShoulder`、`muzzleTip`、`ejectionPort`、`magWell`。每个值是带完整朝向的 Object3D，记录局部空间与轴；不用同时维护 `socket_barrel_tip/gunTip` 等重复别名。尺寸与位置由最终 spec 测得，不写死两款武器同一组数值。

## 4. 状态与七个构建 pass

初始化必须先于 intake 标记；每次 start/resume/correction 都执行 next：

```powershell
$Id = 'militia' # swat / ak47 / m4
$W = Join-Path $Run "hero-$Id"
$State = Join-Path $W ".img2threejs/state.json"
$Spec = Join-Path $Repo "docs/model-optimization/specs/$Id.json"
$Reference = Join-Path $Repo 'assets/concepts/militia-v3.png'
New-Item -ItemType Directory -Path $W -Force | Out-Null
# 正式run仅首次初始化；恢复时不得覆盖state
Invoke-Forge 'state.py' @('init','--state',$State,'--reference',$Reference,'--profile','animated-character','--spec',$Spec,'--max-per-pass','3','--max-total','6')
Invoke-Forge 'next.py' @('--state',$State,$Spec)
```

武器用 `generic`，参考/ID 同步更改。所有 state/next/mark 都显式 `--state $State`，base FINAL 脚本使用 `--workspace $W`；后者源码固定读取 `$W/.img2threejs/state.json`，不能在 `$W/state.json` 留一个第二副本或让脚本读仓库旧 state。init 不使用不存在的 `--workspace/--input` 参数。

### 4.1 人类阶段与真实机器 ID（首次 spec 校验前规范化）

| 阶段名 | `buildPasses[].id` / review `passId` |
|---|---|
| blockout | `blockout` |
| structure | `structural-pass` |
| form | `form-refinement` |
| material | `material-pass` |
| lighting | `lighting-pass` |
| interaction | `interaction-pass` |
| optimization | `optimization-pass` |

本机 character starter 的中间阶段是 `proportion-lock` / `feature-placement`，generic 默认还包含 `surface-pass`。项目不是把中文简写直接传给 next：在首次 review 前，将 starter 的 `buildPasses`、`sculptPipeline.passOrder`、review/screenshot pass 列表与所有 feature `passIds` 一起规范化为上表；比例锁定纳入 structure，眼部/局部放置纳入 form，surface 工作分入 form/material，不能丢掉验收内容。保留真实组件引用，不复制通用 hair/nose 目标覆盖遮挡人物的身份目标。

- starter 的 `targetId` 来自显示名 slug，须规范化为 `$Id`，显示名不决定路径。`assessment.json` 中实际字段是 `preSpecAssessment.anatomy`，不是根 `anatomy`。
- `profile=animated-character` 是 checklist 选择；`--character` 是建模轨道；`objectClass.primaryDomain` 是观察分类。`--domain` 仅按实际解析的插件域处理 augmentation，不代替前三者或自动生成 rig。character 的 domain 声明未提供 augmentation producer 时显式不适用；不把缺文件伪造成成功。
- 模板默认评分 0.7、critical 0.8、预算 250k/160 calls 等**不是项目授权**。按本篇 8/9 节落实 spec 支持字段与 recipe 分范围预算/质量要求；P-SPEC 拒绝冲突默认值，实际分数仍待图片评审。native optimization 不强制视觉证据，项目仍按下方七 pass 规则验收。
- M0 fixture 必须证明七个 ID 均被识别、漏图/错 feature 引用/旧阈值/超预算/过期 continue 均不能准出，不修改外部 orchestrator 来适配规划。

### 4.2 FINAL 与正式 rig 的衔接

next 中通用 `generate_threejs_factory.py → src/createObjectModel.ts` 与缺失的 runtime exporter 是上游默认 producer 建议，不是本项目 JS 工厂/导出器已经存在。M0 建受管的 **step→实际producer/CLI/schema/证据** 映射：保留原 checklist ID/顺序，build-current-pass 的证据必须是本轮真实 JS 候选构建及捕获，不能生成一次通用 TS 后谎称英雄已建好。action-ready 按锁定契约验证真实 pivot/socket/分件与 runtime 元数据，不写一个 true 标记代替功能。

`check_part_coverage.py` 需要 runtime manifest 的 `parts` 数组（含name/kind/module/triangles等），不是工厂的 PartRecord 字典。exporter 必须按其真实schema派生单向dump，并把每条记录映射到可见 geometry range/instance；合批语义代理没有真实渲染映射不得计为存在，重复别名/缺件不得靠补同名空记录过关。保留原生输出，项目另测pick/分解/coverage；不使用 `--warn-only` 消掉错误。

base FINAL 依次为 `part-coverage` → `action-ready` → `emission-target` → `plugin-gates`，之后才派发 domain rig 九步。自有 JS 工厂/导出器不选择插件 emission target；内部验证 GLB 也不等于选了该 target。

1. 真实 part coverage/action-ready 完成后，next 到 `emission-target` 时，使用 `state.py mark emission-target --state $State --status skipped --reason <具体理由>` 记录“不选插件 emission target，使用受管项目工厂”的具体依据。无 `--target` 的 emit_target 是 no-op 且不会完成该 state，不能反复执行期待解锁。
2. next 到 `plugin-gates` 时，以 `--workspace $W` 运行终态 sweep 并保留原始 JSON/退出码，再据真实结果标该步。此时未开始 rig 的 character provider 可能不参与，空报告只说明这次无参与 provider，不算 G1～G12 通过。若出现参与 provider/错误，按其真实数据处置，不能统一跳过。
3. next 派发正式 rig 九步后，最后显式 `gate_rigging.py --payload "$W/rig-gate-payload.json"`。若追加终态 sweep，受管 producer 先将同 hash 的派生 payload 放到本资产 `$W/.img2/artifacts/character/rig-gate-payload.json`，记录来源；这不是第二作者源。Windows 下终态 sweep 若因其子进程写死 python3 失败，按 01 篇报告/适配，不借另一份旧 state 解锁。

M0 验证上述路径、跳过原因、空报告与正式门禁的区别；任何越序 mark/缺核心 producer 都不能形成交付 PASS。

### 4.3 逐 pass 与失效处理

- 按 next 与锁定版 profile checklist 执行及 mark；`--evidence` 指真实文件，skipped 附 reason。不能手改 state 为 complete、伪造 step 或凭一张截图把整条链 mark done。
- 七个 pass 是 blockout → structure → form → material → lighting → interaction → optimization；只有当前解锁 pass 可继续。前三个先确定形体，material 中含真 PNG，lighting/interaction/optimization 不默默省略。
- 每个 pass（包括 optimization）必有 render + 原图 matched-view comparison + 内部特征核对 + 当次 reviewHistory。schema 中的 review 由真实判断写入，不使用示例 `--fidelity 0.88` 自动签字。
- 单 pass 最多 3 次修正、全程最多 6 次；达到上限/平台期/重复缺陷是**停止修正**，不是通过。退回最佳候选仅操作本轮拥有文件，保留差异和停止原因，不执行整仓 git revert/reset。
- 原生 completed_passes 会采信同 pass 任意历史 continue，不验证依赖哈希。M0 项目适配必须阻断过期证据，保留原始历史/所有修正计数，并用已验证的 state/ledger 更新流程使相应 pass 与下游重新待验；不删除历史、重 init 清次数或让原生 complete 抵消项目 stale/FAIL。该失效/恢复流程未证明可执行即阻断 M0。

## 5. Intake、相机、去光照与投影

### 5.1 工具能力边界

| 入口 | 实际能力 | 不能宣称 |
|---|---|---|
| probe_image | 图像尺寸/格式技术探测 | 已看清身份特征 |
| build_detail_inventory | 裁剪区域、创建待填存根 | 自动语义分解完整 |
| extract_landmarks | 通用比例引导与待填 anatomy | 自动实测14个关节 |
| solve_camera_pose | 初始 referenceCamera 猜测 | 单图严格焦距/6DoF 标定 |
| delight_albedo | 低频亮度近似归一化 | 完全剥离原光照或真实 albedo |
| bake_projected_texture | 投影/UV 描述符 | 已栅格化并写出 PNG |

图像是双图复合布局：先独立裁剪/前景 mask、标注 bbox/foot line/side identity，再做每视图工具与匹配。复合图全宽不能当每视角分辨率；不设置裁剪后短边必须 ≥1024 这种无法满足的门槛。

相机先拟合 bbox/比例/投影模型，再材质；正交或透视由观察与叠图残差选。记录目标像素、裁剪 offset、相机 aspect/FOV或ortho extent、transform、参考姿态和 residual；不把 yaw=90 直接当已经拟合。

去光照每张 crop 独立输出到工作区 `delight/`，保留原图与差分。参数是待视觉调整的初值，无虚构 confidence 字段/阈值；脸/棋盘格/藏青布料不可被归一化抹掉。

### 5.2 已核验命令形式

```powershell
# 文件路径在前一步实际创建并核验；相机数值由匹配结果决定
$Crop = Join-Path $W 'crops/front.png'
Invoke-Forge 'stage1_intake/solve_camera_pose.py' @($Crop,'--out',"$W/cameras/front.json")
Invoke-Forge 'stage1_intake/delight_albedo.py' @($Crop,'--out',"$W/delight/front.png",'--report',"$W/delight/front-report.json",'--strength','0.60')
Invoke-Forge 'stage3_build/bake_projected_texture.py' @('--reference-image',$Crop,'--delit-image',"$W/delight/front.png",'--camera',"$W/cameras/front.json",'--mesh-id','body','--texture-size','2048','--unseen-strategy','palette-continue','--out',"$W/bake/front-descriptor.json")
```

`body` 只是例示 ID；正式 descriptor 必须指向导出 manifest 中真实 mesh ID，并对其他目标分别覆盖。使用 `--out`，不用 PowerShell `>` 写 JSON 导致编码或错误文本混入。

### 5.3 浏览器像素执行器（M0新增项目实现）

descriptor → 源图加载/解码 → 匹配 referencePose → 源相机 depth/semantic mask → UV-space 渲染 → 可见性加权融合 → 未见区补全 → UV island padding/mipmap → readPixels → runner 保存 PNG → 工厂加载并复验。

- 权重只给前景、位于视锥内、朝向合适且通过深度遮挡的同一部件，拒绝手/枪/背景投到胸挂或躯干。前后不因朝向相近而互相透写。
- 正侧各独立 mask、裁剪和相机；重叠带按置信度/法线/遮挡融合。非对称臂章不 mirror。背面未知区域标 inference；不得拉伸前脸/前胸覆盖整面。
- 图集唯一 UV、合理 texel density、无意外 UV overlap、岛间 padding；检查色彩转换、readPixels 下上行、Texture.flipY，避免图像倒置或 double gamma。
- 主色 PNG 作为 sRGB；normal/roughness/metalness 等数据图不设 sRGB。完整 albedo 不再乘一次深色 `material.color`（通常白色），否则双重压黑。
- 单张 albedo不代表单材质/单 draw call：布/皮肤/金属仍按参数分区。粗糙度、金属度可标量或受管数据遮罩，织物/皮肤/木/聚合物为非金属。
- 最终 PNG 是衍生产物，不手涂；隐区程序化补全须记录区域/种子/置信度，不取代可见高辨识纹样的原画投影。
- descriptor、UV/geometry/source/camera/recipe/执行器哈希入 manifest。重复烘焙原子写入成功后才替换正式 PNG；GPU差异用声明的像素容差验证，不假诺跨驱动字节绝对一致。

## 6. Rig 来源、冻结、绑定和动作

执行D-01于2026-10-01由用户确认的内部GLB验证路线；不引入外部模型，不把demo改成GLB加载。授权已确认不代表导出/读取样例或门禁已经通过。原生 checklist 以 `img2-character/domain.json` 为准；原生工具在该插件 `tools/`，不能从插件 cwd 调用 base 的 `forge/` 目录。

1. 验证GLB须含本次骨架与待交付剪辑：先在spec/recipe完成可导出的骨架/剪辑定义，必要的序列化 skin 只在隔离临时实例生成（不修改正式待冻结缓冲区），再导出并读取以确定真实索引。绑定后调整clip时重新导出/读取并重采样关联证据，不沿用旧GLB报告；geometry/UV不变时不重freeze。自生成 GLB 经 `rig_glb_reference.py` 读取，选择正确 skin；关节按**真实 skin.joints**，技术节点不能混入 joint index。构建全部节点→父子→root→更新 world matrix→Skeleton。工厂与派生 rig-data 使用实际 joint 映射，不按名字或遍历顺序重排。
2. 先完成 geometry repair，再 freeze position/normal/UV/index/material-group 及 mesh-local transforms（项目扩展）；skinIndex/skinWeight/skeleton 是允许新增属性。所有权重 producer 的输入输出 shape 在 M0 验证，不能把 sculpt spec 直接当 rig payload。
3. 在规范 bind-local 空间执行 attached identity 绑定（正式 mesh 在绑定时 identity，非 identity mesh-local 预先规范化并冻结），逆绑定从真实 bind 矩阵导出/核对；绑定后不因添加 display wrapper 重新 calculateInverses。display wrapper 与 turntable 不进入作者骨架或 clip root motion。M0 必测绑定后添加 wrapper 旋转/平移仍与规范空间采样一致。
4. 测地线/conditioning 仅作用需蒙皮网格；刚性装备与武器 parent 到骨节点。每个断开的实体须有明确 seeds/允许骨集合，防止胸部和手臂相邻串扰。两侧对应网格不能全套一个 nearest-bone 标签冒充 geodesic。
5. clip 提交前采样并量化：idle 呼吸；walk 为**原地巡回步态+虚拟行进距离**，支撑相用恢复的前进位移换算到 locomotion 空间再测 footSlide；aim 为进入后保持的姿态，只有呼吸/微动回环才叫循环。
6. 双手持枪时 walk 不反向大幅摆臂；右手主挂载，副手按每个 clip 维持托举误差，枪托在 aim 时贴肩。无须本期新增通用 IK，但不能只固定枪到一只手就忽略另一只手。
7. bind restore 在显式 reset/stop 验证与模式切换中完成，不在正常 tick 里每帧覆盖动画。play/stop/seek/advance 的语义、动作时间与冻结时间必须可控。
8. 绑定后再次导出冻结缓冲区逐字节 parity；几何若确需改，退回构建/修复阶段使旧下游证据失效，不用重新 freeze 遮掩失败。

## 7. 门禁分层：原生事实和项目准出分开

原生 `gate_rigging.py --payload` 有 **12** 行 G1～G12；旧参考文件写 G1～G10 不代表当前只有十门。其包装 verdict 是 pass/fail/error；缺测行 `unevaluated` 可导致包装 error/退出2，不能用 exit0 判断不存在的问题。

| 原生项 | 输入/真实含义 | 项目处置 |
|---|---|---|
| G1 | bindingSamples：各clip至少5个时刻，实际node与track interpolant比较，delta≤2^-23 | 必做 producer；不是“一个顶点移动了” |
| G2 | deformation：每mesh/frame至少64个顶点有限值 | 各clip实测；小网格另做全顶点项目检查，不伪报64 |
| G3 | bindRestore：显式stop/reset后差值≤1e-12 | 保留原生结果；项目TRS/顶点恢复检查必做 |
| G4/G5 | binding：所有顶点权重和误差≤2e-7，合法索引/有限非负权重 | 必须PASS；不能只测最大索引漏掉负/非整数 |
| G6 | meshVisibility：原生visibleMeshCount == visibleSkinnedMeshCount | 刚体与蒙皮混合需声明统计范围；原始全可见数量另外保留，项目逐件coverage阻断 |
| G7 | chainAnchors：独立左右证据、rig-local左+X右-X | 缺独立证据不算PASS；不得从x正负生成名字 |
| G8 | clips[].stance：footSlide≤0.01H | 来自时序接触采样，不是静态/纯离线猜值；还查离地/穿地 |
| G9 | clips：禁止未声明joint scale | joint scale轨道/采样都检查；呼吸用转动/位移而非骨骼膨胀 |
| G10 | skinIntegritySweep：各clip×≥4times×2sides×2azimuths与blend-off实测baseline | 三条clip默认最少48帧，非固定176；洞/褶分报，未知baseline不套用别人的数值 |
| G11 | meshParity：冻结缓冲区绑定前后一致 | 必须PASS，项目补充transform/group范围 |
| G12 | rigReference：来自GLB自有骨架或usable correspondence | D-01能力样例通过；不以common-rig字典填假glb/correspondence |

G6 输入若按 required-skinned subset 适配，报告写明 adapter 与 excluded rigid 列表，不能说所有可见零件都蒙皮了；与原始数量不符的原生 verdict 原样保留。若合法rigid使原生全场景G6 FAIL，则归类为适用范围差异，需明确批准的schema适配例外并保留原FAIL；P-RIG逐件覆盖仍必须PASS。缺件/required网格漏蒙皮等真实FAIL绝不以这条例外放行，scope-adapted通过也不得冒充未经适配的原生全场景ALL_PASS。

原生 producer 需测真实运行时并覆盖 roster；手填零差值/足滑、true/bound/coverage 数值均无效。G10只有5姿态的preview不能宣称全扫；48帧是本项目3条clip的**每个 blend 模式**轴最小值，blend-on/off 是配对控制，基础至少48对/96张原始捕获（需要额外分层渲染时另计），不等于足够找完缺陷。G10 payload.frames 按原生所表示的单模式 sweep 轴乘积填写，不能把双模式文件数混成该字段。动作峰值/接触切换另补采样。

G8 producer 从 recipe 的预先声明接触窗口和固定虚拟行进路径取得输入，采实际足骨/足底点并变换到 locomotion-world；不能看完足轨迹再反拟合一个刚好零滑动的速度。walk 两侧每个支撑区间有足够采样、覆盖接触切换；idle/aim 的站立保持区间也由项目检查双足稳定/离地/穿地，不能只拿静止 clip 的 stance 让原生 G8 通过而漏测 walk。

G6 范围适配/小网格 G2 例外需在 M0 拿实测与替代覆盖提出结论；目前未获例外批准。原始全场景与 scope-adapted 报告分别命名/标范围，ALL_PASS 限未经范围替换且全部十二项 PASS 的报告。

**项目阻断检查（必须有事实数据，不受原生 blocking:false 影响）：**

| ID | 证据/失败判定 |
|---|---|
| P-INPUT | 新run/版本/源/哈希/前景裁剪齐全；默认脚手架不冒实测 |
| P-SPEC | strict-quality + recipe校验；稳定mesh/part/feature映射完整 |
| P-FEATURE | 每个critical特征独立对照PASS；形体、内部结构、纹理边界正确 |
| P-GEOMETRY | 四向+关键近景；无严重非预期孔洞/自穿插/浮件；合法开口与装具搭接有逐对说明 |
| P-TEXTURE | 真UV烘焙、遮挡mask、双视图与unknown补全可追溯；接缝/色彩正确 |
| P-RIG | 权重/索引/空间/joint/冻结/rig对应实测正确；全部required mesh绑定；全部rigid正确挂接 |
| P-ANIMATION | 全部必需clip驱动正确区域；有界有限形变；bind恢复；足接触与双手/贴肩误差≤0.005H（对应适用姿态） |
| P-UI | explode/restore、wire/restore、clip快速切换和URL组合可复现；无永久时间缩放/资源遗留 |
| P-RUNTIME | 加载/采样/渲染后成功；任何异步失败为粘性FAIL；404/超时/降级不得DEMO_OK |
| P-BUDGET | 按8节统计并实测；缺少hardware数据不伪称60FPS或实际GPU显存 |
| P-ISOLATION | 游戏冻结文件/导入链未变，低模契约与游戏smoke回归正常 |

原生无数据且非核心的条目只可能形成**带明确理由和影响的待用户批准例外**；已知核心失败、缺核心producer或项目阻断不通过均不能交付。合法刚体的 G6 范围差异仅走前述明确例外流程，不归类为缺数据，不因 D-01 已确认而自动批准。报告区分 `projectVerdict` 与 `nativeVerdict`，仅原生全12项PASS才写 ALL_PASS。

静态工具能力不得夸大：self_intersection/attachment/turntable按实际schema输入与测量范围使用，不统一宣称“穿插体积<0.5%”或“脚本0违规=真实无穿模”。实际mesh导出、pair allowlist、关键pose/近景与逐件挂接测试共同补齐覆盖。

## 8. 预算与测量（全项目唯一数值表）

| 范围 | 三角面上限 |
|---|---:|
| 人物本体（皮肤/基础服装，所有required skinned） | 15,000 |
| 独立人物装具 | 7,000 |
| 挂载武器character变体 | 6,000 |
| 完整人物合计 | 28,000 |
| 人物demo beauty场景（含台面装饰） | 30,000 |
| AK-47 showcase | 15,000 |
| M4A1 showcase | 18,000 |

主体骨 ≤32、次级动态骨 ≤12、总骨 ≤44；人物/武器英雄材质 ≤5（不含台面/辅助），人物albedo单张2048²；武器showcase语义part ≤80。

- 原有 assembled beauty 主渲染 pass draw-call 目标 ≤16；shadow pass、透明双面、wire overlay、debug/explode **分别统计**，不能拿遍历Mesh数量冒 draw calls，不能把多pass合计与16混用。独立武器通过合并静态几何/InstancedMesh保留可动组，80语义零件不等于80次绘制。
- 合批方案在 freeze 前落定。assembled 复用合批网格，exploded 使用可追溯的刚体陈列代理/只读片段派生物，切模式时隐藏原合批显示并只呈现一次；不原地拆/改冻结 buffers、拉骨骼或同时渲染重影。蒙皮本体不拆；逐件选择/高亮与完整 TRS 往返须测，回 assembled 原几何/hash不变，陈列临时资源由宿主释放。
- 区分 submitted triangles（含instance/group/drawRange）与unique geometry triangles，统计范围写明；renderer.info的帧数据必须标reset边界。线框不沿用triangle口径。
- 120MB 为纹理/geometry/render target估算目标，不称为浏览器测得真实VRAM；mipmap/cubemap/PMREM/shadow均纳入公式，renderer.info.memory只有数量不是字节。
- 性能目标为受测设备1080p/DPR=1、正常assembled beauty、预热后30s的流畅60FPS；报告硬件/GPU/backend、median/p95 frame time、掉帧率。无指定核显实机测试就只报告当前设备，软件无头结果不当成Iris Xe实测承诺。
- 若确有draw/材质/面数不足，先合批不删除critical特征；仍需变更时提交具体对比和预算申请，不能静默改数字或交付弱化版。

## 9. 视觉评分、证据与停止

沿用质量目标：AI辅助综合保真≥0.85、每项critical≥0.90；这是**评审要求而非工具已算出的事实**。同时提交分区图、原画对照和缺陷列表，评分人/方法/版本明示。全局高分不救关键特征错误；没有图不能给分；plateau不等于通过。

每次review：run/pass/round、spec/recipe/source/render-profile哈希、actual camera/pose/time、原图crop、四向/内部/特写、工具原始结果、critical/important清单、修正组、前后变化与decision。优先修 camera→silhouette→head/face→clothing→accessory→material→lighting，同轮不混改多类以掩盖根因。

判定用 `continue/refine-spec/refine-code/request-input/stop` 与next一致；终止次数来自reviewHistory而非对话记忆。评分下降只回本轮拥有的更改，保留最优候选和负收益证据。

模板不预填PASS、0洞、0足滑或示例分数。报告空项初始pending；缺测行unevaluated/原因/下步；失败行FAIL/证据/阻断原因。

## 10. 项目工具责任与交付可复现

所有 `scripts/hero/`、`hero-review`、`bake-runner` 都是**下一轮新增并先在M0验收**，不是已存在功能：

- runner：ready/error等待、固定时刻、相机/模式、截图/数据读写、超时、隔离进程与负向测试。
- export-mesh：实际r160场景buffers、transforms、part IDs、mesh/rigid/skinned分类；二进制字节/hash保真。
- export-rig-glb：spec代码自产rig的序列化，正确joint/inverse-bind/clip索引与round-trip；禁止加载外部模型替换构建。
- validate-asset：作者源/派生依赖哈希、spec/recipe schema、模板规范化、过期 review/下游失效、逐件coverage、项目阻断项、原生报告保真与最终机器summary。
- state/终态适配只在本项目实现，M0 验证 CLI 与恢复过程；单份 checklist state，不补写外部 skill，不假造执行结果。

脚本设计完成后先落实本地 `--help`/schema，再在实施说明写真实命令；本规划不杜撰这些工具的现有CLI。

提交按可回归纵向切片，spec与对应实现/manifest同一检查点；投影PNG必须在geometry/UV确定后生成，不按旧文“纹理先于模型”提交。只stage本轮文件；不自动提交用户原有改动。

# 03 · Militia 英雄版试点实施

> v1.2 · 2026-10-01。仅使用本轮新 run，spec/接口/坐标/门禁以 02 篇为唯一口径。
> 准入条件：M-pre/M0须先通过，评审台与烘焙/rig样例须实际可用（均待实施）。D-01内部GLB路线已由用户于2026-10-01确认，无须重复请求该授权。

## 1. 输入、观察与身份契约

基准 `assets/concepts/militia-v3.png`，本次只读 probe 为 1312×1199，复合正面+侧面；每个 crop 的有效人物像素另计。显示总高以 1.75m 为尺度参考，但相对比例由原图标注，不能先锁7.5HU再把图强塞进去。

本次实图观察：风格化连续切面、卡其卷袖/长下摆、橄榄工装裤、棕靴；两手持木件步枪，枪斜跨胸前、枪口向下；正面红臂章在画面右，即解剖左；侧面能看到该红章，不能直接命名“角色右侧图”。身份左右需 crop manifest 独立标注。

### 1.1 五项 critical（任何一项错误都阻断）

| ID | 观察目标 | 实施与验收证据 |
|---|---|---|
| shemagh-wrap-pattern | 卡其/深色棋盘格头巾、贴头包覆、胸前三角垂布、后脑尾布 | 正面/侧面轮廓与棋盘格尺度；额头/耳际/下巴/胸前连接特写，不用棋盘贴一个盒子替代 |
| face-mask-eye-band | 橄榄面罩与窄眼部露肤、双眼眉线 | 头部局部matched-view及内部对比；肤色带被遮住/眼睛删除仍视为失败 |
| red-armband-left | 解剖左上臂单侧红布环 | 正面/侧面独立左右证据；rig-local +X、display -X；右臂不得有红章 |
| chest-rig-magazines | 橄榄胸挂、横排四联弹匣袋、露出深色端头与肩带扣 | 四联数量、间隔、体积、袋口深度、与枪/手遮挡关系；不把单纯贴图四条纹当立体袋 |
| ak47-rifle-stance | 木件/深色金属、弯弹匣、双手斜跨持枪关系 | 原图姿态对比+握把/托举/枪托特写；持握两手误差与动画测试 |

important：卷袖折层/露前臂、衬衫下摆、立体cargo口袋、棕褐靴/厚底/鞋带、露指手套与补强块、腰带/背后小包。均入 inventory，映射到真实组件或材质局部参数；被遮住与未观察的部分分别标注。

## 2. 实施步骤与每步准出

### 2.1 新run初始化与完整观察

使用 02 篇 `$Id='militia'` 的 init/next；state 使用 02 篇 `$State` 单一路径，指向受管 `specs/militia.json`。先读锁定版 character reconstruction/likeness、local-spec-search与门禁文档，再开始作者源。

- 保留原图/哈希；裁剪写 `$W/crops/front.png`、`side.png`。裁剪框由实际bbox决定，留完整头巾、靴子、枪托/枪口；不硬编码旧0.05~0.55区域。
- 每视图记录原图pixel rect、前景mask、朝向、有效bbox、头顶/足线、遮挡/未知区。原画的地面投影不当成靴底或材质。
- 跑 probe 和 detail inventory后逐区人工填充；complex 至少满足工具生成的detail floor（本机complex起点10），不能把10个空存根算完成。

```powershell
Invoke-Forge 'stage1_intake/probe_image.py' @($Reference,'--out',"$W/probe.json")
Invoke-Forge 'stage1_intake/build_detail_inventory.py' @($Reference,'--mode','grid-3x3','--complexity','complex','--out-dir',"$W/zones",'--out',"$W/detail-inventory.json")
Invoke-Forge 'stage2_spec/new_pre_spec_assessment.py' @('MilitiaHero','--image',$Reference,'--complexity','complex','--character','--out',"$W/assessment.json")
Invoke-Forge 'stage1_intake/extract_landmarks.py' @("$W/crops/front.png",'--out',"$W/landmarks/anatomy.json",'--overlay',"$W/landmarks/front-guide.png")
```

新文件首次生成不加 `--force`；已存在时先查来源，不覆盖旧作者数据。工具help变化时先复验，不硬套命令。

**准出**：critical与important清单完整，左右独立标注；原图与裁剪可读取；未知背面/腋下/鞋底显式标 inference。Landmark引导还不是实测。

### 2.2 质量契约、解剖测量与相机拟合

- 人工量头高、眼线、肩/肘/腕、髋/膝/踝、躯干宽、侧面厚度；归一化基于每视图**人物bbox**，说明图像y向下与3Dy向上转换。
- 回填 `assessment.json` 的 `preSpecAssessment.anatomy`，标注source/原图点/置信度。面罩下的口鼻位置不能伪称MediaPipe实测。
- 正侧分别拟合referenceCamera和referencePose；先bbox/轮廓，再脸、四联袋/枪手位置的内部对照。FOV/距离/yaw/pitch是可调初值，不复用旧32°/36°/4.2m作为测量结果。
- 头部与躯干连续形体相对比例由两视图共同约束；侧视并非真实正交标定，若两视图矛盾则记录差异，不让整体结构为某一张图局部变形。

**准出**：标注图与overlay可审阅，camera/pose/coordinateFrame明确；无“7.5HU默认值即精准测量”的声明。

### 2.3 受管spec与配方

```powershell
Invoke-Forge 'stage2_spec/new_sculpt_spec.py' @('MilitiaHero','--image',$Reference,'--assessment',"$W/assessment.json",'--character','--out',$Spec)
# 按02篇规范化targetId、真实pass ID/引用、模板阈值/预算，填完组件/材质/身份目标；有真实augmentation时才合并
Invoke-Forge 'stage2_spec/validate_sculpt_spec.py' @($Spec,'--strict-quality','--json')
```

spec/recipe声明：连续本体、头巾壳体、rigid/skinned分类、骨架/种子、四联袋、红章只在左侧、UV区域与密度、参考姿态、装具挂点、投影mask、所有critical局部审查目标。本机 profile 未声明 augmentation producer，不强加 `--domain animated-character` 作为开关；以后若出现真实插件产物，再按其 resolved domain/文件与schema合并。模板七阶段的原始ID不是本项目七阶段，按02篇在第一次review前统一映射。

- 上臂/前臂/肘部是有连续关节环线的mesh，不用分离胶囊掩盖连接；头巾柔性尾布是否需蒙皮在此决定。
- 刚性胸挂袋/武器/背包可分解；与本体连续的袖口和衣服褶层不强行切成可移动装具。
- 创建 `referencePose` 还原斜枪双手位置；T-pose只用于绑定/分解。姿态不一致处按02篇分区处理投影。

**准出**：strict-quality与配方校验通过；无占位通用feature；每个detail可追到part/localFeature/material override。

### 2.4 七个锁定pass（每一行都评审再解锁）

| Pass | 主要工作 | 当次必须检查 |
|---|---|---|
| blockout | 连续头/躯干/肢体大形，基本靴/枪占位；正确尺度与重心 | 同姿态正/侧比例、头躯干关系、左右位置；白模已经像参考 |
| structure | 包覆头巾/面罩、胸挂四联、卷袖、衣摆、cargo/靴层级 | 真实遮挡/搭接，装具数量、稳定part ID；不靠零件堆砌冒层次 |
| form | 头巾包覆与垂布、眼眶/眼线、手套手指、袖口皱折、枪弧弹匣/靴底 | 近景/四向+关节应力预检；连续曲面、切面风格，无盒头/浮件 |
| material | 双视图去光照→真UV烘焙2K、PBR分区 | 格纹尺度/接缝、肤色眼缝、红章单侧、原画影子不烘死 |
| lighting | PMREM+主光与曝光校准 | 织物/金属分离，切面光感而非过度磨平或塑料亮面 |
| interaction | 分件选择/高亮、静态bind/T-pose分解、socket与clip控制接口（仅结构/协议） | 不提前依赖正式动画完成；rig九步后再测实际clip/恢复 |
| optimization | 合并静态装具、减少材质/绘制，保留语义part清单 | 02篇预算重测与逐特征回归；优化不得砍critical |

表内阶段是人类简称，命令/review使用02篇机器ID；form/投影前的姿态/关节预检使用隔离草案实例，不提前签正式rig门禁。七pass与base FINAL实际准出后才开始2.6；最终权重改变referencePose表面时按02篇失效/重烘焙规则复验。

逐pass都捕获referencePose正/侧，以及规范四向和当前关键特写；头部/眼部/头巾/胸挂用内部差异和局部visible footprint，不能只有全图剪影。原生工具只按已验证输入schema执行，实际mesh/pose来自项目exporter而非旧不存在的runtime脚本。

**形体检查点**：blockout/form失败停在该pass，不先加纹理、写动画或复制到SWAT。达到修正上限不是验收通过。

### 2.5 投影烘焙的Militia重点

统一流程和命令见02篇；目标PNG仅 `assets/textures/hero/militia-albedo.png`（2048²），front/side中间纹理留 `$W/bake/`。

- 格纹来自去光照参考crop，不用大面积程序化棋盘替代可见头巾；后脑缺图可按记录的纹样延续补全，逐区写confidence。
- 头巾/眼部/面罩分semantic mask；不能将眼睛投到布上、将面罩投到露肤带。
- 每视图先剔除枪/手/阴影遮挡再向躯干烘焙；头巾胸前遮住衬衫的像素不能写进衬衫UV。
- front/side overlap有相机可见性、朝向、置信度融合；UV seam的格纹错位优先重拟合相机/pose/UV，而不是模糊掉纹样。
- Atlas容量给头巾/眼部/红章足够texel密度，不要求所有部件等面积。PNG出现在磁盘后，还要实际材质加载、raw/unlit与PBR四向复验。

**准出**：PNG/报告/执行器与输入哈希齐全、atlas布局可查看；接缝无明显拉伸/串色；不声称近似delight完全消除了固有光。

### 2.6 Rig九步与动作

按插件domain顺序：`rig-contract-read` → `glb-rig-reference` → `mesh-repair` → `mesh-freeze` → `rig-payload-validate` → `rig-bind` → `mesh-parity-verify` → `clip-measure` → `rig-gates`。动作设计和权重producer在对应前置中落实，不能靠九步标签自动生成结果。

- 读取的是D-01本项目自产验证GLB，不借外部人形；所有joint/order/track来自真实解析及对应manifest。
- 冻结后仅增蒙皮/骨架；geometry改变退回form/material及其验收链。
- 胸挂/背包/刚体武器跟随对应骨节点；柔性头巾tail只在显式允许链上蒙皮，肩部/胸部相邻但不串权重。
- 右手主挂、左手托护木。idle保持自然持枪，walk是携枪原地步态，不反向摆臂甩离护木；aim可设计为水平举枪但标明这是**动作设计**，不是原图测量。
- walk以预先锁定的虚拟前进路径测双侧每个支撑区间footSlide，不事后拟合零滑动；腿/裆/靴和枪手区域重点检查，动作峰值补采样。
- idle/walk循环由poseReturn/root回环证明；aim的入位和保持区间分清。death不加入本期必需范围。
- 原生12行报告与项目报告均按02篇执行；G1测真实track→node，顶点运动仅是额外可见性证据。

**准出**：每个clip的实际骨骼/区域顶点/手枪握持/地面接触采样可审阅；freeze/parity、G4/5、G7/8/9/11/12及核心项目检查满足；不因有clip或静态截图就宣称动画可用。

### 2.7 Demo与完整回归

- `demo-militia.html` / `js/demo/militia-demo.js`加载 `await buildHeroMilitia()`，不修改游戏模型。
- UI/PMREM/分解/线框/ready采用05篇，不保留旧sin驱动也不新增第二mixer。
- 特写检查头巾、眼部、四联袋、红章、枪手、靴；标准referencePose默认可比对，动画默认idle是设计动作，二者不得混为一条验收图。
- 运行默认、三clip、wire/explode组合、快速切换/往返、turntable及负向测试；错误不可被DEMO_OK覆盖。
- 游戏冻结哈希/低模契约回归，并将最终四向/特写/报告转入本run受管evidence目录。

## 3. 交付与准出清单（待执行）

- [ ] spec/recipe/输入哈希/裁剪/左右标注/相机与referencePose可恢复。
- [ ] 七pass图片+局部feature表，5项critical与important逐项核对。
- [ ] 最终 `militia-albedo.png` 为真实遮挡正确的UV烘焙2K；manifest完整。
- [ ] 工厂返回02篇一致结构，全部required skinned/rigid零件覆盖。
- [ ] Rig/clip/foot/握持/恢复实测、原生报告保真、项目阻断检查通过。
- [ ] 分解到T-pose再复位、线框恢复、所有页面状态与负向用例通过。
- [ ] 预算与当前实机性能有报告；游戏冻结范围无改变。
- [ ] 用户可检查实际demo和证据；没有未解决的critical问题才启动SWAT。

风险优先处理：格纹缝错、眼部色块丢失、四联袋被枪遮挡后简化、头巾tail/肘部漏缝、两手握枪与步态冲突。回退均退到对应作者源/pass，不用提高灯光/评分或删细节“救场”。

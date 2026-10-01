# 06 · Phase 2 武器英雄版（AK-47 / M4A1）

> v1.2 · 2026-10-01。两个人物完整准出后启动；独立参考缺失就停在输入准备，不以角色图裁剪冒充独立高清重建。
> 统一ID为ak47/m4，接口/纹理/坐标/预算/证据以02篇为准；通用展示与runner见05篇。

## 1. 范围、输入与启动门

核心交付：程序化独立武器 ×2、PBR与真UV烘焙、独立Inspect/静态Explode/Wire展示、完整socket、人物挂载的轻量变体与装配回归。Reload/Fire是次级交互轨道，核心检查不冒称这些已交付；未实施时UI不显示空按钮，进度与后续里程碑单独列明。

前置：M-pre/M0、militia与swat、通用评审/像素执行器/预算测量已通过。不得只凭“至少首个人物完成”打破总规划的串行阶段。每把武器再检查：

- `assets/concepts/weapon-ak47-ref.png`、`weapon-m4-ref.png` **实际存在**并经用户/制作侧确认；本次规划查验未见这些文件，不将其写成已有输入。
- 独立高清侧视/另一侧或3/4视、关键局部，枪无手/身体遮挡；每视图有效枪体像素、aspect、bbox、方向、反射/阴影、unknown明确。2048²文件不等于枪体2048像素，也不证明正交无畸变。
- 锁定具体变体/附件/饰面与引用依据；`AK-47`显示名不能自动证明“冲压机匣+斜口装置”等旧文组合全正确。按当前独立参考确认机匣、枪口、准星、护木、枪托与弹匣；不要拿不相符的另一型号结构补齐。
- M4A1同样确认导轨/枪管外形/枪托/瞄具/握把/弹匣；不得固定旧14.5英寸等真实尺度再假称由概念图测出。实物尺度只有可靠来源支持才使用，否则说明游戏展示近似尺度。
- 需要精确CS2某款皮肤时先显式升级到相应domain intake/classification；本期generic硬表面不虚称已通过cs2 domain或“真实图纸严格一致”。

缺图/变体不明→request-input；角色随附枪可继续原轻量展示，但不能作为Phase 2同等级的投影来源。程序化纹理可以补unknown，不能替代缺失的独立参考然后声称Medusa级保真完成。

## 2. 骨骼less硬表面路线与数据契约

使用 `profile=generic`；不调用人体landmark、geodesic或人物G1～G12。父子Group/Object3D变换用于活动件，必要的机械AnimationMixer也只驱动rigid节点，不创建假Skeleton来满足人物自检。

作者源 `specs/ak47.json` / `specs/m4.json`；扩展recipe定义部件、材质mask、UV、part/合批/pick映射、拆分向量、socket完整frame、变体差异与可选机械时间线。

输出：

| 资产 | 工厂/入口 | 纹理 |
|---|---|---|
| ak47 | js/hero_models/ak47.js → buildHeroAK47 | ak47-wood-albedo.png / ak47-metal-albedo.png |
| m4 | js/hero_models/m4.js → buildHeroM4 | m4-receiver-albedo.png / m4-polymer-albedo.png |

可选roughness/normal等数据图在manifest中声明，使用一致命名与线性色彩空间。没有producer就不列为已有必需产物。镜片默认使用05/04篇的Standard透明近似，Physical透射是额外选项，不顺手增加材质/依赖/性能例外。

工厂是异步、返回 `{group, parts, sockets, materials, bounds, actions, dispose}`；parts为稳定PartRecord字典，不混用数组/裸node。options.variant必需识别 `showcase` / `character`，两档资源与统计可追溯。Phase 1 随附枪已遵循同一接口/socket/character预算；Phase 2 在不同输入manifest下升级独立showcase与可替换轻量版，不因参考尚缺就阻断人物原图中的随附枪，也不将后者签成独立武器交付。

## 3. 结构观察与spec（不是先假定枪械零件答案）

### 3.1 AK-47显示标签下的观察分组

机匣/盖/可见操控件/扳机护圈；枪管/导气轮廓/枪口；护木/枪托/握把；准星/照门；弯弹匣及表面筋。每组填写：当前参考观察、形状/比例、材质、接缝/倒角、可动或静态、连接父件、未知内容与身份判定。

重点核验：弹匣曲线是真扫掠曲线而非多盒折线；护木与金属分色/木纹走向；枪管与上方组件的双层轮廓；准星/枪口开口样式与当前变体一致。旧“必须全圆护圈、必须斜切防跳器”不得替代当前reference证据。

### 3.2 M4A1观察分组

上/下机匣与接口；导轨/护木/握把；枪管/枪口；枪托/托芯；瞄具/镜片；弹匣与可见操控件。重点核验顶部轮廓、导轨节距与连续性、机匣开口/突出块、伸缩托分层、弹匣曲线、瞄具轮廓。

刻线/铭文/瞄具红点只在参考能支持时制作。简单悬浮红点是风格化近似，不声称真实无视差光学系统；瞄具/枪口的合法孔洞在几何mask中显式声明，不让“无洞”门禁误杀。

### 3.3 PBR分区

金属/涂层/木/聚合物/玻璃按表面实际性质分区；木、聚合物、玻璃为非金属，涂层表现不因底材是金属就全设metalness=1。完整albedo贴图一般乘白色基色，避免旧木纹再乘深棕导致压黑；材质参数初值不是测量真值，结合中性IBL对比确认。

## 4. 实施步骤与准出

### 4.1 初始化与intake

使用01篇前置，为ak47/m4分别建 `$W`、`$State`、`$Spec`、`$Reference`（$State固定为02篇路径）；只首次init：

```powershell
Invoke-Forge 'state.py' @('init','--state',$State,'--reference',$Reference,'--profile','generic','--spec',$Spec,'--max-per-pass','3','--max-total','6')
Invoke-Forge 'next.py' @('--state',$State,$Spec)
Invoke-Forge 'stage1_intake/probe_image.py' @($Reference,'--out',"$W/probe.json")
Invoke-Forge 'stage1_intake/build_detail_inventory.py' @($Reference,'--mode','grid-3x3','--complexity','complex','--out-dir',"$W/zones",'--out',"$W/detail-inventory.json")
Invoke-Forge 'stage2_spec/new_pre_spec_assessment.py' @('HeroWeapon','--image',$Reference,'--complexity','complex','--out',"$W/assessment.json")
```

先单独crop各视图/foreground mask与尺寸，再逐细节填入inventory，classify variant/附件。不使用旧不存在的 `--workspace/--input/--views front,side/--part-mask`。

准出：输入/变体明确、critical清单和unknown齐全，机械细节映射到spec/recipe。

### 4.2 相机/去光照/spec

每视图用02篇已核验命令生成相机初猜、人工叠图拟合、独立delight；正交投影由图像证据与残差判定，不把“横置”自动等同无透视。

生成generic sculpt spec，完善所有结构/材质/关系再strict validate：

```powershell
Invoke-Forge 'stage2_spec/new_sculpt_spec.py' @('HeroWeapon','--image',$Reference,'--assessment',"$W/assessment.json",'--out',$Spec)
Invoke-Forge 'stage2_spec/validate_sculpt_spec.py' @($Spec,'--strict-quality','--json')
```

按02篇在首次review前规范化targetId、七pass机器ID/全部引用、模板默认阈值与分范围预算；generic的surface工作纳入form/material。spec以具体型号/饰面命名；ID仍ak47/m4。坐标+Y上/-Z枪管，rightHandGrip局部原点与朝向明确；所有其余socket是实际几何测得的frame，不复用旧一表近似坐标。

准出：目标比例/各critical形态可审核、作者源完整、七pass解锁依据明确。

### 4.3 七个构建pass

| Pass | 工作/准出图片 |
|---|---|
| blockout | 枪体长度比例、机匣厚度、枪托/枪管/弹匣整体；两视图白模匹配 |
| structure | 父子层级、可动组、连接/接口、各socket及静态合批区；合法孔洞/allowlist |
| form | 弧曲、倒角、导轨/筋条/可见操控件/铭文；四向+原图局部特写 |
| material | 分部件mask、真UV烘焙、PBR分区、镜片/木纹/金属边界 |
| lighting | 中性IBL校准与beauty；不靠过曝/死黑掩盖结构错误 |
| interaction | Inspect、click高亮、静态拆分/复位、Wire及socket装配 |
| optimization | showcase/character两档、合批/pick映射、材质/draw/triangle与特征回归 |

每pass按02篇捕获matched-view和内部/局部特征、review、next后解锁。刚性顶点导出供工具检测，不能因无骨骼就略过静态几何与装配门禁。

### 4.4 分材质投影执行

`bake_projected_texture.py`只生成每个目标mesh的descriptor，PNG由M0项目bake runner处理。部件mask/变体材质分区由manifest与执行器承担，不向描述符工具传不存在 `--part-mask` 或把 `--out xxx.png` 当栅格化结果。

双面/多视图可见性与depth；木/金属/聚合物纹理独立atlas，UV seam/padding、readPixels/flipY与sRGB同02篇。刻线/图案不能跨岛拉伸；未知面有标注的材质延续，不凭空复制另一侧的保险/抛壳窗结构。

准出：磁盘PNG+执行报告+原始source/UV/camera/mesh hash，实际工厂加载后两侧/顶部/底部与近景合格。

### 4.5 独立展示与静态分解

`demo-ak47.html` / `demo-m4.html`与对应脚本，统一05篇PMREM/ready/点击高亮/线框。核心Inspect可以相机/展示根缓慢转动，不改作者几何或真实握持frame。

Explode按spec明确的独立group根及局部完整TRS展开/复位；合批刚体用02篇只读陈列代理，方案在几何冻结/最终证据前落定，不原地切改buffers或重复显示。两把武器各自路径，不共用“机匣盖掀开”等不适用动作。枪体横置基准是展示姿态，先暂停Inspect/机械状态并精确复位，展开时不同时移动parent/child。

拆分陈列是说明结构的艺术布局，**不声称真实维修/拆装顺序**；只建了外壳就不露出未经建模的内件或画假复进簧。内部细节没有可靠输入就注明简化范围。

准出：四向/关键特写、拆分闭合与各part选择一致、布局无误穿插；武器类型自检，不要求人体Skeleton或idle/walk/aim。

### 4.6 人物挂载与两档预算

独立showcase：AK≤15,000 / M4≤18,000 tris；人物挂载character≤6,000；同款两档的socket frame/关键外形与identity保持一致，不能热替换高模后超人物总量28,000/页面30,000。

装配以完整matrix对齐而不是仅 `hand.add(weapon.group)`：

```text
G = rightHandGrip 在武器root局部的完整变换
D = 人物socket_right_hand的期望世界握持frame（含明确mate offset）
P = 将挂载到的parent世界变换
weaponRootLocal = inverse(P) * D * inverse(G)
```

所有输入空间、单位、scale与朝向先验证；updateMatrixWorld后计算，分解得到local TRS。禁止靠负scale/硬编码旋转π“看起来能对上”。

- rightHandGrip主对齐；leftHandGuard、stockShoulder是辅助约束，不创建第二parent强拽枪。若副手/贴肩不匹配，则调已声明握持recipe/clip，不缩放枪或弯枪迁就。
- 对idle/walk/aim逐时刻测主手与副手误差（≤0.005H；stock只在适用姿态）；武器muzzleTip方向符合动作目标，reference双手低戒备姿态不强要求水平-Z。
- SWAT采用双手持枪的新参考，referencePose与演示动作均为同一右手socket；换武器后重验低戒备、walk和aim的双手接触，不再走胸前悬挂分支。
- 热替换先加载/诊断新variant，再原子挂载并撤旧；失败保留旧枪并报告FAIL，不无限叠加子节点/资源。多次加载/卸载、分解/复位、clip切换都测无泄漏/偏移。

准出：独立与挂载两种场景分别出统计/图片/报告，不能用独立页PASS代替人物装配PASS。

## 5. 次级机械交互（独立进度，不伪造完成）

Reload/Fire不阻断核心Inspect/Explode切片，但若要声明整项次级交付就需完整实现与回归：

- 实际部件可动层级、pivot、local轨道与动作结束的精确TRS恢复。
- 两款弹匣装卸路径与参考结构相符，不无差别沿Y拉出；卡口/拉机件是展示动画，不声称精确真实循环机构。
- Fire后坐/flash/抛壳是可选展示特效，不接入游戏逻辑；另计资源/透明/draw和位置验证，不凭socket存在就称已实现。
- actions键/输入/进度范围先定义、测试，再让UI启用；未实现不提供no-op成功函数。Explode互斥机械动作，退出后安全恢复，不把活动部件的临时TRS作baseTransform。

次级轨道超范围需单列时间/预算检查点；不为视觉对标默认增加复杂内部仿真。

## 6. 最终准出检查（待执行）

- [ ] 两人物已完整通过，独立参考实际存在且变体/许可/来源可追溯。
- [ ] 每把枪的critical外形和当前参考对应，无混型号/虚构图纸或光学性能声明。
- [ ] 七pass都留matched-view/四向/内部/特写/真实评审，3/pass与6total未绕过。
- [ ] 完整UV与PNG执行报告、PBR与透明分区正确；无假描述符产图。
- [ ] Inspect/选件/Explode/Wire/资源状态和负向用例通过；人物rig门禁没有被错套。
- [ ] 六socket完整frame，right-hand矩阵对齐、副手/贴肩及referencePose状态恢复实测（不切换parent）。
- [ ] showcase/character两档分别满足02篇预算，挂载后角色/页面统计重测。
- [ ] 次级Reload/Fire的已做/未做如实列明，UI不存在假按钮。
- [ ] 关键evidence/manifest受管，ignored原图可恢复；游戏冻结零变更。

缺输入、细节或预算时的处理是停在相应门/请求变更，不自动用程序化木纹、旧枪、低模或白模替换后签PASS。

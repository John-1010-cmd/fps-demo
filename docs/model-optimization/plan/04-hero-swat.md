# 04 · SWAT 英雄版实施

> v1.2 · 2026-10-01。M1a完整准出后启动；不是把militia换颜色。
> 统一目录、接口、坐标、预算、门禁见02篇；七pass/rig九步与证据链继承03篇的流程，不继承其数值或成绩。

## 1. 唯一输入与本次实图观察

选用 `assets/concepts/swat-v3.png`（2026-10-01 按用户要求修正为双手持枪，probe 1312×1199），保留本轮原图/哈希；v1、final及双手下垂的旧v3备份不混入投影源。原图为风格化藏青切面、正面与侧面并列，不声称AI概念图具有真实正交相机或严格一致解剖数据。

实图重要差异：
- 风镜架在盔檐上方，眼睛露出；耳侧通讯罩、盔带形成头部层次。
- 胸挂不止一排：胸前弹匣袋、下层袋、腰带附包、电台/肩带/背包都构成剪影；不能只建一块平板加几条MOLLE。
- 青色是双肩外侧边框/识别色，**图像不能证明发光**。保留颜色边界，默认不依靠强emissive制造识别。
- 袖子是藏青面料切面明暗，未见明确迷彩证据；不得把polygon shading投成迷彩图案。
- **正面和侧面均为双手持枪的放松低戒备姿态**：解剖右手握后方握把，解剖左手托前护木/前握把，两肘自然弯曲，枪斜置于胸腹前、枪口略朝下。两视图分别标注手/枪接触与遮挡，不再采用双手下垂或胸前悬挂的旧参考。参考低戒备与演示aim仍分开，不能因两者都持枪而混用相机/姿态。
- 大腿双侧挂包/枪套、护膝外壳与黑靴要按当前图记录；背面缺图的识别板/挂件不能从旧文字想象后声称观察到。

## 2. Critical与必需装配

五项critical系统（每个子项均有图片核验，不可用系统总分遮住遗漏）：

| ID | 独立核验内容 |
|---|---|
| helmet-goggles-comms | 连续切面盔壳、上置风镜框/镜片/固定带、双侧耳罩与盔带，露眼不遮眼 |
| mask-eye-band | 深色面罩、狭窄肤色眼缝、双眼眉线；眼部与头盔比例/方向 |
| carrier-molle-loadout | 插板背心厚度、多排袋与袋盖/扣具、肩带、电台、腰带附包、侧面背包剪影 |
| team-shoulder-accents | 双肩青色边界与深色中心，附着正确；未见区补全单列推断 |
| knees-boots-thigh-kit | 双护膝倒角/固定层、黑靴厚底与鞋带、大腿挂件与双侧轮廓 |

额外必需装配条件：M4类战术步枪具备原图辨识轮廓/附件，referencePose还原双手低戒备持握；referencePose与idle/walk/aim都保持右手主挂、左手托举，aim再测枪托贴肩。枪不另计第六条critical占位，但双手接触与独立装配检查是Blocking，不能遗漏。

important：藏青基础服装、长袖手套接口、面料体积与切面、袋盖/扣具/MOLLE局部立体、腰带/腿带。原图看不清的精细缝线/背板采用克制补全并注明依据。

## 3. 能复用和不能复用的内容

| 可以复用（先验证接口） | 必须SWAT独立重测 |
|---|---|
| 导出/烘焙/runner/冻结/rig mapping/schema | 原图crop、mask、左右/pose、尺度与解剖比例 |
| 02篇空间转换和骨架构建器 | body厚度、关节位置、seed/权重与装具父子关系 |
| PMREM/交互状态机/ready/负向测试框架 | camera、crop aspect、FOV/ortho extent、delight参数 |
| 材质类别与资源生命周期规则 | 盔壳/镜片/面罩/识别色的视觉效果与UV布局 |
| 报告字段/评审方法/修正上限 | 所有评分、误差、性能、12门数据；不得复制militia PASS |

不设“复制相机32°、距离4.2m、strength0.65就精准”的捷径。

## 4. 实施步骤

### 4.1 初始化、crop与观察

使用01篇前置，将 `$Id='swat'`、`$Reference`指向v3，按02篇init/next创建新资产工作区。crop仍写 `$W/crops/front.png` 与`side.png`，留完整头盔/背包/靴/枪；不对整张复合图用同一camera或delight。

probe→detail inventory→complex assessment（`--character`）→对**front crop**生成landmark guide，与03篇已核验命令一致。人工填肩肘腕/髋膝踝，分别标注front/side的右手握把、左手托举、两肘、枪托/枪口与枪体中心；不使用不存在的 `extract_landmarks --domain`。

**准出**：五系统/mandatory rifle/important映射完整，未知区有置信度，图像cut/pose说明可审阅。

### 4.2 Reference pose与动作姿态隔离

- `referencePose`匹配修正图中的双手低戒备持枪；武器始终使用右手socket，左手托举依独立标注校准。**不新增胸前参考挂载分支**，不把枪悬在躯干上后声称双手持握。
- idle/walk以该低戒备握持为设计基础，aim设计为举枪瞄准；非参考动作的运动属于设计推断，但都沿用同一right-hand socket及辅助托举契约。
- 参考模式/演示动作只切姿态与动作状态，不换枪parent；保存并精确恢复枪local TRS与action时间。pose差异在spec/recipe声明，不能用缩放枪、复制第二把枪或改skinning修复持握误差。
- 肩/背包/胸挂厚度与face比例以侧视叠图拟合；不能用旧游戏固定肩1.32/髋0.82充当新高模测量。

**准出**：参考pose正/侧已对齐，演示pose不冒充原图；同一右手parent下参考/动画姿态与局部TRS的恢复规则明确，无临时参考挂载。

### 4.3 Spec/recipe与七pass

受管 `specs/swat.json`、`recipes/swat.json`；new_sculpt_spec 使用 `--character`；checklist 使用 `profile=animated-character`。按02篇规范化真实pass ID/模板阈值/预算/引用，有真实插件augmentation才合并，不用域参数假装自动生成。strict validate后构建。

| Pass | SWAT重点与当次证据 |
|---|---|
| blockout | 头盔/头颅比例、肩宽、胸挂/背包厚度、大腿/护膝/靴剪影；白模已匹配 |
| structure | 盔壳/风镜/耳罩、背心与袋/肩带/腰带/腿带分层；对应挂点与可分解组 |
| form | 盔檐/倒角/耳侧凹槽、眼部、袋盖/扣具/MOLLE、护膝棱角与靴底；四向+特写 |
| material | 每视图近似delight、分semantic mask真UV烘焙、镜片材质、青色边界 |
| lighting | 深色布/金属/镜片的IBL层次；不靠把黑布提灰、强自发光或过曝补细节 |
| interaction | 刚性组选择/高亮/分解，reference/动画姿态控制，不拉本体骨骼 |
| optimization | 袋/MOLLE等静态合批、透明分区；五系统与预算重测 |

静态候选 pose/临时关节预检、七pass→FINAL→正式rig的分层与03篇一致；材质烘焙后若最终referencePose表面改变，重新烘焙/复验，旧图不自动继续有效。合批/陈列方案在freeze前落定并按02篇保护冻结缓冲区。

MOLLE按参考可见密度/遮挡塑造几何薄条及局部缝线；4×6仅可能是初稿，不能不量图就锁矩阵或承诺“120面”。薄条须有厚度/连接/正确法线并合批；不为每条带创建一材质。

护膝挂在明确膝/小腿rigid节点，验证弯腿时与服装空隙；面罩与头颅/盔壳避免z-fighting和丢眼。盔壳间隙依据fit，不把旧4mm/5mm搭接常数套所有部件。

### 4.4 材质与投影差异

- 最终人物贴图统一 `assets/textures/hero/swat-albedo.png`，2048²；原文1024/front/side/atlas多种终态命名废止。过程纹理只留run bake目录。
- 裁剪/foreground/部件mask/depth共同剔除枪和持枪双手对胸挂/躯干的遮挡；深色区域delight初值按02篇，经raw/unlit与PBR对比再确认，不设置不存在confidence≥0.8。
- 镜片保留原选择：r160 `MeshStandardMaterial` 透明近似，低roughness、`transparent:true`、`depthWrite:false`；镜片是非金属，初值opacity≈0.85仅调试起点。不默认升到Physical transmission，不许用半透四方平板代替风镜形体。
- `renderOrder`不是透明排序万能修复；从front/side/back/near-corner检查镜框/镜片/耳罩层次。控制重叠透明层或缩减到一层；仍异常停材质pass，而不是自动转不透明却声称透明验收已过。
- 青色优先真实albedo边界；若额外微emissive，须在配方声明为艺术处理并与原图对照，不声称原图发光、也不自行加未知背部识别板。
- 藏青服装保留切面造型；低频光照不能成为永久迷彩。不同部件mask保护眼缝/识别色，不沿用militia棋盘格隐区补全。

**准出**：头部/眼部/袋/MOLLE/护膝/青色特写全部可审阅，接缝/串色/深色死黑已处理。

### 4.5 Rig与动作

完整继承02篇和03篇rig九step与原生/project两类报告。骨架schema可复用，bind矩阵/关节位置/权重/stance/左右证据全部独立生成。

- 头盔/风镜/耳罩跟head刚性组；胸包/背包跟躯干；腿挂包/护膝跟正确链，不把所有装具都焊在root或都蒙皮。
- 演示持枪时双手与M4的垂直握把/护木位置一致；walk保留携枪关系，aim入位/保持与枪托贴肩分开测。
- 必需clip roster为idle/walk/aim；原生G1/G2/G3/G10的采样不能借用militia结果。3clip的G10基础覆盖每个blend模式至少48帧（至少48对on/off捕获），再加护膝/袖口/背包/枪的应力峰值。
- G10保留实测baseline和洞/褶分别统计；无baseline不填“0洞PASS”。停止/分解往返后bind/attachment都复测。

### 4.6 Demo与整装回归

`demo-swat.html`与`js/demo/swat-demo.js`，统一05篇展示基座。右侧原图指向v3；数据来自真实manifest/renderer，不展示写死的面数/分数。

覆盖referencePose、idle/walk/aim、透明近景、四向、wire/explode组合、referencePose↔idle/walk/aim姿态切换（右手parent始终不变）、快速按钮、负向用例与资源生命周期。最终图集含头盔风镜/眼部/胸挂/侧背包/青色/护膝靴六类近景；不能仅默认镜头通过。

## 5. SWAT准出（待执行）

- [ ] 输入v3/裁剪/左右/pose/camera/解剖独立测量；无旧值冒实测。
- [ ] 五critical系统和mandatory rifle逐项PASS，推断未見区不冒观察。
- [ ] 连续切面盔壳/眼部/装备层次/青色边界；无盒头和平板围兜。
- [ ] 2048²最终albedo真烘焙，深色/镜片/遮挡/接缝验证。
- [ ] 参考双手低戒备与生产aim姿态区分，两手握持持续正确、pose/动作状态精确恢复；全部rig/动画数据独立实测。
- [ ] 项目阻断全部通过，原生12行如实留存、例外显式；不是复用militia全绿。
- [ ] Demo状态/URL/透明/线框/分解/资源/预算与游戏冻结回归完成。
- [ ] 用户可检查实际页面与证据；两个人物通过后才开放Phase 2。

# 05 · 评审台、Demo与浏览器验证

> v1.2 · 2026-10-01。贯穿M0与每个构建pass，不等两个人物完成后才开始。
> 唯一工厂/空间/门禁/预算见02篇。页面展示不侵入游戏渲染与CSS。

## 1. 交付与实施顺序

M0先交付 `hero-review.html` / `js/demo/hero-review.js`、`bake-runner.html` / `js/demo/bake-runner.js`、项目runner/exporter；随后 `demo-common.js` 提供已验证的基础能力，人物demo按配置接入；武器后续复用渲染/交互框架而非人体rig检查。

文件矩阵：

| 页面 | 入口脚本 | 模型 |
|---|---|---|
| demo-militia.html | js/demo/militia-demo.js | buildHeroMilitia |
| demo-swat.html | js/demo/swat-demo.js | buildHeroSwat |
| demo-ak47.html（Phase 2） | js/demo/ak47-demo.js | buildHeroAK47(showcase) |
| demo-m4.html（Phase 2） | js/demo/m4-demo.js | buildHeroM4(showcase) |

英雄样式 `css/hero-demo.css`；新模块不改 `css/style.css`、config/TEAM颜色、游戏主入口或model-review。前端 `importmap` 只映射本项目同版 r160 Three.js；需要addon时必须显式引入同版文件和license，不因demo引入一份新版THREE。

评审台首版支持灰白模、named camera、referencePose、固定时间、前景mask/semantic region、四向/特写、实际mesh/buffer导出与click part高亮。脚本runner读取其协议，不假定一个window变量存在就已完整导出。

## 2. 资源加载与诊断状态协议

工厂 `await` 所有必需贴图/rig数据成功才返回；主页面再完成PMREM、灯光、相机、pose、基本诊断，然后渲染稳定至少5帧。五帧是**最小稳定渲染条件**，不是动作验证。

统一可观察状态（下一轮需要实现，当前不存在即不能验收）：

```javascript
window.__heroTest = {
  status: 'loading', // loading | diagnosing | pass | fail
  mode: 'hero',      // hero | legacy | weapon | review
  stage: 'rigged',   // static | rigged；由真实候选/资产声明，不能用static绕过英雄检查
  issues: [],
  checks: {},
  evidence: {},
  frames: 0
};
// 成功后：status='pass'; window.__ready=true；hero/weapon 为 DEMO_OK
// review 为 REVIEW_OK，legacy 为 DEMO_LEGACY_OK；按mode选择必需检查
// 失败后：status='fail'; window.__ready=false; document.title='DEMO_ERR'
```

- 首版评审白模是 `mode=review/stage=static`，检查几何/捕获/当前pass而不要求正式三clip；正式 hero 只能 `stage=rigged`，完整工厂拒绝静态降级。prototype rig 测试是隔离fixture，不代表资产阶段已完成。
- 每个加载/诊断/渲染步骤有超时与结构化结果；`window.error`、`unhandledrejection`、WebGL context loss、fetch/texture解码失败均进入fail。
- **fail是粘性的**：首错之后不能在第五帧/重启动画时设回OK；runner观察到fail立即非零退出并收集stack/network。
- context恢复或重新加载是新的验证流程，不复用前一次pass；页面保留当前错误解释。
- “preview可看但缺必需clip/资源”可提供诊断画面，但状态仍fail，不把warning当合格。
- 诊断在独立验证实例/隔离状态运行，不改变用户看到的pose、wire、explode；完成后验证实例资源释放。
- 页面 pass 只证明该mode的启动准入；runner全程监听至本次URL/操作/资源/性能矩阵结束。所有待测动作与受管异步任务结算、再次稳定渲染后才生成最终summary；先pass后迟发错误仍使该run失败，不看到DEMO_OK就退出。明确记录观察窗口/超时，不能声称有限测试证明以后永不报错。

保留旧标题契约，但以完整 `__heroTest` 为验收依据，不能仅grep标题或检查没有throw。

## 3. PMREM必须有可见辐射源

旧例给空Scene加DirectionalLight，却没有可被照亮的表面或可见发光板；这不能提供所声称的丰富影棚反射。默认仍是代码化Neutral Studio，但用**实际可见环境几何**。

下面是r160 API形状示例，M0必须验证实际渲染与释放，不是已实现能力：

```javascript
function createNeutralEnvironment(renderer) {
  const studio = new THREE.Scene();
  const resources = [];
  const roomGeometry = new THREE.BoxGeometry(10, 10, 10);
  const roomMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.25, 0.25, 0.25),
    side: THREE.BackSide,
    toneMapped: false
  });
  const room = new THREE.Mesh(roomGeometry, roomMaterial);
  studio.add(room);
  resources.push(roomGeometry, roomMaterial);

  function panel(position, size, radiance) {
    const geometry = new THREE.PlaneGeometry(size[0], size[1]);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(...radiance),
      side: THREE.DoubleSide,
      toneMapped: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    studio.add(mesh);
    resources.push(geometry, material);
  }
  // HDR线性辐射初值，需实际对照调节，不能承诺固定效果/数毫秒性能
  panel([-4, 2, -2], [2, 4], [4, 4, 4]);
  panel([4, 1, 1], [2, 3], [1, 1.2, 1.5]);
  panel([0, 4, 0], [3, 3], [2, 1.8, 1.5]);
  studio.updateMatrixWorld(true);
  const generator = new THREE.PMREMGenerator(renderer);
  let target;
  try {
    target = generator.fromScene(studio, 0.04, 0.1, 100);
  } finally {
    generator.dispose();
    for (const resource of resources) resource.dispose();
  }
  return {
    texture: target.texture,
    dispose: () => target.dispose() // 正式实现须做幂等保护
  };
}
```

必须保存完整PMREM render target的生命周期，页面结束先解除 `scene.environment` 再dispose；不能只拿 `.texture` 忘了render target。工厂dispose仅管自有模型资源，环境/renderer归demo宿主。

场景灯光、曝光、背景、阴影、相机成为版本化render profile；beauty和neutral comparison分开。原图对比时固定profile，不为每一轮悄悄调曝光涨分。主光shadow先采用2048²起点、收紧frustum，bias/normalBias按模型尺度验证；只用一主shadow light，fill/rim不额外投影。

验收：亮金属/粗糙织物两类校准物体能看见反射板差异，PMREM非空有层次；服装不过曝/不压成死黑。HDRI/Physical透射仍为可选扩展，本期默认不增加下载依赖。

## 4. 动作切换与参考模式

人物只有工厂提供的一套mixer；demo每帧更新一次。必需clip字典为idle/walk/aim，找不到clip为项目验收失败，预览降级不能输出DEMO_OK。

- 切换前验证目标clip与track绑定；新action reset/enable/weight=1/play，旧action crossfade-out；过渡结束停止旧action以防不断积累有效Action。
- 默认crossfade约0.28s，循环间不强制warp改变节奏；连续点击明确取消/替换旧transition，不能留下多个同步调度器。
- 不在每次切换前重设全部骨骼成T-pose造成突跳；也不在普通tick恢复cached bind覆盖动画。显式reset只用于诊断和模式切换。
- aim入位可LoopOnce+clamp，保持区间可有轻呼吸；UI不把它描述成无限循环的举枪进入动作。
- referencePose是独立只读对比模式，不当作idle clip；SWAT采用2026-10-01修正的双手持枪参考；referencePose与演示动作沿用同一右手socket，按04篇恢复pose/action状态，不再实现胸前悬挂分支。
- `turntable`旋转的是display外的 `modelRoot`，不改clip根骨/作者rig；影棚及捕获相机与旋转时间都可控。

## 5. 静态T-pose分解：显式状态机，不是timeScale=0

暂停mixer只冻结当前走姿，不会回T-pose。使用以下互斥状态：

```text
normal → to-bind → expanding → exploded → collapsing → restore-pose → normal
```

1. 进入时保存动作名称/各action时间、weight、timeScale、当前骨骼pose及刚性part父子与完整local TRS；参考模式的枪local TRS及动作状态另记，parent不变。暂停生产mixer/turntable推进，不仅暂停某一action。
2. `to-bind`只在此转换阶段从已采样的当前pose平滑过渡至bind TRS；完成后显式reset使T-pose精确成立。禁止把它作为正常帧更新规则。
3. `expanding`遍历02篇PartRecord中 `explodable=true` 的独立rigid组根，按**声明的坐标空间**缓动；不移动Bone、SkinnedMesh本体或同时移动父/子两层。武器作为整体展开，人体页不触发武器内部机械拆分。
4. 合批刚体的分解采用02篇陈列代理，原合批隐藏、单件仅显示一次，geometry buffers/hash始终只读；代理map/pick/资源归属可查。`exploded`动画静止；连续本体完整，不漏空腔或拉出长条。柔性头巾tail/衣服层若是skinned，不作为可平移rigid部件。
5. 退出先collapse到精确base TRS，再恢复saved pose/挂载/动作时间与原timeScale，最后恢复mixer。不能一边部件仍悬浮一边继续骨骼播放。
6. 快速重复点击采用最新目标状态可逆缓动；分解中的动画请求只排队，退出后按请求播放，不和transition抢写TRS。UI准确提示当前静态/排队动作。

验收：idle/walk/aim/referencePose任意时刻进入，确实到T-pose；退出姿态/parent/局部TRS/action时间无残留。对每种入口重复20次（建议压力样例，不是原生gate阈值），不得累积偏移或把timeScale永久归零。初始 `explode=1` 也要先完成独立动画诊断，不能因可见画面静止判动画失效。

## 6. 线框、选择与材质生命周期

默认实现**单pass有深度测试的高对比线框**，不是X-Ray；关闭map/lighting干扰，使用中性背景与亮色线。双pass覆线可后续选做，若启用单列性能统计。

- 每个Mesh/SkinnedMesh保存原material引用（含array），共享线框材质按需要缓存；r160从mesh类型选择蒙皮程序，**不向MeshStandardMaterial传旧 `skinning` 参数**。
- 切回时恢复原引用和全部贴图/透明分区，不在每次toggle重新new未释放材质；原material不得dispose，因为恢复还要用。
- 线框仍随正确骨架形变。若做overlay，必须使用相同skeleton/bind矩阵/TRS，不能只套静态WireframeGeometry漏掉蒙皮。
- 点击选择/高亮采用稳定partId；合批后保留face/instance→part的pick映射，不用一个不可选大mesh牺牲可检视性。高亮不要直接改共享material导致全模型变色。

压力验收：多次toggle+explode+clip切换、重建/释放实例后geometry/material/texture数量回到稳定水平；不凭“能恢复一次”宣称无泄漏。

## 7. 真实动作诊断：确定性时刻与区域覆盖

诊断与屏幕RAF解耦，runner等待完整结果，不依赖第3/5帧dt差。每条clip独立weight=1、关其他action、设置固定时刻，更新层级与skeleton再采样。

### 7.1 必测producer

- roster取工厂实际必需clip/独立manifest，不能从测试“我采了哪些”推导“覆盖全部”。G1每clip≥5个时刻，至少包含进入/极值/保持或回环。
- G1实际Bone/技术节点的local transform与track interpolant期望值对应（quaternion符号等价需处理）；target绑定缺失/错节点独立失败。
- G2每个required mesh采样关节周围与分布顶点，native覆盖≥64/mesh/frame；小mesh全顶点项目检查并如实报告native覆盖例外，绝不编造采样数。
- P-ANIMATION额外证明对**正确区域**可见的有意义变化：idle胸/头、walk双腿/足、aim入位双臂/枪；仅wrapper旋转或一个无关顶点运动不能通过。
- G3显式stop/reset后比较bind TRS及skin后的顶点，测是否遗漏scale/position/透明/装具变换；normal切换不靠stop把全部pose抹掉。
- G8按02篇采样已锁定虚拟行进轨迹、walk双侧完整支撑区间、地面高度和足底点，不拿静止idle通过代替walk覆盖；P-ANIMATION同时核对离地、穿地、双手与枪托（按姿态适用）距离。
- G10按02篇至少 `clipCount×4×2×2` 捕获，同一mesh/pose/camera对blend-on/off做baseline；洞/褶分别记录，合法腋下/腿间开口mask声明。三clip每模式48帧，至少48对/96张on/off原始捕获；payload.frames仍填单模式轴乘积，不填固定176或混写双模式总数。
- 额外stress覆盖肘/膝/头巾/胸挂/背包/枪手峰值；不能把G10最小数字当成完整艺术验收。

### 7.2 r160蒙皮取点必须输入bind顶点

旧例 `applyBoneTransform(0, new Vector3())` 实际把零向量蒙皮，不是在读第0个顶点。正确局部取点形状：

```javascript
function sampleLocalSkinnedVertex(mesh, index, out) {
  // 调用方先统一更新mixer、root.updateMatrixWorld(true)、skeleton.update()
  out.fromBufferAttribute(mesh.geometry.attributes.position, index);
  return mesh.applyBoneTransform(index, out);
}
```

局部形变测量不乘display/turntable；世界地面/握持测量再应用明确的matrixWorld。选择多个由region/manifest固定的顶点，不只取vertex0；idle某个顶点可能不动，aim保持区间可能静止，explode也故意静止。判动作有效要看适用的进入区间与指定区域，不用两个任意RAF的 `delta>1e-6` 一刀切。

## 8. URL与旧低模分支

保留 `anim=idle|walk|aim`、`explode=1`、`wire=1`、`turntable=1`；debug=1显示骨架/FPS，明确它改变预算。新增参考/固定机位/固定时间参数先定义schema及runner协议，不隐含在正文里假定已存在。

旧demo对未知anim值回退idle的兼容语义可继续保留，并报告参数warning；负向验收应**删除必需clip/破坏绑定**，不是把容错URL当成错误。缺clip或软件错误绝不自动低模回退。

`hero=0`明确legacy模式，有独立轻量诊断，只输出 `DEMO_LEGACY_OK`（不是英雄版DEMO_OK），侧栏标“旧低模”；不强制跑SkinnedMesh/三clip检查。runner按mode选择schema，legacy不能满足英雄交付。

武器模式不用人物idle/walk/aim或Skeleton条件：加载几何/纹理/socket/parts、Inspect/Explode/Wire与可选机械action完成后再PASS。按资产类型分派，不以缺人体rig判武器失败或用空Skeleton伪满足。

## 9. Runner与自动化回归

新增runner的CLI在M0实现/测试后以真实 `--help` 固化；本规划不提供假设已存在的命令。最小协议要求：

- 通过隔离Chrome/CDP或已批准浏览器执行器加载本地HTTP页面，等待 `__heroTest.status` 终态、资源完成与5稳定帧，有明确超时。
- 不使用 `--disable-gpu` 作为WebGL验收默认；记录GPU/software backend。仅dump-dom并grep title不作为正式检查，因为其退出不保证RAF/异步资源已结束。
- 捕获pageerror/console error/unhandled rejection/network failure/context loss；保存viewport/DPR/profile、URL/mode、截图与JSON。fetch 404/非法JSON/空PNG都非零。
- 预览服务根与工作树一致；重复构建通过内容版本/缓存键加载，不能测试到旧缓存；不重启用户常驻8080服务。

最小矩阵：

| 类型 | 必测 |
|---|---|
| 静态评审 | review/static 的白模捕获与当前pass检查；不冒 hero PASS |
| 人物正常 | default；分别idle/walk/aim；referencePose；固定四向/特写 |
| 人物模式 | wire；explode；wire+explode；walk+turntable；anim+explode；快速切换/往返 |
| SWAT专有 | 透明镜片近景；双手低戒备referencePose↔aim/idle/walk姿态与握持恢复 |
| legacy | hero=0的四参数，不冒英雄PASS |
| 武器 | showcase/character，inspect/explode/wire/组合，若交付reload/fire才检查其动作 |
| 负向 | missing clip/错target/错joint/NaN/改冻结buffer/404/超时；先错后5帧仍ERR，先ready后迟发错误也FAIL |
| 资源/性能 | 重复toggle/build/dispose；beauty和debug/wire/explode分别统计 |

故障注入使用测试fixture/隔离实例，不破坏正式源文件再忘记恢复。

## 10. 侧栏、渲染指标与交付

展示原图、crop/unknown说明、最终UV atlas与bake时间/来源哈希；不将正面crop误叫“最终烘焙”。所有指标来自真实manifest/renderer，scope明确。

`Mesh`数量不是draw calls；material array/groups、instances、shadow、多pass都影响计数。按02篇分别报告beauty主pass/shadow/wire/debug、submitted/unique triangles、actual bones/materials和显存估算；不展示固定“24,520/40/4”。

交付检查：
- [ ] M0评审台/runner/bake-runner实际可用、正反例通过。
- [ ] PMREM有可见环境几何，纹理/target/宿主资源正确释放。
- [ ] 每clip确定性G1/区域motion/有限形变/恢复/foot/握持覆盖真实。
- [ ] 分解真正到T-pose，往返精确，无拉骨骼/双重part偏移。
- [ ] 线框/选件/共享材质/实例释放稳定；无旧skinning API误用。
- [ ] ready完整且fail粘性；legacy/weapon模式独立正确；URL矩阵通过。
- [ ] 参考/实际数据/性能/evidence可检查，游戏冻结回归通过。

回退仅本轮demo/资产检查点或显式legacy预览；不得用 `git checkout HEAD -- ...` 覆盖用户工作树，legacy模式也不能当作本轮成功。

# 桌面宠物应用市场调研

调研日期: 2026-06-22  
产品设想: 独立桌面宠物应用, 用户上传真实宠物照片后, 自动生成一个可在桌面上互动、陪伴、轻量养成的桌宠。参考方向是类似 Codex 桌宠的桌面浮层体验, 但核心差异是“用户自己的宠物”。

## 1. 核心结论

目前市面上的桌面宠物大致分成四类: 经典屏幕小伙伴、可导入模型的桌面伴侣、虚拟宠物养成游戏、以及 AI 桌面伴侣。它们分别解决了“在桌面上活着”“能被用户定制”“有长期养成”“能对话和记忆”的一部分问题, 但很少有产品把“真实宠物照片 -> 自动生成可互动桌宠 -> 长期陪伴”完整串起来。

现有桌宠最成熟的能力集中在: 透明置顶窗口、鼠标追踪、拖拽、点击/抚摸反馈、坐在窗口/任务栏上、尺寸调节、隐藏/召唤、提醒闹钟、Steam Workshop/模组生态。VPet-Simulator 和 eSheep/desktopPet 对 2D 桌宠实现很有参考价值; Codex Hatch Pet 对“从角色/宠物参考图生成可打包动画宠物资产”的管线最贴近; MateEngine、Digital Mate、LiveMate、AikoMate 则代表 VRM/PMX/MMD 模型导入与 AI 伴侣方向。

“上传宠物照片自动生成桌宠”仍是明显空位。相邻案例 My Talking Pet 证明了用户愿意从宠物照片获得动画化表达, 但它更像照片说话工具, 缺少桌面常驻、行为状态、窗口互动和养成循环。你的产品机会在于把照片生成做成第一体验, 让非创作者不必懂 VRM、MMD、sprite sheet 或模组制作, 也能拥有自己的桌宠。

MVP 不建议一开始追求真实 3D 宠物重建。更稳的路径是: 上传照片 -> 背景分割和质量检测 -> 生成统一风格的 2D/2.5D 宠物 sprites -> 桌面浮层互动 -> 后续再扩展更多动作包、语音、记忆和社交分享。这样能避开 3D 重建、骨骼绑定、模型穿模和性能消耗的早期风险。

## 2. 竞品和相邻产品地图

| 产品 | 类型/平台 | 主要功能 | 定制方式 | 可借鉴点 | 局限 |
| --- | --- | --- | --- | --- | --- |
| [Desktop Mate](https://store.steampowered.com/app/3301060/Desktop_Mate/) | Steam 桌面伴侣, Windows | 角色坐在窗口上、追鼠标、摸头/点击反应、语音、闹钟、多角色 beta、部分角色组合动作、与游戏同步 | 官方授权 DLC 角色为主 | 把“陪伴但不打扰”做成核心设计, 用闹钟和窗口互动增强日常存在感 | 强依赖授权角色和 DLC, 不解决用户自有宠物生成 |
| [VPet-Simulator](https://store.steampowered.com/app/1920960/VPetSimulator/) / [GitHub](https://github.com/LorisYounger/VPet) | 免费开源桌宠, Windows/WPF | 投喂、触摸、抱起、跳舞、爬墙、说话、工作、成就、Steam Workshop | 创意工坊可扩展动画、物品、食物、台词、主题和代码插件 | 2D 桌宠状态机、模组系统、低硬件门槛、WPF 透明窗口架构都很适合作为技术参考 | 内容仍偏二次元角色; 对普通用户来说制作高质量宠物资产门槛高 |
| [MateEngine](https://store.steampowered.com/app/3625270/MateEngine/) | VRM 桌面伴侣, Steam | 导入 VRM、拖拽、窗口休息、音乐触发跳舞、头/眼/脊椎追鼠标、触摸区域、简单本地聊天、chibi 模式、性能设置 | 用户导入 VRM 模型, Steam Workshop | 证明“自带模型 + 用户自定义模型 + 轻量 AI/动作”是用户关心的组合 | 仍要求用户获得或制作 VRM; 真实宠物照片不能直接变成宠物 |
| [Digital Mate](https://store.steampowered.com/app/2488350/Digital_Mate/) | 桌面伴侣, Steam | 桌宠模式、鼠标视线跟随、提醒、触摸互动、MMD 模型导入、Workshop、隐藏/召唤、轻量渲染 | MMD 模型和 Workshop | 小工具属性清晰: 提醒、隐藏、召唤、低干扰 | 偏模型玩家和二次元场景, 系统配置要求相对高 |
| [Desktop Mascot Engine](https://store.steampowered.com/app/821060/Desktop_Mascot_Engine/) | 早期 3D/2D 桌面 mascot 引擎 | 角色浮在 Windows 桌面上、点击交互、切换角色/动作、缩放; 规划 AI Assistant 和 API | 计划支持 Workshop 模型和服务 | 早在 2018 年就把桌宠与 AI assistant 联系起来, 说明这个方向长期存在需求 | Early Access 且页面提示长期未更新; 评论表现一般, 代表“承诺过大但交付不足”的风险 |
| [Desktop Goose](https://samperson.itch.io/desktop-goose) | 病毒式趣味桌面小伙伴, Windows/macOS | 抢鼠标、踩泥、拉出便签和 meme、点击会反击、配置攻击性、模组 API、GIF/meme 自定义 | 配置文件、素材文件夹、模组 API | 强人格来自“会影响桌面环境”的动作, 不是复杂养成; 个性化素材也能带来传播 | 过度打扰会触发卸载和安全焦虑; 应作为可选 chaotic mode, 不应默认 |
| [Desktop Pet / eSheep](https://github.com/Adrianotiger/desktopPet) | 开源经典屏幕小伙伴复刻, Windows/Web | 宠物在桌面和窗口边缘行走、掉到任务栏、多屏支持、XML 动画配置、内置多个 mascot | XML + 透明 PNG sprite sheet + 编辑器 | 最接近“低复杂度桌宠引擎”: 窗口检测、多屏、任务栏、sprite 动画、创作工具 | 以观赏为主, 没有 AI、养成或真实宠物生成 |
| Codex Hatch Pet | Codex 内部动画宠物资产管线 | 从概念、参考图、品牌线索或生成图制作 Codex 兼容宠物; 产出 9 状态动画 atlas、spritesheet.webp、pet.json、contact sheet 和 GIF 预览 | 图像生成 + 确定性切帧/透明化/校验/打包脚本 | 与本产品“照片生成可互动桌宠资产”的 MVP 管线最贴近: 可复用 9 状态协议、192x208 cell、透明背景、视觉 QA、打包规范 | 不是面向终端用户的独立应用; 重点是资产生产和 Codex 兼容格式, 还需要桌面运行时、上传流程和用户控制面板 |
| [AikoMate](https://store.steampowered.com/app/4426320/AikoMate/) | AI 桌面伴侣, Steam, Windows/macOS | 自定义 VRM avatar、人格、语音、实时语音对话、桌面视觉、动画手势、使用量付费 | 任意 VRM 0.x/1.0 + 人格/声音配置 | 2026 年新趋势: 桌宠开始连接 LLM、语音、桌面视觉和记忆 | 当前评论量很少; 侧重人形/角色, 不解决照片生成宠物 |
| [LiveMate](https://store.steampowered.com/app/4703580/LiveMate/) | 本地 AI 桌面伴侣, Steam | 本地 LLM、VOICEVOX 语音、情绪、唇同步、长期记忆、透明桌面覆盖、闹钟、日记、VRM/PMX/FBX/VMD/GGUF 导入、Workshop | 本地模型和用户导入角色/动作 | “本地隐私 + 可导入模型 + 长期记忆”很适合宠物陪伴产品的信任叙事 | 本地 AI 对硬件和配置有要求; 仍不是照片到宠物 |
| [Touhou Desktop Pet](https://store.steampowered.com/app/4653120/Touhou_Desktop_Pet/) | 即将上线桌面宠物 | 鼠标 gaze tracking、左键拖拽、滚轮缩放、触摸互动、VRM 自定义角色 | VRM 文件 | 说明 Steam 桌宠仍有新产品进入, 标配能力正在趋同 | 未上线, 暂无评论和真实市场反馈 |
| [Wallpaper Engine](https://www.wallpaperengine.io/en) | 动态桌面/创作平台 | 动态/交互壁纸、编辑器、Steam Workshop、多屏、性能暂停规则、移动端同步 | 编辑器 + Workshop | 性能策略、编辑器、社区分发和多屏支持值得借鉴 | 不是桌宠, 更多是背景层而非前景互动角色 |
| [Bugtopia](https://store.steampowered.com/app/2988300/Bugtopia/) | 宠物/昆虫收集养成游戏 | 300+ 昆虫、收集、繁育、闲置、微景观 | 游戏内收集与养成 | 宠物不一定要高频聊天, 收集/繁育/栖息地也能形成长期留存 | 不是桌面浮层; 与“真实宠物照片”距离较远 |
| [My Talking Pet](https://www.wired.com/story/talking-cat-app) | 宠物照片动画化工具, 移动端 | 上传/拍摄宠物照片、放置脸部控制点、录音、调节音高、生成说话效果 | 单张照片 + 手动控制点 | 证明“用真实宠物照片获得动画化表达”有吸引力, 可作为上传流程的参考 | 偏短视频/玩具, 没有桌面常驻、物理互动、养成或长期关系 |

## 3. 功能模式拆解

### 3.1 桌面存在感

成熟桌宠都会先解决“它真的在桌面上”的感觉: 透明背景、置顶或贴近桌面、可拖拽、可缩放、可隐藏、可召回, 并能识别窗口、任务栏、多显示器边界。Desktop Mate 的“坐在窗口上”、VPet 的“爬墙/抱起”、eSheep 的“检测桌面窗口和多屏”、Wallpaper Engine 的“全屏/游戏时暂停”都指向同一个底层要求: 桌宠不能破坏用户的电脑使用节奏。

对你的产品来说, 桌面存在感应作为核心层, 而不是 AI 生成后的附加功能。用户上传照片之后, 第一件事应该是看到自己的宠物在桌面上走、停、看鼠标、被摸头、趴到窗口边缘。

### 3.2 互动反馈

当前桌宠标配互动包括点击、悬停、摸头/身体、拖拽、鼠标追踪、语音/台词、闹钟提醒、音乐触发动作、窗口坐落。更有个性的互动来自 Desktop Goose 这种“影响环境”的行为: 拉出便签、带来图片、踩出痕迹、抢鼠标。但这类行为需要强开关和可调频率, 否则用户很快会觉得被打扰。

适合宠物照片产品的互动分层:

- 安静互动: 看鼠标、打盹、坐窗口、伸懒腰、尾巴/耳朵动作。
- 直接互动: 摸头、喂食、抛玩具、抱起、叫名字。
- 情绪互动: 开心、困、撒娇、害怕、好奇、想玩。
- 环境互动: 在窗口边等你、提醒休息、把一张小便签叼出来、在屏幕边缘探头。
- 可选恶作剧: 轻微挡路、叼走鼠标、拉出表情包, 默认关闭或低频。

### 3.3 自定义与内容生态

现有产品的自定义有三条路:

- 素材级自定义: eSheep 用 XML 和透明 PNG; VPet 用动画、物品、台词、主题和插件。
- 模型级自定义: MateEngine、Digital Mate、LiveMate、AikoMate 使用 VRM/PMX/MMD 等模型生态。
- 商店/DLC 自定义: Desktop Mate 用官方授权角色 DLC, 质量可控但用户创作空间小。

你的差异点应是第四条路: 照片级自定义。用户不需要懂模型格式, 只需要上传宠物照片、选一个风格、确认生成结果。高级用户再进入动作包、贴纸、语音包、社区分享或本地导入模型。

### 3.4 长期留存

虚拟宠物游戏证明长期留存靠三件事: 关怀循环、成长反馈、可收集/可装饰内容。桌面宠物不能做得太重, 否则会像手机游戏一样打断工作; 但完全没有长期反馈也容易变成一次性玩具。

建议采用轻养成:

- 不做惩罚式饥饿死亡, 避免真实宠物用户产生负担。
- 做“心情/能量/亲密度”而非复杂数值。
- 每天给 1-3 个自然小事件: 想玩、想睡、叼来照片、提醒喝水。
- 允许用户用宠物真实信息塑造性格: 名字、品种、年龄、性格、喜欢的食物、口头禅。
- 对已离世宠物场景要非常谨慎, 使用温柔措辞和明确隐私控制。

## 4. 上传照片生成桌宠的机会

### 4.1 市场空位

观察到的空位是: 桌宠产品大多支持“换角色”或“导入模型”, 但不是为普通宠物主人设计的。真实宠物照片产品大多支持“照片说话/短视频”, 但不是桌面常驻宠物。两边之间有一块空白: 让普通人把自己的猫、狗、兔子、鸟等变成桌面上可互动的小伙伴。

### 4.2 推荐 MVP 流程

1. 上传宠物照片: 支持单张主图, 提醒用户选择清晰、无遮挡、单宠物照片。
2. 自动质量检查: 识别主体、背景复杂度、是否多人/多宠物、脸部和身体可见度。
3. 背景分割和宠物抠图: 生成透明主体, 保留毛色、花纹、耳朵、尾巴等身份特征。
4. 风格选择: 原图贴纸风、Q 版像素风、柔和插画风、低多边形 3D 风。MVP 先做 2D/2.5D。
5. 动作生成: idle、walk、sit、sleep、look、happy、sad、eat、jump、petting reaction、dragged。
6. 桌面预览: 立即把宠物放到桌面, 支持拖拽、缩放、隐藏、点击反馈。
7. 个性设置: 名字、称呼、性格、互动频率、安静/活泼/恶作剧模式。
8. 资产保存: 本地保存宠物包, 后续可重新生成动作、换风格、导出分享。

### 4.3 为什么先做 2D/2.5D

从单张真实宠物照片稳定生成可动画的 3D 模型难度高, 尤其是宠物身体形态差异大、毛发遮挡多、姿态不标准、缺少侧面/背面信息。2D/2.5D sprites 更适合 MVP: 质量可控、性能轻、桌面窗口实现简单, 也更容易用生成式图像模型补齐动作帧。

更稳的中期路径是“照片身份 + 统一可动画风格”: 保留真实宠物的毛色、花纹、脸型和标志性特征, 但用统一风格重绘动作。这样比强行让原图四肢动起来更自然。

## 5. 产品建议

### 5.1 差异化定位

一句话定位: 把你家宠物变成住在电脑里的互动桌宠。

不要把第一版定位成泛 AI companion。AikoMate、LiveMate 已经在 VRM + LLM + 语音上发力, 但它们更像人形 AI 伙伴。你的独特点应该是“真实宠物身份”和“零创作门槛”。AI 可以作为生成、个性和记忆的后台能力, 但用户感知上的主角是自己的宠物。

### 5.2 第一版功能优先级

P0:

- 上传照片生成宠物。
- 透明桌面浮层, 支持 Windows 优先。
- 拖拽、缩放、隐藏/召唤、点击/摸头反馈。
- idle/walk/sit/sleep/look/eat/play 等基础动作。
- 安静模式和性能设置。
- 本地宠物库和重新生成。

P1:

- 宠物名字、性格、喜好和简单记忆。
- 窗口/任务栏互动: 坐在窗口边、从屏幕边探头。
- 轻养成: 心情、能量、亲密度、每日小事件。
- 语音或叫声: 可用真实录音或生成音效。
- 动作包和风格包。

P2:

- 多宠物同屏。
- 分享宠物包。
- 社区动作/道具市场。
- 桌面视觉和 LLM 对话。
- macOS 版本。
- 从多张照片生成更稳定的 3D/Live2D/骨骼模型。

### 5.3 默认体验原则

- 默认不打扰: 桌宠应在工作中可爱但不碍事。
- 强控制感: 用户能一键隐藏、调频、关闭恶作剧、限制应用场景。
- 情感真实但不过度拟人: 对宠物主人来说, “像它”比“像一个 AI 助手”更重要。
- 生成过程要可修正: 照片裁剪、毛色、耳朵、尾巴、表情和动作都要能重新生成或局部修正。
- 隐私要前置: 明确照片是否上传云端、保存多久、是否用于训练、如何删除。

## 6. 技术实现参考

### 6.1 桌面浮层

Windows MVP 可考虑 WPF、WinUI、Electron/Tauri + 原生透明窗口、或 Unity 透明 overlay。VPet 的 WPF/C# 路线和 eSheep 的 C# sprite 路线很值得参考。关键能力包括:

- 无边框透明窗口。
- Always-on-top 与 click-through 的切换。
- 多显示器坐标系统。
- 窗口、任务栏、屏幕边缘碰撞检测。
- DPI 缩放和高刷屏处理。
- 安静模式、全屏/游戏模式、白名单/黑名单。

### 6.2 动画和行为

建议用有限状态机开始:

- 状态: idle、walk、sit、sleep、curious、happy、hungry、playful、dragged、hidden。
- 事件: mouse_near、click_head、click_body、drag_start、drag_end、feed、toy、window_edge、timer、focus_mode。
- 参数: energy、mood、bond、interaction_frequency、chaos_level。

素材格式可先采用透明 PNG/WebP sprite sheet + JSON manifest, 后续兼容 Spine/Live2D/VRM。

### 6.3 照片生成管线

推荐分两阶段:

1. 生成身份图: 从用户照片抽取宠物主体和关键特征, 生成标准 pose 的“宠物设定图”。
2. 生成动作包: 基于设定图生成多组动作帧, 并做一致性检查。

Codex Hatch Pet 可作为第一版资产规格参考。它的管线把宠物拆成 9 个状态: `idle`、`running-right`、`running-left`、`waving`、`jumping`、`failed`、`waiting`、`running`、`review`, 每个 frame cell 约束在 `192x208`, 最终打包成 `spritesheet.webp` 和 `pet.json`, 并通过 contact sheet、GIF 预览、atlas validation 做 QA。这给本产品一个很实用的 MVP 资产协议: 先不做无限动作, 先稳定生成一套可验证、可运行、可复用的标准动作包。

质量控制点:

- 多宠物或遮挡照片要提醒用户换图。
- 生成前给用户预览主体抠图。
- 生成后提供“更像原图/更可爱/更像猫狗/保持毛色/修正耳朵尾巴”的快速反馈按钮。
- 不要把人脸、儿童照片或版权角色默认转成宠物包, 需要内容审核和明确边界。

### 6.4 AI 和隐私

AikoMate 走云端 AI 服务与使用量计费, LiveMate 走本地 LLM 和隐私叙事。宠物照片产品可以采用混合策略:

- 生成宠物动作包可用云端, 但上传前明确告知。
- 日常行为逻辑本地运行, 降低成本和隐私风险。
- 语音/对话作为可选高级能力, 不应阻塞核心桌宠体验。
- 所有照片、宠物包、记忆都应提供删除入口。

## 7. 风险和约束

| 风险 | 说明 | 建议 |
| --- | --- | --- |
| 生成不像宠物 | 宠物主人对毛色、花纹、耳朵、眼神很敏感 | 做质量检测、局部修正、重新生成、风格选择 |
| 动画不自然 | 单张照片难以推断四肢和侧面 | MVP 用统一风格 sprites, 中期再做多图/3D |
| 过度打扰 | 桌宠会影响工作流, Desktop Goose 类行为容易引起反感 | 默认安静, 恶作剧单独开关, 频率可调 |
| 安全和权限焦虑 | 透明置顶、鼠标控制、屏幕识别可能像恶意软件 | 不默认抢鼠标, 清晰解释权限, 提供退出和托盘菜单 |
| 性能消耗 | 常驻桌面应用必须轻 | 帧率限制、空闲降频、全屏暂停、低配模式 |
| 隐私 | 宠物照片和桌面视觉都敏感 | 本地优先、明确云端使用、可删除、不训练承诺 |
| 情感边界 | 用户可能为已离世宠物生成桌宠 | 文案要克制, 不承诺“复活”, 提供纪念模式 |
| 内容版权 | 用户可能上传动漫角色或他人图片 | 上传条款、审核、公开分享时二次检查 |

## 8. 建议的产品路线

### 0-4 周: 可运行原型

- Windows 透明桌面窗口。
- 手工内置 1-2 个 sprite 宠物。
- 支持拖拽、缩放、摸头、随机行走、睡觉、隐藏/召唤。
- 验证桌面浮层、窗口边界、性能和退出体验。

### 4-8 周: 照片生成 MVP

- 上传宠物照片。
- 背景分割和主体预览。
- 生成 6-8 个基础动作。
- 宠物包本地保存。
- 控制面板: 名字、大小、互动频率、安静模式。

### 8-12 周: 轻养成和传播

- 心情/能量/亲密度。
- 喂食、玩具、每日小事件。
- 分享宠物卡片或短视频。
- 动作包补充。
- 用户反馈式重新生成。

### 12 周后: AI 和生态

- 语音/叫声、简单记忆。
- 多宠物同屏。
- 动作/道具商店。
- macOS 支持。
- 高级用户导入模型或导出宠物包。

## 9. 来源地图

高信号来源:

- Steam 产品页: 适合确认发布时间、平台、核心功能、评论量和商业模式。
- GitHub: 适合确认开源实现、技术栈、素材格式和项目结构。
- Itch.io: 适合观察轻量桌面玩具、配置和用户评论中的摩擦。
- 官方站点: 适合确认性能、多屏、编辑器和社区生态。
- Codex Hatch Pet 技能文档: 适合确认 Codex 兼容宠物的 atlas、状态、spritesheet、QA 和打包规范。

信号较弱处:

- 用户真实留存、付费转化和每日使用时长没有公开数据。
- 2026 年新 AI 桌面伴侣如 AikoMate、LiveMate 评论量很小, 只能作为趋势信号, 不能证明 PMF。
- “真实宠物照片 -> 桌面宠物”的直接竞品较少, 本报告更多基于相邻产品拼出机会空间。

## 10. 资料链接

- Desktop Mate: https://store.steampowered.com/app/3301060/Desktop_Mate/
- VPet-Simulator: https://store.steampowered.com/app/1920960/VPetSimulator/
- VPet GitHub: https://github.com/LorisYounger/VPet
- MateEngine: https://store.steampowered.com/app/3625270/MateEngine/
- Digital Mate: https://store.steampowered.com/app/2488350/Digital_Mate/
- Desktop Mascot Engine: https://store.steampowered.com/app/821060/Desktop_Mascot_Engine/
- Desktop Goose: https://samperson.itch.io/desktop-goose
- Desktop Pet / eSheep: https://github.com/Adrianotiger/desktopPet
- Codex Hatch Pet skill: /Users/wuyue120/.codex/skills/hatch-pet/SKILL.md
- AikoMate: https://store.steampowered.com/app/4426320/AikoMate/
- LiveMate: https://store.steampowered.com/app/4703580/LiveMate/
- Touhou Desktop Pet: https://store.steampowered.com/app/4653120/Touhou_Desktop_Pet/
- Wallpaper Engine: https://www.wallpaperengine.io/en
- Wallpaper Engine Steam: https://store.steampowered.com/app/431960/Wallpaper_Engine/
- Bugtopia: https://store.steampowered.com/app/2988300/Bugtopia/
- My Talking Pet 相关报道: https://www.wired.com/story/talking-cat-app

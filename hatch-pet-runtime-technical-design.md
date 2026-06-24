# Hatch Pet 独立桌宠运行端技术设计

日期: 2026-06-24  
来源: `prd.md`  
范围: PRD M0/M1 桌面运行端 MVP  
目标平台: macOS、Windows  
推荐技术栈: Electron + TypeScript + Vue 3 + Vite + Canvas 2D

## 1. 目标与非目标

本设计定义一个独立桌宠运行端, 支持导入并运行 Codex Hatch Pet v1 宠物包。MVP 只覆盖桌面运行能力: 透明桌面窗口、宠物包导入、本地宠物库、Hatch Pet atlas 播放、基础状态机、拖拽、缩放、点击动作、基础点击穿透、托盘/菜单栏控制和错误提示。

MVP 不包含照片生成、图像生成、宠物包编辑器、zip 导入、像素级 alpha 命中、多宠物同屏、窗口边缘停靠、自动巡游、账号、云同步或社区能力。这些能力需要在 M1 验收后按 M2/M3 单独设计。

## 2. 架构总览

应用采用 Electron 双进程架构。主进程负责桌面系统能力和本地文件系统, 渲染进程负责宠物显示和交互状态。两者通过受控 IPC 通信, 渲染进程不直接开启 Node 权限。

```text
Electron Main
  WindowController
  TrayController
  PetPackageImporter
  PetLibraryStore
  SettingsStore
  IpcHandlers

Preload
  DesktopPetApi

Electron Renderer
  PetCanvas.vue
  AnimationCatalog
  BehaviorEngine
  PointerHitArea
  PetViewModel
  App.vue
```

核心原则:

- 桌面窗口逻辑只在 `WindowController`。
- 宠物包校验和复制只在 `PetPackageImporter`。
- Hatch Pet v1 默认动画表只在 `AnimationCatalog`。
- Canvas 播放器只关心已解析后的动画定义, 不关心 manifest 兼容细节。
- 行为状态机只发出动画状态和窗口意图, 不直接读写文件。

## 3. 模块设计

### 3.1 WindowController

职责:

- 创建透明、无边框、默认置顶的宠物窗口。
- 控制窗口显示、隐藏、缩放、位置恢复。
- 封装 macOS/Windows 的透明窗口、置顶和点击穿透差异。
- 根据显示器边界修正不可见位置。

窗口建议配置:

```ts
{
  frame: false,
  transparent: true,
  resizable: false,
  hasShadow: false,
  skipTaskbar: true,
  alwaysOnTop: true,
  webPreferences: {
    preload,
    contextIsolation: true,
    nodeIntegration: false
  }
}
```

公开能力:

- `showPetWindow()`
- `hidePetWindow()`
- `setPetScale(scale)`
- `setPetPosition(point)`
- `setAlwaysOnTop(enabled)`
- `setClickThrough(enabled, forward)`
- `ensureVisibleOnDisplay()`

### 3.2 TrayController

职责:

- macOS 使用菜单栏入口, Windows 使用系统托盘入口。
- 提供显示/隐藏、导入宠物、切换宠物、设置、退出。
- 显示当前宠物名称。

MVP 菜单项:

- Show/Hide Pet
- Import Pet Package
- Current Pet
- Switch Pet
- Settings
- Quit

### 3.3 PetPackageImporter

职责:

- 接收用户选择的文件夹路径。
- 读取并校验 `pet.json`。
- 解析 `spritesheetPath` 并确认图片存在。
- 校验 atlas 可读且尺寸为 `1536x1872`。
- 将宠物包复制到应用本地库。

阻塞错误:

- 缺少 `pet.json`。
- `pet.json` 不是合法 JSON。
- 缺少 `id`。
- 缺少 `spritesheetPath`。
- `spritesheetPath` 指向不存在。
- 图片无法解码。
- atlas 尺寸不是 `1536x1872`。

可恢复问题:

- 缺少 `displayName`: 使用 `id`。
- 缺少 `description`: 使用默认描述。
- 存在未知字段或额外文件: 忽略。

### 3.4 PetLibraryStore

职责:

- 维护应用自己的本地宠物库。
- 不直接依赖 Codex 的 `$HOME/.codex/pets` 作为运行源。
- 保存当前宠物、导入时间、来源路径、异常状态。

本地结构:

```text
appData/
  pets/
    <pet-id>/
      pet.json
      spritesheet.webp
  library.json
  settings.json
```

`library.json` 示例:

```json
{
  "currentPetId": "pet-name",
  "pets": [
    {
      "id": "pet-name",
      "displayName": "Pet Name",
      "description": "One short sentence.",
      "packageDir": "pets/pet-name",
      "sourcePath": "/path/to/original/package",
      "importedAt": "2026-06-24T08:00:00.000Z",
      "status": "ok"
    }
  ]
}
```

### 3.5 SettingsStore

职责:

- 保存宠物窗口位置、大小、置顶、安静模式、启动时恢复上次宠物等设置。
- 设置损坏时备份旧文件并恢复默认值。

`settings.json` 示例:

```json
{
  "petWindow": {
    "position": { "x": 1200, "y": 700 },
    "scale": 1.5,
    "alwaysOnTop": true,
    "visibleOnLaunch": true
  },
  "behavior": {
    "quietMode": false
  }
}
```

### 3.6 AnimationCatalog

职责:

- 将 Hatch Pet v1 固定 atlas 约定转换为播放器可使用的动画定义。
- 未来可读取扩展 manifest 的 `animations` 和 `interactions` 字段, 但 M1 不依赖扩展字段。

Hatch Pet v1 固定规格:

- atlas: `1536x1872`
- grid: 8 列 x 9 行
- cell: `192x208`
- format: WebP 优先, PNG 可兼容
- 背景透明

默认动画表:

| State | Row | Frames | Durations |
| --- | ---: | --- | --- |
| `idle` | 0 | 0-5 | 280, 110, 110, 140, 140, 320 ms |
| `running-right` | 1 | 0-7 | 120 ms each, final 220 ms |
| `running-left` | 2 | 0-7 | 120 ms each, final 220 ms |
| `waving` | 3 | 0-3 | 140 ms each, final 280 ms |
| `jumping` | 4 | 0-4 | 140 ms each, final 280 ms |
| `failed` | 5 | 0-7 | 140 ms each, final 240 ms |
| `waiting` | 6 | 0-5 | 150 ms each, final 260 ms |
| `running` | 7 | 0-5 | 120 ms each, final 220 ms |
| `review` | 8 | 0-5 | 150 ms each, final 280 ms |

### 3.7 PetCanvas

职责:

- 加载 `spritesheet.webp`。
- 按动画定义裁切 atlas cell。
- 使用 Canvas 2D 绘制当前帧。
- 支持缩放和不同设备像素比。
- 在隐藏或暂停时停止 animation loop。

渲染循环:

```text
requestAnimationFrame
  -> 读取当前 animation state
  -> 根据 elapsed time 推进 frame
  -> clear canvas
  -> drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh)
  -> 更新当前可见 bounds
```

MVP 不做 WebGL/PixiJS, 以减少依赖和调试成本。

### 3.8 BehaviorEngine

职责:

- 接收 pointer、drag、load、error 等事件。
- 根据优先级切换动画状态。
- 保证短动作完成后回到 `idle`。

状态:

```text
idle
waving
jumping
dragging
failed
hidden
loading
```

状态转移:

```text
idle
  click -> waving
  doubleClick -> jumping
  dragStart -> dragging
  loadError -> failed

dragging
  move right -> running-right
  move left -> running-left
  dragEnd -> idle

waving/jumping
  animationEnd -> idle

failed
  recover/loadPet -> idle
```

优先级:

1. `failed` / `loading`
2. `dragging`
3. click gesture
4. idle variation
5. default `idle`

### 3.9 PointerHitArea

职责:

- 根据当前帧可见区域控制基础点击穿透。
- M1 采用非透明包围盒命中。
- 不做逐像素 alpha mask。

行为:

```text
mouse in current visible bounds
  -> setClickThrough(false)

mouse outside current visible bounds
  -> setClickThrough(true, forward=true)

dragging
  -> setClickThrough(false)

context menu open
  -> setClickThrough(false)
```

M1 的“可见 bounds”实现方式固定为: atlas 加载后使用 offscreen canvas 扫描每个使用帧的 alpha 通道, 为每帧生成一个非透明像素包围盒。运行时命中检测只判断鼠标是否落在当前帧的缩放后包围盒内, 不做逐像素命中。M2 再升级到真正的逐像素 alpha mask。

## 4. IPC 设计

Preload 暴露最小 API:

```ts
type DesktopPetApi = {
  getCurrentPet(): Promise<LoadedPet | null>
  listPets(): Promise<PetLibraryEntry[]>
  importPetPackage(): Promise<ImportResult>
  switchPet(id: string): Promise<LoadedPet>
  updateSettings(patch: SettingsPatch): Promise<Settings>
  getSettings(): Promise<Settings>
  setClickThrough(enabled: boolean, forward?: boolean): Promise<void>
  setPetBounds(bounds: PetBounds): Promise<void>
  startWindowDrag(): Promise<void>
  endWindowDrag(position: Point): Promise<void>
  showSettings(): Promise<void>
}
```

IPC 规则:

- Renderer 不接收任意文件路径写入权限。
- Import 只能通过主进程文件选择器发起。
- Pet package 复制、删除、校验全部在主进程完成。
- Renderer 只能读取主进程返回的当前宠物数据和 appData 内安全资源路径。

## 5. 数据流

### 5.1 首次启动

```text
app ready
  -> SettingsStore.load()
  -> PetLibraryStore.load()
  -> WindowController.createPetWindow()
  -> if currentPet exists: load current pet
  -> else: show welcome/settings window
  -> TrayController.create()
```

### 5.2 导入宠物

```text
Tray: Import Pet Package
  -> main opens directory picker
  -> PetPackageImporter.validate()
  -> PetPackageImporter.copyToLibrary()
  -> PetLibraryStore.upsert()
  -> SettingsStore.setCurrentPet()
  -> IPC notify renderer
  -> PetCanvas.loadAtlas()
  -> BehaviorEngine.setState(idle)
```

### 5.3 点击与拖拽

```text
Pointer down on visible bounds
  -> BehaviorEngine receives click/dragStart
  -> dragging: renderer tracks movement
  -> main updates window position
  -> BehaviorEngine picks running-left/right
  -> dragEnd saves position
  -> return idle
```

## 6. 错误处理

### 6.1 导入错误

导入错误返回结构化结果:

```ts
type ImportErrorCode =
  | 'missing_manifest'
  | 'invalid_manifest_json'
  | 'missing_id'
  | 'missing_spritesheet_path'
  | 'missing_spritesheet'
  | 'invalid_image'
  | 'invalid_atlas_size'
  | 'copy_failed'
```

UI 应展示:

- 失败原因。
- 期望格式。
- 用户可采取的修复动作。

### 6.2 运行错误

- 当前宠物图片加载失败: 标记宠物 `status: "error"`, 状态机进入 `failed`。
- 当前宠物被删除: 回到无宠物状态。
- `settings.json` 损坏: 备份为 `settings.corrupt.<timestamp>.json`, 使用默认设置。
- `library.json` 损坏: 备份为 `library.corrupt.<timestamp>.json`, 重建空库。

### 6.3 平台错误

平台差异只在 `WindowController` 内处理。若某平台不支持某个点击穿透参数, 应降级为最接近行为, 并记录可见警告。渲染进程不分支处理 macOS/Windows。

## 7. 测试策略

### 7.1 单元测试

- `AnimationCatalog`: Hatch Pet v1 默认行、帧、duration 与 PRD 一致。
- `PetPackageImporter`: 合法包、缺 manifest、坏 JSON、缺图片、尺寸错误。
- `BehaviorEngine`: click、double click、drag left/right、animation end、load error。
- `SettingsStore`: 默认值、保存、损坏恢复。
- `PetLibraryStore`: 导入、覆盖、切换、删除、损坏恢复。

### 7.2 集成测试

- 导入合法 Hatch Pet v1 文件夹后, `appData/pets/<id>` 结构正确。
- 导入失败不污染 library。
- 切换宠物后 renderer 收到新宠物并重新加载 atlas。
- 设置变更后重启恢复位置、大小和当前宠物。

### 7.3 渲染测试

- 使用固定测试 atlas 验证 row/column 裁切坐标。
- 验证 duration 推进逻辑。
- 验证隐藏窗口时停止渲染 loop。
- 验证 scale 和 devicePixelRatio 下画面不模糊或错位。

### 7.4 Electron 冒烟测试

自动或半自动覆盖:

- 应用启动。
- 创建透明无边框窗口。
- 加载本地测试宠物。
- 点击触发 `waving`。
- 拖拽右移触发 `running-right`。
- 拖拽左移触发 `running-left`。
- 隐藏/召回。
- 退出应用。

### 7.5 手工跨平台测试

macOS 和 Windows 各验证:

- 安装包能启动。
- 透明背景正常。
- 托盘/菜单栏正常。
- 基础点击穿透不明显挡住桌面。
- 宠物可拖拽、缩放、隐藏、召回。
- 重启后恢复当前宠物和位置。

## 8. 里程碑落地

### M0: 技术验证

交付:

- Electron 应用骨架。
- 透明无边框宠物窗口。
- Canvas 2D 播放固定 Hatch Pet atlas。
- 硬编码加载一个本地宠物包。
- 拖拽和缩放。

验收:

- macOS 或 Windows 至少一个平台可看到透明桌宠窗口。
- `idle` 动画可播放。
- 拖拽窗口不丢失宠物。

### M1: 可用 MVP

交付:

- 文件夹导入 Hatch Pet v1 包。
- 本地宠物库。
- 托盘/菜单栏控制。
- 基础状态机。
- 基础点击穿透。
- 设置存储。
- macOS/Windows 双平台打包。
- 导入校验和错误提示。

验收:

- 同一个合法 Hatch Pet v1 包能在 macOS 和 Windows 导入并运行。
- `idle`、`waving`、`jumping`、`running-left`、`running-right`、`failed` 可按事件触发。
- 透明区域尽量不阻挡桌面操作。
- 连续切换宠物和重启恢复不破坏 library/settings。

## 9. 风险与取舍

| 风险 | 取舍 | 应对 |
| --- | --- | --- |
| Electron 包体和内存偏大 | 换取跨平台窗口、托盘和前端开发效率 | 限制 FPS、隐藏暂停、空闲降频 |
| 点击穿透平台差异 | M1 不做像素级 alpha mask | 用包围盒命中先满足 MVP, 平台差异封装在 `WindowController` |
| Hatch Pet manifest 太轻 | 缺少显式动画配置 | `AnimationCatalog` 内置 Hatch Pet v1 默认表 |
| Canvas 自研播放器后续扩展成本 | 先减少依赖和复杂度 | 保持渲染器接口独立, M2 可替换 PixiJS |
| 非 git 项目无法提交设计文档 | 当前 workspace 不是 git 仓库 | 只写入文件, 后续初始化 git 后再提交 |

## 10. 文件与目录建议

实现阶段建议目录:

```text
src/
  main/
    window/WindowController.ts
    tray/TrayController.ts
    pets/PetPackageImporter.ts
    pets/PetLibraryStore.ts
    settings/SettingsStore.ts
    ipc/IpcHandlers.ts
  preload/
    desktopPetApi.ts
  renderer/
    pet/PetCanvas.vue
    pet/AnimationCatalog.ts
    pet/BehaviorEngine.ts
    pet/PointerHitArea.ts
    pet/PetViewModel.ts
    app/App.vue
    app/SettingsPanel.vue
    app/PetLibraryView.vue
  shared/
    types.ts
    hatchPetV1.ts
```

测试目录:

```text
tests/
  unit/
  integration/
  fixtures/
    valid-hatch-pet/
    invalid-missing-manifest/
    invalid-atlas-size/
```

## 11. Open Questions Deferred

以下问题不进入 M0/M1 技术设计:

- 是否支持 zip 导入。
- 是否做逐像素 alpha mask。
- 是否支持多宠物同屏。
- 是否接入照片生成宠物包服务。
- 是否做窗口边缘停靠或自动巡游。
- 是否发布到 Mac App Store。

# TablePet

TablePet is an independent desktop pet runtime for Codex Hatch Pet v1 packages.
It runs transparent animated pets on macOS and Windows with a local pet library,
window controls, drag interaction, scaling, tray access, and bundled sample pets.

TablePet 是一个独立桌宠运行端, 用于运行 Codex Hatch Pet v1 宠物包。它支持
macOS 和 Windows 上的透明桌宠窗口、本地宠物库、窗口控制、拖拽互动、缩放、托盘入口
以及内置示例宠物。

---

## 中文说明

### 下载

- 最新版本: [GitHub Releases](https://github.com/wy732858140/tablePet/releases/latest)
- macOS Apple Silicon: [TablePet-mac-arm64-0.1.0.dmg](https://github.com/wy732858140/tablePet/releases/latest/download/TablePet-mac-arm64-0.1.0.dmg)
- SHA-256: `324db7aad7e23cb944a795cd07870996dc93c72b2fc2a71b4f28572c38a6baac`

当前 release 产物为未签名的 macOS arm64 安装包, 位于 `release/mac/`。Windows 安装包会输出到 `release/windows/`, 需要在 Windows 环境或 CI 中单独构建。

### 项目定位

TablePet 的目标是先把桌宠的“运行端”做稳: 导入已有的 Hatch Pet 宠物包,
在桌面上播放、拖拽、缩放、隐藏/召回并进行基础互动。项目当前不包含照片生成、
图像生成、账号系统或宠物市场能力。

### 功能特性

- Electron + Vue 3 + TypeScript 桌面应用架构
- 透明、无边框、默认置顶的桌宠窗口
- 固定尺寸菜单页, 与宠物缩放解耦
- Hatch Pet v1 `pet.json + spritesheet.webp` 包导入
- 本地宠物库和当前宠物切换
- 内置示例宠物: `福宝` 和 `Kun Like`
- Canvas 2D atlas 动画播放
- `idle`、`running-right`、`running-left`、`waving`、`jumping`、`failed`、`waiting`、`running`、`review` 默认动画状态
- 鼠标点击、拖拽、窗口位置和缩放控制
- macOS 菜单栏 / Windows 系统托盘控制入口
- Vitest 单元测试覆盖核心运行时模块

### 环境要求

- Node.js `>=20.19.0`
- npm `>=10.0.0`
- macOS 或 Windows

### 快速开始

安装依赖:

```bash
npm install
```

启动开发模式:

```bash
npm run dev:electron
```

运行测试:

```bash
npm run test
```

执行构建:

```bash
npm run build
```

生成本地打包目录:

```bash
npm run package
```

生成 macOS 安装包:

```bash
npm run dist:mac
```

生成 Windows 安装包:

```bash
npm run dist:win
```

### 支持的宠物包格式

当前 MVP 支持导入一个包含以下文件的文件夹:

```text
pet.json
spritesheet.webp
```

`pet.json` 最小结构:

```json
{
  "id": "pet-name",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

atlas 规格:

| 字段 | 要求 |
| --- | --- |
| 图片尺寸 | `1536x1872` |
| 网格 | 8 列 x 9 行 |
| 单格尺寸 | `192x208` |
| 推荐格式 | WebP |
| 背景 | 透明 |

### 常用目录

```text
src/main/        Electron 主进程, 窗口、托盘、IPC、导入和本地存储
src/preload/     安全 preload API
src/renderer/    Vue 渲染端, 菜单界面、Canvas 播放和交互状态
src/shared/      Hatch Pet v1 规范、通用类型和窗口尺寸工具
pets/            内置示例宠物包
assets/icons/    应用图标资源
tests/unit/      单元测试
```

### 当前阶段

项目处于 M0/M1 MVP 阶段, 重点是稳定运行 Hatch Pet v1 包和桌面端基础体验。
后续可扩展照片生成宠物包、多宠物同屏、zip 导入、像素级点击穿透和更丰富的行为状态。

---

## English

### Download

- Latest release: [GitHub Releases](https://github.com/wy732858140/tablePet/releases/latest)
- macOS Apple Silicon: [TablePet-mac-arm64-0.1.0.dmg](https://github.com/wy732858140/tablePet/releases/latest/download/TablePet-mac-arm64-0.1.0.dmg)
- SHA-256: `324db7aad7e23cb944a795cd07870996dc93c72b2fc2a71b4f28572c38a6baac`

The current release artifact is an unsigned macOS arm64 installer in `release/mac/`. Windows installers output to `release/windows/` and should be built separately on Windows or in CI.

### What It Is

TablePet focuses on the desktop runtime layer for Hatch Pet packages. It imports
an existing package, plays it on the desktop, supports basic interaction, and
keeps the system controls local and lightweight. Photo generation, cloud sync,
accounts, and marketplace features are intentionally out of scope for the MVP.

### Features

- Electron + Vue 3 + TypeScript desktop app
- Transparent, frameless, always-on-top pet window
- Fixed-size menu view decoupled from pet scaling
- Hatch Pet v1 `pet.json + spritesheet.webp` package import
- Local pet library and current pet switching
- Bundled sample pets: `福宝` and `Kun Like`
- Canvas 2D atlas animation playback
- Default animation states: `idle`, `running-right`, `running-left`, `waving`, `jumping`, `failed`, `waiting`, `running`, `review`
- Click, drag, window position, and pet scale controls
- macOS menu bar / Windows system tray controls
- Vitest coverage for the core runtime modules

### Requirements

- Node.js `>=20.19.0`
- npm `>=10.0.0`
- macOS or Windows

### Getting Started

Install dependencies:

```bash
npm install
```

Run the app in development:

```bash
npm run dev:electron
```

Run tests:

```bash
npm run test
```

Build:

```bash
npm run build
```

Create a local packaged app directory:

```bash
npm run package
```

Create the macOS installer:

```bash
npm run dist:mac
```

Create the Windows installer:

```bash
npm run dist:win
```

### Supported Pet Package

The MVP imports a folder with:

```text
pet.json
spritesheet.webp
```

Minimal `pet.json`:

```json
{
  "id": "pet-name",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

Atlas requirements:

| Field | Requirement |
| --- | --- |
| Image size | `1536x1872` |
| Grid | 8 columns x 9 rows |
| Cell size | `192x208` |
| Recommended format | WebP |
| Background | Transparent |

### Project Layout

```text
src/main/        Electron main process: windows, tray, IPC, import, local storage
src/preload/     Safe preload API
src/renderer/    Vue renderer, menu UI, Canvas playback, interaction state
src/shared/      Hatch Pet v1 contract, shared types, window sizing helpers
pets/            Bundled sample pet packages
assets/icons/    App icon assets
tests/unit/      Unit tests
```

### Status

TablePet is currently an M0/M1 MVP. The near-term focus is reliable Hatch Pet v1
runtime playback and a solid desktop experience. Future work may add photo-based
pet generation, multiple pets, zip import, pixel-level click-through, and richer
behavior states.

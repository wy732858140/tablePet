# TablePet Windows Installer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-establish the TablePet 0.1.3 build on Windows and produce a verified Windows x64 NSIS installer from the checked-out source.

**Architecture:** Preserve the existing Electron + Vue 3 + TypeScript application and its `electron-builder` configuration. Restore dependencies exactly from `package-lock.json`, run the existing test/type/build gates, package with the existing `dist:win` script, then verify the installer and unpacked application without changing application behavior.

**Tech Stack:** Node.js 24.14.0 (Codex bundled runtime), npm lockfile, Electron 34, Vue 3, TypeScript, Vite, Vitest, electron-builder 25, NSIS x64.

## Global Constraints

- Build version `0.1.3` from the source currently present in `D:\work\vibeCoding\tablePet`.
- Target Windows x64 using the existing `electron-builder.json` NSIS configuration.
- Do not sign the installer; the repository documents the current release artifacts as unsigned.
- Preserve all existing source and bundled pet assets unless a verified Windows build defect requires a minimal fix.
- Store generated output under `release/windows/` as configured by the project.

---

### Task 1: Confirm source and build configuration

**Files:**
- Inspect: `README.md`
- Inspect: `package.json`
- Inspect: `package-lock.json`
- Inspect: `electron-builder.json`
- Inspect: `src/main/main.ts`
- Inspect: `src/preload/desktopPetApi.cts`
- Inspect: `src/renderer/main.ts`

**Interfaces:**
- Consumes: GitHub repository `wy732858140/tablePet` and the local workspace copy.
- Produces: Confirmed application version, entry points, target architecture, artifact name, and output directory.

- [x] **Step 1: Compare the local package metadata with the GitHub default branch**

Confirm that both identify `table-pet` version `0.1.3` and expose `dist:win` as `npm run build && electron-builder --win --x64 -c.directories.output=release/windows`.

- [x] **Step 2: Confirm the Windows target configuration**

Verify that `electron-builder.json` uses the ICO at `assets/icons/app-icon.ico`, targets `nsis`, and names the installer `TablePet-windows-x64-0.1.3.exe`.

- [x] **Step 3: Map runtime responsibilities**

Confirm the Electron main process owns the transparent pet window, tray, local pet library, settings, IPC, and typing monitor; preload exposes a constrained API; Vue/Canvas owns rendering and interaction.

### Task 2: Restore locked dependencies

**Files:**
- Consume: `package-lock.json`
- Create (generated, ignored): `node_modules/`

**Interfaces:**
- Consumes: Codex bundled `node.exe` and matching `npm.cmd`.
- Produces: A dependency tree matching `package-lock.json`, including Electron and native `uiohook-napi` binaries for Windows x64.

- [x] **Step 1: Verify the bundled Node and npm versions**

Run the exact bundled executables and confirm Node satisfies `>=20.19.0` and npm satisfies `>=10.0.0`.

- [x] **Step 2: Install from the lockfile**

Run: `npm ci`

Expected: exit code 0 with `node_modules/electron/dist/electron.exe`, `node_modules/electron-builder`, and the Windows native dependency installed.

### Task 3: Run repository validation gates

**Files:**
- Test: `tests/unit/*.test.ts`
- Consume: `tsconfig.test.json`
- Consume: `tsconfig.node.json`
- Create (generated, ignored): `dist/`

**Interfaces:**
- Consumes: Restored dependency tree and all application sources.
- Produces: Passing unit tests, renderer/node type checks, and production renderer/main/preload output.

- [x] **Step 1: Run all unit tests**

Run: `npm run test`

Expected: all Vitest files and tests pass with zero failures.

- [x] **Step 2: Run test and Node type checks**

Run: `npm run typecheck:test`

Run: `npm run typecheck:node`

Expected: both commands exit 0.

- [x] **Step 3: Build production assets**

Run: `npm run build`

Expected: exit code 0 and populated `dist/renderer`, `dist/main`, and `dist/preload` outputs.

### Task 4: Package Windows x64

**Files:**
- Consume: `dist/**/*`
- Consume: `pets/**/*`
- Consume: `assets/icons/app-icon.ico`
- Create (generated, ignored): `release/windows/TablePet-windows-x64-0.1.3.exe`
- Create (generated, ignored): `release/windows/win-unpacked/`

**Interfaces:**
- Consumes: Successful production build and electron-builder configuration.
- Produces: An unsigned NSIS installer and unpacked Windows application.

- [x] **Step 1: Invoke the repository Windows distribution script**

Run: `npm run dist:win`

Expected: electron-builder exits 0 and creates `release/windows/TablePet-windows-x64-0.1.3.exe`.

- [x] **Step 2: Confirm bundled resources**

Verify that `win-unpacked/resources/app.asar` exists and the bundled `pets` resource directory contains every sample package declared in the workspace.

### Task 5: Verify the generated installer

**Files:**
- Inspect: `release/windows/TablePet-windows-x64-0.1.3.exe`
- Inspect: `release/windows/win-unpacked/TablePet.exe`
- Inspect: `release/windows/win-unpacked/resources/app.asar`
- Create: `release/windows/SHA256SUMS.txt`

**Interfaces:**
- Consumes: Packaged Windows artifacts.
- Produces: Fresh validation evidence, installer size, SHA-256 digest, and a smoke-test result.

- [x] **Step 1: Validate expected files and PE metadata**

Use PowerShell file inspection to confirm both installer and unpacked executable exist, are non-empty, and report the expected product/version metadata where available.

- [x] **Step 2: Validate packaged application contents**

List `app.asar` and confirm it contains `dist/main/main.js`, `dist/preload/desktopPetApi.cjs`, `dist/renderer/index.html`, and `package.json`. Confirm sample pets are present under `resources/pets`.

- [x] **Step 3: Smoke-start the unpacked application**

Launch `release/windows/win-unpacked/TablePet.exe` with an isolated workspace user-data directory, confirm the process stays alive long enough to initialize, then close only the launched process.

- [x] **Step 4: Record the installer hash**

Run `Get-FileHash -Algorithm SHA256` on the installer and write one reproducible line to `release/windows/SHA256SUMS.txt`.

- [x] **Step 5: Re-run the full verification gate**

Run unit tests, both type checks, and `npm run build` again after packaging.

Expected: every command exits 0 with zero test failures.

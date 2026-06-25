# TablePet

Independent desktop runtime for Codex Hatch Pet v1 packages.

TablePet targets the M0/M1 MVP for macOS and Windows desktop pet playback.

## Development

Install dependencies:

```bash
npm install
```

Run the app:

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

Package:

```bash
npm run package
```

## Supported Pet Package

The MVP imports a folder with:

```text
pet.json
spritesheet.webp
```

The atlas must be `1536x1872`, using 8 columns x 9 rows of `192x208` cells.

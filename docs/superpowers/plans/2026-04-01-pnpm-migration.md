# pnpm移行 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** npmからpnpmへ移行し、`pnpm-lock.yaml` による依存関係管理と、GitHub Actionsでの `pnpm/action-setup@v4` を用いたCI/CDを実現する。

**Architecture:** 単一パッケージのTypeScriptライブラリ。`package-lock.json` を削除して `pnpm-lock.yaml` に置き換え、関連する設定ファイルをすべてpnpm向けに更新する。

**Tech Stack:** pnpm@10.30.3, Node.js 20.x, GitHub Actions (`pnpm/action-setup@v4`, `actions/setup-node@v4`)

---

## 変更対象ファイル

| 操作 | ファイル |
|------|---------|
| 変更 | `package.json` |
| 削除 | `package-lock.json` |
| 新規生成 | `pnpm-lock.yaml` |
| 変更 | `.github/workflows/publish.yml` |
| 変更 | `lefthook.yml` |

---

### Task 1: `package.json` を更新する

**Files:**
- Modify: `package.json`

- [ ] **Step 1: `packageManager` フィールドと `prepack` スクリプトを更新する**

`package.json` を以下のように変更する:

```json
{
  "name": "@tier4/roslibjs-foxglove",
  "version": "0.0.4",
  "description": "An implementation of roslibjs's interfaces by using Foxglove WebSocket Protocol.",
  "author": "TIER IV, Inc.",
  "license": "Apache-2.0",
  "packageManager": "pnpm@10.30.3",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/tier4/roslibjs-foxglove.git"
  },
  "bugs": {
    "url": "https://github.com/tier4/roslibjs-foxglove/issues"
  },
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/esm/index.d.ts",
  "files": ["dist", "src"],
  "sideEffects": false,
  "scripts": {
    "build": "tsc -b tsconfig.json tsconfig.cjs.json",
    "biome": "biome check --apply .",
    "clean": "rimraf dist",
    "prepack": "pnpm run clean && pnpm run build"
  },
  "dependencies": {
    "@foxglove/rosmsg": "^4.2.2",
    "@foxglove/rosmsg-serialization": "^2.0.3",
    "@foxglove/rosmsg2-serialization": "^2.0.2",
    "@foxglove/ws-protocol": "^0.7.1",
    "eventemitter3": "^5.0.1",
    "isomorphic-ws": "^5.0.0"
  },
  "devDependencies": {
    "@biomejs/biome": "1.7.3",
    "lefthook": "^1.6.10",
    "rimraf": "^5.0.5",
    "typescript": "^5.2.2"
  }
}
```

- [ ] **Step 2: 変更を確認する**

```bash
cat package.json | grep -E '"packageManager"|"prepack"'
```

期待される出力:
```
  "packageManager": "pnpm@10.30.3",
    "prepack": "pnpm run clean && pnpm run build",
```

---

### Task 2: `package-lock.json` を削除して `pnpm-lock.yaml` を生成する

**Files:**
- Delete: `package-lock.json`
- Create: `pnpm-lock.yaml`（`pnpm install` により生成）

- [ ] **Step 1: `package-lock.json` を削除する**

```bash
rm package-lock.json
```

- [ ] **Step 2: `pnpm install` を実行して `pnpm-lock.yaml` を生成する**

```bash
pnpm install
```

期待される出力（例）:
```
Lockfile is up to date, resolution step is skipped
Already up to date
Done in Xs
```

- [ ] **Step 3: `pnpm-lock.yaml` が生成されたことを確認する**

```bash
ls pnpm-lock.yaml
```

期待される出力:
```
pnpm-lock.yaml
```

- [ ] **Step 4: ビルドが正常に動作することを確認する**

```bash
pnpm run build
```

期待される出力: エラーなし、`dist/` ディレクトリが生成される。

- [ ] **Step 5: コミットする**

```bash
git add package.json pnpm-lock.yaml
git rm package-lock.json
git commit -m "chore: migrate from npm to pnpm"
```

---

### Task 3: `.github/workflows/publish.yml` を更新する

**Files:**
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: ワークフローファイルをpnpm向けに更新する**

`.github/workflows/publish.yml` を以下の内容に書き換える:

```yaml
name: publish package

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest

    permissions:
      contents: write

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: https://registry.npmjs.org/
          scope: "@tier4"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Create tarball
        run: pnpm pack

      - name: Publish package
        uses: softprops/action-gh-release@v2
        with:
          files: tier4-roslibjs-foxglove-*.tgz
```

- [ ] **Step 2: コミットする**

```bash
git add .github/workflows/publish.yml
git commit -m "ci: use pnpm/action-setup in publish workflow"
```

---

### Task 4: `lefthook.yml` を更新する

**Files:**
- Modify: `lefthook.yml`

- [ ] **Step 1: pre-commitフックをpnpm向けに更新する**

`lefthook.yml` を以下の内容に書き換える:

```yaml
pre-commit:
  commands:
    biome:
      run: pnpm run biome
      stage_fixed: true
```

- [ ] **Step 2: コミットする**

```bash
git add lefthook.yml
git commit -m "chore: update lefthook to use pnpm"
```

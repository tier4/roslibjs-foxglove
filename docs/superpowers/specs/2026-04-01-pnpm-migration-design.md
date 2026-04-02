---
name: pnpm移行設計
description: roslibjs-foxgloveをnpmからpnpmに移行するための設計仕様
type: project
---

# pnpm移行設計

**日付:** 2026-04-01
**ステータス:** 承認済み

## 概要

`@tier4/roslibjs-foxglove` パッケージをnpmからpnpmへ移行する。本プロジェクトはモノレポ構成のない単一パッケージのTypeScriptライブラリである。

## 目標

- `package-lock.json` を `pnpm-lock.yaml` に置き換える
- `package.json` の `packageManager` フィールドでpnpmバージョンを固定する（pnpm@10.30.3）
- GitHub Actionsで `pnpm/action-setup@v4` を使用するよう更新する
- GitHub Releasesへのtarballアップロード運用を維持する（npm registryへの公開はしない）

## スコープ外

- モノレポのセットアップ
- `pnpm-workspace.yaml`（単一パッケージのため不要）
- npm registryへの公開

## ファイル変更内容

### `package.json`

`packageManager` フィールドを追加し、`prepack` スクリプトを更新する:

```json
{
  "packageManager": "pnpm@10.30.3",
  "scripts": {
    "prepack": "pnpm run clean && pnpm run build"
  }
}
```

### `package-lock.json`

削除する。`pnpm-lock.yaml` に置き換えられる。

### `pnpm-lock.yaml`

`pnpm install` の実行により新規生成される。

### `.github/workflows/publish.yml`

`pnpm/action-setup@v4` を用いてnpmのステップをpnpm相当に置き換える:

- `setup-node` の前に `pnpm/action-setup@v4` ステップを追加（`packageManager` フィールドからバージョンを自動読み取り）
- `setup-node` に `cache: "pnpm"` を追加
- `npm ci` を `pnpm install --frozen-lockfile` に変更
- `npm pack` を `pnpm pack` に変更

### `lefthook.yml`

pre-commitフックを更新する:

- `npm run biome` を `pnpm run biome` に変更

## 実装手順

1. `package.json` に `packageManager` フィールドを追加し、`prepack` スクリプトを更新する
2. `package-lock.json` を削除する
3. `pnpm install` を実行して `pnpm-lock.yaml` を生成する
4. `.github/workflows/publish.yml` を更新する
5. `lefthook.yml` を更新する
6. `pnpm run build` でビルドが正常に動作することを確認する

# Transfer Radar

海外サッカーの移籍情報をRSSフィードから収集し、選手名・移籍元/先を自動抽出して表示するWebアプリ。

## 技術スタック

- **フレームワーク**: Next.js 14.2.3 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS 3.4
- **RSSパース**: rss-parser

## プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   └── transfers/
│   │       └── route.ts    # RSS取得・移籍情報抽出API
│   ├── globals.css         # グローバルスタイル
│   ├── layout.tsx          # ルートレイアウト
│   └── page.tsx            # メインページ（ニュース一覧）
```

## 主要コンポーネント

### API Route (`/api/transfers`)

- Sky Sports、Transfermarkt、ESPN FC、The AthleticからRSSフィードを取得
- 全記事をまとめてClaude API（Haiku 4.5）に1回のバッチリクエストで渡し、移籍関連記事かどうかの判定と選手名・移籍元/先クラブ・移籍種別・移籍金の抽出を行う
- 判定結果はメモリキャッシュ（夏冬移籍ウィンドウは30分、オフシーズンは2時間）し、API失敗時は古いキャッシュを返す（stale-while-revalidate）

### メインページ (`/`)

- クライアントコンポーネント（`"use client"`）
- 記事一覧をカード形式で表示
- クリックで元記事を新規タブで開く
- ソース別に色分け（Sky Sports=赤、Transfermarkt=紫、ESPN=青、The Athletic=エメラルド）
- 移籍種別を色分けバッジで表示（完全移籍=緑、ローン=青、契約延長=紫）、移籍金をバッジ横にテキスト表示
- 移籍元→移籍先をアイコン付きで表示

## コマンド

```bash
npm run dev      # 開発サーバー起動 (http://localhost:3000)
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー起動
npm run lint     # ESLint実行
```

## RSSフィード

| ソース | URL |
|--------|-----|
| Sky Sports | https://www.skysports.com/rss/12040 |
| Transfermarkt | https://www.transfermarkt.com/rss/news |
| ESPN FC | https://www.espn.com/espn/rss/soccer/news |
| The Athletic | https://theathletic.com/rss/football/ |

## 移籍情報抽出ロジック

`src/app/api/transfers/route.ts` の `extractTransfersWithLLM` 関数で、`@anthropic-ai/sdk`（`claude-haiku-4-5`）を使って以下を抽出:

- **判定**: 男子サッカーの移籍関連記事かどうか（女子サッカー・NFL等は除外）
- **抽出項目**: 選手名・移籍元クラブ・移籍先クラブ・移籍種別（`complete`/`loan`/`extension`）・移籍金
- 全記事を1回のバッチリクエストにまとめ、`anthropic.messages.parse()` + `zodOutputFormat()` で構造化出力を取得
- 実行には環境変数 `ANTHROPIC_API_KEY`（`.env.local`）が必要

## ブランチ運用

| 種類 | 命名規則 | 例 |
|------|----------|-----|
| 機能追加 | `feature/機能名` | `feature/league-filter` |
| バグ修正 | `fix/内容` | `fix/duplicate-articles` |
| リファクタ | `refactor/内容` | `refactor/api-cleanup` |

- `main`ブランチへは直接pushしない
- PRを作成してマージする
- PRのタイトル・本文は日本語で書く
- PRを`main`へマージした後は、ローカルを`main`に切り替えて`git pull`する
- 新しいブランチは必ず最新の`main`から切る
- **PRの本文**に `@claude` を含めると自動でレビューが入る
- PRのコメント欄でも `@claude` をメンションするとレビュー可能
- マージ後、Vercelが自動デプロイ

## 環境要件

- Node.js >= 18.17.0（推奨: 20.9.0以上）

## 今後の方針

### 拡張候補（優先度低）

- リーグ別フィルター機能
- 選手検索機能

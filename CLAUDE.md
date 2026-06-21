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
- 移籍関連キーワード（transfer, sign, deal, move, join, loan等）でフィルタリング
- 記事タイトル・内容から選手名・チーム名を正規表現で抽出

### メインページ (`/`)

- クライアントコンポーネント（`"use client"`）
- 記事一覧をカード形式で表示
- クリックで元記事を新規タブで開く
- ソース別に色分け（Sky Sports=赤、Transfermarkt=紫、ESPN=青、The Athletic=エメラルド）

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

`src/app/api/transfers/route.ts` の `extractTransferInfo` 関数で以下を抽出:

1. **選手名**: "Player joins Club" / "Club sign Player" パターンをマッチ
2. **チーム名**: 有名クラブ名リスト（CLUBS配列）との照合
3. **移籍方向**: "from Club" / "to Club" パターンで判定

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

### LLMベースの移籍情報抽出（最優先）

現行の正規表現ベース抽出を **Claude API（Haiku 4.5）** に置き換える。

**抽出項目**
- 選手名・移籍元クラブ・移籍先クラブ
- 移籍種別（完全移籍 / ローン / 契約延長）
- 移籍金（記載がある場合）

**設計方針**
- LLMが「移籍関連記事か」の判定も兼ねる（現行の `isTransferRelated()` を置き換え）→ 非関連記事は非表示
- 全記事を1回のAPIリクエストでバッチ処理
- 結果をキャッシュ：夏冬移籍ウィンドウ（6〜9月・1月）は30分、オフシーズンは2時間
- APIエラー時は古いキャッシュをそのまま返す（stale-while-revalidate）

**UI変更**
- 移籍種別を色分けバッジで表示
- 移籍金をバッジ横にテキスト表示（例：€50M）

**実装順序**
1. `types/transfer.ts` に `transferType` / `transferFee` を追加
2. `route.ts` にClaude Haiku呼び出し + バッチプロンプト + キャッシュを実装
3. `page.tsx` にバッジ表示を追加

### その他の拡張候補（優先度低）

- リーグ別フィルター機能
- 選手検索機能

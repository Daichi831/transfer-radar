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

- Sky Sports、BBC Sport、ESPN FCからRSSフィードを取得
- 移籍関連キーワード（transfer, sign, deal, move, join, loan等）でフィルタリング
- 記事タイトル・内容から選手名・チーム名を正規表現で抽出

### メインページ (`/`)

- クライアントコンポーネント（`"use client"`）
- 記事一覧をカード形式で表示
- クリックで元記事を新規タブで開く
- ソース別に色分け（Sky Sports=赤、BBC=オレンジ、ESPN=青）

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
| BBC Sport | https://feeds.bbci.co.uk/sport/football/rss.xml |
| ESPN FC | https://www.espn.com/espn/rss/soccer/news |

## 移籍情報抽出ロジック

`src/app/api/transfers/route.ts` の `extractTransferInfo` 関数で以下を抽出:

1. **選手名**: "Player joins Club" / "Club sign Player" パターンをマッチ
2. **チーム名**: 有名クラブ名リスト（CLUBS配列）との照合
3. **移籍方向**: "from Club" / "to Club" パターンで判定

## 環境要件

- Node.js >= 18.17.0（推奨: 20.9.0以上）

## 今後の拡張候補

- Transfermarkt API連携（RapidAPI経由）
- リーグ別フィルター機能
- 選手検索機能
- 移籍金情報の表示

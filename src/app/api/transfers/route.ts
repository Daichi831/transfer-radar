import { NextResponse } from "next/server";
import Parser from "rss-parser";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { TransferNews, TransferType } from "@/types/transfer";

const parser = new Parser();
const anthropic = new Anthropic();

const RSS_FEEDS = [
  {
    name: "Sky Sports",
    url: "https://www.skysports.com/rss/12040",
  },
  {
    name: "Transfermarkt",
    url: "https://www.transfermarkt.com/rss/news",
  },
  {
    name: "ESPN FC",
    url: "https://www.espn.com/espn/rss/soccer/news",
  },
  {
    name: "The Athletic",
    url: "https://theathletic.com/rss/football/",
  },
];

type RawArticle = Omit<TransferNews, "extractedInfo">;

const extractionResultSchema = z.object({
  results: z.array(
    z.object({
      index: z.number(),
      isTransferRelated: z.boolean(),
      playerName: z.string().optional(),
      fromTeam: z.string().optional(),
      toTeam: z.string().optional(),
      transferType: z.enum(["complete", "loan", "extension"]).optional(),
      transferFee: z.string().optional(),
    })
  ),
});

// 記事群をLLMでバッチ判定・抽出する
async function extractTransfersWithLLM(
  articles: RawArticle[]
): Promise<TransferNews[]> {
  if (articles.length === 0) return [];

  const articlesForPrompt = articles.map((article, index) => ({
    index,
    title: article.title,
    content: (article.content || "").slice(0, 800),
  }));

  const message = await anthropic.messages.parse({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: `以下は海外メディアのスポーツニュース記事一覧です。各記事について、男子サッカーの「移籍」に関する記事かどうかを判定してください。

判定基準:
- 男子サッカーの選手の移籍・加入・ローン・契約延長に関する記事は isTransferRelated: true
- 女子サッカー（WSL、NWSL等）、NFL、その他のスポーツ、移籍と関係ない記事（試合結果、戦術分析など）は isTransferRelated: false

isTransferRelated: true の記事については、可能な範囲で以下も抽出してください:
- playerName: 移籍の対象となる選手の氏名（クラブ名や監督名ではなく、実際に移籍・加入・契約延長する選手本人の名前。タイトル中の "Player joins Club" "Club sign Player" "Club agree fee for Player" のような構文や、本文中の代名詞・所属言及から人物を特定すること）
- fromTeam: 移籍元クラブ名（現在所属している、または所属していたクラブ）
- toTeam: 移籍先クラブ名（新たに加入する、加入を検討されているクラブ）
- transferType: "complete"（完全移籍）/ "loan"（ローン）/ "extension"（契約延長）のいずれか
- transferFee: 移籍金の記載があれば（例: "€50M"）

重要: 記事中に明記されていない項目、または推測でしか埋められない項目は、そのフィールド自体を結果から省略してください。"Unknown"・"不明"・"Multiple players"のような穴埋め用の文字列は絶対に値として使わないこと。

記事一覧:
${JSON.stringify(articlesForPrompt, null, 2)}`,
      },
    ],
    output_config: { format: zodOutputFormat(extractionResultSchema) },
  });

  if (!message.parsed_output) {
    throw new Error("Failed to parse LLM structured output");
  }

  const resultByIndex = new Map(
    message.parsed_output.results.map((result) => [result.index, result])
  );

  const transfers: TransferNews[] = [];
  for (let i = 0; i < articles.length; i++) {
    const result = resultByIndex.get(i);
    if (!result || !result.isTransferRelated) continue;

    transfers.push({
      ...articles[i],
      extractedInfo: {
        playerName: result.playerName,
        fromTeam: result.fromTeam,
        toTeam: result.toTeam,
        transferType: result.transferType as TransferType | undefined,
        transferFee: result.transferFee,
      },
    });
  }

  return transfers;
}

async function fetchRawArticles(): Promise<RawArticle[]> {
  const allNews: RawArticle[] = [];

  const feedPromises = RSS_FEEDS.map(async (feed) => {
    try {
      const parsed = await parser.parseURL(feed.url);
      return parsed.items.map((item) => {
        const title = item.title || "No title";
        const content = item.contentSnippet || "";

        return {
          id: item.guid || item.link || `${feed.name}-${title}`,
          title,
          link: item.link || "",
          pubDate: item.pubDate || new Date().toISOString(),
          source: feed.name,
          content,
        };
      });
    } catch (error) {
      console.error(`Failed to fetch ${feed.name}:`, error);
      return [];
    }
  });

  const results = await Promise.all(feedPromises);
  results.forEach((items) => allNews.push(...items));

  // 日付でソート（新しい順）
  allNews.sort(
    (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
  );

  // 重複を除去（タイトルで判定）
  const seenTitles = new Set<string>();
  return allNews.filter((item) => {
    const normalizedTitle = item.title.toLowerCase().trim();
    if (seenTitles.has(normalizedTitle)) return false;
    seenTitles.add(normalizedTitle);
    return true;
  });
}

// 夏冬の移籍ウィンドウ（6〜9月・1月）は30分、それ以外は2時間
function getCacheTtlMs(): number {
  const month = new Date().getMonth() + 1;
  const isTransferWindow = month === 1 || (month >= 6 && month <= 9);
  return isTransferWindow ? 30 * 60 * 1000 : 2 * 60 * 60 * 1000;
}

let cache: { data: TransferNews[]; timestamp: number } | null = null;

export const dynamic = "force-dynamic";

export async function GET() {
  if (cache && Date.now() - cache.timestamp < getCacheTtlMs()) {
    return NextResponse.json({ news: cache.data });
  }

  try {
    const rawArticles = await fetchRawArticles();
    const news = await extractTransfersWithLLM(rawArticles);

    cache = { data: news, timestamp: Date.now() };

    return NextResponse.json({ news });
  } catch (error) {
    console.error("Error fetching transfers:", error);

    // stale-while-revalidate: 失敗時は古いキャッシュがあれば返す
    if (cache) {
      return NextResponse.json({ news: cache.data });
    }

    return NextResponse.json(
      { error: "Failed to fetch transfer news" },
      { status: 500 }
    );
  }
}

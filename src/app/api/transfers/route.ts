import { NextResponse } from "next/server";
import Parser from "rss-parser";
import type { TransferNews } from "@/types/transfer";

const parser = new Parser();

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

// 有名クラブ名のリスト（抽出用）
const CLUBS = [
  // プレミアリーグ
  "Arsenal", "Chelsea", "Liverpool", "Manchester United", "Manchester City",
  "Tottenham", "Newcastle", "West Ham", "Aston Villa", "Brighton",
  // ラ・リーガ
  "Real Madrid", "Barcelona", "Atletico Madrid", "Sevilla", "Real Sociedad",
  // ブンデスリーガ
  "Bayern Munich", "Borussia Dortmund", "RB Leipzig", "Bayer Leverkusen",
  // セリエA
  "Juventus", "AC Milan", "Inter Milan", "Napoli", "Roma",
  // リーグ・アン
  "PSG", "Paris Saint-Germain", "Monaco", "Marseille",
];

// タイトルと内容から選手名・チーム名を抽出
function extractTransferInfo(title: string, content: string): {
  playerName?: string;
  fromTeam?: string;
  toTeam?: string;
} {
  const text = `${title} ${content}`;
  const result: { playerName?: string; fromTeam?: string; toTeam?: string } = {};

  // チーム名を抽出
  const foundClubs: string[] = [];
  for (const club of CLUBS) {
    if (text.toLowerCase().includes(club.toLowerCase())) {
      foundClubs.push(club);
    }
  }

  // パターンマッチングで移籍情報を抽出
  const clubsPattern = CLUBS.map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");

  // "Player joins Club" パターン
  const joinsMatch = title.match(/([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+(?:joins|signs for|moves to|set to join|close to joining|completes move to)/i);
  if (joinsMatch) {
    result.playerName = joinsMatch[1];
  }

  // "Club sign Player" パターン
  const signMatch = title.match(/(?:sign|signing|signed|agree deal for|target|want|interested in)\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  if (signMatch && !result.playerName) {
    result.playerName = signMatch[1];
  }

  // "Player from Club" パターン
  const fromMatch = text.match(new RegExp(`from\\s+(${clubsPattern})`, "i"));
  if (fromMatch) {
    result.fromTeam = fromMatch[1];
  }

  // "to Club" パターン
  const toMatch = text.match(new RegExp(`(?:to|joins?|for)\\s+(${clubsPattern})`, "i"));
  if (toMatch) {
    result.toTeam = toMatch[1];
  }

  // 見つかったクラブから推測
  if (foundClubs.length >= 2 && !result.fromTeam && !result.toTeam) {
    result.fromTeam = foundClubs[0];
    result.toTeam = foundClubs[1];
  } else if (foundClubs.length === 1) {
    if (!result.toTeam) {
      result.toTeam = foundClubs[0];
    }
  }

  return result;
}

const WOMEN_KEYWORDS = ["wsl", "women", "nwsl", "lionesses", "women's", "female", "ladies"];
const NFL_KEYWORDS = ["nfl", "touchdown", "quarterback", "super bowl", "patriots", "chiefs", "cowboys", "49ers", "rams", "browns", "ravens", "bills", "dolphins", "jets", "steelers", "bengals", "colts", "texans", "jaguars", "titans", "broncos", "raiders", "chargers", "seahawks", "cardinals", "falcons", "panthers", "saints", "buccaneers", "bears", "lions", "packers", "vikings", "commanders", "giants", "eagles"];
const TRANSFER_KEYWORDS = ["transfer", "sign", "deal", "move", "join", "loan", "target", "bid"];

function isTransferRelated(title: string, content: string): boolean {
  if (WOMEN_KEYWORDS.some((kw) => title.includes(kw) || content.includes(kw))) return false;
  if (NFL_KEYWORDS.some((kw) => title.includes(kw) || content.includes(kw))) return false;
  return (
    TRANSFER_KEYWORDS.some((kw) => title.includes(kw)) ||
    content.includes("transfer") ||
    content.includes("signing")
  );
}

export async function GET() {
  try {
    const allNews: TransferNews[] = [];

    const feedPromises = RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items
          .filter((item) => {
            const title = item.title?.toLowerCase() || "";
            const content = item.contentSnippet?.toLowerCase() || "";
            return isTransferRelated(title, content);
          })
          .map((item) => {
            const title = item.title || "No title";
            const content = item.contentSnippet || "";
            const extractedInfo = extractTransferInfo(title, content);

            return {
              id: item.guid || item.link || `${feed.name}-${title}`,
              title,
              link: item.link || "",
              pubDate: item.pubDate || new Date().toISOString(),
              source: feed.name,
              content,
              extractedInfo,
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
    const uniqueNews = allNews.filter((item) => {
      const normalizedTitle = item.title.toLowerCase().trim();
      if (seenTitles.has(normalizedTitle)) {
        return false;
      }
      seenTitles.add(normalizedTitle);
      return true;
    });

    return NextResponse.json({ news: uniqueNews });
  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer news" },
      { status: 500 }
    );
  }
}

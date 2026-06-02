"use client";

import { useEffect, useState } from "react";

interface TransferNews {
  id: string;
  title: string;
  link: string;
  pubDate: string;
  source: string;
  content?: string;
  extractedInfo?: {
    playerName?: string;
    fromTeam?: string;
    toTeam?: string;
  };
}

export default function Home() {
  const [news, setNews] = useState<TransferNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNews() {
      try {
        const response = await fetch("/api/transfers");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setNews(data.news);
      } catch (err) {
        setError("移籍ニュースの取得に失敗しました");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchNews();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "Sky Sports":
        return "bg-red-600";
      case "Transfermarkt":
        return "bg-violet-600";
      case "ESPN FC":
        return "bg-blue-600";
      case "The Athletic":
        return "bg-emerald-600";
      default:
        return "bg-gray-600";
    }
  };

  const handleArticleClick = (link: string) => {
    window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">⚽</span>
            Transfer Radar
          </h1>
          <p className="text-slate-400 mt-2">海外サッカー移籍情報まとめ</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-600 border-t-green-500"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && news.length === 0 && (
          <div className="text-center py-20 text-slate-400">
            移籍ニュースが見つかりませんでした
          </div>
        )}

        <div className="space-y-4">
          {news.map((item) => (
            <article
              key={item.id}
              onClick={() => handleArticleClick(item.link)}
              className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:bg-slate-700/50 hover:border-slate-600 transition-all cursor-pointer group"
            >
              {/* ヘッダー: ソース & 日付 */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`px-2 py-0.5 text-xs font-medium text-white rounded ${getSourceColor(
                    item.source
                  )}`}
                >
                  {item.source}
                </span>
                <span className="text-sm text-slate-500">
                  {formatDate(item.pubDate)}
                </span>
                <svg
                  className="w-4 h-4 text-slate-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>

              {/* タイトル */}
              <h2 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors mb-3">
                {item.title}
              </h2>

              {/* 抽出した移籍情報 */}
              {item.extractedInfo &&
                (item.extractedInfo.playerName ||
                  item.extractedInfo.fromTeam ||
                  item.extractedInfo.toTeam) && (
                  <div className="bg-slate-900/50 rounded-lg p-3 mb-3">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {item.extractedInfo.playerName && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">選手:</span>
                          <span className="text-white font-medium">
                            {item.extractedInfo.playerName}
                          </span>
                        </div>
                      )}
                      {(item.extractedInfo.fromTeam ||
                        item.extractedInfo.toTeam) && (
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400">移籍:</span>
                          {item.extractedInfo.fromTeam && (
                            <span className="text-slate-300">
                              {item.extractedInfo.fromTeam}
                            </span>
                          )}
                          {item.extractedInfo.fromTeam &&
                            item.extractedInfo.toTeam && (
                              <svg
                                className="w-4 h-4 text-green-500"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                                />
                              </svg>
                            )}
                          {item.extractedInfo.toTeam && (
                            <span className="text-green-400 font-medium">
                              {item.extractedInfo.toTeam}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              {/* 記事の内容（プレビュー） */}
              {item.content && (
                <p className="text-slate-400 text-sm line-clamp-2">
                  {item.content}
                </p>
              )}
            </article>
          ))}
        </div>
      </main>

      <footer className="border-t border-slate-700 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-slate-500 text-sm">
          RSS feeds from Sky Sports, Transfermarkt, ESPN FC, The Athletic
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";

// Types
interface StockPrice {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  support?: number;
  resistance?: number;
  high52w?: number;
  low52w?: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  maSignal?: "bullish" | "bearish" | "neutral";
  rsi?: number;
  rsiSignal?: "overbought" | "oversold" | "neutral";
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  macdTrend?: "bullish" | "bearish" | "neutral";
  poc?: number;
  vaHigh?: number;
  vaLow?: number;
}

interface SocialDataResult {
  buzzScore: number;
  newsCount: number;
  sentimentScore: number;
  sentiment: "positive" | "negative" | "neutral";
  sources: string[];
  qualityScore?: number;
  tier1Count?: number;
  tier2Count?: number;
  tier3Count?: number;
}

interface InsiderSocialData {
  insider: unknown | null;
  social: SocialDataResult | null;
}

interface StockRanking {
  symbol: string;
  priceData: StockPrice;
  socialData: InsiderSocialData | null;
  // Scores
  totalScore: number;
  tier1Score: number;
  rsiScore: number;
  trendScore: number;
  bullishScore: number;
  macdScore: number;
  positionScore: number;
  // Analysis
  positionSize: number;
  positionReason: string;
  rank: number;
}

export default function ComparePage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rankings, setRankings] = useState<StockRanking[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Calculate scores for a stock
  function calculateScores(
    priceData: StockPrice,
    socialData: InsiderSocialData | null,
  ): Omit<StockRanking, "symbol" | "priceData" | "socialData" | "rank"> {
    const tier1Count = socialData?.social?.tier1Count || 0;
    const hasTier1 = tier1Count >= 1;
    const rsi = priceData.rsi || 50;
    const sma50 = priceData.ma50;
    const isStrongTrend = sma50 ? priceData.currentPrice > sma50 : true;
    const trendPercent = sma50
      ? ((priceData.currentPrice - sma50) / sma50) * 100
      : 0;

    // Calculate Bullish %
    let bullishPoints = 0;
    let totalPoints = 0;

    // MA Signal
    if (priceData.maSignal === "bullish") bullishPoints += 2;
    else if (priceData.maSignal === "bearish") bullishPoints += 0;
    else bullishPoints += 1;
    totalPoints += 2;

    // RSI Signal
    if (priceData.rsiSignal === "oversold") bullishPoints += 2;
    else if (priceData.rsiSignal === "overbought") bullishPoints += 0;
    else bullishPoints += 1;
    totalPoints += 2;

    // MACD
    if (priceData.macdTrend === "bullish") bullishPoints += 2;
    else if (priceData.macdTrend === "bearish") bullishPoints += 0;
    else bullishPoints += 1;
    totalPoints += 2;

    const bullishPercent =
      totalPoints > 0 ? (bullishPoints / totalPoints) * 100 : 50;

    // === SCORING ===

    // Tier 1 Score (max 25)
    const tier1Score = hasTier1 ? 25 : 0;

    // RSI Score (max 20)
    let rsiScore = 0;
    if (rsi < 40) rsiScore = 20;
    else if (rsi < 60) rsiScore = 15;
    else if (rsi < 70) rsiScore = 10;
    else rsiScore = 0;

    // Trend Score (max 20)
    const trendScore = isStrongTrend ? 20 : 10;

    // Bullish Score (max 15)
    const bullishScore = Math.round(bullishPercent * 0.15);

    // MACD Score (max 10)
    let macdScore = 5;
    if (priceData.macdTrend === "bullish") macdScore = 10;
    else if (priceData.macdTrend === "bearish") macdScore = 0;

    // Position Sizing Logic (same as search page)
    let positionSize = 5;
    let positionReason = "";
    const rsiSafe = rsi <= 70;
    const buzzScore = socialData?.social?.buzzScore || 0;
    const buzzHigh = buzzScore > 80;

    if (hasTier1 && rsiSafe && isStrongTrend) {
      positionSize = 15;
      positionReason = `🔥 Perfect Storm! Tier 1 + RSI ${rsi.toFixed(0)} + Uptrend (+${trendPercent.toFixed(1)}%)`;
    } else if (hasTier1 && rsiSafe && !isStrongTrend) {
      positionSize = 7;
      positionReason = `💡 Tier 1 ข่าวดี แต่กราฟย่อ (${trendPercent.toFixed(1)}%) ซื้อถัวรอกลับ`;
    } else if (hasTier1 && !rsiSafe) {
      positionSize = 5;
      positionReason = `Tier 1 แต่ RSI ${rsi.toFixed(0)} แพง รอย่อ`;
    } else if (!hasTier1 && buzzHigh) {
      positionSize = 2;
      positionReason = `⚠️ Buzz สูงแต่ไม่พบ Tier 1 ระวัง FOMO`;
    } else if (bullishPercent >= 70 && rsiSafe && isStrongTrend) {
      positionSize = 12;
      positionReason = `Bullish ${bullishPercent.toFixed(0)}% + RSI Safe + Uptrend`;
    } else if (bullishPercent >= 55 && isStrongTrend) {
      positionSize = 8;
      positionReason = `สัญญาณปานกลาง + Uptrend`;
    } else if (bullishPercent >= 55) {
      positionSize = 5;
      positionReason = `สัญญาณดีแต่กราฟย่อ ซื้อถัว`;
    } else {
      positionSize = 3;
      positionReason = `สัญญาณอ่อน รอดูก่อน`;
    }

    // Position Score (max 10) = positionSize * 0.67
    const positionScore = Math.round(positionSize * 0.67);

    const totalScore =
      tier1Score +
      rsiScore +
      trendScore +
      bullishScore +
      macdScore +
      positionScore;

    return {
      totalScore,
      tier1Score,
      rsiScore,
      trendScore,
      bullishScore,
      macdScore,
      positionScore,
      positionSize,
      positionReason,
    };
  }

  async function compareStocks() {
    const symbols = input
      .toUpperCase()
      .split(/[\s,]+/)
      .filter((s) => s.length > 0);

    if (symbols.length < 2) {
      setError("กรุณาใส่อย่างน้อย 2 symbols (เช่น NVDA, TSLA, AAPL)");
      return;
    }

    setLoading(true);
    setError(null);
    setRankings([]);

    try {
      // Fetch price data for all symbols
      const priceRes = await fetch(`/api/prices?symbols=${symbols.join(",")}`);
      const priceData: Record<string, StockPrice> = await priceRes.json();

      // Fetch social data for each symbol
      const socialPromises = symbols.map(async (symbol) => {
        try {
          const res = await fetch(`/api/insider?symbol=${symbol}`);
          if (res.ok) {
            return { symbol, data: (await res.json()) as InsiderSocialData };
          }
        } catch {
          // Ignore errors
        }
        return { symbol, data: null };
      });

      const socialResults = await Promise.all(socialPromises);
      const socialMap: Record<string, InsiderSocialData | null> = {};
      socialResults.forEach((r) => {
        socialMap[r.symbol] = r.data;
      });

      // Calculate rankings
      const rankingData: StockRanking[] = symbols
        .filter((symbol) => priceData[symbol])
        .map((symbol) => {
          const scores = calculateScores(priceData[symbol], socialMap[symbol]);
          return {
            symbol,
            priceData: priceData[symbol],
            socialData: socialMap[symbol],
            ...scores,
            rank: 0,
          };
        });

      // Sort by total score (descending)
      rankingData.sort((a, b) => b.totalScore - a.totalScore);

      // Assign ranks
      rankingData.forEach((r, i) => {
        r.rank = i + 1;
      });

      setRankings(rankingData);
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getRankIcon(rank: number): string {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  }

  function getRankLabel(rank: number): string {
    if (rank === 1) return "Best Pick";
    if (rank === 2) return "2nd Choice";
    if (rank === 3) return "3rd Choice";
    return `#${rank}`;
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  }

  function formatUSD(value: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-lg border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <h1 className="text-xl font-bold text-white">Stock Battle</h1>
                <p className="text-gray-400 text-sm">
                  เปรียบเทียบหุ้น - จัดอันดับพร้อมเหตุผล
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                📊 Portfolio
              </Link>
              <Link
                href="/search"
                className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                🔍 Search
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-gray-400 text-sm mb-2">
                ใส่ symbols ที่ต้องการเปรียบเทียบ (คั่นด้วย comma หรือ space)
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="เช่น NVDA, TSLA, AAPL, MSFT"
                className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                onKeyDown={(e) => e.key === "Enter" && compareStocks()}
              />
            </div>
            <button
              onClick={compareStocks}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? "⏳ กำลังวิเคราะห์..." : "🔥 เปรียบเทียบ"}
            </button>
          </div>
          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}
        </div>

        {/* Rankings */}
        {rankings.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span>📊</span> ผลการจัดอันดับ
            </h2>

            {rankings.map((stock) => (
              <div
                key={stock.symbol}
                className={`bg-gray-800/50 backdrop-blur-xl rounded-2xl border ${
                  stock.rank === 1
                    ? "border-yellow-500/50 shadow-lg shadow-yellow-500/10"
                    : stock.rank === 2
                      ? "border-gray-400/50"
                      : stock.rank === 3
                        ? "border-amber-700/50"
                        : "border-gray-700/50"
                } p-6`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{getRankIcon(stock.rank)}</span>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-bold text-white">
                          {stock.symbol}
                        </h3>
                        {stock.rank === 1 && (
                          <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold rounded-full">
                            {getRankLabel(stock.rank)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400">
                        {formatUSD(stock.priceData.currentPrice)}
                        <span
                          className={`ml-2 ${
                            stock.priceData.dayChangePercent >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {stock.priceData.dayChangePercent >= 0 ? "+" : ""}
                          {stock.priceData.dayChangePercent.toFixed(2)}%
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-4xl font-bold ${getScoreColor(
                        stock.totalScore,
                      )}`}
                    >
                      {stock.totalScore}
                    </p>
                    <p className="text-gray-500 text-sm">/100</p>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Tier 1 News</p>
                    <p className="text-white font-bold">+{stock.tier1Score}</p>
                    <p className="text-gray-500 text-[10px]">
                      {stock.socialData?.social?.tier1Count || 0} ข่าว
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">RSI</p>
                    <p className="text-white font-bold">+{stock.rsiScore}</p>
                    <p className="text-gray-500 text-[10px]">
                      {stock.priceData.rsi?.toFixed(0) || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Trend</p>
                    <p className="text-white font-bold">+{stock.trendScore}</p>
                    <p className="text-gray-500 text-[10px]">
                      {stock.priceData.ma50
                        ? stock.priceData.currentPrice > stock.priceData.ma50
                          ? "✅ Uptrend"
                          : "⚠️ Down"
                        : "-"}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Bullish%</p>
                    <p className="text-white font-bold">
                      +{stock.bullishScore}
                    </p>
                    <p className="text-gray-500 text-[10px]">
                      {stock.priceData.maSignal || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">MACD</p>
                    <p className="text-white font-bold">+{stock.macdScore}</p>
                    <p className="text-gray-500 text-[10px]">
                      {stock.priceData.macdTrend || "-"}
                    </p>
                  </div>
                  <div className="bg-gray-900/50 rounded-xl p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Position</p>
                    <p className="text-white font-bold">
                      +{stock.positionScore}
                    </p>
                    <p className="text-gray-500 text-[10px]">
                      {stock.positionSize}%
                    </p>
                  </div>
                </div>

                {/* Recommendation */}
                <div
                  className={`p-4 rounded-xl ${
                    stock.positionSize >= 12
                      ? "bg-green-900/30 border border-green-500/30"
                      : stock.positionSize >= 7
                        ? "bg-blue-900/30 border border-blue-500/30"
                        : stock.positionSize >= 5
                          ? "bg-yellow-900/30 border border-yellow-500/30"
                          : "bg-red-900/30 border border-red-500/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {stock.positionSize >= 12
                          ? "🚀"
                          : stock.positionSize >= 7
                            ? "💡"
                            : stock.positionSize >= 5
                              ? "⏳"
                              : "⚠️"}
                      </span>
                      <div>
                        <p className="text-white font-medium">
                          Position Sizing
                        </p>
                        <p className="text-gray-400 text-sm">
                          {stock.positionReason}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`text-3xl font-bold ${
                        stock.positionSize >= 12
                          ? "text-green-400"
                          : stock.positionSize >= 7
                            ? "text-blue-400"
                            : stock.positionSize >= 5
                              ? "text-yellow-400"
                              : "text-red-400"
                      }`}
                    >
                      {stock.positionSize}%
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Summary */}
            <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/30 p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                📋 สรุปผลการเปรียบเทียบ
              </h3>
              <div className="space-y-3">
                {rankings.slice(0, 3).map((stock) => (
                  <div
                    key={stock.symbol}
                    className="flex items-center justify-between text-gray-300"
                  >
                    <div className="flex items-center gap-3">
                      <span>{getRankIcon(stock.rank)}</span>
                      <span className="font-bold text-white">
                        {stock.symbol}
                      </span>
                      <span className="text-gray-500">→</span>
                      <span className="text-gray-400 text-sm">
                        {stock.positionReason}
                      </span>
                    </div>
                    <span
                      className={`font-bold ${getScoreColor(stock.totalScore)}`}
                    >
                      {stock.totalScore}/100
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-gray-400 text-sm">
                💡 คำแนะนำ: เข้า{" "}
                <span className="text-yellow-400 font-bold">
                  {rankings[0]?.symbol}
                </span>{" "}
                ก่อน เพราะมี Score สูงสุดและ{" "}
                {rankings[0]?.positionReason?.toLowerCase()}
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && rankings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">⚔️</p>
            <p className="text-gray-400 text-lg">
              ใส่ symbols ที่ต้องการเปรียบเทียบ แล้วกดปุ่ม
              &quot;เปรียบเทียบ&quot;
            </p>
            <p className="text-gray-500 text-sm mt-2">
              ตัวอย่าง: NVDA, TSLA, AAPL, MSFT
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";

// รายการหุ้นยอดนิยมสำหรับ autocomplete
const STOCK_LIST = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "DIS", name: "The Walt Disney Company" },
  { symbol: "COIN", name: "Coinbase Global Inc." },
  { symbol: "BA", name: "Boeing Company" },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "HD", name: "The Home Depot Inc." },
  { symbol: "BAC", name: "Bank of America Corp." },
  { symbol: "KO", name: "The Coca-Cola Company" },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "COST", name: "Costco Wholesale" },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "MRK", name: "Merck & Co. Inc." },
  { symbol: "ABBV", name: "AbbVie Inc." },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "LLY", name: "Eli Lilly and Company" },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "QCOM", name: "Qualcomm Inc." },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "SQ", name: "Block Inc. (Square)" },
  { symbol: "UBER", name: "Uber Technologies Inc." },
  { symbol: "LYFT", name: "Lyft Inc." },
  { symbol: "SHOP", name: "Shopify Inc." },
  { symbol: "SPOT", name: "Spotify Technology" },
  { symbol: "ZM", name: "Zoom Video Communications" },
  { symbol: "SNAP", name: "Snap Inc." },
  { symbol: "PINS", name: "Pinterest Inc." },
  { symbol: "RBLX", name: "Roblox Corporation" },
  { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "SOFI", name: "SoFi Technologies" },
  { symbol: "RIVN", name: "Rivian Automotive" },
  { symbol: "LCID", name: "Lucid Group Inc." },
  { symbol: "NIO", name: "NIO Inc." },
  { symbol: "LI", name: "Li Auto Inc." },
  { symbol: "XPEV", name: "XPeng Inc." },
  { symbol: "GME", name: "GameStop Corp." },
  { symbol: "AMC", name: "AMC Entertainment" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "IWM", name: "iShares Russell 2000" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "SLV", name: "iShares Silver Trust" },
  { symbol: "ARM", name: "Arm Holdings" },
  { symbol: "SMCI", name: "Super Micro Computer" },
  { symbol: "MSTR", name: "MicroStrategy Inc." },
  { symbol: "PANW", name: "Palo Alto Networks" },
  { symbol: "SNOW", name: "Snowflake Inc." },
];

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

import { PatternResult, KeyMetrics, AdvancedIndicators } from "@/types/stock";

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

// Map the top-level response from /api/patterns
interface PatternScanData {
  symbol: string;
  patterns: PatternResult[];
  matrixScore: number;
  metrics: KeyMetrics;
  advancedIndicators: AdvancedIndicators;
  finalSignal: "BUY" | "SELL" | "HOLD";
}

interface PatternDataResult {
  symbol: string;
  data: PatternScanData | null;
}

interface StockGladiator {
  symbol: string;
  priceData: StockPrice;
  socialData: InsiderSocialData | null;
  patternData: PatternScanData | null;
  // Scores (140 total max)
  trendScore: number; // max 30 (Based on Price vs MA)
  safetyScore: number; // max 20 (Based on RSI)
  rrScore: number; // max 30 (Risk/Reward)
  newsScore: number; // max 20 (Tier 1 News)
  patternScore: number; // max 40 (Matrix + Indicators)
  totalScore: number;
  // Details
  rrRatio: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  upsidePercent: number;
  riskPercent: number;
  // Rank
  rank: number;
  recommendation: string;
}

export default function ComparePage() {
  const [searchInput, setSearchInput] = useState("");
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [gladiators, setGladiators] = useState<StockGladiator[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string>("");

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter stocks based on search
  const filteredStocks = useMemo(() => {
    if (!searchInput.trim()) return STOCK_LIST.slice(0, 8);
    const query = searchInput.toUpperCase();
    return STOCK_LIST.filter(
      (stock) =>
        (stock.symbol.includes(query) ||
          stock.name.toUpperCase().includes(query)) &&
        !selectedSymbols.includes(stock.symbol),
    ).slice(0, 8);
  }, [searchInput, selectedSymbols]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredStocks.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && filteredStocks[selectedIndex]) {
        addSymbol(filteredStocks[selectedIndex].symbol);
      } else if (searchInput.trim()) {
        // Allow custom symbol
        addSymbol(searchInput.toUpperCase());
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    } else if (
      e.key === "Backspace" &&
      !searchInput &&
      selectedSymbols.length > 0
    ) {
      // Remove last symbol
      setSelectedSymbols((prev) => prev.slice(0, -1));
    }
  };

  const addSymbol = (symbol: string) => {
    if (!selectedSymbols.includes(symbol)) {
      setSelectedSymbols((prev) => [...prev, symbol]);
    }
    setSearchInput("");
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  const removeSymbol = (symbol: string) => {
    setSelectedSymbols((prev) => prev.filter((s) => s !== symbol));
  };

  // Calculate Risk/Reward Ratio
  function calculateRR(
    entry: number,
    target: number,
    stopLoss: number,
  ): number {
    const potentialProfit = target - entry;
    const potentialLoss = entry - stopLoss;
    if (potentialLoss <= 0) return 0;
    return potentialProfit / potentialLoss;
  }

  // Calculate all scores for a stock
  function calculateGladiatorScores(
    priceData: StockPrice,
    socialData: InsiderSocialData | null,
    patternData: PatternScanData | null,
  ): Omit<
    StockGladiator,
    "symbol" | "priceData" | "socialData" | "patternData" | "rank"
  > {
    // === 1. TREND SCORE (max 30) ===
    let trendScore = 0;

    if (priceData.ma200 && priceData.currentPrice > priceData.ma200) {
      trendScore += 10;
    }
    if (priceData.ma50 && priceData.currentPrice > priceData.ma50) {
      trendScore += 10;
    }
    if (
      priceData.macd !== undefined &&
      priceData.macdSignal !== undefined &&
      priceData.macd > priceData.macdSignal
    ) {
      trendScore += 10;
    }

    // === 2. SAFETY/RSI SCORE (max 20) ===
    const rsi = priceData.rsi || 50;
    let safetyScore = 0;

    if (rsi >= 40 && rsi <= 60) {
      safetyScore = 20; // Safe Zone = Perfect
    } else if (
      rsi < 30 ||
      (patternData?.metrics?.rsi && patternData.metrics.rsi < 30)
    ) {
      safetyScore = 15; // Oversold = Risky but high reward
    } else if (rsi >= 30 && rsi < 40) {
      safetyScore = 17; // Near oversold
    } else if (rsi > 60 && rsi <= 70) {
      safetyScore = 12; // Getting hot
    } else if (rsi > 70) {
      safetyScore = 5; // Overbought = Expensive
    }

    // === 3. RISK/REWARD RATIO SCORE (max 30) ===
    const entryPrice = priceData.currentPrice;

    // Prefer the strict Pattern Engine math for targets and stops if available
    let targetPrice = priceData.resistance || priceData.currentPrice * 1.15;
    let stopLoss = priceData.support || priceData.currentPrice * 0.9;

    if (patternData) {
      // Find lowest support for stop loss (strict safety)
      if (patternData.metrics?.supportLevel)
        stopLoss = patternData.metrics.supportLevel;
      if (patternData.metrics?.pivotLevels) {
        // Nearest pivot support below price
        const supports = [
          patternData.metrics.pivotLevels.s1,
          patternData.metrics.pivotLevels.s2,
          patternData.metrics.pivotLevels.s3,
        ].filter((s) => s && s < entryPrice);
        if (supports.length > 0) stopLoss = Math.max(...(supports as number[]));
      }

      // Find nearest resistance for target
      if (patternData.metrics?.resistanceLevel)
        targetPrice = patternData.metrics.resistanceLevel;
      if (patternData.metrics?.pivotLevels) {
        // Nearest pivot resistance above price
        const resistances = [
          patternData.metrics.pivotLevels.r1,
          patternData.metrics.pivotLevels.r2,
          patternData.metrics.pivotLevels.r3,
        ].filter((r) => r && r > entryPrice);
        if (resistances.length > 0)
          targetPrice = Math.min(...(resistances as number[]));
      }
    }

    const rrRatio = calculateRR(entryPrice, targetPrice, stopLoss);
    let rrScore = 0;

    if (rrRatio >= 3) {
      rrScore = 30; // Excellent
    } else if (rrRatio >= 2) {
      rrScore = 20; // Good
    } else if (rrRatio >= 1.5) {
      rrScore = 15; // Okay
    } else if (rrRatio >= 1) {
      rrScore = 10; // Break-even
    } else {
      rrScore = 0; // Not worth it
    }

    const upsidePercent = ((targetPrice - entryPrice) / entryPrice) * 100;
    const riskPercent = ((entryPrice - stopLoss) / entryPrice) * 100;

    // === 4. NEWS TIER SCORE (max 20) ===
    const tier1Count = socialData?.social?.tier1Count || 0;
    let newsScore = 0;

    if (tier1Count >= 1) {
      newsScore = 20; // Has Tier 1
    } else if (
      socialData?.social?.newsCount &&
      socialData.social.newsCount > 0
    ) {
      newsScore = 5; // Has news but no Tier 1
    }

    // === 5. PATTERN & MATRIX SCORE (max 40) ===
    let patternScore = 0;
    if (patternData) {
      // Fusion Engine Matrix Score (-100 to 100 mapped to 0 to 20)
      if (patternData.matrixScore !== undefined) {
        const mappedScore = Math.max(
          0,
          Math.min(20, (patternData.matrixScore / 100) * 10 + 10),
        );
        patternScore += mappedScore;
      }

      // Advanced Pattern Bonus (+10)
      if (patternData.patterns && patternData.patterns.length > 0) {
        // High confidence pattern (>70%)
        if (patternData.patterns.some((p) => (p.confidence || 0) >= 70)) {
          patternScore += 10;
        } else {
          patternScore += 5;
        }
      }

      // Advanced Indicators Bonus (+10)
      let indicatorCount = 0;
      if (patternData.advancedIndicators?.bollingerBands?.isSqueeze)
        indicatorCount++;
      if (patternData.advancedIndicators?.adx?.isTrending) indicatorCount++;
      if (
        patternData.advancedIndicators?.volumeProfile?.poc &&
        entryPrice > patternData.advancedIndicators.volumeProfile.poc
      )
        indicatorCount++;

      patternScore += Math.min(10, indicatorCount * 4);
    }

    // === TOTAL (max 140) ===
    const totalScore = Math.round(
      trendScore + safetyScore + rrScore + newsScore + patternScore,
    );

    // Recommendation based on score
    let recommendation = "";
    if (totalScore >= 110) {
      recommendation = "ALL IN (Sniper Pick) 🎯";
    } else if (totalScore >= 90) {
      recommendation = "ซื้อไม้ใหญ่ (High Conviction) 🔥";
    } else if (totalScore >= 70) {
      recommendation = "ทยอยซื้อได้ (Standard Buy) ✅";
    } else if (totalScore >= 50) {
      recommendation = "รอก่อนดีกว่า (Wait) ⏸️";
    } else {
      recommendation = "หนีไป! (Avoid) ❌";
    }

    return {
      trendScore,
      safetyScore,
      rrScore,
      newsScore,
      patternScore,
      totalScore,
      rrRatio,
      entryPrice,
      targetPrice,
      stopLoss,
      upsidePercent,
      riskPercent,
      recommendation,
    };
  }

  // Generate verdict based on scores
  function generateVerdict(gladiators: StockGladiator[]): string {
    if (gladiators.length < 2) return "";

    const first = gladiators[0];
    const second = gladiators[1];
    const scoreDiff = first.totalScore - second.totalScore;

    const maxScore = 140;

    // Extract dominant factors for the winner
    let winnerReason = "";
    if (first.patternScore > second.patternScore + 10) {
      winnerReason = `มีทรงกราฟสวยกว่าชัดเจน (${first.patternData?.patterns?.[0]?.name || "โครงสร้างราคาแข็งแกร่ง"})`;
    } else if (first.rrScore > second.rrScore + 10) {
      winnerReason = `อัตราส่วน Risk/Reward คุ้มเสี่ยงกว่ามาก (R/R ${first.rrRatio.toFixed(1)}x vs ${second.rrRatio.toFixed(1)}x)`;
    } else if (first.newsScore > second.newsScore + 10) {
      winnerReason = `มีข่าวระดับ Tier 1 สนับสนุนชัดเจนกว่า`;
    } else if (first.trendScore > second.trendScore + 10) {
      winnerReason = `แนวโน้มขาขึ้น (Trend) แข็งแกร่งกว่า`;
    } else {
      winnerReason = `คะแนนรวมทุกมิติ (Matrix) สมดุลและเสถียรกว่า`;
    }

    // Case: Both scores are low (< 50% of 140)
    if (first.totalScore < 70 && second.totalScore < 70) {
      return `⚠️ อย่าเพิ่งซื้อทั้งคู่! ทั้ง ${first.symbol} และ ${second.symbol} โมเมนตัมกำลังอ่อนแรงตลาดยังไม่เป็นใจ กำเงินสดรอจังหวะใหม่ดีกว่า`;
    }

    // Case: Landslide victory (>20 points)
    if (scoreDiff > 20) {
      return `🏆 ${first.symbol} ชนะขาดลอย! ${winnerReason} แนะนำให้โฟกัสที่ ${first.symbol} เป็นหลัก (น้ำหนัก 10-15% ของพอร์ต) ถ้ากราฟพร้อมให้ลุยได้เลย`;
    }

    // Case: Close match (<10 points)
    if (scoreDiff <= 10) {
      return `⚔️ สูสีมาก (ต่างกันแค่ ${scoreDiff} แต้ม)! ถ้าชอบทรงกราฟเทพๆ ให้เลือกตัวที่ Pattern สวย แต่ถ้าเน้นถือยาวให้เลือกตัวที่มีคะแนน Trend/News สูง หรือแบ่งเงิน 50/50 ก็ได้`;
    }

    // Case: Clear winner (10-20 points)
    return `✅ ${first.symbol} ดูมีภาษีดีกว่า! นำอยู่ ${scoreDiff} แต้ม โดยเฉือนชนะไปเพราะ ${winnerReason}`;
  }

  async function compareStocks() {
    if (selectedSymbols.length < 2) {
      setError("กรุณาเลือกอย่างน้อย 2 หุ้น");
      return;
    }

    setLoading(true);
    setError(null);
    setGladiators([]);
    setVerdict("");

    try {
      // Fetch price data for all symbols
      const priceRes = await fetch(
        `/api/prices?symbols=${selectedSymbols.join(",")}`,
      );
      const priceData: Record<string, StockPrice> = await priceRes.json();

      // Fetch social data for each symbol
      const socialPromises = selectedSymbols.map(async (symbol) => {
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

      // Fetch pattern data for each symbol
      const patternPromises = selectedSymbols.map(async (symbol) => {
        try {
          const res = await fetch(`/api/patterns?symbols=${symbol}`);
          if (res.ok) {
            const data = await res.json();
            // /api/patterns returns an array, so we select the first matching symbol.
            const patternMatch = data.find((p: any) => p.symbol === symbol);
            return {
              symbol,
              data: (patternMatch?.data as PatternScanData) || null,
            };
          }
        } catch {
          // Ignore errors
        }
        return { symbol, data: null };
      });

      const socialResults = await Promise.all(socialPromises);
      const patternResults = await Promise.all(patternPromises);

      const socialMap: Record<string, InsiderSocialData | null> = {};
      const patternMap: Record<string, PatternScanData | null> = {};

      socialResults.forEach((r) => {
        socialMap[r.symbol] = r.data;
      });
      patternResults.forEach((r) => {
        patternMap[r.symbol] = r.data;
      });

      // Calculate gladiator scores
      const gladiatorData: StockGladiator[] = selectedSymbols
        .filter((symbol) => priceData[symbol])
        .map((symbol) => {
          const scores = calculateGladiatorScores(
            priceData[symbol],
            socialMap[symbol],
            patternMap[symbol],
          );
          return {
            symbol,
            priceData: priceData[symbol],
            socialData: socialMap[symbol],
            patternData: patternMap[symbol],
            ...scores,
            rank: 0,
          };
        });

      // Sort by total score (descending)
      gladiatorData.sort((a, b) => b.totalScore - a.totalScore);

      // Assign ranks
      gladiatorData.forEach((g, i) => {
        g.rank = i + 1;
      });

      setGladiators(gladiatorData);
      setVerdict(generateVerdict(gladiatorData));
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการดึงข้อมูล");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getStars(score: number, max: number): string {
    const percentage = score / max;
    if (percentage >= 0.9) return "⭐⭐⭐";
    if (percentage >= 0.6) return "⭐⭐";
    if (percentage >= 0.3) return "⭐";
    return "☆";
  }

  function getRankBadge(rank: number): { icon: string; color: string } {
    if (rank === 1)
      return { icon: "🏆", color: "from-yellow-500 to-amber-600" };
    if (rank === 2) return { icon: "🥈", color: "from-gray-400 to-gray-500" };
    if (rank === 3) return { icon: "🥉", color: "from-amber-700 to-amber-800" };
    return { icon: `#${rank}`, color: "from-gray-600 to-gray-700" };
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
              <span className="text-3xl">⚔️</span>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Stock Gladiator
                </h1>
                <p className="text-gray-400 text-sm">
                  ประชันหุ้น - เลือกตัวที่คุ้มค่าที่สุด
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
        {/* Input Section with Autocomplete */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">
            🥊 เลือกคู่ต่อสู้
          </h2>

          {/* Selected Symbols Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedSymbols.map((symbol) => (
              <span
                key={symbol}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg font-bold"
              >
                {symbol}
                <button
                  onClick={() => removeSymbol(symbol)}
                  className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
            {selectedSymbols.length === 0 && (
              <span className="text-gray-500 text-sm">
                ยังไม่ได้เลือกหุ้น - พิมพ์ค้นหาด้านล่าง
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input with Autocomplete */}
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value.toUpperCase());
                  setShowSuggestions(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ชื่อหุ้น เช่น NVDA, Apple..."
                className="w-full bg-gray-900/50 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 text-lg"
                autoComplete="off"
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions && filteredStocks.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl z-20 max-h-80 overflow-y-auto"
                >
                  {filteredStocks.map((stock, index) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => addSymbol(stock.symbol)}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                        index === selectedIndex
                          ? "bg-red-600/30"
                          : "hover:bg-gray-700"
                      }`}
                    >
                      <span className="font-bold text-red-400 min-w-[60px]">
                        {stock.symbol}
                      </span>
                      <span className="text-gray-400 text-sm truncate">
                        {stock.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={compareStocks}
              disabled={loading || selectedSymbols.length < 2}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold rounded-xl hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-lg"
            >
              {loading ? "⏳ กำลังวิเคราะห์..." : "⚔️ FIGHT!"}
            </button>
          </div>

          {error && <p className="mt-3 text-red-400 text-sm">{error}</p>}

          <p className="text-gray-500 text-xs mt-3">
            💡 เลือกหุ้น 2 ตัวขึ้นไป แล้วกด FIGHT! เพื่อเปรียบเทียบ
          </p>
        </div>

        {/* Gladiators */}
        {gladiators.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">
              ⚔️ STOCK SHOWDOWN ⚔️
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {gladiators.map((g) => {
                const badge = getRankBadge(g.rank);
                return (
                  <div
                    key={g.symbol}
                    className={`bg-gray-800/70 backdrop-blur-xl rounded-2xl border-2 ${
                      g.rank === 1
                        ? "border-yellow-500/70 shadow-lg shadow-yellow-500/20"
                        : "border-gray-700/50"
                    } overflow-hidden`}
                  >
                    {/* Header */}
                    <div
                      className={`p-4 bg-gradient-to-r ${badge.color} flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{badge.icon}</span>
                        <div>
                          <h3 className="text-2xl font-bold text-white">
                            {g.symbol}
                          </h3>
                          <p className="text-white/80 text-sm">
                            {formatUSD(g.priceData.currentPrice)}
                            <span
                              className={`ml-2 ${
                                g.priceData.dayChangePercent >= 0
                                  ? "text-green-300"
                                  : "text-red-300"
                              }`}
                            >
                              {g.priceData.dayChangePercent >= 0 ? "+" : ""}
                              {g.priceData.dayChangePercent.toFixed(2)}%
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-4xl font-bold text-white">
                          {g.totalScore}
                        </p>
                        <p className="text-white/70 text-sm">/100</p>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="p-4 space-y-3">
                      {/* Trend */}
                      <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📈</span>
                          <span className="text-gray-300">Trend</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">
                            {getStars(g.trendScore, 30)}
                          </span>
                          <span className="text-white font-bold">
                            {g.trendScore}/30
                          </span>
                        </div>
                      </div>

                      {/* Safety/RSI */}
                      <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🛡️</span>
                          <span className="text-gray-300">
                            Safety (RSI {g.priceData.rsi?.toFixed(0) || "-"})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">
                            {getStars(g.safetyScore, 20)}
                          </span>
                          <span className="text-white font-bold">
                            {g.safetyScore}/20
                          </span>
                        </div>
                      </div>

                      {/* Risk/Reward */}
                      <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">⚖️</span>
                          <span className="text-gray-300">
                            R/R ({g.rrRatio.toFixed(1)}x)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">
                            {getStars(g.rrScore, 30)}
                          </span>
                          <span className="text-white font-bold">
                            {g.rrScore}/30
                          </span>
                        </div>
                      </div>

                      {/* News */}
                      <div className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📰</span>
                          <span className="text-gray-300">
                            News{" "}
                            {g.socialData?.social?.tier1Count
                              ? `(Tier 1: ${g.socialData.social.tier1Count})`
                              : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400">
                            {getStars(g.newsScore, 20)}
                          </span>
                          <span className="text-white font-bold">
                            {g.newsScore}/20
                          </span>
                        </div>
                      </div>

                      {/* Pattern & Indicators */}
                      <div className="flex flex-col gap-2 bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg">🎯</span>
                            <span className="text-gray-300">
                              Pattern Matrix
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-yellow-400">
                              {getStars(g.patternScore, 40)}
                            </span>
                            <span className="text-white font-bold">
                              {g.patternScore}/40
                            </span>
                          </div>
                        </div>
                        {g.patternData?.patterns &&
                          g.patternData.patterns.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {g.patternData.patterns.map((p, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${p.signal === "bullish" ? "bg-green-900/50 text-green-300 border border-green-700/50" : p.signal === "bearish" ? "bg-red-900/50 text-red-300 border border-red-700/50" : "bg-gray-800 text-gray-300 border border-gray-600"}`}
                                >
                                  {p.name} {p.confidence >= 70 ? "⭐" : ""}
                                </span>
                              ))}
                            </div>
                          )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {g.patternData?.advancedIndicators?.bollingerBands
                            ?.isSqueeze && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded border border-blue-700/30">
                              BB Squeeze
                            </span>
                          )}
                          {g.patternData?.advancedIndicators?.adx
                            ?.isTrending && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-orange-900/40 text-orange-300 rounded border border-orange-700/30">
                              ADX &gt; 25
                            </span>
                          )}
                          {g.patternData?.advancedIndicators?.volumeProfile
                            ?.poc &&
                            g.entryPrice >
                              g.patternData.advancedIndicators.volumeProfile
                                .poc && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/40 text-purple-300 rounded border border-purple-700/30">
                                &gt; POC
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Trading Info */}
                    <div className="p-4 border-t border-gray-700/50">
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-gray-500 text-xs">💰 ราคาเข้า</p>
                          <p className="text-white font-bold">
                            {formatUSD(g.entryPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">🚀 Upside</p>
                          <p className="text-green-400 font-bold">
                            +{g.upsidePercent.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">🛡️ Risk</p>
                          <p className="text-red-400 font-bold">
                            -{g.riskPercent.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-gray-900/50 rounded-lg text-center">
                        <p className="text-gray-400 text-xs mb-1">🎯 คำแนะนำ</p>
                        <p
                          className={`font-bold ${
                            g.totalScore >= 70
                              ? "text-green-400"
                              : g.totalScore >= 55
                                ? "text-yellow-400"
                                : "text-red-400"
                          }`}
                        >
                          {g.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Verdict */}
            {verdict && (
              <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-2xl border border-purple-500/30 p-6">
                <h3 className="text-xl font-bold text-white mb-3">
                  🧠 สรุปผลการตัดสิน
                </h3>
                <p className="text-gray-200 text-lg leading-relaxed">
                  {verdict}
                </p>
              </div>
            )}

            {/* Comparison Table */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 overflow-x-auto">
              <h3 className="text-lg font-bold text-white mb-4">
                📊 ตารางเปรียบเทียบ
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="py-2 text-left">Symbol</th>
                    <th className="py-2 text-center">Trend</th>
                    <th className="py-2 text-center">Safety</th>
                    <th className="py-2 text-center">R/R</th>
                    <th className="py-2 text-center">News</th>
                    <th className="py-2 text-center">Pattern</th>
                    <th className="py-2 text-center">Total</th>
                    <th className="py-2 text-right">Upside</th>
                  </tr>
                </thead>
                <tbody>
                  {gladiators.map((g) => (
                    <tr key={g.symbol} className="border-b border-gray-800">
                      <td className="py-3 font-bold text-white">
                        {g.rank === 1 && "🏆 "}
                        {g.symbol}
                      </td>
                      <td className="py-3 text-center text-white">
                        {g.trendScore}/30
                      </td>
                      <td className="py-3 text-center text-white">
                        {g.safetyScore}/20
                      </td>
                      <td className="py-3 text-center text-white">
                        {g.rrScore}/30
                      </td>
                      <td className="py-3 text-center text-white">
                        {g.newsScore}/20
                      </td>
                      <td className="py-3 text-center text-white">
                        {g.patternScore}/40
                      </td>
                      <td className="py-3 text-center font-bold text-yellow-400">
                        {g.totalScore}/140
                      </td>
                      <td className="py-3 text-right text-green-400">
                        +{g.upsidePercent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && gladiators.length === 0 && (
          <div className="text-center py-20">
            <p className="text-6xl mb-4">⚔️</p>
            <p className="text-gray-400 text-lg">
              เลือกหุ้นที่ต้องการประชัน แล้วกด FIGHT!
            </p>
            <p className="text-gray-500 text-sm mt-2">
              พิมพ์ชื่อหุ้นในช่องค้นหา เช่น NVDA, TSLA, AAPL
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

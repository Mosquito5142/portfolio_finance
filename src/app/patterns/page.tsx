"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { UNIQUE_SYMBOLS, isTier1, isTier2 } from "@/lib/stocks";

// Types
interface PatternResult {
  name: string;
  type: "reversal" | "continuation";
  signal: "bullish" | "bearish" | "neutral";
  status?: "forming" | "ready" | "confirmed";
  confidence: number;
  description: string;
  entryZone?: { low: number; high: number };
  breakoutLevel?: number;
  distanceToBreakout?: number;
  targetPrice?: number;
  stopLoss?: number;
}

interface TrendAnalysis {
  shortTerm: "up" | "down" | "sideways";
  longTerm: "up" | "down" | "sideways";
  sma20: number;
  sma50: number;
  currentPrice: number;
  strength: number;
}

interface PivotLevels {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

interface FibonacciLevels {
  swingHigh: number;
  swingLow: number;
  fib236: number;
  fib382: number;
  fib500: number;
  fib618: number;
  fib786: number;
}

interface KeyMetrics {
  rsi: number;
  rsiStatus: "oversold" | "normal" | "overbought";
  volumeChange: number;
  volumeStatus: "weak" | "normal" | "strong";
  sma200: number;
  aboveSma200: boolean;
  week52High: number;
  week52Low: number;
  distanceFrom52High: number;
  distanceFrom52Low: number;
  score3Pillars: number;
  pillarTrend: boolean;
  pillarValue: boolean;
  pillarMomentum: boolean;
  supportLevel: number;
  resistanceLevel: number;
  sma50Role: "support" | "resistance";
  sma20Role: "support" | "resistance";
  rrRatio?: number;
  rrStatus?: "excellent" | "good" | "risky" | "bad";
  pivotLevels: PivotLevels;
  fibLevels: FibonacciLevels;
  confluenceZones: string[];
}

// Advanced Indicator Types
interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
  trend: "bullish" | "bearish" | "neutral";
  histogramTrend: "expanding" | "contracting" | "flat";
  lossOfMomentum: boolean;
}

interface OBVResult {
  obv: number;
  obvTrend: "up" | "down" | "flat";
  obvDivergence: "bullish" | "bearish" | "none";
}

interface DivergenceResult {
  type: "bullish" | "bearish" | "none";
  indicator: string;
  description: string;
  severity: "strong" | "moderate" | "weak";
}

interface IndicatorMatrixItem {
  signal: "bullish" | "bearish" | "neutral";
  weight: number;
  score: number;
}

interface IndicatorMatrix {
  dowTheory: IndicatorMatrixItem;
  rsi: IndicatorMatrixItem;
  macd: IndicatorMatrixItem;
  volume: IndicatorMatrixItem;
  candle?: IndicatorMatrixItem;
  totalScore: number;
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
}

interface CandlePattern {
  name: string;
  signal: "bullish" | "neutral";
  confidence: number;
}

interface AdvancedIndicators {
  macd: MACDResult;
  obv: OBVResult;
  divergences: DivergenceResult[];
  trendPhase:
    | "accumulation"
    | "participation"
    | "distribution"
    | "markdown"
    | "unknown";
  indicatorMatrix: IndicatorMatrix;
  volumeConfirmation: boolean;
  rsiInterpretation: string;
  // NEW: Sniper Bot v3 Features
  candlePattern: CandlePattern;
  atr: number;
  marketContext: {
    vixValue: number;
    qqqTrend: "bullish" | "bearish" | "neutral";
    marketTemperature: "hot" | "normal" | "cold";
  };
  daysToEarnings?: number;
  // Anti-Knife-Catching v3.2
  ema5: number;
  isPriceStabilized: boolean;
  isMomentumReturning: boolean;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  atrMultiplier: number;
}

interface PatternResponse {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  patterns: PatternResult[];
  trend: TrendAnalysis;
  overallSignal: "BUY" | "SELL" | "HOLD";
  signalStrength: number;
  entryStatus?: "ready" | "wait" | "late";
  metrics?: KeyMetrics;
  advancedIndicators?: AdvancedIndicators;
  error?: string;
}

interface StockScan {
  symbol: string;
  data: PatternResponse | null;
  status: "pending" | "loading" | "done" | "error";
}

// Stocks are now imported from @/lib/stocks

export default function PatternScreenerPage() {
  const [scans, setScans] = useState<StockScan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filterSignal, setFilterSignal] = useState<
    "ALL" | "BUY" | "SELL" | "HOLD"
  >("ALL");
  const [mounted, setMounted] = useState(false);
  // NEW: Scan Mode - Trend Following vs Value Hunting vs Sniper Trading
  const [scanMode, setScanMode] = useState<"trend" | "value" | "sniper">(
    "value",
  );

  useEffect(() => {
    setMounted(true);
    // Initialize scans with imported symbols
    const initialScans: StockScan[] = UNIQUE_SYMBOLS.map((symbol) => ({
      symbol,
      data: null,
      status: "pending",
    }));
    setScans(initialScans);
  }, []);

  const startScan = async () => {
    setScanning(true);
    setScanProgress(0);

    // Reset status to pending/loading
    setScans((prev) => prev.map((s) => ({ ...s, status: "pending" })));

    // Scan each stock with delay to avoid rate limiting
    for (let i = 0; i < UNIQUE_SYMBOLS.length; i++) {
      const symbol = UNIQUE_SYMBOLS[i];

      // Update status to loading
      setScans((prev) =>
        prev.map((s) =>
          s.symbol === symbol ? { ...s, status: "loading" } : s,
        ),
      );

      try {
        const response = await fetch(`/api/patterns?symbol=${symbol}`);
        const data = await response.json();

        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol
              ? {
                  ...s,
                  data: data.currentPrice > 0 ? data : null,
                  status: "done",
                }
              : s,
          ),
        );
      } catch {
        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol ? { ...s, status: "error" } : s,
          ),
        );
      }

      setScanProgress(((i + 1) / UNIQUE_SYMBOLS.length) * 100);

      // Small delay between requests
      if (i < UNIQUE_SYMBOLS.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    setScanning(false);
  };

  // Filter and sort results based on mode
  const filteredScans = scans
    .filter((s) => s.status === "done" && s.data)
    .filter(
      (s) => filterSignal === "ALL" || s.data?.overallSignal === filterSignal,
    )
    .sort((a, b) => {
      if (scanMode === "value") {
        // VALUE HUNTING: Prioritize low RSI (oversold) = buying opportunity
        const aRSI = a.data?.metrics?.rsi ?? 100;
        const bRSI = b.data?.metrics?.rsi ?? 100;
        // Lower RSI = better opportunity
        return aRSI - bRSI;
      } else if (scanMode === "sniper") {
        // SNIPER TRADING: Prioritize stocks closest to support level (%)
        const aPrice = a.data?.currentPrice || 0;
        const aSupport = a.data?.metrics?.supportLevel || 0;
        const aDist = aSupport > 0 ? Math.abs(aPrice - aSupport) / aSupport : 1;

        const bPrice = b.data?.currentPrice || 0;
        const bSupport = b.data?.metrics?.supportLevel || 0;
        const bDist = bSupport > 0 ? Math.abs(bPrice - bSupport) / bSupport : 1;

        return aDist - bDist; // Lower distance first
      } else {
        // TREND FOLLOWING: Sort by signal: BUY first, then by strength
        const signalOrder = { BUY: 0, SELL: 1, HOLD: 2 };
        const aOrder = signalOrder[a.data?.overallSignal || "HOLD"];
        const bOrder = signalOrder[b.data?.overallSignal || "HOLD"];
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (b.data?.signalStrength || 0) - (a.data?.signalStrength || 0);
      }
    });

  // ========== TOP PICKS LOGIC (Mode-Specific Filtering) ==========
  const topPicks = scans
    .filter((s) => s.status === "done" && s.data)
    // 🎯 MODE-SPECIFIC FILTER: ตัดตัวที่ไม่เข้าเกณฑ์ของโหมดทิ้ง
    .filter((s) => {
      const data = s.data!;
      const rsi = data.metrics?.rsi || 50;

      if (scanMode === "sniper") {
        // 🔫 Sniper: ห้าม Overbought, ห้าม Breakout, ต้องยืนเหนือ EMA5
        const isNotOverbought = rsi <= 65;
        const isNotBreakout = !data.patterns?.some((p) =>
          p.name.toLowerCase().includes("breakout"),
        );
        const isNotLate = data.entryStatus !== "late";
        const isStabilized =
          data.advancedIndicators?.isPriceStabilized !== false;
        return isNotOverbought && isNotBreakout && isNotLate && isStabilized;
      } else if (scanMode === "trend") {
        // 📈 Trend Following: ต้องเป็นขาขึ้น + score เป็นบวก
        const isUptrend = data.currentPrice > (data.trend?.sma50 || 0);
        const hasPositiveScore =
          (data.advancedIndicators?.indicatorMatrix?.totalScore || 0) > 0;
        return isUptrend && hasPositiveScore;
      }
      // value mode: ไม่กรองเพิ่ม
      return true;
    })
    .map((s) => {
      const data = s.data!;
      const matrixScore =
        data.advancedIndicators?.indicatorMatrix.totalScore || 0;
      const rsi = data.metrics?.rsi || 50;
      const support = data.metrics?.supportLevel || 0;
      const distanceToSupport =
        support > 0 ? (data.currentPrice - support) / support : 1;

      // Calculate a "Ranking Score"
      let rankingScore = 0;
      if (scanMode === "value") {
        rankingScore = 100 - rsi + matrixScore / 2;
      } else if (scanMode === "sniper") {
        // Sniper: ยิ่งใกล้แนวรับยิ่งดี + candle confirmation boost
        const absDist = Math.abs(distanceToSupport);
        rankingScore = (1 - absDist) * 100 + matrixScore / 4;

        // 🕯️ SNIPER BOOST: Bullish Candle at Support = SUPER BUY
        if (
          data.advancedIndicators?.candlePattern &&
          data.advancedIndicators.candlePattern.signal === "bullish"
        ) {
          rankingScore += 30;
        }
      } else {
        // Trend: คะแนน Matrix + ความแข็งแกร่ง
        rankingScore = matrixScore + data.signalStrength;
      }

      return { ...s, rankingScore, distanceToSupport };
    })
    .sort((a, b) => {
      if (scanMode === "sniper") {
        // Sniper: เรียงจาก "ใกล้แนวรับที่สุด" ก่อน
        return Math.abs(a.distanceToSupport) - Math.abs(b.distanceToSupport);
      }
      // Value/Trend: เรียงจาก ranking score สูงสุด
      return b.rankingScore - a.rankingScore;
    })
    .slice(0, 5);

  const copyTopPicksToClipboard = () => {
    if (topPicks.length === 0) return;

    const date = new Date().toLocaleDateString("th-TH");
    const modeLabel =
      scanMode === "value"
        ? "Value Hunting"
        : scanMode === "sniper"
          ? "Sniper Trading"
          : "Trend Following";

    let text = `🚀 TOP PICKS TODAY (${date}) - Mode: ${modeLabel}\n`;
    text += `--------------------------------------------------\n`;

    topPicks.forEach((pick, index) => {
      const data = pick.data!;
      const support = data.metrics?.supportLevel || 0;
      const resistance = data.metrics?.resistanceLevel || 0;

      // Use ATR-based Cut Loss for Sniper Bot precision
      const atr = data.advancedIndicators?.atr || 0;
      const cutLoss =
        atr > 0
          ? data.currentPrice - 1.5 * atr
          : support > 0
            ? support * 0.97
            : data.currentPrice * 0.95;

      const candle =
        data.advancedIndicators?.candlePattern?.name !== "None"
          ? ` (🕯️ ${data.advancedIndicators?.candlePattern?.name})`
          : "";

      text += `${index + 1}. ${pick.symbol} (${data.overallSignal})${candle}\n`;
      text += `   💰 รับ (Entry): $${support.toFixed(2)}\n`;
      text += `   🛑 คัด (Cut): $${cutLoss.toFixed(2)}\n`;
      text += `   🎯 เป้า (Target): $${resistance.toFixed(2)}\n`;
      text += `   📝 Note: ${data.advancedIndicators?.rsiInterpretation || ""}\n`;
      text += `--------------------------------------------------\n`;
    });

    navigator.clipboard.writeText(text);
    alert("คัดลองโพยลง Clipboard เรียบร้อยแล้ว! 📋");
  };

  // ========== SEND TO GOOGLE SHEET ==========
  const [sendingToSheet, setSendingToSheet] = useState(false);
  const [sheetMessage, setSheetMessage] = useState("");

  const sendToGoogleSheet = async () => {
    // 🔥 ส่งเฉพาะตัวที่ผ่านเกณฑ์ของโหมดปัจจุบัน
    const modeLabel =
      scanMode === "value"
        ? "Value Hunting"
        : scanMode === "sniper"
          ? "Sniper Trading"
          : "Trend Following";

    const candidates = scans
      .filter((s) => s.status === "done" && s.data)
      .filter((s) => {
        const data = s.data!;
        const support = data.metrics?.supportLevel || 0;
        const price = data.currentPrice || 0;
        const rsi = data.metrics?.rsi || 50;
        if (support <= 0) return false;

        // 1. สัญญาณต้องเป็น BUY หรือ HOLD ที่มี matrix score > 0
        const isBuySignal = data.overallSignal === "BUY";
        const isStrongHold =
          data.overallSignal === "HOLD" &&
          (data.advancedIndicators?.indicatorMatrix?.totalScore ?? 0) > 0;
        if (!(isBuySignal || isStrongHold)) return false;

        // 2. ราคาต้องยืนเหนือ EMA5 (ห้ามรับมีด!)
        if (data.advancedIndicators?.isPriceStabilized === false) return false;

        // 3. ราคาต้องไม่หลุดแนวรับเกิน 2%
        if (price < support * 0.98) return false;

        // 🎯 4. MODE-SPECIFIC FILTER
        if (scanMode === "sniper") {
          if (rsi > 65) return false;
          if (
            data.patterns?.some((p) =>
              p.name.toLowerCase().includes("breakout"),
            )
          )
            return false;
          if (data.entryStatus === "late") return false;
        } else if (scanMode === "trend") {
          if (price <= (data.trend?.sma50 || 0)) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (scanMode === "sniper") {
          const aS = a.data?.metrics?.supportLevel || 0;
          const bS = b.data?.metrics?.supportLevel || 0;
          const aD =
            aS > 0 ? Math.abs((a.data?.currentPrice || 0) - aS) / aS : 1;
          const bD =
            bS > 0 ? Math.abs((b.data?.currentPrice || 0) - bS) / bS : 1;
          return aD - bD;
        }
        return (
          (b.data?.advancedIndicators?.indicatorMatrix?.totalScore ?? 0) -
          (a.data?.advancedIndicators?.indicatorMatrix?.totalScore ?? 0)
        );
      })
      .slice(0, 10)
      .map((s) => ({
        ticker: s.symbol,
        entry: Number((s.data?.metrics?.supportLevel || 0).toFixed(2)),
        cut: Number(
          (
            s.data?.advancedIndicators?.suggestedStopLoss ||
            (s.data?.currentPrice || 0) * 0.95
          ).toFixed(2),
        ),
        target: Number(
          (
            s.data?.advancedIndicators?.suggestedTakeProfit ||
            (s.data?.currentPrice || 0) * 1.1
          ).toFixed(2),
        ),
      }));

    // 🔄 รวบรวมตัวอื่นที่สแกนแล้ว → อัปเดตราคาใน Sheet ให้ทุกตัวที่มีอยู่แล้ว
    const candidateTickers = new Set(candidates.map((c) => c.ticker));
    const priceUpdates = scans
      .filter(
        (s) =>
          s.status === "done" &&
          s.data &&
          s.data.currentPrice > 0 &&
          !candidateTickers.has(s.symbol),
      )
      .map((s) => ({
        ticker: s.symbol,
        entry: Number(
          (s.data?.metrics?.supportLevel || s.data?.currentPrice || 0).toFixed(
            2,
          ),
        ),
        cut: Number(
          (
            s.data?.advancedIndicators?.suggestedStopLoss ||
            (s.data?.currentPrice || 0) * 0.95
          ).toFixed(2),
        ),
        target: Number(
          (
            s.data?.advancedIndicators?.suggestedTakeProfit ||
            (s.data?.currentPrice || 0) * 1.1
          ).toFixed(2),
        ),
      }));

    // รวม: ตัวแนะนำ (ใหม่) + ตัวอัปเดตราคา (เดิม)
    const allItems = [...candidates, ...priceUpdates];

    if (allItems.length === 0) {
      setSheetMessage(`❌ ไม่มีข้อมูลจากการสแกนรอบนี้`);
      setTimeout(() => setSheetMessage(""), 3000);
      return;
    }

    setSendingToSheet(true);
    setSheetMessage("");

    try {
      const res = await fetch("/api/sheets/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: allItems }),
      });

      const result = await res.json();

      if (res.ok) {
        setSheetMessage(
          `✅ ส่ง ${candidates.length} ตัวแนะนำ + อัปเดต ${priceUpdates.length} ตัวเดิม`,
        );
      } else {
        setSheetMessage(`❌ ${result.error || "เกิดข้อผิดพลาด"}`);
      }
    } catch {
      setSheetMessage("❌ ไม่สามารถเชื่อมต่อกับ Google Sheet ได้");
    }

    setSendingToSheet(false);
    setTimeout(() => setSheetMessage(""), 5000);
  };

  const buyCount = scans.filter((s) => s.data?.overallSignal === "BUY").length;

  const sellCount = scans.filter(
    (s) => s.data?.overallSignal === "SELL",
  ).length;
  const holdCount = scans.filter(
    (s) => s.data?.overallSignal === "HOLD",
  ).length;
  // NEW: Count of oversold stocks (Value Hunting targets)
  const oversoldGemsCount = scans.filter(
    (s) => s.data?.metrics?.rsi !== undefined && s.data.metrics.rsi < 35,
  ).length;

  // NEW: Count of stocks near support (Sniper Trading targets)
  const sniperGemsCount = scans.filter((s) => {
    if (!s.data?.metrics?.supportLevel) return false;
    const dist =
      Math.abs(s.data.currentPrice - s.data.metrics.supportLevel) /
      s.data.metrics.supportLevel;
    return dist < 0.02; // Within 2% of support
  }).length;

  const formatUSD = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "-";
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-purple-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <div>
                <h1 className="text-xl font-bold text-purple-400">
                  PATTERN SCREENER
                </h1>
                <p className="text-gray-500 text-xs">
                  สแกนหุ้นหน้าซื้อ / หน้าขาย
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/search"
                className="text-gray-400 hover:text-purple-400 text-sm"
              >
                🔍 Search
              </Link>
              <Link
                href="/gold"
                className="text-gray-400 hover:text-yellow-400 text-sm"
              >
                🟡 Gold
              </Link>
              <Link href="/" className="text-gray-400 hover:text-white text-sm">
                ← กลับ
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Market Context HUD */}
        {scans.length > 0 && !scanning && (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {/* VIX / Market Temperature */}
            <div
              className={`flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-xl border ${
                scans[0]?.data?.advancedIndicators?.marketContext
                  .marketTemperature === "hot"
                  ? "bg-red-900/30 border-red-500/50"
                  : scans[0]?.data?.advancedIndicators?.marketContext
                        .marketTemperature === "cold"
                    ? "bg-green-900/30 border-green-500/50"
                    : "bg-gray-800/50 border-gray-700/50"
              }`}
            >
              <div>
                <p className="text-gray-500 text-xs">🌡️ Market Temp (VIX)</p>
                <p className="text-white font-bold">
                  {scans[0]?.data?.advancedIndicators?.marketContext
                    .marketTemperature === "hot"
                    ? "🔥 HOT (High Risk)"
                    : scans[0]?.data?.advancedIndicators?.marketContext
                          .marketTemperature === "cold"
                      ? "❄️ COLD (Safe)"
                      : "🟢 NORMAL"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">VIX Value</p>
                <p className="text-white font-mono">
                  {scans[0]?.data?.advancedIndicators?.marketContext.vixValue.toFixed(
                    2,
                  )}
                </p>
              </div>
            </div>

            {/* QQQ Trend */}
            <div
              className={`flex-1 min-w-[200px] flex items-center justify-between p-4 rounded-xl border ${
                scans[0]?.data?.advancedIndicators?.marketContext.qqqTrend ===
                "bullish"
                  ? "bg-green-900/30 border-green-500/50"
                  : scans[0]?.data?.advancedIndicators?.marketContext
                        .qqqTrend === "bearish"
                    ? "bg-red-900/30 border-red-500/50"
                    : "bg-gray-800/50 border-gray-700/50"
              }`}
            >
              <div>
                <p className="text-gray-500 text-xs">🛸 QQQ Direction</p>
                <p className="text-white font-bold">
                  {scans[0]?.data?.advancedIndicators?.marketContext
                    .qqqTrend === "bullish"
                    ? "📈 BULLISH"
                    : scans[0]?.data?.advancedIndicators?.marketContext
                          .qqqTrend === "bearish"
                      ? "📉 BEARISH"
                      : "➡️ NEUTRAL"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-4xl opacity-20">📊</span>
              </div>
            </div>
          </div>
        )}

        {/* Scan Controls */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-white font-bold text-lg">🔍 Mass Scan</h2>
              <p className="text-gray-500 text-sm">
                สแกน {UNIQUE_SYMBOLS.length} หุ้น (Tech, AI, Energy, Consumer,
                Healthcare, Utilities)
                {scanMode === "value"
                  ? " - หาของดีราคาถูก (Value Hunting)"
                  : scanMode === "sniper"
                    ? " - จ่อแนวรับที่สุด (Sniper Trading)"
                    : " - ตามเทรนด์ (Trend Following)"}
              </p>
            </div>
            <button
              onClick={startScan}
              disabled={scanning}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
                scanning
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white"
              }`}
            >
              {scanning
                ? `กำลังสแกน... ${scanProgress.toFixed(0)}%`
                : "🚀 เริ่มสแกน"}
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setScanMode("value")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                scanMode === "value"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              💎 Value Hunting
            </button>
            <button
              onClick={() => setScanMode("trend")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                scanMode === "trend"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              📈 Trend Following
            </button>
            <button
              onClick={() => setScanMode("sniper")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                scanMode === "sniper"
                  ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              🎯 Sniper Trading
            </button>
          </div>

          {/* Mode Explanation */}
          <div
            className={`mt-3 p-3 rounded-lg text-sm ${
              scanMode === "value"
                ? "bg-green-900/30 border border-green-700/50"
                : "bg-blue-900/30 border border-blue-700/50"
            }`}
          >
            {scanMode === "value" ? (
              <div className="text-green-300">
                <span className="font-bold">💎 Value Hunting Mode:</span>{" "}
                มองหาหุ้นที่ RSI ต่ำ (Oversold) + พื้นฐานดี = โอกาสซื้อ!
                <br />
                <span className="text-green-400/70 text-xs">
                  หุ้นที่ตกแรงแต่พื้นฐานดี คือโอกาสทอง - "SELL" อาจแปลว่า
                  "Sale!"
                </span>
              </div>
            ) : scanMode === "trend" ? (
              <div className="text-blue-300">
                <span className="font-bold">📈 Trend Following Mode:</span>{" "}
                ติดตามแนวโน้ม - BUY เมื่อขาขึ้น, SELL เมื่อขาลง
                <br />
                <span className="text-blue-400/70 text-xs">
                  ซื้อตามเทรนด์ ระวัง RSI สูง = อาจซื้อที่ดอย
                </span>
              </div>
            ) : (
              <div className="text-red-300">
                <span className="font-bold">🎯 Sniper Trading Mode:</span>{" "}
                เน้นเข้าซื้อที่แนวรับ + ต้องมีสัญญาณกลับตัว (Candle)
                <br />
                <span className="text-red-400/70 text-xs">
                  สแกนหา Hammer 🕯️ ณ แนวรับ เพื่อความแม่นยำสูงสุด
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {scanning && (
            <div className="mt-4">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {scans.map((scan) => (
                  <div
                    key={scan.symbol}
                    className={`px-2 py-1 rounded text-xs ${
                      scan.status === "loading"
                        ? "bg-purple-600/50 text-purple-300 animate-pulse"
                        : scan.status === "done"
                          ? scan.data?.overallSignal === "BUY"
                            ? "bg-green-600/30 text-green-400"
                            : scan.data?.overallSignal === "SELL"
                              ? "bg-red-600/30 text-red-400"
                              : "bg-gray-600/30 text-gray-400"
                          : scan.status === "error"
                            ? "bg-red-600/30 text-red-400"
                            : "bg-gray-700 text-gray-500"
                    }`}
                  >
                    {scan.symbol}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TOP PICKS HERO SECTION */}
        {scans.length > 0 && !scanning && topPicks.length > 0 && (
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-2xl border border-purple-500/30 p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl">
              🚀
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  🚀 TOP PICKS TODAY
                  <span
                    className={`text-xs font-normal px-2 py-1 rounded-lg ${
                      scanMode === "value"
                        ? "bg-green-600"
                        : scanMode === "sniper"
                          ? "bg-red-600"
                          : "bg-purple-600"
                    }`}
                  >
                    {scanMode === "value"
                      ? "Value Hunting"
                      : scanMode === "sniper"
                        ? "Sniper Trading"
                        : "Trend Following"}
                  </span>
                </h2>
                <p className="text-purple-300/70 text-sm mt-1">
                  หุ้นที่คะแนนดีที่สุด 5 อันดับแรก พร้อมแผนการเล่นรายวัน
                </p>
              </div>
              <button
                onClick={copyTopPicksToClipboard}
                className="bg-white hover:bg-gray-100 text-purple-900 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg"
              >
                📋 Copy ทั้งหมด
              </button>
              <button
                onClick={sendToGoogleSheet}
                disabled={sendingToSheet}
                className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg ${
                  sendingToSheet
                    ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-400 text-white"
                }`}
              >
                {sendingToSheet ? "⏳ กำลังส่ง..." : "📤 ส่งเข้า Sheet"}
              </button>
            </div>
            {sheetMessage && (
              <div
                className={`mt-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  sheetMessage.startsWith("✅")
                    ? "bg-green-900/40 text-green-300 border border-green-500/30"
                    : "bg-red-900/40 text-red-300 border border-red-500/30"
                }`}
              >
                {sheetMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
              {topPicks.map((pick, idx) => {
                const data = pick.data!;
                const support = data.metrics?.supportLevel || 0;
                const resistance = data.metrics?.resistanceLevel || 0;
                // Use dynamic ATR-based stop loss from Anti-Knife-Catching v3.2
                const cutLoss =
                  data.advancedIndicators?.suggestedStopLoss ||
                  (support > 0 ? support * 0.97 : data.currentPrice * 0.95);

                return (
                  <div
                    key={pick.symbol}
                    className="bg-gray-900/60 backdrop-blur-md rounded-xl p-4 border border-white/10 hover:border-purple-400/50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-purple-400 font-bold text-lg">
                        {pick.symbol}
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">💰 รับ (Entry)</span>
                        <span className="text-green-400 font-bold">
                          ${support.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400">🛑 คัด (Cut)</span>
                        <span className="text-red-400 font-bold">
                          ${cutLoss.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                        <span className="text-gray-400">🎯 เป้า (Target)</span>
                        <span className="text-blue-400 font-bold">
                          ${resistance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
                      {/* Pivot Points */}
                      {data.metrics?.pivotLevels && (
                        <div className="space-y-1">
                          <div className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">
                            📐 Pivot
                          </div>
                          <div className="grid grid-cols-3 gap-1 text-[9px]">
                            <div className="text-center">
                              <span className="text-red-400">S1</span>
                              <div className="text-gray-300 font-mono">
                                ${data.metrics.pivotLevels.s1.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-yellow-400">P</span>
                              <div className="text-gray-300 font-mono">
                                ${data.metrics.pivotLevels.pivot.toFixed(2)}
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="text-green-400">R1</span>
                              <div className="text-gray-300 font-mono">
                                ${data.metrics.pivotLevels.r1.toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Fibonacci */}
                      {data.metrics?.fibLevels && (
                        <div className="space-y-1">
                          <div className="text-[9px] text-amber-400/80 font-bold uppercase tracking-wider">
                            🌀 Fibonacci
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-gray-500">61.8%</span>
                            <span className="text-amber-300 font-mono">
                              ${data.metrics.fibLevels.fib618.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-gray-500">38.2%</span>
                            <span className="text-amber-300 font-mono">
                              ${data.metrics.fibLevels.fib382.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                      {/* Confluence */}
                      {data.metrics?.confluenceZones &&
                        data.metrics.confluenceZones.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {data.metrics.confluenceZones
                              .slice(0, 2)
                              .map((z, i) => (
                                <span
                                  key={i}
                                  className="text-[8px] px-1.5 py-0.5 bg-amber-600/30 text-amber-200 rounded-full border border-amber-500/30"
                                >
                                  {z}
                                </span>
                              ))}
                          </div>
                        )}
                      <div className="text-[10px] text-purple-300 line-clamp-2">
                        {data.advancedIndicators?.rsiInterpretation}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Results Summary */}
        {scans.length > 0 && !scanning && (
          <div
            className={`grid gap-4 ${scanMode === "value" ? "grid-cols-5" : "grid-cols-4"}`}
          >
            <button
              onClick={() => setFilterSignal("ALL")}
              className={`p-4 rounded-xl border transition-all ${
                filterSignal === "ALL"
                  ? "bg-purple-900/50 border-purple-500"
                  : "bg-gray-800/50 border-gray-700/50 hover:border-purple-500/50"
              }`}
            >
              <p className="text-gray-500 text-xs">ทั้งหมด</p>
              <p className="text-2xl font-bold text-white">
                {scans.filter((s) => s.data).length}
              </p>
            </button>

            {/* Value Hunting Mode: Show Oversold Gems first */}
            {scanMode === "value" && (
              <button
                onClick={() => setFilterSignal("ALL")} // Will be sorted by RSI anyway
                className="p-4 rounded-xl border transition-all bg-gradient-to-br from-green-900/50 to-emerald-900/50 border-green-500 animate-pulse"
              >
                <p className="text-green-300 text-xs font-medium">
                  💎 Oversold Gems
                </p>
                <p className="text-2xl font-bold text-green-400">
                  {oversoldGemsCount}
                </p>
                <p className="text-green-400/60 text-xs">RSI &lt; 35</p>
              </button>
            )}

            {/* Sniper Trading Mode: Show Sniper Opportunities first */}
            {scanMode === "sniper" && (
              <button
                onClick={() => setFilterSignal("ALL")}
                className="p-4 rounded-xl border transition-all bg-gradient-to-br from-red-900/50 to-rose-900/50 border-red-500 animate-pulse"
              >
                <p className="text-red-300 text-xs font-medium">
                  🎯 Sniper Opportunities
                </p>
                <p className="text-2xl font-bold text-red-400">
                  {sniperGemsCount}
                </p>
                <p className="text-red-400/60 text-xs">จ่อแนวรับ (&lt; 2%)</p>
              </button>
            )}

            <button
              onClick={() => setFilterSignal("BUY")}
              className={`p-4 rounded-xl border transition-all ${
                filterSignal === "BUY"
                  ? "bg-green-900/50 border-green-500"
                  : "bg-gray-800/50 border-gray-700/50 hover:border-green-500/50"
              }`}
            >
              <p className="text-gray-500 text-xs">🟢 หน้าซื้อ</p>
              <p className="text-2xl font-bold text-green-400">{buyCount}</p>
            </button>
            <button
              onClick={() => setFilterSignal("SELL")}
              className={`p-4 rounded-xl border transition-all ${
                filterSignal === "SELL"
                  ? "bg-red-900/50 border-red-500"
                  : "bg-gray-800/50 border-gray-700/50 hover:border-red-500/50"
              }`}
            >
              <p className="text-gray-500 text-xs">
                {scanMode === "value" ? "🔴 โอกาสซื้อ?" : "🔴 หน้าขาย"}
              </p>
              <p className="text-2xl font-bold text-red-400">{sellCount}</p>
            </button>
            <button
              onClick={() => setFilterSignal("HOLD")}
              className={`p-4 rounded-xl border transition-all ${
                filterSignal === "HOLD"
                  ? "bg-yellow-900/50 border-yellow-500"
                  : "bg-gray-800/50 border-gray-700/50 hover:border-yellow-500/50"
              }`}
            >
              <p className="text-gray-500 text-xs">🟡 รอดู</p>
              <p className="text-2xl font-bold text-yellow-400">{holdCount}</p>
            </button>
          </div>
        )}

        {/* Stock List */}
        {filteredScans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">
              📋 รายการหุ้น ({filteredScans.length})
            </h2>

            {filteredScans.map((scan) => (
              <div
                key={scan.symbol}
                className={`bg-gray-800/50 rounded-2xl border p-5 ${
                  scan.data?.overallSignal === "BUY"
                    ? "border-green-500/40"
                    : scan.data?.overallSignal === "SELL"
                      ? "border-red-500/40"
                      : "border-gray-700/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* Left: Stock Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                        scan.data?.overallSignal === "BUY"
                          ? "bg-green-900/50"
                          : scan.data?.overallSignal === "SELL"
                            ? "bg-red-900/50"
                            : "bg-yellow-900/50"
                      }`}
                    >
                      {scan.data?.overallSignal === "BUY"
                        ? "🟢"
                        : scan.data?.overallSignal === "SELL"
                          ? "🔴"
                          : "🟡"}
                    </div>
                    <div>
                      <Link
                        href={`/search?symbol=${scan.symbol}`}
                        className="text-white font-bold text-xl hover:text-purple-400 transition-colors"
                      >
                        {scan.symbol}
                      </Link>
                      {/* Value Hunter Badge for Oversold Stocks */}
                      {scanMode === "value" &&
                        scan.data?.metrics?.rsi !== undefined &&
                        scan.data.metrics.rsi < 35 && (
                          <span className="ml-2 px-2 py-0.5 bg-green-600/50 text-green-300 text-xs rounded-full animate-pulse">
                            💎 Oversold!
                          </span>
                        )}
                      {/* Value Mode: Invert interpretation hint */}
                      {scanMode === "value" &&
                        scan.data?.overallSignal === "SELL" &&
                        scan.data?.metrics?.rsi !== undefined &&
                        scan.data.metrics.rsi < 40 && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-600/40 text-emerald-300 text-xs rounded-full">
                            🏷️ Sale!
                          </span>
                        )}
                      {/* Tier Badge - Show risk level */}
                      {isTier1(scan.symbol) && (
                        <span className="ml-2 px-2 py-0.5 bg-blue-600/40 text-blue-300 text-xs rounded-full">
                          🏆 T1
                        </span>
                      )}
                      {isTier2(scan.symbol) && (
                        <span className="ml-2 px-2 py-0.5 bg-orange-600/40 text-orange-300 text-xs rounded-full">
                          🎢 T2
                        </span>
                      )}

                      {/* Earnings Warning Badge */}
                      {scan.data?.advancedIndicators?.daysToEarnings !==
                        undefined &&
                        scan.data.advancedIndicators.daysToEarnings <= 3 &&
                        scan.data.advancedIndicators.daysToEarnings >= 0 && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-600/50 text-yellow-200 text-xs rounded-full border border-yellow-500/50">
                            ⚠️ Earnings in{" "}
                            {scan.data.advancedIndicators.daysToEarnings}d
                          </span>
                        )}
                      {/* Sniper Zone Badge */}
                      {scan.data?.metrics?.supportLevel &&
                        Math.abs(
                          scan.data.currentPrice -
                            scan.data.metrics.supportLevel,
                        ) /
                          scan.data.metrics.supportLevel <
                          0.02 && (
                          <span className="ml-2 px-2 py-0.5 bg-red-600/50 text-red-300 text-xs rounded-full animate-pulse border border-red-500/50">
                            🎯 Sniper Zone
                          </span>
                        )}
                      <p className="text-gray-400 text-sm">
                        {formatUSD(scan.data?.currentPrice || 0)}
                        <span
                          className={`ml-2 ${
                            (scan.data?.priceChangePercent || 0) >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {(scan.data?.priceChangePercent || 0) >= 0 ? "+" : ""}
                          {(scan.data?.priceChangePercent || 0).toFixed(2)}%
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Signal & Strength + Entry Status */}
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        scan.data?.overallSignal === "BUY"
                          ? "text-green-400"
                          : scan.data?.overallSignal === "SELL"
                            ? "text-red-400"
                            : "text-yellow-400"
                      }`}
                    >
                      {scan.data?.overallSignal}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {scan.data?.signalStrength.toFixed(0)}% confidence
                    </p>
                    {/* Entry Status Badge */}
                    {scan.data?.entryStatus && (
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                          scan.data.entryStatus === "ready"
                            ? "bg-green-600/50 text-green-300"
                            : scan.data.entryStatus === "late"
                              ? "bg-red-600/50 text-red-300"
                              : "bg-gray-600/50 text-gray-300"
                        }`}
                      >
                        {scan.data.entryStatus === "ready"
                          ? "✅ เข้าได้เลย!"
                          : scan.data.entryStatus === "late"
                            ? "⚠️ สายไปแล้ว"
                            : "⏳ รอจังหวะ"}
                      </span>
                    )}
                    {/* Candle Pattern Badge */}
                    {scan.data?.advancedIndicators?.candlePattern &&
                      scan.data.advancedIndicators.candlePattern.name !==
                        "None" && (
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold border ${
                            scan.data.advancedIndicators.candlePattern
                              .signal === "bullish"
                              ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/30"
                              : "bg-gray-700/50 text-gray-300 border-gray-600/30"
                          }`}
                        >
                          🕯️ {scan.data.advancedIndicators.candlePattern.name}
                        </span>
                      )}
                    {/* Anti-Knife-Catching Safety Badge */}
                    {scan.data?.advancedIndicators && (
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold border ${
                          scan.data.advancedIndicators.isPriceStabilized
                            ? "bg-green-900/40 text-green-300 border-green-500/30"
                            : "bg-red-900/40 text-red-300 border-red-500/30"
                        }`}
                      >
                        {scan.data.advancedIndicators.isPriceStabilized
                          ? "🛡️ ยืนเหนือ EMA5"
                          : "🔪 ใต้ EMA5 (ห้ามรับมีด!)"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Pattern & Trend Info */}
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Trend */}
                    <div
                      className={`px-3 py-1 rounded-full text-xs ${
                        scan.data?.trend.shortTerm === "up"
                          ? "bg-green-900/50 text-green-400"
                          : scan.data?.trend.shortTerm === "down"
                            ? "bg-red-900/50 text-red-400"
                            : "bg-yellow-900/50 text-yellow-400"
                      }`}
                    >
                      {scan.data?.trend.shortTerm === "up"
                        ? "⬆️ Uptrend"
                        : scan.data?.trend.shortTerm === "down"
                          ? "⬇️ Downtrend"
                          : "➡️ Sideway"}
                    </div>

                    {/* Patterns with status badges */}
                    {scan.data?.patterns.map((pattern, i) => (
                      <div
                        key={i}
                        className={`px-3 py-1 rounded-full text-xs ${
                          pattern.status === "ready"
                            ? "bg-green-600/50 text-green-300 border border-green-500/50"
                            : pattern.status === "confirmed"
                              ? "bg-gray-600/50 text-gray-400"
                              : pattern.signal === "bullish"
                                ? "bg-green-900/50 text-green-400"
                                : "bg-red-900/50 text-red-400"
                        }`}
                      >
                        {pattern.status === "ready"
                          ? "✅ "
                          : pattern.status === "confirmed"
                            ? "⚠️ "
                            : ""}
                        {pattern.name}
                        {pattern.distanceToBreakout !== undefined &&
                          pattern.distanceToBreakout > 0 && (
                            <span className="ml-1 opacity-70">
                              ({pattern.distanceToBreakout.toFixed(1)}% to
                              breakout)
                            </span>
                          )}
                      </div>
                    ))}

                    {scan.data?.patterns.length === 0 && (
                      <span className="text-gray-500 text-xs">
                        ไม่พบ Pattern ชัดเจน
                      </span>
                    )}
                  </div>

                  {/* Entry Zone & Levels for best pattern */}
                  {scan.data?.patterns[0] && (
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      {/* Entry Zone */}
                      {scan.data.patterns[0].entryZone && (
                        <div className="bg-blue-900/20 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-xs">📍 Entry Zone</p>
                          <p className="text-blue-400 font-bold text-sm">
                            {formatUSD(scan.data.patterns[0].entryZone.low)} -{" "}
                            {formatUSD(scan.data.patterns[0].entryZone.high)}
                          </p>
                        </div>
                      )}
                      {/* Target */}
                      {scan.data.patterns[0].targetPrice && (
                        <div className="bg-green-900/20 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-xs">🎯 Target</p>
                          <p className="text-green-400 font-bold">
                            {formatUSD(scan.data.patterns[0].targetPrice)}
                          </p>
                        </div>
                      )}
                      {/* Stop Loss */}
                      {scan.data.patterns[0].stopLoss && (
                        <div className="bg-red-900/20 rounded-lg p-2 text-center">
                          <p className="text-gray-500 text-xs">🛑 Stop Loss</p>
                          <p className="text-red-400 font-bold">
                            {formatUSD(scan.data.patterns[0].stopLoss)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ATR-based Cut Loss (Sniper Tip #2) */}
                  {scan.data?.advancedIndicators?.atr &&
                    scan.data.advancedIndicators.atr > 0 && (
                      <div className="mt-3 p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-purple-300 text-sm">
                          <span className="text-lg">🌊</span>
                          <div>
                            <p className="font-bold">ATR-Based Cut Loss</p>
                            <p className="text-xs opacity-70 italic text-white">
                              Entry - (1.5 * ATR)
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-red-400 font-mono font-bold">
                            {formatUSD(
                              scan.data.currentPrice -
                                1.5 * scan.data.advancedIndicators.atr,
                            )}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            Trailing Protection
                          </p>
                        </div>
                      </div>
                    )}

                  {/* ========== PIVOT POINTS & FIBONACCI ========== */}
                  {scan.data?.metrics?.pivotLevels &&
                    scan.data?.metrics?.fibLevels && (
                      <div className="mt-3 pt-3 border-t border-gray-700/30">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Pivot Points */}
                          <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-3">
                            <p className="text-amber-400 text-xs font-bold mb-2">
                              📐 Pivot Points (Daily)
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-green-400">R3</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(scan.data.metrics.pivotLevels.r3)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-400">R2</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(scan.data.metrics.pivotLevels.r2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-green-400">R1</span>
                                <span className="text-gray-300 font-mono font-bold">
                                  {formatUSD(scan.data.metrics.pivotLevels.r1)}
                                </span>
                              </div>
                              <div className="flex justify-between border-y border-amber-500/20 py-1">
                                <span className="text-yellow-400 font-bold">
                                  P
                                </span>
                                <span className="text-yellow-300 font-mono font-bold">
                                  {formatUSD(
                                    scan.data.metrics.pivotLevels.pivot,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-400">S1</span>
                                <span className="text-gray-300 font-mono font-bold">
                                  {formatUSD(scan.data.metrics.pivotLevels.s1)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-400">S2</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(scan.data.metrics.pivotLevels.s2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-red-400">S3</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(scan.data.metrics.pivotLevels.s3)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Fibonacci Retracements */}
                          <div className="bg-purple-900/10 border border-purple-500/20 rounded-xl p-3">
                            <p className="text-purple-400 text-xs font-bold mb-2">
                              🌀 Fibonacci (1Y Swing)
                            </p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between text-gray-500">
                                <span>Swing High</span>
                                <span className="font-mono">
                                  {formatUSD(
                                    scan.data.metrics.fibLevels.swingHigh,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-300">23.6%</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(
                                    scan.data.metrics.fibLevels.fib236,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-300">38.2%</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(
                                    scan.data.metrics.fibLevels.fib382,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-300">50.0%</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(
                                    scan.data.metrics.fibLevels.fib500,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between border-y border-purple-500/20 py-1">
                                <span className="text-amber-400 font-bold">
                                  61.8% ✨
                                </span>
                                <span className="text-amber-300 font-mono font-bold">
                                  {formatUSD(
                                    scan.data.metrics.fibLevels.fib618,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-purple-300">78.6%</span>
                                <span className="text-gray-300 font-mono">
                                  {formatUSD(
                                    scan.data.metrics.fibLevels.fib786,
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between text-gray-500">
                                <span>Swing Low</span>
                                <span className="font-mono">
                                  {formatUSD(
                                    scan.data.metrics.fibLevels.swingLow,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Confluence Zones */}
                        {scan.data.metrics.confluenceZones.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="text-[10px] text-amber-400/70 font-bold">
                              🔥 Confluence:
                            </span>
                            {scan.data.metrics.confluenceZones.map(
                              (zone, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-2 py-0.5 bg-amber-600/20 text-amber-200 rounded-full border border-amber-500/30"
                                >
                                  {zone}
                                </span>
                              ),
                            )}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Key Metrics for Comparison */}
                  {scan.data?.metrics && (
                    <div className="mt-3 pt-3 border-t border-gray-700/30">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 3 Pillars Score */}
                        <div
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                            scan.data.metrics.score3Pillars >= 3
                              ? "bg-green-600/30 text-green-300"
                              : scan.data.metrics.score3Pillars >= 2
                                ? "bg-yellow-600/30 text-yellow-300"
                                : "bg-red-600/30 text-red-300"
                          }`}
                        >
                          🎯 {scan.data.metrics.score3Pillars}/3 Pillars
                          <span className="ml-1 opacity-70">
                            ({scan.data.metrics.pillarTrend ? "✓T" : "✗T"}
                            {scan.data.metrics.pillarValue ? "✓V" : "✗V"}
                            {scan.data.metrics.pillarMomentum ? "✓M" : "✗M"})
                          </span>
                        </div>

                        {/* RSI */}
                        <div
                          className={`px-3 py-1.5 rounded-lg text-xs ${
                            scan.data.metrics.rsiStatus === "oversold"
                              ? "bg-green-600/30 text-green-300"
                              : scan.data.metrics.rsiStatus === "overbought"
                                ? "bg-red-600/30 text-red-300"
                                : "bg-gray-600/30 text-gray-300"
                          }`}
                        >
                          📊 RSI {scan.data.metrics.rsi.toFixed(0)}
                          {scan.data.metrics.rsiStatus === "oversold" &&
                            " (Oversold ✓)"}
                          {scan.data.metrics.rsiStatus === "overbought" &&
                            " (Overbought ⚠️)"}
                        </div>

                        {/* Volume */}
                        <div
                          className={`px-3 py-1.5 rounded-lg text-xs ${
                            scan.data.metrics.volumeStatus === "strong"
                              ? "bg-green-600/30 text-green-300"
                              : scan.data.metrics.volumeStatus === "weak"
                                ? "bg-red-600/30 text-red-300"
                                : "bg-gray-600/30 text-gray-300"
                          }`}
                        >
                          📈 Vol{" "}
                          {scan.data.metrics.volumeChange >= 0 ? "+" : ""}
                          {scan.data.metrics.volumeChange.toFixed(0)}%
                          {scan.data.metrics.volumeStatus === "weak" && " ⚠️"}
                        </div>

                        {/* Above SMA200 */}
                        <div
                          className={`px-3 py-1.5 rounded-lg text-xs ${
                            scan.data.metrics.aboveSma200
                              ? "bg-green-600/30 text-green-300"
                              : "bg-red-600/30 text-red-300"
                          }`}
                        >
                          {scan.data.metrics.aboveSma200
                            ? "🐂 เหนือ SMA"
                            : "🐻 ใต้ SMA"}
                        </div>

                        {/* Distance from 52w High */}
                        <div
                          className={`px-3 py-1.5 rounded-lg text-xs ${
                            scan.data.metrics.distanceFrom52High < 5
                              ? "bg-yellow-600/30 text-yellow-300"
                              : scan.data.metrics.distanceFrom52High > 20
                                ? "bg-green-600/30 text-green-300"
                                : "bg-gray-600/30 text-gray-300"
                          }`}
                        >
                          📉 {scan.data.metrics.distanceFrom52High.toFixed(0)}%
                          จาก High
                        </div>

                        {/* R/R Ratio - IMPORTANT! */}
                        {scan.data.metrics.rrRatio !== undefined && (
                          <div
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                              scan.data.metrics.rrStatus === "excellent"
                                ? "bg-green-600/50 text-green-200 border border-green-500"
                                : scan.data.metrics.rrStatus === "good"
                                  ? "bg-green-600/30 text-green-300"
                                  : scan.data.metrics.rrStatus === "risky"
                                    ? "bg-yellow-600/30 text-yellow-300"
                                    : "bg-red-600/50 text-red-200 border border-red-500"
                            }`}
                          >
                            ⚖️ R/R 1:{scan.data.metrics.rrRatio.toFixed(1)}
                            {scan.data.metrics.rrStatus === "excellent" &&
                              " ✅ สุดคุ้ม!"}
                            {scan.data.metrics.rrStatus === "good" &&
                              " ✅ คุ้มค่า"}
                            {scan.data.metrics.rrStatus === "risky" &&
                              " ⚠️ เสี่ยง"}
                            {scan.data.metrics.rrStatus === "bad" &&
                              " ❌ ไม่คุ้ม!"}
                          </div>
                        )}

                        {/* SMA50 Role - Support or Resistance */}
                        <div
                          className={`px-3 py-1.5 rounded-lg text-xs ${
                            scan.data.metrics.sma50Role === "support"
                              ? "bg-green-600/30 text-green-300"
                              : "bg-orange-600/30 text-orange-300"
                          }`}
                        >
                          {scan.data.metrics.sma50Role === "support"
                            ? `📈 SMA50 = แนวรับ (${formatUSD(scan.data.trend.sma50)})`
                            : `📉 SMA50 = แนวต้าน! (${formatUSD(scan.data.trend.sma50)})`}
                        </div>
                      </div>

                      {/* Support/Resistance Levels Row */}
                      <div className="flex gap-3 mt-2">
                        <div className="bg-green-900/20 rounded-lg px-3 py-1 text-xs">
                          <span className="text-gray-500">แนวรับ: </span>
                          <span className="text-green-400 font-medium">
                            {formatUSD(scan.data.metrics.supportLevel)}
                          </span>
                        </div>
                        <div className="bg-red-900/20 rounded-lg px-3 py-1 text-xs">
                          <span className="text-gray-500">แนวต้าน: </span>
                          <span className="text-red-400 font-medium">
                            {formatUSD(scan.data.metrics.resistanceLevel)}
                          </span>
                        </div>
                      </div>

                      {/* ========== ADVANCED INDICATORS SECTION ========== */}
                      {scan.data.advancedIndicators && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                          <p className="text-gray-400 text-xs font-medium mb-2">
                            📊 Indicator Matrix (Institutional Grade)
                          </p>

                          {/* Indicator Matrix Summary */}
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            {/* Dow Theory */}
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                scan.data.advancedIndicators.indicatorMatrix
                                  .dowTheory.signal === "bullish"
                                  ? "bg-green-900/30 text-green-300"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .dowTheory.signal === "bearish"
                                    ? "bg-red-900/30 text-red-300"
                                    : "bg-gray-700/30 text-gray-400"
                              }`}
                            >
                              <span className="opacity-70">Dow (40%): </span>
                              <span className="font-medium">
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .dowTheory.signal === "bullish"
                                  ? "↑"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .dowTheory.signal === "bearish"
                                    ? "↓"
                                    : "→"}{" "}
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .dowTheory.score > 0
                                  ? "+"
                                  : ""}
                                {
                                  scan.data.advancedIndicators.indicatorMatrix
                                    .dowTheory.score
                                }
                              </span>
                            </div>

                            {/* RSI */}
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                scan.data.advancedIndicators.indicatorMatrix.rsi
                                  .signal === "bullish"
                                  ? "bg-green-900/30 text-green-300"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .rsi.signal === "bearish"
                                    ? "bg-red-900/30 text-red-300"
                                    : "bg-gray-700/30 text-gray-400"
                              }`}
                            >
                              <span className="opacity-70">RSI (20%): </span>
                              <span className="font-medium">
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .rsi.signal === "bullish"
                                  ? "↑"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .rsi.signal === "bearish"
                                    ? "↓"
                                    : "→"}{" "}
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .rsi.score > 0
                                  ? "+"
                                  : ""}
                                {
                                  scan.data.advancedIndicators.indicatorMatrix
                                    .rsi.score
                                }
                              </span>
                            </div>

                            {/* MACD */}
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                scan.data.advancedIndicators.indicatorMatrix
                                  .macd.signal === "bullish"
                                  ? "bg-green-900/30 text-green-300"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .macd.signal === "bearish"
                                    ? "bg-red-900/30 text-red-300"
                                    : "bg-gray-700/30 text-gray-400"
                              }`}
                            >
                              <span className="opacity-70">MACD (20%): </span>
                              <span className="font-medium">
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .macd.signal === "bullish"
                                  ? "↑"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .macd.signal === "bearish"
                                    ? "↓"
                                    : "→"}{" "}
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .macd.score > 0
                                  ? "+"
                                  : ""}
                                {
                                  scan.data.advancedIndicators.indicatorMatrix
                                    .macd.score
                                }
                                {scan.data.advancedIndicators.macd
                                  .lossOfMomentum && " ⚠️"}
                              </span>
                            </div>

                            {/* Volume */}
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                scan.data.advancedIndicators.indicatorMatrix
                                  .volume.signal === "bullish"
                                  ? "bg-green-900/30 text-green-300"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .volume.signal === "bearish"
                                    ? "bg-red-900/30 text-red-300"
                                    : "bg-gray-700/30 text-gray-400"
                              }`}
                            >
                              <span className="opacity-70">Vol (20%): </span>
                              <span className="font-medium">
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .volume.signal === "bullish"
                                  ? "↑"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .volume.signal === "bearish"
                                    ? "↓"
                                    : "→"}{" "}
                                {scan.data.advancedIndicators.indicatorMatrix
                                  .volume.score > 0
                                  ? "+"
                                  : ""}
                                {
                                  scan.data.advancedIndicators.indicatorMatrix
                                    .volume.score
                                }
                              </span>
                            </div>
                          </div>

                          {/* Total Score & Recommendation */}
                          <div
                            className={`px-3 py-2 rounded-lg text-sm font-bold text-center ${
                              scan.data.advancedIndicators.indicatorMatrix
                                .recommendation === "STRONG_BUY"
                                ? "bg-green-600/40 text-green-200"
                                : scan.data.advancedIndicators.indicatorMatrix
                                      .recommendation === "BUY"
                                  ? "bg-green-600/30 text-green-300"
                                  : scan.data.advancedIndicators.indicatorMatrix
                                        .recommendation === "STRONG_SELL"
                                    ? "bg-red-600/40 text-red-200"
                                    : scan.data.advancedIndicators
                                          .indicatorMatrix.recommendation ===
                                        "SELL"
                                      ? "bg-red-600/30 text-red-300"
                                      : "bg-gray-700/30 text-gray-300"
                            }`}
                          >
                            {scan.data.advancedIndicators.indicatorMatrix
                              .recommendation === "STRONG_BUY" &&
                              "🚀 STRONG BUY"}
                            {scan.data.advancedIndicators.indicatorMatrix
                              .recommendation === "BUY" && "✅ BUY"}
                            {scan.data.advancedIndicators.indicatorMatrix
                              .recommendation === "HOLD" && "⏸️ HOLD"}
                            {scan.data.advancedIndicators.indicatorMatrix
                              .recommendation === "SELL" && "⚠️ SELL"}
                            {scan.data.advancedIndicators.indicatorMatrix
                              .recommendation === "STRONG_SELL" &&
                              "🔻 STRONG SELL"}
                            <span className="ml-2 opacity-70">
                              (Score:{" "}
                              {scan.data.advancedIndicators.indicatorMatrix
                                .totalScore > 0
                                ? "+"
                                : ""}
                              {
                                scan.data.advancedIndicators.indicatorMatrix
                                  .totalScore
                              }
                              )
                            </span>
                          </div>

                          {/* Trend Phase Badge */}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                scan.data.advancedIndicators.trendPhase ===
                                "accumulation"
                                  ? "bg-blue-900/30 text-blue-300"
                                  : scan.data.advancedIndicators.trendPhase ===
                                      "participation"
                                    ? "bg-green-900/30 text-green-300"
                                    : scan.data.advancedIndicators
                                          .trendPhase === "distribution"
                                      ? "bg-orange-900/30 text-orange-300"
                                      : scan.data.advancedIndicators
                                            .trendPhase === "markdown"
                                        ? "bg-red-900/30 text-red-300"
                                        : "bg-gray-700/30 text-gray-400"
                              }`}
                            >
                              {scan.data.advancedIndicators.trendPhase ===
                                "accumulation" &&
                                "🔵 Accumulation (Smart Money กำลังซื้อ)"}
                              {scan.data.advancedIndicators.trendPhase ===
                                "participation" &&
                                "🟢 Participation (ขาขึ้นรุนแรง)"}
                              {scan.data.advancedIndicators.trendPhase ===
                                "distribution" &&
                                "🟠 Distribution (Smart Money กำลังขาย)"}
                              {scan.data.advancedIndicators.trendPhase ===
                                "markdown" && "🔴 Markdown (ขาลงรุนแรง)"}
                              {scan.data.advancedIndicators.trendPhase ===
                                "unknown" && "⚪ Unknown Phase"}
                            </div>

                            {/* Volume Confirmation */}
                            <div
                              className={`px-2 py-1 rounded text-xs ${
                                scan.data.advancedIndicators.volumeConfirmation
                                  ? "bg-green-900/30 text-green-300"
                                  : "bg-yellow-900/30 text-yellow-300"
                              }`}
                            >
                              {scan.data.advancedIndicators.volumeConfirmation
                                ? "✅ Volume ยืนยัน"
                                : "⚠️ Volume ไม่ยืนยัน"}
                            </div>
                          </div>

                          {/* RSI Interpretation */}
                          <div className="mt-2 px-2 py-1 bg-gray-700/20 rounded text-xs text-gray-400">
                            💡 {scan.data.advancedIndicators.rsiInterpretation}
                          </div>

                          {/* Divergence Warnings */}
                          {scan.data.advancedIndicators.divergences.length >
                            0 && (
                            <div className="mt-2 space-y-1">
                              {scan.data.advancedIndicators.divergences.map(
                                (div, idx) => (
                                  <div
                                    key={idx}
                                    className={`px-2 py-1 rounded text-xs ${
                                      div.type === "bearish"
                                        ? "bg-red-900/40 text-red-200 border border-red-500/50"
                                        : "bg-green-900/40 text-green-200 border border-green-500/50"
                                    }`}
                                  >
                                    <span className="font-medium">
                                      [{div.indicator}]
                                    </span>{" "}
                                    {div.description}
                                    {div.severity === "strong" && " ⚠️⚠️"}
                                    {div.severity === "moderate" && " ⚠️"}
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Initial State */}
        {scans.length === 0 && mounted && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-12 text-center">
            <p className="text-6xl mb-4">📊</p>
            <h2 className="text-white font-bold text-xl mb-2">
              Pattern Screener
            </h2>
            <p className="text-gray-400 mb-4">
              กดปุ่ม "เริ่มสแกน" เพื่อหาหุ้นที่กราฟหน้าซื้อ
            </p>
            <p className="text-gray-500 text-sm">
              ระบบจะสแกน {UNIQUE_SYMBOLS.length} หุ้น (รวม Shay Boloor Picks)
              และจัดอันดับตามสัญญาณ
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

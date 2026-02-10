"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
  // Support/Resistance with proper logic
  supportLevel: number;
  resistanceLevel: number;
  sma50Role: "support" | "resistance";
  sma20Role: "support" | "resistance";
  // R/R Ratio
  rrRatio?: number;
  rrStatus?: "excellent" | "good" | "risky" | "bad";
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
  totalScore: number;
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
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

// ============================================================================
// 🎯 TIERED STOCK LIST - Organized by Risk Level
// ============================================================================

// 🏆 TIER 1: SAFE HAVENS (ปลอดภัยสูง - เจอ Oversold ให้รีบตะครุบ!)
// พื้นฐานแน่นปึ้ก ถ้าตกแรง = โอกาสซื้อ ไม่ใช่หนี
const TIER_1_TECH_GIANTS = [
  // --- The Magnificent 7 (เจ้าโลก) ---
  "MSFT", // Microsoft - Cloud/AI/OS
  "GOOGL", // Alphabet - Search/Data
  "NVDA", // NVIDIA - AI Chips
  "AMZN", // Amazon - E-commerce/Cloud
  "META", // Meta - Social/Ads
  "AAPL", // Apple - Hardware Ecosystem
  "TSLA", // Tesla - EV/Robot/Energy

  // --- The Chip Infrastructure (ขาดไม่ได้) ---
  "TSM", // TSMC - คนผลิตชิปให้โลก (Must Have!)
  "ASML", // ASML - คนขายเครื่องทำชิป (Monopoly)
  "AMD", // AMD - คู่แข่ง NVDA/Intel
  "AVGO", // Broadcom - AI Networking

  // --- The Software Kings (กินรวบ) ---
  "CRM", // Salesforce - Enterprise OS
  "ADBE", // Adobe - Creative OS
  "NFLX", // Netflix - Streaming King
  "ORCL", // Oracle - Database/Cloud (มาแรงเรื่อง AI)
];

const TIER_1_HEROES = [
  "RBRK", // Rubrik - Cybersecurity (ลูกรัก!)
  "AXON", // Axon/Taser - AI Police/Body Cam
  "CLS", // Celestica - AI Hardware Manufacturing
  "PLTR", // Palantir - AI Software (Sam ชอบ)
  "LRCX", // Lam Research - เครื่องผลิตชิป
  "GC=F", // Gold
  "SI=F", // Silver
];

// 🚀 TIER 1.5: GROWTH WARRIORS (AI, Energy, Space - มีอนาคต)
const TIER_1_GROWTH = [
  "RKLB", // Rocket Lab - Space Leader
  "ASTS", // AST SpaceMobile - 5G from Space
  "HOOD", // Robinhood - Retail/Crypto ตัวแทน
  "SYM", // Symbotic - Warehouse Robotics
  "KTOS", // Kratos Defense - Drone/UAV
  "MU", // Micron - Memory Chip (รอบๆ)
  "RBLX", // Roblox - Gaming/Metaverse
];

// ⚡ TIER 1: HARDWARE/ENERGY (พลังงาน + วัสดุ)
const TIER_1_ENERGY = [
  "MP", // MP Materials - Rare Earth (จำเป็น)
  "UUUU", // Energy Fuels - Uranium (Nuclear)
  "OKLO", // Oklo - Nuclear (ลูกรัก Sam Altman)
  "NVTS", // Navitas - Power Semiconductors
];

// 🎢 TIER 2: SPECULATIVE (เสี่ยงสูง - ซื้อหวย ใส่น้อยๆ)
// ต้องเช็คข่าวก่อนซื้อเสมอ!
const TIER_2_SPECULATIVE = [
  "QS", // QuantumScape - Solid State Battery (รอนาน)
  "IONQ", // IonQ - Quantum Computing (ลูกรัก!)
  "EOSE", // Eos Energy - Zinc Battery (คู่แข่งเยอะ)
  "ONDS", // Ondas - Drone Network (สภาพคล่องต่ำ)
  "JOBY", // Joby Aviation - Flying Car (ฝันไกล)
  "QBTS", // D-Wave - Quantum (Speculative)
  "LMND", // Lemonade - InsureTech (ยังขาดทุน)
];

// ❌ BLACKLIST: ลบออกแล้ว (Value Trap / เสี่ยงเกิน)
// "INTC" - Intel (ยักษ์ป่วย ถูกแล้วถูกได้อีก)
// "OPEN", "PGY", "CVNA" - กลุ่มอสังหา/สินเชื่อ (เสี่ยงล้มละลาย)
// "QURE", "TMDX" - Biotech (FDA Risk สูง)
// "BMNR", "CIFR", "WULF", "IREN", "NBIS" - Crypto Miners (HOOD ตัวเดียวพอ)

// Combine all tiers
const ALL_TIER_1 = [
  ...TIER_1_TECH_GIANTS,
  ...TIER_1_HEROES,
  ...TIER_1_GROWTH,
  ...TIER_1_ENERGY,
];
const ALL_TIER_2 = [...TIER_2_SPECULATIVE];

// Combined list with tier info
const SCAN_SYMBOLS = [...ALL_TIER_1, ...ALL_TIER_2];

// Remove duplicates
const UNIQUE_SYMBOLS = [...new Set(SCAN_SYMBOLS)];

// Helper: Check if symbol is Tier 1 (Safe)
const isTier1 = (symbol: string) => ALL_TIER_1.includes(symbol);
const isTier2 = (symbol: string) => ALL_TIER_2.includes(symbol);

export default function PatternScreenerPage() {
  const [scans, setScans] = useState<StockScan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filterSignal, setFilterSignal] = useState<
    "ALL" | "BUY" | "SELL" | "HOLD"
  >("ALL");
  const [mounted, setMounted] = useState(false);
  // NEW: Scan Mode - Trend Following vs Value Hunting
  const [scanMode, setScanMode] = useState<"trend" | "value">("value");

  useEffect(() => {
    setMounted(true);
  }, []);

  const startScan = async () => {
    setScanning(true);
    setScanProgress(0);

    // Initialize all scans as pending
    const initialScans: StockScan[] = UNIQUE_SYMBOLS.map((symbol) => ({
      symbol,
      data: null,
      status: "pending",
    }));
    setScans(initialScans);

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
      } else {
        // TREND FOLLOWING: Sort by signal: BUY first, then by strength
        const signalOrder = { BUY: 0, SELL: 1, HOLD: 2 };
        const aOrder = signalOrder[a.data?.overallSignal || "HOLD"];
        const bOrder = signalOrder[b.data?.overallSignal || "HOLD"];
        if (aOrder !== bOrder) return aOrder - bOrder;
        return (b.data?.signalStrength || 0) - (a.data?.signalStrength || 0);
      }
    });

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
        {/* Scan Controls */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-white font-bold text-lg">🔍 Mass Scan</h2>
              <p className="text-gray-500 text-sm">
                สแกน {UNIQUE_SYMBOLS.length} หุ้น
                {scanMode === "value"
                  ? " - หาของดีราคาถูก (Value Hunting)"
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
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              💎 Value Hunting (หาของถูก)
            </button>
            <button
              onClick={() => setScanMode("trend")}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                scanMode === "trend"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              📈 Trend Following (ตามเทรนด์)
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
                  หุ้นที่ตกแรงแต่พื้นฐานดี คือโอกาสทอง - &quot;SELL&quot;
                  อาจแปลว่า &quot;Sale!&quot;
                </span>
              </div>
            ) : (
              <div className="text-blue-300">
                <span className="font-bold">📈 Trend Following Mode:</span>{" "}
                ติดตามแนวโน้ม - BUY เมื่อขาขึ้น, SELL เมื่อขาลง
                <br />
                <span className="text-blue-400/70 text-xs">
                  ซื้อตามเทรนด์ ระวัง RSI สูง = อาจซื้อที่ดอย
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

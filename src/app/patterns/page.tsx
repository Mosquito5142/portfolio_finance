"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UNIQUE_SYMBOLS,
  MAGNIFICENT_SEVEN,
  TIER_1_MEGA_TECH,
  TIER_1_AI_HARDWARE,
  TIER_1_AI_INFRASTRUCTURE,
  TIER_1_AI_SOFTWARE,
  TIER_1_GROWTH_TECH,
  TIER_1_ENERGY_RESOURCES,
  TIER_1_HEALTH_BIO,
  TIER_2_SPECULATIVE,
  ALPHA_PICKS_WATCHLIST,
  FINVIZ_WATCHLIST,
  AI_HIDDEN_GEMS,
  STOCK_DETAILS,
  isTier1,
  isTier2,
} from "@/lib/stocks";
import { StockScan } from "@/types/stock";
import PatternCard from "@/components/PatternCard";

// Helper Component for Checkbox
const TickerCheckbox = ({
  ticker,
  checked,
  onToggle,
}: {
  ticker: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <label
    title={STOCK_DETAILS[ticker] || ticker}
    className={`flex items-center space-x-2 text-xs p-2 rounded cursor-pointer transition-all group relative ${
      checked
        ? "bg-purple-900/30 text-purple-200 border border-purple-500/30"
        : "text-gray-500 hover:bg-gray-800"
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className="rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-gray-800"
    />
    <span>{ticker}</span>
    {/* Tooltip on Hover (Optional: if native title isn't enough, but title is requested) */}
  </label>
);

// Grouping Logic
const AJARN_C_LIST = UNIQUE_SYMBOLS.filter(
  (s) => !MAGNIFICENT_SEVEN.includes(s),
);

// Stocks are now imported from @/lib/stocks

// === SMART TRADE LOGIC ===
const calculateSmartTrade = (s: StockScan) => {
  const price = s.data?.currentPrice || 0;
  const signal = s.data?.overallSignal || "HOLD";
  const rsi = s.data?.metrics?.rsi || 50;
  const pivots = s.data?.metrics?.pivotLevels;
  const fibs = s.data?.metrics?.fibLevels;
  const atr = s.data?.advancedIndicators?.atr || 0;
  const isOversoldRebound = signal === "SELL" && rsi < 35;

  let idealEntry = price;
  let cut = 0;
  let target = 0;

  // --- HELPER: Get Confluence Level ---
  const getConfluenceLevel = (type: "support" | "resistance") => {
    const levels: { val: number; weight: number }[] = [];
    const isSupport = type === "support";

    // 1. Pivot Points
    if (pivots) {
      if (isSupport) {
        if (pivots.s1 < price) levels.push({ val: pivots.s1, weight: 3 });
        if (pivots.s2 < price) levels.push({ val: pivots.s2, weight: 2 });
        if (pivots.s3 < price) levels.push({ val: pivots.s3, weight: 1 });
      } else {
        if (pivots.r1 > price) levels.push({ val: pivots.r1, weight: 3 });
        if (pivots.r2 > price) levels.push({ val: pivots.r2, weight: 2 });
        if (pivots.r3 > price) levels.push({ val: pivots.r3, weight: 1 });
      }
    }

    // 2. Fibonacci
    if (fibs) {
      const fibList = [fibs.fib236, fibs.fib382, fibs.fib500, fibs.fib618];
      fibList.forEach((f) => {
        if (isSupport ? f < price : f > price) {
          // Gold Pocket (0.618) gets extra weight
          const weight = f === fibs.fib618 ? 3 : 1.5;
          levels.push({ val: f, weight });
        }
      });
    }

    // 3. SMA (Simple Moving Average)
    const sma50 = s.data?.trend?.sma50 || 0;
    const sma200 = s.data?.metrics?.sma200 || 0;
    if (sma50 > 0 && (isSupport ? sma50 < price : sma50 > price))
      levels.push({ val: sma50, weight: 2 });
    if (sma200 > 0 && (isSupport ? sma200 < price : sma200 > price))
      levels.push({ val: sma200, weight: 2.5 });

    if (levels.length === 0) return isSupport ? price * 0.98 : price * 1.02;

    // Cluster Detection
    let bestAvg = 0;
    let maxW = 0;
    for (let i = 0; i < levels.length; i++) {
      let currentW = levels[i].weight;
      let currentSum = levels[i].val;
      let count = 1;
      for (let j = 0; j < levels.length; j++) {
        if (i === j) continue;
        const diff = Math.abs(levels[i].val - levels[j].val) / levels[i].val;
        if (diff < 0.015) {
          // 1.5% cluster
          currentW += levels[j].weight;
          currentSum += levels[j].val;
          count++;
        }
      }
      if (currentW > maxW) {
        maxW = currentW;
        bestAvg = currentSum / count;
      }
    }

    if (maxW >= 3.0) return bestAvg;
    // Fallback to strongest single level
    levels.sort((a, b) => b.weight - a.weight);
    return levels[0].val;
  };

  // --- ENTRY LOGIC ---
  const ema5 = s.data?.advancedIndicators?.ema5 || 0;

  if (signal === "BUY") {
    // 🎯 Smart Entry: Wait for a dip to a Confluence Support (Fib, Pivot, SMA), not EMA5.
    const sup = getConfluenceLevel("support");
    let smartEntry = price * 0.985; // Default to 1.5% pullback in strong trend

    // If a strong confluence support is nearby (within 5% max drop), use it
    if (sup > 0 && sup < price && sup >= price * 0.95) {
      smartEntry = sup;
    }
    idealEntry = smartEntry;
  } else if (signal === "SELL") {
    if (isOversoldRebound) {
      // 🎯 USER STRATEGY: "Sniper Rebound" (Liquidity Pocket)
      // Entry: Midpoint of S1 & S2 (Trap Zone)
      if (pivots) {
        idealEntry = (pivots.s1 + pivots.s2) / 2;
      } else {
        idealEntry = price * 0.95; // Fallback
      }

      // Target: Fib 0.382 (Mean Reversion)
      if (fibs) {
        target = fibs.fib382;
      } else {
        target = getConfluenceLevel("resistance");
      }

      // Cut Loss: Below S3 (Deep Safety)
      if (pivots) {
        const atrBuffer = atr > 0 ? atr : price * 0.02;
        cut = pivots.s3 - atrBuffer;
      } else {
        cut = price * 0.9;
      }
    } else {
      // Standard SELL (Short): Wait for a bounce to a Confluence Resistance
      const res = getConfluenceLevel("resistance");
      let smartEntry = price * 1.015; // Default to 1.5% bounce in strong trend

      // If a strong confluence resistance is nearby (within 5% max bounce), use it
      if (res > 0 && res > price && res <= price * 1.05) {
        smartEntry = res;
      }
      idealEntry = smartEntry;
    }
  } else {
    // HOLD -> Wait for Support
    idealEntry = getConfluenceLevel("support");
  }

  // --- CUT LOSS & TARGET LOGIC (Standard) ---
  if (signal === "SELL" && !isOversoldRebound) {
    // SHORT POSITION logic...
    const res = getConfluenceLevel("resistance");
    const maxCut = price * 1.05;
    const atrCut = atr > 0 ? price + atr * 3 : maxCut;
    cut = Math.min(res, maxCut);
    if (atr > 0) cut = Math.min(cut, atrCut);
    if (cut <= idealEntry * 1.005) cut = idealEntry * 1.05;

    const sup = getConfluenceLevel("support");
    target = Math.min(sup, idealEntry * 0.95);
    if (target >= idealEntry) target = idealEntry * 0.9;
  } else if (!isOversoldRebound) {
    // LONG POSITION (Normal Buy) logic...
    // (Only run this if NOT Rebound, because Rebound already set Target/Cut above)
    const sup = getConfluenceLevel("support");
    const maxCut = price * 0.95;
    const atrCut = atr > 0 ? price - atr * 2 : maxCut;
    cut = Math.max(sup, maxCut);
    if (atr > 0) cut = Math.max(cut, atrCut);
    if (cut >= idealEntry * 0.995) cut = idealEntry * 0.95;

    const res = getConfluenceLevel("resistance");
    target = Math.max(res, idealEntry * 1.05);
    if (target <= idealEntry) target = idealEntry * 1.1;
  }

  // Double check Rebound Validity (Ensure Target > Entry)
  if (isOversoldRebound) {
    if (target <= idealEntry) target = idealEntry * 1.15; // Force 15% upside if Fib failed
    if (cut >= idealEntry) cut = idealEntry * 0.9; // Force 10% downside risk
  }

  // Update the Scan Data with these "Smart" values
  const newScan = { ...s };
  if (newScan.data) {
    newScan.data = {
      ...newScan.data,
      // Overwrite metrics for UI consistency
      metrics: {
        ...newScan.data.metrics!,
        supportLevel: idealEntry, // Use 'supportLevel' field for Entry Display in UI
        resistanceLevel: target, // Use 'resistanceLevel' field for Target Display in UI
      },
      advancedIndicators: {
        ...newScan.data.advancedIndicators!,
        suggestedStopLoss: cut, // Use 'suggestedStopLoss' for Cut Display in UI
      },
    };
  }
  return newScan;
};

export default function PatternScreenerPage() {
  const [scans, setScans] = useState<StockScan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [filterSignal, setFilterSignal] = useState<
    "ALL" | "BUY" | "SELL" | "HOLD" | "SQUEEZE" | "ADX" | "V-SHAPE"
  >("ALL");
  const [mounted, setMounted] = useState(false);
  // NEW: Scan Mode - Trend Following vs Value Hunting vs Sniper Trading
  const [scanMode, setScanMode] = useState<"trend" | "value" | "sniper">(
    "value",
  );

  // NEW: Stock Selection State
  const [selectedTickers, setSelectedTickers] =
    useState<string[]>(UNIQUE_SYMBOLS);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  // NEW: Custom Tickers State
  const [customTickers, setCustomTickers] = useState<string[]>([]);

  // NEW: Portfolio State
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);

  const addCustomTicker = (ticker: string) => {
    const upper = ticker.toUpperCase();
    if (!customTickers.includes(upper) && !UNIQUE_SYMBOLS.includes(upper)) {
      setCustomTickers((prev) => [...prev, upper]);
      setSelectedTickers((prev) => [...prev, upper]); // Auto-select

      // Add to scans list so it can be processed
      setScans((prev) => [
        ...prev,
        { symbol: upper, data: null, status: "pending" },
      ]);

      setSearchTerm(""); // Clear search
    } else if (
      UNIQUE_SYMBOLS.includes(upper) &&
      !selectedTickers.includes(upper)
    ) {
      // If it exists but not selected, just select it
      setSelectedTickers((prev) => [...prev, upper]);
      setSearchTerm("");
    }
  };

  useEffect(() => {
    setMounted(true);
    // Initialize scans with imported symbols
    const initialScans: StockScan[] = UNIQUE_SYMBOLS.map((symbol) => ({
      symbol,
      data: null,
      status: "pending",
    }));
    setScans(initialScans);

    // Fetch user's active portfolio tickers
    fetch("/api/sheets/portfolio")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          const actives = json.data.filter(
            (r: any) =>
              r.status !== "CLOSED" &&
              r.ticker !== "CASH" &&
              r.quantity - (r.soldQty || 0) > 0,
          );
          const pTickers = Array.from(
            new Set(actives.map((r: any) => r.ticker)),
          ) as string[];
          setPortfolioTickers(pTickers);

          // Auto-inject any unknown tickers from portfolio into the system so user can scan them
          const newTickers = pTickers.filter(
            (t) => !UNIQUE_SYMBOLS.includes(t),
          );
          if (newTickers.length > 0) {
            setCustomTickers((prev) =>
              Array.from(new Set([...prev, ...newTickers])),
            );
            setScans((prev) => {
              const existingSymbols = prev.map((s) => s.symbol);
              const itemsToAdd: StockScan[] = newTickers
                .filter((t) => !existingSymbols.includes(t))
                .map((t) => ({ symbol: t, data: null, status: "pending" }));
              return [...prev, ...itemsToAdd];
            });
          }
        }
      })
      .catch((e) => console.error("Failed to load portfolio for screener", e));

    // Set default selection to "7 Angels" only initially? Or All?
    // User said "ไม่อยากค้นหาเยอะๆ" -> Maybe default all but easy to uncheck?
    // Or default to 7 Angels? Let's default to ALL for backward compatibility,
    // but the UI makes it easy to switch.
  }, []);

  const toggleTicker = (ticker: string) => {
    setSelectedTickers((prev) =>
      prev.includes(ticker)
        ? prev.filter((t) => t !== ticker)
        : [...prev, ticker],
    );
  };

  const toggleGroup = (group: string[]) => {
    const allSelected = group.every((t) => selectedTickers.includes(t));
    if (allSelected) {
      // Deselect all in group
      setSelectedTickers((prev) => prev.filter((t) => !group.includes(t)));
    } else {
      // Select all in group (merge unique)
      setSelectedTickers((prev) => Array.from(new Set([...prev, ...group])));
    }
  };

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);

    // Reset status only for selected tickers
    setScans((prev) =>
      prev.map((s) =>
        selectedTickers.includes(s.symbol)
          ? { ...s, status: "loading", data: null }
          : s,
      ),
    );

    // Scan ONLY selected tickers
    const targets = selectedTickers;
    let completed = 0;

    for (let i = 0; i < targets.length; i++) {
      // Stop if user navigates away or unmounts (not handled here but good practice to check logic)
      const symbol = targets[i];

      try {
        const response = await fetch(`/api/patterns?symbol=${symbol}`);
        const rawData = await response.json();

        // Apply Smart Logic immediately
        const smartScan = calculateSmartTrade({
          symbol,
          data: rawData.currentPrice > 0 ? rawData : null,
          status: "done",
        });

        setScans((prev) =>
          prev.map((s) => (s.symbol === symbol ? smartScan : s)),
        );
      } catch {
        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol ? { ...s, status: "error" } : s,
          ),
        );
      }

      completed++;
      setScanProgress((completed / targets.length) * 100);

      // Small delay between requests
      if (i < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Faster 300ms
      }
    }

    setScanning(false);
  };

  // Filter and sort results based on mode
  const filteredScans = scans
    .filter((s) => s.status === "done" && s.data)
    .filter((s) => {
      if (filterSignal === "ALL") return true;
      if (filterSignal === "SQUEEZE") {
        return s.data?.advancedIndicators?.bollingerBands?.isSqueeze === true;
      }
      if (filterSignal === "ADX") {
        return s.data?.advancedIndicators?.adx?.isTrending === true;
      }
      if (filterSignal === "V-SHAPE") {
        return s.data?.advancedIndicators?.isEarlyMomentum === true;
      }
      return s.data?.overallSignal === filterSignal;
    })
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

      // 🚀 GLOBAL REBOUND BOOST (Any Mode)
      // If RSI < 35 + Bullish Divergence -> Huge Boost (+30)
      if (
        rsi < 35 &&
        data.advancedIndicators?.divergences?.some((d) => d.type === "bullish")
      ) {
        rankingScore += 30;
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
    .slice(0, 5); // Pick Top 5 per mode logic (but scanned all)

  // ========== SEND TO GOOGLE SHEET ==========
  const handleQuickAlert = async (
    symbol: string,
    inlineAlertType: "SMART_ENTRY" | "EMA5_CROSS" | "BREAKOUT",
  ) => {
    const s = scans.find((x) => x.symbol === symbol);
    if (!s || !s.data || s.status !== "done") return false;

    const smartScan = calculateSmartTrade(s);
    const data = smartScan.data!;

    let entry = data.metrics?.supportLevel || 0;
    let target = data.metrics?.resistanceLevel || 0;
    let cut = data.advancedIndicators?.suggestedStopLoss || 0;

    let triggerPrice = entry;
    if (inlineAlertType === "EMA5_CROSS")
      triggerPrice = data.advancedIndicators?.ema5 || entry;
    else if (inlineAlertType === "BREAKOUT")
      triggerPrice = data.metrics?.resistanceLevel || target;

    // 🛠️ CRITICAL FIX: The Google Sheet "Entry" column should visually reflect the selected Trigger Price.
    entry = triggerPrice;

    if (entry > target) {
      const temp = entry;
      entry = target;
      target = temp;
      cut = entry * 0.95;
    }

    const payload = {
      ticker: s.symbol.toUpperCase().endsWith(".BK")
        ? `BKK:${s.symbol.replace(".BK", "")}`
        : s.symbol.toUpperCase(),
      entry: Number(entry.toFixed(2)),
      currentPrice: Number(data.currentPrice.toFixed(2)),
      cut: Number(cut.toFixed(2)),
      target: Number(target.toFixed(2)),
      status: "",
      alertType: inlineAlertType,
      triggerPrice: Number(triggerPrice.toFixed(2)),
    };

    try {
      const res = await fetch("/api/sheets/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [payload] }),
      });
      return res.ok;
    } catch {
      return false;
    }
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

  // NEW: Search Term for Selector
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSymbols = [...UNIQUE_SYMBOLS, ...customTickers].filter((s) =>
    s.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Toggle single stock removed due to inline 1-click Watchlist approach

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-purple-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
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
            <div className="flex items-center gap-3 flex-wrap justify-center font-medium">
              <Link
                href="/patterns/charts"
                className="text-gray-400 hover:text-blue-400 text-sm font-bold bg-blue-900/20 px-3 py-1 rounded border border-blue-500/30 transition-all whitespace-nowrap"
              >
                📐 Triangles
              </Link>
              <Link
                href="/search"
                className="text-gray-400 hover:text-purple-400 text-sm whitespace-nowrap"
              >
                🔍 Search
              </Link>
              <Link
                href="/gold"
                className="text-gray-400 hover:text-yellow-400 text-sm whitespace-nowrap"
              >
                🟡 Gold
              </Link>
              <Link
                href="/"
                className="text-gray-400 hover:text-white text-sm whitespace-nowrap"
              >
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

        {/* Stock Selector (New Search-Based) */}
        <div className="mb-6 bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              🎯 Select Stocks{" "}
              <span className="text-sm text-gray-500 font-normal">
                ({selectedTickers.length}/{UNIQUE_SYMBOLS.length})
              </span>
            </h2>
            <button
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {isSelectorOpen ? "Collapse 🔼" : "Expand 🔽"}
            </button>
          </div>

          {isSelectorOpen && (
            <>
              <div className="flex flex-col gap-4 mb-6">
                {/* 1. Group Quick Select */}
                <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                  <span className="text-gray-400 text-xs self-center mr-2">
                    Quick Select:
                  </span>
                  {[
                    {
                      label: "My Portfolio 🌟",
                      list: portfolioTickers,
                      color: "bg-yellow-600",
                    },
                    {
                      label: "ALL",
                      list: UNIQUE_SYMBOLS,
                      color: "bg-gray-600",
                    },
                    {
                      label: "Magnificent 7",
                      list: MAGNIFICENT_SEVEN,
                      color: "bg-blue-600",
                    },
                    {
                      label: "AI Hardware & Chips",
                      list: TIER_1_AI_HARDWARE,
                      color: "bg-purple-600",
                    },
                    {
                      label: "AI Infrastructure",
                      list: TIER_1_AI_INFRASTRUCTURE,
                      color: "bg-indigo-600",
                    },
                    {
                      label: "AI Software & Cloud",
                      list: TIER_1_AI_SOFTWARE,
                      color: "bg-blue-600",
                    },
                    {
                      label: "Growth Tech",
                      list: TIER_1_GROWTH_TECH,
                      color: "bg-indigo-600",
                    },
                    {
                      label: "Energy & Nuclear",
                      list: TIER_1_ENERGY_RESOURCES,
                      color: "bg-amber-600",
                    },
                    {
                      label: "Healthcare",
                      list: TIER_1_HEALTH_BIO,
                      color: "bg-pink-600",
                    },
                    {
                      label: "Alpha Picks",
                      list: ALPHA_PICKS_WATCHLIST,
                      color: "bg-teal-600",
                    },
                    {
                      label: "Finviz Watchlist",
                      list: FINVIZ_WATCHLIST,
                      color: "bg-emerald-600",
                    },
                    {
                      label: "AI Hidden Gems 💎",
                      list: AI_HIDDEN_GEMS,
                      color: "bg-amber-500",
                    },
                    {
                      label: "Speculative",
                      list: TIER_2_SPECULATIVE,
                      color: "bg-red-600",
                    },
                  ].map((group) => {
                    // Check if all in group are selected
                    const isFullySelected = group.list.every((t: string) =>
                      selectedTickers.includes(t),
                    );

                    return (
                      <button
                        key={group.label}
                        onClick={() => {
                          if (isFullySelected) {
                            // Deselect Group
                            setSelectedTickers(
                              selectedTickers.filter(
                                (t: string) => !group.list.includes(t),
                              ),
                            );
                          } else {
                            // Select Group (Union)
                            setSelectedTickers(
                              Array.from(
                                new Set([...selectedTickers, ...group.list]),
                              ),
                            );
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border border-white/10 ${
                          isFullySelected
                            ? `${group.color} text-white shadow-lg shadow-${group.color}/20 scale-105`
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        {isFullySelected ? "✓" : "+"} {group.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSelectedTickers([])}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-red-400 border border-red-900/30 hover:bg-red-900/20 transition-all ml-auto"
                  >
                    Clear All ❌
                  </button>
                </div>

                {/* 2. Search & Filter Actions */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Type to filter stocks (e.g. TSLA, NVDA)..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Stock Grid (Grouped or Filtered) */}
              <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {searchTerm ? (
                  // Search Mode: Flat List
                  <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {filteredSymbols.map((ticker) => (
                      <TickerCheckbox
                        key={ticker}
                        ticker={ticker}
                        checked={selectedTickers.includes(ticker)}
                        onToggle={() => {
                          if (selectedTickers.includes(ticker)) {
                            setSelectedTickers(
                              selectedTickers.filter((t) => t !== ticker),
                            );
                          } else {
                            setSelectedTickers([...selectedTickers, ticker]);
                          }
                        }}
                      />
                    ))}
                    {filteredSymbols.length === 0 && (
                      <div className="col-span-full text-center py-8">
                        <p className="text-gray-500 mb-4">
                          No stocks found matching "{searchTerm}"
                        </p>
                        {searchTerm.length >= 1 &&
                          /^[A-Za-z]+$/.test(searchTerm) && (
                            <button
                              onClick={() => addCustomTicker(searchTerm)}
                              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                            >
                              <span>➕</span>
                              Add Custom Ticker:{" "}
                              <span className="font-bold">
                                {searchTerm.toUpperCase()}
                              </span>
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Default Mode: Grouped List
                  <div className="space-y-6">
                    {[
                      { title: "Magnificent 7 👑", list: MAGNIFICENT_SEVEN },
                      {
                        title: "Mega Tech & Leaders 🏢",
                        list: TIER_1_MEGA_TECH,
                      },
                      {
                        title: "AI Hardware & Semiconductors 🛠️",
                        list: TIER_1_AI_HARDWARE,
                      },
                      {
                        title: "AI Infrastructure & Data Center 🌐",
                        list: TIER_1_AI_INFRASTRUCTURE,
                      },
                      {
                        title: "AI Software, Cloud & Security ☁️",
                        list: TIER_1_AI_SOFTWARE,
                      },
                      {
                        title: "Growth Tech (Chips/Space/EV) 🚀",
                        list: TIER_1_GROWTH_TECH,
                      },
                      {
                        title: "Energy & Resources (Nuclear/Minerals) ⚡",
                        list: TIER_1_ENERGY_RESOURCES,
                      },
                      {
                        title: "Healthcare & Biotech 🧬",
                        list: TIER_1_HEALTH_BIO,
                      },
                      {
                        title: "Alpha Picks (Strong Buy) 🌟",
                        list: ALPHA_PICKS_WATCHLIST,
                      },
                      {
                        title: "Finviz Watchlist 🟢",
                        list: FINVIZ_WATCHLIST,
                      },
                      {
                        title: "AI Hidden Gems (Supply Chain) 💎",
                        list: AI_HIDDEN_GEMS,
                      },
                      {
                        title: "Speculative & High Risk 🎢",
                        list: TIER_2_SPECULATIVE,
                      },
                    ].map((group) => (
                      <div key={group.title}>
                        <h3 className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1 tracking-wider">
                          {group.title}
                        </h3>
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {group.list.map((ticker) => (
                            <TickerCheckbox
                              key={ticker}
                              ticker={ticker}
                              checked={selectedTickers.includes(ticker)}
                              onToggle={() => {
                                if (selectedTickers.includes(ticker)) {
                                  setSelectedTickers(
                                    selectedTickers.filter((t) => t !== ticker),
                                  );
                                } else {
                                  setSelectedTickers([
                                    ...selectedTickers,
                                    ticker,
                                  ]);
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Helper Component for Checkbox */}
        {/* Note: In a real app, this should be outside, but inline is fine for now */}
        {/* We need to define TickerCheckbox outside or use inline rendering if component definition is not allowed inside render */}

        {/* Scan Controls */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-white font-bold text-lg">🔍 Mass Scan</h2>
              <p className="text-gray-500 text-sm">
                สแกน {selectedTickers.length} หุ้นที่เลือก
                {scanMode === "value"
                  ? " - หาของดีราคาถูก (Value Hunting)"
                  : scanMode === "sniper"
                    ? " - จ่อแนวรับที่สุด (Sniper Trading)"
                    : " - ตามเทรนด์ (Trend Following)"}
              </p>
            </div>
            <button
              onClick={handleScan}
              disabled={scanning || selectedTickers.length === 0}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all ${
                scanning || selectedTickers.length === 0
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/20"
              }`}
            >
              {scanning
                ? `กำลังสแกน... ${scanProgress.toFixed(0)}%`
                : selectedTickers.length === 0
                  ? "เลือกหุ้นก่อนสแกน"
                  : "🚀 เริ่มสแกน"}
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setScanMode("value")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                scanMode === "value"
                  ? "bg-green-600 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              💎 Value Hunting
            </button>
            <button
              onClick={() => setScanMode("trend")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                scanMode === "trend"
                  ? "bg-purple-600 text-white"
                  : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
              }`}
            >
              📈 Trend Following
            </button>
            <button
              onClick={() => setScanMode("sniper")}
              className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
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
              {/* Filter Signals */}
              <div className="flex gap-2">
                {[
                  "ALL",
                  "BUY",
                  "SELL",
                  "HOLD",
                  "SQUEEZE",
                  "ADX",
                  "V-SHAPE",
                ].map((sig) => (
                  <button
                    key={sig}
                    onClick={() => setFilterSignal(sig as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      filterSignal === sig
                        ? sig === "BUY"
                          ? "bg-green-600 text-white"
                          : sig === "SELL"
                            ? "bg-red-600 text-white"
                            : sig === "SQUEEZE"
                              ? "bg-purple-600 text-white animate-pulse"
                              : sig === "ADX"
                                ? "bg-orange-600 text-white"
                                : sig === "V-SHAPE"
                                  ? "bg-pink-600 text-white animate-pulse shadow-lg"
                                  : "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    {sig === "SQUEEZE"
                      ? "🌪️ SQUEEZE"
                      : sig === "ADX"
                        ? "🔥 ADX"
                        : sig === "V-SHAPE"
                          ? "🚀 V-SHAPE"
                          : sig}
                  </button>
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
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 relative z-10 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white flex flex-wrap items-center gap-2">
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
                <p className="text-purple-300/70 text-xs sm:text-sm mt-1">
                  หุ้นที่คะแนนดีที่สุด 5 อันดับแรก พร้อมแผนการเล่นรายวัน
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
              {topPicks.map((pick, idx) => {
                const data = pick.data!;
                const support = data.metrics?.supportLevel || 0;
                const resistance = data.metrics?.resistanceLevel || 0;
                // Use dynamic ATR-based stop loss from Anti-Knife-Catching v3.2
                const isSell = data.overallSignal === "SELL";
                const cutLoss =
                  data.advancedIndicators?.suggestedStopLoss ||
                  (isSell
                    ? data.currentPrice * 1.05 // Fallback for SELL: +5%
                    : support > 0
                      ? support * 0.97
                      : data.currentPrice * 0.95);

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
            className={`grid gap-2 sm:gap-4 ${scanMode === "value" ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}
          >
            <button
              onClick={() => setFilterSignal("ALL")}
              className={`p-3 sm:p-4 rounded-xl border transition-all ${
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

            {/* NEW EXTENDED FILTERS: Squeeze and ADX (always shown for now, or only in trend/sniper) */}
            <button
              onClick={() => setFilterSignal("SQUEEZE")}
              className={`p-4 rounded-xl border transition-all ${
                filterSignal === "SQUEEZE"
                  ? "bg-purple-900/50 border-purple-500 animate-pulse"
                  : "bg-gray-800/50 border-gray-700/50 hover:border-purple-500/50"
              }`}
            >
              <p className="text-gray-500 text-xs text-purple-300">
                🌪️ SQUEEZE
              </p>
              <p className="text-2xl font-bold text-purple-400">
                {
                  scans.filter(
                    (s) =>
                      s.status === "done" &&
                      s.data?.advancedIndicators?.bollingerBands?.isSqueeze ===
                        true,
                  ).length
                }
              </p>
            </button>

            <button
              onClick={() => setFilterSignal("ADX")}
              className={`p-4 rounded-xl border transition-all ${
                filterSignal === "ADX"
                  ? "bg-orange-900/50 border-orange-500"
                  : "bg-gray-800/50 border-gray-700/50 hover:border-orange-500/50"
              }`}
            >
              <p className="text-gray-500 text-xs text-orange-300">
                🔥 ADX Trend
              </p>
              <p className="text-2xl font-bold text-orange-400">
                {
                  scans.filter(
                    (s) =>
                      s.status === "done" &&
                      s.data?.advancedIndicators?.adx?.isTrending === true,
                  ).length
                }
              </p>
            </button>

            <button
              onClick={() => setFilterSignal("V-SHAPE")}
              className={`p-4 rounded-xl border transition-all ${
                filterSignal === "V-SHAPE"
                  ? "bg-pink-900/50 border-pink-500 animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                  : "bg-gray-800/50 border-gray-700/50 hover:border-pink-500/50"
              }`}
            >
              <p className="text-gray-500 text-xs text-pink-300">
                🚀 V-SHAPE Break
              </p>
              <p className="text-2xl font-bold text-pink-400">
                {
                  scans.filter(
                    (s) =>
                      s.status === "done" &&
                      s.data?.advancedIndicators?.isEarlyMomentum === true,
                  ).length
                }
              </p>
            </button>
          </div>
        )}

        {/* Stock List */}
        {filteredScans.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between bg-gray-900/40 p-4 rounded-xl border border-gray-700/50 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  📋 รายการหุ้น ({filteredScans.length})
                </h2>
              </div>
            </div>

            {filteredScans.map((scan) => (
              <PatternCard
                key={scan.symbol}
                scan={scan}
                scanMode={scanMode}
                onQuickAlert={handleQuickAlert}
              />
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

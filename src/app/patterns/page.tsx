"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UNIQUE_SYMBOLS,
  MAGNIFICENT_SEVEN,
  isTier1,
  isTier2,
} from "@/lib/stocks";
import PatternCard from "@/components/PatternCard";
import { StockScan } from "@/types/stock";

// Grouping Logic
const AJARN_C_LIST = UNIQUE_SYMBOLS.filter(
  (s) => !MAGNIFICENT_SEVEN.includes(s),
);

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

  // NEW: Stock Selection State
  const [selectedTickers, setSelectedTickers] =
    useState<string[]>(UNIQUE_SYMBOLS);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize scans with imported symbols
    const initialScans: StockScan[] = UNIQUE_SYMBOLS.map((symbol) => ({
      symbol,
      data: null,
      status: "pending",
    }));
    setScans(initialScans);
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
      .slice(0, 10);

    // Helper to format item for Sheet (Strict Logic)
    const formatItem = (s: StockScan) => {
      const price = s.data?.currentPrice || 0;
      const apiSupport = s.data?.metrics?.supportLevel || 0;
      const apiResistance = s.data?.metrics?.resistanceLevel || 0;
      const pivots = s.data?.metrics?.pivotLevels;
      const fibs = s.data?.metrics?.fibLevels;
      const atr = s.data?.advancedIndicators?.atr || 0;
      let signal = s.data?.overallSignal || "HOLD";
      const rsi = s.data?.metrics?.rsi || 50;
      const divergences = s.data?.advancedIndicators?.divergences || [];

      // === OVERSOLD SAFETY RULE ===
      // "If divergence BULLISH + RSI < 35 -> downgrade SELL or HOLD/BUY"
      if (signal === "SELL" && rsi < 35) {
        const hasBullishDivergence = divergences.some(
          (d) => d.type === "bullish",
        );
        if (hasBullishDivergence) {
          // Strong Rebound Setup: Deep Oversold + Divergence
          if (rsi < 30) {
            signal = "BUY"; // Upgrade to BUY (High Risk/Reward Rebound)
            console.log(`🚀 [${s.symbol}] Upgraded to BUY (Deep Deep Rebound)`);
          } else {
            signal = "HOLD"; // Downgrade to HOLD
            console.log(`🛡️ [${s.symbol}] Downgraded to HOLD (Rebound Setup)`);
          }
        } else if (rsi < 30) {
          signal = "HOLD"; // Too oversold to short
          console.log(`🛡️ [${s.symbol}] Downgraded to HOLD (RSI < 30)`);
        } else {
          // Fallback for RSI < 35 but no div?
          // If we want to force Rebound logic for ALL RSI < 35 SELLs:
          console.log(
            `🧐 [${s.symbol}] RSI < 35 (${rsi}) but SELL. Force check Rebound logic.`,
          );
        }
      }

      // === REBOUND CONFIDENCE BOOST (User Request) ===
      // DISABLED: This conflicts with the "Sniper Rebound" logic by forcing BUY -> Current Price
      // We want these to stay as HOLD (Wait for Confluence) or SELL (Sniper Mode).
      /*
      if (signal === "HOLD" && rsi < 35) {
        const hasBullishDivergence = divergences.some(
          (d) => d.type === "bullish",
        );
        const nearSupport =
          apiSupport > 0 && (price - apiSupport) / apiSupport < 0.02;

        if (hasBullishDivergence && nearSupport) {
          signal = "BUY"; // Upgrade HOLD -> BUY
        }
      }
      */

      let cut = 0;
      let target = 0;

      // === LOGIC: BUY vs SELL ===
      if (signal === "SELL") {
        // [SELL] Stop Loss = Resistance, Target = Support
        // CUT (Stop Loss)
        if (apiResistance > price) {
          cut = apiResistance;
        } else {
          cut = price * 1.05; // Fallback +5%
        }

        // TARGET
        if (apiSupport < price && apiSupport > 0) {
          target = apiSupport;
        } else {
          target = price * 0.95; // Fallback -5%
        }
      } else {
        // [BUY/HOLD] Stop Loss = Support, Target = Resistance
        // ------------------------------------------------------------------
        // CUT (Stop Loss) - STRICT RULE: min(Entry - ATR, Pivot S1)
        // Must be LOWER than entry.
        // ------------------------------------------------------------------
        const possibleCuts: number[] = [];

        // 1. ATR-based Cut
        if (atr > 0) {
          possibleCuts.push(price - atr * 1.5);
        }

        // 2. Pivot S1 (Only if valid support below price)
        if (pivots?.s1 && pivots.s1 < price) {
          possibleCuts.push(pivots.s1);
        }

        // 3. Absolute Floor (Entry - 5%) - FALLBACK
        possibleCuts.push(price * 0.95);

        // Decide Cut: Use the LOWEST valid support (conservative)
        cut = Math.min(...possibleCuts);

        // Final Safety: Force Cut < Entry
        if (cut >= price * 0.995) cut = price * 0.95;

        // ------------------------------------------------------------------
        // TARGET - FINAL REALISTIC CAP (STRICTEST)
        // Formula: min(Pivot R2/R3, Fib 0.382/0.618, ATR Cap, R:R 3R, Max 15%)
        // ------------------------------------------------------------------
        let risk = price - cut;
        if (risk <= 0) risk = price * 0.05;

        const possibleTargets: number[] = [];

        // 1. Risk:Reward 1:3 Cap
        possibleTargets.push(price + risk * 3);

        // 2. Pivot R2 & R3
        if (pivots?.r2 && pivots.r2 > price) possibleTargets.push(pivots.r2);
        if (pivots?.r3 && pivots.r3 > price) possibleTargets.push(pivots.r3);

        // 3. Fib Levels (0.382 & 0.618 as Rebound Targets)
        if (fibs?.fib382 && fibs.fib382 > price)
          possibleTargets.push(fibs.fib382);
        if (fibs?.fib618 && fibs.fib618 > price)
          possibleTargets.push(fibs.fib618);

        // 4. ATR Cap (Entry + 3*ATR) OR Fallback 15%
        // TIGHTENED based on user feedback (ARM, NET issues)
        if (atr > 0) {
          possibleTargets.push(price + atr * 3);
        } else {
          possibleTargets.push(price * 1.15); // Fallback Max +15%
        }

        // Use the MINIMUM of all valid targets to be realistic
        target = Math.min(...possibleTargets);
      }

      // === SMART ENTRY LOGIC (Ideal Entry vs Current Price) ===
      // === SMART ENTRY LOGIC: CONFLUENCE HUNTER (Cluster Analysis) 🧠 ===
      // Goal: Find "Clusters" where multiple levels (Pivot, Fib, SMA) overlap within 1.5%
      let idealEntry = price;
      const entryStatus = s.data?.entryStatus;

      const getConfluenceEntry = () => {
        try {
          const levels: { val: number; weight: number }[] = [];

          if (!pivots) {
            console.log(
              `❌ [Confluence] Pivots object is MISSING for ${s.symbol}`,
            );
            return price * 0.98;
          }

          // 1. Pivot Points (S1/S2/S3 - High Weight)
          if (pivots.s1 && pivots.s1 < price)
            levels.push({ val: pivots.s1, weight: 3 });
          if (pivots.s2 && pivots.s2 < price)
            levels.push({ val: pivots.s2, weight: 2 });

          // ... rest of logic
          // (truncated for brevity in edit, but I need to make sure I don't delete the rest)
          // Actually, better to just edit the start of function to add safety check

          // 2. Fibonacci (61.8% Gold, 50%, 38.2% - High Weight)
          if (fibs?.fib618 && fibs.fib618 < price)
            levels.push({ val: fibs.fib618, weight: 3.5 }); // GOLDEN POCKET
          if (fibs?.fib500 && fibs.fib500 < price)
            levels.push({ val: fibs.fib500, weight: 1.5 });

          // 3. Moving Averages (SMA50/200 - Medium Weight)
          const sma50 = s.data?.trend?.sma50 || 0;
          if (sma50 > 0 && sma50 < price)
            levels.push({ val: sma50, weight: 2 });
          const sma200 = s.data?.metrics?.sma200 || 0;
          if (sma200 > 0 && sma200 < price)
            levels.push({ val: sma200, weight: 2 });

          if (levels.length === 0) {
            console.log(
              "🐛 [Confluence] No levels found for",
              s.symbol,
              "Price:",
              price,
            );
            return price * 0.98; // Fallback
          }

          // === CLUSTER DETECTION ===
          let bestClusterAvg = 0;
          let maxWeight = 0;

          // Check each level against others to find clusters
          for (let i = 0; i < levels.length; i++) {
            let currentWeight = levels[i].weight;
            let currentSum = levels[i].val;
            let count = 1;

            for (let j = 0; j < levels.length; j++) {
              if (i === j) continue;
              // Check if close within 1.5%
              const diff =
                Math.abs(levels[i].val - levels[j].val) / levels[i].val;
              if (diff < 0.015) {
                currentWeight += levels[j].weight;
                currentSum += levels[j].val;
                count++;
              }
            }

            if (currentWeight > maxWeight) {
              maxWeight = currentWeight;
              bestClusterAvg = currentSum / count;
            }
          }

          // If we found a strong confluence (Weight > 3.0)
          if (maxWeight >= 3.0) {
            console.log(
              "🎯 [Confluence] Cluster Found for",
              s.symbol,
              "Avg:",
              bestClusterAvg,
              "Weight:",
              maxWeight,
            );
            return bestClusterAvg;
          }

          console.log(
            "⚠️ [Confluence] No Cluster for",
            s.symbol,
            "MaxWeight:",
            maxWeight,
          );

          // If no cluster, prefer Gold Fib 618 or S1
          const fib618 = levels.find((l) => l.val === fibs?.fib618);
          if (fib618) return fib618.val;
          const s1 = levels.find((l) => l.val === pivots?.s1);
          if (s1) return s1.val;

          return Math.max(...levels.map((l) => l.val)); // Nearest support
        } catch (err) {
          console.error(`💥 [Confluence] CRASH for ${s.symbol}:`, err);
          return price * 0.98;
        }
      };

      // ------------------------------------------------------------------
      // TARGET - PRECISE EXIT (R1/R2/R3 or Fib 0.618/1.618)
      // ------------------------------------------------------------------
      // ------------------------------------------------------------------
      // TARGET - PRECISE EXIT (R1/R2/R3 or Fib 0.618/1.618)
      // ------------------------------------------------------------------
      let targetPrice = 0;
      // const rsi = s.data?.metrics?.rsi || 50; // Already declared at top
      const isOversoldRebound = signal === "SELL" && rsi < 35; // Special Case: Sniper Buy on Dive

      if (signal === "SELL" && !isOversoldRebound) {
        // Target = Support (S1/S2/S3) for Shorting
        // Logic: Deepest realistic support
        const supports = [pivots?.s2, pivots?.s3, fibs?.fib618].filter(
          Boolean,
        ) as number[];
        const validSupports = supports.filter((t) => t < price);
        targetPrice =
          validSupports.length > 0 ? Math.min(...validSupports) : price * 0.9;
      } else {
        // Target = Resistance (R1-R3) for Buying (or Rebound)
        // Warning: Don't be greedy. R2 is usually a good Take Profit.
        const resistances = [
          pivots?.r1,
          pivots?.r2,
          pivots?.r3,
          fibs?.fib618, // If price < Fib 618, it's a target
        ].filter(Boolean) as number[];

        const validResistances = resistances.filter((t) => t > price);
        // Filter out targets that are too close (< 2% away)
        const meaningfulTargets = validResistances.filter(
          (t) => (t - price) / price > 0.02,
        );

        if (meaningfulTargets.length > 0) {
          // Pick the nearest MEANINGFUL resistance
          targetPrice = Math.min(...meaningfulTargets);
        } else {
          targetPrice = price * 1.05; // Fallback +5%
        }
      }

      // LOGIC: Entry Selection
      // Default: Current Price (Ready to Buy/Short)
      // Exception: Holding for Dip OR Sniper Rebound
      if (signal === "BUY") {
        if (entryStatus === "ready") {
          idealEntry = price;
        } else {
          idealEntry = getConfluenceEntry();
        }
      } else if (signal === "HOLD") {
        idealEntry = getConfluenceEntry();
      } else if (signal === "SELL") {
        if (isOversoldRebound) {
          idealEntry = getConfluenceEntry();
        } else {
          // Standard Sell/Short
          idealEntry = price;
        }
      }

      return {
        ticker: s.symbol,
        entry: Number(idealEntry.toFixed(2)),
        currentPrice: Number(price.toFixed(2)),
        cut: Number(cut.toFixed(2)),
        target: Number(targetPrice.toFixed(2)),
        status: "", // Initial status for Sheet
      };
    };

    const candidatesFormatted = candidates.map(formatItem);

    // 🔄 รวบรวมตัวอื่นที่สแกนแล้ว → อัปเดตราคาใน Sheet ให้ทุกตัวที่มีอยู่แล้ว
    const candidateTickers = new Set(candidates.map((c) => c.symbol));
    const priceUpdatesFormatted = scans
      .filter(
        (s) =>
          s.status === "done" &&
          s.data &&
          s.data.currentPrice > 0 &&
          !candidateTickers.has(s.symbol),
      )
      .map(formatItem);

    // รวม: ตัวแนะนำ (ใหม่) + ตัวอัปเดตราคา (เดิม)
    const allItems = [...candidatesFormatted, ...priceUpdatesFormatted];

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
          `✅ ส่ง ${candidates.length} ตัวแนะนำ + อัปเดต ${priceUpdatesFormatted.length} ตัวเดิม`,
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

  // NEW: Search Term for Selector
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSymbols = UNIQUE_SYMBOLS.filter((s) =>
    s.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Type to filter stocks (e.g. TSLA, NVDA)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  onClick={() => {
                    // Select all filtered
                    const newSelection = Array.from(
                      new Set([...selectedTickers, ...filteredSymbols]),
                    );
                    setSelectedTickers(newSelection);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all whitespace-nowrap"
                >
                  Select Visible ✅
                </button>
                <button
                  onClick={() => {
                    // Deselect all filtered
                    const newSelection = selectedTickers.filter(
                      (t) => !filteredSymbols.includes(t),
                    );
                    setSelectedTickers(newSelection);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white transition-all whitespace-nowrap"
                >
                  Unselect Visible ⬜
                </button>
                <button
                  onClick={() => setSelectedTickers([])}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-red-900/50 text-red-400 hover:bg-red-900/20 transition-all whitespace-nowrap"
                >
                  Clear All ❌
                </button>
              </div>

              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800 animate-in fade-in zoom-in duration-300 max-h-60 overflow-y-auto custom-scrollbar">
                {filteredSymbols.map((ticker) => (
                  <label
                    key={ticker}
                    className={`flex items-center space-x-2 text-xs p-2 rounded cursor-pointer transition-all ${
                      selectedTickers.includes(ticker)
                        ? "bg-purple-900/30 text-purple-200 border border-purple-500/30"
                        : "text-gray-500 hover:bg-gray-800"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTickers.includes(ticker)}
                      onChange={() => toggleTicker(ticker)}
                      className="rounded border-gray-600 text-purple-500 focus:ring-purple-500 bg-gray-800"
                    />
                    <span>{ticker}</span>
                  </label>
                ))}
                {filteredSymbols.length === 0 && (
                  <div className="col-span-full text-center text-gray-500 py-4">
                    No stocks found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Scan Controls */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
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
              className={`px-6 py-3 rounded-xl font-bold transition-all ${
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
              <PatternCard key={scan.symbol} scan={scan} scanMode={scanMode} />
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

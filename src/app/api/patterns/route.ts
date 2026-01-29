"use server";

import { NextResponse } from "next/server";

interface PatternResult {
  name: string;
  type: "reversal" | "continuation";
  signal: "bullish" | "bearish" | "neutral";
  status: "forming" | "ready" | "confirmed"; // NEW: Pattern stage
  confidence: number;
  description: string;
  entryZone?: { low: number; high: number }; // NEW: Entry price range
  breakoutLevel?: number; // NEW: Key level to watch
  distanceToBreakout?: number; // NEW: % away from breakout
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

// NEW: Key metrics for comparison
interface KeyMetrics {
  rsi: number;
  rsiStatus: "oversold" | "normal" | "overbought";
  volumeChange: number; // % vs 10-day avg
  volumeStatus: "weak" | "normal" | "strong";
  sma200: number;
  aboveSma200: boolean;
  week52High: number;
  week52Low: number;
  distanceFrom52High: number; // % below 52w high
  distanceFrom52Low: number; // % above 52w low
  score3Pillars: number; // 0-3 score
  pillarTrend: boolean;
  pillarValue: boolean;
  pillarMomentum: boolean;
  // NEW: Proper Support/Resistance levels
  supportLevel: number;
  resistanceLevel: number;
  sma50Role: "support" | "resistance"; // Based on price position
  sma20Role: "support" | "resistance";
  // NEW: Risk/Reward Ratio
  rrRatio?: number;
  rrStatus?: "excellent" | "good" | "risky" | "bad";
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
  entryStatus: "ready" | "wait" | "late";
  metrics?: KeyMetrics; // NEW
}

// Calculate SMA
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

// Calculate RSI
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Find support and resistance levels
function findKeyLevels(
  highs: number[],
  lows: number[],
  closes: number[],
): {
  resistance: number;
  support: number;
  recentHigh: number;
  recentLow: number;
} {
  const recent20Highs = highs.slice(-20);
  const recent20Lows = lows.slice(-20);
  const recent40Highs = highs.slice(-40);
  const recent40Lows = lows.slice(-40);

  return {
    resistance: Math.max(...recent40Highs),
    support: Math.min(...recent40Lows),
    recentHigh: Math.max(...recent20Highs),
    recentLow: Math.min(...recent20Lows),
  };
}

// Detect Pullback to Support (FORMING - Good Entry!)
function detectPullbackToSupport(
  highs: number[],
  lows: number[],
  closes: number[],
  currentPrice: number,
  sma20: number,
  sma50: number,
): PatternResult | null {
  const keyLevels = findKeyLevels(highs, lows, closes);
  const rsi = calculateRSI(closes);

  // Uptrend: Price above SMA50
  const inUptrend = sma20 > sma50 && currentPrice > sma50;
  if (!inUptrend) return null;

  // Price pulled back to SMA20 or near recent low (support zone)
  const nearSma20 = Math.abs(currentPrice - sma20) / sma20 < 0.03;
  const nearSupport =
    (currentPrice - keyLevels.recentLow) / keyLevels.recentLow < 0.05;

  if (!nearSma20 && !nearSupport) return null;

  // RSI not oversold (not panic selling)
  const rsiBouncing = rsi > 30 && rsi < 50;

  const distanceToHigh =
    ((keyLevels.recentHigh - currentPrice) / currentPrice) * 100;

  return {
    name: "Pullback to Support",
    type: "continuation",
    signal: "bullish",
    status: "ready", // Good entry!
    confidence: rsiBouncing ? 75 : 60,
    description: nearSma20
      ? `กลับมาทดสอบ SMA20 (${sma20.toFixed(2)}) = จังหวะซื้อ!`
      : `ลงมาใกล้ Support (${keyLevels.recentLow.toFixed(2)}) = จังหวะซื้อ!`,
    entryZone: { low: keyLevels.recentLow, high: sma20 },
    breakoutLevel: keyLevels.recentHigh,
    distanceToBreakout: distanceToHigh,
    targetPrice: keyLevels.recentHigh,
    stopLoss: keyLevels.recentLow * 0.97,
  };
}

// Detect Near Breakout Level (READY - Watch closely!)
function detectNearBreakout(
  highs: number[],
  lows: number[],
  closes: number[],
  currentPrice: number,
): PatternResult | null {
  const keyLevels = findKeyLevels(highs, lows, closes);

  // Price within 3% of resistance
  const distanceToResistance =
    ((keyLevels.resistance - currentPrice) / currentPrice) * 100;

  if (distanceToResistance > 0 && distanceToResistance < 3) {
    // Check if making higher lows (compression)
    const last10Lows = lows.slice(-10);
    const firstHalf = last10Lows.slice(0, 5);
    const secondHalf = last10Lows.slice(5);
    const avgFirstLows =
      firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecondLows =
      secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const makingHigherLows = avgSecondLows > avgFirstLows;

    if (makingHigherLows) {
      return {
        name: "Near Breakout",
        type: "continuation",
        signal: "bullish",
        status: "ready",
        confidence: 70,
        description: `ใกล้ทะลุ Resistance (${keyLevels.resistance.toFixed(2)}) มาก! รอ Breakout!`,
        entryZone: { low: avgSecondLows, high: keyLevels.resistance },
        breakoutLevel: keyLevels.resistance,
        distanceToBreakout: distanceToResistance,
        targetPrice: keyLevels.resistance * 1.1, // 10% target
        stopLoss: avgSecondLows * 0.97,
      };
    }
  }

  return null;
}

// Detect Oversold Bounce (FORMING - Prepare to enter)
function detectOversoldBounce(
  closes: number[],
  lows: number[],
  currentPrice: number,
  sma50: number,
): PatternResult | null {
  const rsi = calculateRSI(closes);
  const keyLevels = findKeyLevels([], lows, closes);

  // RSI oversold (< 35) = potential bounce
  if (rsi >= 35) return null;

  // Check if price starting to bounce (today's close > yesterday's low)
  const todayClose = closes[closes.length - 1];
  const yesterdayLow = lows[lows.length - 2];
  const startingToBounce = todayClose > yesterdayLow;

  if (!startingToBounce) {
    return {
      name: "Oversold (Forming)",
      type: "reversal",
      signal: "bullish",
      status: "forming", // Not ready yet
      confidence: 45,
      description: `RSI ${rsi.toFixed(0)} = Oversold! รอสัญญาณ bounce ก่อนเข้า`,
      breakoutLevel: sma50,
      distanceToBreakout: ((sma50 - currentPrice) / currentPrice) * 100,
      stopLoss: keyLevels.recentLow * 0.95,
    };
  }

  return {
    name: "Oversold Bounce",
    type: "reversal",
    signal: "bullish",
    status: "ready",
    confidence: 65,
    description: `RSI ${rsi.toFixed(0)} + เริ่มเด้ง = เข้าได้!`,
    entryZone: { low: keyLevels.recentLow, high: currentPrice * 1.02 },
    breakoutLevel: sma50,
    distanceToBreakout: ((sma50 - currentPrice) / currentPrice) * 100,
    targetPrice: sma50,
    stopLoss: keyLevels.recentLow * 0.95,
  };
}

// Detect Overbought (CONFIRMED - Too late!)
function detectOverbought(
  closes: number[],
  highs: number[],
  currentPrice: number,
): PatternResult | null {
  const rsi = calculateRSI(closes);
  const keyLevels = findKeyLevels(highs, [], closes);

  // RSI overbought (> 70) = already ran up
  if (rsi < 70) return null;

  // Price at or above recent high
  const atHigh = currentPrice >= keyLevels.recentHigh * 0.98;

  if (atHigh) {
    return {
      name: "Overbought (Late)",
      type: "reversal",
      signal: "bearish",
      status: "confirmed", // Too late to buy!
      confidence: 60,
      description: `RSI ${rsi.toFixed(0)} + ราคาสูง = ซื้อตอนนี้เสี่ยง! ⚠️`,
      breakoutLevel: keyLevels.recentHigh,
      distanceToBreakout: 0,
    };
  }

  return null;
}

// Detect Consolidation (FORMING - Prepare for breakout)
function detectConsolidation(
  highs: number[],
  lows: number[],
  closes: number[],
  currentPrice: number,
): PatternResult | null {
  const last15Highs = highs.slice(-15);
  const last15Lows = lows.slice(-15);

  const rangeHigh = Math.max(...last15Highs);
  const rangeLow = Math.min(...last15Lows);
  const range = (rangeHigh - rangeLow) / rangeLow;

  // Tight range (< 8% over 15 days) = consolidation
  if (range > 0.08) return null;

  // Check if near top or bottom of range
  const positionInRange = (currentPrice - rangeLow) / (rangeHigh - rangeLow);

  if (positionInRange > 0.7) {
    // Near top - ready for breakout
    return {
      name: "Consolidation (Near Top)",
      type: "continuation",
      signal: "bullish",
      status: "ready",
      confidence: 60,
      description: `กล่องแคบ ${(range * 100).toFixed(1)}% = ใกล้ Breakout! รอทะลุ ${rangeHigh.toFixed(2)}`,
      entryZone: { low: rangeLow, high: currentPrice },
      breakoutLevel: rangeHigh,
      distanceToBreakout: ((rangeHigh - currentPrice) / currentPrice) * 100,
      targetPrice: rangeHigh + (rangeHigh - rangeLow),
      stopLoss: rangeLow * 0.97,
    };
  }

  if (positionInRange < 0.3) {
    // Near bottom - good entry if uptrend
    return {
      name: "Consolidation (Near Bottom)",
      type: "continuation",
      signal: "bullish",
      status: "forming",
      confidence: 50,
      description: `กล่องแคบ ราคาใกล้ Support ${rangeLow.toFixed(2)} = รอยืนยันก่อน`,
      entryZone: { low: rangeLow, high: rangeLow * 1.02 },
      breakoutLevel: rangeHigh,
      distanceToBreakout: ((rangeHigh - currentPrice) / currentPrice) * 100,
      targetPrice: rangeHigh,
      stopLoss: rangeLow * 0.97,
    };
  }

  return null;
}

// Analyze trend
function analyzeTrend(closes: number[]): TrendAnalysis {
  const currentPrice = closes[closes.length - 1];
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);

  let shortTerm: "up" | "down" | "sideways" = "sideways";
  let longTerm: "up" | "down" | "sideways" = "sideways";

  if (currentPrice > sma20 * 1.02) shortTerm = "up";
  else if (currentPrice < sma20 * 0.98) shortTerm = "down";

  if (sma20 > sma50 * 1.02) longTerm = "up";
  else if (sma20 < sma50 * 0.98) longTerm = "down";

  let strength = 50;
  if (shortTerm === longTerm && shortTerm !== "sideways") {
    strength = 80;
  } else if (shortTerm !== longTerm) {
    strength = 40;
  }

  return { shortTerm, longTerm, sma20, sma50, currentPrice, strength };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase() || "AAPL";

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) throw new Error(`Failed to fetch data for ${symbol}`);

    const data = await response.json();
    const chart = data.chart.result?.[0];

    if (!chart || !chart.indicators?.quote?.[0]) {
      throw new Error(`No data available for ${symbol}`);
    }

    const quotes = chart.indicators.quote[0];
    const closes: number[] = quotes.close.filter(
      (p: number | null) => p !== null,
    );
    const highs: number[] = quotes.high.filter(
      (p: number | null) => p !== null,
    );
    const lows: number[] = quotes.low.filter((p: number | null) => p !== null);

    if (closes.length < 30) throw new Error(`Insufficient data for ${symbol}`);

    const currentPrice = closes[closes.length - 1];
    const previousClose = closes[closes.length - 2];
    const priceChange = currentPrice - previousClose;
    const priceChangePercent = (priceChange / previousClose) * 100;

    const trend = analyzeTrend(closes);
    const patterns: PatternResult[] = [];

    // ========== NEW PATTERN DETECTION ==========
    // Prioritize FORMING and READY patterns (good entries)

    // 1. Pullback to support in uptrend
    const pullback = detectPullbackToSupport(
      highs,
      lows,
      closes,
      currentPrice,
      trend.sma20,
      trend.sma50,
    );
    if (pullback) patterns.push(pullback);

    // 2. Near breakout level
    const nearBreakout = detectNearBreakout(highs, lows, closes, currentPrice);
    if (nearBreakout) patterns.push(nearBreakout);

    // 3. Oversold bounce
    const oversold = detectOversoldBounce(
      closes,
      lows,
      currentPrice,
      trend.sma50,
    );
    if (oversold) patterns.push(oversold);

    // 4. Overbought (warning - too late)
    const overbought = detectOverbought(closes, highs, currentPrice);
    if (overbought) patterns.push(overbought);

    // 5. Consolidation pattern
    const consolidation = detectConsolidation(
      highs,
      lows,
      closes,
      currentPrice,
    );
    if (consolidation) patterns.push(consolidation);

    // ========== DETERMINE ENTRY STATUS ==========
    let entryStatus: "ready" | "wait" | "late" = "wait";

    const readyPatterns = patterns.filter((p) => p.status === "ready");
    const confirmedPatterns = patterns.filter((p) => p.status === "confirmed");

    if (readyPatterns.length > 0 && confirmedPatterns.length === 0) {
      entryStatus = "ready"; // Good entry!
    } else if (confirmedPatterns.length > 0) {
      entryStatus = "late"; // Too late, already moved
    }

    // ========== DETERMINE SIGNAL ==========
    let overallSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
    let signalStrength = 50;

    if (entryStatus === "ready") {
      const bullishReady = readyPatterns.filter((p) => p.signal === "bullish");
      const bearishReady = readyPatterns.filter((p) => p.signal === "bearish");

      if (bullishReady.length > bearishReady.length) {
        overallSignal = "BUY";
        signalStrength = 60 + bullishReady.length * 10;
      } else if (bearishReady.length > bullishReady.length) {
        overallSignal = "SELL";
        signalStrength = 60 + bearishReady.length * 10;
      }
    } else if (entryStatus === "late") {
      overallSignal = "HOLD";
      signalStrength = 30; // Low confidence - missed the move
    }

    // Boost if trend aligns
    if (overallSignal === "BUY" && trend.shortTerm === "up")
      signalStrength += 10;
    if (overallSignal === "SELL" && trend.shortTerm === "down")
      signalStrength += 10;

    signalStrength = Math.min(90, signalStrength);

    // ========== CALCULATE KEY METRICS ==========
    const volumes: number[] =
      quotes.volume?.filter((v: number | null) => v !== null) || [];
    const rsi = calculateRSI(closes);
    const sma200 = calculateSMA(closes, Math.min(closes.length, 60)); // Use available data for trend

    // Volume analysis
    const todayVolume = volumes[volumes.length - 1] || 0;
    const avgVolume10 = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const volumeChange =
      avgVolume10 > 0 ? ((todayVolume - avgVolume10) / avgVolume10) * 100 : 0;

    // 52-week range (use 3-month data)
    const week52High = Math.max(...highs);
    const week52Low = Math.min(...lows);
    const distanceFrom52High = ((week52High - currentPrice) / week52High) * 100;
    const distanceFrom52Low = ((currentPrice - week52Low) / week52Low) * 100;

    // 3 Pillars Check
    const pillarTrend = trend.shortTerm === "up" && trend.longTerm !== "down";
    const pillarValue = rsi >= 30 && rsi <= 70; // Not oversold or overbought
    const pillarMomentum = volumeChange > -20; // Volume not too weak
    const score3Pillars = [pillarTrend, pillarValue, pillarMomentum].filter(
      Boolean,
    ).length;

    // ========== PROPER SUPPORT/RESISTANCE LOGIC ==========
    // Key rule: If price < SMA, then SMA = Resistance (not Support!)
    const sma50Role: "support" | "resistance" =
      currentPrice > trend.sma50 ? "support" : "resistance";
    const sma20Role: "support" | "resistance" =
      currentPrice > trend.sma20 ? "support" : "resistance";

    // Determine proper support and resistance levels
    let supportLevel = week52Low;
    let resistanceLevel = week52High;

    if (currentPrice > trend.sma50) {
      // Price above SMA50 = SMA50 is support
      supportLevel = trend.sma50;
    } else if (currentPrice > trend.sma20) {
      // Price above SMA20 but below SMA50
      supportLevel = trend.sma20;
      resistanceLevel = trend.sma50;
    } else {
      // Price below both SMAs = recent lows are support, SMAs are resistance
      supportLevel = week52Low;
      resistanceLevel = trend.sma20; // First resistance to break
    }

    // ========== R/R RATIO CALCULATION ==========
    // Get entry, target, stopLoss from first pattern if available
    const firstPattern = patterns[0];
    let rrRatio: number | undefined;
    let rrStatus: "excellent" | "good" | "risky" | "bad" | undefined;

    if (firstPattern?.targetPrice && firstPattern?.stopLoss) {
      const entryPrice = currentPrice;
      const potentialGain = firstPattern.targetPrice - entryPrice;
      const potentialLoss = entryPrice - firstPattern.stopLoss;

      if (potentialLoss > 0) {
        rrRatio = potentialGain / potentialLoss;

        // Determine R/R status
        if (rrRatio >= 3) rrStatus = "excellent";
        else if (rrRatio >= 2) rrStatus = "good";
        else if (rrRatio >= 1.5) rrStatus = "risky";
        else rrStatus = "bad"; // < 1.5 = not worth the risk!
      }
    }

    const metrics: KeyMetrics = {
      rsi,
      rsiStatus: rsi < 30 ? "oversold" : rsi > 70 ? "overbought" : "normal",
      volumeChange,
      volumeStatus:
        volumeChange > 20 ? "strong" : volumeChange < -20 ? "weak" : "normal",
      sma200,
      aboveSma200: currentPrice > sma200,
      week52High,
      week52Low,
      distanceFrom52High,
      distanceFrom52Low,
      score3Pillars,
      pillarTrend,
      pillarValue,
      pillarMomentum,
      // NEW: Support/Resistance with proper logic
      supportLevel,
      resistanceLevel,
      sma50Role,
      sma20Role,
      // NEW: R/R Ratio
      rrRatio,
      rrStatus,
    };

    return NextResponse.json({
      symbol,
      currentPrice,
      priceChange,
      priceChangePercent,
      patterns,
      trend,
      overallSignal,
      signalStrength,
      entryStatus,
      metrics,
    } as PatternResponse);
  } catch (error) {
    console.error("Pattern API Error:", error);
    return NextResponse.json({
      symbol,
      currentPrice: 0,
      priceChange: 0,
      priceChangePercent: 0,
      patterns: [],
      trend: {
        shortTerm: "sideways",
        longTerm: "sideways",
        sma20: 0,
        sma50: 0,
        currentPrice: 0,
        strength: 50,
      },
      overallSignal: "HOLD",
      signalStrength: 50,
      entryStatus: "wait",
      error: "Failed to fetch data",
    });
  }
}

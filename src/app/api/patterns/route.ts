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
  metrics?: KeyMetrics;
  advancedIndicators?: AdvancedIndicators; // NEW: Institutional-grade indicators
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

// ========== ADVANCED INDICATORS (Institutional Grade) ==========

// MACD Result Interface
interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
  trend: "bullish" | "bearish" | "neutral";
  histogramTrend: "expanding" | "contracting" | "flat";
  lossOfMomentum: boolean; // Histogram shrinking = warning!
}

// OBV Result Interface
interface OBVResult {
  obv: number;
  obvTrend: "up" | "down" | "flat";
  obvDivergence: "bullish" | "bearish" | "none";
}

// Divergence Detection Result
interface DivergenceResult {
  type: "bullish" | "bearish" | "none";
  indicator: string;
  description: string;
  severity: "strong" | "moderate" | "weak";
}

// Trend Phase (Dow Theory)
type TrendPhase =
  | "accumulation"
  | "participation"
  | "distribution"
  | "markdown"
  | "unknown";

// Candlestick Pattern Interface
interface CandlePattern {
  name:
    | "Bullish Hammer"
    | "Bullish Engulfing"
    | "Doji"
    | "Inverted Hammer"
    | "None";
  signal: "bullish" | "neutral";
  confidence: number; // 0-100
}

// Indicator Matrix (Weighted Scoring)
interface IndicatorMatrix {
  dowTheory: {
    signal: "bullish" | "bearish" | "neutral";
    weight: number;
    score: number;
  };
  rsi: {
    signal: "bullish" | "bearish" | "neutral";
    weight: number;
    score: number;
  };
  macd: {
    signal: "bullish" | "bearish" | "neutral";
    weight: number;
    score: number;
  };
  volume: {
    signal: "bullish" | "bearish" | "neutral";
    weight: number;
    score: number;
  };
  candle?: {
    signal: "bullish" | "bearish" | "neutral";
    weight: number;
    score: number;
  };
  totalScore: number; // -100 to +100
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
}

// Advanced Indicators Container
interface AdvancedIndicators {
  macd: MACDResult;
  obv: OBVResult;
  divergences: DivergenceResult[];
  trendPhase: TrendPhase;
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
}

// Calculate EMA (for MACD)
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
}

// Calculate MACD with Histogram Analysis
function calculateMACD(closes: number[]): MACDResult {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = ema12 - ema26;

  // Calculate Signal Line (9-period EMA of MACD)
  const macdValues: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdValues.push(e12 - e26);
  }
  const signalLine =
    macdValues.length >= 9 ? calculateEMA(macdValues, 9) : macdLine;
  const histogram = macdLine - signalLine;

  // Analyze histogram trend (last 5 values)
  const recentHistograms: number[] = [];
  for (let i = Math.max(0, macdValues.length - 5); i < macdValues.length; i++) {
    const sig =
      macdValues.length >= 9
        ? calculateEMA(macdValues.slice(0, i + 1), 9)
        : macdValues[i];
    recentHistograms.push(macdValues[i] - sig);
  }

  let histogramTrend: "expanding" | "contracting" | "flat" = "flat";
  if (recentHistograms.length >= 3) {
    const absRecent = recentHistograms.map(Math.abs);
    const isExpanding =
      absRecent[absRecent.length - 1] > absRecent[absRecent.length - 2];
    const isContracting =
      absRecent[absRecent.length - 1] < absRecent[absRecent.length - 2];
    histogramTrend = isExpanding
      ? "expanding"
      : isContracting
        ? "contracting"
        : "flat";
  }

  // Loss of Momentum: Histogram shrinking while price making new highs
  const lossOfMomentum =
    histogramTrend === "contracting" &&
    Math.abs(histogram) < Math.abs(recentHistograms[0] || 0);

  return {
    macdLine,
    signalLine,
    histogram,
    trend:
      macdLine > signalLine
        ? "bullish"
        : macdLine < signalLine
          ? "bearish"
          : "neutral",
    histogramTrend,
    lossOfMomentum,
  };
}

// Calculate OBV (On-Balance Volume)
function calculateOBV(closes: number[], volumes: number[]): OBVResult {
  if (closes.length < 2 || volumes.length < 2) {
    return { obv: 0, obvTrend: "flat", obvDivergence: "none" };
  }

  let obv = 0;
  const obvHistory: number[] = [0];

  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i] || 0;
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i] || 0;
    }
    obvHistory.push(obv);
  }

  // Determine OBV trend (last 10 days)
  const recent10OBV = obvHistory.slice(-10);
  const obvStart = recent10OBV[0];
  const obvEnd = recent10OBV[recent10OBV.length - 1];
  const obvTrend: "up" | "down" | "flat" =
    obvEnd > obvStart * 1.05
      ? "up"
      : obvEnd < obvStart * 0.95
        ? "down"
        : "flat";

  // Detect OBV Divergence
  const priceStart = closes[closes.length - 10] || closes[0];
  const priceEnd = closes[closes.length - 1];
  const priceUp = priceEnd > priceStart;
  const priceDown = priceEnd < priceStart;

  let obvDivergence: "bullish" | "bearish" | "none" = "none";
  if (priceDown && obvTrend === "up") obvDivergence = "bullish";
  else if (priceUp && obvTrend === "down") obvDivergence = "bearish";

  return { obv, obvTrend, obvDivergence };
}

// Calculate ATR (Average True Range) - 14 period
function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
): number {
  if (highs.length < 15) return 0;

  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hpc = Math.abs(highs[i] - closes[i - 1]);
    const lpc = Math.abs(lows[i] - closes[i - 1]);
    trs.push(Math.max(hl, hpc, lpc));
  }

  // Return SMA of TR for the last 14 periods
  return calculateSMA(trs, 14);
}

// Candlestick Pattern Detection
function detectCandlePattern(
  opens: number[],
  highs: number[],
  lows: number[],
  closes: number[],
): CandlePattern {
  const i = closes.length - 1;
  if (i < 1) return { name: "None", signal: "neutral", confidence: 0 };

  const currentClose = closes[i];
  const currentOpen = opens[i];
  const currentHigh = highs[i];
  const currentLow = lows[i];
  const bodySize = Math.abs(currentClose - currentOpen);
  const candleRange = currentHigh - currentLow;
  const upperShadow = currentHigh - Math.max(currentOpen, currentClose);
  const lowerShadow = Math.min(currentOpen, currentClose) - currentLow;

  // 1. Hammer (Bottom reversal)
  if (lowerShadow > bodySize * 2 && upperShadow < bodySize * 0.5) {
    return { name: "Bullish Hammer", signal: "bullish", confidence: 75 };
  }

  // 2. Bullish Engulfing
  const prevClose = closes[i - 1];
  const prevOpen = opens[i - 1];
  if (
    currentClose > currentOpen &&
    prevClose < prevOpen &&
    currentClose > prevOpen &&
    currentOpen < prevClose
  ) {
    return { name: "Bullish Engulfing", signal: "bullish", confidence: 85 };
  }

  // 3. Doji (Indecision)
  if (bodySize < candleRange * 0.1) {
    return { name: "Doji", signal: "neutral", confidence: 50 };
  }

  // 4. Inverted Hammer
  if (upperShadow > bodySize * 2 && lowerShadow < bodySize * 0.5) {
    return { name: "Inverted Hammer", signal: "bullish", confidence: 60 };
  }

  return { name: "None", signal: "neutral", confidence: 0 };
}

// Detect RSI Divergence
function detectRSIDivergence(
  closes: number[],
  period: number = 14,
): DivergenceResult {
  if (closes.length < period + 20) {
    return {
      type: "none",
      indicator: "RSI",
      description: "",
      severity: "weak",
    };
  }

  // Get RSI values for last 20 periods
  const rsiValues: number[] = [];
  for (let i = period + 1; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    rsiValues.push(calculateRSI(slice, period));
  }

  const recent20RSI = rsiValues.slice(-20);
  const recent20Price = closes.slice(-20);

  // Find peaks and valleys
  const priceHigh1 = Math.max(...recent20Price.slice(0, 10));
  const priceHigh2 = Math.max(...recent20Price.slice(10));
  const rsiHigh1 = Math.max(...recent20RSI.slice(0, 10));
  const rsiHigh2 = Math.max(...recent20RSI.slice(10));

  const priceLow1 = Math.min(...recent20Price.slice(0, 10));
  const priceLow2 = Math.min(...recent20Price.slice(10));
  const rsiLow1 = Math.min(...recent20RSI.slice(0, 10));
  const rsiLow2 = Math.min(...recent20RSI.slice(10));

  // Bearish Divergence: Higher High in price, Lower High in RSI
  if (priceHigh2 > priceHigh1 && rsiHigh2 < rsiHigh1 * 0.95) {
    const severity = rsiHigh2 < rsiHigh1 * 0.85 ? "strong" : "moderate";
    return {
      type: "bearish",
      indicator: "RSI",
      description: `ราคาทำ Higher High แต่ RSI ทำ Lower High = Momentum อ่อนแรง!`,
      severity,
    };
  }

  // Bullish Divergence: Lower Low in price, Higher Low in RSI
  if (priceLow2 < priceLow1 && rsiLow2 > rsiLow1 * 1.05) {
    const severity = rsiLow2 > rsiLow1 * 1.15 ? "strong" : "moderate";
    return {
      type: "bullish",
      indicator: "RSI",
      description: `ราคาทำ Lower Low แต่ RSI ทำ Higher Low = กำลังจะกลับตัวขึ้น!`,
      severity,
    };
  }

  return { type: "none", indicator: "RSI", description: "", severity: "weak" };
}

// Detect Trend Phase (Dow Theory)
function detectTrendPhase(
  closes: number[],
  volumes: number[],
  rsi: number,
): TrendPhase {
  if (closes.length < 40) return "unknown";

  const recent10 = closes.slice(-10);
  const prev10 = closes.slice(-20, -10);
  const prev30 = closes.slice(-40, -10);

  const avgRecent = recent10.reduce((a, b) => a + b, 0) / 10;
  const avgPrev10 = prev10.reduce((a, b) => a + b, 0) / 10;
  const avgPrev30 = prev30.reduce((a, b) => a + b, 0) / 30;

  const recentVolume = volumes.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const prevVolume = volumes.slice(-20, -10).reduce((a, b) => a + b, 0) / 10;

  // Accumulation: Price flat/slightly up, low volume, RSI recovering from oversold
  if (
    avgRecent > avgPrev30 &&
    avgRecent < avgPrev10 * 1.05 &&
    rsi < 50 &&
    recentVolume < prevVolume
  ) {
    return "accumulation";
  }

  // Participation: Strong uptrend with increasing volume
  if (
    avgRecent > avgPrev10 * 1.05 &&
    avgRecent > avgPrev30 * 1.1 &&
    recentVolume > prevVolume
  ) {
    return "participation";
  }

  // Distribution: Price near highs but volume declining, RSI overbought
  if (
    avgRecent > avgPrev30 * 1.1 &&
    rsi > 60 &&
    recentVolume < prevVolume * 0.8
  ) {
    return "distribution";
  }

  // Markdown: Downtrend with increasing volume
  if (avgRecent < avgPrev10 * 0.95 && avgRecent < avgPrev30 * 0.9) {
    return "markdown";
  }

  return "unknown";
}

// Interpret RSI by Market Regime
function interpretRSI(
  rsi: number,
  shortTrend: "up" | "down" | "sideways",
): string {
  if (shortTrend === "up") {
    // Strong Bull: RSI 40-50 is support
    if (rsi >= 40 && rsi <= 55) return "RSI ลงมาแตะแนวรับ = Buy on Dip!";
    if (rsi > 70) return "RSI Overbought แต่ในขาขึ้น ยังไม่ต้องขาย";
    if (rsi < 40) return "RSI หลุดแนวรับ = อาจเปลี่ยนเทรนด์";
    return "RSI ปกติในขาขึ้น";
  }

  if (shortTrend === "down") {
    // Strong Bear: RSI 50-60 is resistance
    if (rsi >= 50 && rsi <= 60) return "RSI ขึ้นมาชนแนวต้าน = Short on Rally!";
    if (rsi < 30) return "RSI Oversold แต่ในขาลง อาจลงต่อ";
    if (rsi > 60) return "RSI ทะลุแนวต้าน = อาจเปลี่ยนเทรนด์";
    return "RSI ปกติในขาลง";
  }

  // Sideways: Use overbought/oversold
  if (rsi > 70) return "RSI Overbought = Mean Reversion ขายได้";
  if (rsi < 30) return "RSI Oversold = Mean Reversion ซื้อได้";
  return "RSI ปกติในตลาด Sideways";
}

// Calculate Indicator Matrix (Weighted Scoring)
function calculateIndicatorMatrix(
  closes: number[],
  highs: number[],
  lows: number[],
  volumes: number[],
  trend: TrendAnalysis,
  rsi: number,
  macd: MACDResult,
  obv: OBVResult,
  candle: CandlePattern,
): IndicatorMatrix {
  // Dow Theory (40% weight) - Based on price structure
  const currentPrice = closes[closes.length - 1];
  const recentHighs = highs.slice(-20);
  const recentLows = lows.slice(-20);
  const higherHigh =
    Math.max(...recentHighs.slice(-10)) > Math.max(...recentHighs.slice(0, 10));
  const higherLow =
    Math.min(...recentLows.slice(-10)) > Math.min(...recentLows.slice(0, 10));
  const lowerLow =
    Math.min(...recentLows.slice(-10)) < Math.min(...recentLows.slice(0, 10));
  const lowerHigh =
    Math.max(...recentHighs.slice(-10)) < Math.max(...recentHighs.slice(0, 10));

  let dowSignal: "bullish" | "bearish" | "neutral" = "neutral";
  let dowScore = 0;
  if (higherHigh && higherLow) {
    dowSignal = "bullish";
    dowScore = 40;
  } else if (lowerLow && lowerHigh) {
    dowSignal = "bearish";
    dowScore = -40;
  }

  // RSI (20% weight)
  let rsiSignal: "bullish" | "bearish" | "neutral" = "neutral";
  let rsiScore = 0;
  if (rsi < 35) {
    rsiSignal = "bullish";
    rsiScore = 20;
  } // Oversold = buy opportunity
  else if (rsi > 65) {
    rsiSignal = "bearish";
    rsiScore = -20;
  } // Overbought

  // MACD (20% weight)
  let macdSignal: "bullish" | "bearish" | "neutral" = macd.trend;
  let macdScore =
    macd.trend === "bullish" ? 20 : macd.trend === "bearish" ? -20 : 0;
  // Reduce score if loss of momentum
  if (macd.lossOfMomentum) macdScore = Math.round(macdScore * 0.5);

  // Volume (20% weight) - OBV confirmation
  let volumeSignal: "bullish" | "bearish" | "neutral" = "neutral";
  let volumeScore = 0;
  if (obv.obvTrend === "up" && trend.shortTerm === "up") {
    volumeSignal = "bullish";
    volumeScore = 20; // Volume confirms uptrend
  } else if (obv.obvTrend === "down" && trend.shortTerm === "down") {
    volumeSignal = "bearish";
    volumeScore = -20; // Volume confirms downtrend
  } else if (obv.obvDivergence === "bearish") {
    volumeSignal = "bearish";
    volumeScore = -15; // Divergence warning
  } else if (obv.obvDivergence === "bullish") {
    volumeSignal = "bullish";
    volumeScore = 15;
  }

  // NEW: Candlestick Confirmation (Bonus 20%)
  let candleSignal: "bullish" | "bearish" | "neutral" = "neutral";
  let candleScore = 0;
  if (candle.signal === "bullish") {
    candleSignal = "bullish";
    candleScore = 20;
  }

  const totalScore =
    dowScore + rsiScore + macdScore + volumeScore + candleScore;

  let recommendation: IndicatorMatrix["recommendation"] = "HOLD";
  if (totalScore >= 60) recommendation = "STRONG_BUY";
  else if (totalScore >= 30) recommendation = "BUY";
  else if (totalScore <= -60) recommendation = "STRONG_SELL";
  else if (totalScore <= -30) recommendation = "SELL";

  return {
    dowTheory: { signal: dowSignal, weight: 40, score: dowScore },
    rsi: { signal: rsiSignal, weight: 20, score: rsiScore },
    macd: { signal: macdSignal, weight: 20, score: macdScore },
    volume: { signal: volumeSignal, weight: 20, score: volumeScore },
    candle: { signal: candleSignal, weight: 20, score: candleScore },
    totalScore,
    recommendation,
  };
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

// ========== MARKET CONTEXT (VIX/QQQ) ==========
let cachedMarketContext: {
  vixValue: number;
  qqqTrend: "bullish" | "bearish" | "neutral";
  marketTemperature: "hot" | "normal" | "cold";
  timestamp: number;
} | null = null;

async function getMarketContext() {
  const now = Date.now();
  if (cachedMarketContext && now - cachedMarketContext.timestamp < 300000) {
    // 5 min cache
    return cachedMarketContext;
  }

  try {
    // Fetch VIX and QQQ
    const [vixRes, qqqRes] = await Promise.all([
      fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/^VIX?interval=1d&range=1mo",
        { headers: { "User-Agent": "Mozilla/5.0" } },
      ),
      fetch(
        "https://query1.finance.yahoo.com/v8/finance/chart/QQQ?interval=1d&range=3mo",
        { headers: { "User-Agent": "Mozilla/5.0" } },
      ),
    ]);

    const vixData = await vixRes.json();
    const qqqData = await qqqRes.json();

    const vixValue = vixData.chart.result?.[0]?.meta?.regularMarketPrice || 20;
    const qqqCloses =
      qqqData.chart.result?.[0]?.indicators?.quote?.[0]?.close || [];

    // QQQ Trend (last 10 days)
    const qqqSma20 = calculateSMA(qqqCloses, 20);
    const qqqPrice = qqqCloses[qqqCloses.length - 1] || 0;
    const qqqTrend =
      qqqPrice > qqqSma20
        ? "bullish"
        : qqqPrice < qqqSma20 * 0.98
          ? "bearish"
          : "neutral";

    // Market Temperature based on VIX
    // VIX > 25 = Hot (Scary/Volatile), VIX < 15 = Cold (Calm/Greedy)
    const marketTemperature =
      vixValue > 25 ? "hot" : vixValue < 15 ? "cold" : "normal";

    cachedMarketContext = {
      vixValue,
      qqqTrend,
      marketTemperature,
      timestamp: now,
    };
    return cachedMarketContext;
  } catch (e) {
    console.error("Failed to fetch market context:", e);
    return {
      vixValue: 20,
      qqqTrend: "neutral" as const,
      marketTemperature: "normal" as const,
      timestamp: now,
    };
  }
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
    const opens: number[] = quotes.open.filter(
      (p: number | null) => p !== null,
    );

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

    // ========== CALCULATE ADVANCED INDICATORS ==========
    const macd = calculateMACD(closes);
    const obv = calculateOBV(closes, volumes);
    const rsiDivergence = detectRSIDivergence(closes);
    const trendPhase = detectTrendPhase(closes, volumes, rsi);
    const rsiInterpretation = interpretRSI(rsi, trend.shortTerm);
    const candlePattern = detectCandlePattern(opens, highs, lows, closes);
    const atr = calculateATR(highs, lows, closes);

    const indicatorMatrix = calculateIndicatorMatrix(
      closes,
      highs,
      lows,
      volumes,
      trend,
      rsi,
      macd,
      obv,
      candlePattern,
    );

    // Check volume confirmation
    const volumeConfirmation =
      (trend.shortTerm === "up" && obv.obvTrend === "up") ||
      (trend.shortTerm === "down" && obv.obvTrend === "down");

    // Collect all divergences
    const divergences: DivergenceResult[] = [];
    if (rsiDivergence.type !== "none") {
      divergences.push(rsiDivergence);
    }
    if (obv.obvDivergence !== "none") {
      divergences.push({
        type: obv.obvDivergence,
        indicator: "OBV",
        description:
          obv.obvDivergence === "bearish"
            ? "⚠️ ราคาขึ้นแต่ OBV ลง = Smart Money กำลังขาย!"
            : "✅ ราคาลงแต่ OBV ขึ้น = Smart Money กำลังซื้อ!",
        severity: "moderate",
      });
    }
    if (macd.lossOfMomentum) {
      divergences.push({
        type: macd.trend === "bullish" ? "bearish" : "bullish",
        indicator: "MACD",
        description: "⚠️ MACD Histogram หดตัว = Momentum กำลังหมด!",
        severity: "moderate",
      });
    }

    const marketContextData = await getMarketContext();
    const marketContext = {
      vixValue: marketContextData.vixValue,
      qqqTrend: marketContextData.qqqTrend,
      marketTemperature: marketContextData.marketTemperature,
    };

    // ========== FETCH EARNINGS DATA (Sniper Tip #3) ==========
    let daysToEarnings: number | undefined;
    try {
      const earningsRes = await fetch(
        `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${symbol}?modules=calendarEvents`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          next: { revalidate: 3600 },
        },
      );
      if (earningsRes.ok) {
        const eData = await earningsRes.json();
        const earningsDateStr =
          eData.quoteSummary?.result?.[0]?.calendarEvents?.earnings
            ?.earningsDate?.[0]?.fmt;
        if (earningsDateStr) {
          const eDate = new Date(earningsDateStr);
          const diff = eDate.getTime() - Date.now();
          daysToEarnings = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch earnings for", symbol);
    }

    const advancedIndicators: AdvancedIndicators = {
      macd,
      obv,
      divergences,
      trendPhase,
      indicatorMatrix,
      volumeConfirmation,
      rsiInterpretation,
      candlePattern,
      atr,
      marketContext,
      daysToEarnings,
    };

    // ========== FIX: UNIFIED SIGNAL LOGIC (Matrix + Divergence Integrated) ==========
    // Rule 1: Matrix score determines base signal (not just patterns)
    // Rule 2: Divergences penalize confidence
    // Rule 3: Overbought/Late status overrides positive scores

    const matrixScore = indicatorMatrix.totalScore;
    const hasBearishDivergence = divergences.some((d) => d.type === "bearish");
    const hasBullishDivergence = divergences.some((d) => d.type === "bullish");
    const isOverbought = rsi > 70;
    const isOversold = rsi < 30;

    // Start with Matrix recommendation as base
    let finalSignal: "BUY" | "SELL" | "HOLD" = "HOLD";
    let finalStrength = 50;

    // === DETERMINE BASE SIGNAL FROM MATRIX ===
    if (matrixScore >= 60) {
      finalSignal = "BUY";
      finalStrength = 80;
    } else if (matrixScore >= 30) {
      finalSignal = "BUY";
      finalStrength = 65;
    } else if (matrixScore <= -60) {
      finalSignal = "SELL";
      finalStrength = 80;
    } else if (matrixScore <= -30) {
      finalSignal = "SELL";
      finalStrength = 65;
    } else {
      finalSignal = "HOLD";
      finalStrength = 50;
    }

    // === RULE: Candlestick Confirmation boost ===
    if (candlePattern.signal === "bullish" && finalSignal === "BUY") {
      finalStrength += 15;
    }

    // === RULE: If score < 20, NEVER show BUY (user's fix #1) ===
    if (matrixScore < 20 && finalSignal === "BUY") {
      finalSignal = "HOLD";
      finalStrength = Math.min(55, finalStrength); // Cap at 55% (wait for dip)
    }

    // === RULE: Bearish Divergence = Max 70% confidence (user's fix #2) ===
    if (hasBearishDivergence && finalSignal === "BUY") {
      finalStrength = Math.min(70, finalStrength);
      // If strong divergence, downgrade further
      const strongDivergence = divergences.some((d) => d.severity === "strong");
      if (strongDivergence) {
        finalStrength = Math.min(60, finalStrength);
      }
    }

    // === RULE: Bullish Divergence on SELL = boost confidence ===
    if (hasBullishDivergence && finalSignal === "SELL") {
      finalStrength = Math.min(70, finalStrength); // Be cautious on sells with bullish divergence
    }

    // === RULE: Overbought = Late, cap confidence (user's fix #3) ===
    if (isOverbought) {
      // Overbought = "late" regardless of what Matrix says
      if (finalSignal === "BUY") {
        finalSignal = "HOLD";
        finalStrength = 35; // Late = low confidence
      }
      // Update entry status
      entryStatus = "late";
    }

    // === RULE: Oversold with bullish signal = good entry ===
    if (isOversold && matrixScore > 0) {
      finalSignal = "BUY";
      finalStrength = Math.max(finalStrength, 65); // Boost confidence for oversold bounces
      entryStatus = "ready";
    }

    // === RULE: If entry was marked late from patterns, respect that ===
    if (entryStatus === "late" && finalSignal === "BUY") {
      finalStrength = Math.min(40, finalStrength); // Late = low confidence even if Matrix is positive
    }

    // === RULE: R/R Ratio affects recommendation ===
    if (rrStatus === "bad" && finalSignal === "BUY") {
      // R/R not worth it = suggest WAIT instead
      finalStrength = Math.min(50, finalStrength);
    } else if (rrStatus === "excellent" && finalSignal === "BUY") {
      finalStrength = Math.min(90, finalStrength + 10); // Boost for excellent R/R
    }

    // === RULE: Volume must confirm (reduce confidence if not) ===
    if (!volumeConfirmation && finalSignal !== "HOLD") {
      finalStrength = Math.max(40, finalStrength - 10);
    }

    // === RULE: Loss of Momentum warning ===
    if (macd.lossOfMomentum && finalSignal === "BUY") {
      finalStrength = Math.min(65, finalStrength);
    }

    // Cap final strength
    finalStrength = Math.max(20, Math.min(90, finalStrength));

    // Override the original values
    overallSignal = finalSignal;
    signalStrength = finalStrength;

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
      advancedIndicators,
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

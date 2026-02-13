import { NextResponse } from "next/server";

// ============ TECHNICAL INDICATOR CALCULATIONS ============

function calcEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  if (prices.length === 0) return ema;
  const k = 2 / (period + 1);
  ema[0] = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

function calcRSI(closes: number[], period: number = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length < period + 1) return rsi;

  let gainSum = 0;
  let lossSum = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1];
      avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
      avgLoss =
        (avgLoss * (period - 1) + (diff < 0 ? Math.abs(diff) : 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi[i] = 100 - 100 / (1 + rs);
  }
  return rsi;
}

function calcMACD(closes: number[]): {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
} {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = calcEMA(macdLine, 9);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

// ============ YAHOO FINANCE DATA FETCHING ============

interface YahooCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

async function fetchYahooChart(
  interval: string,
  range: string,
): Promise<YahooCandle[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=${interval}&range=${range}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) throw new Error(`Yahoo fetch failed: ${res.status}`);

  const data = await res.json();
  const result = data.chart?.result?.[0];
  if (!result) throw new Error("No chart data");

  const timestamps = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const candles: YahooCandle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (q.close?.[i] != null && q.open?.[i] != null) {
      candles.push({
        open: q.open[i],
        high: q.high[i],
        low: q.low[i],
        close: q.close[i],
        volume: q.volume?.[i] || 0,
        timestamp: timestamps[i],
      });
    }
  }
  return candles;
}

// Aggregate H1 candles into H4 candles
function aggregateToH4(h1Candles: YahooCandle[]): YahooCandle[] {
  const h4: YahooCandle[] = [];
  for (let i = 0; i + 3 < h1Candles.length; i += 4) {
    const group = h1Candles.slice(i, i + 4);
    h4.push({
      open: group[0].open,
      high: Math.max(...group.map((c) => c.high)),
      low: Math.min(...group.map((c) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((s, c) => s + c.volume, 0),
      timestamp: group[0].timestamp,
    });
  }
  return h4;
}

// ============ TIMEFRAME ANALYSIS ============

interface TimeframeAnalysis {
  ema50: number;
  price: number;
  priceVsEma: "above" | "below";
  distPercent: number; // % distance from EMA50
  rsi: number;
  rsiPrev: number;
  rsiSlope: "up" | "down" | "flat";
  macdHist: number;
  macdHistPrev: number;
  macdCrossing: "green_first" | "red_first" | "none";
}

function analyzeTimeframe(candles: YahooCandle[]): TimeframeAnalysis | null {
  if (candles.length < 50) return null;

  const closes = candles.map((c) => c.close);
  const ema50 = calcEMA(closes, 50);
  const rsiArr = calcRSI(closes, 14);
  const macd = calcMACD(closes);

  const lastIdx = closes.length - 1;
  const prevIdx = lastIdx - 1;

  const price = closes[lastIdx];
  const ema50Val = ema50[lastIdx];
  const dist = ((price - ema50Val) / ema50Val) * 100;

  const rsi = rsiArr[lastIdx];
  const rsiPrev = rsiArr[prevIdx];
  const rsiDelta = rsi - rsiPrev;
  let rsiSlope: "up" | "down" | "flat" = "flat";
  if (rsiDelta > 0.5) rsiSlope = "up";
  else if (rsiDelta < -0.5) rsiSlope = "down";

  const hist = macd.histogram[lastIdx];
  const histPrev = macd.histogram[prevIdx];

  let macdCrossing: "green_first" | "red_first" | "none" = "none";
  if (histPrev <= 0 && hist > 0) macdCrossing = "green_first";
  else if (histPrev >= 0 && hist < 0) macdCrossing = "red_first";

  return {
    ema50: ema50Val,
    price,
    priceVsEma: price > ema50Val ? "above" : "below",
    distPercent: dist,
    rsi,
    rsiPrev,
    rsiSlope,
    macdHist: hist,
    macdHistPrev: histPrev,
    macdCrossing,
  };
}

// ============ API RESPONSE ============

export interface GoldV2Response {
  success: boolean;
  data?: {
    price: number;
    change: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    timeframes: {
      m15: TimeframeAnalysis | null;
      h1: TimeframeAnalysis | null;
      h4: TimeframeAnalysis | null;
    };
    fetchedAt: string;
  };
  error?: string;
}

export async function GET(): Promise<NextResponse<GoldV2Response>> {
  try {
    // Fetch multiple timeframes in parallel
    const [m15Candles, h1Candles] = await Promise.all([
      fetchYahooChart("15m", "5d"),
      fetchYahooChart("1h", "1mo"),
    ]);

    // Build H4 from H1
    const h4Candles = aggregateToH4(h1Candles);

    // Analyze each timeframe
    const m15 = analyzeTimeframe(m15Candles);
    const h1 = analyzeTimeframe(h1Candles);
    const h4 = analyzeTimeframe(h4Candles);

    // Price data from most recent M15 candle
    const latestPrice = m15?.price || h1?.price || 0;

    // 24h high/low from H1 data (last 24 candles)
    const recent24h = h1Candles.slice(-24);
    const high24h =
      recent24h.length > 0
        ? Math.max(...recent24h.map((c) => c.high))
        : latestPrice;
    const low24h =
      recent24h.length > 0
        ? Math.min(...recent24h.map((c) => c.low))
        : latestPrice;

    // Calculate change from previous day close
    const dayAgoIdx = Math.max(0, h1Candles.length - 24);
    const prevClose = h1Candles[dayAgoIdx]?.close || latestPrice;
    const change = latestPrice - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        price: latestPrice,
        change,
        changePercent,
        high24h,
        low24h,
        timeframes: { m15, h1, h4 },
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Gold V2 API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

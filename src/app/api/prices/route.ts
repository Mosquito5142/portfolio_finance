// Next.js API Route - Fetch stock prices from Yahoo Finance (server-side)
// รองรับ SLV โดยใช้ราคา XAG/USD และ Technical Analysis

import { NextResponse } from "next/server";

const YAHOO_API_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";

// อัตราส่วน SLV ต่อ เงิน 1 ออนซ์ (ประมาณ)
const SLV_SILVER_RATIO = 0.92;

// ดึงราคาเงิน XAG/USD
async function fetchSilverSpotPrice(): Promise<number | null> {
  try {
    const response = await fetch(
      `${YAHOO_API_BASE}/SI=F?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 30 },
      },
    );

    if (response.ok) {
      const data = await response.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        return meta.regularMarketPrice;
      }
    }

    // Fallback: ลอง XAG=X
    const xagResponse = await fetch(
      `${YAHOO_API_BASE}/XAG=X?interval=1d&range=1d`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 30 },
      },
    );

    if (xagResponse.ok) {
      const xagData = await xagResponse.json();
      const xagMeta = xagData.chart?.result?.[0]?.meta;
      if (xagMeta?.regularMarketPrice) {
        return xagMeta.regularMarketPrice;
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching silver price:", error);
    return null;
  }
}

// คำนวณแนวรับ/ต้าน จากข้อมูลย้อนหลัง
function calculateSupportResistance(
  highs: number[],
  lows: number[],
  currentPrice: number,
): { support: number; resistance: number } {
  // หาจุดสูงสุด/ต่ำสุดที่เกิดซ้ำบ่อย (Pivot Points)
  const allHighs = [...highs].sort((a, b) => b - a);
  const allLows = [...lows].sort((a, b) => a - b);

  // แนวต้าน = ราคาสูงสุดที่มากกว่าราคาปัจจุบัน
  let resistance = currentPrice * 1.05; // Default +5%
  for (const high of allHighs) {
    if (high > currentPrice) {
      resistance = high;
      break;
    }
  }

  // แนวรับ = ราคาต่ำสุดที่น้อยกว่าราคาปัจจุบัน
  let support = currentPrice * 0.95; // Default -5%
  for (const low of allLows.reverse()) {
    if (low < currentPrice) {
      support = low;
      break;
    }
  }

  return { support, resistance };
}

// คำนวณ Simple Moving Average (SMA)
function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const recentPrices = prices.slice(-period);
  const sum = recentPrices.reduce((acc, price) => acc + price, 0);
  return sum / period;
}

// คำนวณ Exponential Moving Average (EMA)
function calculateEMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;

  const multiplier = 2 / (period + 1);

  // เริ่มจาก SMA ของ N วันแรก
  const sma =
    prices.slice(0, period).reduce((acc, price) => acc + price, 0) / period;

  // คำนวณ EMA จากวันที่ period เป็นต้นไป
  let ema = sma;
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// วิเคราะห์สัญญาณ MA
function analyzeMASignal(
  currentPrice: number,
  ma20: number | null,
  ma50: number | null,
  ma200: number | null,
): "bullish" | "bearish" | "neutral" {
  if (!ma20 || !ma50) return "neutral";

  // Golden Cross: MA20 ตัด MA50 ขึ้น และราคา > MA50
  if (ma20 > ma50 && currentPrice > ma50) {
    // ถ้ามี MA200 และราคา > MA200 = bullish มาก
    if (ma200 && currentPrice > ma200) return "bullish";
    return "bullish";
  }

  // Death Cross: MA20 ตัด MA50 ลง และราคา < MA50
  if (ma20 < ma50 && currentPrice < ma50) {
    return "bearish";
  }

  return "neutral";
}

// คำนวณ RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // คำนวณ initial average gain/loss
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);

  return rsi;
}

// วิเคราะห์สัญญาณ RSI
function analyzeRSISignal(
  rsi: number | null,
): "overbought" | "oversold" | "neutral" {
  if (rsi === null) return "neutral";
  if (rsi >= 70) return "overbought"; // Overbought - อาจลง
  if (rsi <= 30) return "oversold"; // Oversold - อาจขึ้น
  return "neutral";
}

// คำนวณ MACD
function calculateMACD(prices: number[]): {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  trend: "bullish" | "bearish" | "neutral";
} {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);

  if (ema12 === null || ema26 === null) {
    return { macd: null, signal: null, histogram: null, trend: "neutral" };
  }

  const macdLine = ema12 - ema26;

  // คำนวณ Signal Line (EMA 9 ของ MACD Line)
  // สร้าง array ของ MACD values สำหรับคำนวณ Signal
  const macdValues: number[] = [];
  for (let i = 26; i <= prices.length; i++) {
    const ema12Part = calculateEMA(prices.slice(0, i), 12);
    const ema26Part = calculateEMA(prices.slice(0, i), 26);
    if (ema12Part !== null && ema26Part !== null) {
      macdValues.push(ema12Part - ema26Part);
    }
  }

  const signalLine =
    macdValues.length >= 9 ? calculateEMA(macdValues, 9) : null;
  const histogram = signalLine !== null ? macdLine - signalLine : null;

  // วิเคราะห์ trend
  let trend: "bullish" | "bearish" | "neutral" = "neutral";
  if (histogram !== null) {
    if (histogram > 0 && macdLine > 0) {
      trend = "bullish"; // MACD > Signal และ MACD > 0
    } else if (histogram < 0 && macdLine < 0) {
      trend = "bearish"; // MACD < Signal และ MACD < 0
    }
  }

  return { macd: macdLine, signal: signalLine, histogram, trend };
}

// คำนวณ Volume Profile และ POC (Point of Control)
function calculateVolumeProfile(
  closes: number[],
  volumes: number[],
  bins: number = 20,
): { poc: number; vaHigh: number; vaLow: number } | null {
  if (closes.length < 10 || volumes.length < 10) return null;

  const minPrice = Math.min(...closes);
  const maxPrice = Math.max(...closes);
  const priceRange = maxPrice - minPrice;

  if (priceRange === 0) return null;

  const binSize = priceRange / bins;
  const volumeByPrice: { [bin: number]: number } = {};

  // รวม volume ในแต่ละช่วงราคา
  for (let i = 0; i < closes.length; i++) {
    const binIndex = Math.floor((closes[i] - minPrice) / binSize);
    const clampedBin = Math.min(binIndex, bins - 1);
    volumeByPrice[clampedBin] =
      (volumeByPrice[clampedBin] || 0) + (volumes[i] || 0);
  }

  // หา POC (bin ที่มี volume สูงสุด)
  let maxVolume = 0;
  let pocBin = 0;
  for (const [bin, vol] of Object.entries(volumeByPrice)) {
    if (vol > maxVolume) {
      maxVolume = vol;
      pocBin = parseInt(bin);
    }
  }

  const poc = minPrice + (pocBin + 0.5) * binSize;

  // คำนวณ Value Area (70% ของ volume ทั้งหมด)
  const totalVolume = Object.values(volumeByPrice).reduce((a, b) => a + b, 0);
  const targetVolume = totalVolume * 0.7;

  // Sort bins by volume
  const sortedBins = Object.entries(volumeByPrice)
    .map(([bin, vol]) => ({ bin: parseInt(bin), vol }))
    .sort((a, b) => b.vol - a.vol);

  let accumulatedVolume = 0;
  const valueBins: number[] = [];

  for (const { bin } of sortedBins) {
    valueBins.push(bin);
    accumulatedVolume += volumeByPrice[bin];
    if (accumulatedVolume >= targetVolume) break;
  }

  const vaLow = minPrice + Math.min(...valueBins) * binSize;
  const vaHigh = minPrice + (Math.max(...valueBins) + 1) * binSize;

  return { poc, vaHigh, vaLow };
}

interface PriceResult {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  isEstimated?: boolean;
  source?: string;
  actualClosePrice?: number;
  estimatedPrice?: number;
  estimatedChange?: number;
  // Technical Analysis
  support?: number;
  resistance?: number;
  high52w?: number;
  low52w?: number;
  // Moving Averages
  ema5?: number; // Fast EMA for trailing stop
  ma20?: number;
  ma50?: number;
  ma200?: number;
  maSignal?: "bullish" | "bearish" | "neutral";
  // RSI & MACD
  rsi?: number;
  rsiSignal?: "overbought" | "oversold" | "neutral";
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  macdTrend?: "bullish" | "bearish" | "neutral";
  // Volume Profile
  poc?: number;
  vaHigh?: number;
  vaLow?: number;
  // Volume Analysis (Momentum)
  volumeToday?: number;
  volumeAvg10?: number;
  volumeChangePercent?: number;
  volumeSignal?: "strong" | "weak_divergence" | "panic_sell" | "normal";
  // SLV specific
  silverSpotPrice?: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = searchParams.get("symbols")?.split(",") || [];

  if (symbols.length === 0) {
    return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
  }

  const results: Record<string, PriceResult> = {};

  // ถ้ามี SLV ให้ดึงราคาเงินด้วย
  const hasSLV = symbols.includes("SLV");
  let silverPrice: number | null = null;

  if (hasSLV) {
    silverPrice = await fetchSilverSpotPrice();
  }

  // Fetch all prices in parallel
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        // ดึงข้อมูลย้อนหลัง 1 ปี สำหรับคำนวณ MA200
        const response = await fetch(
          `${YAHOO_API_BASE}/${symbol}?interval=1d&range=1y`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            next: { revalidate: 60 },
          },
        );

        if (!response.ok) {
          console.error(`Failed to fetch ${symbol}: ${response.status}`);
          return;
        }

        const data = await response.json();
        const result = data.chart?.result?.[0];

        if (!result) {
          console.error(`No data for ${symbol}`);
          return;
        }

        const meta = result.meta;
        const actualPrice = meta.regularMarketPrice;
        const previousClose = meta.previousClose || meta.chartPreviousClose;
        const dayChange = actualPrice - previousClose;
        const dayChangePercent = (dayChange / previousClose) * 100;

        // ดึงข้อมูล 52 Week High/Low
        const high52w = meta.fiftyTwoWeekHigh;
        const low52w = meta.fiftyTwoWeekLow;

        // ดึง historical data สำหรับคำนวณ support/resistance และ MA
        const indicators = result.indicators?.quote?.[0];
        const highs: number[] =
          indicators?.high?.filter((h: number | null) => h !== null) || [];
        const lows: number[] =
          indicators?.low?.filter((l: number | null) => l !== null) || [];
        const closes: number[] =
          indicators?.close?.filter((c: number | null) => c !== null) || [];
        const volumes: number[] =
          indicators?.volume?.filter((v: number | null) => v !== null) || [];

        // คำนวณแนวรับ/ต้าน
        const { support, resistance } = calculateSupportResistance(
          highs,
          lows,
          actualPrice,
        );

        // คำนวณ Moving Averages
        const ema5 = calculateEMA(closes, 5); // 🆕 Fast EMA for trailing stop
        const ma20 = calculateEMA(closes, 20);
        const ma50 = calculateSMA(closes, 50);
        const ma200 = calculateSMA(closes, 200);
        const maSignal = analyzeMASignal(actualPrice, ma20, ma50, ma200);

        // คำนวณ RSI
        const rsi = calculateRSI(closes);
        const rsiSignal = analyzeRSISignal(rsi);

        // คำนวณ MACD
        const macdResult = calculateMACD(closes);

        // คำนวณ Volume Profile
        const volumeProfile = calculateVolumeProfile(closes, volumes);

        // 🆕 คำนวณ Volume Analysis (Momentum Check)
        const volumeToday =
          volumes.length > 0 ? volumes[volumes.length - 1] : 0;
        const volumeAvg10 = calculateSMA(volumes, 10) || 0;
        const volumeChangePercent =
          volumeAvg10 > 0
            ? ((volumeToday - volumeAvg10) / volumeAvg10) * 100
            : 0;
        const priceUp = dayChange > 0;

        let volumeSignal:
          | "strong"
          | "weak_divergence"
          | "panic_sell"
          | "normal" = "normal";
        if (volumeToday > volumeAvg10) {
          if (priceUp) {
            volumeSignal = "strong"; // Volume สูง + ราคาขึ้น = ถือต่อได้
          } else {
            volumeSignal = "panic_sell"; // Volume สูง + ราคาลง = ขาย!
          }
        } else {
          if (priceUp) {
            volumeSignal = "weak_divergence"; // Volume ต่ำ + ราคาขึ้น = เตรียมขาย
          }
        }

        // ถ้าเป็น SLV ให้เพิ่มข้อมูลราคาเงินเป็น reference
        if (symbol === "SLV" && silverPrice) {
          // ใช้ราคาจริงจาก Yahoo Finance เสมอ (ไม่ประมาณจาก Silver spot)
          const dayChange = actualPrice - previousClose;
          const dayChangePercent = (dayChange / previousClose) * 100;

          results[symbol] = {
            symbol,
            currentPrice: actualPrice,
            previousClose,
            dayChange,
            dayChangePercent,
            // Reference: ราคาเงิน spot
            source: "Yahoo Finance",
            silverSpotPrice: silverPrice,
            // Technical
            support,
            resistance,
            high52w,
            low52w,
            // Moving Averages
            ema5: ema5 ?? undefined,
            ma20: ma20 ?? undefined,
            ma50: ma50 ?? undefined,
            ma200: ma200 ?? undefined,
            maSignal,
            // RSI & MACD
            rsi: rsi ?? undefined,
            rsiSignal,
            macd: macdResult.macd ?? undefined,
            macdSignal: macdResult.signal ?? undefined,
            macdHistogram: macdResult.histogram ?? undefined,
            macdTrend: macdResult.trend,
            // Volume Profile
            poc: volumeProfile?.poc,
            vaHigh: volumeProfile?.vaHigh,
            vaLow: volumeProfile?.vaLow,
            // Volume Analysis
            volumeToday,
            volumeAvg10,
            volumeChangePercent,
            volumeSignal,
          };
          return;
        }

        results[symbol] = {
          symbol,
          currentPrice: actualPrice,
          previousClose,
          dayChange,
          dayChangePercent,
          // Technical
          support,
          resistance,
          high52w,
          low52w,
          // Moving Averages
          ema5: ema5 ?? undefined,
          ma20: ma20 ?? undefined,
          ma50: ma50 ?? undefined,
          ma200: ma200 ?? undefined,
          maSignal,
          // RSI & MACD
          rsi: rsi ?? undefined,
          rsiSignal,
          macd: macdResult.macd ?? undefined,
          macdSignal: macdResult.signal ?? undefined,
          macdHistogram: macdResult.histogram ?? undefined,
          macdTrend: macdResult.trend,
          // Volume Profile
          poc: volumeProfile?.poc,
          vaHigh: volumeProfile?.vaHigh,
          vaLow: volumeProfile?.vaLow,
          // Volume Analysis
          volumeToday,
          volumeAvg10,
          volumeChangePercent,
          volumeSignal,
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
      }
    }),
  );

  return NextResponse.json(results);
}

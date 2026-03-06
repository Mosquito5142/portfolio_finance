import { NextResponse } from "next/server";

// Define the stocks to scan (same as before)
const ALL_SYMBOLS = Array.from(
  new Set([
    "AAPL",
    "MSFT",
    "GOOGL",
    "AMZN",
    "NVDA",
    "TSLA",
    "META",
    "NFLX",
    "ORCL",
    "AVGO",
    "AMD",
    "TSM",
    "ASML",
    "QCOM",
    "INTC",
    "ARM",
    "ANET",
    "DELL",
    "SMCI",
    "HPE",
    "VRT",
    "FN",
    "PLTR",
    "CRWD",
    "PANW",
    "NET",
    "SNOW",
    "NOW",
    "MDB",
    "RBRK",
    "DOCN",
    "NBIS",
    "TEM",
    "ZS",
    "IOT",
    "SHOP",
    "MELI",
    "ASTS",
    "IONQ",
    "RKLB",
    "SOFI",
    "SYNA",
    "NVTS",
    "AEHR",
    "ALAB",
    "AXON",
    "MU",
    "HOOD",
    "ONTO",
    "KTOS",
    "JOBY",
    "ACHR",
    "LMND",
    "AVAV",
    "DPRO",
    "NOK",
    "LLY",
    "TMDX",
    "VKTX",
    "CLPT",
    "PRME",
    "RXRX",
    "EOSE",
    "IREN",
    "OKLO",
    "COPX",
    "CRML",
    "BWXT",
    "APP",
    "JMIA",
    "ONDS",
    "OSS",
    "UUUU",
    "IMVT",
    "SNPS",
    "COHU",
    "ROG",
    "ASPN",
    "CRDO",
    "AAOI",
  ]),
);

// Math helpers
const calculateEMA = (prices: number[], period: number) => {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
};

const calculateSMA = (prices: number[], period: number) => {
  if (prices.length < period) return prices[prices.length - 1];
  return prices.slice(-period).reduce((a, b) => a + b) / period;
};

const calculateStdDev = (prices: number[], sma: number, period: number) => {
  if (prices.length < period) return 0;
  const slice = prices.slice(-period);
  const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  return Math.sqrt(variance);
};

const calculateRSI = (prices: number[], period: number = 14) => {
  if (prices.length <= period) return 50;
  let gains = 0,
    losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period,
    avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
};

async function fetchHistoricalData(symbol: string) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2mo`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 },
    },
  );
  if (!response.ok) throw new Error(`Failed to fetch for ${symbol}`);
  const data = await response.json();
  const chart = data.chart.result?.[0];
  if (!chart || !chart.indicators?.quote?.[0])
    throw new Error(`No quote data for ${symbol}`);
  const quotes = chart.indicators.quote[0];
  const closes: number[] = quotes.close.filter(
    (p: number | null) => p !== null,
  );
  const volumes: number[] = quotes.volume.filter(
    (v: number | null) => v !== null,
  );
  return { closes, volumes };
}

// ============================
// 3 PLAYBOOK CLASSIFICATION
// ============================
type Playbook = "squeeze" | "spring_trap" | "high_vol" | "neutral";

function classifyPlaybook(
  bbWidthPct: number,
  rsi: number,
  pctChange: number,
  closes: number[],
  ema5: number,
  sma20: number,
  currentClose: number,
): {
  playbook: Playbook;
  playbookLabel: string;
  playbookEmoji: string;
  playbookTip: string;
  isWaveRider: boolean;
} {
  // --- Playbook 1: Classic Squeeze (BB_W < 15%) ---
  if (bbWidthPct < 15) {
    return {
      playbook: "squeeze",
      playbookLabel: "หม้ออัดแรงดัน",
      playbookEmoji: "🧨",
      playbookTip: "ดักซุ่มยิง: รอ CROSS SMA20 + MOM CATCHER แล้วค่อยเข้า",
      isWaveRider: false,
    };
  }

  // --- Playbook 2: Spring Trap / V-Shape Shakeout ---
  // Detect: recent heavy dump (any of last 3 days had > -3% drop) + RSI was < 40 recently + now recovering above EMA5
  const recent5 = closes.slice(-5);
  const recentChanges = [];
  for (let i = 1; i < recent5.length; i++) {
    recentChanges.push(((recent5[i] - recent5[i - 1]) / recent5[i - 1]) * 100);
  }
  const hadRecentDump = recentChanges.some((c) => c < -3);
  // Check if RSI was below 40 in recent days
  const rsi3DaysAgo =
    closes.length > 3
      ? calculateRSI(closes.slice(0, closes.length - 2), 14)
      : rsi;
  const hadLowRsi = rsi3DaysAgo < 40 || rsi < 40;
  const isRecovering = currentClose > ema5 && pctChange > 0;

  if (hadRecentDump && hadLowRsi && isRecovering) {
    return {
      playbook: "spring_trap",
      playbookLabel: "กับดักสลัดเม่า",
      playbookEmoji: "🪤",
      playbookTip: "V-Shape Rebound: ราคากลับยืนเหนือ EMA5 ได้ = สัญญาณเข้า",
      isWaveRider: false,
    };
  }
  // Also detect spring trap forming (just got dumped, not yet recovered)
  if (hadRecentDump && hadLowRsi && !isRecovering) {
    return {
      playbook: "spring_trap",
      playbookLabel: "กับดักสลัดเม่า (รอจังหวะ)",
      playbookEmoji: "🪤",
      playbookTip: "ถูกทุบแล้ว รอราคากลับยืนเหนือ EMA5 ค่อยเข้า",
      isWaveRider: false,
    };
  }

  // --- Playbook 3: High Volatility Continuation (BB_W > 30%) ---
  if (bbWidthPct > 30) {
    // Wave Rider Sub-detection:
    // Stock is in uptrend (above SMA20) but pulling back NEAR EMA5
    // "Near" = price within 2% of EMA5 (touching or slightly below/above)
    const distFromEma5Pct = Math.abs((currentClose - ema5) / ema5) * 100;
    const isAboveSma20 = currentClose > sma20;
    const isPullingBackToEma5 = distFromEma5Pct < 2;
    const isWaveRiderEntry = isAboveSma20 && isPullingBackToEma5 && rsi < 70;
    // Also detect: price bouncing off EMA5 (was below/at EMA5 yesterday, now above today)
    const prevEma5 =
      closes.length > 5 ? calculateEMA(closes.slice(0, -1), 5) : ema5;
    const prevClose2 =
      closes.length > 1 ? closes[closes.length - 2] : currentClose;
    const bouncedOffEma5 =
      prevClose2 <= prevEma5 * 1.005 && currentClose > ema5 && pctChange > 0;

    if (isWaveRiderEntry || bouncedOffEma5) {
      return {
        playbook: "high_vol",
        playbookLabel: "🏄 ขี่คลื่น (Re-entry)",
        playbookEmoji: "🎢",
        playbookTip: `ราคาพักตัวลงมาเกาะ EMA5 (ห่าง ${distFromEma5Pct.toFixed(1)}%) = จุดขึ้นรถซ้ำ! ${bouncedOffEma5 ? "⚡ เด้งจาก EMA5 แล้ว!" : "รอเด้งขึ้น"}`,
        isWaveRider: true,
      };
    }

    return {
      playbook: "high_vol",
      playbookLabel: "รถไฟเหาะทะลุฟ้า",
      playbookEmoji: "🎢",
      playbookTip:
        "ห้ามดักซื้อตอนย่อ! ซื้อเฉพาะตอน MOM CATCHER โผล่ หรือรอพักตัวลง EMA5",
      isWaveRider: false,
    };
  }

  // --- Neutral: In between zones (15-30% BB_W, no shakeout) ---
  return {
    playbook: "neutral",
    playbookLabel: "รอสัญญาณ",
    playbookEmoji: "⏳",
    playbookTip: "ยังไม่เข้าเกณฑ์ 3 รูปแบบหลัก รอดูต่อ",
    isWaveRider: false,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    const chunkArray = (arr: string[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size)
        chunks.push(arr.slice(i, i + size));
      return chunks;
    };

    const chunks = chunkArray(ALL_SYMBOLS, 5);
    let results: any[] = [];

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (symbol) => {
        try {
          const { closes, volumes } = await fetchHistoricalData(symbol);
          if (closes.length > 20) {
            const currentClose = closes[closes.length - 1];
            const prevClose = closes[closes.length - 2];
            const pctChange = ((currentClose - prevClose) / prevClose) * 100;

            const sma20 = calculateSMA(closes, 20);
            const stdDev20 = calculateStdDev(closes, sma20, 20);
            const upperBB = sma20 + stdDev20 * 2;
            const lowerBB = sma20 - stdDev20 * 2;
            const bbWidthPct =
              ((upperBB - lowerBB) / Math.max(sma20, 0.01)) * 100;

            const ema5 = calculateEMA(closes, 5);
            const rsi = calculateRSI(closes, 14);
            const prevRsi = calculateRSI(
              closes.slice(0, closes.length - 1),
              14,
            );
            const prevSMA20 = calculateSMA(
              closes.slice(0, closes.length - 1),
              20,
            );

            const volM = (volumes[volumes.length - 1] / 1000000).toFixed(2);

            // Original signals
            const isSqueeze = bbWidthPct < 15;
            const crossSMA20 = currentClose > sma20 && prevClose <= prevSMA20;
            const isTrend = currentClose > Math.max(sma20, 0);
            const momentumIgnition =
              currentClose > ema5 &&
              pctChange > 0 &&
              ((rsi > 55 && prevRsi <= 55) || rsi > 60);

            // Universal Triggers check
            const rsiFuelReady = rsi >= 40 && rsi <= 55; // "เชื้อเพลิงยังไม่เต็มถัง"

            // 3 Playbook Classification
            const {
              playbook,
              playbookLabel,
              playbookEmoji,
              playbookTip,
              isWaveRider,
            } = classifyPlaybook(
              bbWidthPct,
              rsi,
              pctChange,
              closes,
              ema5,
              sma20,
              currentClose,
            );

            return {
              symbol,
              currentPrice: currentClose,
              pctChange,
              ema5,
              sma20,
              bbWidthPct,
              rsi,
              volM,
              isSqueeze,
              crossSMA20,
              isTrend,
              momentumIgnition,
              rsiFuelReady,
              playbook,
              playbookLabel,
              playbookEmoji,
              playbookTip,
              isWaveRider,
            };
          }
        } catch (e) {
          console.warn(`Error fetching ${symbol}:`, e);
          return null;
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults.filter((r) => r !== null));
    }

    // Sort/filter
    if (filter === "squeeze") {
      results = results.filter((r) => r.playbook === "squeeze");
      results.sort((a, b) => a.bbWidthPct - b.bbWidthPct);
    } else if (filter === "spring_trap") {
      results = results.filter((r) => r.playbook === "spring_trap");
      results.sort((a, b) => a.rsi - b.rsi); // Most oversold first
    } else if (filter === "high_vol") {
      results = results.filter((r) => r.playbook === "high_vol");
      results.sort((a, b) => b.bbWidthPct - a.bbWidthPct); // Widest first
    } else if (filter === "wave_rider") {
      results = results.filter((r) => r.isWaveRider);
      results.sort((a, b) => {
        // Sort by closeness to EMA5
        const distA = Math.abs(a.currentPrice - a.ema5) / a.ema5;
        const distB = Math.abs(b.currentPrice - b.ema5) / b.ema5;
        return distA - distB;
      });
    } else if (filter === "momentum") {
      results = results.filter((r) => r.momentumIgnition);
      results.sort((a, b) => b.pctChange - a.pctChange);
    } else {
      // Default: group by playbook priority (squeeze > spring_trap > high_vol > neutral)
      const playbookOrder: Record<string, number> = {
        squeeze: 0,
        spring_trap: 1,
        high_vol: 2,
        neutral: 3,
      };
      results.sort((a, b) => {
        const orderDiff = playbookOrder[a.playbook] - playbookOrder[b.playbook];
        if (orderDiff !== 0) return orderDiff;
        return a.bbWidthPct - b.bbWidthPct;
      });
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

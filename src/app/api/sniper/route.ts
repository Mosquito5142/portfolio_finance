import { NextResponse } from "next/server";

// Define the stocks to scan
const MAGNIFICENT_SEVEN = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
];
const TIER_1_MEGA_TECH = ["NFLX", "ORCL"];
const TIER_1_AI_HARDWARE = [
  "AVGO",
  "AMD",
  "TSM",
  "ASML",
  "QCOM",
  "INTC",
  "ARM",
];
const TIER_1_AI_INFRASTRUCTURE = ["ANET", "DELL", "SMCI", "HPE", "VRT", "FN"];
const TIER_1_AI_SOFTWARE = [
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
];
const TIER_1_GROWTH_TECH = [
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
];
const TIER_1_HEALTH_BIO = ["LLY", "TMDX", "VKTX", "CLPT", "PRME", "RXRX"];
const TIER_1_ENERGY_RESOURCES = [
  "EOSE",
  "IREN",
  "OKLO",
  "COPX",
  "CRML",
  "BWXT",
];
const ALPHA_PICKS_WATCHLIST = ["APP"];
const TIER_2_SPECULATIVE = ["JMIA", "ONDS", "OSS"];
const FINVIZ_WATCHLIST = ["UUUU", "IMVT"];
const AI_HIDDEN_GEMS = ["SNPS", "COHU", "ROG", "ASPN", "CRDO", "AAOI"];

const ALL_SYMBOLS = Array.from(
  new Set([
    ...MAGNIFICENT_SEVEN,
    ...TIER_1_MEGA_TECH,
    ...TIER_1_AI_HARDWARE,
    ...TIER_1_AI_INFRASTRUCTURE,
    ...TIER_1_AI_SOFTWARE,
    ...TIER_1_GROWTH_TECH,
    ...TIER_1_HEALTH_BIO,
    ...TIER_1_ENERGY_RESOURCES,
    ...ALPHA_PICKS_WATCHLIST,
    ...TIER_2_SPECULATIVE,
    ...FINVIZ_WATCHLIST,
    ...AI_HIDDEN_GEMS,
  ]),
);

// Math helpers
const calculateEMA = (prices: number[], period: number) => {
  if (prices.length < period) return prices[prices.length - 1];
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b) / period; // Start with SMA
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
  let avgGain = gains / period,
    avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
};

async function fetchHistoricalData(symbol: string) {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2mo`,
    {
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 300 }, // Cache for 5 minutes
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch for ${symbol}`);
  }

  const data = await response.json();
  const chart = data.chart.result?.[0];

  if (!chart || !chart.indicators?.quote?.[0]) {
    throw new Error(`No quote data for ${symbol}`);
  }

  const quotes = chart.indicators.quote[0];
  const closes: number[] = quotes.close.filter(
    (p: number | null) => p !== null,
  );
  const volumes: number[] = quotes.volume.filter(
    (v: number | null) => v !== null,
  );

  return { closes, volumes };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all";

    // We can fetch data concurrently to speed up
    // To avoid rate limits, batch in chunks of 5
    const chunkArray = (arr: string[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
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

            const isSqueeze = bbWidthPct < 15;
            const crossSMA20 = currentClose > sma20 && prevClose <= prevSMA20;
            const isTrend = currentClose > Math.max(sma20, 0); // basic sanity check
            const momentumIgnition =
              currentClose > ema5 &&
              pctChange > 0 &&
              ((rsi > 55 && prevRsi <= 55) || rsi > 60);

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

    // Sort logically depending on filter
    if (filter === "squeeze") {
      results = results.filter((r) => r.isSqueeze);
      results.sort((a, b) => a.bbWidthPct - b.bbWidthPct); // Tightest squeeze first
    } else if (filter === "momentum") {
      results = results.filter((r) => r.momentumIgnition);
      results.sort((a, b) => b.pctChange - a.pctChange); // Highest jump first
    } else if (filter === "cross") {
      results = results.filter((r) => r.crossSMA20);
      results.sort((a, b) => b.pctChange - a.pctChange);
    } else {
      // Default: Sort by Squeeze tightness
      results.sort((a, b) => a.bbWidthPct - b.bbWidthPct);
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

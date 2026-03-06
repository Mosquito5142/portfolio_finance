import { NextResponse } from "next/server";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: "Symbol is required" },
        { status: 400 },
      );
    }

    // Fetch 2 months of data to have enough history for the indicators + output
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2mo`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        next: { revalidate: 300 }, // Cache
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
    const timestamps: number[] = chart.timestamp || [];
    const closes: number[] = quotes.close || [];
    const volumes: number[] = quotes.volume || [];

    // Filter out nulls but keep indexes aligned
    let validData = [];
    for (let i = 0; i < closes.length; i++) {
      if (closes[i] !== null && volumes[i] !== null) {
        validData.push({
          timestamp: timestamps[i],
          close: closes[i],
          volume: volumes[i],
        });
      }
    }

    if (validData.length < 20) {
      return NextResponse.json({ success: true, count: 0, data: [] });
    }

    // Extract raw arrays for calculation
    const rawCloses = validData.map((d) => d.close);

    // We only want to output the last 15 days of data
    const historyToShow = 15;
    const startIndex = Math.max(20, validData.length - historyToShow); // Wait until index 20 to easily slice indicators

    const results = [];

    for (let i = startIndex; i < validData.length; i++) {
      const dayData = validData[i];
      const prevClose = validData[i - 1].close;

      const currentClose = dayData.close;
      const pctChange = ((currentClose - prevClose) / prevClose) * 100;

      // Slice up to current day for accurate historical indicators
      const historySlice = rawCloses.slice(0, i + 1);

      const sma20 = calculateSMA(historySlice, 20);
      const stdDev20 = calculateStdDev(historySlice, sma20, 20);
      const upperBB = sma20 + stdDev20 * 2;
      const lowerBB = sma20 - stdDev20 * 2;
      const bbWidthPct = ((upperBB - lowerBB) / Math.max(sma20, 0.01)) * 100;

      const ema5 = calculateEMA(historySlice, 5);
      const rsi = calculateRSI(historySlice, 14);

      // Previous indicators to check crossovers happening ON THIS DAY
      const prevHistorySlice = rawCloses.slice(0, i);
      const prevRsi = calculateRSI(prevHistorySlice, 14);
      const prevSMA20 = calculateSMA(prevHistorySlice, 20);

      const volM = (dayData.volume / 1000000).toFixed(2);

      const isSqueeze = bbWidthPct < 15;
      const crossSMA20 = currentClose > sma20 && prevClose <= prevSMA20;
      const isTrend = currentClose > Math.max(sma20, 0);
      const momentumIgnition =
        currentClose > ema5 &&
        pctChange > 0 &&
        ((rsi > 55 && prevRsi <= 55) || rsi > 60);

      // Date string format
      const dateStr = new Date(dayData.timestamp * 1000)
        .toISOString()
        .split("T")[0];

      results.push({
        date: dateStr,
        close: currentClose,
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

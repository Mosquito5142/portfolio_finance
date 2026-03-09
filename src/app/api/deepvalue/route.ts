export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";

const FMP_KEY = process.env.FMP_API_KEY?.trim() || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY?.trim() || "";

// ─── Calculate RSI locally (same logic as patterns/route.ts) ──────────
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

// ─── Yahoo Finance chart (FREE, no API key) ───────────────────────────
async function getYahooHistoricalData(symbol: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`,
      {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const quote = data?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!quote || !quote.close || !quote.high || !quote.low) return null;

    const formatted = [];
    for (let i = 0; i < quote.close.length; i++) {
      if (
        quote.close[i] !== null &&
        quote.high[i] !== null &&
        quote.low[i] !== null
      ) {
        formatted.push({
          close: quote.close[i],
          high: quote.high[i],
          low: quote.low[i],
        });
      }
    }
    return formatted.length > 0 ? formatted : null;
  } catch {
    return null;
  }
}

// ─── FMP: Company Profile ─────────────────────────────────────────────
async function getFMPProfile(symbol: string) {
  if (!FMP_KEY) return null;
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/profile?symbol=${symbol}&apikey=${FMP_KEY}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

// ─── FMP: Discounted Cash Flow ────────────────────────────────────────
async function getFMPDcf(symbol: string) {
  if (!FMP_KEY) return null;
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/discounted-cash-flow?symbol=${symbol}&apikey=${FMP_KEY}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

// ─── FMP: Financial Ratios TTM ────────────────────────────────────────
async function getFMPRatios(symbol: string) {
  if (!FMP_KEY) return null;
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/ratios-ttm?symbol=${symbol}&apikey=${FMP_KEY}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

// ─── Finnhub: Insider Sentiment ───────────────────────────────────────
async function getInsiderSentiment(symbol: string) {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${symbol}&from=2023-01-01&token=${FINNHUB_KEY}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.data?.length > 0) {
      let mspr = 0;
      let change = 0;
      data.data.forEach((m: any) => {
        mspr += m.mspr;
        change += m.change;
      });
      return {
        overallMspr: Number(mspr.toFixed(2)),
        overallChange: change,
        months: data.data.length,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Finnhub: Analyst Recommendation (FREE!) ──────────────────────────
// Returns: { buy, hold, sell, strongBuy, strongSell, period }
// This is used as FALLBACK when FMP DCF is unavailable.
async function getAnalystRecommendation(symbol: string) {
  if (!FINNHUB_KEY) return null;
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${FINNHUB_KEY}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    const data = await res.json();
    // Use latest month's data
    if (Array.isArray(data) && data.length > 0) {
      const latest = data[0];
      const total =
        (latest.strongBuy || 0) +
        (latest.buy || 0) +
        (latest.hold || 0) +
        (latest.sell || 0) +
        (latest.strongSell || 0);
      if (total === 0) return null;

      // Calculate consensus percentage (0-100, higher = more bullish)
      // strongBuy=100, buy=75, hold=50, sell=25, strongSell=0
      const weightedScore =
        ((latest.strongBuy || 0) * 100 +
          (latest.buy || 0) * 75 +
          (latest.hold || 0) * 50 +
          (latest.sell || 0) * 25 +
          (latest.strongSell || 0) * 0) /
        total;

      return {
        strongBuy: latest.strongBuy || 0,
        buy: latest.buy || 0,
        hold: latest.hold || 0,
        sell: latest.sell || 0,
        strongSell: latest.strongSell || 0,
        totalAnalysts: total,
        consensusScore: Number(weightedScore.toFixed(1)),
        // Derive a consensus label
        consensus:
          weightedScore >= 75
            ? "Strong Buy"
            : weightedScore >= 62.5
              ? "Buy"
              : weightedScore >= 45
                ? "Hold"
                : weightedScore >= 25
                  ? "Sell"
                  : "Strong Sell",
        period: latest.period,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Main handler – Fail-Fast + Fallback Logic
// ═══════════════════════════════════════════════════════════════════════
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const strict = searchParams.get("strict") === "true";

  if (!symbol) {
    return NextResponse.json(
      { error: "Symbol parameter is required" },
      { status: 400 },
    );
  }

  try {
    // ── Phase 1: Technical Pre-Screen (RSI from Yahoo — FREE) ─────────
    const history = await getYahooHistoricalData(symbol);
    const closes = history ? history.map((h) => h.close) : null;
    const rsi = closes && closes.length > 15 ? calculateRSI(closes) : null;

    // ── Calculate Support Levels ──────────────────────────────────────
    let supportLevels = null;
    if (history && history.length > 0) {
      const lows = history.map((h) => h.low);
      const localMinima = Math.min(...lows);

      // Pivot Points from Latest Completed Day
      const latest = history[history.length - 1];
      const P = (latest.high + latest.low + latest.close) / 3;
      const S1 = P * 2 - latest.high;
      const S2 = P - (latest.high - latest.low);

      supportLevels = {
        pivot: Number(P.toFixed(2)),
        s1: Number(S1.toFixed(2)),
        s2: Number(S2.toFixed(2)),
        localMinima: Number(localMinima.toFixed(2)),
      };
    }

    // ── Fail-Fast ─────────────────────────────────────────────────────
    if (strict && (rsi === null || rsi >= 35)) {
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        status: "skipped",
        reason:
          rsi === null ? "RSI unavailable" : `RSI ${rsi.toFixed(2)} >= 35`,
        technical: {
          rsi: rsi !== null ? Number(rsi.toFixed(2)) : null,
          isOversold: false,
          supportLevels,
        },
        fundamental: null,
        catalyst: null,
        sniperScore: 0,
        apiCallsSaved: 4,
      });
    }

    // ── Phase 2+3: Full data fetch (FMP + Finnhub) ────────────────────
    const [profile, dcf, ratios, insider] = await Promise.all([
      getFMPProfile(symbol),
      getFMPDcf(symbol),
      getFMPRatios(symbol),
      getInsiderSentiment(symbol),
    ]);

    const currentPrice = profile?.price ?? dcf?.["Stock Price"] ?? null;
    const dcfValue = dcf?.dcf ?? null;

    // ── FALLBACK LOGIC ────────────────────────────────────────────────
    // If DCF is null → fetch Analyst Recommendation from Finnhub (FREE!)
    // This gives us consensus buy/sell/hold data to replace DCF upside.
    let analystData = null;
    let valuationSource: "DCF" | "Analyst" | null = null;
    let upsidePotential: number | null = null;

    if (dcfValue !== null && currentPrice !== null && currentPrice > 0) {
      // ✅ DCF is available — use it directly
      upsidePotential = ((dcfValue - currentPrice) / currentPrice) * 100;
      valuationSource = "DCF";
    } else {
      // 🔄 FALLBACK: DCF unavailable → fetch analyst recommendation
      analystData = await getAnalystRecommendation(symbol);
      if (analystData) {
        valuationSource = "Analyst";
        // Map consensus score (0-100) to a pseudo-upside:
        // consensusScore 75+ (Strong Buy) → upside ~+30%
        // consensusScore 62.5+ (Buy) → upside ~+15%
        // consensusScore 50 (Hold) → upside 0%
        // consensusScore <45 (Sell) → upside negative
        upsidePotential = (analystData.consensusScore - 50) * 1.2;
      }
    }

    const peRatio = ratios?.priceToEarningsRatioTTM ?? null;
    const debtToEquity = ratios?.debtToEquityRatioTTM ?? null;

    // Build analyst rating label
    let analystRating: string | null = null;
    if (analystData) {
      analystRating = `${analystData.consensus} (${analystData.totalAnalysts} analysts)`;
    }

    const deepValueData = {
      symbol: symbol.toUpperCase(),
      status: "done" as const,
      technical: {
        rsi: rsi !== null ? Number(rsi.toFixed(2)) : null,
        isOversold: rsi !== null && rsi < 35,
        supportLevels,
      },
      fundamental: {
        currentPrice,
        dcfValue: dcfValue !== null ? Number(dcfValue.toFixed(2)) : null,
        upsidePotential:
          upsidePotential !== null ? Number(upsidePotential.toFixed(2)) : null,
        debtToEquity:
          debtToEquity !== null ? Number(debtToEquity.toFixed(4)) : null,
        peRatio: peRatio !== null ? Number(peRatio.toFixed(2)) : null,
        analystRating,
        marketCap: profile?.marketCap ?? null,
        beta: profile?.beta ?? null,
        companyName: profile?.companyName ?? null,
        sector: profile?.sector ?? null,
        industry: profile?.industry ?? null,
        // NEW: Fallback metadata
        valuationSource,
        analystConsensus: analystData
          ? {
              strongBuy: analystData.strongBuy,
              buy: analystData.buy,
              hold: analystData.hold,
              sell: analystData.sell,
              strongSell: analystData.strongSell,
              totalAnalysts: analystData.totalAnalysts,
              consensusScore: analystData.consensusScore,
              consensus: analystData.consensus,
            }
          : null,
      },
      extendedData: {
        description: profile?.description ?? null,
        website: profile?.website ?? null,
        ceo: profile?.ceo ?? null,
        fullTimeEmployees: profile?.fullTimeEmployees ?? null,
        lastDiv: profile?.lastDiv ?? null,
        exchange: profile?.exchangeShortName ?? null,
        // Ratios
        returnOnEquity: ratios?.returnOnEquityTTM ?? null,
        returnOnAssets: ratios?.returnOnAssetsTTM ?? null,
        priceToBook: ratios?.priceToBookRatioTTM ?? null,
        priceToSales: ratios?.priceToSalesRatioTTM ?? null,
        grossMargin: ratios?.grossProfitMarginTTM ?? null,
        netProfitMargin: ratios?.netProfitMarginTTM ?? null,
        operatingMargin: ratios?.operatingProfitMarginTTM ?? null,
        currentRatio: ratios?.currentRatioTTM ?? null,
      },
      catalyst: {
        insiderSentiment: insider,
        hasStrongInsiderBuy: insider ? insider.overallChange > 0 : null,
      },
      sniperScore: 0,
    };

    // ── Sniper Score (0‑100) ─────────────────────────────────────────
    let score = 0;

    // Technical (max 30 pts)
    if (deepValueData.technical.isOversold) score += 30;
    else if (rsi !== null && rsi < 45) score += 10;

    // Fundamental – DCF upside OR Analyst consensus (max 40 pts)
    if (upsidePotential !== null && upsidePotential > 20) score += 40;
    else if (upsidePotential !== null && upsidePotential > 0) score += 20;

    // Catalyst – insider buying (max 30 pts)
    if (deepValueData.catalyst.hasStrongInsiderBuy) score += 30;

    deepValueData.sniperScore = Math.min(100, score);

    return NextResponse.json(deepValueData);
  } catch (error: any) {
    console.error("Deep Value Scan Error:", error);
    return NextResponse.json(
      { error: "Failed to perform deep value scan", details: error.message },
      { status: 500 },
    );
  }
}

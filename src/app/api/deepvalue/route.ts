export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";

const FMP_KEY = process.env.FMP_API_KEY?.trim() || "";
const FINNHUB_KEY = process.env.FINNHUB_API_KEY?.trim() || "";

// ─── Calculate RSI locally (same logic as patterns/route.ts) ──────────
// No external API needed! Just closing prices.
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

// ─── Fetch closing prices from Yahoo Finance chart API ────────────────
// Same endpoint used by patterns/route.ts — FREE, no API key needed!
async function getYahooClosingPrices(symbol: string): Promise<number[] | null> {
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
    const closes =
      data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    // Filter out null/undefined values
    return closes.filter((c: number | null) => c !== null && c !== undefined);
  } catch {
    return null;
  }
}

// ─── FMP Stable API: Company Profile (Price, MarketCap, Beta) ─────────
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
  } catch (e) {
    console.error("FMP Profile Error:", e);
    return null;
  }
}

// ─── FMP Stable API: Discounted Cash Flow ─────────────────────────────
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
  } catch (e) {
    console.error("FMP DCF Error:", e);
    return null;
  }
}

// ─── FMP Stable API: Financial Ratios TTM ─────────────────────────────
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
  } catch (e) {
    console.error("FMP Ratios Error:", e);
    return null;
  }
}

// ─── Finnhub Insider Sentiment ────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════
// Main handler – supports Fail-Fast mode
// Query params:
//   symbol  = stock ticker (required)
//   strict  = "true" | "false" (default "false")
//             When strict=true, RSI is checked FIRST.
//             If RSI >= 35 (not oversold), skip FMP/Finnhub entirely.
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
    // ── Phase 1: Technical Pre-Screen ─────────────────────────────────
    // Fetch Yahoo chart data → calculate RSI locally (FREE, no API key!)
    const closes = await getYahooClosingPrices(symbol);
    const rsi = closes && closes.length > 15 ? calculateRSI(closes) : null;

    // ── Fail-Fast: If strict mode AND not oversold, STOP immediately ─
    if (strict && (rsi === null || rsi >= 35)) {
      return NextResponse.json({
        symbol: symbol.toUpperCase(),
        status: "skipped",
        reason:
          rsi === null ? "RSI unavailable" : `RSI ${rsi.toFixed(2)} >= 35`,
        technical: {
          rsi: rsi !== null ? Number(rsi.toFixed(2)) : null,
          isOversold: false,
        },
        fundamental: null,
        catalyst: null,
        sniperScore: 0,
        apiCallsSaved: 4, // profile + dcf + ratios + insider
      });
    }

    // ── Phase 2+3: Only reached if RSI < 35 (or strict=false) ─────────
    const [profile, dcf, ratios, insider] = await Promise.all([
      getFMPProfile(symbol),
      getFMPDcf(symbol),
      getFMPRatios(symbol),
      getInsiderSentiment(symbol),
    ]);

    const currentPrice = profile?.price ?? dcf?.["Stock Price"] ?? null;
    const dcfValue = dcf?.dcf ?? null;
    const upsidePotential =
      dcfValue !== null && currentPrice !== null && currentPrice > 0
        ? ((dcfValue - currentPrice) / currentPrice) * 100
        : null;

    const peRatio = ratios?.priceToEarningsRatioTTM ?? null;
    const debtToEquity = ratios?.debtToEquityRatioTTM ?? null;

    const deepValueData = {
      symbol: symbol.toUpperCase(),
      status: "done" as const,
      technical: {
        rsi: rsi !== null ? Number(rsi.toFixed(2)) : null,
        isOversold: rsi !== null && rsi < 35,
      },
      fundamental: {
        currentPrice,
        dcfValue: dcfValue !== null ? Number(dcfValue.toFixed(2)) : null,
        upsidePotential:
          upsidePotential !== null ? Number(upsidePotential.toFixed(2)) : null,
        debtToEquity:
          debtToEquity !== null ? Number(debtToEquity.toFixed(4)) : null,
        peRatio: peRatio !== null ? Number(peRatio.toFixed(2)) : null,
        analystRating: null as string | null,
        marketCap: profile?.marketCap ?? null,
        beta: profile?.beta ?? null,
        companyName: profile?.companyName ?? null,
        sector: profile?.sector ?? null,
        industry: profile?.industry ?? null,
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

    // Fundamental – DCF upside (max 40 pts)
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

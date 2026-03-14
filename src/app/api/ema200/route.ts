export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";

const FMP_KEY = process.env.FMP_API_KEY?.trim() || "";

// ─── Calculate EMA 200 ───────────────────────────────────────────────
function calculateEMA(prices: number[], period: number = 200): number | null {
  if (prices.length < period) return null;

  // 1. Calculate the initial SMA for the first 'period' data points
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  let prevEma = sum / period;

  // 2. Calculate the multiplier
  const multiplier = 2 / (period + 1);

  // 3. Calculate EMA for the remaining data points
  for (let i = period; i < prices.length; i++) {
    prevEma = (prices[i] - prevEma) * multiplier + prevEma;
  }

  return prevEma;
}

// ─── Yahoo Finance chart (FREE, no API key) ───────────────────────────
// We need 5 years of weekly data to get at least 200 weeks to calculate EMA 200
async function getYahooWeeklyData(symbol: string) {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1wk&range=5y`,
      {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const quote = data?.chart?.result?.[0]?.indicators?.quote?.[0];
    if (!quote || !quote.close) return null;

    return quote.close.filter(
      (c: number | null) => c !== null && c !== undefined,
    );
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();
  const strict = searchParams.get("strict") === "true";

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    // ── Phase 1: Technical Pre-Screen (EMA 200 from Yahoo — FREE) ─────
    const closes = await getYahooWeeklyData(symbol);
    const ema200 = closes ? calculateEMA(closes, 200) : null;
    
    let currentPrice = null;
    let distancePct = null;

    if (closes && closes.length > 0) {
      currentPrice = closes[closes.length - 1];
    }

    if (currentPrice !== null && ema200 !== null) {
      distancePct = ((currentPrice - ema200) / ema200) * 100;
    }

    // ── Fail-Fast ─────────────────────────────────────────────────────
    // If strict is true (which it is for the bulk scanner), we only want stocks
    // near their EMA 200 Weekly. Let's say between -5% (dipped below) and +10% (hovering above).
    // You can adjust these bounds.
    let isNearEMA = false;
    if (distancePct !== null && distancePct >= -5 && distancePct <= 10) {
        isNearEMA = true;
    }

    if (strict && !isNearEMA) {
      return NextResponse.json({
        symbol: symbol,
        status: "skipped",
        reason:
          distancePct === null
            ? "EMA 200 unavailable (Not enough history)"
            : `Distance ${distancePct.toFixed(2)}% outside bounds (-5% to +10%)`,
        technical: {
          currentPrice: currentPrice !== null ? Number(currentPrice.toFixed(2)) : null,
          ema200: ema200 !== null ? Number(ema200.toFixed(2)) : null,
          distancePct: distancePct !== null ? Number(distancePct.toFixed(2)) : null,
          isNearEMA,
        },
        fundamental: null,
      });
    }

    // ── Phase 2: Fetch Fundamental Data (FMP — Paid API) ─────────────
    const profile = await getFMPProfile(symbol);

    // ── Output Shaping ─────────────
    const scannerData = {
      symbol: symbol,
      status: "success",
      technical: {
        currentPrice: currentPrice !== null ? Number(currentPrice.toFixed(2)) : null,
        ema200: ema200 !== null ? Number(ema200.toFixed(2)) : null,
        distancePct: distancePct !== null ? Number(distancePct.toFixed(2)) : null,
        isNearEMA,
      },
      fundamental: {
        companyName: profile?.companyName || null,
        sector: profile?.sector || null,
        industry: profile?.industry || null,
        marketCap: profile?.mktCap || null,
        beta: profile?.beta || null,
        exchange: profile?.exchangeShortName || null,
      },
      extendedData: {
        ceo: profile?.ceo || null,
        fullTimeEmployees: profile?.fullTimeEmployees || null,
      }
    };

    return NextResponse.json(scannerData);
  } catch (error: any) {
    return NextResponse.json(
      { symbol, error: error.message },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as yfModule from "yahoo-finance2";

// Handle differences between v2, v3, CommonJS, and ES Modules gracefully
let yahooFinance: any = yfModule.default;

// If we are in v3, the YahooFinance class is exported and we MUST instantiate it
if (typeof (yfModule as any).YahooFinance === 'function') {
  yahooFinance = new (yfModule as any).YahooFinance();
} else if (yahooFinance && typeof yahooFinance.YahooFinance === 'function') {
  yahooFinance = new yahooFinance.YahooFinance();
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");

  if (!symbolsParam) {
    return NextResponse.json({ error: "No symbols provided" }, { status: 400 });
  }

  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);

  if (symbols.length === 0) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    // Perform bulk quote fetch manually to bypass v7 crumb and rate limits
    const fetchPromises = symbols.map(async (symbol) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`,
          {
            cache: "no-store",
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          }
        );
        if (!res.ok) return null;
        
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) return null;

        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];
        if (!meta || !quote || !quote.close) return null;

        const closes = quote.close.filter((c: number | null) => c !== null && c !== undefined);
        const price = meta.regularMarketPrice || closes[closes.length - 1] || 0;
        const high52 = meta.fiftyTwoWeekHigh || Math.max(...closes);
        
        // Calculate 200-day Simple Moving Average manually
        const period = Math.min(200, closes.length);
        const sma200 = period > 0 
          ? closes.slice(-period).reduce((acc: number, val: number) => acc + val, 0) / period 
          : price;

        const drawdownPct = high52 > 0 ? ((price - high52) / high52) * 100 : 0;
        const distanceToSma200 = sma200 > 0 ? ((price - sma200) / sma200) * 100 : 0;
        
        // Base Score logic (0-100)
        let drawdownScore = 0;
        if (drawdownPct < 0) {
            drawdownScore = Math.min(Math.abs(drawdownPct), 50); 
        }

        let smaScore = 0;
        if (distanceToSma200 <= 5 && distanceToSma200 >= -5) {
            smaScore = 30; // Solid support zone
        } else if (distanceToSma200 < -5) {
            smaScore = Math.min(Math.abs(distanceToSma200) + 20, 50);
        }

        const dcaScore = Math.min(drawdownScore + smaScore, 100);

        return {
          symbol: meta.symbol || symbol,
          price,
          high52,
          sma200,
          drawdownPct,
          distanceToSma200,
          dayChangePct: meta.regularMarketChangePercent || 0,
          dcaScore: Math.round(dcaScore),
        };
      } catch (err) {
        console.error(`Failed to fetch ${symbol}:`, err);
        return null;
      }
    });

    const parsedResults = (await Promise.all(fetchPromises)).filter(r => r !== null);
    
    return NextResponse.json(parsedResults);
  } catch (error: any) {
    console.error("DCA API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { UNIQUE_SYMBOLS } from "@/lib/stocks";

interface SniperCandidate {
  symbol: string;
  signal: string;
  price: number;
  support: number;
  candle: string | undefined;
  atr: number | undefined;
  stopLoss: number;
}

export async function GET() {
  const sniperCandidates: SniperCandidate[] = [];

  // Batch scan logic (Server-side)
  // Note: Vercel/Next.js has timeout limits, but 30-40 stocks might fit if parallelized.
  // For robustness, we process in chunks.

  const CHUNK_SIZE = 5;
  for (let i = 0; i < UNIQUE_SYMBOLS.length; i += CHUNK_SIZE) {
    const chunk = UNIQUE_SYMBOLS.slice(i, i + CHUNK_SIZE);

    // Parallel fetch pattern API (internal call or direct logic)
    // To re-use logic, we should probably extract the analysis logic from /api/patterns/route.ts
    // For now, to avoid massive refactoring, we'll fetch our own API if possible,
    // OR (Better) we just instantiate the analyzer here.
    // BUT /api/patterns is complex.
    // Let's call the internal API URL for simplicity if localhost, or use direct logic if we can refactor.
    // Given the constraints, calling the public URL might be tricky with "localhost".
    // BEST APPROACH: Refactor specific logic? No, too risky.
    // Let's copy the minimal needed logic OR import the analyze function if it was exported.

    // Wait... the previous turn refactored /api/patterns.
    // I can't easily import "GET" from another route file to use as a function.
    // I will use a helper function pattern.

    // For this prototype, I will perform a fetch to the existing API structure
    // assuming we can hit "http://localhost:3000".
    // loops with Promise.all

    const promises = chunk.map(async (symbol) => {
      try {
        // We need the absolute URL. In production this needs env var.
        // For local dev: http://localhost:3000
        const res = await fetch(
          `http://localhost:3000/api/patterns?symbol=${symbol}`,
        );
        if (!res.ok) return null;
        const data = await res.json();

        // Filter: Sniper Zone Logic
        const support = data.metrics?.supportLevel || 0;
        const price = data.currentPrice || 0;
        const dist = support > 0 ? Math.abs(price - support) / support : 1;

        const isSniperZone = dist < 0.02; // Within 2%
        const isBullishCandle =
          data.advancedIndicators?.candlePattern?.signal === "bullish";

        if (isSniperZone && isBullishCandle) {
          return {
            symbol,
            signal: "SNIPER BUY",
            price,
            support,
            candle: data.advancedIndicators?.candlePattern?.name,
            atr: data.advancedIndicators?.atr,
            stopLoss: price - 1.5 * (data.advancedIndicators?.atr || 0),
          };
        }
        return null;
      } catch (e) {
        console.error(`Error scanning ${symbol}`, e);
        return null;
      }
    });

    const results = await Promise.all(promises);
    results.forEach((r) => {
      if (r) sniperCandidates.push(r);
    });
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    candidates: sniperCandidates,
    count: sniperCandidates.length,
  });
}

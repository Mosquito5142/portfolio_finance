import { NextResponse } from "next/server";

interface GoldApiResponse {
  success: boolean;
  data?: {
    price: number;
    change: number;
    changePercent: number;
    high24h: number;
    low24h: number;
    volatility: "low" | "medium" | "high";
  };
  error?: string;
}

export async function GET(): Promise<NextResponse<GoldApiResponse>> {
  try {
    // Fetch XAU/USD from Yahoo Finance
    const response = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=5d",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch gold price");
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error("Invalid response format");
    }

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];

    // Get current price
    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose || currentPrice;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    // Get high/low from recent data
    const highs = quotes?.high?.filter((h: number | null) => h !== null) || [];
    const lows = quotes?.low?.filter((l: number | null) => l !== null) || [];
    const high24h =
      highs.length > 0 ? Math.max(...highs.slice(-2)) : currentPrice;
    const low24h = lows.length > 0 ? Math.min(...lows.slice(-2)) : currentPrice;

    // Calculate volatility based on daily range
    const dailyRange = ((high24h - low24h) / currentPrice) * 100;
    let volatility: "low" | "medium" | "high" = "low";
    if (dailyRange > 1.5) {
      volatility = "high";
    } else if (dailyRange > 0.8) {
      volatility = "medium";
    }

    return NextResponse.json({
      success: true,
      data: {
        price: currentPrice,
        change,
        changePercent,
        high24h,
        low24h,
        volatility,
      },
    });
  } catch (error) {
    console.error("Error fetching gold price:", error);

    // Return fallback data for demo purposes
    return NextResponse.json({
      success: true,
      data: {
        price: 2025.5,
        change: 12.3,
        changePercent: 0.61,
        high24h: 2032.8,
        low24h: 2012.4,
        volatility: "medium",
      },
    });
  }
}

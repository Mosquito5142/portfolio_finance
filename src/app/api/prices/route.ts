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
        // ดึงข้อมูลย้อนหลัง 3 เดือน สำหรับคำนวณแนวรับ/ต้าน
        const response = await fetch(
          `${YAHOO_API_BASE}/${symbol}?interval=1d&range=3mo`,
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

        // ดึงข้อมูล 52 Week High/Low
        const high52w = meta.fiftyTwoWeekHigh;
        const low52w = meta.fiftyTwoWeekLow;

        // ดึง historical data สำหรับคำนวณ support/resistance
        const indicators = result.indicators?.quote?.[0];
        const highs: number[] =
          indicators?.high?.filter((h: number | null) => h !== null) || [];
        const lows: number[] =
          indicators?.low?.filter((l: number | null) => l !== null) || [];

        // คำนวณแนวรับ/ต้าน
        const { support, resistance } = calculateSupportResistance(
          highs,
          lows,
          actualPrice,
        );

        // ถ้าเป็น SLV และมีราคาเงิน ให้แสดงข้อมูลละเอียด
        if (symbol === "SLV" && silverPrice) {
          const estimatedPrice = silverPrice * SLV_SILVER_RATIO;
          const estimatedChange =
            ((estimatedPrice - actualPrice) / actualPrice) * 100;
          const hasSignificantDiff = Math.abs(estimatedChange) > 0.5;

          results[symbol] = {
            symbol,
            currentPrice: hasSignificantDiff ? estimatedPrice : actualPrice,
            previousClose,
            dayChange:
              (hasSignificantDiff ? estimatedPrice : actualPrice) -
              previousClose,
            dayChangePercent:
              (((hasSignificantDiff ? estimatedPrice : actualPrice) -
                previousClose) /
                previousClose) *
              100,
            isEstimated: hasSignificantDiff,
            source: "XAG/USD",
            actualClosePrice: actualPrice,
            estimatedPrice: estimatedPrice,
            estimatedChange: estimatedChange,
            // Technical
            support,
            resistance,
            high52w,
            low52w,
          };
          return;
        }

        const dayChange = actualPrice - previousClose;
        const dayChangePercent = (dayChange / previousClose) * 100;

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
        };
      } catch (error) {
        console.error(`Error fetching ${symbol}:`, error);
      }
    }),
  );

  return NextResponse.json(results);
}

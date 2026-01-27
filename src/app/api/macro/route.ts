import { NextResponse } from "next/server";

export const revalidate = 300; // Cache 5 minutes

// ดึงข้อมูล macro indicators จาก Yahoo Finance
async function fetchYahooQuote(symbol: string) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5d&interval=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;

    const quotes = result.indicators?.quote?.[0];
    const meta = result.meta;
    const closes =
      quotes?.close?.filter((c: number | null) => c !== null) || [];

    if (closes.length === 0) return null;

    const currentPrice = meta.regularMarketPrice || closes[closes.length - 1];
    const previousClose =
      meta.previousClose || closes[closes.length - 2] || currentPrice;
    const firstClose = closes[0] || currentPrice;

    const dayChange = ((currentPrice - previousClose) / previousClose) * 100;
    const change5d = ((currentPrice - firstClose) / firstClose) * 100;

    // หา trend 5 วัน
    let trend: "up" | "down" | "sideways" = "sideways";
    if (change5d > 1) trend = "up";
    else if (change5d < -1) trend = "down";

    return {
      symbol,
      price: currentPrice,
      dayChange,
      change5d,
      trend,
    };
  } catch {
    console.error(`Error fetching ${symbol}:`, arguments);
    return null;
  }
}

export async function GET() {
  try {
    // ดึงข้อมูล DXY และ US10Y พร้อมกัน
    const [dxyData, us10yData] = await Promise.all([
      fetchYahooQuote("DX-Y.NYB"), // Dollar Index
      fetchYahooQuote("^TNX"), // 10-Year Treasury Yield
    ]);

    if (!dxyData) {
      return NextResponse.json(
        { error: "ไม่สามารถดึงข้อมูล DXY ได้" },
        { status: 500 },
      );
    }

    const macroData = {
      dxy: dxyData.price,
      dxyChange: dxyData.dayChange,
      dxyChange5d: dxyData.change5d,
      dxyTrend: dxyData.trend,
      us10y: us10yData?.price || 0,
      us10yChange: us10yData?.dayChange || 0,
      timestamp: new Date().toISOString(),
    };

    // วิเคราะห์ผลกระทบต่อ commodities
    const commodityImpact = analyzeCommodityImpact(macroData);

    return NextResponse.json({
      ...macroData,
      commodityImpact,
    });
  } catch (error) {
    console.error("Macro API Error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล Macro" },
      { status: 500 },
    );
  }
}

// วิเคราะห์ผลกระทบต่อ commodities (Silver, Gold)
function analyzeCommodityImpact(macro: {
  dxyTrend: string;
  dxyChange5d: number;
  us10y: number;
  us10yChange: number;
}) {
  let impact: "bullish" | "bearish" | "neutral" = "neutral";
  let reason = "";

  // DXY ลง = Commodities มักขึ้น
  if (macro.dxyTrend === "down" && macro.dxyChange5d < -0.5) {
    impact = "bullish";
    reason = `ดอลลาร์อ่อนค่า ${macro.dxyChange5d.toFixed(2)}% ใน 5 วัน เป็นบวกต่อ Gold/Silver`;
  } else if (macro.dxyTrend === "up" && macro.dxyChange5d > 0.5) {
    impact = "bearish";
    reason = `ดอลลาร์แข็งค่า +${macro.dxyChange5d.toFixed(2)}% ใน 5 วัน กดดัน Gold/Silver`;
  }

  // Yield สูง = กดดัน Gold (ไม่จ่าย yield)
  if (macro.us10y > 4.5 && macro.us10yChange > 0) {
    if (impact === "bearish") {
      reason += ` + Yield สูง ${macro.us10y.toFixed(2)}% กดดันเพิ่ม`;
    } else if (impact === "bullish") {
      impact = "neutral";
      reason = "DXY ลง แต่ Yield สูงทำให้ผลกระทบ offset กัน";
    } else {
      impact = "bearish";
      reason = `Yield สูง ${macro.us10y.toFixed(2)}% กดดัน Gold/Silver`;
    }
  }

  return {
    impact,
    reason: reason || "ไม่มีสัญญาณชัดเจน",
    dxySignal:
      macro.dxyTrend === "down"
        ? "ดอลลาร์อ่อนค่า (ดีต่อ Commodities)"
        : macro.dxyTrend === "up"
          ? "ดอลลาร์แข็งค่า (กดดัน Commodities)"
          : "ดอลลาร์ทรงตัว",
    yieldSignal:
      macro.us10y > 4.5
        ? `Yield สูง ${macro.us10y.toFixed(2)}% (กดดัน Gold)`
        : `Yield ปานกลาง ${macro.us10y.toFixed(2)}%`,
  };
}

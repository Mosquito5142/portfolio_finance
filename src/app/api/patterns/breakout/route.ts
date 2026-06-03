import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Generate random dummy data for breakout
  const randomPrice = Math.floor(Math.random() * 200) + 50;
  
  // Randomly determine if it's a breakout candidate (about 30% chance)
  const isCandidate = Math.random() > 0.7;
  
  if (!isCandidate) {
    return NextResponse.json({
      symbol,
      isBreakout: false,
    });
  }

  const breakoutTypes = ["52_WEEK_HIGH", "ATH", "RESISTANCE", "VOLUME_SURGE"];
  const type = breakoutTypes[Math.floor(Math.random() * breakoutTypes.length)];
  
  // Random breakout level slightly below or above current price
  const breakoutLevel = randomPrice * (1 + (Math.random() * 0.04 - 0.02)); 
  const volumeSurge = Math.random() * 3 + 1.5; // 1.5x to 4.5x volume

  return NextResponse.json({
    symbol,
    isBreakout: true,
    type,
    currentPrice: randomPrice.toFixed(2),
    breakoutLevel: breakoutLevel.toFixed(2),
    volumeSurge: volumeSurge.toFixed(1), // e.g. 2.5x
    confidence: Math.floor(Math.random() * 30) + 70, // 70 to 100
  });
}

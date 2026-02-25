import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbols = searchParams.get("symbols");

    if (!symbols) {
      return NextResponse.json(
        { error: "No symbols provided" },
        { status: 400 },
      );
    }

    const apiUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Yahoo API error: ${response.status}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json({
      results: data.quoteResponse?.result || [],
    });
  } catch (error) {
    console.error("Yahoo API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from Yahoo Finance API" },
      { status: 500 },
    );
  }
}

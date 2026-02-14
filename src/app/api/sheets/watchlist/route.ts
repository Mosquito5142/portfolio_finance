import { NextResponse } from "next/server";

interface WatchlistItem {
  ticker: string;
  entry: number;
  currentPrice: number;
  cut: number;
  target: number;
  status: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: WatchlistItem[] = body.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items provided" }, { status: 400 });
    }

    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

    if (!scriptUrl) {
      return NextResponse.json(
        {
          error:
            "Google Script URL not configured. Add GOOGLE_SCRIPT_URL to .env.local",
        },
        { status: 500 },
      );
    }

    // POST to Google Apps Script Web App
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    // Apps Script redirects on success (302), so we check for that too
    if (response.ok || response.status === 302) {
      return NextResponse.json({
        success: true,
        message: `ส่ง ${items.length} ตัวเข้า Google Sheet แล้ว!`,
        count: items.length,
      });
    }

    // Try to get response text for error info
    const text = await response.text().catch(() => "Unknown error");
    return NextResponse.json(
      { error: `Google Script error: ${response.status}`, detail: text },
      { status: 502 },
    );
  } catch (error) {
    console.error("Watchlist API Error:", error);
    return NextResponse.json(
      { error: "Failed to send to Google Sheet" },
      { status: 500 },
    );
  }
}

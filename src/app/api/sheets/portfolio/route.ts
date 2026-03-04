import { NextResponse } from "next/server";

export async function GET() {
  try {
    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
    if (!scriptUrl) {
      return NextResponse.json(
        { error: "Google Script URL not configured." },
        { status: 500 },
      );
    }

    // Google Apps Script can be aggressive with GET redirects and HTML error pages.
    // Instead of HTTP GET, we use HTTP POST with actionType "PORTFOLIO_GET"
    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "PORTFOLIO_GET" }),
      cache: "no-store",
    });

    const text = await response.text();

    if (response.ok) {
      try {
        const data = JSON.parse(text);
        return NextResponse.json(data);
      } catch (e) {
        console.error(
          "Failed to parse JSON. Response:",
          text.substring(0, 300),
        );
        return NextResponse.json(
          {
            error:
              "Google Script returned HTML instead of JSON. Did you deploy as a 'New Version'? (And set permission to 'Anyone')",
            detail: text.substring(0, 300),
          },
          { status: 502 },
        );
      }
    }

    return NextResponse.json(
      {
        error: `Google Script GET error: ${response.status}`,
        detail: text.substring(0, 300),
      },
      { status: 502 },
    );
  } catch (error) {
    console.error("Portfolio GET API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio from Google Sheet" },
      { status: 500 },
    );
  }
}

// Mapper: Yahoo Finance / General Ticker -> Google Finance Ticker (For Sheets)
function mapToGoogleFinanceTicker(ticker: string): string {
  if (!ticker) return ticker;
  const upperTicker = ticker.toUpperCase();

  // General fallback rules for other common suffixes if needed
  if (upperTicker.endsWith(".BK"))
    return `BKK:${upperTicker.replace(".BK", "")}`;

  return upperTicker; // Default return unmodified
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { actionType, item } = body;

    if (!actionType || !item) {
      return NextResponse.json(
        { error: "Missing actionType or item" },
        { status: 400 },
      );
    }

    const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

    if (!scriptUrl) {
      return NextResponse.json(
        { error: "Google Script URL not configured." },
        { status: 500 },
      );
    }

    // Map Ticker to Google Finance format if adding a new trade
    let payloadItem = { ...item };
    if (actionType === "PORTFOLIO_BUY" && payloadItem.ticker) {
      payloadItem.ticker = mapToGoogleFinanceTicker(payloadItem.ticker);
    }

    const response = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType, item: payloadItem }),
    });

    if (response.ok || response.status === 302) {
      return NextResponse.json({
        success: true,
        message: `Portfolio action ${actionType} completed.`,
      });
    }

    const text = await response.text().catch(() => "Unknown error");
    return NextResponse.json(
      { error: `Google Script POST error: ${response.status}`, detail: text },
      { status: 502 },
    );
  } catch (error) {
    console.error("Portfolio POST API Error:", error);
    return NextResponse.json(
      { error: "Failed to send portfolio update to Google Sheet" },
      { status: 500 },
    );
  }
}

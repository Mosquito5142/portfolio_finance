import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ticker, entry, cut, target, alertType, triggerPrice } = body;

    if (!ticker || !entry) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
    if (!GOOGLE_SCRIPT_URL) {
      return NextResponse.json(
        { success: false, error: "GOOGLE_SCRIPT_URL not configured" },
        { status: 500 },
      );
    }

    const payload = {
      actionType: "WATCHLIST",
      items: [
        {
          ticker,
          entry: parseFloat(entry),
          cut: parseFloat(cut) || 0,
          target: parseFloat(target) || 0,
          alertType: alertType || "SMART_ENTRY",
          triggerPrice: parseFloat(triggerPrice) || parseFloat(entry),
        },
      ],
    };

    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

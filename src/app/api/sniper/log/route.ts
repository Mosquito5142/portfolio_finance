import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbzimV4_nZha4SEzvt_LkXvFz3gA0KtnzF3vsdDZuABfmHv6-ljp0PshjoNmbhHL9-CO8g/exec";

// POST: Save scan results to sniper_log sheet
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { entries } = body;

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: "entries array is required" },
        { status: 400 },
      );
    }

    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // Google Apps Script requires text/plain
      body: JSON.stringify({
        action: "SNIPER_LOG_SAVE",
        sheet: "sniper_log",
        entries: entries.map((e: any) => ({
          date: e.date || new Date().toISOString().split("T")[0],
          symbol: e.symbol,
          playbook: e.playbook,
          price: e.price,
          bbWidth: e.bbWidth,
          rsi: e.rsi,
          volumeRatio: e.volumeRatio || "",
          signals: e.signals || "",
          result: "PENDING",
        })),
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to save to Google Sheet");
    }

    const data = await res.json();
    return NextResponse.json({ success: true, saved: entries.length, data });
  } catch (error: any) {
    console.error("Sniper log save error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// GET: Fetch scan history from sniper_log sheet
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");
    const limit = parseInt(searchParams.get("limit") || "50");

    const url = new URL(GOOGLE_APPS_SCRIPT_URL);
    url.searchParams.set("sheet", "sniper_log");
    if (symbol) url.searchParams.set("symbol", symbol);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch from Google Sheet");
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data: data.data || data });
  } catch (error: any) {
    console.error("Sniper log fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

// PATCH: Update result (WIN/LOSS) for a log entry
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { rowIndex, result } = body;

    if (!rowIndex || !result || !["WIN", "LOSS", "PENDING"].includes(result)) {
      return NextResponse.json(
        { error: "rowIndex and result (WIN/LOSS/PENDING) required" },
        { status: 400 },
      );
    }

    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "SNIPER_LOG_UPDATE",
        sheet: "sniper_log",
        rowIndex,
        result,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to update Google Sheet");
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Sniper log update error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 },
    );
  }
}

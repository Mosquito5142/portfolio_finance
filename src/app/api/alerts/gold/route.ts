import { NextResponse } from "next/server";

// Gold Alert Relay — ยิงตรงเข้า LINE ผ่าน Apps Script (ไม่เขียน Sheet)

interface GoldAlertPayload {
  action: "BUY" | "SELL";
  entry: string;
  sl: string;
  tp: string;
  lot?: string;
}

export async function POST(request: Request) {
  try {
    const body: GoldAlertPayload = await request.json();

    if (!body.action || !body.entry || !body.sl || !body.tp) {
      return NextResponse.json(
        { error: "Missing required fields: action, entry, sl, tp" },
        { status: 400 },
      );
    }

    const webhookUrl = process.env.GOLD_WEBHOOK_URL;

    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "GOLD_WEBHOOK_URL not configured. Add it to .env.local",
        },
        { status: 500 },
      );
    }

    // ยิงตรงไป Apps Script Relay → LINE Notify
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: body.action,
        entry: body.entry,
        sl: body.sl,
        tp: body.tp,
        lot: body.lot || "0.30",
      }),
    });

    // Apps Script returns ContentService text
    const text = await response.text().catch(() => "");

    if (response.ok || response.status === 302 || text.includes("SUCCESS")) {
      return NextResponse.json({
        success: true,
        message: `⚡ ส่งสัญญาณ ${body.action} เข้า LINE แล้ว!`,
      });
    }

    return NextResponse.json(
      { error: `Relay failed: ${response.status}`, detail: text },
      { status: 502 },
    );
  } catch (error) {
    console.error("Gold Alert API Error:", error);
    return NextResponse.json(
      { error: "Failed to send gold alert" },
      { status: 500 },
    );
  }
}

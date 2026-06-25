import { NextResponse } from "next/server";

const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

// ── GET: ดึงรายการหุ้นทั้งหมดจาก Stock_Master ───────────────────────────
export async function GET() {
  if (!scriptUrl) {
    // ยังไม่ตั้งค่า — ให้ client fallback ไปลิสต์ในโค้ด
    return NextResponse.json({ status: "error", source: "none", data: [] });
  }
  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "STOCKS_GET" }),
      cache: "no-store",
    });
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { status: "error", source: "none", data: [], detail: text.slice(0, 200) },
        { status: 502 },
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", source: "none", data: [], detail: e.message },
      { status: 500 },
    );
  }
}

// ── POST: upsert / delete / seed ───────────────────────────────────────
// body: { actionType: "STOCKS_UPSERT", items: [...] } หรือ
//       { actionType: "STOCKS_DELETE", symbol: "XXX" }
export async function POST(request: Request) {
  if (!scriptUrl) {
    return NextResponse.json(
      { success: false, error: "GOOGLE_SCRIPT_URL not configured" },
      { status: 500 },
    );
  }
  try {
    const body = await request.json();
    const { actionType } = body;
    if (
      actionType !== "STOCKS_UPSERT" &&
      actionType !== "STOCKS_DELETE"
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid actionType" },
        { status: 400 },
      );
    }

    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      redirect: "follow",
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 200) };
    }
    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 },
    );
  }
}

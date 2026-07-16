import { NextResponse } from "next/server";

const scriptUrl = process.env.GOOGLE_SCRIPT_URL;

export interface PortfolioGroup {
  group: string;
  label: string;
  targetPct: number;
  order: number;
}

// ── GET: ดึงหมวดพอร์ต + สัดส่วนเป้าหมายจากชีต Portfolio_groups ──────────
export async function GET() {
  if (!scriptUrl) {
    return NextResponse.json(
      { status: "error", data: [], error: "Google Script URL not configured." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "GROUPS_GET" }),
      cache: "no-store",
    });

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json(
        {
          status: "error",
          data: [],
          error:
            "Google Script ส่ง HTML กลับมาแทน JSON — deploy เป็น 'New version' แล้วหรือยัง?",
          detail: text.slice(0, 200),
        },
        { status: 502 },
      );
    }
  } catch (e: any) {
    return NextResponse.json(
      { status: "error", data: [], error: e.message },
      { status: 500 },
    );
  }
}

// ── POST: เขียนทับรายการหมวดทั้งชุด { groups: [...] } ────────────────────
export async function POST(request: Request) {
  if (!scriptUrl) {
    return NextResponse.json(
      { error: "Google Script URL not configured." },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const groups = body.groups;

    if (!Array.isArray(groups) || groups.length === 0) {
      return NextResponse.json(
        { error: "ต้องส่ง groups มาอย่างน้อย 1 หมวด" },
        { status: 400 },
      );
    }

    // กันไว้ตั้งแต่ฝั่งนี้ด้วย จะได้ไม่ต้องรอ Apps Script ตอบกลับมาเป็น error
    const totalPct = groups.reduce(
      (sum: number, g: any) => sum + (Number(g.targetPct) || 0),
      0,
    );
    if (totalPct > 100.01) {
      return NextResponse.json(
        { error: `สัดส่วนรวมกันได้ ${totalPct}% ซึ่งเกิน 100%` },
        { status: 400 },
      );
    }

    const res = await fetch(scriptUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType: "GROUPS_SET", groups }),
    });

    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json(
        { error: "Google Script ตอบกลับมาไม่ใช่ JSON", detail: text.slice(0, 200) },
        { status: 502 },
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

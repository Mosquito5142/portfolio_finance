export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";

// ─── Helpers ─────────────────────────────────────────────────────────
function sma(values: number[], period: number, endIndex: number): number | null {
  // SMA ของ `period` ค่า สิ้นสุดที่ endIndex (รวม endIndex)
  if (endIndex + 1 < period) return null;
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) sum += values[i];
  return sum / period;
}

interface Bar {
  t: number; // timestamp (sec)
  c: number; // close
  h: number; // high
  l: number; // low
  v: number; // volume
}

// ─── VCP Detection (Volatility Contraction Pattern ของ Minervini) ─────
// หัวใจ VCP: ราคาแกว่งแคบลงเรื่อยๆ (contraction หดตัว) + วอลุ่มแห้ง
// + ฐานแน่นใกล้แนวต้าน → พร้อมเบรก
function detectVCP(bars: Bar[]) {
  const n = bars.length;
  const baseLen = Math.min(70, n); // ฐาน ~3 เดือน
  const seg = bars.slice(n - baseLen);
  const highs = seg.map((b) => b.h);
  const lows = seg.map((b) => b.l);
  const vols = seg.map((b) => b.v);
  const price = bars[n - 1].c;

  // 1) หา swing pivots เพื่อวัด "การหดตัว" (contraction) แต่ละรอบ
  const k = 3; // เป็น swing เมื่อสูง/ต่ำสุดในกรอบ ±3 แท่ง
  type Piv = { idx: number; price: number; type: "H" | "L" };
  const raw: Piv[] = [];
  for (let i = k; i < seg.length - k; i++) {
    let isH = true;
    let isL = true;
    for (let j = i - k; j <= i + k; j++) {
      if (highs[j] > highs[i]) isH = false;
      if (lows[j] < lows[i]) isL = false;
    }
    if (isH) raw.push({ idx: i, price: highs[i], type: "H" });
    else if (isL) raw.push({ idx: i, price: lows[i], type: "L" });
  }
  // บีบ pivots ให้สลับ H/L (เก็บค่าสุดโต่งของชนิดเดียวกันที่ติดกัน)
  const piv: Piv[] = [];
  for (const p of raw) {
    const last = piv[piv.length - 1];
    if (!last || last.type !== p.type) piv.push(p);
    else if (
      (p.type === "H" && p.price > last.price) ||
      (p.type === "L" && p.price < last.price)
    )
      piv[piv.length - 1] = p;
  }
  // วัดความลึกของแต่ละ contraction (จาก swing High ลงไป swing Low ถัดไป)
  const contractions: number[] = [];
  for (let i = 0; i < piv.length - 1; i++) {
    if (piv[i].type === "H" && piv[i + 1].type === "L") {
      const depth = ((piv[i].price - piv[i + 1].price) / piv[i].price) * 100;
      if (depth > 0) contractions.push(Number(depth.toFixed(1)));
    }
  }
  const lastC = contractions.slice(-4); // ดูสูงสุด 4 รอบล่าสุด
  // contractions ต้องหดตัวลงเรื่อยๆ (รอบหลังตื้นกว่ารอบก่อน, ผ่อนผัน 15%)
  let shrinking = lastC.length >= 2;
  for (let i = 1; i < lastC.length; i++) {
    if (lastC[i] > lastC[i - 1] * 1.15) shrinking = false;
  }
  const tightestPullback = lastC.length ? lastC[lastC.length - 1] : null;

  // 2) ความผันผวนหดตัว (เทียบช่วงต้นฐาน vs ช่วงท้ายฐาน)
  const third = Math.max(5, Math.floor(baseLen / 3));
  const rangePct = (arr: Bar[]) =>
    arr.reduce((s, b) => s + ((b.h - b.l) / b.c) * 100, 0) / arr.length;
  const earlyVola = rangePct(seg.slice(0, third));
  const recentVola = rangePct(seg.slice(seg.length - third));
  const volContracted = recentVola < earlyVola * 0.7;

  // 3) วอลุ่มแห้ง (10 วันล่าสุดต่ำกว่าค่าเฉลี่ยฐาน)
  const vol10 = vols.slice(-10).reduce((s, v) => s + v, 0) / Math.min(10, vols.length);
  const volBase = vols.reduce((s, v) => s + v, 0) / vols.length;
  const volDryUp = volBase > 0 && vol10 < volBase * 0.85;

  // 4) ฐานปัจจุบันแน่น (range 12 วันล่าสุดแคบ)
  const recent = seg.slice(-12);
  const rHigh = Math.max(...recent.map((b) => b.h));
  const rLow = Math.min(...recent.map((b) => b.l));
  const tightRangePct = rLow > 0 ? ((rHigh - rLow) / rLow) * 100 : 999;
  const isTight = tightRangePct < 12;

  // 5) ราคาอยู่ใกล้แนวต้านของฐาน (พร้อมเบรก ไม่ใช่ยังอยู่ก้นเหว)
  const baseHigh = Math.max(...highs);
  const nearPivot = price >= baseHigh * 0.9;

  // คะแนนรวม
  let score = 0;
  if (shrinking) score += 30;
  if (volContracted) score += 20;
  if (volDryUp) score += 20;
  if (isTight) score += 15;
  if (nearPivot) score += 15;

  const detected = score >= 60 && contractions.length >= 2 && nearPivot;

  // จุด swing สำหรับวาดบนกราฟ (date ตรงกับ chart series)
  const pivots = piv.map((p) => {
    const dt = new Date(seg[p.idx].t * 1000);
    return {
      date: `${dt.getMonth() + 1}/${dt.getDate()}`,
      price: Number(p.price.toFixed(2)),
      type: p.type,
    };
  });

  return {
    detected,
    score,
    pivots,
    contractions: lastC,
    tightestPullback,
    volDryUp,
    volContracted,
    isTight,
    nearPivot,
    tightRangePct: Number(tightRangePct.toFixed(1)),
    baseHigh: Number(baseHigh.toFixed(2)),
    baseLow: Number(rLow.toFixed(2)),
  };
}

// ─── Yahoo Finance daily chart (FREE, no API key) ─────────────────────
async function getYahooDaily(symbol: string): Promise<Bar[] | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2y`,
      { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const ts: number[] = result?.timestamp;
    const q = result?.indicators?.quote?.[0];
    if (!ts || !q?.close) return null;

    const bars: Bar[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = q.close[i];
      if (c === null || c === undefined) continue;
      bars.push({
        t: ts[i],
        c,
        h: q.high?.[i] ?? c,
        l: q.low?.[i] ?? c,
        v: q.volume?.[i] ?? 0,
      });
    }
    return bars.length ? bars : null;
  } catch {
    return null;
  }
}

// Cache benchmark (SPY) across requests within the same server process
let spyCache: { ts: number; ret: number } | null = null;
async function getSpyReturn(): Promise<number | null> {
  // คืนค่า % การเปลี่ยนแปลงราคา SPY ในรอบ ~252 วัน (ใช้เป็น benchmark วัด RS)
  if (spyCache && Date.now() - spyCache.ts < 10 * 60 * 1000) return spyCache.ret;
  const bars = await getYahooDaily("SPY");
  if (!bars || bars.length < 30) return null;
  const last = bars[bars.length - 1].c;
  const lookback = bars.length > 252 ? bars[bars.length - 252].c : bars[0].c;
  const ret = ((last - lookback) / lookback) * 100;
  spyCache = { ts: Date.now(), ret };
  return ret;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    const bars = await getYahooDaily(symbol);
    if (!bars || bars.length < 200) {
      return NextResponse.json({
        symbol,
        status: "error",
        reason: "ข้อมูลไม่พอ (ต้องมีอย่างน้อย ~200 วันทำการ)",
      });
    }

    const closes = bars.map((b) => b.c);
    const n = bars.length;
    const last = n - 1;

    const price = closes[last];
    const ma50 = sma(closes, 50, last);
    const ma150 = sma(closes, 150, last);
    const ma200 = sma(closes, 200, last);
    // MA200 เมื่อ ~1 เดือนก่อน (22 วันทำการ) เพื่อเช็คว่าเทรนด์ MA200 ชี้ขึ้น
    const ma200_1moAgo = sma(closes, 200, Math.max(0, last - 22));

    // 52-week high/low (ใช้ ~252 แท่งล่าสุด)
    const window = bars.slice(Math.max(0, n - 252));
    const high52 = Math.max(...window.map((b) => b.h));
    const low52 = Math.min(...window.map((b) => b.l));

    // RS เทียบกับ SPY (proxy ของ RS Rating แบบ IBD)
    const lookbackIdx = n > 252 ? n - 252 : 0;
    const stockRet = ((price - closes[lookbackIdx]) / closes[lookbackIdx]) * 100;
    const spyRet = await getSpyReturn();
    const rsVsSpy = spyRet !== null ? stockRet - spyRet : null;

    // ── Trend Template ของ Mark Minervini (8 ข้อ) ──────────────────────
    const pctFromLow = ((price - low52) / low52) * 100; // ห่างจากจุดต่ำสุด
    const pctFromHigh = ((price - high52) / high52) * 100; // ติดลบ = ต่ำกว่าจุดสูงสุด

    const c = (pass: boolean, name: string, detail: string) => ({ pass, name, detail });

    const criteria = [
      c(
        ma150 !== null && ma200 !== null && price > ma150 && price > ma200,
        "ราคา > MA150 และ MA200",
        ma150 && ma200
          ? `ราคา $${price.toFixed(2)} | MA150 $${ma150.toFixed(2)} | MA200 $${ma200.toFixed(2)}`
          : "N/A",
      ),
      c(
        ma150 !== null && ma200 !== null && ma150 > ma200,
        "MA150 > MA200",
        ma150 && ma200 ? `$${ma150.toFixed(2)} > $${ma200.toFixed(2)}` : "N/A",
      ),
      c(
        ma200 !== null && ma200_1moAgo !== null && ma200 > ma200_1moAgo,
        "MA200 ชี้ขึ้น (อย่างน้อย 1 เดือน)",
        ma200 && ma200_1moAgo
          ? `ตอนนี้ $${ma200.toFixed(2)} vs 1เดือนก่อน $${ma200_1moAgo.toFixed(2)}`
          : "N/A",
      ),
      c(
        ma50 !== null && ma150 !== null && ma200 !== null && ma50 > ma150 && ma50 > ma200,
        "MA50 > MA150 และ MA200",
        ma50 && ma150 && ma200
          ? `MA50 $${ma50.toFixed(2)} > MA150/MA200`
          : "N/A",
      ),
      c(
        ma50 !== null && price > ma50,
        "ราคา > MA50",
        ma50 ? `ราคา $${price.toFixed(2)} | MA50 $${ma50.toFixed(2)}` : "N/A",
      ),
      c(
        pctFromLow >= 30,
        "อยู่สูงกว่าจุดต่ำสุด 52wk ≥ 30%",
        `สูงกว่าจุดต่ำสุด +${pctFromLow.toFixed(1)}%`,
      ),
      c(
        pctFromHigh >= -25,
        "อยู่ในระยะ 25% จากจุดสูงสุด 52wk",
        `ห่างจากจุดสูงสุด ${pctFromHigh.toFixed(1)}%`,
      ),
      c(
        rsVsSpy !== null && rsVsSpy > 0,
        "RS แข็งแกร่งกว่าตลาด (เทียบ SPY)",
        rsVsSpy !== null
          ? `หุ้น ${stockRet.toFixed(1)}% vs SPY ${spyRet!.toFixed(1)}% (RS ${rsVsSpy > 0 ? "+" : ""}${rsVsSpy.toFixed(1)}%)`
          : "N/A (ไม่มีข้อมูล benchmark)",
      ),
    ];

    const passed = criteria.filter((x) => x.pass).length;
    const total = criteria.length;
    const meetsTemplate = passed === total;

    // ── Stage Analysis (วัฏจักร 4 ระยะ ของ Weinstein/Minervini) ────────
    // ใช้ตำแหน่งราคาเทียบ MA200 + ความชัน MA200 แบ่ง 4 quadrant
    const slope200 =
      ma200 !== null && ma200_1moAgo !== null && ma200_1moAgo > 0
        ? ((ma200 - ma200_1moAgo) / ma200_1moAgo) * 100
        : null;
    const aboveMA200 = ma200 !== null && price > ma200;
    const ma200Rising = slope200 !== null && slope200 > 0.5; // ชี้ขึ้นชัดเจน
    const ma200Falling = slope200 !== null && slope200 < -0.5;

    let stage: { num: number; name: string; action: string } = {
      num: 0,
      name: "ไม่ระบุ",
      action: "ข้อมูลไม่พอ",
    };
    if (slope200 !== null && ma200 !== null) {
      if (aboveMA200 && !ma200Falling) {
        // ราคาเหนือ MA200 + MA200 ไม่ลง
        if (ma200Rising && ma50 !== null && ma50 > ma200) {
          stage = {
            num: 2,
            name: "Stage 2 — ขาขึ้น (Advancing)",
            action: "✅ โซนซื้อ — เทรนด์แข็งแรง",
          };
        } else {
          stage = {
            num: 3,
            name: "Stage 3 — ทำยอด/แกว่งออกข้าง (Topping)",
            action: "⚠️ ระวัง — โมเมนตัมเริ่มแผ่ว",
          };
        }
      } else if (!aboveMA200 && !ma200Falling) {
        stage = {
          num: 1,
          name: "Stage 1 — สะสมฐาน (Basing)",
          action: "👀 เฝ้ารอ — ยังไม่เลือกข้าง",
        };
      } else {
        stage = {
          num: 4,
          name: "Stage 4 — ขาลง (Declining)",
          action: "❌ หลีกเลี่ยง — อยู่ในขาลง",
        };
      }
    }

    // ── VCP Detection ──────────────────────────────────────────────────
    const vcp = detectVCP(bars);

    // ── Setup การเข้าซื้อแบบ Minervini (Pivot / Buy Stop / Stop Loss) ──
    // ถ้าเจอ VCP: ใช้แนวต้านของฐาน VCP เป็น pivot และ low ของฐานเป็น stop
    // ถ้าไม่เจอ: ใช้ proxy เดิม (high 15 วันก่อนหน้า)
    let pivot: number;
    let stopLoss: number;
    if (vcp.detected) {
      pivot = vcp.baseHigh;
      // stop ใต้ฐานล่าสุด แต่ไม่ให้เสี่ยงเกิน 10%
      stopLoss = Math.max(vcp.baseLow, pivot * 0.9);
    } else {
      const pivotWindow = bars.slice(Math.max(0, n - 16), n - 1);
      pivot = pivotWindow.length
        ? Math.max(...pivotWindow.map((b) => b.h))
        : high52;
      stopLoss = pivot * 0.92; // ตัดขาดทุน ~8% ใต้ pivot (กรอบ Minervini)
    }
    const buyTrigger = pivot; // ตั้ง Buy Stop เหนือ pivot
    const distanceToBuy = ((buyTrigger - price) / price) * 100;
    const riskPct = ((buyTrigger - stopLoss) / buyTrigger) * 100;

    // ปริมาณการซื้อขาย: เทียบ vol วันนี้กับค่าเฉลี่ย 50 วัน
    const vol50 =
      bars.slice(Math.max(0, n - 50)).reduce((s, b) => s + b.v, 0) /
      Math.min(50, n);
    const volRatio = vol50 > 0 ? bars[last].v / vol50 : null;

    // ── Series สำหรับวาดกราฟ (เส้นราคา + MA) ~120 แท่งล่าสุด ──────────
    const chartStart = Math.max(0, n - 120);
    const chart = [];
    for (let i = chartStart; i < n; i++) {
      const dt = new Date(bars[i].t * 1000);
      chart.push({
        date: `${dt.getMonth() + 1}/${dt.getDate()}`,
        close: Number(bars[i].c.toFixed(2)),
        ma50: (() => {
          const v = sma(closes, 50, i);
          return v !== null ? Number(v.toFixed(2)) : null;
        })(),
        ma150: (() => {
          const v = sma(closes, 150, i);
          return v !== null ? Number(v.toFixed(2)) : null;
        })(),
        ma200: (() => {
          const v = sma(closes, 200, i);
          return v !== null ? Number(v.toFixed(2)) : null;
        })(),
      });
    }

    return NextResponse.json({
      symbol,
      status: "success",
      price: Number(price.toFixed(2)),
      meetsTemplate,
      passed,
      total,
      score: Math.round((passed / total) * 100),
      stage,
      criteria,
      metrics: {
        ma50: ma50 !== null ? Number(ma50.toFixed(2)) : null,
        ma150: ma150 !== null ? Number(ma150.toFixed(2)) : null,
        ma200: ma200 !== null ? Number(ma200.toFixed(2)) : null,
        high52: Number(high52.toFixed(2)),
        low52: Number(low52.toFixed(2)),
        pctFromHigh: Number(pctFromHigh.toFixed(1)),
        pctFromLow: Number(pctFromLow.toFixed(1)),
        rsVsSpy: rsVsSpy !== null ? Number(rsVsSpy.toFixed(1)) : null,
        volRatio: volRatio !== null ? Number(volRatio.toFixed(2)) : null,
      },
      setup: {
        pivot: Number(pivot.toFixed(2)),
        buyTrigger: Number(buyTrigger.toFixed(2)),
        stopLoss: Number(stopLoss.toFixed(2)),
        distanceToBuy: Number(distanceToBuy.toFixed(1)),
        riskPct: Number(riskPct.toFixed(1)),
      },
      vcp,
      chart,
    });
  } catch (error: any) {
    return NextResponse.json(
      { symbol, status: "error", reason: error.message },
      { status: 500 },
    );
  }
}

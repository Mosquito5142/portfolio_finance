export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { NextResponse } from "next/server";

// ─── Helpers ─────────────────────────────────────────────────────────
function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

interface Bar {
  t: number;
  c: number;
  h: number;
  l: number;
  v: number;
  o: number;
}

// ─── AVWAP Helper ────────────────────────────────────────────────────
function calcAvwap(bars: Bar[], startIndex: number): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null);
  let cumVol = 0;
  let cumVolPrice = 0;
  for (let i = startIndex; i < bars.length; i++) {
    const b = bars[i];
    const tp = (b.h + b.l + b.c) / 3;
    cumVol += b.v;
    cumVolPrice += b.v * tp;
    out[i] = cumVol > 0 ? cumVolPrice / cumVol : null;
  }
  return out;
}

// ─── Yahoo Finance daily chart (FREE, no API key) ─────────────────────
async function getYahooDaily(symbol: string): Promise<Bar[] | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`,
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
        o: q.open?.[i] ?? c,
        v: q.volume?.[i] ?? 0,
      });
    }
    return bars.length ? bars : null;
  } catch {
    return null;
  }
}

// ─── Martin Luk Watchlist Tiering ──────────────────────────────────────
function classifyTier(e9: number, e21: number, e50: number): {
  tier: "LEAD" | "MEDIOCRE" | "LAG";
  label: string;
} {
  if (e9 > e21 && e21 > e50) return { tier: "LEAD", label: "🥇 Lead (Strong Trend)" };
  if (e9 < e21 && e21 < e50) return { tier: "LAG", label: "🥉 Lag (Weak Trend)" };
  return { tier: "MEDIOCRE", label: "🥈 Mediocre (Mixed)" };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol")?.toUpperCase();

  if (!symbol) {
    return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
  }

  try {
    const bars = await getYahooDaily(symbol);
    if (!bars || bars.length < 60) {
      return NextResponse.json({
        symbol,
        status: "error",
        reason: "Insufficient data (requires at least ~60 trading days)",
      });
    }

    const closes = bars.map((b) => b.c);
    const n = bars.length;
    const last = n - 1;
    const price = closes[last];

    // EMAs
    const ema9Arr = ema(closes, 9);
    const ema21Arr = ema(closes, 21);
    const ema50Arr = ema(closes, 50);

    const e9 = ema9Arr[last];
    const e21 = ema21Arr[last];
    const e50 = ema50Arr[last];

    if (e9 === null || e21 === null || e50 === null) {
      return NextResponse.json({
        symbol,
        status: "error",
        reason: "Cannot calculate EMAs",
      });
    }

    const { tier, label } = classifyTier(e9, e21, e50);

    // ─── Trend Crossover Detection (ตรงกับ Pine Script "trendStart") ─────
    // isLead[i] = EMA9>EMA21>EMA50 ที่แท่ง i, liquidityPass[i] = dollarVol 20 วันย้อนหลัง > $1M
    // crossover = วันแรกที่ isLead กลายเป็น true (จาก false เมื่อวันก่อน) + liquidity ผ่าน
    const crossovers: { date: string; price: number }[] = [];
    {
      let rollingVolSum = 0;
      const volQueue: number[] = [];
      let prevIsLead: boolean | null = null;
      for (let i = 0; i < n; i++) {
        volQueue.push(bars[i].v);
        rollingVolSum += bars[i].v;
        if (volQueue.length > 20) rollingVolSum -= volQueue.shift()!;
        const avgVolAtI = rollingVolSum / volQueue.length;
        const dollarVolAtI = avgVolAtI * bars[i].c;
        const liquidityPassAtI = dollarVolAtI > 1_000_000;

        const a9 = ema9Arr[i];
        const a21 = ema21Arr[i];
        const a50 = ema50Arr[i];
        const isLeadAtI =
          a9 !== null && a21 !== null && a50 !== null && a9 > a21 && a21 > a50;

        if (prevIsLead === false && isLeadAtI && liquidityPassAtI) {
          const dt = new Date(bars[i].t * 1000);
          crossovers.push({
            date: `${dt.getMonth() + 1}/${dt.getDate()}`,
            price: Number(bars[i].l.toFixed(2)), // ป้ายอยู่ใต้แท่ง เหมือน Pine (location.belowbar)
          });
        }
        prevIsLead = isLeadAtI;
      }
    }

    // ─── AVWAP Anchors ──────────────────────────────────────────────────
    let highestIndex = 0;
    let highestPrice = -Infinity;
    let lowestIndex = 0;
    let lowestPrice = Infinity;

    for (let i = 0; i < n; i++) {
      if (bars[i].h > highestPrice) {
        highestPrice = bars[i].h;
        highestIndex = i;
      }
      if (bars[i].l < lowestPrice) {
        lowestPrice = bars[i].l;
        lowestIndex = i;
      }
    }

    const avwapHighArr = calcAvwap(bars, highestIndex);
    const avwapLowArr = calcAvwap(bars, lowestIndex);

    const aHigh = avwapHighArr[last];
    const aLow = avwapLowArr[last];

    // ─── Momentum Filter ────────────────────────────────────────────────
    const p1m = n >= 21 ? bars[n - 21].c : null;
    const p3m = n >= 63 ? bars[n - 63].c : null;
    const p6m = n >= 126 ? bars[n - 126].c : null;

    const r1m = p1m ? ((price - p1m) / p1m) * 100 : 0;
    const r3m = p3m ? ((price - p3m) / p3m) * 100 : 0;
    const r6m = p6m ? ((price - p6m) / p6m) * 100 : 0;

    const momentumPass = r1m > 30 || r3m > 30 || r6m > 30;

    // ─── Liquidity Filter ───────────────────────────────────────────────
    const volWindow = 20;
    const volSeg = bars.slice(Math.max(0, n - volWindow));
    const avgVol = volSeg.reduce((s, b) => s + b.v, 0) / volSeg.length;
    const dollarVol = avgVol * price;
    const liquidityPass = dollarVol > 1000000;

    // ─── ADR ────────────────────────────────────────────────────────────
    const adrWindow = 20;
    const adrSeg = bars.slice(Math.max(0, n - adrWindow));
    const adrPct =
      adrSeg.reduce((s, b) => s + ((b.h - b.l) / b.c) * 100, 0) / adrSeg.length;
    const highADR = adrPct >= 5;

    // ─── Forecast: คาดการณ์ราคาที่ EMA จะตัดเป็น UPTREND (ล่วงหน้า) ────────
    // แก้สมการ EMA แท่งถัดไป: ราคาปิดเท่าไหร่ถึงทำให้ EMA9>EMA21>EMA50
    const k9 = 2 / 10;
    const k21 = 2 / 22;
    const k50 = 2 / 51;
    // c1 = ราคาที่ทำให้ EMA9 ตัดขึ้นเหนือ EMA21
    const c1 = (e21 * (1 - k21) - e9 * (1 - k9)) / (k9 - k21);
    // c2 = ราคาที่ทำให้ EMA21 ตัดขึ้นเหนือ EMA50
    const c2 = (e50 * (1 - k50) - e21 * (1 - k21)) / (k21 - k50);
    const crossPrice = Math.max(c1, c2); // ต้องผ่านทั้งคู่ถึงเป็น LEAD เต็มตัว
    const forecastDistPct = ((crossPrice - price) / price) * 100;
    const isLeadNow = tier === "LEAD";
    // "ใกล้จุดตัด" = ยังไม่ LEAD และราคาต้องขึ้นอีกไม่เกินระยะที่กำหนด (ผูกกับ ADR)
    const approachThreshold = Math.min(10, Math.max(4, adrPct * 1.2));
    const approaching =
      !isLeadNow && forecastDistPct > 0 && forecastDistPct <= approachThreshold;

    // ─── Base Strength: ยิ่งทำฐานนาน+แน่น ยิ่งแข็งแกร่ง (มีเวลาเตรียมตัว) ──
    // นับถอยหลังจากวันนี้ ว่าราคาอยู่ในกรอบไม่หลุด (สร้างฐาน) มากี่วัน
    const rangeCap = 30; // ฐานกว้างได้ถึง 30% (หุ้น ADR สูงแกว่งกว้าง)
    let bsDays = 0;
    let bsHigh = -Infinity;
    let bsLow = Infinity;
    for (let i = n - 1; i >= 0; i--) {
      const nh = Math.max(bsHigh, bars[i].h);
      const nl = Math.min(bsLow, bars[i].l);
      if (((nh - nl) / nl) * 100 > rangeCap) break;
      bsHigh = nh;
      bsLow = nl;
      bsDays++;
    }
    const bsRange = bsLow > 0 && bsHigh > -Infinity ? ((bsHigh - bsLow) / bsLow) * 100 : rangeCap;
    const tightComp = Math.max(0, 1 - bsRange / rangeCap); // แน่นกว่า = สูง
    const durComp = Math.min(1, bsDays / 60); // นานกว่า = สูง (อิ่มตัว ~60 วัน)
    const baseStrength = Math.round(durComp * 60 + tightComp * 40);
    const baseLabel =
      baseStrength >= 70
        ? "🟢 ฐานแกร่งมาก"
        : baseStrength >= 40
          ? "🟡 ฐานปานกลาง"
          : "⚪ ฐานสั้น/อ่อน";

    // ─── Prime Setup: มีครบทั้ง "ฐานแข็งแรง" + "ใกล้จุดตัด" = ควรค่าเฝ้าดู ───
    // (ตรงกับจุดที่ลูกศรชี้ในกราฟ — ฐานพร้อม + EMA จ่อตัดขึ้น)
    const primeSetup = approaching && baseStrength >= 40;

    // ─── Pullback Detection ─────────────────────────────────────────────
    const distToEma9 = ((price - e9) / e9) * 100;
    const distToEma21 = ((price - e21) / e21) * 100;
    const distToAvwapHigh = aHigh ? ((price - aHigh) / aHigh) * 100 : null;
    const distToAvwapLow = aLow ? ((price - aLow) / aLow) * 100 : null;

    const nearEma9 = Math.abs(distToEma9) <= 2.5;
    const nearEma21 = Math.abs(distToEma21) <= 2.5;
    const nearAvwapHigh = distToAvwapHigh !== null && Math.abs(distToAvwapHigh) <= 2.5;
    const nearAvwapLow = distToAvwapLow !== null && Math.abs(distToAvwapLow) <= 2.5;

    // Must be LEAD tier or have high momentum, and be near a key moving average/VWAP
    const inPullbackZone = (tier === "LEAD" || momentumPass) && (nearEma9 || nearEma21 || nearAvwapHigh || nearAvwapLow);

    const today = bars[last];
    const yesterday = bars[last - 1];
    const bouncing = today.c > today.o && today.c > yesterday.c;

    const rangePct = ((today.h - today.l) / today.c) * 100;
    const avgRange10 =
      bars.slice(Math.max(0, n - 11), n - 1).reduce((s, b) => s + ((b.h - b.l) / b.c) * 100, 0) / 10;
    const tightDay = rangePct < avgRange10 * 0.7;

    // ─── Base Building Filter (Consolidation) ───────────────────────────
    // Check if the stock has been consolidating in a tight range over the last 1 month (21 trading days)
    const baseWindow = 21;
    const baseSeg = bars.slice(Math.max(0, n - baseWindow), n);
    let baseHigh = 0;
    let baseLow = Infinity;
    for (const b of baseSeg) {
      if (b.h > baseHigh) baseHigh = b.h;
      if (b.l < baseLow) baseLow = b.l;
    }
    const baseRangePct = baseLow > 0 ? ((baseHigh - baseLow) / baseLow) * 100 : 0;
    const isBasing = baseRangePct <= 25 && baseSeg.length >= 15;

    // A valid setup requires the stock to be basing, in a pullback zone, and showing a bounce or tight inside day.
    const pullbackSignal = inPullbackZone && isBasing && (bouncing || tightDay);

    // ─── Setup: Entry / Stop Loss ───────────────────────────────────────
    const entryTrigger = today.h;
    
    // Stop Loss: Low of the Day (Strict Martin Luk Rule)
    const stopLoss = today.l;
    
    // Prevent stop being higher than entry (data anomaly)
    const safeStop = Math.min(stopLoss, entryTrigger * 0.99); 
    const riskPct = ((entryTrigger - safeStop) / entryTrigger) * 100;
    const riskPass = riskPct <= 4; // Martin Luk prefers 1-4% risk

    // ─── Chart Data ─────────────────────────────────────────────────────
    const chartStart = Math.max(0, n - 90);
    const chart = [];
    for (let i = chartStart; i < n; i++) {
      const dt = new Date(bars[i].t * 1000);
      chart.push({
        date: `${dt.getMonth() + 1}/${dt.getDate()}`,
        close: Number(bars[i].c.toFixed(2)),
        ema9: ema9Arr[i] !== null ? Number(ema9Arr[i]!.toFixed(2)) : null,
        ema21: ema21Arr[i] !== null ? Number(ema21Arr[i]!.toFixed(2)) : null,
        ema50: ema50Arr[i] !== null ? Number(ema50Arr[i]!.toFixed(2)) : null,
        avwapHigh: avwapHighArr[i] !== null ? Number(avwapHighArr[i]!.toFixed(2)) : null,
        avwapLow: avwapLowArr[i] !== null ? Number(avwapLowArr[i]!.toFixed(2)) : null,
      });
    }

    return NextResponse.json({
      symbol,
      status: "success",
      price: Number(price.toFixed(2)),
      tier,
      tierLabel: label,
      adrPct: Number(adrPct.toFixed(1)),
      highADR,
      forecast: {
        isLeadNow,
        crossPrice: Number(crossPrice.toFixed(2)),
        distPct: Number(forecastDistPct.toFixed(1)),
        approaching,
        approachThreshold: Number(approachThreshold.toFixed(1)),
      },
      baseStrength: {
        score: baseStrength,
        days: bsDays,
        rangePct: Number(bsRange.toFixed(1)),
        label: baseLabel,
      },
      primeSetup,
      momentum: {
        pass: momentumPass,
        r1m: Number(r1m.toFixed(1)),
        r3m: Number(r3m.toFixed(1)),
        r6m: Number(r6m.toFixed(1)),
      },
      liquidity: {
        pass: liquidityPass,
        dollarVol: dollarVol,
      },
      pullback: {
        inPullbackZone,
        nearEma9,
        nearEma21,
        nearAvwapHigh,
        nearAvwapLow,
        distToEma9: Number(distToEma9.toFixed(1)),
        distToEma21: Number(distToEma21.toFixed(1)),
        distToAvwapHigh: distToAvwapHigh !== null ? Number(distToAvwapHigh.toFixed(1)) : null,
        distToAvwapLow: distToAvwapLow !== null ? Number(distToAvwapLow.toFixed(1)) : null,
        bouncing,
        tightDay,
        signal: pullbackSignal,
        isBasing,
        baseRangePct: Number(baseRangePct.toFixed(1)),
      },
      metrics: {
        ema9: Number(e9.toFixed(2)),
        ema21: Number(e21.toFixed(2)),
        ema50: Number(e50.toFixed(2)),
        avwapHigh: aHigh ? Number(aHigh.toFixed(2)) : null,
        avwapLow: aLow ? Number(aLow.toFixed(2)) : null,
      },
      setup: {
        entryTrigger: Number(entryTrigger.toFixed(2)),
        stopLoss: Number(safeStop.toFixed(2)),
        riskPct: Number(riskPct.toFixed(1)),
        riskPass,
      },
      chart,
      crossovers, // จุดตัด EMA9>21>50 ทั้งหมด (สำหรับเทียบกับ Pine Script บน TradingView)
    });
  } catch (error: any) {
    return NextResponse.json(
      { symbol, status: "error", reason: error.message },
      { status: 500 },
    );
  }
}

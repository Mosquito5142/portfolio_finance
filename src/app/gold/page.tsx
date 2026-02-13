"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

// ============ TYPES ============
interface TimeframeData {
  ema50: number;
  price: number;
  priceVsEma: "above" | "below";
  distPercent: number;
  rsi: number;
  rsiPrev: number;
  rsiSlope: "up" | "down" | "flat";
  macdHist: number;
  macdHistPrev: number;
  macdCrossing: "green_first" | "red_first" | "none";
}

interface GoldV2Data {
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  timeframes: {
    m15: TimeframeData | null;
    h1: TimeframeData | null;
    h4: TimeframeData | null;
  };
  fetchedAt: string;
}

// ============ CONSTANTS (Cent Account) ============
const MAX_RISK_USD = 3.0; // ยอมเสียสูงสุด $3 (~100 บาท = 300 Cents)
const SL_DISTANCE = 10.0; // SL กว้าง $10 (หนีการสะบัดหลอก)
const TP_DISTANCE = SL_DISTANCE * 2; // TP $20 (R:R = 1:2)
const CENT_LOT = Math.round((MAX_RISK_USD / SL_DISTANCE) * 100) / 100; // = 0.30 Cent Lot
const SPREAD_LIMIT = 30; // Max spread in points
const NEWS_BUFFER_MIN = 30; // 30 min buffer around news
const THB_PER_USD = 34;

export default function GoldSniperV2Page() {
  const [data, setData] = useState<GoldV2Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spread, setSpread] = useState(25);
  const [nextNewsMin, setNextNewsMin] = useState(60); // Minutes until next red news
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  // ============ LINE ALERT (Anti-Spam) ============
  const [sendingAlert, setSendingAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const isAlertSent = useRef(false); // ล็อคไกปืน ป้องกันสแปม
  const lastSignalRef = useRef<string | null>(null); // ตรวจจับสัญญาณเปลี่ยน

  // ============ DATA FETCHING ============
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/gold");
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      } else {
        setError(json.error || "Failed to fetch data");
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // ยิง LINE ตรง (ผ่าน Relay API → Apps Script → LINE)
  const fireLineAlert = useCallback(
    async (action: "BUY" | "SELL", entry: number, sl: number, tp: number) => {
      setSendingAlert(true);
      setAlertMessage("");

      try {
        const res = await fetch("/api/alerts/gold", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            entry: entry.toFixed(2),
            sl: sl.toFixed(2),
            tp: tp.toFixed(2),
            lot: CENT_LOT.toFixed(2),
          }),
        });
        if (res.ok) {
          setAlertMessage(
            `⚡ ส่งสัญญาณ ${action} (${CENT_LOT} Lot) เข้า LINE แล้ว!`,
          );
        } else {
          setAlertMessage("❌ ส่งไม่สำเร็จ");
        }
      } catch {
        setAlertMessage("❌ เชื่อมต่อไม่ได้");
      }

      setSendingAlert(false);
      setTimeout(() => setAlertMessage(""), 8000);
    },
    [],
  );

  useEffect(() => {
    setMounted(true);
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ============ GATE 1: SURVIVAL FILTERS ============
  const thaiHour = mounted ? currentTime.getHours() : 12;
  const thaiMin = mounted ? currentTime.getMinutes() : 0;
  const thaiDay = mounted ? currentTime.getDay() : 1; // 0=Sun, 6=Sat
  const thaiTimeStr = mounted
    ? `${String(thaiHour).padStart(2, "0")}:${String(thaiMin).padStart(2, "0")}`
    : "--:--";

  // ตลาดทองเปิด 24 ชม. จันทร์-ศุกร์, ปิดเสาร์-อาทิตย์
  const isWeekday = thaiDay >= 1 && thaiDay <= 5;
  const isTradeTime = isWeekday;

  // แสดง Session ปัจจุบัน
  let sessionLabel = "";
  if (thaiHour >= 5 && thaiHour < 14) {
    sessionLabel = "🇯🇵 Asia Session";
  } else if (thaiHour >= 14 && thaiHour < 19) {
    sessionLabel = "🇪🇺 Europe Session";
  } else if (thaiHour >= 19 && thaiHour < 23) {
    sessionLabel = "🇺🇸 NY Overlap (⭐ Best!)";
  } else {
    sessionLabel = "🇺🇸 NY Late / Off-peak";
  }

  const isSpreadSafe = spread <= SPREAD_LIMIT;
  const isNewsSafe = nextNewsMin >= NEWS_BUFFER_MIN;

  const gate1Pass = isTradeTime && isSpreadSafe && isNewsSafe;

  // ============ GATE 2: MACRO TREND (H1/H4) ============
  const h4Trend = data?.timeframes.h4?.priceVsEma || null;
  const h1Trend = data?.timeframes.h1?.priceVsEma || null;

  let macroDirection: "buy" | "sell" | "wait" = "wait";
  let macroLabel = "➡️ SIDEWAYS";
  let macroText = "H1/H4 ขัดแย้ง — ห้ามเทรด";

  if (h4Trend === "above" && h1Trend === "above") {
    macroDirection = "buy";
    macroLabel = "⬆️ BULLISH";
    macroText = "อนุญาตให้มองหาหน้า BUY เท่านั้น!";
  } else if (h4Trend === "below" && h1Trend === "below") {
    macroDirection = "sell";
    macroLabel = "⬇️ BEARISH";
    macroText = "อนุญาตให้มองหาหน้า SELL เท่านั้น!";
  } else if (h4Trend && h1Trend) {
    macroDirection = "wait";
    macroLabel = "➡️ SIDEWAYS";
    macroText = "H1/H4 ขัดแย้ง — ห้ามเทรด";
  }

  const gate2Pass = macroDirection !== "wait" && !!h4Trend && !!h1Trend;

  // ============ GATE 3: ENTRY TRIGGER (M15) ============
  const m15 = data?.timeframes.m15;

  let entrySignal: "buy" | "sell" | "wait" = "wait";
  let entryReasons: { label: string; pass: boolean }[] = [];

  if (m15 && gate1Pass && gate2Pass) {
    const nearEma = Math.abs(m15.distPercent) <= 0.15; // Within 0.15% of EMA50

    if (macroDirection === "buy") {
      const rsiInRange = m15.rsi >= 40 && m15.rsi <= 55;
      const rsiTurningUp = m15.rsiSlope === "up";
      const macdGreenFirst = m15.macdCrossing === "green_first";

      entryReasons = [
        {
          label: `M15 ใกล้ EMA50 (${m15.distPercent.toFixed(2)}%)`,
          pass: nearEma,
        },
        {
          label: `RSI ${m15.rsi.toFixed(0)} (ต้อง 40-55, งัดหัวขึ้น)`,
          pass: rsiInRange && rsiTurningUp,
        },
        { label: `MACD แท่งเขียวแรก`, pass: macdGreenFirst },
      ];

      if (nearEma && rsiInRange && rsiTurningUp && macdGreenFirst) {
        entrySignal = "buy";
      }
    } else if (macroDirection === "sell") {
      const rsiInRange = m15.rsi >= 45 && m15.rsi <= 60;
      const rsiTurningDown = m15.rsiSlope === "down";
      const macdRedFirst = m15.macdCrossing === "red_first";

      entryReasons = [
        {
          label: `M15 ใกล้ EMA50 (${m15.distPercent.toFixed(2)}%)`,
          pass: nearEma,
        },
        {
          label: `RSI ${m15.rsi.toFixed(0)} (ต้อง 45-60, ชี้หัวลง)`,
          pass: rsiInRange && rsiTurningDown,
        },
        { label: `MACD แท่งแดงแรก`, pass: macdRedFirst },
      ];

      if (nearEma && rsiInRange && rsiTurningDown && macdRedFirst) {
        entrySignal = "sell";
      }
    }
  } else if (m15) {
    entryReasons = [
      {
        label: `M15 ใกล้ EMA50 (${m15.distPercent.toFixed(2)}%)`,
        pass: Math.abs(m15.distPercent) <= 0.15,
      },
      {
        label: `RSI ${m15.rsi.toFixed(0)}`,
        pass: false,
      },
      {
        label: `MACD Histogram`,
        pass: false,
      },
    ];
  }

  const gate3Pass = entrySignal !== "wait";

  // ============ GATE 4: CENT ACCOUNT MM ============
  const price = data?.price || 0;
  const slPrice =
    entrySignal === "buy" ? price - SL_DISTANCE : price + SL_DISTANCE;
  const tpPrice =
    entrySignal === "buy" ? price + TP_DISTANCE : price - TP_DISTANCE;
  const riskTHB = MAX_RISK_USD * THB_PER_USD; // ~102 บาท
  const rewardTHB = MAX_RISK_USD * 2 * THB_PER_USD; // ~204 บาท

  // ============ FINAL AI COMMAND ============
  let finalCommand: "EXECUTE_BUY" | "EXECUTE_SELL" | "WAIT" = "WAIT";
  let commandColor = "from-gray-700 to-gray-800";
  let commandIcon = "⚪";
  let commandText = "WAIT — รอจังหวะ";
  let waitReason = "";

  if (!gate1Pass) {
    waitReason = !isTradeTime
      ? "นอกเวลาเทรด"
      : !isSpreadSafe
        ? "Spread กว้างเกินไป"
        : "ข่าวแดงใกล้ออก";
    commandText = `WAIT — ${waitReason}`;
  } else if (!gate2Pass) {
    waitReason = "ตลาด Sideways (H1/H4 ขัดแย้ง)";
    commandText = `WAIT — ${waitReason}`;
  } else if (!gate3Pass) {
    waitReason = "ยังไม่มีจุดเข้าที่ชัดเจน";
    commandText = `WAIT — ${waitReason}`;
  } else if (entrySignal === "buy") {
    finalCommand = "EXECUTE_BUY";
    commandColor = "from-green-600 to-emerald-700";
    commandIcon = "🟢";
    commandText = "EXECUTE BUY!";
  } else if (entrySignal === "sell") {
    finalCommand = "EXECUTE_SELL";
    commandColor = "from-red-600 to-rose-700";
    commandIcon = "🔴";
    commandText = "EXECUTE SELL!";
  }

  // ============ AUTO-FIRE LINE ALERT ============
  // ยิงอัตโนมัติเมื่อครบ 3 ด่าน + Anti-Spam ป้องกันยิงซ้ำ
  useEffect(() => {
    if (finalCommand !== "WAIT" && !isAlertSent.current && data) {
      // เงื่อนไขครบ! ล็อคไกปืนแล้วยิง!
      isAlertSent.current = true;
      lastSignalRef.current = finalCommand;
      const action =
        finalCommand === "EXECUTE_BUY" ? ("BUY" as const) : ("SELL" as const);
      fireLineAlert(action, price, slPrice, tpPrice);
    } else if (finalCommand === "WAIT" && isAlertSent.current) {
      // เป้าหมายขยับหลุด ปลดล็อครอจังหวะใหม่
      isAlertSent.current = false;
      lastSignalRef.current = null;
    } else if (
      finalCommand !== "WAIT" &&
      isAlertSent.current &&
      lastSignalRef.current !== finalCommand
    ) {
      // สัญญาณเปลี่ยนทิศ! (BUY → SELL หรือ SELL → BUY) ยิงใหม่!
      lastSignalRef.current = finalCommand;
      const action =
        finalCommand === "EXECUTE_BUY" ? ("BUY" as const) : ("SELL" as const);
      fireLineAlert(action, price, slPrice, tpPrice);
    }
  }, [finalCommand, data, price, slPrice, tpPrice, fireLineAlert]);

  // ============ HELPERS ============
  const formatUSD = (v: number) => `$${v.toFixed(2)}`;

  const GateStatus = ({
    pass,
    gateNum,
  }: {
    pass: boolean;
    gateNum: number;
  }) => (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
        pass
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : "bg-red-500/20 text-red-400 border border-red-500/30"
      }`}
    >
      GATE {gateNum}: {pass ? "PASS ✅" : "FAIL ❌"}
    </span>
  );

  const CheckItem = ({ label, pass }: { label: string; pass: boolean }) => (
    <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded-lg">
      <span className="text-sm text-gray-300">{label}</span>
      <span className={pass ? "text-green-400" : "text-red-400"}>
        {pass ? "✅" : "❌"}
      </span>
    </div>
  );

  // ============ RENDER ============
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">🎯</div>
          <p className="text-gray-400 text-lg">Loading Assassin Protocol...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/80 border-b border-gray-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-white text-sm">
                ← กลับ
              </Link>
              <h1 className="text-lg font-bold bg-gradient-to-r from-amber-400 to-red-400 bg-clip-text text-transparent">
                🎯 XAU MICRO-SNIPER V2
              </h1>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              {mounted ? thaiTimeStr : "--:--"}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Portfolio Bar */}
        <div className="flex items-center justify-between p-3 bg-gray-900/60 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-xl">
              {data ? formatUSD(data.price) : "--"}
            </span>
            {data && (
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  data.change >= 0
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {data.change >= 0 ? "▲" : "▼"}{" "}
                {formatUSD(Math.abs(data.change))} (
                {data.changePercent.toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>💰 ฿1,000 (~$30 = 3,000 USC)</div>
            <div>📏 Lot: {CENT_LOT.toFixed(2)} | Cent Account</div>
          </div>
        </div>

        {/* ========== TEST LINE BUTTON ========== */}
        <button
          onClick={async () => {
            setSendingAlert(true);
            setAlertMessage("");
            try {
              const testPrice = data?.price || 2900;
              const res = await fetch("/api/alerts/gold", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "BUY",
                  entry: testPrice.toFixed(2),
                  sl: (testPrice - SL_DISTANCE).toFixed(2),
                  tp: (testPrice + TP_DISTANCE).toFixed(2),
                  lot: CENT_LOT.toFixed(2),
                }),
              });
              const result = await res.json();
              setAlertMessage(
                res.ok ? "✅ ทดสอบสำเร็จ! เช็ค LINE เลย" : `❌ ${result.error}`,
              );
            } catch {
              setAlertMessage("❌ เชื่อมต่อไม่ได้");
            }
            setSendingAlert(false);
            setTimeout(() => setAlertMessage(""), 8000);
          }}
          disabled={sendingAlert}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
        >
          {sendingAlert ? (
            <>
              <span className="animate-spin">⏳</span> กำลังส่ง...
            </>
          ) : (
            <>🧪 ทดสอบส่ง LINE (Test Alert)</>
          )}
        </button>
        {alertMessage && (
          <div
            className={`text-center text-sm font-medium py-1 ${
              alertMessage.includes("✅") ? "text-green-400" : "text-red-400"
            }`}
          >
            {alertMessage}
          </div>
        )}

        {/* ========== GATE 1: SURVIVAL FILTERS ========== */}
        <div
          className={`p-4 rounded-xl border ${
            gate1Pass
              ? "border-green-500/30 bg-green-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-amber-400">
              [1] 🛡️ SYSTEM SHIELD (เกราะป้องกัน)
            </h2>
            <GateStatus pass={gate1Pass} gateNum={1} />
          </div>
          <div className="space-y-2">
            <CheckItem
              label={`Spread: ${spread} pts (≤ ${SPREAD_LIMIT})`}
              pass={isSpreadSafe}
            />
            <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">Spread:</span>
                <input
                  type="number"
                  value={spread}
                  onChange={(e) => setSpread(Number(e.target.value))}
                  className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm text-white text-center"
                  min={0}
                  max={100}
                />
                <span className="text-xs text-gray-500">pts</span>
              </div>
              <span
                className={isSpreadSafe ? "text-green-400" : "text-red-400"}
              >
                {isSpreadSafe ? "✅" : "❌"}
              </span>
            </div>
            <CheckItem
              label={`ข่าวแดง: ${nextNewsMin < NEWS_BUFFER_MIN ? `⚠️ อีก ${nextNewsMin} นาที!` : `ห่าง ${nextNewsMin} นาที`}`}
              pass={isNewsSafe}
            />
            <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300">นาทีถึงข่าวแดง:</span>
                <input
                  type="number"
                  value={nextNewsMin}
                  onChange={(e) => setNextNewsMin(Number(e.target.value))}
                  className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm text-white text-center"
                  min={0}
                  max={999}
                />
                <span className="text-xs text-gray-500">min</span>
              </div>
              <span className={isNewsSafe ? "text-green-400" : "text-red-400"}>
                {isNewsSafe ? "✅" : "❌"}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded-lg">
              <span className="text-sm text-gray-300">
                เวลา: {thaiTimeStr} น. | {sessionLabel}
              </span>
              <span className={isTradeTime ? "text-green-400" : "text-red-400"}>
                {isTradeTime ? "✅" : "❌ อ.เสาร์-อาทิตย์"}
              </span>
            </div>
          </div>
        </div>

        {/* ========== GATE 2: MACRO TREND ========== */}
        <div
          className={`p-4 rounded-xl border ${
            gate2Pass
              ? "border-green-500/30 bg-green-500/5"
              : "border-red-500/30 bg-red-500/5"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-cyan-400">
              [2] 🌊 MACRO TREND (กระแสน้ำ H1/H4)
            </h2>
            <GateStatus pass={gate2Pass} gateNum={2} />
          </div>
          <div className="space-y-2">
            {data?.timeframes.h4 ? (
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-300">
                  H4:{" "}
                  {data.timeframes.h4.priceVsEma === "above"
                    ? "⬆️ Bullish"
                    : "⬇️ Bearish"}{" "}
                  <span className="text-gray-500 text-xs">
                    (ราคา{" "}
                    {data.timeframes.h4.priceVsEma === "above" ? ">" : "<"}{" "}
                    EMA50 {formatUSD(data.timeframes.h4.ema50)})
                  </span>
                </span>
                <span
                  className={
                    data.timeframes.h4.priceVsEma === "above"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {data.timeframes.h4.priceVsEma === "above" ? "📈" : "📉"}
                </span>
              </div>
            ) : (
              <div className="py-1.5 px-2 bg-gray-900/50 rounded-lg text-gray-500 text-sm">
                H4: ไม่มีข้อมูล
              </div>
            )}
            {data?.timeframes.h1 ? (
              <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded-lg">
                <span className="text-sm text-gray-300">
                  H1:{" "}
                  {data.timeframes.h1.priceVsEma === "above"
                    ? "⬆️ Bullish"
                    : "⬇️ Bearish"}{" "}
                  <span className="text-gray-500 text-xs">
                    (ราคา{" "}
                    {data.timeframes.h1.priceVsEma === "above" ? ">" : "<"}{" "}
                    EMA50 {formatUSD(data.timeframes.h1.ema50)})
                  </span>
                </span>
                <span
                  className={
                    data.timeframes.h1.priceVsEma === "above"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {data.timeframes.h1.priceVsEma === "above" ? "📈" : "📉"}
                </span>
              </div>
            ) : (
              <div className="py-1.5 px-2 bg-gray-900/50 rounded-lg text-gray-500 text-sm">
                H1: ไม่มีข้อมูล
              </div>
            )}
            <div
              className={`mt-2 p-2 rounded-lg text-center font-bold text-sm ${
                macroDirection === "buy"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : macroDirection === "sell"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
              }`}
            >
              {macroLabel} — {macroText}
            </div>
          </div>
        </div>

        {/* ========== GATE 3: ENTRY TRIGGER ========== */}
        <div
          className={`p-4 rounded-xl border ${
            gate3Pass
              ? "border-green-500/30 bg-green-500/5"
              : gate1Pass && gate2Pass
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-gray-700 bg-gray-900/30"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-purple-400">
              [3] 🎯 ENTRY TRIGGER (จุดซุ่มยิง M15)
            </h2>
            <GateStatus pass={gate3Pass} gateNum={3} />
          </div>
          {!(gate1Pass && gate2Pass) ? (
            <div className="text-center text-gray-500 text-sm py-3">
              🔒 ด่าน 1 & 2 ต้องผ่านก่อนจึงจะประเมิน
            </div>
          ) : (
            <div className="space-y-2">
              {m15 ? (
                <>
                  {entryReasons.map((r, i) => (
                    <CheckItem key={i} label={r.label} pass={r.pass} />
                  ))}
                  <div className="flex items-center justify-between py-1.5 px-2 bg-gray-900/50 rounded-lg text-xs text-gray-500">
                    <span>
                      MACD Hist: {m15.macdHist.toFixed(3)} | Prev:{" "}
                      {m15.macdHistPrev.toFixed(3)}
                    </span>
                    <span>RSI Slope: {m15.rsiSlope}</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-gray-500 text-sm py-3">
                  ⏳ กำลังรอข้อมูล M15...
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========== GATE 4: CENT ACCOUNT MM ========== */}
        <div
          className={`p-4 rounded-xl border ${
            gate3Pass
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-gray-700 bg-gray-900/30"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-amber-400">
              [4] 💰 CENT ACCOUNT MM (ระบบจัดการเงิน)
            </h2>
            <span className="text-xs text-cyan-400 font-bold">
              ⚡ Dynamic Sizing
            </span>
          </div>
          {/* SL Distance Info */}
          <div className="mb-3 p-2 bg-gray-900/50 rounded-lg flex items-center justify-between">
            <span className="text-xs text-gray-400">
              🛑 SL ระยะปลอดภัย:{" "}
              <span className="text-amber-400 font-bold">
                {formatUSD(SL_DISTANCE)}
              </span>{" "}
              (ทนสวิงได้!)
            </span>
            <span className="text-xs text-cyan-400 font-bold">
              📏 Lot: {CENT_LOT.toFixed(2)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">🛑 Stop Loss</p>
              <p className="text-red-400 font-bold text-sm">
                {gate3Pass ? formatUSD(slPrice) : "--"}
              </p>
              <p className="text-xs text-gray-500">
                -฿{riskTHB.toFixed(0)} ({formatUSD(MAX_RISK_USD)})
              </p>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">👉 Entry</p>
              <p className="text-white font-bold text-sm">
                {data ? formatUSD(price) : "--"}
              </p>
              <p className="text-xs text-cyan-400 font-bold">
                {CENT_LOT.toFixed(2)} Cent Lot
              </p>
            </div>
            <div className="p-2 bg-gray-900/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">🎯 Take Profit</p>
              <p className="text-green-400 font-bold text-sm">
                {gate3Pass ? formatUSD(tpPrice) : "--"}
              </p>
              <p className="text-xs text-gray-500">
                +฿{rewardTHB.toFixed(0)} ({formatUSD(MAX_RISK_USD * 2)})
              </p>
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-gray-500">
            R:R = 1:2 | Max Loss = 300 Cents | สูตร: Lot = ${MAX_RISK_USD} / $
            {SL_DISTANCE} = {CENT_LOT.toFixed(2)}
          </div>
        </div>

        {/* ========== FINAL AI COMMAND ========== */}
        <div
          className={`p-5 rounded-2xl border-2 bg-gradient-to-r ${commandColor} ${
            finalCommand !== "WAIT"
              ? "border-white/20 shadow-lg shadow-white/5 animate-pulse"
              : "border-gray-700"
          }`}
        >
          <div className="text-center">
            <p className="text-3xl mb-1">{commandIcon}</p>
            <p className="text-2xl font-black tracking-wider">{commandText}</p>
            {finalCommand !== "WAIT" && (
              <div className="mt-3 space-y-1 text-sm">
                <p>
                  👉 Action: กด{" "}
                  <span className="font-bold">
                    {finalCommand === "EXECUTE_BUY" ? "BUY" : "SELL"}
                  </span>{" "}
                  ที่ราคา{" "}
                  <span className="font-bold text-amber-300">
                    {formatUSD(price)}
                  </span>
                </p>
                <p>
                  📏 Lot Size:{" "}
                  <span className="text-cyan-300 font-bold">
                    {CENT_LOT.toFixed(2)} Cent Lot
                  </span>
                </p>
                <p>
                  🛑 Stop Loss:{" "}
                  <span className="text-red-300 font-bold">
                    {formatUSD(slPrice)}
                  </span>{" "}
                  (ยอมเสีย ฿{riskTHB.toFixed(0)})
                </p>
                <p>
                  🎯 Take Profit:{" "}
                  <span className="text-green-300 font-bold">
                    {formatUSD(tpPrice)}
                  </span>{" "}
                  (เก็บกำไร ฿{rewardTHB.toFixed(0)})
                </p>
              </div>
            )}
            {finalCommand !== "WAIT" && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <div className="text-xs text-green-400 animate-pulse">
                  ⚡ AUTO-ALERT: สัญญาณถูกส่งเข้า LINE อัตโนมัติแล้ว
                </div>
                <button
                  onClick={() => {
                    const action =
                      finalCommand === "EXECUTE_BUY"
                        ? ("BUY" as const)
                        : ("SELL" as const);
                    fireLineAlert(action, price, slPrice, tpPrice);
                  }}
                  disabled={sendingAlert}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {sendingAlert ? (
                    <>
                      <span className="animate-spin">⏳</span> กำลังส่ง...
                    </>
                  ) : (
                    <>📤 ส่งซ้ำอีกครั้ง</>
                  )}
                </button>
                {alertMessage && (
                  <span
                    className={`text-sm font-medium ${
                      alertMessage.includes("⚡") || alertMessage.includes("✅")
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {alertMessage}
                  </span>
                )}
              </div>
            )}
            {finalCommand === "WAIT" && (
              <p className="text-xs text-gray-400 mt-2">
                ⏳ ระบบจะสแกนใหม่ทุก 30 วินาที
              </p>
            )}
          </div>
        </div>

        {/* ========== RAW DATA DEBUG ========== */}
        {data && (
          <details className="text-xs text-gray-600">
            <summary className="cursor-pointer hover:text-gray-400 py-2">
              🔧 Debug: Raw Timeframe Data
            </summary>
            <div className="bg-gray-900/50 rounded-xl p-3 mt-1 space-y-2 font-mono">
              {(["m15", "h1", "h4"] as const).map((tf) => {
                const d = data.timeframes[tf];
                return d ? (
                  <div key={tf}>
                    <span className="text-amber-400 font-bold">
                      {tf.toUpperCase()}:
                    </span>{" "}
                    Price {formatUSD(d.price)} | EMA50 {formatUSD(d.ema50)} |{" "}
                    RSI {d.rsi.toFixed(1)} ({d.rsiSlope}) | MACD{" "}
                    {d.macdHist.toFixed(3)} ({d.macdCrossing})
                  </div>
                ) : (
                  <div key={tf}>
                    <span className="text-gray-500">
                      {tf.toUpperCase()}: no data
                    </span>
                  </div>
                );
              })}
              <div className="text-gray-600 mt-1">
                Fetched: {data.fetchedAt}
              </div>
            </div>
          </details>
        )}

        {/* Footer */}
        <p className="text-center text-gray-700 text-xs pb-4">
          XAU Micro-Sniper V2 — The Assassin Protocol 🎯
        </p>
      </div>
    </main>
  );
}

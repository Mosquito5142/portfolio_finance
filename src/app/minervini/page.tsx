"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  UNIQUE_SYMBOLS,
  TIER_1_MEGA_TECH,
  TIER_1_AI_HARDWARE,
  TIER_1_AI_SOFTWARE,
  TIER_1_GROWTH_TECH,
  STOCK_DETAILS,
} from "@/lib/stocks";

interface Criterion {
  pass: boolean;
  name: string;
  detail: string;
}

interface MinerviniData {
  symbol: string;
  status: "success" | "error";
  reason?: string;
  price?: number;
  meetsTemplate?: boolean;
  passed?: number;
  total?: number;
  score?: number;
  stage?: { num: number; name: string; action: string };
  criteria?: Criterion[];
  metrics?: {
    ma50: number | null;
    ma150: number | null;
    ma200: number | null;
    high52: number;
    low52: number;
    pctFromHigh: number;
    pctFromLow: number;
    rsVsSpy: number | null;
    volRatio: number | null;
  };
  setup?: {
    pivot: number;
    buyTrigger: number;
    stopLoss: number;
    distanceToBuy: number;
    riskPct: number;
  };
  chart?: {
    date: string;
    close: number;
    ma50: number | null;
    ma150: number | null;
    ma200: number | null;
  }[];
}

interface Scan {
  symbol: string;
  data: MinerviniData | null;
  status: "pending" | "loading" | "done" | "error";
}

// สีของแต่ละ Stage
const stageStyle = (num?: number) => {
  switch (num) {
    case 2:
      return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/40" };
    case 1:
      return { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/40" };
    case 3:
      return { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/40" };
    case 4:
      return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/40" };
    default:
      return { bg: "bg-slate-700/30", text: "text-gray-400", border: "border-slate-600/40" };
  }
};

const TickerCheckbox = ({
  ticker,
  checked,
  onToggle,
}: {
  ticker: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <label
    title={STOCK_DETAILS[ticker] || ticker}
    className={`flex items-center space-x-2 text-xs p-2 rounded cursor-pointer transition-all ${
      checked
        ? "bg-blue-900/30 text-blue-200 border border-blue-500/30"
        : "text-gray-500 hover:bg-gray-800"
    }`}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onToggle}
      className="rounded border-gray-600 text-blue-500 focus:ring-blue-500 bg-gray-800"
    />
    <span>{ticker}</span>
  </label>
);

// กราฟราคา + MA + เส้นที่ขีดเอง (Pivot/Buy Stop, Stop Loss, 52wk High)
const MinerviniChart = ({ d }: { d: MinerviniData }) => {
  if (!d.chart?.length) return null;
  const buy = d.setup?.buyTrigger;
  const stop = d.setup?.stopLoss;
  const high52 = d.metrics?.high52;

  return (
    <div className="h-[420px] w-full mb-4 bg-slate-900/40 rounded-xl border border-slate-700/50 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={d.chart} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <XAxis
            dataKey="date"
            tick={{ fill: "#64748b", fontSize: 9 }}
            interval={Math.floor(d.chart.length / 6)}
            tickLine={false}
            axisLine={{ stroke: "#334155" }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#64748b", fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={(v) => `$${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: "#94a3b8" }}
          />
          {/* เส้นค่าเฉลี่ย */}
          <Line dataKey="ma200" stroke="#ef4444" dot={false} strokeWidth={1} name="MA200" />
          <Line dataKey="ma150" stroke="#f59e0b" dot={false} strokeWidth={1} name="MA150" />
          <Line dataKey="ma50" stroke="#3b82f6" dot={false} strokeWidth={1} name="MA50" />
          {/* ราคา */}
          <Line dataKey="close" stroke="#e2e8f0" dot={false} strokeWidth={2} name="ราคา" />
          {/* เส้นที่ขีดเอง */}
          {high52 !== undefined && (
            <ReferenceLine
              y={high52}
              stroke="#a855f7"
              strokeDasharray="2 2"
              label={{ value: `52wk High ${high52}`, fill: "#c084fc", fontSize: 9, position: "insideTopRight" }}
            />
          )}
          {buy !== undefined && (
            <ReferenceLine
              y={buy}
              stroke="#fde047"
              strokeWidth={1.5}
              label={{ value: `Buy ${buy}`, fill: "#fde047", fontSize: 9, position: "insideRight" }}
            />
          )}
          {stop !== undefined && (
            <ReferenceLine
              y={stop}
              stroke="#ef4444"
              strokeDasharray="4 2"
              label={{ value: `Stop ${stop}`, fill: "#f87171", fontSize: 9, position: "insideBottomRight" }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default function MinerviniPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);

  // แสดงเฉพาะหุ้นที่ผ่านครบ 8 ข้อ หรือแสดงทั้งหมด
  const [onlyQualified, setOnlyQualified] = useState(false);

  // กรองตาม Stage (0 = ทั้งหมด)
  const [stageFilter, setStageFilter] = useState<number>(0);

  // สถานะการส่งเข้าแจ้งเตือน LINE (idle/sending/sent ต่อ symbol)
  const [alertState, setAlertState] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});
  const [bulkSending, setBulkSending] = useState(false);

  // สร้าง item เข้าชีตจากผลวิเคราะห์ 1 ตัว
  const buildAlertItem = (d: MinerviniData) => ({
    ticker: d.symbol,
    entry: d.setup!.buyTrigger, // จุดอ้างอิงเข้า = Pivot
    triggerPrice: d.setup!.buyTrigger, // Buy Stop เหนือ Pivot
    cut: d.setup!.stopLoss,
    target: Number((d.setup!.buyTrigger * 1.2).toFixed(2)), // เป้าเริ่มต้น +20%
    alertType: "MINERVINI",
    note: `Stage ${d.stage?.num ?? "-"} · ${d.passed}/${d.total} ข้อ`,
  });

  const sendToAlert = async (d: MinerviniData) => {
    if (!d.setup) return;
    const sym = d.symbol;
    setAlertState((p) => ({ ...p, [sym]: "sending" }));
    try {
      const res = await fetch("/api/alerts/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [buildAlertItem(d)] }),
      });
      const json = await res.json();
      setAlertState((p) => ({ ...p, [sym]: json.success ? "sent" : "error" }));
    } catch {
      setAlertState((p) => ({ ...p, [sym]: "error" }));
    }
  };

  // ส่งทั้งหมดที่แสดงอยู่ (ตามฟิลเตอร์ปัจจุบัน) เข้าชีตรวดเดียว
  const sendAllVisible = async (list: MinerviniData[]) => {
    const items = list.filter((d) => d.setup).map(buildAlertItem);
    if (items.length === 0) return;
    setBulkSending(true);
    try {
      const res = await fetch("/api/alerts/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      const status = json.success ? "sent" : "error";
      setAlertState((p) => {
        const next = { ...p };
        items.forEach((it) => (next[it.ticker] = status));
        return next;
      });
    } catch {
      setAlertState((p) => {
        const next = { ...p };
        items.forEach((it) => (next[it.ticker] = "error"));
        return next;
      });
    } finally {
      setBulkSending(false);
    }
  };

  // กราฟพับไว้ก่อน กดเปิดทีละตัวเพื่อดูใหญ่ๆ
  const [openCharts, setOpenCharts] = useState<string[]>([]);
  const toggleChart = (symbol: string) =>
    setOpenCharts((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);
    const urlSymbols = params.get("symbols");
    if (urlSymbols) {
      const parsed = urlSymbols
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (parsed.length) {
        setSelectedTickers(parsed);
        const unknown = parsed.filter((t) => !UNIQUE_SYMBOLS.includes(t));
        if (unknown.length) setCustomTickers(unknown);
      }
    }

    const initial: Scan[] = UNIQUE_SYMBOLS.map((symbol) => ({
      symbol,
      data: null,
      status: "pending",
    }));
    setScans(initial);

    // ดึงหุ้นที่ถืออยู่ใน portfolio เพื่อ Quick Select
    fetch("/api/sheets/portfolio")
      .then((res) => res.json())
      .then((json) => {
        if (json?.data) {
          const actives = json.data.filter(
            (r: any) =>
              r.status !== "CLOSED" &&
              r.ticker !== "CASH" &&
              r.quantity - (r.soldQty || 0) > 0,
          );
          const pTickers = Array.from(
            new Set(actives.map((r: any) => r.ticker)),
          ) as string[];
          setPortfolioTickers(pTickers);

          const newTickers = pTickers.filter((t) => !UNIQUE_SYMBOLS.includes(t));
          if (newTickers.length) {
            setCustomTickers((prev) =>
              Array.from(new Set([...prev, ...newTickers])),
            );
          }
        }
      })
      .catch(() => {});
  }, []);

  const addCustomTicker = (ticker: string) => {
    const upper = ticker.trim().toUpperCase();
    if (!upper) return;
    if (!customTickers.includes(upper) && !UNIQUE_SYMBOLS.includes(upper)) {
      setCustomTickers((prev) => [...prev, upper]);
    }
    if (!selectedTickers.includes(upper)) {
      setSelectedTickers((prev) => [...prev, upper]);
    }
    setSearchTerm("");
  };

  const filteredSymbols = [...UNIQUE_SYMBOLS, ...customTickers].filter((s) =>
    s.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleScan = async () => {
    if (scanning || selectedTickers.length === 0) return;
    setScanning(true);
    setScanProgress(0);

    // ให้แน่ใจว่ามี slot สำหรับทุก ticker ที่เลือก
    setScans((prev) => {
      const existing = prev.map((s) => s.symbol);
      const toAdd = selectedTickers
        .filter((t) => !existing.includes(t))
        .map((t) => ({ symbol: t, data: null, status: "pending" as const }));
      return [...prev, ...toAdd].map((s) =>
        selectedTickers.includes(s.symbol)
          ? { ...s, status: "loading" as const, data: null }
          : s,
      );
    });

    const targets = selectedTickers;
    let completed = 0;

    for (let i = 0; i < targets.length; i++) {
      const symbol = targets[i];
      try {
        const res = await fetch(`/api/minervini?symbol=${symbol}`);
        const data: MinerviniData = await res.json();
        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol ? { symbol, data, status: "done" } : s,
          ),
        );
      } catch {
        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol ? { ...s, status: "error" } : s,
          ),
        );
      }
      completed++;
      setScanProgress((completed / targets.length) * 100);
      if (i < targets.length - 1)
        await new Promise((r) => setTimeout(r, 60));
    }

    setScanning(false);
  };

  const results = scans
    .filter((s) => s.status === "done" && s.data?.status === "success")
    .filter((s) => (onlyQualified ? s.data?.meetsTemplate : true))
    .filter((s) => (stageFilter === 0 ? true : s.data?.stage?.num === stageFilter))
    .sort((a, b) => {
      // เรียงตามจำนวนข้อที่ผ่าน แล้วตาม RS
      const pa = a.data?.passed ?? 0;
      const pb = b.data?.passed ?? 0;
      if (pb !== pa) return pb - pa;
      return (b.data?.metrics?.rsVsSpy ?? -999) - (a.data?.metrics?.rsVsSpy ?? -999);
    });

  const qualifiedCount = scans.filter(
    (s) => s.data?.meetsTemplate,
  ).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-amber-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏆</span>
              <div>
                <h1 className="text-xl font-bold text-amber-400">
                  MINERVINI TREND TEMPLATE
                </h1>
                <p className="text-gray-400 text-xs">
                  คัดหุ้นตามสูตร Mark Minervini — Trend Template 8 ข้อ + จุดเข้า VCP/Breakout
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/patterns"
                className="text-gray-400 hover:text-indigo-400 font-bold transition-colors"
              >
                🚀 Breakout
              </Link>
              <Link
                href="/"
                className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1 rounded-full"
              >
                ← กลับหน้าแรก
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Info banner */}
        <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex gap-4 text-sm text-amber-100">
          <span className="text-2xl mt-1">💡</span>
          <div>
            <p className="font-bold text-white mb-1">
              Trend Template คืออะไร?
            </p>
            <p className="text-gray-300">
              เป็นเกณฑ์คัดกรองหุ้น Stage 2 (ขาขึ้น) 8 ข้อของ Mark Minervini เน้นหุ้น
              ที่ราคาอยู่เหนือเส้นค่าเฉลี่ยทุกเส้นเรียงตัวสวย MA200 ชี้ขึ้น
              อยู่ใกล้จุดสูงสุด และแข็งแกร่งกว่าตลาด (RS) — หุ้นที่ผ่านครบ 8 ข้อ
              เท่านั้นที่ Minervini จะพิจารณาหาจุดเข้าซื้อ
            </p>
          </div>
        </div>

        {/* Stock selector */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              🎯 เลือกหุ้นที่จะสแกน
              <span className="text-sm text-gray-500 font-normal">
                (เลือก {selectedTickers.length} ตัว)
              </span>
            </h2>
            <button
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              {isSelectorOpen ? "ย่อ 🔼" : "ขยาย 🔽"}
            </button>
          </div>

          {isSelectorOpen && (
            <>
              {/* Quick select */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-gray-400 text-xs self-center mr-2">
                  Quick Select:
                </span>
                {[
                  { label: "พอร์ตของฉัน 🌟", list: portfolioTickers, color: "bg-yellow-600" },
                  { label: "ALL LIST", list: UNIQUE_SYMBOLS, color: "bg-gray-600" },
                  { label: "Tech & Leaders", list: TIER_1_MEGA_TECH, color: "bg-purple-800" },
                  { label: "AI Hardware", list: TIER_1_AI_HARDWARE, color: "bg-purple-600" },
                  { label: "AI Software", list: TIER_1_AI_SOFTWARE, color: "bg-blue-600" },
                  { label: "Growth", list: TIER_1_GROWTH_TECH, color: "bg-pink-600" },
                ].map((group) => {
                  const isFull =
                    group.list.length > 0 &&
                    group.list.every((t) => selectedTickers.includes(t));
                  return (
                    <button
                      key={group.label}
                      onClick={() => {
                        if (isFull) {
                          setSelectedTickers(
                            selectedTickers.filter((t) => !group.list.includes(t)),
                          );
                        } else {
                          setSelectedTickers(
                            Array.from(new Set([...selectedTickers, ...group.list])),
                          );
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border border-white/10 ${
                        isFull
                          ? `${group.color} text-white shadow-lg`
                          : "bg-slate-800 text-gray-400 hover:bg-slate-700"
                      }`}
                    >
                      {isFull ? "✓" : "+"} {group.label}
                    </button>
                  );
                })}
                <button
                  onClick={() => setSelectedTickers([])}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-red-500 hover:bg-red-900/20 transition-all ml-auto"
                >
                  Clear All ❌
                </button>
              </div>

              {/* Add custom ticker */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustomTicker(searchTerm);
                  }}
                  placeholder="ค้นหา / เพิ่มหุ้นเอง (เช่น MRVL) แล้วกด Enter"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => addCustomTicker(searchTerm)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-all"
                >
                  + เพิ่ม
                </button>
              </div>

              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 max-h-[360px] overflow-y-auto">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {filteredSymbols.map((ticker) => (
                    <TickerCheckbox
                      key={ticker}
                      ticker={ticker}
                      checked={selectedTickers.includes(ticker)}
                      onToggle={() => {
                        if (selectedTickers.includes(ticker)) {
                          setSelectedTickers(
                            selectedTickers.filter((t) => t !== ticker),
                          );
                        } else {
                          setSelectedTickers([...selectedTickers, ticker]);
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleScan}
              disabled={scanning || selectedTickers.length === 0}
              className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg flex items-center gap-2 transition-all ${
                scanning || selectedTickers.length === 0
                  ? "bg-slate-700 text-gray-400 cursor-not-allowed"
                  : "bg-amber-600 hover:bg-amber-500 text-white hover:shadow-amber-500/25 active:scale-95"
              }`}
            >
              {scanning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังสแกน {selectedTickers.length} ตัว... {Math.round(scanProgress)}%
                </>
              ) : (
                <>
                  <span>🏆</span>
                  วิเคราะห์ตามสูตร Minervini
                </>
              )}
            </button>
          </div>
          {scanning && (
            <div className="mt-4 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-amber-500 h-2 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Filter toggle */}
        {!scanning && results.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setOnlyQualified(false)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                !onlyQualified
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-gray-400 hover:bg-slate-700"
              }`}
            >
              ทั้งหมดที่สแกน ({scans.filter((s) => s.data?.status === "success").length})
            </button>
            <button
              onClick={() => setOnlyQualified(true)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border flex items-center gap-2 ${
                onlyQualified
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                  : "bg-slate-800 text-gray-400 border-transparent hover:bg-slate-700"
              }`}
            >
              🏆 ผ่านครบ 8 ข้อ ({qualifiedCount})
            </button>
          </div>
        )}

        {/* Stage filter */}
        {!scanning && results.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs self-center mr-1">
              กรองตาม Stage:
            </span>
            {[
              { num: 0, label: "ทุก Stage" },
              { num: 2, label: "🟢 Stage 2 (ซื้อได้)" },
              { num: 1, label: "🔵 Stage 1 (สะสมฐาน)" },
              { num: 3, label: "🟠 Stage 3 (ทำยอด)" },
              { num: 4, label: "🔴 Stage 4 (ขาลง)" },
            ].map((opt) => {
              const count =
                opt.num === 0
                  ? scans.filter((s) => s.data?.status === "success").length
                  : scans.filter((s) => s.data?.stage?.num === opt.num).length;
              if (opt.num !== 0 && count === 0) return null;
              const active = stageFilter === opt.num;
              return (
                <button
                  key={opt.num}
                  onClick={() => setStageFilter(opt.num)}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all border ${
                    active
                      ? "bg-white text-slate-900 border-white"
                      : "bg-slate-800 text-gray-400 border-transparent hover:bg-slate-700"
                  }`}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Bulk send to LINE alert */}
        {!scanning && results.length > 0 && (
          <div className="bg-green-900/15 border border-green-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-sm text-green-100">
              <span className="font-bold text-white">📤 ส่งเข้าชีตแจ้งเตือน LINE</span>
              <span className="text-gray-400 ml-2">
                ตั้ง Buy Stop (Minervini) ให้หุ้น {results.length} ตัวที่แสดงอยู่
                — ระบบจะเตือนเมื่อราคาทะลุ Pivot เข้าโซนซื้อ
              </span>
            </div>
            <button
              onClick={() => sendAllVisible(results.map((s) => s.data!))}
              disabled={bulkSending}
              className={`shrink-0 px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition-all ${
                bulkSending
                  ? "bg-slate-700 text-gray-400 cursor-wait"
                  : "bg-green-600 hover:bg-green-500 text-white active:scale-95"
              }`}
            >
              {bulkSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังส่ง...
                </>
              ) : (
                <>🔔 ส่งทั้งหมด {results.length} ตัว</>
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {!scanning && results.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.map((scan) => {
              const d = scan.data!;
              const isQualified = d.meetsTemplate;
              const chartOpen = openCharts.includes(scan.symbol);
              return (
                <div
                  key={scan.symbol}
                  className={`bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border transition-all ${
                    chartOpen ? "lg:col-span-2" : ""
                  } ${
                    isQualified
                      ? "border-amber-500/50 shadow-lg shadow-amber-900/20"
                      : "border-slate-700/50"
                  }`}
                >
                  {/* Card header */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-2xl font-black text-white">
                          {scan.symbol}
                        </h3>
                        {isQualified && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            🏆 ผ่านครบ
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">
                        {STOCK_DETAILS[scan.symbol] || "Stock"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">ราคา</p>
                      <p className="text-lg font-bold text-white">
                        ${d.price?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Stage badge */}
                  {d.stage && d.stage.num > 0 && (
                    <div
                      className={`mb-4 rounded-lg px-3 py-2 border ${stageStyle(d.stage.num).bg} ${stageStyle(d.stage.num).border}`}
                    >
                      <p className={`text-sm font-bold ${stageStyle(d.stage.num).text}`}>
                        {d.stage.name}
                      </p>
                      <p className="text-xs text-gray-400">{d.stage.action}</p>
                    </div>
                  )}

                  {/* Score bar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          isQualified ? "bg-amber-500" : "bg-slate-500"
                        }`}
                        style={{ width: `${d.score}%` }}
                      ></div>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        isQualified ? "text-amber-400" : "text-gray-400"
                      }`}
                    >
                      {d.passed}/{d.total} ข้อ
                    </span>
                  </div>

                  {/* Chart with drawn lines (พับไว้ก่อน) */}
                  <button
                    onClick={() => toggleChart(scan.symbol)}
                    className={`w-full mb-4 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 border ${
                      chartOpen
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
                        : "bg-slate-900/50 text-gray-400 border-slate-700/50 hover:bg-slate-900 hover:text-gray-200"
                    }`}
                  >
                    {chartOpen ? "🔼 ซ่อนกราฟ" : "📈 ดูกราฟ + เส้นที่ขีด"}
                  </button>
                  {chartOpen && <MinerviniChart d={d} />}

                  {/* Criteria checklist */}
                  <div className="space-y-1.5 mb-4">
                    {d.criteria?.map((cr, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs"
                        title={cr.detail}
                      >
                        <span className={cr.pass ? "text-emerald-400" : "text-red-500"}>
                          {cr.pass ? "✓" : "✗"}
                        </span>
                        <span className={cr.pass ? "text-gray-300" : "text-gray-500"}>
                          {cr.name}
                          <span className="text-gray-600"> — {cr.detail}</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Setup box */}
                  {d.setup && (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-slate-900/50 rounded-lg p-2.5 border border-emerald-500/20">
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          🎯 Buy Stop (Pivot)
                        </p>
                        <p className="text-sm font-bold text-emerald-400">
                          ${d.setup.buyTrigger}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          {d.setup.distanceToBuy >= 0
                            ? `อีก +${d.setup.distanceToBuy}%`
                            : `ทะลุแล้ว ${d.setup.distanceToBuy}%`}
                        </p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2.5 border border-red-500/20">
                        <p className="text-[10px] text-gray-500 mb-0.5">
                          🛑 Stop Loss
                        </p>
                        <p className="text-sm font-bold text-red-400">
                          ${d.setup.stopLoss}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          เสี่ยง -{d.setup.riskPct}%
                        </p>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2.5 border border-slate-700/50">
                        <p className="text-[10px] text-gray-500 mb-0.5">RS vs SPY</p>
                        <p
                          className={`text-sm font-bold ${
                            (d.metrics?.rsVsSpy ?? 0) > 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {d.metrics?.rsVsSpy !== null &&
                          d.metrics?.rsVsSpy !== undefined
                            ? `${d.metrics.rsVsSpy > 0 ? "+" : ""}${d.metrics.rsVsSpy}%`
                            : "N/A"}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          จากจุดสูง {d.metrics?.pctFromHigh}%
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-700/50 text-xs">
                    <span className="text-gray-500">
                      MA50 ${d.metrics?.ma50} · MA150 ${d.metrics?.ma150} · MA200 $
                      {d.metrics?.ma200}
                    </span>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${scan.symbol}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-400 hover:text-amber-300 font-medium"
                    >
                      ดูกราฟ →
                    </a>
                  </div>

                  {/* ส่งเข้าแจ้งเตือน LINE */}
                  <button
                    onClick={() => sendToAlert(d)}
                    disabled={
                      alertState[scan.symbol] === "sending" ||
                      alertState[scan.symbol] === "sent"
                    }
                    className={`mt-3 w-full px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      alertState[scan.symbol] === "sent"
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                        : alertState[scan.symbol] === "error"
                          ? "bg-red-600/20 text-red-400 border border-red-500/40"
                          : alertState[scan.symbol] === "sending"
                            ? "bg-slate-700 text-gray-400 cursor-wait"
                            : "bg-green-600 hover:bg-green-500 text-white"
                    }`}
                  >
                    {alertState[scan.symbol] === "sent"
                      ? "✅ ส่งเข้าแจ้งเตือนแล้ว"
                      : alertState[scan.symbol] === "error"
                        ? "❌ ส่งไม่สำเร็จ — ลองใหม่"
                        : alertState[scan.symbol] === "sending"
                          ? "กำลังส่ง..."
                          : `🔔 ตั้งแจ้งเตือนซื้อ (Buy Stop $${d.setup?.buyTrigger})`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Errors / empty */}
        {!scanning &&
          results.length === 0 &&
          scans.some((s) => s.status === "done") && (
            <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700/30">
              <span className="text-4xl mb-4 block">🔍</span>
              <h3 className="text-xl font-bold text-white mb-2">
                {onlyQualified ? "ยังไม่มีหุ้นที่ผ่านครบ 8 ข้อ" : "ไม่พบผลลัพธ์"}
              </h3>
              <p className="text-gray-400">
                {onlyQualified
                  ? "ลองดู 'ทั้งหมดที่สแกน' เพื่อดูหุ้นที่เกือบผ่าน"
                  : "ลองเลือกหุ้นแล้วกดสแกนอีกครั้ง"}
              </p>
            </div>
          )}
      </main>
    </div>
  );
}

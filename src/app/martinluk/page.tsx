"use client";

import { useState, useEffect, useMemo } from "react";
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
import { STOCK_DETAILS } from "@/lib/stocks";
import { fetchStockList, groupByCategory, type StockEntry } from "@/lib/stockList";

interface MartinLukData {
  symbol: string;
  status: "success" | "error";
  reason?: string;
  price?: number;
  tier?: "LEAD" | "MEDIOCRE" | "LAG";
  tierLabel?: string;
  adrPct?: number;
  highADR?: boolean;
  pullback?: {
    inPullbackZone: boolean;
    nearEma9: boolean;
    nearEma21: boolean;
    nearAvwapHigh: boolean;
    nearAvwapLow: boolean;
    distToEma9: number;
    distToEma21: number;
    distToAvwapHigh: number | null;
    distToAvwapLow: number | null;
    bouncing: boolean;
    tightDay: boolean;
    signal: boolean;
    isBasing?: boolean;
    baseRangePct?: number;
  };
  momentum?: {
    pass: boolean;
    r1m: number;
    r3m: number;
    r6m: number;
  };
  liquidity?: {
    pass: boolean;
    dollarVol: number;
  };
  metrics?: {
    ema9: number;
    ema21: number;
    ema50: number;
    avwapHigh: number | null;
    avwapLow: number | null;
  };
  setup?: {
    entryTrigger: number;
    stopLoss: number;
    riskPct: number;
    riskPass: boolean;
  };
  chart?: {
    date: string;
    close: number;
    ema9: number | null;
    ema21: number | null;
    ema50: number | null;
    avwapHigh: number | null;
    avwapLow: number | null;
  }[];
}

interface Scan {
  symbol: string;
  data: MartinLukData | null;
  status: "pending" | "loading" | "done" | "error";
}

const tierStyle = (tier?: string) => {
  switch (tier) {
    case "LEAD":
      return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/40" };
    case "MEDIOCRE":
      return { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/40" };
    case "LAG":
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

const MartinLukChart = ({ d }: { d: MartinLukData }) => {
  const [zoom, setZoom] = useState<number>(60);

  if (!d.chart?.length) return null;
  const buy = d.setup?.entryTrigger;
  const stop = d.setup?.stopLoss;

  const chartData = d.chart.slice(-zoom);

  const zoomOptions = [
    { v: 30, label: "1 เดือน" },
    { v: 60, label: "3 เดือน" },
    { v: 120, label: "6 เดือน" },
  ];

  return (
    <div className="w-full mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1 px-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-400">
          <span><span className="text-blue-400">━</span> EMA9</span>
          <span><span className="text-amber-500">━</span> EMA21</span>
          <span><span className="text-red-400">━</span> EMA50</span>
          <span><span className="text-fuchsia-500">━</span> AVWAP(H)</span>
          <span><span className="text-cyan-500">━</span> AVWAP(L)</span>
          <span><span className="text-emerald-400">━</span> Buy</span>
          <span><span className="text-rose-400">━</span> Stop</span>
        </div>
        <div className="flex gap-1">
          <span className="text-[10px] text-gray-500 self-center mr-1">🔍 ซูม:</span>
          {zoomOptions.map((opt) => (
            <button
              key={opt.v}
              onClick={() => setZoom(opt.v)}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                zoom === opt.v
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-800 text-gray-400 hover:bg-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[420px] w-full bg-slate-900/40 rounded-xl border border-slate-700/50 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 9 }}
              interval={Math.floor(chartData.length / 6)}
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
            <Line dataKey="ema50" stroke="#ef4444" dot={false} strokeWidth={1} name="EMA50" />
            <Line dataKey="avwapHigh" stroke="#d946ef" dot={false} strokeWidth={1.5} strokeDasharray="3 3" name="AVWAP(H)" />
            <Line dataKey="avwapLow" stroke="#06b6d4" dot={false} strokeWidth={1.5} strokeDasharray="3 3" name="AVWAP(L)" />
            <Line dataKey="ema21" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="EMA21" />
            <Line dataKey="ema9" stroke="#3b82f6" dot={false} strokeWidth={1.5} name="EMA9" />
            <Line dataKey="close" stroke="#e2e8f0" dot={false} strokeWidth={2} name="ราคา" />
            {buy !== undefined && (
              <ReferenceLine
                y={buy}
                stroke="#10b981"
                strokeWidth={1.5}
                label={{ value: `Buy ${buy}`, fill: "#10b981", fontSize: 9, position: "insideRight" }}
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
    </div>
  );
};

export default function MartinLukPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);

  const [tierFilter, setTierFilter] = useState<string>("LEAD");
  const [pullbackOnly, setPullbackOnly] = useState(false);

  const [alertState, setAlertState] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});
  const [bulkSending, setBulkSending] = useState(false);

  const buildAlertItem = (d: MartinLukData) => ({
    ticker: d.symbol,
    entry: d.setup!.entryTrigger,
    triggerPrice: d.setup!.entryTrigger,
    cut: d.setup!.stopLoss,
    target: Number((d.setup!.entryTrigger * 1.2).toFixed(2)),
    alertType: "MARTINLUK",
    note: `${d.tierLabel} · แกว่งเฉลี่ยวันละ ${d.adrPct}%`,
  });

  const sendToAlert = async (d: MartinLukData) => {
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

  const sendAllVisible = async (list: MartinLukData[]) => {
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

  const [openCharts, setOpenCharts] = useState<string[]>([]);
  const toggleChart = (symbol: string) =>
    setOpenCharts((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol],
    );

  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const allSymbols = useMemo(
    () => stockEntries.map((e) => e.symbol),
    [stockEntries],
  );
  const detailMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of stockEntries) if (e.detail) m[e.symbol] = e.detail;
    return m;
  }, [stockEntries]);
  const categoryGroups = useMemo(
    () => groupByCategory(stockEntries),
    [stockEntries],
  );

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);
    const urlSymbols = params.get("symbols");
    const parsed = urlSymbols
      ? urlSymbols.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];
    if (parsed.length) setSelectedTickers(parsed);

    let masterSyms: string[] = [];

    fetchStockList()
      .then(({ entries }) => {
        setStockEntries(entries);
        masterSyms = entries.map((e) => e.symbol);

        const customFromUrl = parsed.filter((t) => !masterSyms.includes(t));
        if (customFromUrl.length)
          setCustomTickers((prev) =>
            Array.from(new Set([...prev, ...customFromUrl])),
          );

        const all = Array.from(new Set([...masterSyms, ...parsed]));
        setScans(
          all.map((symbol) => ({ symbol, data: null, status: "pending" })),
        );

        return fetch("/api/sheets/portfolio").then((res) => res.json());
      })
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

          const newTickers = pTickers.filter((t) => !masterSyms.includes(t));
          if (newTickers.length) {
            setCustomTickers((prev) =>
              Array.from(new Set([...prev, ...newTickers])),
            );
            setScans((prev) => {
              const ex = new Set(prev.map((s) => s.symbol));
              const add = newTickers
                .filter((t) => !ex.has(t))
                .map((t) => ({ symbol: t, data: null, status: "pending" as const }));
              return [...prev, ...add];
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  const addCustomTicker = (ticker: string) => {
    const upper = ticker.trim().toUpperCase();
    if (!upper) return;
    if (!customTickers.includes(upper) && !allSymbols.includes(upper)) {
      setCustomTickers((prev) => [...prev, upper]);
    }
    if (!selectedTickers.includes(upper)) {
      setSelectedTickers((prev) => [...prev, upper]);
    }
    setSearchTerm("");
  };

  const filteredSymbols = Array.from(
    new Set([...allSymbols, ...customTickers]),
  ).filter((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

  const CAT_COLORS = [
    "bg-purple-800",
    "bg-purple-600",
    "bg-blue-600",
    "bg-pink-600",
    "bg-emerald-700",
    "bg-teal-700",
    "bg-rose-700",
    "bg-indigo-700",
    "bg-fuchsia-700",
    "bg-cyan-700",
  ];
  const quickGroups = [
    { label: "พอร์ตของฉัน 🌟", list: portfolioTickers, color: "bg-yellow-600" },
    { label: "ALL LIST", list: allSymbols, color: "bg-gray-600" },
    ...categoryGroups.map((g, i) => ({
      label: g.category,
      list: g.symbols,
      color: CAT_COLORS[i % CAT_COLORS.length],
    })),
  ];

  const handleScan = async () => {
    if (scanning || selectedTickers.length === 0) return;
    setScanning(true);
    setScanProgress(0);

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
        const res = await fetch(`/api/martinluk?symbol=${symbol}`);
        const data: MartinLukData = await res.json();
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
    .filter((s) => (tierFilter === "ALL" ? true : s.data?.tier === tierFilter))
    .filter((s) => (pullbackOnly ? s.data?.pullback?.signal : true))
    .sort((a, b) => {
      // Pullback signal > Tier LEAD > ADR
      const sigA = a.data?.pullback?.signal ? 1 : 0;
      const sigB = b.data?.pullback?.signal ? 1 : 0;
      if (sigB !== sigA) return sigB - sigA;
      
      const tierRank: Record<string, number> = { "LEAD": 3, "MEDIOCRE": 2, "LAG": 1 };
      const ta = tierRank[a.data?.tier || "LAG"];
      const tb = tierRank[b.data?.tier || "LAG"];
      if (tb !== ta) return tb - ta;

      return (b.data?.adrPct || 0) - (a.data?.adrPct || 0);
    });

  const signalCount = scans.filter(
    (s) => s.data?.pullback?.signal,
  ).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-indigo-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              <div>
                <h1 className="text-xl font-bold text-indigo-400">
                  MARTIN LUK PULLBACK
                </h1>
                <p className="text-gray-400 text-xs">
                  สแกนหาจุดเข้าตอนย่อ (Pullback) ของหุ้น Momentum แบบ Martin Luk (USIC)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/minervini"
                className="text-gray-400 hover:text-amber-400 font-bold transition-colors"
              >
                🏆 Minervini
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
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex gap-4 text-sm text-indigo-100">
          <span className="text-2xl mt-1">💡</span>
          <div>
            <p className="font-bold text-white mb-1">
              Martin Luk Pullback Strategy คืออะไร?
            </p>
            <p className="text-gray-300">
              กลยุทธ์จากแชมป์ USIC ที่เน้นเทรดหุ้น Momentum ขาขึ้น (EMA9 {'>'} 21 {'>'} 50) ที่มีการแกว่งตัวแรง (ADR {'>'} 5%) 
              และรอให้ราคาย่อตัว (Pullback) ลงมาใกล้เส้น EMA9 หรือ EMA21 จากนั้นเข้าซื้อเมื่อเห็นสัญญาณการตีกลับ (Bounce) 
              หรือมีการพักตัวแคบ (Tight Inside Day)
            </p>
          </div>
        </div>

        {/* Stock selector */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              📊 เลือกหุ้นที่จะสแกน
              <span className="text-sm text-gray-500 font-normal">
                (เลือก {selectedTickers.length} ตัว)
              </span>
            </h2>
            <button
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
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
                {quickGroups.map((group) => {
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
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => addCustomTicker(searchTerm)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-all"
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
                  : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25 active:scale-95"
              }`}
            >
              {scanning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  กำลังสแกน {selectedTickers.length} ตัว... {Math.round(scanProgress)}%
                </>
              ) : (
                <>
                  <span>🎯</span>
                  วิเคราะห์แบบ Martin Luk
                </>
              )}
            </button>
          </div>
          {scanning && (
            <div className="mt-4 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-2 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Filter toggle */}
        {!scanning && results.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setPullbackOnly(false)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                !pullbackOnly
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-gray-400 hover:bg-slate-700"
              }`}
            >
              ทั้งหมดที่สแกน ({scans.filter((s) => s.data?.status === "success").length})
            </button>
            <button
              onClick={() => setPullbackOnly(true)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border flex items-center gap-2 ${
                pullbackOnly
                  ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50"
                  : "bg-slate-800 text-gray-400 border-transparent hover:bg-slate-700"
              }`}
            >
              🎯 มีสัญญาณ Pullback ({signalCount})
            </button>
          </div>
        )}

        {/* Tier filter */}
        {!scanning && results.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs self-center mr-1">
              กรองตาม Tier:
            </span>
            {[
              { val: "ALL", label: "ทุก Tier (ไม่แนะนำ)" },
              { val: "LEAD", label: "🥇 LEAD (Martin Luk's choice)" },
            ].map((opt) => {
              const count =
                opt.val === "ALL"
                  ? scans.filter((s) => s.data?.status === "success").length
                  : scans.filter((s) => s.data?.tier === opt.val).length;
              if (opt.val !== "ALL" && count === 0) return null;
              const active = tierFilter === opt.val;
              return (
                <button
                  key={opt.val}
                  onClick={() => setTierFilter(opt.val)}
                  className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-all border ${
                    active
                      ? "bg-white text-slate-900 border-white"
                      : "bg-slate-800/50 text-gray-400 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
            
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  const validData = results.map(r => r.data!).filter(Boolean);
                  sendAllVisible(validData);
                }}
                disabled={bulkSending || results.length === 0}
                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border ${
                  bulkSending || results.length === 0
                    ? "bg-slate-800 text-gray-500 border-slate-700 cursor-not-allowed"
                    : "bg-emerald-600/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-600/30"
                }`}
              >
                {bulkSending ? "กำลังส่ง..." : "📲 ส่งที่แสดงอยู่เข้า LINE ทั้งหมด"}
              </button>
            </div>
          </div>
        )}

        {/* Results grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map(({ symbol, data }) => {
            if (!data) return null;
            const tStyle = tierStyle(data.tier);
            const alertStatus = alertState[symbol] || "idle";

            return (
              <div
                key={symbol}
                className={`bg-slate-800/80 rounded-2xl border p-4 hover:shadow-lg transition-all ${
                  data.pullback?.signal ? "border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]" : "border-slate-700"
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      {symbol}
                    </h3>
                    <div className="text-sm text-gray-400">
                      ${data.price}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-[10px] font-bold border ${tStyle.bg} ${tStyle.text} ${tStyle.border}`}>
                    {data.tierLabel}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {/* Indicators */}
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div className={`p-1.5 rounded border ${data.momentum?.pass ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-400" : "bg-slate-900/50 border-slate-700 text-gray-500"}`}>
                      🚀 โมเมนตัม &gt; 30%: {data.momentum?.pass ? "ผ่าน" : "ไม่ผ่าน"}
                    </div>
                    <div className={`p-1.5 rounded border ${data.liquidity?.pass ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-400" : "bg-slate-900/50 border-slate-700 text-gray-500"}`}>
                      💧 สภาพคล่อง &gt; $1M: {data.liquidity?.pass ? "ผ่าน" : "ไม่ผ่าน"}
                    </div>
                    <div className={`p-1.5 rounded border ${data.highADR ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-400" : "bg-slate-900/50 border-slate-700 text-gray-500"}`}>
                      ⚡ แกว่งวันละ: {data.adrPct}%
                    </div>
                    <div className={`p-1.5 rounded border ${data.pullback?.isBasing ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-400" : "bg-slate-900/50 border-slate-700 text-gray-500"}`}>
                      📦 ทำฐาน 1 เดือน: {data.pullback?.isBasing ? `ใช่ (${data.pullback?.baseRangePct}%)` : `สวิงกว้าง (${data.pullback?.baseRangePct}%)`}
                    </div>
                  </div>

                  {/* Pullback */}
                  <div className="bg-slate-900/50 p-2 rounded border border-slate-700 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">สัญญาณย่อตัว (Pullback)</span>
                      <span className={`font-bold ${data.pullback?.signal ? "text-indigo-400" : "text-gray-500"}`}>
                        {data.pullback?.signal ? "🎯 ใช่" : "ไม่ใช่"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">ระยะห่าง EMA9</span>
                      <span className={data.pullback?.nearEma9 ? "text-white" : "text-gray-500"}>
                        {data.pullback?.distToEma9}% {data.pullback?.nearEma9 && "(ใกล้)"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">ระยะห่าง EMA21</span>
                      <span className={data.pullback?.nearEma21 ? "text-white" : "text-gray-500"}>
                        {data.pullback?.distToEma21}% {data.pullback?.nearEma21 && "(ใกล้)"}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-500">ระยะห่าง AVWAP</span>
                      <span className={(data.pullback?.nearAvwapHigh || data.pullback?.nearAvwapLow) ? "text-white" : "text-gray-500"}>
                        {(data.pullback?.nearAvwapHigh || data.pullback?.nearAvwapLow) ? "(ใกล้)" : "ไกล"}
                      </span>
                    </div>
                    {data.pullback?.bouncing && (
                      <div className="text-[10px] text-emerald-400 mt-1 flex justify-end">
                        ⚡ เด้งกลับ (แท่งเขียว ปิดสูงขึ้น)
                      </div>
                    )}
                    {data.pullback?.tightDay && (
                      <div className="text-[10px] text-amber-400 mt-1 flex justify-end">
                        🔒 บีบตัวแคบ (Inside Day)
                      </div>
                    )}
                  </div>

                  {/* Setup */}
                  {data.setup && (
                    <div className="bg-indigo-900/10 p-2 rounded border border-indigo-500/20 text-xs">
                      <div className="flex justify-between">
                        <span className="text-indigo-300/70">จุดเข้าซื้อ (Entry)</span>
                        <span className="text-indigo-300 font-bold">${data.setup.entryTrigger}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-rose-400/70">ตัดขาดทุน (Stop)</span>
                        <span className="text-rose-400 font-bold">${data.setup.stopLoss}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ความเสี่ยง (Risk) %</span>
                        <span className={`font-bold ${data.setup.riskPass ? "text-emerald-400" : "text-rose-400"}`}>
                          {data.setup.riskPct}% {!data.setup.riskPass && "(> 4%)"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => toggleChart(symbol)}
                    className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium transition-colors"
                  >
                    {openCharts.includes(symbol) ? "ปิดกราฟ" : "ดูกราฟ"}
                  </button>
                  <button
                    onClick={() => sendToAlert(data)}
                    disabled={alertStatus === "sending" || alertStatus === "sent"}
                    className={`w-full py-2 rounded text-xs font-bold transition-colors ${
                      alertStatus === "sent"
                        ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/50"
                        : alertStatus === "error"
                        ? "bg-red-500/20 text-red-400 border border-red-500/50"
                        : alertStatus === "sending"
                        ? "bg-slate-700 text-gray-400"
                        : "bg-blue-600/20 text-blue-400 border border-blue-500/50 hover:bg-blue-600/40"
                    }`}
                  >
                    {alertStatus === "sent" ? "✅ แจ้งเตือนแล้ว" : alertStatus === "sending" ? "..." : "📲 แจ้งเตือน LINE"}
                  </button>
                </div>

                {/* Chart Dropdown */}
                {openCharts.includes(symbol) && (
                  <div className="mt-4 border-t border-slate-700 pt-4 col-span-full">
                    <MartinLukChart d={data} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!scanning && scans.filter(s => s.status === "error").length > 0 && (
          <div className="mt-8">
            <h3 className="text-red-400 font-bold mb-2">❌ ตัวที่สแกนไม่ผ่าน (Error/Data Missing)</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {scans.filter(s => s.status === "error").map(s => (
                <span key={s.symbol} className="px-2 py-1 bg-red-900/30 text-red-300 rounded border border-red-800/50">
                  {s.symbol}: {s.data?.reason || "Failed"}
                </span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

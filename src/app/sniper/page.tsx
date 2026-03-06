"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Target,
  Activity,
  AlertTriangle,
  Zap,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Copy,
  Check,
  Bomb,
  TrendingUp,
  ClipboardList,
} from "lucide-react";

interface SniperResult {
  symbol: string;
  currentPrice: number;
  pctChange: number;
  ema5: number;
  sma20: number;
  bbWidthPct: number;
  rsi: number;
  volM: string;
  isSqueeze: boolean;
  crossSMA20: boolean;
  isTrend: boolean;
  momentumIgnition: boolean;
  rsiFuelReady: boolean;
  playbook: "squeeze" | "spring_trap" | "high_vol" | "neutral";
  playbookLabel: string;
  playbookEmoji: string;
  playbookTip: string;
  isWaveRider: boolean;
}

const PLAYBOOK_STYLES: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
    activeBorder: string;
  }
> = {
  squeeze: {
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-400",
    activeBg: "bg-blue-900/30",
    activeBorder: "border-blue-500/50",
  },
  spring_trap: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-400",
    activeBg: "bg-amber-900/30",
    activeBorder: "border-amber-500/50",
  },
  high_vol: {
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    text: "text-purple-400",
    activeBg: "bg-purple-900/30",
    activeBorder: "border-purple-500/50",
  },
  neutral: {
    bg: "bg-slate-500/5",
    border: "border-slate-700/30",
    text: "text-slate-500",
    activeBg: "bg-slate-800",
    activeBorder: "border-slate-600",
  },
};

export default function SniperScanner() {
  const [data, setData] = useState<SniperResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [historyData, setHistoryData] = useState<Record<string, any[]>>({});
  const [historyLoading, setHistoryLoading] = useState<Record<string, boolean>>(
    {},
  );
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);
  const [bulkCopyLoading, setBulkCopyLoading] = useState(false);
  const [bulkCopyDone, setBulkCopyDone] = useState(false);
  const [bulkCopyProgress, setBulkCopyProgress] = useState("");

  // Sort state
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" || key === "playbook" ? "asc" : "desc");
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const sorted = [...data].sort((a, b) => {
      let valA: any, valB: any;
      switch (sortKey) {
        case "symbol":
          valA = a.symbol;
          valB = b.symbol;
          break;
        case "playbook":
          valA = a.playbook;
          valB = b.playbook;
          break;
        case "close":
          valA = a.currentPrice;
          valB = b.currentPrice;
          break;
        case "pctChange":
          valA = a.pctChange;
          valB = b.pctChange;
          break;
        case "ema5":
          valA = a.ema5;
          valB = b.ema5;
          break;
        case "sma20":
          valA = a.sma20;
          valB = b.sma20;
          break;
        case "bbWidthPct":
          valA = a.bbWidthPct;
          valB = b.bbWidthPct;
          break;
        case "rsi":
          valA = a.rsi;
          valB = b.rsi;
          break;
        case "volM":
          valA = parseFloat(a.volM);
          valB = parseFloat(b.volM);
          break;
        default:
          return 0;
      }
      if (typeof valA === "string")
        return sortDir === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  const fetchScanner = async (currentFilter: string) => {
    setLoading(true);
    setExpandedRows({});
    try {
      const res = await fetch(`/api/sniper?filter=${currentFilter}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch sniper data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScanner(filter);
  }, [filter]);

  const toggleRow = async (symbol: string) => {
    const isExpanded = !!expandedRows[symbol];
    setExpandedRows((prev) => ({ ...prev, [symbol]: !isExpanded }));
    if (!isExpanded && !historyData[symbol]) {
      setHistoryLoading((prev) => ({ ...prev, [symbol]: true }));
      try {
        const res = await fetch(`/api/sniper/history?symbol=${symbol}`);
        const json = await res.json();
        if (json.success)
          setHistoryData((prev) => ({ ...prev, [symbol]: json.data }));
      } catch (error) {
        console.error(`Failed to fetch history for ${symbol}`, error);
      } finally {
        setHistoryLoading((prev) => ({ ...prev, [symbol]: false }));
      }
    }
  };

  const copyHistory = (symbol: string) => {
    const rows = historyData[symbol];
    if (!rows || rows.length === 0) return;
    const header = `--- [${symbol}] Pre-Breakout Analysis (Sniper Radar) ---\nDate\t\tClose\t%Chg\tEMA5\tSMA20\tBB_W(%)\tRSI\tVol(M)`;
    const lines = rows.map((r: any) => {
      const signals = [
        r.isSqueeze ? "(SQUEEZE)" : "",
        r.crossSMA20 ? "(CROSS SMA20)" : "",
        r.momentumIgnition ? "(MOM CATCHER)" : "",
        r.isTrend && !r.crossSMA20 ? "(TREND)" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `${r.date}\t${r.close.toFixed(2)}\t${r.pctChange >= 0 ? "+" : ""}${r.pctChange.toFixed(2)}%\t${r.ema5.toFixed(2)}\t${r.sma20.toFixed(2)}\t${r.bbWidthPct.toFixed(1)}%\t${r.rsi.toFixed(1)}\t${r.volM}\t ${signals}`;
    });
    navigator.clipboard.writeText([header, ...lines].join("\n")).then(() => {
      setCopiedSymbol(symbol);
      setTimeout(() => setCopiedSymbol(null), 2000);
    });
  };

  const copyAllHistory = async () => {
    if (data.length === 0 || bulkCopyLoading) return;
    setBulkCopyLoading(true);
    setBulkCopyDone(false);
    const allText: string[] = [
      "SNIPER RADAR - BULK HISTORY EXPORT",
      `Date: ${new Date().toISOString().split("T")[0]}`,
      `Stocks: ${data.length}`,
      "=".repeat(50),
    ];

    for (let i = 0; i < data.length; i++) {
      const sym = data[i].symbol;
      setBulkCopyProgress(`${i + 1}/${data.length} (${sym})`);
      try {
        let rows = historyData[sym];
        if (!rows) {
          const res = await fetch(`/api/sniper/history?symbol=${sym}`);
          const json = await res.json();
          if (json.success) {
            rows = json.data;
            setHistoryData((prev) => ({ ...prev, [sym]: rows }));
          }
        }
        if (rows && rows.length > 0) {
          allText.push(
            `\n--- [${sym}] Pre-Breakout Analysis (Sniper Radar) ---`,
          );
          allText.push(
            `Playbook: ${data[i].playbookEmoji} ${data[i].playbookLabel}`,
          );
          allText.push(
            "Date\t\tClose\t%Chg\tEMA5\tSMA20\tBB_W(%)\tRSI\tVol(M)",
          );
          for (const r of rows) {
            const signals = [
              r.isSqueeze ? "(SQUEEZE)" : "",
              r.crossSMA20 ? "(CROSS SMA20)" : "",
              r.momentumIgnition ? "(MOM CATCHER)" : "",
              r.isTrend && !r.crossSMA20 ? "(TREND)" : "",
            ]
              .filter(Boolean)
              .join(" ");
            allText.push(
              `${r.date}\t${r.close.toFixed(2)}\t${r.pctChange >= 0 ? "+" : ""}${r.pctChange.toFixed(2)}%\t${r.ema5.toFixed(2)}\t${r.sma20.toFixed(2)}\t${r.bbWidthPct.toFixed(1)}%\t${r.rsi.toFixed(1)}\t${r.volM}\t ${signals}`,
            );
          }
        }
      } catch {
        allText.push(`\n[${sym}] Error: Failed to fetch`);
      }
      // Small delay to avoid rate limits
      if (i < data.length - 1) await new Promise((r) => setTimeout(r, 200));
    }

    await navigator.clipboard.writeText(allText.join("\n"));
    setBulkCopyLoading(false);
    setBulkCopyDone(true);
    setBulkCopyProgress("");
    setTimeout(() => setBulkCopyDone(false), 3000);
  };

  // Count by playbook
  const countByPlaybook = (pb: string) =>
    data.filter((d) => d.playbook === pb).length;
  const countWaveRiders = () => data.filter((d) => d.isWaveRider).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 pt-24 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 text-red-400">
                <Target size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-orange-400">
                  Sniper Pre-Breakout Radar
                </h1>
                <p className="text-slate-400 mt-1">
                  ระบบจำแนก DNA รูปแบบก่อนระเบิด 3 Playbooks
                  (คลิกที่หุ้นเพื่อดูตารางย้อนหลัง)
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {lastRefreshed
                ? `อัปเดต: ${lastRefreshed.toLocaleTimeString()}`
                : "กำลังโหลด..."}
            </span>
            <button
              onClick={() => fetchScanner(filter)}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
            <button
              onClick={copyAllHistory}
              disabled={loading || bulkCopyLoading || data.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all disabled:opacity-50 ${
                bulkCopyDone
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400"
                  : bulkCopyLoading
                    ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
              }`}
            >
              {bulkCopyDone ? (
                <>
                  <Check size={16} /> Copied All!
                </>
              ) : bulkCopyLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />{" "}
                  {bulkCopyProgress}
                </>
              ) : (
                <>
                  <ClipboardList size={16} /> Copy All History
                </>
              )}
            </button>
          </div>
        </div>

        {/* Playbook Filter Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <button
            onClick={() => setFilter("all")}
            className={`p-4 rounded-xl border transition-all text-left ${filter === "all" ? "bg-slate-800 border-slate-600" : "bg-slate-900/50 border-slate-800/50 hover:border-slate-700"}`}
          >
            <p className="text-slate-400 text-xs flex items-center gap-1.5">
              <Activity size={14} /> ทั้งหมด
            </p>
            <p className="text-2xl font-bold mt-1">{data.length}</p>
          </button>

          <button
            onClick={() => setFilter("squeeze")}
            className={`p-4 rounded-xl border transition-all text-left ${filter === "squeeze" ? PLAYBOOK_STYLES.squeeze.activeBg + " " + PLAYBOOK_STYLES.squeeze.activeBorder : "bg-slate-900/50 border-slate-800/50 hover:border-blue-500/30"}`}
          >
            <p className="text-blue-400 text-xs flex items-center gap-1.5">
              🧨 หม้ออัดแรงดัน
            </p>
            <p className="text-2xl font-bold text-blue-300 mt-1">
              {filter === "all"
                ? countByPlaybook("squeeze")
                : filter === "squeeze"
                  ? data.length
                  : "-"}
            </p>
            <p className="text-[10px] text-blue-500/70 mt-1">
              BB_W &lt; 15% ดักซุ่มยิง
            </p>
          </button>

          <button
            onClick={() => setFilter("spring_trap")}
            className={`p-4 rounded-xl border transition-all text-left ${filter === "spring_trap" ? PLAYBOOK_STYLES.spring_trap.activeBg + " " + PLAYBOOK_STYLES.spring_trap.activeBorder : "bg-slate-900/50 border-slate-800/50 hover:border-amber-500/30"}`}
          >
            <p className="text-amber-400 text-xs flex items-center gap-1.5">
              🪤 กับดักสลัดเม่า
            </p>
            <p className="text-2xl font-bold text-amber-300 mt-1">
              {filter === "all"
                ? countByPlaybook("spring_trap")
                : filter === "spring_trap"
                  ? data.length
                  : "-"}
            </p>
            <p className="text-[10px] text-amber-500/70 mt-1">
              V-Shape Rebound
            </p>
          </button>

          <button
            onClick={() => setFilter("high_vol")}
            className={`p-4 rounded-xl border transition-all text-left ${filter === "high_vol" ? PLAYBOOK_STYLES.high_vol.activeBg + " " + PLAYBOOK_STYLES.high_vol.activeBorder : "bg-slate-900/50 border-slate-800/50 hover:border-purple-500/30"}`}
          >
            <p className="text-purple-400 text-xs flex items-center gap-1.5">
              🎢 รถไฟเหาะทะลุฟ้า
            </p>
            <p className="text-2xl font-bold text-purple-300 mt-1">
              {filter === "all"
                ? countByPlaybook("high_vol")
                : filter === "high_vol"
                  ? data.length
                  : "-"}
            </p>
            <p className="text-[10px] text-purple-500/70 mt-1">
              BB_W &gt; 30% ซื้อตาม MOM
            </p>
          </button>

          <button
            onClick={() => setFilter("wave_rider")}
            className={`p-4 rounded-xl border transition-all text-left ${filter === "wave_rider" ? "bg-cyan-900/30 border-cyan-500/50" : "bg-slate-900/50 border-slate-800/50 hover:border-cyan-500/30"}`}
          >
            <p className="text-cyan-400 text-xs flex items-center gap-1.5">
              🏄 ขี่คลื่น
            </p>
            <p className="text-2xl font-bold text-cyan-300 mt-1">
              {filter === "all"
                ? countWaveRiders()
                : filter === "wave_rider"
                  ? data.length
                  : "-"}
            </p>
            <p className="text-[10px] text-cyan-500/70 mt-1">
              พักตัวแตะ EMA5 = Re-entry
            </p>
          </button>

          <button
            onClick={() => setFilter("momentum")}
            className={`p-4 rounded-xl border transition-all text-left ${filter === "momentum" ? "bg-red-900/30 border-red-500/50" : "bg-slate-900/50 border-slate-800/50 hover:border-red-500/30"}`}
          >
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <Zap size={14} /> MOM Catcher
            </p>
            <p className="text-2xl font-bold text-red-300 mt-1">
              {filter === "momentum" ? data.length : "-"}
            </p>
            <p className="text-[10px] text-red-500/70 mt-1">
              ทุก Playbook ที่จุดพลุ
            </p>
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-slate-800/50 border-b border-slate-800">
                <tr>
                  {[
                    { key: "symbol", label: "Symbol" },
                    { key: "playbook", label: "Playbook" },
                    { key: "close", label: "Close" },
                    { key: "pctChange", label: "%Chg" },
                    { key: "ema5", label: "EMA5" },
                    { key: "sma20", label: "SMA20" },
                    { key: "bbWidthPct", label: "BB_W(%)" },
                    { key: "rsi", label: "RSI" },
                    { key: "volM", label: "Vol(M)" },
                    { key: null, label: "Triggers" },
                  ].map((col) => (
                    <th
                      key={col.label}
                      onClick={() => col.key && toggleSort(col.key)}
                      className={`px-4 py-4 font-medium ${col.key ? "cursor-pointer hover:text-slate-200 select-none transition-colors" : ""}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {col.key && sortKey === col.key && (
                          <span className="text-blue-400 text-[10px]">
                            {sortDir === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <RefreshCw
                        size={24}
                        className="animate-spin mx-auto mb-3 opacity-50"
                      />
                      กำลังวิเคราะห์ DNA 3 Playbooks...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      ไม่มีหุ้นที่เข้าเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, idx) => {
                    const style =
                      PLAYBOOK_STYLES[row.playbook] || PLAYBOOK_STYLES.neutral;
                    return (
                      <React.Fragment key={idx}>
                        <tr
                          onClick={() => toggleRow(row.symbol)}
                          className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                            expandedRows[row.symbol]
                              ? "bg-slate-800/50 border-blue-500/30"
                              : "hover:bg-slate-800/30"
                          }`}
                        >
                          <td className="px-4 py-3 font-bold text-white flex items-center gap-2">
                            {expandedRows[row.symbol] ? (
                              <ChevronUp size={14} className="text-slate-400" />
                            ) : (
                              <ChevronDown
                                size={14}
                                className="text-slate-500"
                              />
                            )}
                            {row.symbol}
                            {row.momentumIgnition && (
                              <span className="flex h-2 w-2 relative ml-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border ${style.bg} ${style.border} ${style.text}`}
                            >
                              {row.playbookEmoji} {row.playbookLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-300">
                            ${row.currentPrice.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-3 font-mono ${row.pctChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                          >
                            {row.pctChange >= 0 ? "+" : ""}
                            {row.pctChange.toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">
                            {row.ema5.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">
                            {row.sma20.toFixed(2)}
                          </td>
                          <td
                            className={`px-4 py-3 font-mono font-medium ${row.bbWidthPct < 15 ? "text-blue-400" : row.bbWidthPct > 30 ? "text-purple-400" : "text-slate-400"}`}
                          >
                            {row.bbWidthPct.toFixed(1)}%
                          </td>
                          <td
                            className={`px-4 py-3 font-mono ${row.rsi > 70 ? "text-rose-400" : row.rsi < 30 ? "text-emerald-400" : row.rsiFuelReady ? "text-cyan-400" : row.rsi > 55 ? "text-amber-400" : "text-slate-400"}`}
                          >
                            {row.rsi.toFixed(1)}
                            {row.rsiFuelReady && (
                              <span className="ml-1 text-[9px] text-cyan-500">
                                ⛽
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-400">
                            {row.volM}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {row.isSqueeze && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                                  SQ
                                </span>
                              )}
                              {row.crossSMA20 && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                                  CR
                                </span>
                              )}
                              {row.momentumIgnition && (
                                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                                  MOM
                                </span>
                              )}
                              {row.isTrend && !row.crossSMA20 && (
                                <span className="px-1.5 py-0.5 text-[9px] bg-slate-700/50 text-slate-400 rounded">
                                  TR
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable History Detail Row */}
                        {expandedRows[row.symbol] && (
                          <tr className="bg-slate-900/80 border-b border-slate-800">
                            <td colSpan={10} className="p-0">
                              <div className="p-4 pl-10 border-l-4 border-blue-500/50">
                                {/* Playbook Tip */}
                                <div
                                  className={`mb-3 p-3 rounded-lg border ${style.bg} ${style.border}`}
                                >
                                  <p
                                    className={`text-xs font-bold ${style.text}`}
                                  >
                                    {row.playbookEmoji} Playbook:{" "}
                                    {row.playbookLabel}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    💡 {row.playbookTip}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                    <Activity size={14} /> Historical
                                    Calculation Details (15 Days)
                                  </h4>
                                  {historyData[row.symbol] &&
                                    historyData[row.symbol].length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          copyHistory(row.symbol);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                                          copiedSymbol === row.symbol
                                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                            : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                                        }`}
                                      >
                                        {copiedSymbol === row.symbol ? (
                                          <>
                                            <Check size={12} /> Copied!
                                          </>
                                        ) : (
                                          <>
                                            <Copy size={12} /> คัดลอกข้อมูล
                                          </>
                                        )}
                                      </button>
                                    )}
                                </div>

                                {historyLoading[row.symbol] ? (
                                  <div className="py-8 text-center text-slate-500 flex justify-center items-center gap-2">
                                    <Loader2
                                      className="animate-spin text-blue-500"
                                      size={20}
                                    />
                                    <span>กำลังดึงข้อมูลย้อนหลัง...</span>
                                  </div>
                                ) : historyData[row.symbol] ? (
                                  <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
                                    <table className="w-full text-xs text-left">
                                      <thead className="bg-slate-900 text-slate-500 border-b border-slate-800">
                                        <tr>
                                          <th className="px-4 py-2 font-medium">
                                            Date
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            Close
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            %Chg
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            EMA5
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            SMA20
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            BB_W(%)
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            RSI
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            Vol(M)
                                          </th>
                                          <th className="px-4 py-2 font-medium">
                                            Signals
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {historyData[row.symbol].map(
                                          (hRow: any, hIdx: number) => (
                                            <tr
                                              key={hIdx}
                                              className="border-b border-slate-800/30 hover:bg-slate-800/40 font-mono last:border-0"
                                            >
                                              <td className="px-4 py-2 text-slate-400">
                                                {hRow.date}
                                              </td>
                                              <td className="px-4 py-2 text-slate-300">
                                                ${hRow.close.toFixed(2)}
                                              </td>
                                              <td
                                                className={`px-4 py-2 ${hRow.pctChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                                              >
                                                {hRow.pctChange > 0 ? "+" : ""}
                                                {hRow.pctChange.toFixed(2)}%
                                              </td>
                                              <td className="px-4 py-2 text-slate-500">
                                                {hRow.ema5.toFixed(2)}
                                              </td>
                                              <td className="px-4 py-2 text-slate-500">
                                                {hRow.sma20.toFixed(2)}
                                              </td>
                                              <td
                                                className={`px-4 py-2 ${hRow.bbWidthPct < 15 ? "text-blue-400 font-bold" : hRow.bbWidthPct > 30 ? "text-purple-400" : "text-slate-500"}`}
                                              >
                                                {hRow.bbWidthPct.toFixed(1)}%
                                              </td>
                                              <td
                                                className={`px-4 py-2 ${hRow.rsi > 70 ? "text-rose-400" : hRow.rsi < 30 ? "text-emerald-400" : hRow.rsi > 55 ? "text-amber-400" : "text-slate-500"}`}
                                              >
                                                {hRow.rsi.toFixed(1)}
                                              </td>
                                              <td className="px-4 py-2 text-slate-500">
                                                {hRow.volM}
                                              </td>
                                              <td className="px-4 py-1.5 font-sans">
                                                <div className="flex flex-wrap gap-1">
                                                  {hRow.isSqueeze && (
                                                    <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1 rounded">
                                                      SQ
                                                    </span>
                                                  )}
                                                  {hRow.crossSMA20 && (
                                                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                                                      CR
                                                    </span>
                                                  )}
                                                  {hRow.momentumIgnition && (
                                                    <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-1 rounded">
                                                      MOM
                                                    </span>
                                                  )}
                                                  {hRow.isTrend &&
                                                    !hRow.crossSMA20 && (
                                                      <span className="text-[9px] text-slate-400 border border-slate-700/50 px-1 rounded">
                                                        TR
                                                      </span>
                                                    )}
                                                </div>
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="py-4 text-slate-500 text-center">
                                    ไม่พบหรือโหลดข้อมูลไม่ได้
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

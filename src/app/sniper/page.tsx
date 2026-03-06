"use client";

import { useState, useEffect } from "react";
import {
  Target,
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Zap,
  RefreshCw,
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
}

export default function SniperScanner() {
  const [data, setData] = useState<SniperResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "squeeze" | "momentum" | "cross"
  >("all");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchScanner = async (currentFilter: string) => {
    setLoading(true);
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
                  สแกนหาหุ้นที่กำลังบีบตัว (Squeeze) และมีโมเมนตัมพร้อมระเบิด
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
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setFilter("all")}
            className={`p-4 rounded-xl border transition-all text-left ${
              filter === "all"
                ? "bg-slate-800 border-slate-600"
                : "bg-slate-900/50 border-slate-800/50 hover:border-slate-700"
            }`}
          >
            <p className="text-slate-400 text-xs flex items-center gap-1.5">
              <Activity size={14} /> หุ้นทั้งหมดในลิสต์
            </p>
            <p className="text-2xl font-bold mt-1">
              {filter === "all" ? data.length : "-"}
            </p>
          </button>

          <button
            onClick={() => setFilter("squeeze")}
            className={`p-4 rounded-xl border transition-all text-left ${
              filter === "squeeze"
                ? "bg-blue-900/30 border-blue-500/50"
                : "bg-slate-900/50 border-slate-800/50 hover:border-blue-500/30"
            }`}
          >
            <p className="text-blue-400 text-xs flex items-center gap-1.5">
              <AlertTriangle size={14} /> Squeeze (บีบตัว)
            </p>
            <p className="text-2xl font-bold text-blue-300 mt-1">
              {filter === "squeeze" ? data.length : "-"}
            </p>
            <p className="text-[10px] text-blue-500/70 mt-1">
              BB Width &lt; 15%
            </p>
          </button>

          <button
            onClick={() => setFilter("cross")}
            className={`p-4 rounded-xl border transition-all text-left ${
              filter === "cross"
                ? "bg-emerald-900/30 border-emerald-500/50"
                : "bg-slate-900/50 border-slate-800/50 hover:border-emerald-500/30"
            }`}
          >
            <p className="text-emerald-400 text-xs flex items-center gap-1.5">
              <ArrowUpRight size={14} /> กลับตัว (Cross SMA20)
            </p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">
              {filter === "cross" ? data.length : "-"}
            </p>
            <p className="text-[10px] text-emerald-500/70 mt-1">
              ยืนเหนือเส้น 20 วัน
            </p>
          </button>

          <button
            onClick={() => setFilter("momentum")}
            className={`p-4 rounded-xl border transition-all text-left ${
              filter === "momentum"
                ? "bg-red-900/30 border-red-500/50"
                : "bg-slate-900/50 border-slate-800/50 hover:border-red-500/30"
            }`}
          >
            <p className="text-red-400 text-xs flex items-center gap-1.5">
              <Zap size={14} /> Momentum Catcher
            </p>
            <p className="text-2xl font-bold text-red-300 mt-1">
              {filter === "momentum" ? data.length : "-"}
            </p>
            <p className="text-[10px] text-red-500/70 mt-1">
              Price &gt; EMA5 + RSI พุ่งชัน
            </p>
          </button>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Symbol</th>
                  <th className="px-6 py-4 font-medium">Close</th>
                  <th className="px-6 py-4 font-medium">%Chg</th>
                  <th className="px-6 py-4 font-medium">EMA5</th>
                  <th className="px-6 py-4 font-medium">SMA20</th>
                  <th className="px-6 py-4 font-medium">BB_W(%)</th>
                  <th className="px-6 py-4 font-medium">RSI</th>
                  <th className="px-6 py-4 font-medium">Vol(M)</th>
                  <th className="px-6 py-4 font-medium">Signals / Notes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      <RefreshCw
                        size={24}
                        className="animate-spin mx-auto mb-3 opacity-50"
                      />
                      กำลังประมวลผลอินดิเคเตอร์เชิงลึก...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      ไม่มีหุ้นที่เข้าเงื่อนไขในขณะนี้
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-3 font-bold text-white flex items-center gap-2">
                        {row.symbol}
                        {row.isSqueeze && row.momentumIgnition && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-300">
                        ${row.currentPrice.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-3 font-mono ${row.pctChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {row.pctChange >= 0 ? "+" : ""}
                        {row.pctChange.toFixed(2)}%
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-400">
                        {row.ema5.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-400">
                        {row.sma20.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-3 font-mono font-medium ${row.bbWidthPct < 15 ? "text-blue-400" : "text-slate-400"}`}
                      >
                        {row.bbWidthPct.toFixed(1)}%
                      </td>
                      <td
                        className={`px-6 py-3 font-mono ${row.rsi > 70 ? "text-rose-400" : row.rsi < 30 ? "text-emerald-400" : row.rsi > 55 ? "text-amber-400" : "text-slate-400"}`}
                      >
                        {row.rsi.toFixed(1)}
                      </td>
                      <td className="px-6 py-3 font-mono text-slate-400">
                        {row.volM}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {row.isSqueeze && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                              (SQUEEZE)
                            </span>
                          )}
                          {row.crossSMA20 && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
                              (CROSS SMA20)
                            </span>
                          )}
                          {row.momentumIgnition && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 rounded">
                              (MOM CATCHER)
                            </span>
                          )}
                          {row.isTrend && !row.crossSMA20 && (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-700/50 text-slate-400 rounded">
                              (TREND)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

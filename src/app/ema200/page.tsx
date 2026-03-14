"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UNIQUE_SYMBOLS,
  STOCK_DETAILS,
  MAGNIFICENT_SEVEN,
  TIER_1_MEGA_TECH,
  TIER_1_AI_HARDWARE,
  TIER_1_AI_INFRASTRUCTURE,
  TIER_1_AI_SOFTWARE,
  TIER_1_GROWTH_TECH,
  TIER_1_ENERGY_RESOURCES,
  TIER_1_HEALTH_BIO,
  TIER_2_SPECULATIVE,
  ALPHA_PICKS_WATCHLIST,
  FINVIZ_WATCHLIST,
  AI_HIDDEN_GEMS,
} from "@/lib/stocks";

// Define the EMA data shape based on our new API
interface EMA200Data {
  symbol: string;
  technical: {
    currentPrice: number | null;
    ema200: number | null;
    distancePct: number | null;
    isNearEMA: boolean;
  };
  fundamental: {
    companyName: string | null;
    sector: string | null;
    industry: string | null;
    marketCap: number | null;
    beta: number | null;
    exchange: string | null;
  };
  extendedData?: {
    ceo: string | null;
    fullTimeEmployees: number | null;
  };
}

interface ScanResult {
  symbol: string;
  status: "pending" | "scanning" | "done" | "error" | "skipped";
  data: EMA200Data | null;
  error?: string;
}

export default function EMA200ScannerPage() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [apiSaved, setApiSaved] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Pipeline filter strictly enabled by default to save API calls
  const [strictMode, setStrictMode] = useState(true);

  // Stock selection state (array-based like patterns page)
  const [selectedSymbols, setSelectedSymbols] =
    useState<string[]>(UNIQUE_SYMBOLS);

  // Custom & Portfolio tickers (same as patterns page)
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // All symbols = predefined + custom
  const allSymbols = [...UNIQUE_SYMBOLS, ...customTickers];
  const filteredSymbols = allSymbols.filter((s) =>
    s.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const addCustomTicker = (ticker: string) => {
    const upper = ticker.toUpperCase().trim();
    if (!upper) return;
    if (!customTickers.includes(upper) && !UNIQUE_SYMBOLS.includes(upper)) {
      setCustomTickers((prev) => [...prev, upper]);
      setSelectedSymbols((prev) => [...prev, upper]);
      setScans((prev) => [
        ...prev,
        { symbol: upper, status: "pending", data: null },
      ]);
      setSearchTerm("");
    } else if (
      UNIQUE_SYMBOLS.includes(upper) &&
      !selectedSymbols.includes(upper)
    ) {
      setSelectedSymbols((prev) => [...prev, upper]);
      setSearchTerm("");
    }
  };

  const toggleSymbol = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol)
        ? prev.filter((t) => t !== symbol)
        : [...prev, symbol],
    );
  };

  const toggleGroup = (group: string[]) => {
    const allSelected = group.every((t) => selectedSymbols.includes(t));
    if (allSelected) {
      setSelectedSymbols((prev) => prev.filter((t) => !group.includes(t)));
    } else {
      setSelectedSymbols((prev) => Array.from(new Set([...prev, ...group])));
    }
  };

  useEffect(() => {
    setMounted(true);
    setScans(
      UNIQUE_SYMBOLS.map((symbol) => ({
        symbol,
        status: "pending",
        data: null,
      })),
    );

    // Auto-inject portfolio tickers (same as patterns page)
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

          const newTickers = pTickers.filter(
            (t) => !UNIQUE_SYMBOLS.includes(t),
          );
          if (newTickers.length > 0) {
            setCustomTickers((prev) =>
              Array.from(new Set([...prev, ...newTickers])),
            );
            setScans((prev) => {
              const existing = prev.map((s) => s.symbol);
              const toAdd = newTickers
                .filter((t) => !existing.includes(t))
                .map((t) => ({
                  symbol: t,
                  status: "pending" as const,
                  data: null,
                }));
              return [...prev, ...toAdd];
            });
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setProgress(0);
    setApiSaved(0);

    // Only scan selected symbols
    const targets = allSymbols.filter((s) => selectedSymbols.includes(s));

    // Reset status
    setScans(
      allSymbols.map((symbol) => ({
        symbol,
        status: targets.includes(symbol) ? "pending" : "skipped",
        data: null,
      })),
    );

    let completed = 0;
    let saved = 0;

    for (let i = 0; i < targets.length; i++) {
      const symbol = targets[i];

      // Update UI to show scanning
      setScans((prev) =>
        prev.map((s) =>
          s.symbol === symbol ? { ...s, status: "scanning" } : s,
        ),
      );

      try {
        // Pass strict parameter to backend for Fail-Fast logic
        const res = await fetch(
          `/api/ema200?symbol=${symbol}&strict=${strictMode}`,
        );
        if (!res.ok) throw new Error("API Error");
        const data = await res.json();

        // Backend returns status: "skipped" when it Fail-Fast'd
        const finalStatus: ScanResult["status"] =
          data.status === "skipped" ? "skipped" : "done";

        if (data.apiCallsSaved) {
          saved += data.apiCallsSaved;
          setApiSaved(saved);
        }

        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol
              ? {
                  symbol,
                  status: finalStatus,
                  data: finalStatus === "done" ? data : null,
                }
              : s,
          ),
        );
      } catch (err: any) {
        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol
              ? { ...s, status: "error", error: err.message }
              : s,
          ),
        );
      }

      completed++;
      setProgress((completed / targets.length) * 100);

      // Delay to respect free tier rate limits
      // Strict skips are fast (only 1 API call), full scans need 1.1s spacing for Finnhub
      if (i < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }

    setScanning(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-yellow-400";
    return "text-slate-500";
  };

  const formatNumber = (num: number | null, prefix = "", suffix = "") => {
    if (num === null || num === undefined) return "-";
    return `${prefix}${num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}${suffix}`;
  };

  const formatMarketCap = (num: number | null) => {
    if (!num) return "-";
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  // Filtered array for display
  const displayScans = scans
    .filter((s) => s.status === "done" && s.data) // only show successfully matched
    .sort((a, b) => {
      // Sort by closest distance to 0%
      const distA = Math.abs(a.data?.technical?.distancePct || 100);
      const distB = Math.abs(b.data?.technical?.distancePct || 100);
      return distA - distB;
    });

  const getDistanceColor = (dist: number | null) => {
    if (dist === null) return "text-slate-500";
    if (dist <= 2 && dist >= -1) return "text-emerald-400"; // Extremely close
    if (dist <= 5 && dist >= -3) return "text-blue-400"; // Near
    if (dist > 10) return "text-red-400"; // Far above
    return "text-slate-400";
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans pb-20">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-indigo-500/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🌊</span>
            <div>
              <h1 className="text-xl font-bold text-indigo-400 tracking-wide uppercase">
                EMA 200 Weekly Scanner
              </h1>
              <p className="text-slate-400 text-xs">
                Position Trading at the Long Term Support Level (Bounce / Breakdown)
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-sm font-medium">
            <Link
              href="/patterns"
              className="text-gray-400 hover:text-white transition"
            >
              📊 Technical Screener
            </Link>
            <Link
              href="/portfolio"
              className="text-gray-400 hover:text-white transition"
            >
              💼 Portfolio
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 space-y-8">
        {/* Banner */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6 flex gap-4">
          <div className="text-4xl">🐋</div>
          <div>
            <h2 className="text-white font-bold text-lg mb-2">
              The Wall: Weekly EMA 200 Scanner
            </h2>
            <p className="text-indigo-200/80 text-sm leading-relaxed max-w-4xl">
              ระบบสแกนหุ้นเพื่อหาจุดรับมีดระดับมหภาค (Macro Sweep) <br />
              <span className="text-emerald-400 font-bold">
                EMA 200 Weekly:
              </span>{" "}
              เส้นค่าเฉลี่ยนี้เปรียบเสมือน "กำแพงเมืองจีน" ของแนวโน้มระยะยาว (5 ปี) 
              <br/>หุ้นแข็งแกร่งมักจะไม่ร่วงทะลุโซนเส้นนี้และมีโอกาสเด้งกลับอย่างรุนแรง (V-Shape Recovery)
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={strictMode}
                  onChange={(e) => setStrictMode(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                />
                🚀 Fail-Fast Mode (ประหยัดกระสุน API)
              </label>
              <p className="text-xs text-slate-500 mt-2">
                * ระบบจะคำนวณระยะห่างระหว่างราคาปัจจุบัน กับ แกนกลาง EMA 200 Weekly ฟรีๆ → หากอยู่ห่างเกินไป (-5% ถึง +10%) จะ{" "}
                <span className="text-amber-400">ปัดตก (Skip)</span> ไม่ยิงไปดึงข้อมูล Fundamental จาก FMP (สงวนโควต้า API หลักแสนไว้)
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleScan}
                disabled={scanning || selectedSymbols.length === 0}
                className={`px-8 py-3 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all w-full min-w-[200px] ${
                  scanning || selectedSymbols.length === 0
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
                }`}
              >
                {scanning ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-slate-500 border-t-white rounded-full" />
                    Scanning {selectedSymbols.length} stocks...
                  </>
                ) : (
                  <>
                    <span>📡</span> Scan {selectedSymbols.length} Stocks
                  </>
                )}
              </button>

              {scanning && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* API savings counter */}
          {apiSaved > 0 && (
            <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <span className="text-emerald-400 font-bold">
                💰 Saved {apiSaved} API calls
              </span>
              <span className="text-emerald-300/60">via Fail-Fast mode</span>
            </div>
          )}

          {/* Stock Selector (Full Search System from Patterns Page) */}
          <div>
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="text-sm text-slate-400 hover:text-indigo-400 transition flex items-center gap-1"
            >
              <span>{showPicker ? "▼" : "▶"}</span>
              🎯 {showPicker ? "ซ่อน" : "เลือกหุ้นที่จะแสกน"} (
              {selectedSymbols.length}/{allSymbols.length} ตัว)
            </button>

            {showPicker && (
              <div className="mt-3 space-y-4">
                {/* Group Quick Select */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-slate-500 text-xs self-center mr-1">
                    Quick:
                  </span>
                  {portfolioTickers.length > 0 && (
                    <button
                      onClick={() => toggleGroup(portfolioTickers)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border border-white/10 transition ${
                        portfolioTickers.every((t) =>
                          selectedSymbols.includes(t),
                        )
                          ? "bg-yellow-600 text-white shadow-lg"
                          : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {portfolioTickers.every((t) =>
                        selectedSymbols.includes(t),
                      )
                        ? "✓"
                        : "+"}{" "}
                      My Portfolio 🌟
                    </button>
                  )}
                  {[
                    { label: "ALL", list: allSymbols, color: "bg-slate-600" },
                    {
                      label: "Magnificent 7",
                      list: MAGNIFICENT_SEVEN,
                      color: "bg-blue-600",
                    },
                    {
                      label: "AI Hardware",
                      list: TIER_1_AI_HARDWARE,
                      color: "bg-purple-600",
                    },
                    {
                      label: "AI Infra",
                      list: TIER_1_AI_INFRASTRUCTURE,
                      color: "bg-indigo-600",
                    },
                    {
                      label: "AI Software",
                      list: TIER_1_AI_SOFTWARE,
                      color: "bg-blue-600",
                    },
                    {
                      label: "Growth Tech",
                      list: TIER_1_GROWTH_TECH,
                      color: "bg-indigo-600",
                    },
                    {
                      label: "Energy",
                      list: TIER_1_ENERGY_RESOURCES,
                      color: "bg-amber-600",
                    },
                    {
                      label: "Healthcare",
                      list: TIER_1_HEALTH_BIO,
                      color: "bg-pink-600",
                    },
                    {
                      label: "Alpha Picks",
                      list: ALPHA_PICKS_WATCHLIST,
                      color: "bg-teal-600",
                    },
                    {
                      label: "Finviz",
                      list: FINVIZ_WATCHLIST,
                      color: "bg-emerald-600",
                    },
                    {
                      label: "Hidden Gems 💎",
                      list: AI_HIDDEN_GEMS,
                      color: "bg-amber-500",
                    },
                    {
                      label: "Speculative",
                      list: TIER_2_SPECULATIVE,
                      color: "bg-red-600",
                    },
                  ].map((group) => {
                    const isFullySelected = group.list.every((t) =>
                      selectedSymbols.includes(t),
                    );
                    return (
                      <button
                        key={group.label}
                        onClick={() => toggleGroup(group.list)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border border-white/10 transition ${
                          isFullySelected
                            ? `${group.color} text-white shadow-lg`
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {isFullySelected ? "✓" : "+"} {group.label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setSelectedSymbols([])}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-red-400 border border-red-900/30 hover:bg-red-900/20 transition ml-auto"
                  >
                    Clear All ❌
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="พิมพ์ชื่อหุ้น เช่น TSLA, PLTR หรือเพิ่มตัวใหม่..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchTerm.trim()) {
                        addCustomTicker(searchTerm);
                      }
                    }}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                {/* Stock Grid */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-3 max-h-[300px] overflow-y-auto">
                  <div className="flex flex-wrap gap-1.5">
                    {filteredSymbols.map((sym) => (
                      <button
                        key={sym}
                        onClick={() => toggleSymbol(sym)}
                        disabled={scanning}
                        title={STOCK_DETAILS[sym] || sym}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition ${
                          selectedSymbols.includes(sym)
                            ? customTickers.includes(sym)
                              ? "bg-amber-600/20 border-amber-500/40 text-amber-300"
                              : "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                            : "bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400"
                        } ${scanning ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        {customTickers.includes(sym) ? `⭐${sym}` : sym}
                      </button>
                    ))}
                    {filteredSymbols.length === 0 && searchTerm && (
                      <div className="w-full text-center py-6">
                        <p className="text-slate-500 mb-3">
                          ไม่พบ "{searchTerm}" ในรายการ
                        </p>
                        {/^[A-Za-z.-]+$/.test(searchTerm) && (
                          <button
                            onClick={() => addCustomTicker(searchTerm)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 mx-auto"
                          >
                            <span>➕</span> เพิ่มหุ้นใหม่:{" "}
                            <span className="font-bold">
                              {searchTerm.toUpperCase()}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Real-time Loading Status (Visible only during scan) */}
        {scanning && (
          <div className="flex gap-2 flex-wrap text-xs text-slate-500">
            {scans.map((s) => {
              if (s.status === "pending") return null;
              let icon = "⏳";
              if (s.status === "done") icon = "✅";
              if (s.status === "skipped") icon = "⏭️";
              if (s.status === "error") icon = "❌";
              return (
                <span
                  key={s.symbol}
                  className="bg-slate-900 px-2 py-1 rounded border border-slate-800"
                >
                  {s.symbol} {icon}
                </span>
              );
            })}
          </div>
        )}

        {/* Results Grid */}
        {!scanning && displayScans.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayScans.map((scan) => {
              const data = scan.data!;
              const isExpanded = expandedCards.has(data.symbol);

              const toggleExpand = () => {
                setExpandedCards((prev) => {
                  const next = new Set(prev);
                  if (next.has(data.symbol)) next.delete(data.symbol);
                  else next.add(data.symbol);
                  return next;
                });
              };

              return (
                <div
                  key={data.symbol}
                  className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 hover:border-indigo-500/50 transition-colors shadow-xl flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-white flex items-center gap-2">
                        {data.symbol}
                        {data.technical.distancePct !== null && Math.abs(data.technical.distancePct) < 2 && (
                          <span
                            className="text-emerald-400 text-lg"
                            title="On the Line!"
                          >
                            🌊
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {data.fundamental.companyName ||
                          STOCK_DETAILS[data.symbol] ||
                          "Stock"}
                      </p>
                      {data.fundamental.sector && (
                        <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                          {data.fundamental.sector}
                          {data.fundamental.industry
                            ? ` · ${data.fundamental.industry}`
                            : ""}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-2xl font-black ${getDistanceColor(data.technical.distancePct)}`}
                      >
                        {data.technical.distancePct !== null ? `${data.technical.distancePct > 0 ? "+" : ""}${data.technical.distancePct.toFixed(2)}%` : "N/A"}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                        DIST TO EMA200
                      </div>
                    </div>
                  </div>

                  {/* 3 Pillars Grid (Adapted for EMA) */}
                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    {/* EMA Value */}
                    <div
                      className={`p-3 rounded-xl border ${Math.abs(data.technical.distancePct || 100) < 5 ? "bg-blue-900/20 border-blue-500/30" : "bg-slate-800/50 border-slate-700"} flex flex-col items-center justify-center text-center`}
                    >
                      <span className="text-xl mb-1">📐</span>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        EMA 200 (W)
                      </span>
                      <span
                        className={`font-bold ${Math.abs(data.technical.distancePct || 100) < 5 ? "text-blue-400" : "text-white"}`}
                      >
                        {formatNumber(data.technical.ema200, "$")}
                      </span>
                    </div>

                    {/* Market Cap */}
                    <div
                      className="p-3 rounded-xl border bg-slate-800/50 border-slate-700 flex flex-col items-center justify-center text-center"
                    >
                      <span className="text-xl mb-1">🏛️</span>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Market Cap
                      </span>
                      <span className="font-bold text-white">
                        {formatMarketCap(data.fundamental.marketCap)}
                      </span>
                    </div>

                    {/* Beta */}
                    <div
                      className="p-3 rounded-xl border bg-slate-800/50 border-slate-700 flex flex-col items-center justify-center text-center"
                    >
                      <span className="text-xl mb-1">⚡</span>
                      <span className="text-[10px] text-slate-400 block mb-1">
                        Beta (Risk)
                      </span>
                      <span className="font-bold text-white">
                        {formatNumber(data.fundamental.beta)}
                      </span>
                    </div>
                  </div>

                  {/* Details block */}
                  <div className="mt-4 pt-4 border-t border-slate-800/50 grid grid-cols-2 gap-y-2 text-xs items-center">
                    <div className="text-slate-500">Current Price:</div>
                    <div className="text-right text-slate-300 font-medium">
                      {formatNumber(data.technical.currentPrice, "$")}
                    </div>

                    <div className="text-slate-500">Weekly Support:</div>
                    <div className="text-right text-indigo-400 font-bold">
                      {formatNumber(data.technical.ema200, "$")}
                    </div>
                  </div>

                  {/* View More Button */}
                  <button
                    onClick={toggleExpand}
                    className="mt-4 pt-3 w-full border-t border-slate-800/50 text-indigo-400 hover:text-indigo-300 text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                  >
                    {isExpanded ? "Hide Details 🔼" : "View More Data 🔽"}
                  </button>

                  {/* Expanded Data Panel */}
                  {isExpanded && data.extendedData && (
                    <div className="mt-4 pt-4 border-t border-slate-800/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Company Info */}
                      <div>
                        <h4 className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 font-bold">
                          Company Profile
                        </h4>
                        <div className="grid grid-cols-2 gap-y-2 text-xs">
                          <div className="text-slate-500">Exchange:</div>
                          <div className="text-right text-slate-300">
                            {data.fundamental.exchange || "-"}
                          </div>

                          <div className="text-slate-500">CEO:</div>
                          <div
                            className="text-right text-slate-300 line-clamp-1"
                            title={data.extendedData.ceo || ""}
                          >
                            {data.extendedData.ceo || "-"}
                          </div>

                          <div className="text-slate-500">Employees:</div>
                          <div className="text-right text-slate-300">
                            {data.extendedData.fullTimeEmployees?.toLocaleString() ||
                              "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!scanning &&
          displayScans.length === 0 &&
          scans.some((s) => s.status === "done" || s.status === "skipped") && (
            <div className="text-center py-20 bg-slate-900/30 rounded-2xl border border-slate-800/50">
              <div className="text-5xl mb-4 opacity-50">🌊</div>
              <h3 className="text-xl text-slate-300 font-bold mb-2">
                No EMA 200 Targets Found
              </h3>
              <p className="text-slate-500 max-w-md mx-auto text-sm">
                We scanned the watchlist but none of the stocks currently meet
                the criteria (distance between -5% and +10% from Weekly EMA 200).
              </p>
            </div>
          )}
      </main>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  UNIQUE_SYMBOLS,
  MAGNIFICENT_SEVEN,
  TIER_1_MEGA_TECH,
  TIER_1_AI_CLOUD,
  TIER_1_GROWTH_TECH,
  TIER_1_ENERGY_RESOURCES,
  TIER_1_HEALTH_BIO,
  TIER_2_SPECULATIVE,
  ALPHA_PICKS_WATCHLIST,
  FINVIZ_WATCHLIST,
  STOCK_DETAILS,
} from "@/lib/stocks";
import PatternCard from "@/components/PatternCard";
import { StockScan } from "@/types/stock";

// Helper Component for Checkbox
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
    className={`flex items-center space-x-2 text-xs p-2 rounded cursor-pointer transition-all group relative ${
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

export default function TrianglePatternsPage() {
  const [scans, setScans] = useState<StockScan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Stock Selection State
  const [selectedTickers, setSelectedTickers] =
    useState<string[]>(UNIQUE_SYMBOLS);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customTickers, setCustomTickers] = useState<string[]>([]);

  // Debug Data State
  const [debugVisible, setDebugVisible] = useState<Record<string, boolean>>({});
  const toggleDebug = (symbol: string) => {
    setDebugVisible((prev) => ({
      ...prev,
      [symbol]: !prev[symbol],
    }));
  };

  // Sort State
  const [sortBy, setSortBy] = useState<
    "distance" | "convergence" | "confidence"
  >("distance");

  // Confluence Filter State
  const [filterSMA, setFilterSMA] = useState(false);
  const [filterMACD, setFilterMACD] = useState(false);
  const [filterRSI, setFilterRSI] = useState(false);

  useEffect(() => {
    setMounted(true);
    const initialScans: StockScan[] = UNIQUE_SYMBOLS.map((symbol) => ({
      symbol,
      data: null,
      status: "pending",
    }));
    setScans(initialScans);
  }, []);

  const addCustomTicker = (ticker: string) => {
    const upper = ticker.toUpperCase();
    if (!customTickers.includes(upper) && !UNIQUE_SYMBOLS.includes(upper)) {
      setCustomTickers((prev) => [...prev, upper]);
      setSelectedTickers((prev) => [...prev, upper]);
      setScans((prev) => [
        ...prev,
        { symbol: upper, data: null, status: "pending" },
      ]);
      setSearchTerm("");
    } else if (
      UNIQUE_SYMBOLS.includes(upper) &&
      !selectedTickers.includes(upper)
    ) {
      setSelectedTickers((prev) => [...prev, upper]);
      setSearchTerm("");
    }
  };

  const filteredSymbols = [...UNIQUE_SYMBOLS, ...customTickers].filter((s) =>
    s.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleScan = async () => {
    if (scanning) return;
    setScanning(true);
    setScanProgress(0);

    setScans((prev) =>
      prev.map((s) =>
        selectedTickers.includes(s.symbol)
          ? { ...s, status: "loading", data: null }
          : s,
      ),
    );

    const targets = selectedTickers;
    let completed = 0;

    for (let i = 0; i < targets.length; i++) {
      const symbol = targets[i];

      try {
        const response = await fetch(`/api/patterns?symbol=${symbol}`);
        const rawData = await response.json();

        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol
              ? {
                  symbol,
                  data: rawData.currentPrice > 0 ? rawData : null,
                  status: "done",
                }
              : s,
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

      if (i < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setScanning(false);
  };

  // Filter only stocks that have valid patterns
  const baseScans = scans
    .filter((s) => s.status === "done" && s.data)
    .filter((s) => {
      const hasPattern = s.data?.patterns.some((p) =>
        ["Triangle", "Bull Flag", "VCP", "Cup", "Double Bottom"].some((name) =>
          p.name.includes(name),
        ),
      );
      return hasPattern;
    });

  // Apply Confluence Filters
  const validScans = baseScans
    .filter((s) => {
      const data = s.data!;
      let pass = true;
      if (filterSMA) {
        pass = pass && data.currentPrice > (data.trend?.sma50 || 0);
      }
      if (filterMACD) {
        pass = pass && data.advancedIndicators?.macd?.trend === "bullish";
      }
      if (filterRSI) {
        pass = pass && (data.metrics?.rsi || 50) < 70;
      }
      return pass;
    })
    .sort((a, b) => {
      // Base Sort by distance to breakout (closest first), actual custom sort is applied later in render
      const aPat = a.data?.patterns.find((p) =>
        ["Triangle", "Bull Flag", "VCP", "Cup", "Double Bottom"].some((name) =>
          p.name.includes(name),
        ),
      );
      const bPat = b.data?.patterns.find((p) =>
        ["Triangle", "Bull Flag", "VCP", "Cup", "Double Bottom"].some((name) =>
          p.name.includes(name),
        ),
      );
      const aDist = Math.abs(aPat?.distanceToBreakout || 100);
      const bDist = Math.abs(bPat?.distanceToBreakout || 100);
      return aDist - bDist;
    });

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-blue-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📐</span>
              <div>
                <h1 className="text-xl font-bold text-blue-400">
                  ADVANCED CHART PATTERNS
                </h1>
                <p className="text-gray-400 text-xs">
                  สแกนหาทรงกราฟแม่นยำสูง (Triangles, Bull Flag, VCP, Cup &
                  Handle, Double Bottom)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/patterns"
                className="text-gray-400 hover:text-white transition-colors"
              >
                📊 Screener
              </Link>
              <Link
                href="/search"
                className="text-gray-400 hover:text-white transition-colors"
              >
                🔍 Search
              </Link>
              <Link
                href="/"
                className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1 rounded-full"
              >
                ← กลับ
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Helper Banner */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex gap-4 text-sm text-blue-200">
          <span className="text-2xl mt-1">💡</span>
          <div>
            <p className="font-bold text-white mb-1">
              ความลับของสามเหลี่ยม (Triangle Patterns)
            </p>
            <p className="text-gray-300">
              มันคือช่วงที่ราคากำลัง "บีบอัดสปริงเพื่อสะสมพลัง"
              ก่อนที่จะระเบิดพุ่งแรวๆ หน้าที่ของคุณคือ
              <span className="text-white font-bold ml-1">
                ตั้ง Alert ไว้ที่ขอบบนและล่าง
              </span>
              ถ้าราคาทะลุฝั่งไหน ให้ Action ตามฝั่งนั้น!
            </p>
          </div>
        </div>

        {/* Stock Selector */}
        <div className="mb-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              🎯 Select Stocks to Scan
              <span className="text-sm text-gray-500 font-normal">
                ({selectedTickers.length}/
                {UNIQUE_SYMBOLS.length + customTickers.length})
              </span>
            </h2>
            <button
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isSelectorOpen ? "Collapse 🔼" : "Expand 🔽"}
            </button>
          </div>

          {isSelectorOpen && (
            <>
              <div className="flex flex-col gap-4 mb-6">
                {/* 1. Group Quick Select */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-gray-400 text-xs self-center mr-2">
                    Quick Select:
                  </span>
                  {[
                    {
                      label: "ALL LIST",
                      list: UNIQUE_SYMBOLS,
                      color: "bg-gray-600",
                    },
                    {
                      label: "ALL LIST + Custom",
                      list: [...UNIQUE_SYMBOLS, ...customTickers],
                      color: "bg-gray-500",
                    },
                    {
                      label: "Magnificent 7",
                      list: MAGNIFICENT_SEVEN,
                      color: "bg-blue-600",
                    },
                    {
                      label: "Tech & AI",
                      list: [...TIER_1_MEGA_TECH, ...TIER_1_AI_CLOUD],
                      color: "bg-purple-600",
                    },
                    {
                      label: "Growth",
                      list: TIER_1_GROWTH_TECH,
                      color: "bg-pink-600",
                    },
                    {
                      label: "Alpha Picks",
                      list: ALPHA_PICKS_WATCHLIST,
                      color: "bg-teal-600",
                    },
                    {
                      label: "Finviz Watchlist",
                      list: FINVIZ_WATCHLIST,
                      color: "bg-emerald-600",
                    },
                  ].map((group) => {
                    const isFullySelected =
                      group.list.length > 0 &&
                      group.list.every((t) => selectedTickers.includes(t));
                    return (
                      <button
                        key={group.label}
                        onClick={() => {
                          if (isFullySelected) {
                            setSelectedTickers(
                              selectedTickers.filter(
                                (t) => !group.list.includes(t),
                              ),
                            );
                          } else {
                            setSelectedTickers(
                              Array.from(
                                new Set([...selectedTickers, ...group.list]),
                              ),
                            );
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border border-white/10 ${
                          isFullySelected
                            ? `${group.color} text-white shadow-lg`
                            : "bg-slate-800 text-gray-400 hover:bg-slate-700"
                        }`}
                      >
                        {isFullySelected ? "✓" : "+"} {group.label}
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

                {/* 1.5 Custom Ticker Input (Bulk) */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                  <h3 className="text-white text-sm font-bold mb-2">
                    ➕ ใส่รายชื่อหุ้นเอง (คั่นด้วยลูกน้ำ)
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. BTC-USD, SET, PTT.BK"
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-lg py-2 px-3 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const value = e.currentTarget.value;
                          if (value.trim()) {
                            const newTickers = value
                              .split(",")
                              .map((t) => t.trim().toUpperCase())
                              .filter((t) => t);
                            newTickers.forEach(addCustomTicker);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      onClick={(e) => {
                        const input = e.currentTarget
                          .previousElementSibling as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const newTickers = input.value
                            .split(",")
                            .map((t) => t.trim().toUpperCase())
                            .filter((t) => t);
                          newTickers.forEach(addCustomTicker);
                          input.value = "";
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* 2. Search & Filter Actions */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Type to filter stocks (e.g. TSLA, NVDA)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>

              {/* 3. Stock Grid */}
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {searchTerm ? (
                  // Search Mode: Flat List
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
                    {filteredSymbols.length === 0 && (
                      <div className="col-span-full text-center py-8">
                        <p className="text-gray-500 mb-4">
                          No stocks found matching "{searchTerm}"
                        </p>
                        {searchTerm.length >= 1 &&
                          /^[A-Za-z]+$/.test(searchTerm) && (
                            <button
                              onClick={() => addCustomTicker(searchTerm)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                            >
                              <span>➕</span> Add Custom Ticker:{" "}
                              <span className="font-bold">
                                {searchTerm.toUpperCase()}
                              </span>
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  // Default Mode: Grouped List
                  <div className="space-y-6">
                    {[
                      { title: "Magnificent 7 👑", list: MAGNIFICENT_SEVEN },
                      {
                        title: "Mega Tech & Leaders 🏢",
                        list: TIER_1_MEGA_TECH,
                      },
                      {
                        title: "AI, Cloud & Cyber Security 🤖",
                        list: TIER_1_AI_CLOUD,
                      },
                      {
                        title: "Growth Tech (Chips/Space/EV) 🚀",
                        list: TIER_1_GROWTH_TECH,
                      },
                      {
                        title: "Energy & Resources (Nuclear/Minerals) ⚡",
                        list: TIER_1_ENERGY_RESOURCES,
                      },
                      {
                        title: "Healthcare & Biotech 🧬",
                        list: TIER_1_HEALTH_BIO,
                      },
                      {
                        title: "Alpha Picks (Strong Buy) 🌟",
                        list: ALPHA_PICKS_WATCHLIST,
                      },
                      {
                        title: "Finviz Watchlist 🟢",
                        list: FINVIZ_WATCHLIST,
                      },
                      {
                        title: "Speculative & High Risk 🎢",
                        list: TIER_2_SPECULATIVE,
                      },
                    ].map((group) => (
                      <div key={group.title}>
                        <h3 className="text-gray-400 text-xs font-bold uppercase mb-2 ml-1 tracking-wider">
                          {group.title}
                        </h3>
                        <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                          {group.list.map((ticker) => (
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
                                  setSelectedTickers([
                                    ...selectedTickers,
                                    ticker,
                                  ]);
                                }
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={handleScan}
              disabled={scanning || selectedTickers.length === 0}
              className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg flex items-center gap-2 transition-all ${
                scanning
                  ? "bg-slate-700 text-gray-400 cursor-not-allowed"
                  : selectedTickers.length === 0
                    ? "bg-slate-800 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-blue-500/25 active:scale-95"
              }`}
            >
              {scanning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Scanning {selectedTickers.length} Stocks...{" "}
                  {Math.round(scanProgress)}%
                </>
              ) : (
                <>
                  <span>🔍</span>
                  Scan Advanced Patterns
                </>
              )}
            </button>
          </div>
          {scanning && (
            <div className="mt-4 w-full bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-2 transition-all duration-300"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Results */}
        {!scanning &&
          validScans.length > 0 &&
          (() => {
            // --- Helpers for grouping & sorting ---
            const getPattern = (s: StockScan) =>
              s.data?.patterns.find((p) =>
                ["Triangle", "Bull Flag", "VCP", "Cup", "Double Bottom"].some(
                  (name) => p.name.includes(name),
                ),
              );

            const getDistance = (s: StockScan) => {
              const pat = getPattern(s);
              if (!pat?.breakoutLevel || !s.data?.currentPrice) return 999;
              return (
                ((pat.breakoutLevel - s.data.currentPrice) /
                  s.data.currentPrice) *
                100
              );
            };

            const getConvergence = (s: StockScan) => {
              const pat = getPattern(s);
              return parseFloat(
                pat?.debugData?.convergenceRatio ||
                  pat?.debugData?.depth3 ||
                  pat?.debugData?.lowDiff ||
                  "999",
              );
            };

            const getConfidence = (s: StockScan) => {
              const pat = getPattern(s);
              return pat?.confidence || 0;
            };

            // Sort
            const sorted = [...validScans].sort((a, b) => {
              if (sortBy === "distance") return getDistance(a) - getDistance(b);
              if (sortBy === "convergence")
                return getConvergence(a) - getConvergence(b);
              return getConfidence(b) - getConfidence(a);
            });

            // Group
            const ascending = sorted.filter(
              (s) => getPattern(s)?.name === "Ascending Triangle",
            );
            const symmetrical = sorted.filter(
              (s) => getPattern(s)?.name === "Symmetrical Triangle",
            );
            const descending = sorted.filter(
              (s) => getPattern(s)?.name === "Descending Triangle",
            );

            const bullFlags = sorted.filter((s) =>
              getPattern(s)?.name.includes("Bull Flag"),
            );
            const doubleBottoms = sorted.filter((s) =>
              getPattern(s)?.name.includes("Double Bottom"),
            );
            const vcps = sorted.filter((s) =>
              getPattern(s)?.name.includes("VCP"),
            );
            const cups = sorted.filter((s) =>
              getPattern(s)?.name.includes("Cup"),
            );

            const groups = [
              { label: "🚩 Bull Flag", color: "pink", items: bullFlags },
              {
                label: "📉 VCP (Volatility Contraction)",
                color: "purple",
                items: vcps,
              },
              { label: "☕ Cup and Handle", color: "orange", items: cups },
              {
                label: "بلی Double Bottom",
                color: "teal",
                items: doubleBottoms,
              },
              {
                label: "📈 Ascending Triangle",
                color: "green",
                items: ascending,
              },
              {
                label: "⚖️ Symmetrical Triangle",
                color: "yellow",
                items: symmetrical,
              },
              {
                label: "📉 Descending Triangle",
                color: "red",
                items: descending,
              },
            ].filter((g) => g.items.length > 0);

            return (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    🚨 พบ {validScans.length} หุ้น
                  </h2>
                  {ascending.length > 0 && (
                    <span className="bg-green-900/40 text-green-400 border border-green-500/40 px-3 py-1 rounded-full text-xs font-bold">
                      📈 Ascending {ascending.length}
                    </span>
                  )}
                  {symmetrical.length > 0 && (
                    <span className="bg-yellow-900/40 text-yellow-400 border border-yellow-500/40 px-3 py-1 rounded-full text-xs font-bold">
                      ⚖️ Symmetrical {symmetrical.length}
                    </span>
                  )}
                  {descending.length > 0 && (
                    <span className="bg-red-900/40 text-red-400 border border-red-500/40 px-3 py-1 rounded-full text-xs font-bold">
                      📉 Descending {descending.length}
                    </span>
                  )}
                  {bullFlags.length > 0 && (
                    <span className="bg-pink-900/40 text-pink-400 border border-pink-500/40 px-3 py-1 rounded-full text-xs font-bold">
                      🚩 Bull Flag {bullFlags.length}
                    </span>
                  )}
                  {vcps.length > 0 && (
                    <span className="bg-purple-900/40 text-purple-400 border border-purple-500/40 px-3 py-1 rounded-full text-xs font-bold">
                      📉 VCP {vcps.length}
                    </span>
                  )}
                  {cups.length > 0 && (
                    <span className="bg-orange-900/40 text-orange-400 border border-orange-500/40 px-3 py-1 rounded-full text-xs font-bold">
                      ☕ Cup&Handle {cups.length}
                    </span>
                  )}
                  {doubleBottoms.length > 0 && (
                    <span className="bg-teal-900/40 text-teal-400 border border-teal-500/40 px-3 py-1 rounded-full text-xs font-bold">
                      بلی Double Bottom {doubleBottoms.length}
                    </span>
                  )}
                </div>

                {/* Confluence Filters */}
                <div className="flex flex-col gap-2 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    🎯 ความแม่นยำ (Confluence Filters)
                    <span className="text-xs text-gray-400 font-normal">
                      กรองเฉพาะตัวที่มีสัญญาณหนุน
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <button
                      onClick={() => setFilterSMA(!filterSMA)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                        filterSMA
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                          : "bg-slate-800 text-gray-400 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {filterSMA ? "🟢" : "⚪"} ยืนเหนือเส้น 50 วัน (Uptrend)
                    </button>
                    <button
                      onClick={() => setFilterMACD(!filterMACD)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                        filterMACD
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                          : "bg-slate-800 text-gray-400 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {filterMACD ? "🟢" : "⚪"} MACD ตัดขึ้น (Momentum)
                    </button>
                    <button
                      onClick={() => setFilterRSI(!filterRSI)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${
                        filterRSI
                          ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                          : "bg-slate-800 text-gray-400 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {filterRSI ? "🟢" : "⚪"} RSI &lt; 70 (มีพื้นที่วิ่ง)
                    </button>
                  </div>
                </div>

                {/* Sort Toolbar */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-bold">จัดเรียง:</span>
                  {[
                    { key: "distance" as const, label: "🎯 ใกล้ Breakout สุด" },
                    { key: "convergence" as const, label: "📐 บีบแคบสุด" },
                    { key: "confidence" as const, label: "⭐ มั่นใจสุด" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      className={`px-3 py-1.5 rounded-lg border transition-all ${
                        sortBy === opt.key
                          ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/25"
                          : "bg-slate-800 text-gray-400 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Grouped Sections */}
                {groups.map((group) => (
                  <div key={group.label}>
                    <h3
                      className={`text-lg font-bold mb-4 pb-2 border-b border-slate-700/50 text-${group.color}-400`}
                    >
                      {group.label} ({group.items.length})
                    </h3>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                      {group.items.map((s) => {
                        const pat = getPattern(s);
                        const dist = getDistance(s);

                        // Helper check for High Probability Badge
                        const isHighProb =
                          s.data &&
                          s.data.currentPrice > (s.data.trend?.sma50 || 0) &&
                          s.data.advancedIndicators?.macd?.trend ===
                            "bullish" &&
                          (s.data.metrics?.rsi || 50) < 70;

                        return (
                          <div
                            key={s.symbol}
                            className="bg-slate-800/80 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl flex flex-col relative"
                          >
                            {/* Badge */}
                            {isHighProb && (
                              <div className="absolute top-0 right-0 bg-yellow-500 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg shadow-md z-10 flex items-center gap-1">
                                <span>⭐</span> High Probability
                              </div>
                            )}

                            {/* Header */}
                            <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/50">
                              <div>
                                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                                  {s.symbol}
                                  {pat && (
                                    <span
                                      className={`text-xs px-2 py-1 rounded border ${
                                        pat.signal === "bullish"
                                          ? "bg-green-900/40 text-green-400 border-green-500/50"
                                          : pat.signal === "bearish"
                                            ? "bg-red-900/40 text-red-400 border-red-500/50"
                                            : "bg-gray-800 text-gray-400 border-gray-600"
                                      }`}
                                    >
                                      {pat?.name}
                                    </span>
                                  )}
                                  {pat?.debugData && (
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleDebug(s.symbol);
                                      }}
                                      className="text-xs bg-slate-800 hover:bg-slate-700 text-gray-400 px-3 py-1.5 rounded border border-slate-600 transition-colors ml-auto flex items-center gap-1"
                                    >
                                      🧮{" "}
                                      {debugVisible[s.symbol]
                                        ? "ซ่อนสูตร"
                                        : "ดูสูตรคำนวณ"}
                                    </button>
                                  )}
                                </h3>
                                {pat && (
                                  <p className="text-sm text-gray-400 mt-1">
                                    {pat.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-white">
                                  ${s.data?.currentPrice?.toFixed(2)}
                                </p>
                                <p
                                  className={`text-sm font-bold ${s.data?.priceChange && s.data.priceChange > 0 ? "text-green-400" : "text-red-400"}`}
                                >
                                  {s.data?.priceChange && s.data.priceChange > 0
                                    ? "+"
                                    : ""}
                                  {s.data?.priceChangePercent?.toFixed(2)}%
                                </p>
                                {/* Distance to Breakout Badge */}
                                {dist < 999 && (
                                  <span
                                    className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      dist <= 5
                                        ? "bg-orange-500/30 text-orange-300 border border-orange-500/50 animate-pulse"
                                        : dist <= 10
                                          ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/40"
                                          : "bg-slate-700 text-gray-400 border border-slate-600"
                                    }`}
                                  >
                                    {dist <= 5
                                      ? "🔥"
                                      : dist <= 10
                                        ? "⏳"
                                        : "📏"}{" "}
                                    {dist.toFixed(1)}% to Breakout
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Debug Data Panel */}
                            {debugVisible[s.symbol] && pat?.debugData && (
                              <div className="p-4 bg-slate-950 border-b border-slate-700/50 text-left">
                                <p className="text-sm font-bold text-blue-400 mb-2">
                                  🧮 ค่าที่ใช้ประมวลผล (Internal Logic)
                                </p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                  <div className="bg-slate-900 p-2 rounded border border-slate-700/50">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                                      Entry
                                    </div>
                                    <div className="font-bold text-white text-xs">
                                      {pat?.entryZone?.low.toFixed(2)} -{" "}
                                      {pat?.entryZone?.high.toFixed(2)}
                                    </div>
                                  </div>
                                  <div className="bg-slate-900 p-2 rounded border border-slate-700/50">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wide">
                                      Target
                                    </div>
                                    <div className="font-bold text-green-400 text-xs">
                                      $ {pat?.targetPrice?.toFixed(2)}{" "}
                                      <span className="text-[10px] font-normal text-green-500/50">
                                        (
                                        {(
                                          ((pat?.targetPrice || 0) /
                                            s.data!.currentPrice -
                                            1) *
                                          100
                                        ).toFixed(1)}
                                        %)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-300 font-mono space-y-1 grid grid-cols-2 gap-x-4 mt-4">
                                  <li>
                                    <span className="text-gray-500">
                                      ยอดอดีต (p1):
                                    </span>{" "}
                                    ${pat.debugData.p1?.price}
                                  </li>
                                  <li>
                                    <span className="text-gray-500">
                                      ยอดล่าสุด (p2):
                                    </span>{" "}
                                    ${pat.debugData.p2?.price}
                                  </li>
                                  <li>
                                    <span className="text-gray-500">
                                      ฐานอดีต (v1):
                                    </span>{" "}
                                    ${pat.debugData.v1?.price}
                                  </li>
                                  <li>
                                    <span className="text-gray-500">
                                      ฐานล่าสุด (v2):
                                    </span>{" "}
                                    ${pat.debugData.v2?.price}
                                  </li>
                                  <li className="col-span-2 my-2 border-t border-slate-800 pt-2">
                                    <span className="text-gray-500 block">
                                      สมการความชันแนวต้าน (Peak Slope):
                                    </span>
                                    <span className="text-slate-400 ml-2">
                                      {pat.debugData.mathPeakSlope || "-"}
                                    </span>
                                  </li>
                                  <li className="col-span-2">
                                    <span className="text-gray-500 block">
                                      % ความชันแนวต้านต่อวัน:
                                    </span>
                                    <span
                                      className={`ml-2 ${
                                        pat.debugData.isResistanceFlat
                                          ? "text-green-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      {pat.debugData.mathNormPeakSlope || "-"}
                                      <span className="text-gray-500 ml-1">
                                        (เกณฑ์ความแบน: &lt;{" "}
                                        {pat.debugData.thresholdFlat})
                                      </span>
                                    </span>
                                    <span className="ml-2">
                                      {pat.debugData.isResistanceFlat
                                        ? "✅ ต้านแข็ง"
                                        : "❌ ต้านไม่แข็ง"}
                                    </span>
                                  </li>
                                  <li className="col-span-2 my-2 border-t border-slate-800 pt-2">
                                    <span className="text-gray-500 block">
                                      สมการความชันแนวรับ (Valley Slope):
                                    </span>
                                    <span className="text-slate-400 ml-2">
                                      {pat.debugData.mathValleySlope || "-"}
                                    </span>
                                  </li>
                                  <li className="col-span-2">
                                    <span className="text-gray-500 block">
                                      % ความชันแนวรับต่อวัน:
                                    </span>
                                    <span
                                      className={`ml-2 ${
                                        pat.debugData.isSupportRising
                                          ? "text-green-400"
                                          : "text-yellow-400"
                                      }`}
                                    >
                                      {pat?.debugData?.mathNormValleySlope ||
                                        "-"}
                                      <span className="text-gray-500 ml-1">
                                        (เกณฑ์ความชัน: &gt;{" "}
                                        {pat?.debugData?.thresholdTrending})
                                      </span>
                                    </span>
                                    <span className="ml-2">
                                      {pat?.debugData?.isSupportRising
                                        ? "✅ ฐานยก (แรงซื้อหนุน)"
                                        : "❌ ฐานไม่ยก"}
                                    </span>
                                  </li>
                                  <li className="col-span-2">
                                    <span className="text-gray-500 block">
                                      สมการการบีบแคบลง (Convergence Ratio):
                                    </span>
                                    <span className="text-slate-400 ml-2">
                                      {pat?.debugData?.mathConvergence || "-"}
                                    </span>
                                    <span className="ml-2">
                                      {pat?.debugData?.isConverging
                                        ? "✅ บีบแคบลง (< 0.85)"
                                        : "❌ ยังไม่บีบ"}{" "}
                                      (Ratio: {pat?.debugData?.convergenceRatio}
                                      )
                                    </span>
                                  </li>
                                  <li className="col-span-2 border-t border-slate-800 pt-2 mt-2">
                                    <span className="text-gray-500 block">
                                      สมการวอลุ่มหดตัว (Volume Drying Up):
                                    </span>
                                    <span className="text-slate-400 ml-2">
                                      {pat?.debugData?.mathVolume || "-"}
                                    </span>
                                    <span className="ml-2">
                                      {pat?.debugData?.isVolumeDryingUp
                                        ? "✅ วอลุ่มหดตัว"
                                        : "❌ วอลุ่มไม่ลดลง"}
                                    </span>
                                  </li>
                                </ul>
                                {/* Raw Data Dump for transparency */}
                                <pre className="mt-4 p-3 bg-slate-900 rounded border border-slate-700 text-slate-400 overflow-x-auto text-xs font-mono">
                                  {JSON.stringify(pat?.debugData, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* TradingView Chart Frame */}
                            <div className="h-[450px] w-full bg-slate-900 relative">
                              <iframe
                                src={`https://s.tradingview.com/widgetembed/?symbol=${s.symbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FBangkok&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en`}
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                allowFullScreen
                              ></iframe>
                            </div>

                            {/* Footer Stats - Only show if Breakout / Target data exists for the detected pattern */}
                            {pat?.breakoutLevel && (
                              <div className="p-4 bg-slate-900/80 grid grid-cols-3 gap-4 text-center border-t border-slate-700/50 mt-auto">
                                <div>
                                  <p className="text-gray-500 text-xs">
                                    Breakout Level (ต้าน)
                                  </p>
                                  <p className="text-white font-bold text-lg">
                                    {pat?.breakoutLevel?.toFixed(2) || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs text-green-400/80">
                                    Profit Target
                                  </p>
                                  <p className="text-green-400 font-bold text-lg">
                                    ${pat?.targetPrice?.toFixed(2) || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs text-red-400/80">
                                    Cut Loss
                                  </p>
                                  <p className="text-red-400 font-bold text-lg">
                                    ${pat?.stopLoss?.toFixed(2) || "-"}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

        {/* Empty State */}
        {!scanning && validScans.length === 0 && selectedTickers.length > 0 && (
          <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800">
            <div className="text-4xl mb-4 opacity-50">👀</div>
            <h3 className="text-xl font-bold text-gray-400">
              ไม่พบ Pattern ในช่วงนี้
            </h3>
            <p className="text-gray-500 mt-2 text-sm">
              ลองเลือกกลุ่มหุ้นอื่น หรือรอตลาดเคลื่อนไหวชัดเจนกว่านี้
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

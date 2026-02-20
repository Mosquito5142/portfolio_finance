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

  // Filter only stocks that have an Ascending Triangle Pattern detected
  const triangleScans = scans
    .filter((s) => s.status === "done" && s.data)
    .filter((s) => {
      const hasTriangle = s.data?.patterns.some(
        (p) => p.name === "Ascending Triangle",
      );
      return hasTriangle;
    })
    .sort((a, b) => {
      // Sort by distance to breakout (closest first)
      const aTri = a.data?.patterns.find((p) => p.name.includes("Triangle"));
      const bTri = b.data?.patterns.find((p) => p.name.includes("Triangle"));
      const aDist = Math.abs(aTri?.distanceToBreakout || 100);
      const bDist = Math.abs(bTri?.distanceToBreakout || 100);
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
                  ASCENDING TRIANGLES หุ้นกระทิงบีบอัด
                </h1>
                <p className="text-gray-400 text-xs">
                  สแกนหาเฉพาะทรง "ฐานยก ยอดแน่น" (เตรียม Breakout ขึ้น)
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
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 max-h-[300px] overflow-y-auto">
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
                  Scan Ascending Triangles
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
        {!scanning && triangleScans.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-slate-700 pb-2 flex items-center gap-2">
              🚨 พบ {triangleScans.length} หุ้น ทรงกระทิงกำลังบีบตัว (Ascending
              Triangle)!
            </h2>

            {/* TradingView Chart Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {triangleScans.map((s) => {
                const tri = s.data?.patterns.find((p) =>
                  p.name.includes("Triangle"),
                );
                return (
                  <div
                    key={s.symbol}
                    className="bg-slate-800/80 rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl flex flex-col"
                  >
                    {/* Header */}
                    <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/50">
                      <div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                          {s.symbol}
                          {tri && (
                            <span
                              className={`text-xs px-2 py-1 rounded border ${
                                tri.signal === "bullish"
                                  ? "bg-green-900/40 text-green-400 border-green-500/50"
                                  : tri.signal === "bearish"
                                    ? "bg-red-900/40 text-red-400 border-red-500/50"
                                    : "bg-gray-800 text-gray-400 border-gray-600"
                              }`}
                            >
                              {tri.name}
                            </span>
                          )}
                        </h3>
                        {tri && (
                          <p className="text-sm text-gray-400 mt-1">
                            {tri.description}
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
                      </div>
                    </div>

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

                    {/* Footer Stats */}
                    {tri && (
                      <div className="p-4 bg-slate-900/80 grid grid-cols-3 gap-4 text-center border-t border-slate-700/50 mt-auto">
                        <div>
                          <p className="text-gray-500 text-xs">
                            Breakout Level (ต้าน)
                          </p>
                          <p className="text-white font-bold text-lg">
                            ${tri.breakoutLevel?.toFixed(2) || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs text-green-400/80">
                            Profit Target
                          </p>
                          <p className="text-green-400 font-bold text-lg">
                            ${tri.targetPrice?.toFixed(2) || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs text-red-400/80">
                            Cut Loss
                          </p>
                          <p className="text-red-400 font-bold text-lg">
                            ${tri.stopLoss?.toFixed(2) || "-"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!scanning &&
          scans.filter((s) => s.status === "done").length > 0 &&
          triangleScans.length === 0 && (
            <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="text-5xl mb-4">🏜️</div>
              <h3 className="text-xl font-bold text-white mb-2">
                ไม่พบทรง Ascending Triangle
              </h3>
              <p className="text-gray-400">
                สแกนไป {scans.filter((s) => s.status === "done").length} ตัว
                แต่ไม่มีตัวไหนเข้าฟอร์มกระทิงบีบอัดเลย
              </p>
            </div>
          )}
      </main>
    </div>
  );
}

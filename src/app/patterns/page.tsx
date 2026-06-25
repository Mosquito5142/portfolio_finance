"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { STOCK_DETAILS } from "@/lib/stocks";
import { useStockList } from "@/lib/useStockList";

// สีปุ่มหมวด Quick Select (วนใช้)
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

interface BreakoutData {
  symbol: string;
  isBreakout: boolean;
  type?: "52_WEEK_HIGH" | "ATH" | "RESISTANCE" | "VOLUME_SURGE";
  currentPrice?: string;
  breakoutLevel?: string;
  volumeSurge?: string;
  confidence?: number;
}

interface BreakoutScan {
  symbol: string;
  data: BreakoutData | null;
  status: "pending" | "loading" | "done" | "error";
}

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

export default function BreakoutScannerPage() {
  const { symbols: UNIQUE_SYMBOLS, detailMap, categoryGroups } = useStockList();
  const initRef = useRef(false);

  const [scans, setScans] = useState<BreakoutScan[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Stock Selection State
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customTickers, setCustomTickers] = useState<string[]>([]);
  const [portfolioTickers, setPortfolioTickers] = useState<string[]>([]);

  // Filters
  const [activeTab, setActiveTab] = useState<
    "all" | "52_WEEK_HIGH" | "ATH" | "RESISTANCE" | "VOLUME_SURGE"
  >("all");

  useEffect(() => {
    setMounted(true);

    // Parse URL Parameters for Auto-Scan
    const params = new URLSearchParams(window.location.search);
    const urlSymbols = params.get("symbols");
    const autoScan = params.get("auto") === "true";

    let initialTickers = UNIQUE_SYMBOLS;

    if (urlSymbols) {
      const parsedSymbols = urlSymbols.split(",").map(s => s.trim().toUpperCase()).filter(s => s);
      if (parsedSymbols.length > 0) {
        initialTickers = parsedSymbols;
        setSelectedTickers(parsedSymbols);

        // Add unknown tickers to custom
        const newTickers = parsedSymbols.filter(t => !UNIQUE_SYMBOLS.includes(t));
        if (newTickers.length > 0) {
          setCustomTickers(newTickers);
        }
      }
    } else {
      // ไม่มี URL → เลือกทั้งหมดเป็นค่าเริ่มต้น (ตามคลังหุ้นที่โหลดมา)
      setSelectedTickers(UNIQUE_SYMBOLS);
    }

    const initialScans: BreakoutScan[] = Array.from(new Set([...UNIQUE_SYMBOLS, ...initialTickers])).map((symbol) => ({
      symbol,
      data: null,
      status: "pending",
    }));
    setScans(initialScans);

    // งานที่ทำครั้งเดียวพอ (autoscan + ดึงพอร์ต)
    if (initRef.current) return;
    initRef.current = true;

    if (autoScan && urlSymbols) {
       setTimeout(() => {
         document.getElementById("btn-scan-breakout")?.click();
       }, 500);
    }

    // Fetch user's active portfolio tickers
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
              const existingSymbols = prev.map((s) => s.symbol);
              const itemsToAdd: BreakoutScan[] = newTickers
                .filter((t) => !existingSymbols.includes(t))
                .map((t) => ({ symbol: t, data: null, status: "pending" }));
              return [...prev, ...itemsToAdd];
            });
          }
        }
      })
      .catch((e) => console.error("Failed to load portfolio", e));
  }, [UNIQUE_SYMBOLS]);

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
        const response = await fetch(`/api/patterns/breakout?symbol=${symbol}`);
        const rawData = await response.json();

        setScans((prev) =>
          prev.map((s) =>
            s.symbol === symbol
              ? {
                  symbol,
                  data: rawData.isBreakout ? rawData : null,
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

      // Simulate a small delay to avoid hitting rate limits and show progress
      if (i < targets.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }

    setScanning(false);
  };

  const validScans = scans
    .filter((s) => s.status === "done" && s.data?.isBreakout)
    .filter((s) => {
      if (activeTab === "all") return true;
      return s.data?.type === activeTab;
    })
    .sort((a, b) => (b.data?.confidence || 0) - (a.data?.confidence || 0));

  const getTypeStyle = (type?: string) => {
    switch (type) {
      case "52_WEEK_HIGH":
        return { label: "52-Week High", icon: "🚀", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" };
      case "ATH":
        return { label: "All-Time High", icon: "👑", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" };
      case "RESISTANCE":
        return { label: "Resistance Break", icon: "📈", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" };
      case "VOLUME_SURGE":
        return { label: "Volume Breakout", icon: "💥", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/30" };
      default:
        return { label: "Breakout", icon: "🔥", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" };
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-indigo-500/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              <div>
                <h1 className="text-xl font-bold text-indigo-400">
                  BREAKOUT SCANNER
                </h1>
                <p className="text-gray-400 text-xs">
                  สแกนหาหุ้นที่ทะลุแนวต้านสำคัญ (52-Week High, All-Time High) พร้อมวอลลุ่มเข้า
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/discover" className="text-gray-400 hover:text-purple-400 font-bold transition-colors">
                🔮 AI Discover
              </Link>
              <Link href="/" className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1 rounded-full">
                ← กลับหน้าแรก
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Helper Banner */}
        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 flex gap-4 text-sm text-indigo-200">
          <span className="text-2xl mt-1">💡</span>
          <div>
            <p className="font-bold text-white mb-1">
              ทำไมต้องเล่นหุ้น Breakout?
            </p>
            <p className="text-gray-300">
              เมื่อราคาสามารถทะลุแนวต้านสำคัญ หรือทำจุดสูงสุดใหม่ (All-Time High) มักจะแสดงถึง "ความต้องการซื้อที่ล้นหลาม" และไม่มีแรงเทขายจากคนที่ติดดอยคอยกดดัน (No Overhead Supply) ทำให้หุ้นวิ่งขึ้นได้แรงและเร็ว
            </p>
          </div>
        </div>

        {/* Stock Selector */}
        <div className="mb-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              🎯 Select Stocks to Scan
              <span className="text-sm text-gray-500 font-normal">
                ({selectedTickers.length}/{UNIQUE_SYMBOLS.length + customTickers.length})
              </span>
            </h2>
            <button
              onClick={() => setIsSelectorOpen(!isSelectorOpen)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isSelectorOpen ? "Collapse 🔼" : "Expand 🔽"}
            </button>
          </div>

          {isSelectorOpen && (
            <>
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-wrap gap-2">
                  <span className="text-gray-400 text-xs self-center mr-2">Quick Select:</span>
                  {[
                    { label: "My Portfolio 🌟", list: portfolioTickers, color: "bg-yellow-600" },
                    { label: "ALL LIST", list: UNIQUE_SYMBOLS, color: "bg-gray-600" },
                    { label: "ALL LIST + Custom", list: [...UNIQUE_SYMBOLS, ...customTickers], color: "bg-gray-500" },
                    ...categoryGroups.map((g, i) => ({
                      label: g.category,
                      list: g.symbols,
                      color: CAT_COLORS[i % CAT_COLORS.length],
                    })),
                  ].map((group) => {
                    const isFullySelected = group.list.length > 0 && group.list.every((t) => selectedTickers.includes(t));
                    return (
                      <button
                        key={group.label}
                        onClick={() => {
                          if (isFullySelected) {
                            setSelectedTickers(selectedTickers.filter((t) => !group.list.includes(t)));
                          } else {
                            setSelectedTickers(Array.from(new Set([...selectedTickers, ...group.list])));
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border border-white/10 ${
                          isFullySelected ? `${group.color} text-white shadow-lg` : "bg-slate-800 text-gray-400 hover:bg-slate-700"
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
              </div>

              <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {filteredSymbols.map((ticker) => (
                    <TickerCheckbox
                      key={ticker}
                      ticker={ticker}
                      checked={selectedTickers.includes(ticker)}
                      onToggle={() => {
                        if (selectedTickers.includes(ticker)) {
                          setSelectedTickers(selectedTickers.filter((t) => t !== ticker));
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
              id="btn-scan-breakout"
              onClick={handleScan}
              disabled={scanning || selectedTickers.length === 0}
              className={`px-8 py-3 rounded-xl font-bold text-lg shadow-lg flex items-center gap-2 transition-all ${
                scanning
                  ? "bg-slate-700 text-gray-400 cursor-not-allowed"
                  : selectedTickers.length === 0
                    ? "bg-slate-800 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25 active:scale-95"
              }`}
            >
              {scanning ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Scanning {selectedTickers.length} Stocks... {Math.round(scanProgress)}%
                </>
              ) : (
                <>
                  <span>🚀</span>
                  Scan Breakout Setups
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

        {/* Filters */}
        {!scanning && validScans.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                activeTab === "all" ? "bg-white text-slate-900" : "bg-slate-800 text-gray-400 hover:bg-slate-700"
              }`}
            >
              All Breakouts ({validScans.length})
            </button>
            {[
              { id: "52_WEEK_HIGH", label: "52W High", icon: "🚀", color: "orange" },
              { id: "ATH", label: "All-Time High", icon: "👑", color: "yellow" },
              { id: "RESISTANCE", label: "Resistance", icon: "📈", color: "emerald" },
              { id: "VOLUME_SURGE", label: "Volume Surge", icon: "💥", color: "purple" },
            ].map((tab) => {
              const count = scans.filter((s) => s.status === "done" && s.data?.isBreakout && s.data.type === tab.id).length;
              if (count === 0) return null;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all border flex items-center gap-2 ${
                    isActive 
                      ? `bg-${tab.color}-500/20 text-${tab.color}-400 border-${tab.color}-500/50 shadow-lg shadow-${tab.color}-900/20` 
                      : `bg-slate-800 text-gray-400 border-transparent hover:bg-slate-700`
                  }`}
                >
                  <span>{tab.icon}</span>
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Results Grid - Changed to 1 column or 2 columns so chart is large enough */}
        {!scanning && validScans.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {validScans.map((scan) => {
              const data = scan.data!;
              const style = getTypeStyle(data.type);
              const diffPercent = (((parseFloat(data.currentPrice || "0") - parseFloat(data.breakoutLevel || "0")) / parseFloat(data.breakoutLevel || "1")) * 100).toFixed(2);
              const isAbove = parseFloat(data.currentPrice || "0") > parseFloat(data.breakoutLevel || "0");

              return (
                <div key={scan.symbol} className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/50 hover:border-indigo-500/50 transition-all group relative overflow-hidden flex flex-col">
                  <div className={`absolute top-0 right-0 w-32 h-32 ${style.bg} rounded-bl-full -mr-16 -mt-16 transition-all group-hover:scale-110 pointer-events-none`} />
                  
                  <div className="relative z-10 flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-black text-white">{scan.symbol}</h3>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{detailMap[scan.symbol] || STOCK_DETAILS[scan.symbol] || "Stock"}</p>
                    </div>
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${style.bg} ${style.color} ${style.border}`}>
                      <span>{style.icon}</span>
                      {style.label}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                      <p className="text-xs text-gray-500 mb-1">Current Price</p>
                      <p className="text-lg font-bold text-white">${data.currentPrice}</p>
                    </div>
                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50">
                      <p className="text-xs text-gray-500 mb-1">Breakout Level</p>
                      <p className="text-lg font-bold text-white">${data.breakoutLevel}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Status:</span>
                      <span className={`font-bold ${isAbove ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {isAbove ? `+${diffPercent}% (Confirmed)` : `${diffPercent}% (Testing)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2" title="Volume Surge">
                      <span className="text-gray-400">Vol:</span>
                      <span className="font-bold text-blue-400">{data.volumeSurge}x</span>
                    </div>
                  </div>

                  {/* TradingView Chart Frame */}
                  <div className="h-[350px] w-full bg-slate-900 relative rounded-xl overflow-hidden border border-slate-700/50 flex-grow">
                    <iframe
                      src={`https://s.tradingview.com/widgetembed/?symbol=${scan.symbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FBangkok&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en`}
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      allowFullScreen
                    ></iframe>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-700 rounded-full h-1.5 w-16">
                        <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${data.confidence}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-400">Score {data.confidence}</span>
                    </div>
                    {/* Optionally add more action buttons here */}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!scanning && validScans.length === 0 && scans.some((s) => s.status === "done") && (
          <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700/30">
            <span className="text-4xl mb-4 block">🔍</span>
            <h3 className="text-xl font-bold text-white mb-2">No Breakouts Found</h3>
            <p className="text-gray-400">None of the scanned stocks are currently breaking out.</p>
          </div>
        )}
      </main>
    </div>
  );
}

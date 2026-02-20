"use client";

import { useState, useMemo, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { StockPrice, MacroData, PatternResponse } from "@/types/stock";
import { formatUSD, formatPercent } from "@/lib/utils";
import PatternCard from "@/components/PatternCard";

// รายการหุ้นยอดนิยมสำหรับ autocomplete
const STOCK_LIST = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)" },
  { symbol: "AMZN", name: "Amazon.com Inc." },
  { symbol: "META", name: "Meta Platforms Inc." },
  { symbol: "TSLA", name: "Tesla Inc." },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "NFLX", name: "Netflix Inc." },
  { symbol: "DIS", name: "The Walt Disney Company" },
  { symbol: "COIN", name: "Coinbase Global Inc." },
  { symbol: "BA", name: "Boeing Company" },
  { symbol: "XOM", name: "Exxon Mobil Corporation" },
  { symbol: "JPM", name: "JPMorgan Chase & Co." },
  { symbol: "V", name: "Visa Inc." },
  { symbol: "MA", name: "Mastercard Inc." },
  { symbol: "WMT", name: "Walmart Inc." },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "PG", name: "Procter & Gamble Co." },
  { symbol: "UNH", name: "UnitedHealth Group" },
  { symbol: "HD", name: "The Home Depot Inc." },
  { symbol: "BAC", name: "Bank of America Corp." },
  { symbol: "KO", name: "The Coca-Cola Company" },
  { symbol: "PEP", name: "PepsiCo Inc." },
  { symbol: "COST", name: "Costco Wholesale" },
  { symbol: "AVGO", name: "Broadcom Inc." },
  { symbol: "MRK", name: "Merck & Co. Inc." },
  { symbol: "ABBV", name: "AbbVie Inc." },
  { symbol: "CVX", name: "Chevron Corporation" },
  { symbol: "LLY", name: "Eli Lilly and Company" },
  { symbol: "CRM", name: "Salesforce Inc." },
  { symbol: "ORCL", name: "Oracle Corporation" },
  { symbol: "ADBE", name: "Adobe Inc." },
  { symbol: "INTC", name: "Intel Corporation" },
  { symbol: "QCOM", name: "Qualcomm Inc." },
  { symbol: "PYPL", name: "PayPal Holdings Inc." },
  { symbol: "SQ", name: "Block Inc. (Square)" },
  { symbol: "UBER", name: "Uber Technologies Inc." },
  { symbol: "LYFT", name: "Lyft Inc." },
  { symbol: "SHOP", name: "Shopify Inc." },
  { symbol: "SPOT", name: "Spotify Technology" },
  { symbol: "ZM", name: "Zoom Video Communications" },
  { symbol: "SNAP", name: "Snap Inc." },
  { symbol: "PINS", name: "Pinterest Inc." },
  { symbol: "RBLX", name: "Roblox Corporation" },
  { symbol: "PLTR", name: "Palantir Technologies" },
  { symbol: "SOFI", name: "SoFi Technologies" },
  { symbol: "RIVN", name: "Rivian Automotive" },
  { symbol: "LCID", name: "Lucid Group Inc." },
  { symbol: "NIO", name: "NIO Inc." },
  { symbol: "LI", name: "Li Auto Inc." },
  { symbol: "XPEV", name: "XPeng Inc." },
  { symbol: "GME", name: "GameStop Corp." },
  { symbol: "AMC", name: "AMC Entertainment" },
  { symbol: "BBBY", name: "Bed Bath & Beyond" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF" },
  { symbol: "QQQ", name: "Invesco QQQ Trust" },
  { symbol: "IWM", name: "iShares Russell 2000" },
  { symbol: "GLD", name: "SPDR Gold Shares" },
  { symbol: "SLV", name: "iShares Silver Trust" },
  { symbol: "BTC-USD", name: "Bitcoin USD" },
  { symbol: "ETH-USD", name: "Ethereum USD" },
  { symbol: "SOL-USD", name: "Solana USD" },
];

// หุ้นที่เกี่ยวข้องกับ commodities (ได้รับผลกระทบจาก DXY)
const COMMODITY_STOCKS = ["SLV", "GLD", "XOM", "CVX"];

interface MacroDataExtended extends MacroData {
  commodityImpact?: {
    impact: "bullish" | "bearish" | "neutral";
    reason: string;
    dxySignal: string;
    yieldSignal: string;
  };
}

// Insider Data Types
interface InsiderTransaction {
  name: string;
  relation: string;
  shares: number;
  value: number;
  transactionType: "Buy" | "Sell" | "Exercise";
  date: string;
}

interface InsiderDataResult {
  recentTransactions: InsiderTransaction[];
  netShares: number;
  totalBuys: number;
  totalSells: number;
  sentiment: "buying" | "selling" | "neutral";
  sentimentText: string;
  shortInterest?: number;
  shortRatio?: number;
  institutionalOwnership?: number;
}

interface SocialDataResult {
  buzzScore: number;
  newsCount: number;
  sentimentScore: number;
  sentiment: "positive" | "negative" | "neutral";
  sources: string[];
  // News Quality
  qualityScore?: number;
  tier1Count?: number;
  tier2Count?: number;
  tier3Count?: number;
}

interface InsiderSocialData {
  insider: InsiderDataResult | null;
  social: SocialDataResult | null;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") || "";

  const [symbol, setSymbol] = useState(initialSymbol);
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<StockPrice | null>(null);
  const [macroData, setMacroData] = useState<MacroDataExtended | null>(null);
  const [insiderSocialData, setInsiderSocialData] =
    useState<InsiderSocialData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [patternData, setPatternData] = useState<PatternResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Auto-search on mount if symbol is provided in URL
  useEffect(() => {
    if (initialSymbol) {
      searchStock(initialSymbol);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSymbol]);

  // ========== SEND TO GOOGLE SHEET ==========
  const [sendingToSheet, setSendingToSheet] = useState(false);
  const [sheetMessage, setSheetMessage] = useState("");

  const sendToGoogleSheet = async () => {
    if (!stockData) return;
    setSendingToSheet(true);
    setSheetMessage("");

    // ใช้ค่าจาก Pattern API (ATR-based) ถ้ามี, ถ้าไม่มีใช้ค่าจาก stockData
    const support =
      patternData?.metrics?.supportLevel ||
      stockData.support ||
      stockData.currentPrice * 0.95;
    const resistance =
      patternData?.metrics?.resistanceLevel ||
      stockData.resistance ||
      stockData.currentPrice * 1.1;
    // Cut Loss: ใช้ ATR-based suggestedStopLoss (ถ้ามี)
    const cutLoss =
      patternData?.advancedIndicators?.suggestedStopLoss || support * 0.97;
    // Target: ใช้ suggestedTakeProfit (ถ้ามี)
    const target =
      patternData?.advancedIndicators?.suggestedTakeProfit || resistance;

    const items = [
      {
        ticker: stockData.symbol,
        entry: Number(support.toFixed(2)),
        cut: Number(cutLoss.toFixed(2)),
        target: Number(target.toFixed(2)),
      },
    ];

    try {
      const res = await fetch("/api/sheets/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const result = await res.json();
      if (res.ok) {
        setSheetMessage(`✅ ส่ง ${stockData.symbol} เข้า Sheet แล้ว!`);
      } else {
        setSheetMessage(`❌ ${result.error || "เกิดข้อผิดพลาด"}`);
      }
    } catch {
      setSheetMessage("❌ ไม่สามารถเชื่อมต่อกับ Google Sheet ได้");
    }

    setSendingToSheet(false);
    setTimeout(() => setSheetMessage(""), 5000);
  };

  // ฟิลเตอร์หุ้นตาม input
  const filteredStocks = useMemo(() => {
    if (!symbol.trim()) return [];
    const query = symbol.toUpperCase();
    return STOCK_LIST.filter(
      (stock) =>
        stock.symbol.includes(query) ||
        stock.name.toUpperCase().includes(query),
    ).slice(0, 8); // แสดงสูงสุด 8 รายการ
  }, [symbol]);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || filteredStocks.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < filteredStocks.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      selectStock(filteredStocks[selectedIndex].symbol);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const selectStock = (sym: string) => {
    setSymbol(sym);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Auto search
    searchStock(sym);
  };

  const searchStock = async (sym: string) => {
    if (!sym.trim()) return;

    setLoading(true);
    setError(null);
    setStockData(null);
    setMacroData(null);
    setInsiderSocialData(null);
    setPatternData(null);

    try {
      // ดึงข้อมูลหุ้น
      const response = await fetch(`/api/prices?symbols=${sym.toUpperCase()}`);
      if (!response.ok) throw new Error("Failed to fetch stock data");

      const data = await response.json();
      const stockPrice = data[sym.toUpperCase()];

      if (!stockPrice) {
        setError(`ไม่พบข้อมูลหุ้น "${sym.toUpperCase()}"`);
        return;
      }

      setStockData(stockPrice);

      // ดึงข้อมูลเพิ่มเติมพร้อมกัน
      const fetchPromises: Promise<void>[] = [];

      // ดึงข้อมูล macro สำหรับหุ้น commodity
      if (COMMODITY_STOCKS.includes(sym.toUpperCase())) {
        fetchPromises.push(
          fetch("/api/macro")
            .then((res) => (res.ok ? res.json() : null))
            .then((macroResult) => {
              if (macroResult) setMacroData(macroResult);
            })
            .catch(() => console.log("Macro data fetch failed")),
        );
      }

      // ดึงข้อมูล insider และ social
      fetchPromises.push(
        fetch(`/api/insider?symbol=${sym.toUpperCase()}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((insiderResult) => {
            if (insiderResult) {
              setInsiderSocialData({
                insider: insiderResult.insider,
                social: insiderResult.social,
              });
            }
          })
          .catch(() => console.log("Insider data fetch failed")),
      );

      // ดึงข้อมูล Pattern Scanner
      fetchPromises.push(
        fetch(`/api/patterns?symbol=${sym.toUpperCase()}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((patternResult) => {
            if (patternResult && patternResult.currentPrice > 0) {
              setPatternData(patternResult);
            }
          })
          .catch(() => console.log("Pattern data fetch failed")),
      );

      await Promise.all(fetchPromises);
    } catch {
      setError("เกิดข้อผิดพลาดในการค้นหา กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    searchStock(symbol);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900/50 border-b border-gray-800 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a
                href="/"
                className="text-gray-400 hover:text-white transition-colors"
              >
                ← กลับ
              </a>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🔍 ค้นหาหุ้น
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSearch} className="mb-8 relative">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setShowSuggestions(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="พิมพ์ Symbol เช่น AAPL, MSFT, GOOGL..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                autoComplete="off"
              />

              {/* Autocomplete Dropdown */}
              {showSuggestions && filteredStocks.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-xl z-20"
                >
                  {filteredStocks.map((stock, index) => (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => selectStock(stock.symbol)}
                      className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                        index === selectedIndex
                          ? "bg-purple-600/30"
                          : "hover:bg-gray-700"
                      }`}
                    >
                      <span className="font-bold text-purple-400 min-w-[60px]">
                        {stock.symbol}
                      </span>
                      <span className="text-gray-400 text-sm truncate">
                        {stock.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !symbol.trim()}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  กำลังค้นหา...
                </span>
              ) : (
                "ค้นหา"
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-red-400 mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Stock Data Display */}
        {stockData && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-white">
                  {stockData.symbol}
                </h2>
                <p className="text-gray-400">Yahoo Finance</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-white">
                  {formatUSD(stockData.currentPrice)}
                </p>
                <div
                  className={`flex items-center justify-end gap-1 text-lg ${stockData.dayChange >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  <span>{stockData.dayChange >= 0 ? "▲" : "▼"}</span>
                  <span>{formatUSD(Math.abs(stockData.dayChange))}</span>
                  <span>({formatPercent(stockData.dayChangePercent)})</span>
                </div>
              </div>
            </div>

            {/* 📤 Send to Google Sheet */}
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={sendToGoogleSheet}
                disabled={sendingToSheet}
                className="px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-xl font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {sendingToSheet ? (
                  <>
                    <span className="animate-spin">⏳</span> กำลังส่ง...
                  </>
                ) : (
                  <>📤 ส่ง {stockData.symbol} เข้า Google Sheet</>
                )}
              </button>
              {sheetMessage && (
                <span
                  className={`text-sm font-medium ${sheetMessage.startsWith("✅") ? "text-green-400" : "text-red-400"}`}
                >
                  {sheetMessage}
                </span>
              )}
            </div>
            {/* 📈 TradingView Chart */}
            <div className="mb-6 bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50 flex flex-col h-[600px]">
              <iframe
                src={`https://s.tradingview.com/widgetembed/?symbol=${stockData.symbol}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FBangkok&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en`}
                width="100%"
                height="100%"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            </div>

            {/* 🌍 Macro Indicators (DXY & US10Y) - สำหรับหุ้น Commodity */}
            {macroData && (
              <div className="mb-6 p-5 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-2xl border border-blue-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🌍</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      Macro Indicators
                    </h3>
                    <p className="text-gray-400 text-sm">
                      ปัจจัยภาพใหญ่ที่กระทบต่อ Commodities
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* DXY */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">💵</span>
                      <span className="text-gray-400 text-sm">
                        Dollar Index (DXY)
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {macroData.dxy?.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm ${
                          macroData.dxyChange < 0
                            ? "text-green-400"
                            : macroData.dxyChange > 0
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {macroData.dxyChange >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(macroData.dxyChange).toFixed(2)}% วันนี้
                      </span>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          macroData.dxyTrend === "down"
                            ? "bg-green-500/20 text-green-400"
                            : macroData.dxyTrend === "up"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-gray-500/20 text-gray-400"
                        }`}
                      >
                        {macroData.dxyTrend === "down"
                          ? "📉 อ่อนค่า 5 วัน (ดีต่อ Silver)"
                          : macroData.dxyTrend === "up"
                            ? "📈 แข็งค่า 5 วัน (กดดัน Silver)"
                            : "➡️ ทรงตัว"}
                      </span>
                    </div>
                  </div>

                  {/* US10Y */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">📊</span>
                      <span className="text-gray-400 text-sm">
                        US 10-Year Yield
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {macroData.us10y?.toFixed(2)}%
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm ${
                          macroData.us10yChange < 0
                            ? "text-green-400"
                            : macroData.us10yChange > 0
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {macroData.us10yChange >= 0 ? "▲" : "▼"}{" "}
                        {Math.abs(macroData.us10yChange).toFixed(2)}% วันนี้
                      </span>
                    </div>
                    <div className="mt-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          macroData.us10y > 4.5
                            ? "bg-red-500/20 text-red-400"
                            : macroData.us10y < 3.5
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {macroData.us10y > 4.5
                          ? "⚠️ Yield สูง (กดดัน Gold/Silver)"
                          : macroData.us10y < 3.5
                            ? "✅ Yield ต่ำ (ดีต่อ Gold/Silver)"
                            : "➡️ Yield ปานกลาง"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Commodity Impact Summary */}
                {macroData.commodityImpact && (
                  <div
                    className={`p-4 rounded-xl ${
                      macroData.commodityImpact.impact === "bullish"
                        ? "bg-green-900/30 border border-green-500/30"
                        : macroData.commodityImpact.impact === "bearish"
                          ? "bg-red-900/30 border border-red-500/30"
                          : "bg-gray-800/50 border border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">
                        {macroData.commodityImpact.impact === "bullish"
                          ? "🚀"
                          : macroData.commodityImpact.impact === "bearish"
                            ? "⚠️"
                            : "➡️"}
                      </span>
                      <span className="font-medium text-white">
                        {macroData.commodityImpact.impact === "bullish"
                          ? "Macro เอื้อต่อการขึ้น"
                          : macroData.commodityImpact.impact === "bearish"
                            ? "Macro กดดันราคา"
                            : "Macro เป็นกลาง"}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      {macroData.commodityImpact.reason}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 📊 Volume Profile (POC) */}
            {stockData.poc && (
              <div className="mb-6 p-5 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📊</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      Volume Profile
                    </h3>
                    <p className="text-gray-400 text-sm">
                      จุดที่มีการซื้อขายหนาแน่นที่สุด (POC)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* Value Area Low */}
                  <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3 text-center">
                    <p className="text-green-400 text-xs mb-1">
                      📉 Value Area Low
                    </p>
                    <p className="text-green-300 text-lg font-bold">
                      {formatUSD(stockData.vaLow || stockData.poc * 0.95)}
                    </p>
                    <p className="text-green-500/70 text-[10px]">
                      แนวรับจาก Volume
                    </p>
                  </div>

                  {/* POC */}
                  <div className="bg-purple-900/30 border border-purple-500/50 rounded-xl p-3 text-center">
                    <p className="text-purple-400 text-xs mb-1">
                      🎯 POC (Point of Control)
                    </p>
                    <p className="text-purple-300 text-xl font-bold">
                      {formatUSD(stockData.poc)}
                    </p>
                    <p className="text-purple-500/70 text-[10px]">
                      จุดดอยเฉลี่ยของคนส่วนใหญ่
                    </p>
                  </div>

                  {/* Value Area High */}
                  <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-center">
                    <p className="text-red-400 text-xs mb-1">
                      📈 Value Area High
                    </p>
                    <p className="text-red-300 text-lg font-bold">
                      {formatUSD(stockData.vaHigh || stockData.poc * 1.05)}
                    </p>
                    <p className="text-red-500/70 text-[10px]">
                      แนวต้านจาก Volume
                    </p>
                  </div>
                </div>

                {/* POC Analysis */}
                <div className="bg-gray-800/50 rounded-xl p-3">
                  <p className="text-sm text-gray-300">
                    {stockData.currentPrice < stockData.poc ? (
                      <>
                        <span className="text-red-400">⚠️ ราคาต่ำกว่า POC</span>
                        <span className="text-gray-400">
                          {" "}
                          - มีแรงขายรออยู่ข้างบนจำนวนมาก (Overhead Supply)
                          การเด้งขึ้นจะถูกจำกัด
                        </span>
                      </>
                    ) : stockData.currentPrice > stockData.poc ? (
                      <>
                        <span className="text-green-400">
                          ✅ ราคาทะลุ POC ขึ้นมาแล้ว
                        </span>
                        <span className="text-gray-400">
                          {" "}
                          - ราคาอยู่เหนือต้นทุนเฉลี่ยคนส่วนใหญ่ (Breakout)
                          มีโอกาสวิ่งต่อ
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-yellow-400">
                          ➡️ ราคาอยู่ที่ POC พอดี
                        </span>
                        <span className="text-gray-400">
                          {" "}
                          - จุด Equilibrium รอดูว่าจะ Breakout หรือ Breakdown
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* 📈 Moving Averages */}
            {stockData.ema5 && (
              <div className="mb-6 p-5 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📈</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      Moving Averages
                    </h3>
                    <p className="text-gray-400 text-sm">
                      เส้นค่าเฉลี่ยเคลื่อนที่ (Trend Indicator)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {/* EMA 5 - Trailing Stop */}
                  <div
                    className={`p-3 rounded-xl border ${
                      stockData.currentPrice > stockData.ema5
                        ? "bg-green-900/30 border-green-500/50"
                        : "bg-red-900/30 border-red-500/50"
                    }`}
                  >
                    <p className="text-gray-400 text-xs mb-1">
                      EMA 5 (Stop Line)
                    </p>
                    <p className="text-white font-bold text-lg">
                      {formatUSD(stockData.ema5)}
                    </p>
                    <p
                      className={`text-xs ${
                        stockData.currentPrice > stockData.ema5
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {stockData.currentPrice > stockData.ema5
                        ? "▲ Above"
                        : "▼ Below"}{" "}
                      (
                      {(
                        ((stockData.currentPrice - stockData.ema5) /
                          stockData.ema5) *
                        100
                      ).toFixed(1)}
                      %)
                    </p>
                  </div>

                  {/* EMA 20 */}
                  {stockData.ma20 && (
                    <div
                      className={`p-3 rounded-xl border ${
                        stockData.currentPrice > stockData.ma20
                          ? "bg-green-900/20 border-green-500/30"
                          : "bg-red-900/20 border-red-500/30"
                      }`}
                    >
                      <p className="text-gray-400 text-xs mb-1">EMA 20</p>
                      <p className="text-white font-bold text-lg">
                        {formatUSD(stockData.ma20)}
                      </p>
                      <p
                        className={`text-xs ${
                          stockData.currentPrice > stockData.ma20
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {stockData.currentPrice > stockData.ma20
                          ? "▲ Above"
                          : "▼ Below"}
                      </p>
                    </div>
                  )}

                  {/* SMA 50 */}
                  {stockData.ma50 && (
                    <div
                      className={`p-3 rounded-xl border ${
                        stockData.currentPrice > stockData.ma50
                          ? "bg-green-900/20 border-green-500/30"
                          : "bg-red-900/20 border-red-500/30"
                      }`}
                    >
                      <p className="text-gray-400 text-xs mb-1">SMA 50</p>
                      <p className="text-white font-bold text-lg">
                        {formatUSD(stockData.ma50)}
                      </p>
                      <p
                        className={`text-xs ${
                          stockData.currentPrice > stockData.ma50
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {stockData.currentPrice > stockData.ma50
                          ? "▲ Above"
                          : "▼ Below"}
                      </p>
                    </div>
                  )}

                  {/* SMA 200 */}
                  {stockData.ma200 && (
                    <div
                      className={`p-3 rounded-xl border ${
                        stockData.currentPrice > stockData.ma200
                          ? "bg-green-900/20 border-green-500/30"
                          : "bg-red-900/20 border-red-500/30"
                      }`}
                    >
                      <p className="text-gray-400 text-xs mb-1">SMA 200</p>
                      <p className="text-white font-bold text-lg">
                        {formatUSD(stockData.ma200)}
                      </p>
                      <p
                        className={`text-xs ${
                          stockData.currentPrice > stockData.ma200
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {stockData.currentPrice > stockData.ma200
                          ? "▲ Above"
                          : "▼ Below"}
                      </p>
                    </div>
                  )}
                </div>

                {/* EMA5 Trailing Stop Alert */}
                <div
                  className={`p-3 rounded-xl ${
                    stockData.currentPrice > stockData.ema5
                      ? "bg-green-900/20 border border-green-500/30"
                      : "bg-red-900/30 border border-red-500/50"
                  }`}
                >
                  <p className="text-sm">
                    {stockData.currentPrice > stockData.ema5 ? (
                      <>
                        <span className="text-green-400 font-medium">
                          ✅ ปลอดภัย - อยู่เหนือ EMA5
                        </span>
                        <span className="text-gray-400">
                          {" "}
                          - ถือต่อได้ ใช้ {formatUSD(stockData.ema5)} เป็น
                          Trailing Stop
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-red-400 font-medium">
                          🚨 คำเตือน! ราคาหลุด EMA5
                        </span>
                        <span className="text-gray-400">
                          {" "}
                          - พิจารณาขาย 100% หรือ Set Stop Loss ทันที
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* 📊 Daily Volume Analysis */}
            {stockData.volumeToday !== undefined &&
              stockData.volumeAvg10 !== undefined && (
                <div className="mb-6 p-5 bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-2xl border border-orange-500/30">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">📊</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        Daily Volume Analysis
                      </h3>
                      <p className="text-gray-400 text-sm">
                        วิเคราะห์ Momentum ด้วย Volume
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Volume Today */}
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-400 text-xs mb-1">
                        Volume วันนี้
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {(stockData.volumeToday / 1000000).toFixed(2)}M
                      </p>
                      <p
                        className={`text-sm ${
                          (stockData.volumeChangePercent || 0) > 0
                            ? "text-green-400"
                            : stockData.volumeChangePercent === 0
                              ? "text-gray-400"
                              : "text-red-400"
                        }`}
                      >
                        {(stockData.volumeChangePercent || 0) > 0 ? "+" : ""}
                        {(stockData.volumeChangePercent || 0).toFixed(0)}% vs
                        ค่าเฉลี่ย
                        {(stockData.volumeChangePercent || 0) > 50 && " 🔥"}
                      </p>
                    </div>

                    {/* Volume Average 10 Days */}
                    <div className="bg-gray-800/50 rounded-xl p-4">
                      <p className="text-gray-400 text-xs mb-1">
                        ค่าเฉลี่ย 10 วัน
                      </p>
                      <p className="text-2xl font-bold text-white">
                        {(stockData.volumeAvg10 / 1000000).toFixed(2)}M
                      </p>
                      <p className="text-gray-500 text-sm">Baseline Volume</p>
                    </div>
                  </div>

                  {/* Volume Signal Status */}
                  <div
                    className={`p-4 rounded-xl ${
                      stockData.volumeSignal === "strong"
                        ? "bg-green-900/30 border border-green-500/50"
                        : stockData.volumeSignal === "panic_sell"
                          ? "bg-red-900/50 border border-red-500/70"
                          : stockData.volumeSignal === "weak_divergence"
                            ? "bg-yellow-900/30 border border-yellow-500/50"
                            : "bg-gray-800/50 border border-gray-700"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {stockData.volumeSignal === "strong"
                          ? "💪"
                          : stockData.volumeSignal === "panic_sell"
                            ? "🚨"
                            : stockData.volumeSignal === "weak_divergence"
                              ? "⚠️"
                              : "➡️"}
                      </span>
                      <div>
                        <p
                          className={`font-bold ${
                            stockData.volumeSignal === "strong"
                              ? "text-green-400"
                              : stockData.volumeSignal === "panic_sell"
                                ? "text-red-400"
                                : stockData.volumeSignal === "weak_divergence"
                                  ? "text-yellow-400"
                                  : "text-gray-400"
                          }`}
                        >
                          {stockData.volumeSignal === "strong"
                            ? "Volume Breakout! 🔥"
                            : stockData.volumeSignal === "panic_sell"
                              ? "Panic Sell Signal! 🚨"
                              : stockData.volumeSignal === "weak_divergence"
                                ? "Weak Divergence ⚠️"
                                : "Volume ปกติ"}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {stockData.volumeSignal === "strong"
                            ? "ขาขึ้นแข็งแกร่ง ถือต่อได้"
                            : stockData.volumeSignal === "panic_sell"
                              ? "Volume สูง + ราคาลง = ขายทันที!"
                              : stockData.volumeSignal === "weak_divergence"
                                ? "ราคาขึ้นแต่ Volume น้อย = เตรียมขาย"
                                : "ไม่มีสัญญาณผิดปกติ"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* 🐳 Insider Trading */}
            {insiderSocialData?.insider && (
              <div className="mb-6 p-5 bg-gradient-to-r from-amber-900/30 to-orange-900/30 rounded-2xl border border-amber-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🐳</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      Insider Trading
                    </h3>
                    <p className="text-gray-400 text-sm">
                      การซื้อขายของผู้บริหารและเจ้าของ
                    </p>
                  </div>
                </div>

                {/* Sentiment Badge */}
                <div
                  className={`p-4 rounded-xl mb-4 ${
                    insiderSocialData.insider.sentiment === "buying"
                      ? "bg-green-900/40 border border-green-500/50"
                      : insiderSocialData.insider.sentiment === "selling"
                        ? "bg-red-900/40 border border-red-500/50"
                        : "bg-gray-800/50 border border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {insiderSocialData.insider.sentiment === "buying"
                        ? "💎"
                        : insiderSocialData.insider.sentiment === "selling"
                          ? "🚨"
                          : "➡️"}
                    </span>
                    <div>
                      <p
                        className={`text-lg font-bold ${
                          insiderSocialData.insider.sentiment === "buying"
                            ? "text-green-400"
                            : insiderSocialData.insider.sentiment === "selling"
                              ? "text-red-400"
                              : "text-gray-400"
                        }`}
                      >
                        {insiderSocialData.insider.sentiment === "buying"
                          ? "ผู้บริหารกำลังซื้อหุ้น"
                          : insiderSocialData.insider.sentiment === "selling"
                            ? "ผู้บริหารกำลังขายหุ้น"
                            : "ไม่มีสัญญาณชัดเจน"}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {insiderSocialData.insider.sentimentText}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* Total Buys */}
                  <div className="bg-green-900/20 rounded-xl p-3 text-center">
                    <p className="text-green-400 text-xs mb-1">🟢 ซื้อ</p>
                    <p className="text-green-300 text-xl font-bold">
                      {insiderSocialData.insider.totalBuys}
                    </p>
                    <p className="text-green-500/70 text-[10px]">รายการ</p>
                  </div>

                  {/* Total Sells */}
                  <div className="bg-red-900/20 rounded-xl p-3 text-center">
                    <p className="text-red-400 text-xs mb-1">🔴 ขาย</p>
                    <p className="text-red-300 text-xl font-bold">
                      {insiderSocialData.insider.totalSells}
                    </p>
                    <p className="text-red-500/70 text-[10px]">รายการ</p>
                  </div>

                  {/* Short Interest */}
                  {insiderSocialData.insider.shortInterest !== undefined && (
                    <div className="bg-purple-900/20 rounded-xl p-3 text-center">
                      <p className="text-purple-400 text-xs mb-1">
                        📊 Short Interest
                      </p>
                      <p className="text-purple-300 text-xl font-bold">
                        {insiderSocialData.insider.shortInterest.toFixed(1)}%
                      </p>
                      <p className="text-purple-500/70 text-[10px]">
                        {insiderSocialData.insider.shortInterest > 20
                          ? "สูง! ระวัง Squeeze"
                          : insiderSocialData.insider.shortInterest > 10
                            ? "ปานกลาง"
                            : "ต่ำ"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Institutional Ownership */}
                {insiderSocialData.insider.institutionalOwnership !==
                  undefined && (
                  <div className="bg-gray-800/50 rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">
                        🏦 กองทุน/สถาบันถือหุ้น
                      </span>
                      <span className="text-white font-bold">
                        {insiderSocialData.insider.institutionalOwnership.toFixed(
                          1,
                        )}
                        %
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 🗣️ Social Sentiment */}
            {insiderSocialData?.social && (
              <div className="mb-6 p-5 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-2xl border border-cyan-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🗣️</span>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      News & Social Sentiment
                    </h3>
                    <p className="text-gray-400 text-sm">
                      อารมณ์ตลาดจากข่าวและโซเชียล
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* Buzz Score */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-2">📢 Buzz Score</p>
                    <div className="flex items-end gap-2">
                      <p className="text-3xl font-bold text-white">
                        {insiderSocialData.social.buzzScore}
                      </p>
                      <p className="text-gray-400 text-sm mb-1">/100</p>
                    </div>
                    <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
                        style={{
                          width: `${insiderSocialData.social.buzzScore}%`,
                        }}
                      />
                    </div>
                    <p className="text-gray-500 text-xs mt-1">
                      {insiderSocialData.social.buzzScore > 70
                        ? "🔥 กำลังเป็นที่พูดถึงมาก!"
                        : insiderSocialData.social.buzzScore > 40
                          ? "📰 มีข่าวปานกลาง"
                          : "😴 ไม่ค่อยมีข่าว"}
                    </p>
                  </div>

                  {/* Sentiment Score */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-2">💭 Sentiment</p>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {insiderSocialData.social.sentiment === "positive"
                          ? "😊"
                          : insiderSocialData.social.sentiment === "negative"
                            ? "😟"
                            : "😐"}
                      </span>
                      <div>
                        <p
                          className={`text-lg font-bold ${
                            insiderSocialData.social.sentiment === "positive"
                              ? "text-green-400"
                              : insiderSocialData.social.sentiment ===
                                  "negative"
                                ? "text-red-400"
                                : "text-gray-400"
                          }`}
                        >
                          {insiderSocialData.social.sentiment === "positive"
                            ? "เชิงบวก"
                            : insiderSocialData.social.sentiment === "negative"
                              ? "เชิงลบ"
                              : "เป็นกลาง"}
                        </p>
                        <p className="text-gray-500 text-xs">
                          Score:{" "}
                          {(
                            insiderSocialData.social.sentimentScore * 100
                          ).toFixed(0)}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* News Sources + Quality */}
                {insiderSocialData.social.sources.length > 0 && (
                  <div className="bg-gray-800/50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-400 text-xs">
                        📰 แหล่งข่าว ({insiderSocialData.social.newsCount} ข่าว)
                      </p>
                      {/* 🆕 News Quality Score */}
                      {insiderSocialData.social.qualityScore !== undefined && (
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            insiderSocialData.social.qualityScore >= 50
                              ? "bg-green-900/50 text-green-400"
                              : insiderSocialData.social.qualityScore >= 20
                                ? "bg-yellow-900/50 text-yellow-400"
                                : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {insiderSocialData.social.qualityScore >= 50
                            ? "⭐ คุณภาพสูง"
                            : insiderSocialData.social.qualityScore >= 20
                              ? "📰 ปานกลาง"
                              : "⚠️ คุณภาพต่ำ"}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {insiderSocialData.social.sources.map((source, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-700 rounded-full text-xs text-gray-300"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                    {/* 🆕 Tier Breakdown */}
                    {insiderSocialData.social.tier1Count !== undefined && (
                      <div className="flex gap-2 text-xs">
                        <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded">
                          Tier 1: {insiderSocialData.social.tier1Count}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded">
                          Tier 2: {insiderSocialData.social.tier2Count}
                        </span>
                        <span className="px-2 py-0.5 bg-orange-900/50 text-orange-400 rounded">
                          Tier 3: {insiderSocialData.social.tier3Count}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 52 Week Range */}
            {stockData.high52w && stockData.low52w && (
              <div className="mb-6 p-4 bg-gray-800/50 rounded-xl">
                <p className="text-gray-400 text-sm mb-2">52 สัปดาห์</p>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-500">ต่ำสุด: </span>
                    <span className="text-red-400 font-medium">
                      {formatUSD(stockData.low52w)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">สูงสุด: </span>
                    <span className="text-green-400 font-medium">
                      {formatUSD(stockData.high52w)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pattern Scanner Section */}
        {patternData && (
          <div className="mt-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span> Pattern Scanner Results
            </h3>
            <PatternCard
              scan={{
                symbol: patternData.symbol,
                data: patternData,
                status: "done",
              }}
              scanMode="value"
            />
          </div>
        )}

        {/* Popular Stocks */}
        {!stockData && !loading && (
          <div className="mt-8">
            <p className="text-gray-400 text-sm mb-4">💡 หุ้นยอดนิยม</p>
            <div className="flex flex-wrap gap-2">
              {[
                "AAPL",
                "MSFT",
                "GOOGL",
                "AMZN",
                "META",
                "TSLA",
                "NVDA",
                "AMD",
                "NFLX",
                "DIS",
                "COIN",
                "BA",
                "XOM",
                "JPM",
                "V",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSymbol(s);
                    setLoading(true);
                    setError(null);
                    fetch(`/api/prices?symbols=${s}`)
                      .then((res) => res.json())
                      .then((data) => {
                        setStockData(data[s] || null);
                        if (!data[s]) setError(`ไม่พบข้อมูลหุ้น "${s}"`);
                      })
                      .catch(() => setError("เกิดข้อผิดพลาด"))
                      .finally(() => setLoading(false));
                  }}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
          Loading...
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}

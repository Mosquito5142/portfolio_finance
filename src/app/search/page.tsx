"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { StockPrice } from "@/types/stock";
import { formatUSD, formatPercent } from "@/lib/utils";

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

export default function SearchPage() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<StockPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

    try {
      const response = await fetch(`/api/prices?symbols=${sym.toUpperCase()}`);
      if (!response.ok) throw new Error("Failed to fetch stock data");

      const data = await response.json();
      const stockPrice = data[sym.toUpperCase()];

      if (!stockPrice) {
        setError(`ไม่พบข้อมูลหุ้น "${sym.toUpperCase()}"`);
        return;
      }

      setStockData(stockPrice);
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

            {/* 🎯 AI Analysis Summary */}
            {(() => {
              // คำนวณคะแนนรวม
              let bullishPoints = 0;
              let bearishPoints = 0;
              const signals: {
                icon: string;
                title: string;
                desc: string;
                type: "good" | "bad" | "warn";
              }[] = [];

              // MA Signal
              if (stockData.maSignal === "bullish") {
                bullishPoints += 2;
                signals.push({
                  icon: "📈",
                  title: "เส้นค่าเฉลี่ย (MA) บวก",
                  desc: "ราคาปัจจุบันอยู่เหนือค่าเฉลี่ย 50 วัน แสดงว่าหุ้นมีแรงซื้อ",
                  type: "good",
                });
              } else if (stockData.maSignal === "bearish") {
                bearishPoints += 2;
                signals.push({
                  icon: "📉",
                  title: "เส้นค่าเฉลี่ย (MA) ลบ",
                  desc: "ราคาปัจจุบันอยู่ต่ำกว่าค่าเฉลี่ย 50 วัน แสดงว่าหุ้นมีแรงขาย",
                  type: "bad",
                });
              }

              // RSI Signal
              if (stockData.rsi !== undefined) {
                if (stockData.rsi <= 30) {
                  bullishPoints += 2;
                  signals.push({
                    icon: "💚",
                    title: "RSI ต่ำมาก (Oversold)",
                    desc: `ค่า RSI = ${stockData.rsi.toFixed(0)} หมายความว่าหุ้นถูกขายมากเกินไป มีโอกาสฟื้นตัว`,
                    type: "good",
                  });
                } else if (stockData.rsi >= 70) {
                  bearishPoints += 2;
                  signals.push({
                    icon: "❤️",
                    title: "RSI สูงมาก (Overbought)",
                    desc: `ค่า RSI = ${stockData.rsi.toFixed(0)} หมายความว่าหุ้นถูกซื้อมากเกินไป อาจปรับตัวลง`,
                    type: "bad",
                  });
                } else if (stockData.rsi < 50) {
                  bearishPoints += 1;
                  signals.push({
                    icon: "⚡",
                    title: "RSI อ่อนแอ",
                    desc: `ค่า RSI = ${stockData.rsi.toFixed(0)} (ต่ำกว่า 50) แสดงว่าแรงขายมากกว่าแรงซื้อเล็กน้อย`,
                    type: "warn",
                  });
                } else {
                  bullishPoints += 1;
                  signals.push({
                    icon: "💪",
                    title: "RSI แข็งแกร่ง",
                    desc: `ค่า RSI = ${stockData.rsi.toFixed(0)} (สูงกว่า 50) แสดงว่าแรงซื้อมากกว่าแรงขายเล็กน้อย`,
                    type: "good",
                  });
                }
              }

              // MACD Signal
              if (stockData.macdTrend === "bullish") {
                bullishPoints += 2;
                signals.push({
                  icon: "🔥",
                  title: "MACD เป็นบวก",
                  desc: "เส้น MACD ตัดเหนือเส้น Signal แสดงว่าโมเมนตัมกำลังขึ้น เหมาะซื้อ",
                  type: "good",
                });
              } else if (stockData.macdTrend === "bearish") {
                bearishPoints += 2;
                signals.push({
                  icon: "❄️",
                  title: "MACD เป็นลบ",
                  desc: "เส้น MACD ตัดต่ำกว่าเส้น Signal แสดงว่าโมเมนตัมกำลังลง ควรระวัง",
                  type: "bad",
                });
              }

              // Price vs MA200
              if (stockData.ma200) {
                if (stockData.currentPrice > stockData.ma200) {
                  bullishPoints += 1;
                  signals.push({
                    icon: "🌟",
                    title: "อยู่เหนือเส้น 200 วัน",
                    desc: "ราคาอยู่เหนือค่าเฉลี่ย 200 วัน แสดงว่าหุ้นอยู่ในแนวโน้มขาขึ้นระยะยาว",
                    type: "good",
                  });
                } else {
                  bearishPoints += 1;
                  signals.push({
                    icon: "☁️",
                    title: "อยู่ต่ำกว่าเส้น 200 วัน",
                    desc: "ราคาอยู่ต่ำกว่าค่าเฉลี่ย 200 วัน แสดงว่าหุ้นอยู่ในแนวโน้มขาลงระยะยาว",
                    type: "bad",
                  });
                }
              }

              const totalPoints = bullishPoints + bearishPoints;
              const bullishPercent =
                totalPoints > 0 ? (bullishPoints / totalPoints) * 100 : 50;

              let recommendation:
                | "strong_buy"
                | "buy"
                | "hold"
                | "sell"
                | "strong_sell";
              let recommendationText: string;
              let recommendationColor: string;
              let recommendationIcon: string;

              if (bullishPercent >= 75) {
                recommendation = "strong_buy";
                recommendationText = "แนะนำซื้อเข้า";
                recommendationColor = "from-green-600 to-emerald-600";
                recommendationIcon = "🚀";
              } else if (bullishPercent >= 55) {
                recommendation = "buy";
                recommendationText = "เหมาะซื้อสะสม";
                recommendationColor = "from-green-500 to-teal-500";
                recommendationIcon = "📈";
              } else if (bullishPercent >= 45) {
                recommendation = "hold";
                recommendationText = "ถือ / รอจังหวะ";
                recommendationColor = "from-yellow-500 to-orange-500";
                recommendationIcon = "⏸️";
              } else if (bullishPercent >= 25) {
                recommendation = "sell";
                recommendationText = "ควรระวัง / ลดสัดส่วน";
                recommendationColor = "from-orange-500 to-red-500";
                recommendationIcon = "📉";
              } else {
                recommendation = "strong_sell";
                recommendationText = "หลีกเลี่ยง / ขายออก";
                recommendationColor = "from-red-600 to-rose-600";
                recommendationIcon = "🚨";
              }

              // คำนวณราคาเป้าหมาย
              const buyTarget =
                stockData.support || stockData.currentPrice * 0.95;
              const sellTarget =
                stockData.resistance || stockData.currentPrice * 1.05;
              const stopLoss = stockData.low52w
                ? Math.max(stockData.low52w, stockData.currentPrice * 0.9)
                : stockData.currentPrice * 0.9;

              return (
                <div className="mb-6 p-5 bg-gradient-to-r from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{recommendationIcon}</span>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        สรุปการวิเคราะห์
                      </h3>
                      <p className="text-gray-400 text-sm">
                        จาก Technical Indicators ทั้งหมด
                      </p>
                    </div>
                  </div>

                  {/* Recommendation Badge */}
                  <div
                    className={`p-4 rounded-xl bg-gradient-to-r ${recommendationColor} mb-4`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/80 text-sm">คำแนะนำ</p>
                        <p className="text-white text-2xl font-bold">
                          {recommendationText}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-white/80 text-sm">คะแนน Bullish</p>
                        <p className="text-white text-2xl font-bold">
                          {bullishPercent.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    {/* Score Bar */}
                    <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/80 rounded-full transition-all duration-500"
                        style={{ width: `${bullishPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-white/60 mt-1">
                      <span>Bearish</span>
                      <span>Bullish</span>
                    </div>
                  </div>

                  {/* Price Targets */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-3 text-center">
                      <p className="text-green-400 text-xs mb-1">🎯 จุดซื้อ</p>
                      <p className="text-green-300 text-lg font-bold">
                        {formatUSD(buyTarget)}
                      </p>
                      <p className="text-green-500/70 text-[10px]">
                        ใกล้แนวรับ
                      </p>
                    </div>
                    <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-3 text-center">
                      <p className="text-yellow-400 text-xs mb-1">
                        🛡️ Stop Loss
                      </p>
                      <p className="text-yellow-300 text-lg font-bold">
                        {formatUSD(stopLoss)}
                      </p>
                      <p className="text-yellow-500/70 text-[10px]">
                        ตัดขาดทุน
                      </p>
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-3 text-center">
                      <p className="text-purple-400 text-xs mb-1">🎯 จุดขาย</p>
                      <p className="text-purple-300 text-lg font-bold">
                        {formatUSD(sellTarget)}
                      </p>
                      <p className="text-purple-500/70 text-[10px]">
                        ใกล้แนวต้าน
                      </p>
                    </div>
                  </div>

                  {/* Signals Detail */}
                  <div className="bg-gray-800/50 rounded-xl p-4">
                    <p className="text-gray-400 text-xs mb-3">
                      📊 รายละเอียดสัญญาณ
                    </p>
                    <div className="space-y-3">
                      {signals.map((signal, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border ${
                            signal.type === "good"
                              ? "bg-green-900/20 border-green-500/30"
                              : signal.type === "bad"
                                ? "bg-red-900/20 border-red-500/30"
                                : "bg-yellow-900/20 border-yellow-500/30"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span>{signal.icon}</span>
                            <span
                              className={`font-medium ${
                                signal.type === "good"
                                  ? "text-green-400"
                                  : signal.type === "bad"
                                    ? "text-red-400"
                                    : "text-yellow-400"
                              }`}
                            >
                              {signal.title}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm pl-6">
                            {signal.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Disclaimer */}
                  <p className="text-gray-500 text-[10px] mt-3 text-center">
                    ⚠️ ข้อมูลนี้เป็นเพียงการวิเคราะห์ทางเทคนิค
                    ไม่ใช่คำแนะนำการลงทุน ควรศึกษาข้อมูลเพิ่มเติมก่อนตัดสินใจ
                  </p>
                </div>
              );
            })()}

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

            {/* Support/Resistance */}
            {stockData.support && stockData.resistance && (
              <div className="mb-6 p-4 bg-gray-800/50 rounded-xl">
                <p className="text-gray-400 text-sm mb-3">📊 แนวรับ/ต้าน</p>
                <div className="relative">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>แนวรับ</span>
                    <span>แนวต้าน</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-red-500 opacity-30"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-green-400">
                      {formatUSD(stockData.support)}
                    </span>
                    <span className="text-purple-400">
                      {formatUSD(stockData.currentPrice)}
                    </span>
                    <span className="text-red-400">
                      {formatUSD(stockData.resistance)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Moving Averages */}
            {(stockData.ma20 || stockData.ma50 || stockData.ma200) && (
              <div className="mb-6 p-4 bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-gray-400 text-sm">📈 Moving Averages</p>
                  {stockData.maSignal && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        stockData.maSignal === "bullish"
                          ? "bg-green-500/20 text-green-400"
                          : stockData.maSignal === "bearish"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                      }`}
                    >
                      {stockData.maSignal === "bullish"
                        ? "🐂 ขาขึ้น"
                        : stockData.maSignal === "bearish"
                          ? "🐻 ขาลง"
                          : "➡️ Sideway"}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {stockData.ma20 && (
                    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-500 text-[10px] mb-1">EMA 20</p>
                      <p
                        className={`font-medium ${stockData.currentPrice > stockData.ma20 ? "text-green-400" : "text-red-400"}`}
                      >
                        {formatUSD(stockData.ma20)}
                      </p>
                      <p
                        className={`text-[10px] ${stockData.currentPrice > stockData.ma20 ? "text-green-500" : "text-red-500"}`}
                      >
                        {stockData.currentPrice > stockData.ma20
                          ? "▲ Above"
                          : "▼ Below"}
                      </p>
                    </div>
                  )}
                  {stockData.ma50 && (
                    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-500 text-[10px] mb-1">SMA 50</p>
                      <p
                        className={`font-medium ${stockData.currentPrice > stockData.ma50 ? "text-green-400" : "text-red-400"}`}
                      >
                        {formatUSD(stockData.ma50)}
                      </p>
                      <p
                        className={`text-[10px] ${stockData.currentPrice > stockData.ma50 ? "text-green-500" : "text-red-500"}`}
                      >
                        {stockData.currentPrice > stockData.ma50
                          ? "▲ Above"
                          : "▼ Below"}
                      </p>
                    </div>
                  )}
                  {stockData.ma200 && (
                    <div className="text-center p-2 bg-gray-700/50 rounded-lg">
                      <p className="text-gray-500 text-[10px] mb-1">SMA 200</p>
                      <p
                        className={`font-medium ${stockData.currentPrice > stockData.ma200 ? "text-green-400" : "text-red-400"}`}
                      >
                        {formatUSD(stockData.ma200)}
                      </p>
                      <p
                        className={`text-[10px] ${stockData.currentPrice > stockData.ma200 ? "text-green-500" : "text-red-500"}`}
                      >
                        {stockData.currentPrice > stockData.ma200
                          ? "▲ Above"
                          : "▼ Below"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RSI & MACD */}
            {(stockData.rsi !== undefined || stockData.macd !== undefined) && (
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-gray-400 text-sm mb-3">📊 RSI & MACD</p>
                <div className="grid grid-cols-2 gap-4">
                  {/* RSI */}
                  {stockData.rsi !== undefined && (
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-xs">RSI (14)</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stockData.rsiSignal === "overbought"
                              ? "bg-red-500/20 text-red-400"
                              : stockData.rsiSignal === "oversold"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {stockData.rsiSignal === "overbought"
                            ? "🔴 Overbought"
                            : stockData.rsiSignal === "oversold"
                              ? "🟢 Oversold"
                              : "⚪ Normal"}
                        </span>
                      </div>
                      <p
                        className={`text-2xl font-bold text-center ${
                          stockData.rsi >= 70
                            ? "text-red-400"
                            : stockData.rsi <= 30
                              ? "text-green-400"
                              : "text-white"
                        }`}
                      >
                        {stockData.rsi.toFixed(1)}
                      </p>
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              stockData.rsi >= 70
                                ? "bg-red-500"
                                : stockData.rsi <= 30
                                  ? "bg-green-500"
                                  : "bg-blue-500"
                            }`}
                            style={{ width: `${stockData.rsi}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                          <span>0</span>
                          <span>30</span>
                          <span>70</span>
                          <span>100</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MACD */}
                  {stockData.macd !== undefined && (
                    <div className="bg-gray-700/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-500 text-xs">MACD</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            stockData.macdTrend === "bullish"
                              ? "bg-green-500/20 text-green-400"
                              : stockData.macdTrend === "bearish"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {stockData.macdTrend === "bullish"
                            ? "🐂 Bullish"
                            : stockData.macdTrend === "bearish"
                              ? "🐻 Bearish"
                              : "➡️ Neutral"}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">MACD</span>
                          <span
                            className={
                              stockData.macd >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {stockData.macd.toFixed(2)}
                          </span>
                        </div>
                        {stockData.macdSignal !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Signal</span>
                            <span className="text-yellow-400">
                              {stockData.macdSignal.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {stockData.macdHistogram !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Histogram</span>
                            <span
                              className={
                                stockData.macdHistogram >= 0
                                  ? "text-green-400"
                                  : "text-red-400"
                              }
                            >
                              {stockData.macdHistogram >= 0 ? "+" : ""}
                              {stockData.macdHistogram.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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

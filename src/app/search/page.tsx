"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { StockPrice, MacroData } from "@/types/stock";
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

export default function SearchPage() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [stockData, setStockData] = useState<StockPrice | null>(null);
  const [macroData, setMacroData] = useState<MacroDataExtended | null>(null);
  const [insiderSocialData, setInsiderSocialData] =
    useState<InsiderSocialData | null>(null);
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
    setMacroData(null);
    setInsiderSocialData(null);

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

              // 🧠 ตรวจจับสถานการณ์ Overbought + Euphoria (ลด threshold เป็น 75)
              const isOverbought =
                stockData.rsi !== undefined && stockData.rsi > 75;
              const isVeryOverbought =
                stockData.rsi !== undefined && stockData.rsi > 85;
              const buzzScore = insiderSocialData?.social?.buzzScore || 0;

              // 🆕 ตรวจสอบ Tier 1 News (สำคัญที่สุด!)
              const tier1Count = insiderSocialData?.social?.tier1Count || 0;
              const hasTier1 = tier1Count >= 1;
              const rsiValue = stockData.rsi || 50;
              const rsiSafe = rsiValue <= 70;
              const buzzHigh = buzzScore > 80;

              // 🆕 Logic ใหม่: Tier 1 มีความสำคัญกว่า Buzz Score
              const isEuphoria = !hasTier1 && buzzScore >= 90; // ถ้ามี Tier 1 ไม่ถือว่า Euphoria
              const isHighRisk = isOverbought || isEuphoria;

              // 📈 Trend Filter: เช็คว่าราคายืนเหนือ SMA50 ไหม?
              const sma50 = stockData.ma50;
              const isStrongTrend = sma50
                ? stockData.currentPrice > sma50
                : true;
              const trendPercent = sma50
                ? ((stockData.currentPrice - sma50) / sma50) * 100
                : 0;

              // 💰 คำนวณ Position Sizing แนะนำ (God Tier Logic + Trend Filter)
              let positionSize: number; // เปอร์เซ็นต์ของพอร์ต
              let positionRisk: "low" | "medium" | "high" | "extreme";
              let positionReason: string;

              // 🧠 New Logic: Tier 1 Sources + Trend Filter
              if (hasTier1 && rsiSafe && isStrongTrend) {
                // ✅ CASE A: Perfect Storm - Tier 1 + RSI Safe + Uptrend
                positionSize = 15;
                positionRisk = "low";
                positionReason = `🔥 Perfect Storm! Tier 1 (${tier1Count}) + RSI ${rsiValue.toFixed(0)} + ยืนเหนือ SMA50 (+${trendPercent.toFixed(1)}%) จัดหนัก!`;
              } else if (hasTier1 && rsiSafe && !isStrongTrend) {
                // ⚠️ CASE B: The Discount - Tier 1 + RSI Safe แต่กราฟย่อ
                positionSize = 7;
                positionRisk = "medium";
                positionReason = `💡 Tier 1 ข่าวดี + RSI Safe แต่ราคาต่ำกว่า SMA50 (${trendPercent.toFixed(1)}%) ซื้อถัวรอกราฟกลับ`;
              } else if (hasTier1 && !rsiSafe && !isVeryOverbought) {
                // ⚠️ มี Tier 1 แต่ RSI > 70 = Buy on Dip
                positionSize = 5;
                positionRisk = "medium";
                positionReason = `พบ Tier 1 ข่าวดีจริง แต่ RSI ${rsiValue.toFixed(0)} แพงไปหน่อย รอย่อ`;
              } else if (isVeryOverbought) {
                // 🚫 RSI > 85 = ไม่เข้า
                positionSize = 0;
                positionRisk = "extreme";
                positionReason = `RSI ${rsiValue.toFixed(0)} สูงมาก! แม้มีข่าวดี ก็ไม่ควรไล่ราคา`;
              } else if (!hasTier1 && buzzHigh) {
                // ⚠️ ข่าวเยอะแต่ไม่มี Tier 1 = ข่าวปั่น!
                positionSize = 2;
                positionRisk = "high";
                positionReason = `⚠️ Buzz สูงแต่ไม่พบข่าว Tier 1 ระวังข่าวปั่น FOMO!`;
              } else if (bullishPercent >= 70 && rsiSafe && isStrongTrend) {
                // ✅ สัญญาณ Bullish + RSI ดี + Uptrend
                positionSize = 12;
                positionRisk = "low";
                positionReason = `สัญญาณ Bullish ${bullishPercent.toFixed(0)}% + RSI Safe + Uptrend เข้าได้ 10-12%`;
              } else if (bullishPercent >= 55 && isStrongTrend) {
                positionSize = 8;
                positionRisk = "medium";
                positionReason = "สัญญาณปานกลาง + Uptrend แนะนำ 5-8%";
              } else if (bullishPercent >= 55 && !isStrongTrend) {
                positionSize = 5;
                positionRisk = "medium";
                positionReason = "สัญญาณดีแต่กราฟย่อ ซื้อถัว 5% รอกลับตัว";
              } else {
                positionSize = 3;
                positionRisk = "high";
                positionReason = "สัญญาณอ่อน แนะนำ 3% หรือรอดูก่อน";
              }

              let recommendation:
                | "strong_buy"
                | "buy"
                | "hold"
                | "sell"
                | "strong_sell"
                | "wait_dip";
              let recommendationText: string;
              let recommendationColor: string;
              let recommendationIcon: string;
              let warningMessage: string | null = null;

              // 🚩 Logic Override: ถ้าหุ้นร้อนแรงเกินไป แม้ Bullish ก็ต้องระวัง (RSI > 75)
              if (isHighRisk && bullishPercent >= 55) {
                // แม้สัญญาณ Bullish แต่ RSI > 75 หรือ Buzz >= 90 = ไม่ควรไล่ซื้อ
                recommendation = "wait_dip";
                recommendationText = "ถือ / รอย่อ";
                recommendationColor = "from-amber-500 to-yellow-500";
                recommendationIcon = "⏳";

                if (isOverbought && isEuphoria) {
                  warningMessage = `⚠️ RSI สูง ${stockData.rsi?.toFixed(0)} + Buzz ${buzzScore}! อย่าไล่ราคา รอจังหวะย่อตัว`;
                } else if (isOverbought) {
                  warningMessage = `⚠️ RSI สูง ${stockData.rsi?.toFixed(0)} (>75) หุ้นร้อนแรงมาก ระวังแรงขายทำกำไร`;
                } else {
                  warningMessage = `⚠️ Buzz ${buzzScore}/100 ข่าวออกเยอะมาก! ระวัง FOMO`;
                }
              } else if (bullishPercent >= 75) {
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

                  {/* 🤖 AI TACTICAL COMMAND */}
                  {stockData.ema5 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-900 rounded-2xl border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10">
                      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-cyan-500/30">
                        <span className="text-2xl">🤖</span>
                        <div>
                          <h3 className="text-cyan-400 font-bold text-lg">
                            AI TACTICAL COMMAND
                          </h3>
                          <p className="text-gray-500 text-xs">
                            คำแนะนำเฉพาะสถานะของคุณ
                          </p>
                        </div>
                      </div>

                      {(() => {
                        // Calculate tactical data
                        const ema5Val =
                          stockData.ema5 || stockData.currentPrice;
                        const rsiVal = stockData.rsi || 50;
                        const trendUp = stockData.ma50
                          ? stockData.currentPrice > stockData.ma50
                          : true;
                        const priceAboveEma5 = stockData.currentPrice > ema5Val;
                        const distanceFromEma5 =
                          ((stockData.currentPrice - ema5Val) / ema5Val) * 100;
                        const volHigh =
                          stockData.volumeSignal === "strong" ||
                          (stockData.volumeChangePercent || 0) > 0;

                        // 1. Logic for NEW BUYERS 🛒
                        let newBuyerStatus = "";
                        let newBuyerColor = "";
                        let newBuyerIcon = "";
                        let newBuyerAdvice = "";

                        if (trendUp && rsiVal < 50) {
                          newBuyerStatus = "🟢 เข้าได้เลย (Strong Buy)";
                          newBuyerColor = "text-green-400";
                          newBuyerIcon = "✅";
                          newBuyerAdvice = `ราคาและโมเมนตัมกำลังสวย RSI ${rsiVal.toFixed(0)} + ยืนเหนือเส้น 50 วัน เข้าได้ตาม Position Size!`;
                        } else if (trendUp && rsiVal > 75) {
                          newBuyerStatus = "🟡 รอจังหวะย่อ (Wait on Dip)";
                          newBuyerColor = "text-yellow-400";
                          newBuyerIcon = "⏳";
                          newBuyerAdvice = `อย่าไล่ราคา! RSI ${rsiVal.toFixed(0)} สูงเกินไป ตั้งรอที่ ${formatUSD(ema5Val)} (EMA5) จะได้เปรียบกว่า`;
                        } else if (trendUp && rsiVal >= 50) {
                          newBuyerStatus = "🟡 ระวังหน่อย (Caution)";
                          newBuyerColor = "text-yellow-400";
                          newBuyerIcon = "⚠️";
                          newBuyerAdvice = `RSI ${rsiVal.toFixed(0)} เริ่มสูง แนะนำรอราคาย่อลงมาใกล้ ${formatUSD(ema5Val)} แล้วค่อยเข้า`;
                        } else {
                          newBuyerStatus = "🔴 ห้ามเข้า! (Don't Catch Knife)";
                          newBuyerColor = "text-red-400";
                          newBuyerIcon = "❌";
                          newBuyerAdvice = `เป็นขาลง ราคาต่ำกว่า SMA50 รอให้กลับไปยืนเหนือเส้น 50 วันก่อน`;
                        }

                        // 2. Logic for HOLDERS 💎
                        let holderStatus = "";
                        let holderColor = "";
                        let holderIcon = "";
                        let holderAdvice = "";

                        if (priceAboveEma5 && volHigh) {
                          holderStatus = "🔥 ถือต่อ 100% (Strong Hold)";
                          holderColor = "text-green-400";
                          holderIcon = "💎";
                          holderAdvice = `Volume ยังพีคและราคายืนเหนือ EMA5 สบายๆ ห้ามขายหมูเด็ดขาด! เลื่อน Stop Loss ตามมาที่ ${formatUSD(ema5Val)}`;
                        } else if (priceAboveEma5 && !volHigh) {
                          holderStatus =
                            "⚠️ ถือได้แต่ระวัง (Hold with Caution)";
                          holderColor = "text-yellow-400";
                          holderIcon = "👀";
                          holderAdvice = `ราคายังเหนือ EMA5 แต่แรงซื้อเริ่มแผ่ว จับตาดูเส้น ${formatUSD(ema5Val)} ถ้าหลุดให้เตรียมขาย`;
                        } else {
                          holderStatus = "🚨 หนี! ขายทันที (Take Profit)";
                          holderColor = "text-red-400";
                          holderIcon = "🏃";
                          holderAdvice = `โมเมนตัมเสียแล้ว! ราคาหลุด EMA5 (${formatUSD(ema5Val)}) ขายล็อกกำไรทันที ก่อนลงไปมากกว่านี้`;
                        }

                        // 3. Logic for PYRAMIDERS 🧱
                        let pyramidStatus = "";
                        let pyramidColor = "";
                        let pyramidIcon = "";
                        let pyramidAdvice = "";

                        if (!priceAboveEma5) {
                          // 🔴 ราคาหลุด EMA5 = ห้ามเติม
                          pyramidStatus = "🔴 ห้ามเติม! (Don't Add)";
                          pyramidColor = "text-red-400";
                          pyramidIcon = "⛔";
                          pyramidAdvice = `ราคาหลุด EMA5 (${formatUSD(ema5Val)}) โมเมนตัมเสียแล้ว การเติมตอนนี้คือการถัวขาลง (อันตราย!)`;
                        } else if (priceAboveEma5 && !volHigh) {
                          // ⚠️ ราคายืนได้แต่ Volume แห้ง = รอก่อน
                          pyramidStatus = "⚠️ รอก่อน (Wait)";
                          pyramidColor = "text-yellow-400";
                          pyramidIcon = "⏳";
                          pyramidAdvice = `ราคายืนเหนือ EMA5 ได้ แต่ Volume แห้ง ระวัง False Break รอให้มี Volume ยืนยันก่อน`;
                        } else {
                          // 🟢 ราคาเหนือ EMA5 + Volume ดี = เติมได้
                          pyramidStatus = "🟢 เติมได้ (Pyramid Up)";
                          pyramidColor = "text-green-400";
                          pyramidIcon = "➕";
                          pyramidAdvice = `ราคายืนเหนือ EMA5 + Volume ยืนยัน เติมได้เลย! ตั้ง Stop Loss ที่ ${formatUSD(ema5Val)}`;
                        }

                        return (
                          <div className="space-y-4">
                            {/* New Buyers */}
                            <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{newBuyerIcon}</span>
                                <span className="text-gray-400 text-sm">
                                  👤 สำหรับคน &quot;ว่างพอร์ต&quot; (New Entry)
                                </span>
                              </div>
                              <p className={`font-bold ${newBuyerColor}`}>
                                {newBuyerStatus}
                              </p>
                              <p className="text-gray-400 text-sm mt-1">
                                {newBuyerAdvice}
                              </p>
                            </div>

                            {/* Holders */}
                            <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{holderIcon}</span>
                                <span className="text-gray-400 text-sm">
                                  👤 สำหรับคน &quot;มีของแล้ว&quot; (Profit Run)
                                </span>
                              </div>
                              <p className={`font-bold ${holderColor}`}>
                                {holderStatus}
                              </p>
                              <p className="text-gray-400 text-sm mt-1">
                                {holderAdvice}
                              </p>
                            </div>

                            {/* Pyramiders */}
                            <div className="p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">{pyramidIcon}</span>
                                <span className="text-gray-400 text-sm">
                                  👤 สำหรับคน &quot;จะเติมของ&quot; (Sniper
                                  Add-on)
                                </span>
                              </div>
                              <p className={`font-bold ${pyramidColor}`}>
                                {pyramidStatus}
                              </p>
                              <p className="text-gray-400 text-sm mt-1">
                                {pyramidAdvice}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

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

                  {/* 🚩 Warning Message for High Risk */}
                  {warningMessage && (
                    <div className="p-3 mb-4 bg-amber-900/40 border border-amber-500/50 rounded-xl">
                      <p className="text-amber-200 text-sm font-medium">
                        {warningMessage}
                      </p>
                      <p className="text-amber-400/70 text-xs mt-1">
                        💡 Tip: ถ้าถืออยู่แล้ว ให้ถือต่อ (Let profit run)
                        ถ้ายังไม่ถือ รอราคาย่อก่อนค่อยเข้า
                      </p>
                    </div>
                  )}

                  {/* 💰 Position Sizing Recommendation */}
                  <div
                    className={`p-4 rounded-xl mb-4 border ${
                      positionRisk === "extreme"
                        ? "bg-red-900/30 border-red-500/50"
                        : positionRisk === "high"
                          ? "bg-orange-900/30 border-orange-500/50"
                          : positionRisk === "low"
                            ? "bg-green-900/30 border-green-500/50"
                            : "bg-blue-900/30 border-blue-500/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {positionRisk === "extreme"
                            ? "🚫"
                            : positionRisk === "high"
                              ? "⚠️"
                              : positionRisk === "low"
                                ? "✅"
                                : "💰"}
                        </span>
                        <div>
                          <p className="text-white text-sm font-medium">
                            Position Sizing แนะนำ
                          </p>
                          <p
                            className={`text-xs ${
                              positionRisk === "extreme"
                                ? "text-red-400"
                                : positionRisk === "high"
                                  ? "text-orange-400"
                                  : positionRisk === "low"
                                    ? "text-green-400"
                                    : "text-blue-400"
                            }`}
                          >
                            {positionReason}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-2xl font-bold ${
                            positionRisk === "extreme"
                              ? "text-red-400"
                              : positionRisk === "high"
                                ? "text-orange-400"
                                : positionRisk === "low"
                                  ? "text-green-400"
                                  : "text-blue-400"
                          }`}
                        >
                          {positionSize}%
                        </p>
                        <p className="text-gray-500 text-xs">ของพอร์ต</p>
                      </div>
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

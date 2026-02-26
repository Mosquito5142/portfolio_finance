"use client";

import { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Save,
  AlertTriangle,
  RefreshCw,
  DollarSign,
} from "lucide-react";

interface PortfolioRow {
  rowIndex: number;
  date: string;
  ticker: string;
  action: string;
  quantity: number;
  price: number;
  cutLoss: number;
  target: number;
  soldDate: string;
  soldQty: number;
  soldPrice: number;
  status: string;
  // Merged live data
  livePrice?: number;
  liveChangePercent?: number;
}

export default function PortfolioTracker() {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY">("ACTIVE");
  const [portfolioData, setPortfolioData] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Currency State
  const [currency, setCurrency] = useState<"USD" | "THB">("THB");
  const [usdtRate, setUsdtRate] = useState<number>(34.5); // Default fallback

  // Form State
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [cutLoss, setCutLoss] = useState("");
  const [target, setTarget] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState<number | null>(null);
  const [sellQty, setSellQty] = useState<{ [key: number]: string }>({});
  const [sellPrice, setSellPrice] = useState<{ [key: number]: string }>({});
  const [sortBy, setSortBy] = useState<string>("date_desc");

  useEffect(() => {
    fetchExchangeRate();
    fetchPortfolioData();
  }, []);

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (res.ok) {
        const data = await res.json();
        if (data.rates && data.rates.THB) {
          setUsdtRate(data.rates.THB);
        }
      }
    } catch (e) {
      console.warn("Could not fetch exchange rate, using default 34.5");
    }
  };

  const fetchPortfolioData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets/portfolio", { cache: "no-store" });
      if (!res.ok) throw new Error("ดึงข้อมูลพอร์ตไม่สำเร็จ");
      const json = await res.json();

      if (json.status === "success" && json.data) {
        const rows: PortfolioRow[] = json.data;

        // แยก Active เพื่อไปดึงราคาปัจจุบัน
        const activeRows = rows.filter((r) => r.status !== "CLOSED");

        const tickers = Array.from(
          new Set(
            activeRows.filter((r) => r.ticker !== "CASH").map((r) => r.ticker),
          ),
        ).join(",");

        let livePrices: Record<string, any> = {};

        // Fetch Live Prices via existing working /api/prices endpoint
        if (tickers) {
          try {
            const liveRes = await fetch(`/api/prices?symbols=${tickers}`);
            if (liveRes.ok) {
              const liveJson = await liveRes.json();
              Object.keys(liveJson).forEach((symbol) => {
                livePrices[symbol] = {
                  price: liveJson[symbol].currentPrice,
                  changePercent: liveJson[symbol].dayChangePercent,
                };
              });
            }
          } catch (e) {
            console.error("Failed to fetch live prices", e);
          }
        }

        // Merge Live Prices back into data
        const mergedData = rows.map((r) => {
          if (r.ticker === "CASH") {
            return {
              ...r,
              livePrice: r.price, // Cash USD value is 1-to-1 with its entry
              liveChangePercent: 0,
            };
          }
          if (r.status !== "CLOSED" && livePrices[r.ticker]) {
            return {
              ...r,
              livePrice: livePrices[r.ticker].price,
              liveChangePercent: livePrices[r.ticker].changePercent,
            };
          }
          return r;
        });

        setPortfolioData(mergedData);
      } else {
        throw new Error(json.message || "ไม่พบข้อมูลพอร์ตโฟลิโอ");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price || !cutLoss || !target) return;

    setSubmitLoading(true);
    try {
      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const res = await fetch("/api/sheets/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "PORTFOLIO_BUY",
          item: {
            date: dateStr,
            ticker: ticker.toUpperCase(),
            quantity: Number(quantity),
            price: Number(price),
            cut: Number(cutLoss),
            target: Number(target),
          },
        }),
      });

      if (res.ok) {
        setTicker("");
        setQuantity("");
        setPrice("");
        setCutLoss("");
        setTarget("");
        await fetchPortfolioData();
      } else {
        alert("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการติดต่อกับเซิร์ฟเวอร์");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSellTrade = async (
    rowIndex: number,
    ticker: string,
    buyQty: number,
  ) => {
    const sQty = Number(sellQty[rowIndex]);
    const sPrice = Number(sellPrice[rowIndex]);

    if (!sQty || !sPrice) {
      alert("กรุณากรอกจำนวนหุ้นและราคาที่ขายให้ครบถ้วน");
      return;
    }

    if (sQty > buyQty) {
      alert(`จำนวนหุ้นที่ขาย (${sQty}) มากกว่าจำนวนที่มีจริง (${buyQty})`);
      return;
    }

    const confirmSale = confirm(
      `ยืนยันการขาย ${ticker} จำนวน ${sQty} หุ้น ที่ราคา ${formatCurrency(sPrice)} ดอลลาร์ ใช่หรือไม่?`,
    );
    if (!confirmSale) return;

    setSellLoading(rowIndex);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/sheets/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "PORTFOLIO_SELL",
          item: {
            rowIndex: rowIndex,
            soldDate: dateStr,
            soldQty: sQty,
            soldPrice: sPrice,
          },
        }),
      });

      if (res.ok) {
        setSellQty((prev) => {
          const newState = { ...prev };
          delete newState[rowIndex];
          return newState;
        });
        setSellPrice((prev) => {
          const newState = { ...prev };
          delete newState[rowIndex];
          return newState;
        });
        await fetchPortfolioData();
      } else {
        alert("บันทึกการขายไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการทำรายการขาย");
    } finally {
      setSellLoading(null);
    }
  };

  // derived data
  let actives = portfolioData.filter((r) => r.status !== "CLOSED");
  const histories = portfolioData.filter(
    (r) => r.status === "CLOSED" || r.status === "PARTIAL_SOLD",
  );

  // Apply sorting
  actives.sort((a, b) => {
    const aQty = a.quantity - (a.soldQty || 0);
    const bQty = b.quantity - (b.soldQty || 0);
    const aPrice = a.livePrice || a.price;
    const bPrice = b.livePrice || b.price;
    const aValue = aPrice * aQty;
    const bValue = bPrice * bQty;
    const aPnlPct = ((aPrice - a.price) / a.price) * 100;
    const bPnlPct = ((bPrice - b.price) / b.price) * 100;

    switch (sortBy) {
      case "value_desc":
        return bValue - aValue;
      case "value_asc":
        return aValue - bValue;
      case "pnl_desc":
        return bPnlPct - aPnlPct;
      case "pnl_asc":
        return aPnlPct - bPnlPct;
      case "name_asc":
        return a.ticker.localeCompare(b.ticker);
      case "date_desc":
      default:
        return b.rowIndex - a.rowIndex;
    }
  });

  let totalInvestedUSD = 0;
  let totalCurrentValueUSD = 0;

  actives.forEach((item) => {
    const holdingQty = item.quantity - (item.soldQty || 0); // Remaining
    totalInvestedUSD += holdingQty * item.price;
    if (item.livePrice) {
      totalCurrentValueUSD += holdingQty * item.livePrice;
    } else {
      totalCurrentValueUSD += holdingQty * item.price; // fallback if no live price
    }
  });

  const unrealizedPnLUSD = totalCurrentValueUSD - totalInvestedUSD;
  const unrealizedPnLPct =
    totalInvestedUSD > 0 ? (unrealizedPnLUSD / totalInvestedUSD) * 100 : 0;

  let realizedPnLUSD = 0;
  let winCount = 0;
  let lossCount = 0;

  histories.forEach((item) => {
    if (item.soldQty && item.soldPrice) {
      const pnl = (item.soldPrice - item.price) * item.soldQty;
      realizedPnLUSD += pnl;
      if (pnl > 0) winCount++;
      else if (pnl < 0) lossCount++;
    }
  });

  const totalClosedTrades = winCount + lossCount;
  const winRate =
    totalClosedTrades > 0 ? (winCount / totalClosedTrades) * 100 : 0;

  // Currency Converter Formatter (For PnL & Global Summaries)
  const formatCurrency = (valUSD: number) => {
    const converted = currency === "THB" ? valUSD * usdtRate : valUSD;
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };
  const getSymbol = () => (currency === "THB" ? "฿" : "$");

  // Strict USD Formatter (For Stock Prices and Position Values)
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // --- Portfolio Composition Data ---
  const compositionData = actives
    .map((item) => {
      const holdingQty = item.quantity - (item.soldQty || 0);
      const currentPrice = item.livePrice || item.price;
      const usdValue = currentPrice * holdingQty;
      return {
        name: item.ticker,
        value: usdValue,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#f97316", // orange-500
    "#84cc16", // lime-500
    "#6366f1", // indigo-500
    "#ef4444", // red-500
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans pt-24 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Setup */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center gap-3">
              <Briefcase size={32} className="text-emerald-500" />
              พอร์ตการลงทุน (Portfolio)
            </h1>
            <p className="text-slate-400 mt-2">
              ติดตามมูลค่าพอร์ต สถานะจุดตัดขาดทุน/ทำกำไร และประวัติการซื้อขาย 📈
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0">
            {/* Currency Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-700/50 rounded-lg p-1">
              <button
                onClick={() => setCurrency("THB")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  currency === "THB"
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                THB (บาท)
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                  currency === "USD"
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                USD (ดอลลาร์)
              </button>
            </div>
            {/* Refresh Data */}
            <button
              onClick={fetchPortfolioData}
              disabled={loading}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-sm px-4 py-2 border border-slate-700 rounded-lg flex items-center gap-2 transition-all"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              รีเฟรชข้อมูล
            </button>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative">
            <span className="absolute top-4 right-4 text-slate-700">
              <Briefcase size={20} />
            </span>
            <p className="text-slate-400 text-sm font-medium">เงินลงทุนสุทธิ</p>
            <p className="text-2xl font-bold text-white mt-1">
              {getSymbol()}
              {formatCurrency(totalInvestedUSD)}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
            <div
              className={`absolute top-0 right-0 w-16 h-16 blur-2xl rounded-full ${
                unrealizedPnLUSD >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}
            ></div>
            <p className="text-slate-400 text-sm font-medium">
              กำไร/ขาดทุน ที่ยังไม่รับรู้
            </p>
            <div className="flex items-end gap-2 mt-1">
              <p
                className={`text-2xl font-bold ${
                  unrealizedPnLUSD >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {unrealizedPnLUSD >= 0 ? "+" : ""}
                {getSymbol()}
                {formatCurrency(unrealizedPnLUSD)}
              </p>
              <span
                className={`text-sm mb-1 font-bold ${
                  unrealizedPnLPct >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                ({unrealizedPnLPct >= 0 ? "+" : ""}
                {unrealizedPnLPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
            <div
              className={`absolute top-0 right-0 w-16 h-16 blur-2xl rounded-full ${
                realizedPnLUSD >= 0 ? "bg-amber-500/20" : "bg-red-500/20"
              }`}
            ></div>
            <p className="text-slate-400 text-sm font-medium">
              กำไร/ขาดทุน ที่รับรู้แล้ว (Realized)
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                realizedPnLUSD >= 0 ? "text-amber-400" : "text-red-400"
              }`}
            >
              {realizedPnLUSD >= 0 ? "+" : ""}
              {getSymbol()}
              {formatCurrency(realizedPnLUSD)}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <p className="text-slate-400 text-sm font-medium">Win Rate</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-white">
                {winRate.toFixed(1)}%
              </p>
              <span className="text-xs text-slate-400">
                ({winCount} ชนะ - {lossCount} แพ้)
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-4 border-b border-slate-800 justify-between items-center">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("ACTIVE")}
                  className={`pb-3 text-sm font-bold px-4 border-b-2 transition-colors ${
                    activeTab === "ACTIVE"
                      ? "border-emerald-500 text-emerald-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  กำลังถือครอง ({actives.length})
                </button>
                <button
                  onClick={() => setActiveTab("HISTORY")}
                  className={`pb-3 text-sm font-bold px-4 border-b-2 transition-colors ${
                    activeTab === "HISTORY"
                      ? "border-amber-500 text-amber-400"
                      : "border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  ประวัติการซื้อขาย
                </button>
              </div>

              {activeTab === "ACTIVE" && (
                <div className="pb-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="date_desc">ล่าสุด</option>
                    <option value="value_desc">มูลค่ารวม (มากไปน้อย)</option>
                    <option value="value_asc">มูลค่ารวม (น้อยไปมาก)</option>
                    <option value="pnl_desc">% กำไร (มากไปน้อย)</option>
                    <option value="pnl_asc">% ขาดทุน (น้อยไปมาก)</option>
                    <option value="name_asc">ชื่อหุ้น (A-Z)</option>
                  </select>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-20 text-slate-500 animate-pulse">
                กำลังดึงข้อมูลพอร์ตโฟลิโอ...
              </div>
            ) : error ? (
              <div className="text-center py-10 text-red-400 bg-red-900/10 rounded-xl border border-red-900/50">
                <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
                {error}
              </div>
            ) : activeTab === "ACTIVE" ? (
              <div className="space-y-4">
                {actives.length === 0 && (
                  <div className="text-center py-16 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/50 border-dashed">
                    ไม่พบข้อมูลหุ้นที่ถือครอง ลองบันทึกประวัติการซื้อสิ!
                  </div>
                )}
                {actives.map((item) => {
                  const holdingQty = item.quantity - (item.soldQty || 0);
                  const currentPrice = item.livePrice || item.price;
                  const pnl = (currentPrice - item.price) * holdingQty;
                  const pnlPct =
                    ((currentPrice - item.price) / item.price) * 100;
                  const isProfit = pnl >= 0;

                  // Distance calculations
                  const toTarget =
                    ((item.target - currentPrice) / currentPrice) * 100;
                  const toCutloss =
                    ((currentPrice - item.cutLoss) / currentPrice) * 100; // positive means still buffer left

                  return (
                    <div
                      key={item.rowIndex}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black tracking-tight text-white">
                              {item.ticker}
                            </h3>
                            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md">
                              {holdingQty} หุ้น
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-2">
                            ราคาเข้า:{" "}
                            <span className="text-slate-300 font-bold">
                              ${formatUSD(item.price)}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            มูลค่าตอนซื้อ: {getSymbol()}
                            {formatCurrency(item.price * holdingQty)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400 mb-0.5">
                            ราคาปัจจุบัน
                          </p>
                          <p className="text-xl font-bold text-white leading-none">
                            ${formatUSD(currentPrice)}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 mb-2">
                            มูลค่าตอนนี้:{" "}
                            <span className="text-slate-200">
                              {getSymbol()}
                              {formatCurrency(currentPrice * holdingQty)}
                            </span>
                          </p>
                          {item.ticker !== "CASH" && (
                            <p
                              className={`text-sm font-bold flex items-center justify-end gap-1 ${
                                isProfit ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {isProfit ? (
                                <TrendingUp size={14} />
                              ) : (
                                <TrendingDown size={14} />
                              )}
                              {pnlPct.toFixed(2)}% ({isProfit ? "+" : ""}
                              {getSymbol()}
                              {formatCurrency(pnl)})
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Thermometer / Risk Bar */}
                      {item.ticker !== "CASH" && (
                        <div className="mt-4 mb-3">
                          <div className="flex justify-between text-xs font-medium mb-1">
                            <span className="text-red-400 flex items-center gap-1">
                              <span>จุดคัท</span> ${formatUSD(item.cutLoss)} (-
                              {(
                                ((item.price - item.cutLoss) / item.price) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                            <span className="text-emerald-400 flex items-center gap-1">
                              <span>เป้าหมาย</span> ${formatUSD(item.target)} (+
                              {(
                                ((item.target - item.price) / item.price) *
                                100
                              ).toFixed(1)}
                              %)
                            </span>
                          </div>
                          <div className="relative w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
                            {/* We try to map current price visually between Cut and Target */}
                            {(() => {
                              const range = item.target - item.cutLoss;
                              let currentPos =
                                ((currentPrice - item.cutLoss) / range) * 100;
                              let entryPos =
                                ((item.price - item.cutLoss) / range) * 100;
                              currentPos = Math.max(
                                0,
                                Math.min(100, currentPos),
                              );
                              entryPos = Math.max(0, Math.min(100, entryPos));
                              return (
                                <>
                                  {/* Background Red to Green */}
                                  <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-red-600/20 to-transparent"></div>
                                  <div className="absolute top-0 bottom-0 right-0 w-1/3 bg-gradient-to-l from-emerald-600/20 to-transparent"></div>
                                  {/* Entry Marker */}
                                  <div
                                    className="absolute top-0 bottom-0 w-[2px] bg-slate-500 z-10"
                                    style={{ left: `${entryPos}%` }}
                                  ></div>
                                  {/* Current Price Dot */}
                                  <div
                                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full z-20 shadow-[0_0_10px_rgba(0,255,100,0.8)]"
                                    style={{
                                      left: `calc(${currentPos}% - 6px)`,
                                      backgroundColor: isProfit
                                        ? "#34d399"
                                        : "#f87171",
                                    }}
                                  ></div>
                                </>
                              );
                            })()}
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>
                              {toCutloss > 0
                                ? `เหลืออีก ${toCutloss.toFixed(1)}% ถึงจุดคัท`
                                : `🚨 ทะลุจุด Cut Loss!`}
                            </span>
                            <span>
                              {toTarget > 0
                                ? `ขาดอีก ${toTarget.toFixed(1)}% ถึงเป้า`
                                : `🎯 ถึงเป้าทำกำไร!`}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Sell Actions */}
                      <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                          ปิดโพชิชัน (ขาย)
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="จำนวน"
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-center focus:ring-1 focus:ring-amber-500 outline-none"
                            value={sellQty[item.rowIndex] || ""}
                            onChange={(e) =>
                              setSellQty({
                                ...sellQty,
                                [item.rowIndex]: e.target.value,
                              })
                            }
                          />
                          <input
                            type="number"
                            placeholder="ราคา($)"
                            className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-center focus:ring-1 focus:ring-amber-500 outline-none"
                            value={sellPrice[item.rowIndex] || ""}
                            onChange={(e) =>
                              setSellPrice({
                                ...sellPrice,
                                [item.rowIndex]: e.target.value,
                              })
                            }
                          />
                          <button
                            onClick={() =>
                              handleSellTrade(
                                item.rowIndex,
                                item.ticker,
                                holdingQty,
                              )
                            }
                            disabled={sellLoading === item.rowIndex}
                            className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 px-3 py-1 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {sellLoading === item.rowIndex
                              ? "..."
                              : "บันทึกขาย"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                    <tr>
                      <th className="px-4 py-3">หุ้น</th>
                      <th className="px-4 py-3">วันที่ขาย</th>
                      <th className="px-4 py-3 text-right">จำนวนหุ้น</th>
                      <th className="px-4 py-3 text-right">ราคา เข้า / ออก</th>
                      <th className="px-4 py-3 text-right">
                        กำไร (Realized PnL)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {histories.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center py-8 text-slate-500"
                        >
                          ยังไม่มีประวัติการขายหุ้น
                        </td>
                      </tr>
                    )}
                    {histories
                      // Sort by newest soldDate first
                      .sort(
                        (a, b) =>
                          new Date(b.soldDate).getTime() -
                          new Date(a.soldDate).getTime(),
                      )
                      .map((item, idx) => {
                        const pnl =
                          (item.soldPrice - item.price) *
                          (item.soldQty || item.quantity);
                        const pnlPct =
                          ((item.soldPrice - item.price) / item.price) * 100;
                        const isProfit = pnl >= 0;
                        return (
                          <tr
                            key={`${item.rowIndex}-sell-${idx}`}
                            className="hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-bold text-white">
                              {item.ticker}
                              {item.status === "PARTIAL_SOLD" && (
                                <span className="ml-2 text-[10px] bg-blue-900/50 text-blue-400 px-1 py-0.5 rounded">
                                  PARTIAL
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {new Date(item.soldDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {item.soldQty}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="text-slate-500">
                                ${formatUSD(item.price)}
                              </span>
                              <span className="mx-1 text-slate-600">→</span>
                              <span className="text-white">
                                ${formatUSD(item.soldPrice)}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-bold ${
                                isProfit ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {isProfit ? "+" : ""}
                              {getSymbol()}
                              {formatCurrency(pnl)}
                              <span className="text-xs ml-1 opacity-70 font-normal">
                                ({pnlPct.toFixed(1)}%)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 relative">
            {/* Portfolio Composition Chart */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold text-white mb-4">
                สัดส่วนพอร์ต (Portfolio)
              </h2>
              {compositionData.length > 0 ? (
                <>
                  <div className="h-56 w-full -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={compositionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {compositionData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => [
                            `${getSymbol()}${formatCurrency(Number(value))}`,
                            "มูลค่า",
                          ]}
                          contentStyle={{
                            backgroundColor: "#0f172a",
                            borderColor: "#334155",
                            borderRadius: "12px",
                            color: "#f8fafc",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
                          }}
                          itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-y-3 gap-x-2">
                    {compositionData.map((entry, index) => {
                      const total = compositionData.reduce(
                        (sum, item) => sum + item.value,
                        0,
                      );
                      const percent = ((entry.value / total) * 100).toFixed(1);
                      return (
                        <div
                          key={entry.name}
                          className="flex items-center gap-2 text-[11px] text-slate-300"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          ></div>
                          <span className="font-bold text-white truncate w-10">
                            {entry.name}
                          </span>
                          <span className="text-slate-400 ml-auto">
                            {percent}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  ไม่มีข้อมูลหุ้นในพอร์ต
                </div>
              )}
            </div>

            {/* Record Trade Form */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                    <Save size={20} />
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    บันทึกการซื้อหุ้นใหม่
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTicker("CASH");
                    setPrice("1");
                    setCutLoss("0");
                    setTarget("0");
                  }}
                  className="text-[11px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg font-bold transition-colors border border-emerald-500/30"
                >
                  + เพิ่มเงินสด (Cash)
                </button>
              </div>

              <form onSubmit={handleAddTrade} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    หุ้น (Ticker Symbol)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="เช่น AAPL, TSLA"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {ticker === "CASH" ? "ยอดเงิน ($)" : "จำนวนหุ้น"}
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.0001"
                      placeholder={ticker === "CASH" ? "10000" : "100"}
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {ticker === "CASH"
                        ? "ราคาประเมินค่า (ใส่ 1)"
                        : "ราคาซื้อ ($)"}
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.01"
                      placeholder="150.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-red-400 mb-1">
                      จุดตัดขาดทุน (Cut Loss $)
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0"
                      placeholder="140.00"
                      value={cutLoss}
                      onChange={(e) => setCutLoss(e.target.value)}
                      className="w-full bg-slate-950 border border-red-900/30 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-emerald-400 mb-1">
                      จุดทำกำไร (Target TP $)
                    </label>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0"
                      placeholder="180.00"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-900/30 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

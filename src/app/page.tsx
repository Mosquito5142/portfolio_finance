"use client";

import { useState, useEffect, useCallback } from "react";
import {
  StockHolding,
  GroupedStock,
  StockPrice,
  PortfolioSummary as PortfolioSummaryType,
} from "@/types/stock";
import { fetchPortfolio } from "@/lib/stockApi";
import { fetchStockPrices, isMarketOpen } from "@/lib/realPriceApi";
import { groupStocksBySymbol } from "@/lib/utils";
import StockCard from "@/components/StockCard";
import PortfolioSummary from "@/components/PortfolioSummary";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Home() {
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [groupedStocks, setGroupedStocks] = useState<GroupedStock[]>([]);
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [summary, setSummary] = useState<PortfolioSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [marketOpen, setMarketOpen] = useState(false);

  // Fetch portfolio data
  const loadPortfolio = useCallback(async () => {
    try {
      const data = await fetchPortfolio();
      setHoldings(data);
      const grouped = groupStocksBySymbol(data);
      setGroupedStocks(grouped);
      setError(null);
    } catch (err) {
      setError("ไม่สามารถดึงข้อมูลพอร์ตได้");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update prices from Yahoo Finance
  const updatePrices = useCallback(async () => {
    if (groupedStocks.length === 0) return;

    setPricesLoading(true);
    const symbols = groupedStocks.map((s) => s.symbol);

    try {
      const priceMap = await fetchStockPrices(symbols);

      if (Object.keys(priceMap).length > 0) {
        setPrices(priceMap);
        setLastUpdate(new Date());

        // Calculate portfolio summary
        let totalValue = 0;
        let totalCost = 0;
        let previousValue = 0;

        groupedStocks.forEach((stock) => {
          const price = priceMap[stock.symbol];
          if (price) {
            totalValue += stock.totalQuantity * price.currentPrice;
            previousValue += stock.totalQuantity * price.previousClose;
          }
          totalCost += stock.totalCost;
        });

        const dayChange = totalValue - previousValue;
        const dayChangePercent =
          previousValue > 0 ? (dayChange / previousValue) * 100 : 0;
        const totalProfit = totalValue - totalCost;
        const totalProfitPercent =
          totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

        setSummary({
          totalValue,
          totalCost,
          totalProfit,
          totalProfitPercent,
          dayChange,
          dayChangePercent,
        });
      }
    } catch (err) {
      console.error("Error updating prices:", err);
    } finally {
      setPricesLoading(false);
    }
  }, [groupedStocks]);

  // Check market status
  useEffect(() => {
    setMarketOpen(isMarketOpen());
    const interval = setInterval(() => {
      setMarketOpen(isMarketOpen());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Initial load
  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  // Update prices - ทุก 60 วินาที (เพื่อไม่ให้ API ล้น)
  useEffect(() => {
    if (groupedStocks.length > 0) {
      updatePrices(); // Initial price update
      const interval = setInterval(updatePrices, 60000); // Every 60 seconds
      return () => clearInterval(interval);
    }
  }, [groupedStocks, updatePrices]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-400 mt-4">กำลังโหลดพอร์ตโฟลิโอ...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
          <button
            onClick={loadPortfolio}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            ลองใหม่
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                📈 My Portfolio
              </h1>
              <p className="text-gray-500 text-sm">Real-time Stock Tracker</p>
            </div>
            {/* Navigation Links */}
            <div className="flex gap-2">
              <a
                href="/search"
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
              >
                <span>🔍</span>
                <span className="hidden sm:inline">ค้นหาหุ้น</span>
              </a>
              <a
                href="/compare"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-800 to-pink-800 hover:from-purple-700 hover:to-pink-700 rounded-lg text-white transition-colors"
              >
                <span>🏆</span>
                <span className="hidden sm:inline">เปรียบเทียบ</span>
              </a>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={`w-2 h-2 rounded-full ${marketOpen ? "bg-green-400 animate-pulse" : "bg-yellow-400"}`}
                ></span>
                <span
                  className={marketOpen ? "text-green-400" : "text-yellow-400"}
                >
                  {marketOpen ? "ตลาดเปิด" : "ตลาดปิด"}
                </span>
                {pricesLoading && (
                  <span className="text-gray-500 text-xs">
                    (กำลังอัพเดท...)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                อัพเดท: {lastUpdate.toLocaleTimeString("th-TH")}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Portfolio Summary */}
        {summary && <PortfolioSummary summary={summary} />}

        {/* Refresh Button */}
        <div className="flex justify-end">
          <button
            onClick={updatePrices}
            disabled={pricesLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <span className={pricesLoading ? "animate-spin" : ""}>🔄</span>
            รีเฟรชราคา
          </button>
        </div>

        {/* Stock Cards */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            หุ้นในพอร์ต ({groupedStocks.length} ตัว)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedStocks.map((stock) => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                price={prices[stock.symbol]}
              />
            ))}
          </div>
        </div>

        {/* Holdings count */}
        <div className="text-center text-gray-500 text-sm py-4">
          รวม {holdings.filter((h) => h.quantity > 0).length} รายการซื้อ
          <br />
          <span className="text-xs">
            ราคาจาก Yahoo Finance • อัพเดททุก 60 วินาที
          </span>
        </div>
      </div>
    </main>
  );
}

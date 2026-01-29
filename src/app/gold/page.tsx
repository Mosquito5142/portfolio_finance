"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Types
interface GoldData {
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volatility: "low" | "medium" | "high";
  rsi?: number;
  stochastic?: { k: number; d: number };
  spread?: number; // Spread in points
}

interface PortfolioSettings {
  equityTHB: number;
  leverage: number;
  lotSize: number;
  maxLossPercent: number;
}

interface TradeEntry {
  id: string;
  type: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number | null;
  lotSize: number;
  pnlTHB: number | null;
  timestamp: Date;
  status: "OPEN" | "CLOSED";
}

interface EconomicEvent {
  name: string;
  impact: "high" | "medium" | "low";
  time: Date;
  currency: string;
}

export default function GoldSniperPage() {
  const [goldData, setGoldData] = useState<GoldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState<Date | null>(null); // Start as null for SSR
  const [mounted, setMounted] = useState(false);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [settings, setSettings] = useState<PortfolioSettings>({
    equityTHB: 1000,
    leverage: 2000,
    lotSize: 0.01,
    maxLossPercent: 10,
  });

  // Exchange rate THB to USD
  const THB_TO_USD = 34;

  // Economic Calendar (Hardcoded for demo - in real app, fetch from API)
  const economicEvents: EconomicEvent[] = [
    {
      name: "FOMC Interest Rate Decision",
      impact: "high",
      time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      currency: "USD",
    },
    {
      name: "NFP (Non-Farm Payrolls)",
      impact: "high",
      time: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      currency: "USD",
    },
    {
      name: "CPI (Consumer Price Index)",
      impact: "high",
      time: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      currency: "USD",
    },
    {
      name: "Jobless Claims",
      impact: "medium",
      time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
      currency: "USD",
    },
  ];

  // Update time every second (only after mount to avoid hydration mismatch)
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load trades from localStorage
  useEffect(() => {
    const savedTrades = localStorage.getItem("goldTrades");
    if (savedTrades) {
      setTrades(JSON.parse(savedTrades));
    }
  }, []);

  // Save trades to localStorage
  useEffect(() => {
    localStorage.setItem("goldTrades", JSON.stringify(trades));
  }, [trades]);

  const fetchGoldPrice = useCallback(async () => {
    try {
      const response = await fetch("/api/gold");
      const data = await response.json();
      if (data.success) {
        setGoldData(data.data);
      }
    } catch (error) {
      console.error("Error fetching gold price:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoldPrice();
    const interval = setInterval(fetchGoldPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchGoldPrice]);

  // ============ CALCULATIONS ============

  // Portfolio Values
  const equityUSD = settings.equityTHB / THB_TO_USD;
  const maxLossTHB = (settings.equityTHB * settings.maxLossPercent) / 100;

  // Current Price
  const currentPrice = goldData?.price || 2000;
  const stopLossDistance = 3;
  const takeProfitDistance = 15;

  // Entry Zones
  const buyLimitPrice = currentPrice - 10;
  const stopLossPrice = buyLimitPrice - stopLossDistance;
  const takeProfitPrice = buyLimitPrice + takeProfitDistance;

  // Potential P/L
  const potentialLossTHB =
    stopLossDistance * 10 * settings.lotSize * THB_TO_USD;
  const potentialProfitTHB =
    takeProfitDistance * 10 * settings.lotSize * THB_TO_USD;

  // ============ MULTI-TIMEFRAME ANALYSIS ============
  // Simulated trends based on price action
  const trendM5 = goldData
    ? goldData.changePercent > 0.1
      ? "up"
      : goldData.changePercent < -0.1
        ? "down"
        : "sideways"
    : "sideways";
  const trendM15 = goldData
    ? goldData.changePercent > 0.05
      ? "up"
      : goldData.changePercent < -0.05
        ? "down"
        : "sideways"
    : "sideways";
  const trendH1 = goldData ? (goldData.change > 0 ? "up" : "down") : "neutral";
  const trendH4 = goldData
    ? goldData.changePercent > 0.2
      ? "up"
      : goldData.changePercent < -0.2
        ? "down"
        : "sideways"
    : "sideways";

  const trends = [
    { tf: "M5", trend: trendM5 },
    { tf: "M15", trend: trendM15 },
    { tf: "H1", trend: trendH1 },
    { tf: "H4", trend: trendH4 },
  ];

  const upTrends = trends.filter((t) => t.trend === "up").length;
  const trendAlignment =
    upTrends >= 3 ? "strong" : upTrends >= 2 ? "moderate" : "weak";

  // ============ RSI & STOCHASTIC ============
  // Simulated for demo (in real app, calculate from OHLC data)
  const rsiValue = goldData?.rsi || 50 + (goldData?.changePercent || 0) * 10;
  const stochK = 50 + (goldData?.changePercent || 0) * 15;
  const stochD = stochK - 5;

  const rsiSignal =
    rsiValue < 30 ? "oversold" : rsiValue > 70 ? "overbought" : "neutral";
  const stochSignal =
    stochK < 20 ? "oversold" : stochK > 80 ? "overbought" : "neutral";

  // ============ SESSION TIMING ============
  const currentHour = currentTime?.getHours() ?? 12; // Default to noon if not mounted
  const getCurrentSession = () => {
    if (currentHour >= 6 && currentHour < 14) {
      return {
        name: "🌏 Asian Session",
        quality: "low",
        description: "ทองมักไซด์เวย์ ไม่ค่อยวิ่ง",
      };
    } else if (currentHour >= 14 && currentHour < 19) {
      return {
        name: "🇬🇧 London Session",
        quality: "high",
        description: "ทองเริ่มวิ่งแรง! โอกาสดี",
      };
    } else if (currentHour >= 19 && currentHour < 23) {
      return {
        name: "🇺🇸 NY Session",
        quality: "highest",
        description: "ทองวิ่งแรงสุด! ช่วงทอง",
      };
    } else {
      return {
        name: "😴 Off Hours",
        quality: "avoid",
        description: "ตลาดเบาบาง ไม่แนะนำเทรด",
      };
    }
  };

  const session = getCurrentSession();

  // ============ ECONOMIC CALENDAR ============
  const getTimeUntilEvent = (eventTime: Date) => {
    const now = currentTime?.getTime() ?? Date.now();
    const diff = eventTime.getTime() - now;
    if (diff < 0) return "Passed";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const upcomingEvents = economicEvents
    .filter((e) => e.time.getTime() > (currentTime?.getTime() ?? Date.now()))
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, 4);

  const nearestHighImpact = upcomingEvents.find((e) => e.impact === "high");
  const isNewsWarning =
    nearestHighImpact &&
    nearestHighImpact.time.getTime() - (currentTime?.getTime() ?? Date.now()) <
      2 * 60 * 60 * 1000; // Within 2 hours

  // ============ SPREAD CALCULATION ============
  // Spread varies by session and volatility
  const getSpread = () => {
    let baseSpread = 25; // Normal spread in points
    if (session.quality === "avoid") baseSpread = 60; // Off hours = high spread
    if (session.quality === "low") baseSpread = 40; // Asian = medium-high
    if (isNewsWarning) baseSpread = 80; // News = very high spread
    if (goldData?.volatility === "high") baseSpread += 20;
    return baseSpread;
  };
  const spreadPoints = getSpread();
  const spreadUSD = spreadPoints / 10; // Convert to USD
  const spreadCostTHB = spreadUSD * 10 * settings.lotSize * THB_TO_USD;
  const spreadSafe = spreadPoints <= 35; // Safe if spread <= 35 points

  // ============ SURVIVAL CHECK ============
  const trendUp = trendH1 === "up";
  const trendDown = trendH1 === "down";
  const hasClearTrend = trendUp || trendDown;
  const volatilityWarning = goldData?.volatility === "high";
  const sessionGood =
    session.quality === "high" || session.quality === "highest";
  const rsiGood = trendUp
    ? rsiSignal !== "overbought"
    : rsiSignal !== "oversold";
  const noNewsWarning = !isNewsWarning;

  const survivalScore = [
    hasClearTrend,
    !volatilityWarning,
    sessionGood,
    rsiGood,
    noNewsWarning,
    spreadSafe,
  ].filter(Boolean).length;
  const canTrade = survivalScore >= 5;

  // ============ COMMAND STATUS ============
  let commandStatus = "";
  let commandColor = "";
  let commandReason = "";
  let commandAction = "";

  // Trade direction based on trend
  const tradeDirection = trendUp ? "BUY" : "SELL";
  const sellLimitPrice = currentPrice + 10; // Sell $10 above current
  const sellStopLossPrice = sellLimitPrice + stopLossDistance;
  const sellTakeProfitPrice = sellLimitPrice - takeProfitDistance;

  if (isNewsWarning) {
    commandStatus = "🔴 ห้ามเข้า! (NEWS ALERT)";
    commandColor = "text-red-400";
    commandReason = `ข่าว ${nearestHighImpact?.name} กำลังจะออก ห้ามเทรด!`;
    commandAction = "รอข่าวผ่านก่อน อย่างน้อย 30 นาที";
  } else if (!spreadSafe) {
    commandStatus = "🔴 ห้ามเข้า! (SPREAD สูง!)";
    commandColor = "text-red-400";
    commandReason = `Spread ${spreadPoints} จุด สูงเกิน! จะติดลบทันที ${formatTHB(spreadCostTHB)}`;
    commandAction = "รอ Spread ลดลงต่ำกว่า 35 จุดก่อน";
  } else if (volatilityWarning) {
    commandStatus = "⚠️ ระวัง! (CAUTION)";
    commandColor = "text-yellow-400";
    commandReason = "Volatility สูง เสี่ยงโดนกวาด";
    commandAction = "ลด Lot เหลือ 0.005 หรือรอความผันผวนลด";
  } else if (session.quality === "low" || session.quality === "avoid") {
    commandStatus = "⚠️ ช่วงเวลาไม่ดี (WAIT)";
    commandColor = "text-yellow-400";
    commandReason = `${session.name} - ${session.description}`;
    commandAction = "รอ London/NY Session ค่อยเข้า";
  } else if (trendUp && rsiSignal === "overbought") {
    commandStatus = "⚠️ RSI สูงเกิน (WAIT)";
    commandColor = "text-yellow-400";
    commandReason = `RSI ${rsiValue.toFixed(0)} สูงเกิน รอย่อก่อน`;
    commandAction = `รอ RSI ลงมาต่ำกว่า 70 หรือราคาย่อลง`;
  } else if (trendDown && rsiSignal === "oversold") {
    commandStatus = "⚠️ RSI ต่ำเกิน (WAIT)";
    commandColor = "text-yellow-400";
    commandReason = `RSI ${rsiValue.toFixed(0)} ต่ำเกิน อาจเด้งกลับ`;
    commandAction = `รอ RSI ขึ้นมาเหนือ 30 หรือราคาเด้งก่อน`;
  } else if (trendUp) {
    commandStatus = "🟢 BUY ได้! (SNIPER READY)";
    commandColor = "text-green-400";
    commandReason = `Trend ขาขึ้น ${upTrends}/4 TF ยืนยัน`;
    commandAction = `ตั้ง Buy Limit ที่ ${formatUSD(buyLimitPrice)}`;
  } else if (trendDown) {
    commandStatus = "🔴 SELL ได้! (SHORT READY)";
    commandColor = "text-orange-400";
    commandReason = `Trend ขาลง ${4 - upTrends}/4 TF ยืนยัน - Follow Trend!`;
    commandAction = `ตั้ง Sell Limit ที่ ${formatUSD(sellLimitPrice)}`;
  } else {
    commandStatus = "⚠️ Sideway (WAIT)";
    commandColor = "text-yellow-400";
    commandReason = "ตลาด Sideway ไม่ชัดเจน";
    commandAction = "รอให้มีทิศทางชัดก่อนเข้า";
  }

  // ============ TRADE JOURNAL ============
  const addTrade = (type: "BUY" | "SELL") => {
    const newTrade: TradeEntry = {
      id: Date.now().toString(),
      type,
      entryPrice: currentPrice,
      exitPrice: null,
      lotSize: settings.lotSize,
      pnlTHB: null,
      timestamp: new Date(),
      status: "OPEN",
    };
    setTrades([newTrade, ...trades]);
  };

  const closeTrade = (id: string, exitPrice: number) => {
    setTrades(
      trades.map((t) => {
        if (t.id === id) {
          const priceDiff =
            t.type === "BUY"
              ? exitPrice - t.entryPrice
              : t.entryPrice - exitPrice;
          const pnlTHB = priceDiff * 10 * t.lotSize * THB_TO_USD;
          return { ...t, exitPrice, pnlTHB, status: "CLOSED" as const };
        }
        return t;
      }),
    );
  };

  const clearTrades = () => {
    if (confirm("ลบประวัติการเทรดทั้งหมด?")) {
      setTrades([]);
    }
  };

  // Trade Statistics
  const closedTrades = trades.filter((t) => t.status === "CLOSED");
  const winTrades = closedTrades.filter((t) => (t.pnlTHB || 0) > 0);
  const lossTrades = closedTrades.filter((t) => (t.pnlTHB || 0) < 0);
  const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnlTHB || 0), 0);
  const winRate =
    closedTrades.length > 0
      ? (winTrades.length / closedTrades.length) * 100
      : 0;
  const totalWin = winTrades.reduce((sum, t) => sum + (t.pnlTHB || 0), 0);
  const totalLoss = Math.abs(
    lossTrades.reduce((sum, t) => sum + (t.pnlTHB || 0), 0),
  );
  const profitFactor =
    totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

  // ============ FORMATTERS ============
  function formatUSD(value: number) {
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatTHB(value: number) {
    return `฿${value.toLocaleString("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  // ============ AI DATA BLOCK GENERATOR ============
  const [copied, setCopied] = useState(false);

  const generateAIDataBlock = () => {
    const trendLabel = trendUp
      ? "Bullish (ขาขึ้น)"
      : trendDown
        ? "Bearish (ขาลง)"
        : "Sideways";
    const mtfSummary = trends
      .map(
        (t) =>
          `${t.tf}: ${t.trend === "up" ? "⬆️" : t.trend === "down" ? "⬇️" : "➡️"}`,
      )
      .join(", ");
    const nearestNews = upcomingEvents[0];
    const newsInfo = nearestNews
      ? `${nearestNews.name} in ${getTimeUntilEvent(nearestNews.time)}`
      : "No major news";

    const dataBlock = `🧠 MICRO-SNIPER DATA BLOCK
      ================================
      Asset: XAU/USD (Gold Spot)
      Price: ${formatUSD(currentPrice)}
      Time: ${currentTime?.toLocaleString("th-TH") ?? "Loading..."}
      ================================
      📊 TECHNICAL INDICATORS
      RSI (14): ${rsiValue.toFixed(1)} (${rsiSignal})
      Stochastic: K=${stochK.toFixed(0)} D=${stochD.toFixed(0)} (${stochSignal})
      Trend H1: ${trendLabel}
      Multi-TF: ${mtfSummary} (${upTrends}/4 ขาขึ้น)
      High 24h: ${formatUSD(goldData?.high24h || 0)}
      Low 24h: ${formatUSD(goldData?.low24h || 0)}
      Volatility: ${goldData?.volatility || "N/A"}
      ================================
      ⚠️ RISK FACTORS
      Spread: ${spreadPoints} points (${spreadSafe ? "Safe" : "HIGH - DANGER!"})
      Next News: ${newsInfo}
      Session: ${session.name}
      ================================
      💰 PORTFOLIO CONTEXT
      Equity: ${formatTHB(settings.equityTHB)} (~${formatUSD(equityUSD)})
      Leverage: 1:${settings.leverage}
      Lot Size: ${settings.lotSize} (Fixed)
      Max Loss/Trade: ${formatTHB(maxLossTHB)} (${settings.maxLossPercent}%)
      ================================
      🤖 AI COMMAND STATUS
      Current: ${commandStatus}
      Reason: ${commandReason}
      Suggested Action: ${commandAction}
      ================================
      📋 REQUEST
      Analyze entry point, Stop Loss (max $3), and Take Profit.
      Consider the Spread cost and News timing.
      Give specific ${trendUp ? "BUY" : "SELL"} levels with risk/reward ratio.`;

    return dataBlock;
  };

  const copyAIDataBlock = async () => {
    const dataBlock = generateAIDataBlock();
    try {
      await navigator.clipboard.writeText(dataBlock);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      {/* Header */}
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-yellow-500/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🟡</span>
              <div>
                <h1 className="text-xl font-bold text-yellow-400">
                  GOLD MICRO-SNIPER HUD
                </h1>
                <p className="text-gray-500 text-xs">
                  XAU/USD Trading for Micro Portfolio
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">
                🕐{" "}
                {mounted && currentTime
                  ? currentTime.toLocaleTimeString("th-TH")
                  : "--:--:--"}
              </span>
              <button
                onClick={copyAIDataBlock}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  copied
                    ? "bg-green-600 text-white"
                    : "bg-amber-600/80 hover:bg-amber-500 text-white"
                }`}
              >
                {copied ? "✅ Copied!" : "📋 Copy AI Data"}
              </button>
              <Link
                href="/"
                className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
              >
                ← กลับ
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Gold Price Card */}
        <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/20 rounded-2xl border border-yellow-500/40 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">XAU/USD (Gold Spot)</p>
              {loading ? (
                <div className="animate-pulse h-10 w-40 bg-gray-700 rounded mt-1"></div>
              ) : (
                <p className="text-4xl font-bold text-white">
                  {formatUSD(goldData?.price || 0)}
                </p>
              )}
            </div>
            {goldData && (
              <div className="text-right">
                <p
                  className={`text-xl font-bold ${
                    goldData.change >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {goldData.change >= 0 ? "+" : ""}
                  {formatUSD(goldData.change)}
                </p>
                <p
                  className={`text-sm ${
                    goldData.changePercent >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  ({goldData.changePercent >= 0 ? "+" : ""}
                  {goldData.changePercent.toFixed(2)}%)
                </p>
              </div>
            )}
          </div>

          {goldData && (
            <div className="grid grid-cols-5 gap-4 mt-4 pt-4 border-t border-yellow-500/20">
              <div>
                <p className="text-gray-500 text-xs">High 24h</p>
                <p className="text-white font-medium text-sm">
                  {formatUSD(goldData.high24h)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Low 24h</p>
                <p className="text-white font-medium text-sm">
                  {formatUSD(goldData.low24h)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Volatility</p>
                <p
                  className={`font-medium text-sm ${
                    goldData.volatility === "high"
                      ? "text-red-400"
                      : goldData.volatility === "medium"
                        ? "text-yellow-400"
                        : "text-green-400"
                  }`}
                >
                  {goldData.volatility === "high"
                    ? "🔴 สูง"
                    : goldData.volatility === "medium"
                      ? "🟡 ปานกลาง"
                      : "🟢 ต่ำ"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Session</p>
                <p className="text-white font-medium text-sm">{session.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Spread</p>
                <p
                  className={`font-medium text-sm ${
                    spreadSafe ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {spreadPoints} pts {spreadSafe ? "✅" : "⚠️"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 📅 Economic Calendar */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📅</span>
            <h2 className="text-white font-bold">Economic Calendar</h2>
            {isNewsWarning && (
              <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-full animate-pulse">
                ⚠️ NEWS ALERT
              </span>
            )}
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((event, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  event.impact === "high"
                    ? "bg-red-900/30 border border-red-500/30"
                    : event.impact === "medium"
                      ? "bg-yellow-900/30 border border-yellow-500/30"
                      : "bg-gray-900/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {event.impact === "high"
                      ? "🔴"
                      : event.impact === "medium"
                        ? "🟡"
                        : "🟢"}
                  </span>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {event.name}
                    </p>
                    <p className="text-gray-500 text-xs">{event.currency}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${
                      event.impact === "high" ? "text-red-400" : "text-gray-400"
                    }`}
                  >
                    {mounted ? getTimeUntilEvent(event.time) : "..."}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {mounted
                      ? event.time.toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "--:--"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 📊 Multi-Timeframe + RSI/Stochastic */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Multi-Timeframe */}
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📊</span>
              <h2 className="text-white font-bold text-sm">Multi-Timeframe</h2>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  trendAlignment === "strong"
                    ? "bg-green-500/20 text-green-400"
                    : trendAlignment === "moderate"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {upTrends}/4 ขาขึ้น
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {trends.map((t) => (
                <div
                  key={t.tf}
                  className={`p-2 rounded-lg text-center ${
                    t.trend === "up"
                      ? "bg-green-900/30 border border-green-500/30"
                      : t.trend === "down"
                        ? "bg-red-900/30 border border-red-500/30"
                        : "bg-gray-900/50 border border-gray-700/30"
                  }`}
                >
                  <p className="text-gray-400 text-xs">{t.tf}</p>
                  <p
                    className={`font-bold ${
                      t.trend === "up"
                        ? "text-green-400"
                        : t.trend === "down"
                          ? "text-red-400"
                          : "text-gray-400"
                    }`}
                  >
                    {t.trend === "up" ? "⬆️" : t.trend === "down" ? "⬇️" : "➡️"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* RSI & Stochastic */}
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📈</span>
              <h2 className="text-white font-bold text-sm">Indicators</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* RSI */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">RSI (14)</p>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xl font-bold ${
                      rsiSignal === "oversold"
                        ? "text-green-400"
                        : rsiSignal === "overbought"
                          ? "text-red-400"
                          : "text-white"
                    }`}
                  >
                    {rsiValue.toFixed(0)}
                  </p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      rsiSignal === "oversold"
                        ? "bg-green-500/20 text-green-400"
                        : rsiSignal === "overbought"
                          ? "bg-red-500/20 text-red-400"
                          : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {rsiSignal === "oversold"
                      ? "Oversold"
                      : rsiSignal === "overbought"
                        ? "Overbought"
                        : "Neutral"}
                  </span>
                </div>
              </div>
              {/* Stochastic */}
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Stochastic</p>
                <div className="flex items-center gap-2">
                  <p
                    className={`text-xl font-bold ${
                      stochSignal === "oversold"
                        ? "text-green-400"
                        : stochSignal === "overbought"
                          ? "text-red-400"
                          : "text-white"
                    }`}
                  >
                    {stochK.toFixed(0)}
                  </p>
                  <span className="text-gray-400 text-xs">
                    K:{stochK.toFixed(0)} D:{stochD.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ⏰ Session Timing */}
        <div
          className={`rounded-2xl border p-4 ${
            session.quality === "highest"
              ? "bg-green-900/30 border-green-500/40"
              : session.quality === "high"
                ? "bg-emerald-900/30 border-emerald-500/40"
                : session.quality === "low"
                  ? "bg-yellow-900/30 border-yellow-500/40"
                  : "bg-red-900/30 border-red-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <p className="text-white font-bold">{session.name}</p>
                <p className="text-gray-400 text-sm">{session.description}</p>
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded-xl font-bold ${
                session.quality === "highest" || session.quality === "high"
                  ? "bg-green-500/20 text-green-400"
                  : session.quality === "low"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
              }`}
            >
              {session.quality === "highest"
                ? "🔥 BEST TIME"
                : session.quality === "high"
                  ? "✅ GOOD"
                  : session.quality === "low"
                    ? "⚠️ SLOW"
                    : "❌ AVOID"}
            </div>
          </div>
        </div>

        {/* Portfolio Status */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💰</span>
            <h2 className="text-white font-bold">PORTFOLIO STATUS (FBS)</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs">Equity</p>
              <p className="text-white font-bold text-lg">
                {formatTHB(settings.equityTHB)}
              </p>
              <p className="text-gray-500 text-xs">(~{formatUSD(equityUSD)})</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs">Leverage</p>
              <p className="text-yellow-400 font-bold text-lg">
                1:{settings.leverage}
              </p>
              <p className="text-red-400 text-xs">High Risk ⚠️</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs">Lot Size (Fixed)</p>
              <p className="text-cyan-400 font-bold text-lg">
                {settings.lotSize} Lot
              </p>
              <p className="text-gray-500 text-xs">ห้ามเบิ้ล!</p>
            </div>
            <div className="bg-gray-900/50 rounded-xl p-3">
              <p className="text-gray-500 text-xs">Max Loss/Trade</p>
              <p className="text-orange-400 font-bold text-lg">
                {formatTHB(maxLossTHB)}
              </p>
              <p className="text-gray-500 text-xs">
                ({settings.maxLossPercent}%)
              </p>
            </div>
          </div>

          {/* Equity Slider */}
          <div className="mt-4 pt-4 border-t border-gray-700/50">
            <label className="text-gray-400 text-sm">ปรับทุน (THB):</label>
            <input
              type="range"
              min="500"
              max="10000"
              step="500"
              value={settings.equityTHB}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  equityTHB: parseInt(e.target.value),
                })
              }
              className="w-full mt-2 accent-yellow-500"
            />
            <div className="flex justify-between text-gray-500 text-xs mt-1">
              <span>฿500</span>
              <span>฿10,000</span>
            </div>
          </div>
        </div>

        {/* Micro-Sniper Command */}
        <div className="bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 rounded-2xl border-2 border-amber-500/40 p-6">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-amber-500/30">
            <span className="text-2xl">🧠</span>
            <div>
              <h2 className="text-amber-400 font-bold text-lg">
                MICRO-SNIPER COMMAND
              </h2>
              <p className="text-gray-500 text-xs">คำสั่ง AI สำหรับพอร์ตจิ๋ว</p>
            </div>
          </div>

          {/* Survival Check */}
          <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-xs mb-3 font-medium">
              📊 Survival Check ({survivalScore}/6)
            </p>
            <div className="grid grid-cols-6 gap-2">
              <div
                className={`p-2 rounded-lg text-center ${
                  hasClearTrend ? "bg-green-900/30" : "bg-red-900/30"
                }`}
              >
                <p className="text-xs text-gray-400">Trend</p>
                <p
                  className={hasClearTrend ? "text-green-400" : "text-red-400"}
                >
                  {hasClearTrend ? "✅" : "❌"}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg text-center ${
                  !volatilityWarning ? "bg-green-900/30" : "bg-red-900/30"
                }`}
              >
                <p className="text-xs text-gray-400">Vol</p>
                <p
                  className={
                    !volatilityWarning ? "text-green-400" : "text-red-400"
                  }
                >
                  {!volatilityWarning ? "✅" : "❌"}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg text-center ${
                  sessionGood ? "bg-green-900/30" : "bg-yellow-900/30"
                }`}
              >
                <p className="text-xs text-gray-400">Session</p>
                <p
                  className={sessionGood ? "text-green-400" : "text-yellow-400"}
                >
                  {sessionGood ? "✅" : "⚠️"}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg text-center ${
                  rsiGood ? "bg-green-900/30" : "bg-yellow-900/30"
                }`}
              >
                <p className="text-xs text-gray-400">RSI</p>
                <p className={rsiGood ? "text-green-400" : "text-yellow-400"}>
                  {rsiGood ? "✅" : "⚠️"}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg text-center ${
                  noNewsWarning ? "bg-green-900/30" : "bg-red-900/30"
                }`}
              >
                <p className="text-xs text-gray-400">News</p>
                <p
                  className={noNewsWarning ? "text-green-400" : "text-red-400"}
                >
                  {noNewsWarning ? "✅" : "❌"}
                </p>
              </div>
              <div
                className={`p-2 rounded-lg text-center ${
                  spreadSafe ? "bg-green-900/30" : "bg-red-900/30"
                }`}
              >
                <p className="text-xs text-gray-400">Spread</p>
                <p className={spreadSafe ? "text-green-400" : "text-red-400"}>
                  {spreadSafe ? "✅" : "❌"}
                </p>
              </div>
            </div>
          </div>

          {/* Command Status */}
          <div className="bg-gray-800/70 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-xs mb-2">🛡️ คำสั่ง AI:</p>
            <p className={`text-2xl font-bold ${commandColor} mb-2`}>
              {commandStatus}
            </p>
            <p className="text-gray-400 text-sm">
              <span className="text-gray-500">เหตุผล:</span> {commandReason}
            </p>
            <p className="text-amber-300 text-sm mt-2 font-medium">
              👉 Action: {commandAction}
            </p>
          </div>

          {/* Sniper Zone - Dynamic based on direction */}
          {canTrade && (
            <div
              className={`rounded-xl p-4 border ${
                trendUp
                  ? "bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-500/40"
                  : "bg-gradient-to-br from-red-900/30 to-orange-900/20 border-orange-500/40"
              }`}
            >
              <p
                className={`text-sm font-medium mb-3 ${trendUp ? "text-green-400" : "text-orange-400"}`}
              >
                🎯 จุดยิง ({trendUp ? "BUY" : "SELL"} Zone)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-gray-500 text-xs">
                    {trendUp ? "Buy Limit" : "Sell Limit"}
                  </p>
                  <p
                    className={`font-bold ${trendUp ? "text-green-400" : "text-orange-400"}`}
                  >
                    {formatUSD(trendUp ? buyLimitPrice : sellLimitPrice)}
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-gray-500 text-xs">Stop Loss</p>
                  <p className="text-red-400 font-bold">
                    {formatUSD(trendUp ? stopLossPrice : sellStopLossPrice)}
                  </p>
                  <p className="text-gray-500 text-xs">
                    (-{formatTHB(potentialLossTHB)})
                  </p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                  <p className="text-gray-500 text-xs">Take Profit</p>
                  <p className="text-green-400 font-bold">
                    {formatUSD(trendUp ? takeProfitPrice : sellTakeProfitPrice)}
                  </p>
                  <p className="text-green-500 text-xs">
                    (+{formatTHB(potentialProfitTHB)})
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 📋 Trade Journal */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <h2 className="text-white font-bold">Trade Journal</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addTrade("BUY")}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition"
              >
                + BUY
              </button>
              <button
                onClick={() => addTrade("SELL")}
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition"
              >
                + SELL
              </button>
              {trades.length > 0 && (
                <button
                  onClick={clearTrades}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>

          {/* Statistics */}
          {closedTrades.length > 0 && (
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs">Win Rate</p>
                <p
                  className={`text-lg font-bold ${
                    winRate >= 50 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {winRate.toFixed(0)}%
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs">Total P/L</p>
                <p
                  className={`text-lg font-bold ${
                    totalPnL >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatTHB(totalPnL)}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs">Profit Factor</p>
                <p
                  className={`text-lg font-bold ${
                    profitFactor >= 1 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {profitFactor === Infinity ? "∞" : profitFactor.toFixed(2)}
                </p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs">Trades</p>
                <p className="text-lg font-bold text-white">
                  {winTrades.length}W / {lossTrades.length}L
                </p>
              </div>
            </div>
          )}

          {/* Trade List */}
          {trades.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {trades.slice(0, 10).map((trade) => (
                <div
                  key={trade.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    trade.status === "OPEN"
                      ? "bg-blue-900/30 border border-blue-500/30"
                      : (trade.pnlTHB || 0) >= 0
                        ? "bg-green-900/20 border border-green-500/20"
                        : "bg-red-900/20 border border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        trade.type === "BUY"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {trade.type}
                    </span>
                    <div>
                      <p className="text-white text-sm">
                        Entry: {formatUSD(trade.entryPrice)}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(trade.timestamp).toLocaleString("th-TH")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {trade.status === "OPEN" ? (
                      <button
                        onClick={() => closeTrade(trade.id, currentPrice)}
                        className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition"
                      >
                        Close @ {formatUSD(currentPrice)}
                      </button>
                    ) : (
                      <p
                        className={`font-bold ${
                          (trade.pnlTHB || 0) >= 0
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {(trade.pnlTHB || 0) >= 0 ? "+" : ""}
                        {formatTHB(trade.pnlTHB || 0)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">
              ยังไม่มีประวัติการเทรด - กด + BUY หรือ + SELL เพื่อเริ่มบันทึก
            </p>
          )}
        </div>

        {/* Iron Rules */}
        <div className="bg-red-900/20 rounded-2xl border border-red-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💡</span>
            <h2 className="text-red-400 font-bold">
              กฎเหล็กพอร์ต {formatTHB(settings.equityTHB)}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
              <span className="text-lg">1️⃣</span>
              <div>
                <p className="text-white font-medium text-sm">
                  0.01 Lot เท่านั้น
                </p>
                <p className="text-gray-500 text-xs">ห้ามเบิ้ล!</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
              <span className="text-lg">2️⃣</span>
              <div>
                <p className="text-white font-medium text-sm">ห้ามถือข้ามคืน</p>
                <p className="text-gray-500 text-xs">Swap กิน!</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
              <span className="text-lg">3️⃣</span>
              <div>
                <p className="text-white font-medium text-sm">
                  กำไร 500 รีบปิด
                </p>
                <p className="text-gray-500 text-xs">Hit & Run!</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
              <span className="text-lg">4️⃣</span>
              <div>
                <p className="text-white font-medium text-sm">
                  ขาดทุน {formatTHB(maxLossTHB)} หยุด!
                </p>
                <p className="text-gray-500 text-xs">พักวันนึง</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="bg-orange-900/20 rounded-xl border border-orange-500/30 p-4 text-center">
          <p className="text-orange-400 text-sm font-medium">
            ⚠️ คำเตือน: การเทรด Forex มีความเสี่ยงสูงมาก
          </p>
          <p className="text-gray-500 text-xs mt-1">
            การใช้ Leverage 1:2000
            อาจทำให้สูญเสียเงินทุนทั้งหมดได้ภายในไม่กี่นาที
          </p>
        </div>
      </main>
    </div>
  );
}

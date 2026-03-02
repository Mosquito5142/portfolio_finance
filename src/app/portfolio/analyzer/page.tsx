"use client";

import { useState, useEffect } from "react";
import {
  BrainCircuit,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCw,
  RefreshCw,
  Zap,
} from "lucide-react";

interface PortfolioRow {
  rowIndex: number;
  ticker: string;
  quantity: number;
  price: number;
  cutLoss: number;
  target: number;
  status: string;
  portfolioType?: "main" | "growth";
  // Merged live data
  livePrice?: number;
  liveChangePercent?: number;
}

interface AIResult {
  verdict: "HOLD" | "SELL";
  reasoning: string;
  newsHighlights: string[];
}

export default function PortfolioAnalyzer() {
  const [portfolioData, setPortfolioData] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map of ticker to AI Result
  const [analysisResults, setAnalysisResults] = useState<
    Record<
      string,
      {
        status: "loading" | "done" | "error";
        data?: AIResult;
        errMessage?: string;
      }
    >
  >({});

  const [isAnalyzingAll, setIsAnalyzingAll] = useState(false);
  const [mode, setMode] = useState<"ai" | "basic">("ai");

  useEffect(() => {
    fetchPortfolioData();
  }, []);

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
        const activeRows = rows.filter(
          (r) => r.status !== "CLOSED" && r.ticker !== "CASH",
        );

        // หา unique tickers
        const uniqueTickersMap = new Map<string, PortfolioRow>();
        activeRows.forEach((r) => {
          // We'll analyze by Ticker. If a ticker exists multiple times (e.g. bought in both main and growth),
          // we'll just merge the average cost for analysis or pick the first one.
          // For simplicity, let's group by ticker and compute average entry.
          if (uniqueTickersMap.has(r.ticker)) {
            const prev = uniqueTickersMap.get(r.ticker)!;
            const totalCost = prev.price * prev.quantity + r.price * r.quantity;
            const totalQty = prev.quantity + r.quantity;
            const avgPrice = totalCost / totalQty;
            uniqueTickersMap.set(r.ticker, {
              ...prev,
              quantity: totalQty,
              price: avgPrice,
              // We keep the first cut/target for the prompt or average them. Let's keep the first.
            });
          } else {
            uniqueTickersMap.set(r.ticker, { ...r });
          }
        });

        const mergedActiveRows = Array.from(uniqueTickersMap.values());
        const tickersStr = mergedActiveRows.map((r) => r.ticker).join(",");

        let livePrices: Record<string, any> = {};

        // Fetch Live Prices via existing working /api/prices endpoint
        if (tickersStr) {
          try {
            const liveRes = await fetch(`/api/prices?symbols=${tickersStr}`);
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
        const finalData = mergedActiveRows.map((r) => {
          if (livePrices[r.ticker]) {
            return {
              ...r,
              livePrice: livePrices[r.ticker].price,
              liveChangePercent: livePrices[r.ticker].changePercent,
            };
          }
          return r;
        });

        setPortfolioData(finalData);
      } else {
        throw new Error(json.message || "ไม่พบข้อมูลพอร์ตโฟลิโอ");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTicker = async (item: PortfolioRow) => {
    setAnalysisResults((prev) => ({
      ...prev,
      [item.ticker]: { status: "loading" },
    }));

    try {
      const currentPrice = item.livePrice || item.price;
      const pnlPct = (((currentPrice - item.price) / item.price) * 100).toFixed(
        2,
      );

      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: item.ticker,
          currentPrice,
          entryPrice: item.price.toFixed(2),
          target: item.target,
          cutLoss: item.cutLoss,
          pnlPct,
          mode,
        }),
      });

      const data = await res.json();

      if (res.ok && data.status === "success") {
        setAnalysisResults((prev) => ({
          ...prev,
          [item.ticker]: { status: "done", data: data.data },
        }));
      } else {
        throw new Error(data.message || "Failed to analyze");
      }
    } catch (err: any) {
      setAnalysisResults((prev) => ({
        ...prev,
        [item.ticker]: { status: "error", errMessage: err.message },
      }));
    }
  };

  const handleAnalyzeAll = async () => {
    if (portfolioData.length === 0) return;
    setIsAnalyzingAll(true);

    // We run them sequentially to avoid rate limiting on free AI tiers
    for (const item of portfolioData) {
      await analyzeTicker(item);
      // หน่วงเวลา 4.5 วินาที เพื่อไม่ให้เกินโควต้า 15 request/นาที ของบัญชีฟรี Gemini
      await new Promise((res) => setTimeout(res, 4500));
    }

    setIsAnalyzingAll(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans pt-24 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Setup */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 z-0 pointer-events-none"></div>
          <div className="relative z-10 space-y-2">
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-3">
              <BrainCircuit size={32} className="text-emerald-500" />
              Portfolio AI Analyzer
            </h1>
            <p className="text-slate-400 text-sm max-w-lg">
              ระบบประมวลผลพอร์ตด้วย AI: ดึงพาดหัวข่าวล่าสุด
              และวิเคราะห์ปัจจัยทางเทคนิคเพื่อแนะนำสถานะ{" "}
              <strong className="text-slate-300">HOLD</strong> หรือ{" "}
              <strong className="text-slate-300">SELL</strong>{" "}
              ให้กับหุ้นแต่ละตัวในพอร์ตของคุณ
            </p>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 mt-4 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800/50 inline-flex">
              <button
                onClick={() => setMode("ai")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  mode === "ai"
                    ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                <BrainCircuit size={16} /> AI Mode (Gemini)
              </button>
              <button
                onClick={() => setMode("basic")}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                  mode === "basic"
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-500 hover:text-slate-300 border border-transparent"
                }`}
              >
                <Zap size={16} /> Basic Mode (ฟรี/ใช้ Keyword)
              </button>
            </div>
          </div>

          <div className="relative z-10 flex gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={handleAnalyzeAll}
              disabled={isAnalyzingAll || loading || portfolioData.length === 0}
              className="flex-1 md:flex-none bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {isAnalyzingAll ? (
                <RotateCw size={18} className="animate-spin" />
              ) : (
                <Play size={18} fill="currentColor" />
              )}
              {isAnalyzingAll
                ? "กำลังวิเคราะห์ (ทีละตัว)..."
                : "วิเคราะห์หุ้นทั้งหมด (Run All)"}
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-4">
            <RefreshCw className="animate-spin w-8 h-8 text-emerald-500" />
            <p className="font-bold tracking-widest uppercase text-sm">
              LOADING PORTFOLIO DATA...
            </p>
          </div>
        ) : error ? (
          <div className="bg-red-900/20 border border-red-500/50 rounded-2xl p-6 text-center text-red-400 flex flex-col items-center gap-3">
            <AlertTriangle size={32} />
            <p className="font-bold">{error}</p>
          </div>
        ) : portfolioData.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            ไม่พบหุ้นในพอร์ตที่กำลังถืออยู่ (Active Holdings)
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {portfolioData.map((item) => {
              const currentPrice = item.livePrice || item.price;
              const pnlPct = ((currentPrice - item.price) / item.price) * 100;
              const pnlClass =
                pnlPct >= 0 ? "text-emerald-400" : "text-red-400";
              const pnlSign = pnlPct >= 0 ? "+" : "";

              const result = analysisResults[item.ticker];

              return (
                <div
                  key={item.ticker}
                  className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-slate-700 transition-colors"
                >
                  {/* Top Header Card */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white flex gap-2 items-center">
                        {item.ticker}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        ราคาปัจจุบัน: ${currentPrice.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${pnlClass}`}>
                        {pnlSign}
                        {pnlPct.toFixed(2)}%
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ทุน: ${item.price.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* AI Section or Analyze Button */}
                  <div className="mt-4 pt-4 border-t border-slate-800/60">
                    {!result ? (
                      <button
                        onClick={() => analyzeTicker(item)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 px-4 rounded-xl border border-slate-700 transition-all text-sm flex items-center justify-center gap-2"
                      >
                        {mode === "ai" ? (
                          <BrainCircuit size={16} />
                        ) : (
                          <Zap size={16} />
                        )}
                        คลิกเพื่อวิเคราะห์ ({mode === "ai" ? "AI" : "Basic"})
                      </button>
                    ) : result.status === "loading" ? (
                      <div className="w-full bg-slate-800/50 text-emerald-400 font-bold py-2.5 px-4 rounded-xl border border-emerald-900/30 flex items-center justify-center gap-2 text-sm animate-pulse">
                        <RotateCw size={16} className="animate-spin" />
                        AI กำลังอ่านข่าวและวิเคราะห์...
                      </div>
                    ) : result.status === "error" ? (
                      <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-xl border border-red-900/50">
                        <p className="font-bold flex items-center gap-1 mb-1">
                          <AlertTriangle size={14} /> Error
                        </p>
                        <p className="text-xs opacity-80">
                          {result.errMessage}
                        </p>
                      </div>
                    ) : result.data ? (
                      <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                        {/* Verdict */}
                        <div
                          className={`p-3 rounded-xl border ${
                            result.data.verdict === "HOLD"
                              ? "bg-blue-900/20 border-blue-500/30 text-blue-400"
                              : "bg-red-900/20 border-red-500/30 text-red-400"
                          }`}
                        >
                          <p className="text-[10px] uppercase font-bold tracking-widest opacity-70 mb-1">
                            คำโหวตจาก AI
                          </p>
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                result.data.verdict === "HOLD"
                                  ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                                  : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"
                              }`}
                            ></div>
                            <span className="text-xl font-extrabold">
                              {result.data.verdict}
                            </span>
                          </div>
                          <p className="text-xs mt-2 text-slate-300 leading-relaxed font-light">
                            {result.data.reasoning}
                          </p>
                        </div>

                        {/* News */}
                        <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/50">
                          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-2">
                            ข่าวพาดหัวที่เกี่ยวข้อง
                          </p>
                          {result.data.newsHighlights &&
                          result.data.newsHighlights.length > 0 ? (
                            <ul className="space-y-1.5">
                              {result.data.newsHighlights.map((news, idx) => (
                                <li
                                  key={idx}
                                  className="text-[11px] text-slate-400 leading-tight flex gap-2"
                                >
                                  <span className="text-emerald-500 mt-0.5">
                                    •
                                  </span>
                                  <span className="line-clamp-2">{news}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-600 italic">
                              ไม่มีข่าวอัปเดตใหม่ในช่วงนี้
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import { useState } from "react";
import { formatUSD } from "@/lib/utils";
import { isTier1, isTier2 } from "@/lib/stocks";
import { StockScan } from "@/types/stock";

interface PatternCardProps {
  scan: StockScan;
  scanMode?: "trend" | "value" | "sniper";
}

export default function PatternCard({
  scan,
  scanMode = "value",
}: PatternCardProps) {
  const [showDebug, setShowDebug] = useState(false);

  if (!scan.data) return null;

  return (
    <div
      className={`bg-gray-800/50 rounded-2xl border p-5 ${
        scan.data.overallSignal === "BUY"
          ? "border-green-500/40"
          : scan.data.overallSignal === "SELL"
            ? "border-red-500/40"
            : "border-gray-700/50"
      }`}
    >
      <div className="flex items-start justify-between">
        {/* Left: Stock Info */}
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
              scan.data.overallSignal === "BUY"
                ? "bg-green-900/50"
                : scan.data.overallSignal === "SELL"
                  ? "bg-red-900/50"
                  : "bg-yellow-900/50"
            }`}
          >
            {scan.data.overallSignal === "BUY"
              ? "🟢"
              : scan.data.overallSignal === "SELL"
                ? "🔴"
                : "🟡"}
          </div>
          <div>
            <Link
              href={`/search?symbol=${scan.symbol}`}
              className="text-white font-bold text-xl hover:text-purple-400 transition-colors"
            >
              {scan.symbol}
            </Link>
            {/* Value Hunter Badge for Oversold Stocks */}
            {scanMode === "value" &&
              scan.data.metrics?.rsi !== undefined &&
              scan.data.metrics.rsi < 35 && (
                <span className="ml-2 px-2 py-0.5 bg-green-600/50 text-green-300 text-xs rounded-full animate-pulse">
                  💎 Oversold!
                </span>
              )}
            {/* Value Mode: Invert interpretation hint */}
            {scanMode === "value" &&
              scan.data.overallSignal === "SELL" &&
              scan.data.metrics?.rsi !== undefined &&
              scan.data.metrics.rsi < 40 && (
                <span className="ml-2 px-2 py-0.5 bg-emerald-600/40 text-emerald-300 text-xs rounded-full">
                  🏷️ Sale!
                </span>
              )}
            {/* Tier Badge - Show risk level */}
            {isTier1(scan.symbol) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-600/40 text-blue-300 text-xs rounded-full">
                🏆 T1
              </span>
            )}
            {isTier2(scan.symbol) && (
              <span className="ml-2 px-2 py-0.5 bg-orange-600/40 text-orange-300 text-xs rounded-full">
                🎢 T2
              </span>
            )}

            {/* Earnings Warning Badge */}
            {scan.data.advancedIndicators?.daysToEarnings !== undefined &&
              scan.data.advancedIndicators.daysToEarnings <= 3 &&
              scan.data.advancedIndicators.daysToEarnings >= 0 && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-600/50 text-yellow-200 text-xs rounded-full border border-yellow-500/50">
                  ⚠️ Earnings in {scan.data.advancedIndicators.daysToEarnings}d
                </span>
              )}
            {/* Sniper Zone Badge */}
            {scan.data.metrics?.supportLevel &&
              Math.abs(
                scan.data.currentPrice - scan.data.metrics.supportLevel,
              ) /
                scan.data.metrics.supportLevel <
                0.02 && (
                <span className="ml-2 px-2 py-0.5 bg-red-600/50 text-red-300 text-xs rounded-full animate-pulse border border-red-500/50">
                  🎯 Sniper Zone
                </span>
              )}
            <p className="text-gray-400 text-sm">
              {formatUSD(scan.data.currentPrice || 0)}
              <span
                className={`ml-2 ${
                  (scan.data.priceChangePercent || 0) >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {(scan.data.priceChangePercent || 0) >= 0 ? "+" : ""}
                {(scan.data.priceChangePercent || 0).toFixed(2)}%
              </span>
            </p>
          </div>
        </div>

        {/* Right: Signal & Strength + Entry Status */}
        <div className="text-right">
          <p
            className={`text-2xl font-bold ${
              scan.data.overallSignal === "BUY"
                ? "text-green-400"
                : scan.data.overallSignal === "SELL"
                  ? "text-red-400"
                  : "text-yellow-400"
            }`}
          >
            {scan.data.overallSignal}
          </p>
          <p className="text-gray-500 text-sm">
            {scan.data.signalStrength.toFixed(0)}% confidence
          </p>
          {/* Decision Reason (Fusion Layer) */}
          {scan.data.decisionReason && (
            <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] ml-auto leading-tight italic">
              {scan.data.decisionReason}
            </p>
          )}
          {/* Entry Status Badge */}
          {scan.data.entryStatus && (
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                scan.data.entryStatus === "ready"
                  ? "bg-green-600/50 text-green-300"
                  : scan.data.entryStatus === "late"
                    ? "bg-red-600/50 text-red-300"
                    : "bg-gray-600/50 text-gray-300"
              }`}
            >
              {scan.data.entryStatus === "ready"
                ? "✅ เข้าได้เลย!"
                : scan.data.entryStatus === "late"
                  ? "⚠️ สายไปแล้ว"
                  : "⏳ รอจังหวะ"}
            </span>
          )}
          {/* Candle Pattern Badge */}
          {scan.data.advancedIndicators?.candlePattern &&
            scan.data.advancedIndicators.candlePattern.name !== "None" && (
              <span
                className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold border ${
                  scan.data.advancedIndicators.candlePattern.signal ===
                  "bullish"
                    ? "bg-emerald-900/40 text-emerald-300 border-emerald-500/30"
                    : "bg-gray-700/50 text-gray-300 border-gray-600/30"
                }`}
              >
                🕯️ {scan.data.advancedIndicators.candlePattern.name}
              </span>
            )}
          {/* Anti-Knife-Catching Safety Badge */}
          {scan.data.advancedIndicators && (
            <span
              className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold border ${
                scan.data.advancedIndicators.isPriceStabilized
                  ? "bg-green-900/40 text-green-300 border-green-500/30"
                  : "bg-red-900/40 text-red-300 border-red-500/30"
              }`}
            >
              {scan.data.advancedIndicators.isPriceStabilized
                ? "🛡️ ยืนเหนือ EMA5"
                : "🔪 ใต้ EMA5 (ห้ามรับมีด!)"}
            </span>
          )}
          {/* Squeeze & ADX & V-Shape Badges */}
          {scan.data.advancedIndicators?.isEarlyMomentum && (
            <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-xs font-bold border bg-pink-900/40 text-pink-300 border-pink-500/30 animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.3)]">
              🚀 V-Shape Rebound
            </span>
          )}
          {scan.data.advancedIndicators?.bollingerBands?.isSqueeze && (
            <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-xs font-bold border bg-purple-900/40 text-purple-300 border-purple-500/30 animate-pulse">
              🌪️ Squeeze (เตรียมระเบิด)
            </span>
          )}
          {scan.data.advancedIndicators?.adx?.isTrending && (
            <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded text-xs font-bold border bg-orange-900/40 text-orange-400 border-orange-500/30">
              🔥 ADX Trending
            </span>
          )}
        </div>
      </div>

      {/* Pattern & Trend Info */}
      <div className="mt-4 pt-4 border-t border-gray-700/50">
        <div className="flex flex-wrap items-center gap-3">
          {/* Trend */}
          <div
            className={`px-3 py-1 rounded-full text-xs ${
              scan.data.trend.shortTerm === "up"
                ? "bg-green-900/50 text-green-400"
                : scan.data.trend.shortTerm === "down"
                  ? "bg-red-900/50 text-red-400"
                  : "bg-yellow-900/50 text-yellow-400"
            }`}
          >
            {scan.data.trend.shortTerm === "up"
              ? "⬆️ Uptrend"
              : scan.data.trend.shortTerm === "down"
                ? "⬇️ Downtrend"
                : "➡️ Sideway"}
          </div>

          {/* Patterns with status badges */}
          {scan.data.patterns.map((pattern, i) => (
            <div
              key={i}
              className={`px-3 py-1 rounded-full text-xs ${
                pattern.status === "ready"
                  ? "bg-green-600/50 text-green-300 border border-green-500/50"
                  : pattern.status === "confirmed"
                    ? "bg-gray-600/50 text-gray-400"
                    : pattern.signal === "bullish"
                      ? "bg-green-900/50 text-green-400"
                      : "bg-red-900/50 text-red-400"
              }`}
            >
              {pattern.status === "ready"
                ? "✅ "
                : pattern.status === "confirmed"
                  ? "⚠️ "
                  : ""}
              {pattern.name}
              {pattern.distanceToBreakout !== undefined &&
                pattern.distanceToBreakout > 0 && (
                  <span className="ml-1 opacity-70">
                    ({pattern.distanceToBreakout.toFixed(1)}% to breakout)
                  </span>
                )}
            </div>
          ))}

          {scan.data.patterns.length === 0 && (
            <span className="text-gray-500 text-xs">ไม่พบ Pattern ชัดเจน</span>
          )}
        </div>

        {/* ========== SPECIFIC PATTERN SETUPS (e.g. Triangle) ========== */}
        {scan.data.patterns.some((p) => p.breakoutLevel !== undefined) && (
          <div className="mt-3">
            {scan.data.patterns
              .filter((p) => p.breakoutLevel !== undefined)
              .map((tri, i) => (
                <div
                  key={i}
                  className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl mb-2"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📐</span>
                      <div>
                        <h4 className="text-blue-300 font-bold text-sm flex items-center gap-2">
                          {tri.name} Setup
                          {tri.debugData && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                setShowDebug(!showDebug);
                              }}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-gray-400 px-2 py-0.5 rounded border border-slate-600 transition-colors"
                            >
                              {showDebug ? "ซ่อนสูตร" : "ดูสูตรคำนวณ"}
                            </button>
                          )}
                        </h4>
                        <p className="text-gray-400 text-xs italic">
                          {tri.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Debug Data Panel */}
                  {showDebug && tri.debugData && (
                    <div className="mb-3 p-3 bg-slate-950/80 rounded border border-slate-700/50 text-left">
                      <p className="text-xs font-bold text-blue-400 mb-2">
                        🧮 ค่าที่ใช้ประมวลผล (Internal Logic)
                      </p>
                      <ul className="text-[10px] text-gray-300 font-mono space-y-1">
                        <li>
                          <span className="text-gray-500">ยอดอดีต (p1):</span> $
                          {tri.debugData.p1?.price}
                        </li>
                        <li>
                          <span className="text-gray-500">ยอดล่าสุด (p2):</span>{" "}
                          ${tri.debugData.p2?.price}
                        </li>
                        <li>
                          <span className="text-gray-500">ฐานอดีต (v1):</span> $
                          {tri.debugData.v1?.price}
                        </li>
                        <li>
                          <span className="text-gray-500">ฐานล่าสุด (v2):</span>{" "}
                          ${tri.debugData.v2?.price}
                        </li>
                        <hr className="border-slate-800 my-1" />
                        <li>
                          <span className="text-gray-500 block">
                            สมการความชันแนวต้าน (Peak Slope):
                          </span>
                          <span className="text-slate-400 ml-2">
                            {tri.debugData.mathPeakSlope || "-"}
                          </span>
                        </li>
                        <li>
                          <span className="text-gray-500 block">
                            % ความชันแนวต้านต่อวัน:
                          </span>
                          <span
                            className={`ml-2 ${
                              tri.debugData.isResistanceFlat
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {tri.debugData.mathNormPeakSlope || "-"}
                            <span className="text-gray-500 ml-1">
                              (เกณฑ์ความแบน: &lt; {tri.debugData.thresholdFlat})
                            </span>
                          </span>
                          <span className="ml-2">
                            {tri.debugData.isResistanceFlat
                              ? "✅ ต้านแข็ง"
                              : "❌ ต้านไม่แข็ง"}
                          </span>
                        </li>
                        <hr className="border-slate-800 my-1" />
                        <li>
                          <span className="text-gray-500 block">
                            สมการความชันแนวรับ (Valley Slope):
                          </span>
                          <span className="text-slate-400 ml-2">
                            {tri.debugData.mathValleySlope || "-"}
                          </span>
                        </li>
                        <li>
                          <span className="text-gray-500 block">
                            % ความชันแนวรับต่อวัน:
                          </span>
                          <span
                            className={`ml-2 ${
                              tri.debugData.isSupportRising
                                ? "text-green-400"
                                : "text-yellow-400"
                            }`}
                          >
                            {tri.debugData.mathNormValleySlope || "-"}
                            <span className="text-gray-500 ml-1">
                              (เกณฑ์ความชัน: &gt;{" "}
                              {tri.debugData.thresholdTrending})
                            </span>
                          </span>
                          <span className="ml-2">
                            {tri.debugData.isSupportRising
                              ? "✅ ฐานยก (แรงซื้อหนุน)"
                              : "❌ ฐานไม่ยก"}
                          </span>
                        </li>
                        <hr className="border-slate-800 my-1" />
                        <li>
                          <span className="text-gray-500 block">
                            สมการการบีบแคบลง (Convergence Ratio):
                          </span>
                          <span className="text-slate-400 ml-2">
                            {tri.debugData.mathConvergence || "-"}
                          </span>
                          <span className="ml-2">
                            {tri.debugData.isConverging
                              ? "✅ บีบแคบลง (< 0.85)"
                              : "❌ ยังไม่บีบ"}{" "}
                            (Ratio: {tri.debugData.convergenceRatio})
                          </span>
                        </li>
                        <hr className="border-slate-800 my-1" />
                        <li>
                          <span className="text-gray-500 block">
                            สมการวอลุ่มหดตัว (Volume Drying Up):
                          </span>
                          <span className="text-slate-400 ml-2">
                            {tri.debugData.mathVolume || "-"}
                          </span>
                          <span className="ml-2">
                            {tri.debugData.isVolumeDryingUp
                              ? "✅ วอลุ่มหดตัว"
                              : "❌ วอลุ่มไม่ลดลง"}
                          </span>
                        </li>
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-center bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                    <div>
                      <p className="text-gray-500 text-[10px]">
                        Breakout Level (ต้าน)
                      </p>
                      <p className="text-white font-bold text-sm">
                        ${tri.breakoutLevel?.toFixed(2) || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] text-green-400/80">
                        Profit Target
                      </p>
                      <p className="text-green-400 font-bold text-sm">
                        ${tri.targetPrice?.toFixed(2) || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] text-red-400/80">
                        Cut Loss
                      </p>
                      <p className="text-red-400 font-bold text-sm">
                        ${tri.stopLoss?.toFixed(2) || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Smart Entry & Trade Setup */}
        {scan.data.metrics?.supportLevel && (
          <div className="grid grid-cols-3 gap-3 mt-3">
            {/* Smart Entry */}
            <div className="bg-blue-900/20 rounded-lg p-2 text-center border border-blue-500/20">
              <p className="text-gray-400 text-xs">🎯 Smart Entry</p>
              <p className="text-blue-400 font-bold text-sm">
                {formatUSD(scan.data.metrics.supportLevel)}
              </p>
            </div>

            {/* Smart Target */}
            {scan.data.metrics.resistanceLevel && (
              <div className="bg-green-900/20 rounded-lg p-2 text-center border border-green-500/20">
                <p className="text-gray-400 text-xs">🚀 Target</p>
                <p className="text-green-400 font-bold text-sm">
                  {formatUSD(scan.data.metrics.resistanceLevel)}
                </p>
              </div>
            )}

            {/* Smart Cut Loss */}
            {scan.data.advancedIndicators?.suggestedStopLoss && (
              <div className="bg-red-900/20 rounded-lg p-2 text-center border border-red-500/20">
                <p className="text-gray-400 text-xs">🛑 Cut Loss</p>
                <p className="text-red-400 font-bold text-sm">
                  {formatUSD(scan.data.advancedIndicators.suggestedStopLoss)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ATR-based Cut Loss (Sniper Tip #2) */}
        {scan.data.advancedIndicators?.atr &&
          scan.data.advancedIndicators.atr > 0 && (
            <div className="mt-3 p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-300 text-sm">
                <span className="text-lg">🌊</span>
                <div>
                  <p className="font-bold">ATR-Based Cut Loss</p>
                  <p className="text-xs opacity-70 italic text-white">
                    {scan.data.overallSignal === "SELL"
                      ? "Entry + (1.5 * ATR) [SHORT]"
                      : "Entry - (1.5 * ATR)"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-red-400 font-mono font-bold">
                  {formatUSD(
                    scan.data.overallSignal === "SELL"
                      ? scan.data.currentPrice +
                          1.5 * scan.data.advancedIndicators.atr
                      : scan.data.currentPrice -
                          1.5 * scan.data.advancedIndicators.atr,
                  )}
                </p>
                <p className="text-[10px] text-gray-500">Trailing Protection</p>
              </div>
            </div>
          )}

        {/* ========== PIVOT POINTS & FIBONACCI ========== */}
        {scan.data.metrics?.pivotLevels && scan.data.metrics?.fibLevels && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {/* Pivot Points (Expanded) */}
            <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">📐 Pivot Points</p>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
                {/* R3 */}
                <div className="text-gray-500">R3</div>
                <div className="text-red-300 col-span-2 text-right">
                  {formatUSD(scan.data.metrics.pivotLevels.r3)}
                </div>
                {/* R2 */}
                <div className="text-gray-500">R2</div>
                <div className="text-red-400 col-span-2 text-right">
                  {formatUSD(scan.data.metrics.pivotLevels.r2)}
                </div>
                {/* R1 */}
                <div className="text-gray-500">R1</div>
                <div className="text-red-500 col-span-2 text-right">
                  {formatUSD(scan.data.metrics.pivotLevels.r1)}
                </div>
                {/* Pivot */}
                <div className="text-yellow-500 font-bold border-y border-gray-600 py-0.5">
                  P
                </div>
                <div className="text-yellow-400 font-bold border-y border-gray-600 py-0.5 col-span-2 text-right">
                  {formatUSD(scan.data.metrics.pivotLevels.pivot)}
                </div>
                {/* S1 */}
                <div className="text-gray-500">S1</div>
                <div className="text-green-500 col-span-2 text-right">
                  {formatUSD(scan.data.metrics.pivotLevels.s1)}
                </div>
                {/* S2 */}
                <div className="text-gray-500">S2</div>
                <div className="text-green-400 col-span-2 text-right">
                  {formatUSD(scan.data.metrics.pivotLevels.s2)}
                </div>
                {/* S3 */}
                <div className="text-gray-500">S3</div>
                <div className="text-green-300 col-span-2 text-right">
                  {formatUSD(scan.data.metrics.pivotLevels.s3)}
                </div>
              </div>
            </div>

            {/* Fibonacci Levels */}
            <div className="bg-gray-800/80 rounded-lg p-3 border border-gray-700">
              <p className="text-gray-400 text-xs mb-1">
                🔢 Fibonacci Retracement
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-yellow-300">0.382</span>
                  <span className="text-white">
                    {formatUSD(scan.data.metrics.fibLevels.fib382)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-500">0.500</span>
                  <span className="text-white">
                    {formatUSD(scan.data.metrics.fibLevels.fib500)}
                  </span>
                </div>
                <div className="flex justify-between">
                  {/* Golden Ratio Highlight */}
                  <span className="text-amber-400 font-bold">0.618 (Gold)</span>
                  <span className="text-amber-400 font-bold">
                    {formatUSD(scan.data.metrics.fibLevels.fib618)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== ADVANCED INDICATOR MATRIX ========== */}
        {scan.data.advancedIndicators && (
          <div className="mt-3 bg-gray-900/50 rounded-xl p-3 border border-gray-700/50">
            <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
              🔬 Advanced Metrics Matrix
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {/* Pillar 1: Trend */}
              <div
                className={`p-2 rounded-lg ${
                  scan.data.metrics?.pillarTrend
                    ? "bg-green-900/30 border border-green-500/30"
                    : "bg-red-900/30 border border-red-500/30"
                }`}
              >
                <p className="text-[10px] text-gray-400">Trend Pillar</p>
                <p
                  className={`font-bold ${
                    scan.data.metrics?.pillarTrend
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {scan.data.metrics?.pillarTrend ? "BULLISH" : "BEARISH"}
                </p>
              </div>

              {/* Pillar 2: Value/RSI */}
              <div
                className={`p-2 rounded-lg ${
                  scan.data.metrics?.pillarValue
                    ? "bg-green-900/30 border border-green-500/30"
                    : "bg-yellow-900/30 border border-yellow-500/30"
                }`}
              >
                <p className="text-[10px] text-gray-400">Value (RSI)</p>
                <p
                  className={`font-bold ${
                    scan.data.metrics?.pillarValue
                      ? "text-green-400"
                      : "text-yellow-400"
                  }`}
                >
                  {scan.data.metrics?.rsi.toFixed(1)}
                </p>
              </div>

              {/* Pillar 3: Momentum/Vol */}
              <div
                className={`p-2 rounded-lg ${
                  scan.data.metrics?.pillarMomentum
                    ? "bg-green-900/30 border border-green-500/30"
                    : "bg-gray-800 border border-gray-700"
                }`}
              >
                <p className="text-[10px] text-gray-400">Volume</p>
                <p
                  className={`font-bold ${
                    scan.data.metrics?.pillarMomentum
                      ? "text-green-400"
                      : "text-gray-400"
                  }`}
                >
                  {scan.data.metrics?.volumeStatus.toUpperCase()}
                </p>
              </div>

              {/* Divergences */}
              <div
                className={`p-2 rounded-lg ${
                  scan.data.advancedIndicators.divergences.some(
                    (d) => d.type === "bearish",
                  )
                    ? "bg-red-900/30 border border-red-500/30"
                    : scan.data.advancedIndicators.divergences.some(
                          (d) => d.type === "bullish",
                        )
                      ? "bg-green-900/30 border border-green-500/30"
                      : "bg-gray-800 border border-gray-700"
                }`}
              >
                <p className="text-[10px] text-gray-400">Divergence</p>
                <p className="font-bold text-white">
                  {scan.data.advancedIndicators.divergences.length > 0
                    ? scan.data.advancedIndicators.divergences[0].type.toUpperCase()
                    : "NONE"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

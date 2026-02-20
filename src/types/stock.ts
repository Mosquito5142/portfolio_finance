// Stock Portfolio Types

export interface StockHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  buyPrice: number;
  buyDate: string;
  soldQuantity?: number;
  soldPrice?: number;
  soldDate?: string;
  realizedProfit?: number;
}

export interface GroupedStock {
  symbol: string;
  name: string;
  totalQuantity: number;
  averageCost: number;
  totalCost: number;
  holdings: StockHolding[];
}

export interface StockPrice {
  symbol: string;
  currentPrice: number;
  previousClose: number;
  dayChange: number;
  dayChangePercent: number;
  isEstimated?: boolean; // true ถ้าเป็นราคาประมาณจาก XAG
  source?: string; // แหล่งที่มา เช่น "XAG/USD"
  actualClosePrice?: number; // ราคาปิดจริงของ SLV
  estimatedPrice?: number; // ราคาประมาณจาก XAG
  estimatedChange?: number; // % เปลี่ยนแปลงจาก XAG
  // Technical Analysis
  support?: number; // แนวรับ
  resistance?: number; // แนวต้าน
  high52w?: number; // ราคาสูงสุด 52 สัปดาห์
  low52w?: number; // ราคาต่ำสุด 52 สัปดาห์
  // Moving Averages
  ema5?: number; // EMA 5 วัน (Fast - Trailing Stop)
  ma20?: number; // EMA 20 วัน
  ma50?: number; // SMA 50 วัน
  ma200?: number; // SMA 200 วัน
  maSignal?: "bullish" | "bearish" | "neutral"; // สัญญาณ MA
  // RSI & MACD
  rsi?: number; // RSI 14 วัน
  rsiSignal?: "overbought" | "oversold" | "neutral"; // สัญญาณ RSI
  macd?: number; // MACD Line
  macdSignal?: number; // Signal Line
  macdHistogram?: number; // Histogram
  macdTrend?: "bullish" | "bearish" | "neutral"; // สัญญาณ MACD
  // Volume Profile
  poc?: number; // Point of Control
  vaHigh?: number; // Value Area High
  vaLow?: number; // Value Area Low
  // Volume Analysis (Momentum)
  volumeToday?: number; // Volume วันนี้
  volumeAvg10?: number; // Volume เฉลี่ย 10 วัน
  volumeChangePercent?: number; // % เปลี่ยนแปลง volume
  volumeSignal?: "strong" | "weak_divergence" | "panic_sell" | "normal";
  // Short Interest
  shortInterest?: number; // % Short
  shortRatio?: number; // Days to cover
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

// Advanced Quant Data
export interface MacroData {
  dxy: number; // Dollar Index
  dxyChange: number; // % เปลี่ยนแปลงรายวัน
  dxyChange5d: number; // % เปลี่ยนแปลง 5 วัน
  dxyTrend: "up" | "down" | "sideways"; // แนวโน้ม 5 วัน
  us10y: number; // 10-Year Treasury Yield
  us10yChange: number; // % เปลี่ยนแปลง
  timestamp: string;
}

export interface VolumeProfile {
  poc: number; // Point of Control - ราคาที่มี volume สูงสุด
  pocVolume: number; // Volume ที่ POC
  vaHigh: number; // Value Area High (70% of volume)
  vaLow: number; // Value Area Low (70% of volume)
  priceVolumeMap: { price: number; volume: number }[];
}

export interface InsiderData {
  insiderBuying: boolean; // มีการซื้อใน 3 เดือน
  insiderSelling: boolean; // มีการขายใน 3 เดือน
  netInsiderShares: number; // จำนวน shares net (บวก=ซื้อ, ลบ=ขาย)
  insiderSentiment: "buying" | "selling" | "neutral";
  shortInterest?: number; // % Short Interest
  shortRatio?: number; // Days to cover
}

// Pattern Scanner Types
export interface PatternResult {
  name: string;
  type: "reversal" | "continuation";
  signal: "bullish" | "bearish" | "neutral";
  status?: "forming" | "ready" | "confirmed";
  confidence: number;
  description: string;
  entryZone?: { low: number; high: number };
  breakoutLevel?: number;
  distanceToBreakout?: number;
  targetPrice?: number;
  stopLoss?: number;
  debugData?: any; // For raw math/calculation display
}

export interface TrendAnalysis {
  shortTerm: "up" | "down" | "sideways";
  longTerm: "up" | "down" | "sideways";
  sma20: number;
  sma50: number;
  currentPrice: number;
  strength: number;
}

export interface PivotLevels {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface FibonacciLevels {
  swingHigh: number;
  swingLow: number;
  fib236: number;
  fib382: number;
  fib500: number;
  fib618: number;
  fib786: number;
}

export interface KeyMetrics {
  rsi: number;
  rsiStatus: "oversold" | "normal" | "overbought";
  volumeChange: number;
  volumeStatus: "weak" | "normal" | "strong";
  sma200: number;
  aboveSma200: boolean;
  week52High: number;
  week52Low: number;
  distanceFrom52High: number;
  distanceFrom52Low: number;
  score3Pillars: number;
  pillarTrend: boolean;
  pillarValue: boolean;
  pillarMomentum: boolean;
  supportLevel: number;
  resistanceLevel: number;
  sma50Role: "support" | "resistance";
  sma20Role: "support" | "resistance";
  rrRatio?: number;
  rrStatus?: "excellent" | "good" | "risky" | "bad";
  pivotLevels: PivotLevels;
  fibLevels: FibonacciLevels;
  confluenceZones: string[];
}

// Advanced Indicator Types
export interface MACDResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
  trend: "bullish" | "bearish" | "neutral";
  histogramTrend: "expanding" | "contracting" | "flat";
  lossOfMomentum: boolean;
}

export interface OBVResult {
  obv: number;
  obvTrend: "up" | "down" | "flat";
  obvDivergence: "bullish" | "bearish" | "none";
}

export interface DivergenceResult {
  type: "bullish" | "bearish" | "none";
  indicator: string;
  description: string;
  severity: "strong" | "moderate" | "weak";
}

export interface IndicatorMatrixItem {
  signal: "bullish" | "bearish" | "neutral";
  weight: number;
  score: number;
}

export interface IndicatorMatrix {
  dowTheory: IndicatorMatrixItem;
  rsi: IndicatorMatrixItem;
  macd: IndicatorMatrixItem;
  volume: IndicatorMatrixItem;
  candle?: IndicatorMatrixItem;
  totalScore: number;
  recommendation: "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "STRONG_SELL";
}

export interface CandlePattern {
  name: string;
  signal: "bullish" | "neutral";
  confidence: number;
}

export interface AdvancedIndicators {
  macd: MACDResult;
  obv: OBVResult;
  divergences: DivergenceResult[];
  trendPhase:
    | "accumulation"
    | "participation"
    | "distribution"
    | "markdown"
    | "unknown";
  indicatorMatrix: IndicatorMatrix;
  volumeConfirmation: boolean;
  rsiInterpretation: string;
  // NEW: Sniper Bot v3 Features
  candlePattern: CandlePattern;
  atr: number;
  marketContext: {
    vixValue: number;
    qqqTrend: "bullish" | "bearish" | "neutral";
    marketTemperature: "hot" | "normal" | "cold";
  };
  daysToEarnings?: number;
  // Anti-Knife-Catching v3.2
  ema5: number;
  isPriceStabilized: boolean;
  isMomentumReturning: boolean;
  suggestedStopLoss: number;
  suggestedTakeProfit: number;
  atrMultiplier: number;
}

export interface PatternResponse {
  symbol: string;
  currentPrice: number;
  priceChange: number;
  priceChangePercent: number;
  patterns: PatternResult[];
  trend: TrendAnalysis;
  overallSignal: "BUY" | "SELL" | "HOLD";
  signalStrength: number;
  entryStatus?: "ready" | "wait" | "late";
  decisionReason?: string; // NEW: Fusion logic explanation
  metrics?: KeyMetrics;
  advancedIndicators?: AdvancedIndicators;
  error?: string;
}

export interface StockScan {
  symbol: string;
  data: PatternResponse | null;
  status: "pending" | "loading" | "done" | "error";
}

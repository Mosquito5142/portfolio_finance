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

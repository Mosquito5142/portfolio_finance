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
}

export interface PortfolioSummary {
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  totalProfitPercent: number;
  dayChange: number;
  dayChangePercent: number;
}

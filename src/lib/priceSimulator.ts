// Price Simulator - Simulates real-time stock prices

import { StockPrice } from "@/types/stock";

// Base prices for simulation (ราคาจริง ณ วันที่ 26 ม.ค. 2026)
const BASE_PRICES: Record<string, number> = {
  NVDA: 142.5, // อัพเดทราคาจริงได้ตรงนี้
  TSLA: 420.0, // อัพเดทราคาจริงได้ตรงนี้
  GOOGL: 327.93, // อัพเดทราคาจริงได้ตรงนี้
  SLV: 92.91, // อัพเดททราคาจริงได้ตรงนี้
};

// Store today's opening prices for day change calculation
const todayOpenPrices: Record<string, number> = {};

// Store current prices
const currentPrices: Record<string, number> = {};

// Initialize opening prices once per session
function initializeOpeningPrices(symbols: string[]): void {
  symbols.forEach((symbol) => {
    if (!todayOpenPrices[symbol]) {
      const basePrice = BASE_PRICES[symbol] || 100;
      // Random opening price within ±2% of base
      const variation = (Math.random() - 0.5) * 0.04;
      todayOpenPrices[symbol] = basePrice * (1 + variation);
      currentPrices[symbol] = todayOpenPrices[symbol];
    }
  });
}

// Simulate price movement (±0.3% fluctuation)
function simulatePriceMovement(symbol: string): number {
  const currentPrice =
    currentPrices[symbol] ||
    todayOpenPrices[symbol] ||
    BASE_PRICES[symbol] ||
    100;
  const change = (Math.random() - 0.5) * 0.006; // ±0.3%
  const newPrice = currentPrice * (1 + change);
  currentPrices[symbol] = newPrice;
  return newPrice;
}

export function getStockPrices(symbols: string[]): StockPrice[] {
  // Initialize if needed
  initializeOpeningPrices(symbols);

  return symbols.map((symbol) => {
    const currentPrice = simulatePriceMovement(symbol);
    const previousClose = todayOpenPrices[symbol];
    const dayChange = currentPrice - previousClose;
    const dayChangePercent = (dayChange / previousClose) * 100;

    return {
      symbol,
      currentPrice,
      previousClose,
      dayChange,
      dayChangePercent,
    };
  });
}

export function resetPrices(): void {
  Object.keys(todayOpenPrices).forEach((key) => {
    delete todayOpenPrices[key];
    delete currentPrices[key];
  });
}

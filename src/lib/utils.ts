// Utility functions for stock calculations

import { StockHolding, GroupedStock } from "@/types/stock";

// อัตราแลกเปลี่ยน USD -> THB (ประมาณ)
const USD_TO_THB_RATE = 34.5;

export function groupStocksBySymbol(holdings: StockHolding[]): GroupedStock[] {
  const grouped: Record<string, GroupedStock> = {};

  holdings.forEach((holding) => {
    // Only count holdings with remaining quantity
    if (holding.quantity <= 0) return;

    if (!grouped[holding.symbol]) {
      grouped[holding.symbol] = {
        symbol: holding.symbol,
        name: holding.name,
        totalQuantity: 0,
        averageCost: 0,
        totalCost: 0,
        holdings: [],
      };
    }

    grouped[holding.symbol].holdings.push(holding);
    grouped[holding.symbol].totalQuantity += holding.quantity;
    grouped[holding.symbol].totalCost += holding.quantity * holding.buyPrice;
  });

  // Calculate average cost
  Object.values(grouped).forEach((group) => {
    group.averageCost = group.totalCost / group.totalQuantity;
  });

  return Object.values(grouped).sort((a, b) => b.totalCost - a.totalCost);
}

// แปลง USD เป็น THB
export function usdToThb(usdAmount: number): number {
  return usdAmount * USD_TO_THB_RATE;
}

export function formatCurrency(
  value: number,
  convertToThb: boolean = true,
): string {
  const amount = convertToThb ? usdToThb(value) : value;
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format USD (สำหรับราคาหุ้น)
export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export { USD_TO_THB_RATE };

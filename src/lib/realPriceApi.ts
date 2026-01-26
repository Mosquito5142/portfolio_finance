// Stock Price API Client - ดึงราคาจาก internal API route

import { StockPrice } from "@/types/stock";

// ใช้ internal API route แทน Yahoo โดยตรง
export async function fetchStockPrices(
  symbols: string[],
): Promise<Record<string, StockPrice>> {
  try {
    const response = await fetch(`/api/prices?symbols=${symbols.join(",")}`);

    if (!response.ok) {
      throw new Error("Failed to fetch prices");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching stock prices:", error);
    return {};
  }
}

// ตรวจสอบว่าตลาดเปิดหรือปิด (US Market Hours)
export function isMarketOpen(): boolean {
  const now = new Date();
  const nyTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" }),
  );

  const day = nyTime.getDay();
  const hour = nyTime.getHours();
  const minute = nyTime.getMinutes();

  // วันเสาร์-อาทิตย์ปิด
  if (day === 0 || day === 6) return false;

  // ตลาดเปิด 9:30 AM - 4:00 PM ET
  const timeInMinutes = hour * 60 + minute;
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM

  return timeInMinutes >= marketOpen && timeInMinutes < marketClose;
}

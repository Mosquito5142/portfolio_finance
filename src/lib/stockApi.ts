// Stock API - Fetch portfolio from Google Sheets

import { StockHolding } from "@/types/stock";

// ใส่ URL ของ Google Apps Script ที่ Deploy แล้ว
// ไปที่ Apps Script > Deploy > New deployment > Web app > Copy URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbzimV4_nZha4SEzvt_LkXvFz3gA0KtnzF3vsdDZuABfmHv6-ljp0PshjoNmbhHL9-CO8g/exec";

// Mock data ตามข้อมูลที่ให้มา - ใช้เมื่อ API ไม่ทำงาน
const MOCK_PORTFOLIO: StockHolding[] = [
  {
    id: "stock_1766200078348",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 1.0901773,
    buyPrice: 134.18,
    buyDate: "16/12/2024",
  },
  {
    id: "stock_1766200165467",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 1.1945398,
    buyPrice: 123.51,
    buyDate: "31/1/2025",
  },
  {
    id: "stock_1766200198419",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 1.2344327,
    buyPrice: 117.88,
    buyDate: "28/2/2025",
  },
  {
    id: "stock_1766200226483",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 1.092657,
    buyPrice: 140.11,
    buyDate: "30/5/2025",
  },
  {
    id: "stock_1766200247731",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 2.0057523,
    buyPrice: 152.98,
    buyDate: "1/7/2025",
  },
  {
    id: "stock_1766200268979",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 0.8704991,
    buyPrice: 175.97,
    buyDate: "2/8/2025",
  },
  {
    id: "stock_1766200290227",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 0.4424041,
    buyPrice: 172.74,
    buyDate: "20/8/2025",
  },
  {
    id: "stock_1766200311475",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 1.6511392,
    buyPrice: 166.16,
    buyDate: "5/9/2025",
  },
  {
    id: "stock_1766200332723",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 0.178078,
    buyPrice: 179.53,
    buyDate: "23/9/2025",
  },
  {
    id: "stock_1766200353971",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 0.3533739,
    buyPrice: 175.88,
    buyDate: "24/9/2025",
  },
  {
    id: "stock_1766200375219",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 0.4255401,
    buyPrice: 180.88,
    buyDate: "7/11/2025",
  },
  {
    id: "stock_1766200396467",
    symbol: "NVDA",
    name: "NVDA",
    quantity: 0.8616042,
    buyPrice: 178.1,
    buyDate: "24/11/2025",
  },
  {
    id: "stock_1766200417715",
    symbol: "TSLA",
    name: "TSLA",
    quantity: 0.5145852,
    buyPrice: 288.99,
    buyDate: "28/4/2025",
  },
  {
    id: "stock_1766200438963",
    symbol: "TSLA",
    name: "TSLA",
    quantity: 0.452645,
    buyPrice: 338.21,
    buyDate: "2/6/2025",
  },
  {
    id: "stock_1766200460211",
    symbol: "TSLA",
    name: "TSLA",
    quantity: 0.0436507,
    buyPrice: 403.21,
    buyDate: "14/11/2025",
  },
  {
    id: "stock_1767666106575",
    symbol: "GOOGL",
    name: "GOOGL",
    quantity: 1.0087902,
    buyPrice: 316.72,
    buyDate: "2025-01-05",
  },
  {
    id: "stock_1767836162197",
    symbol: "SLV",
    name: "SLV",
    quantity: 13.2219964,
    buyPrice: 73.29,
    buyDate: "2026-01-07",
  },
  {
    id: "stock_1769052287589",
    symbol: "SLV",
    name: "SLV",
    quantity: 29.0457448,
    buyPrice: 85.11,
    buyDate: "2026-01-21",
  },
];

export async function fetchPortfolio(): Promise<StockHolding[]> {
  try {
    const response = await fetch(`${API_URL}?sheet=portfolio`, {
      method: "GET",
      mode: "cors",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch portfolio");
    }

    const data = await response.json();

    // Transform data to match our types
    return data.map((item: Record<string, unknown>) => ({
      id: item.id as string,
      symbol: item.symbol as string,
      name: item.name as string,
      quantity: Number(item.quantity) || 0,
      buyPrice: Number(item.buyPrice) || 0,
      buyDate: String(item.buyDate || ""),
      soldQuantity: item.soldQuantity ? Number(item.soldQuantity) : undefined,
      soldPrice: item.soldPrice ? Number(item.soldPrice) : undefined,
      soldDate: item.soldDate ? String(item.soldDate) : undefined,
      realizedProfit: item.realizedProfit
        ? Number(item.realizedProfit)
        : undefined,
    }));
  } catch (error) {
    console.warn("API fetch failed, using mock data:", error);
    // Return mock data when API fails
    return MOCK_PORTFOLIO;
  }
}

// คลังหุ้นแบบ dynamic — ดึงจาก Google Sheet (Stock_Master) ถ้ามี
// ถ้าชีตว่าง/ดึงไม่ได้ จะ fallback ไปลิสต์ในโค้ด (stocks.ts)
import { useState, useEffect, useMemo } from "react";
import {
  MAGNIFICENT_SEVEN,
  TIER_1_MEGA_TECH,
  TIER_1_AI_HARDWARE,
  TIER_1_AI_INFRASTRUCTURE,
  TIER_1_AI_SOFTWARE,
  TIER_1_GROWTH_TECH,
  TIER_1_HEALTH_BIO,
  TIER_1_ENERGY_RESOURCES,
  ALPHA_PICKS_WATCHLIST,
  TIER_2_SPECULATIVE,
  FINVIZ_WATCHLIST,
  AI_HIDDEN_GEMS,
  STOCK_DETAILS,
} from "./stocks";

export interface StockEntry {
  symbol: string;
  category: string;
  detail: string;
}

// หมวดหมู่มาตรฐาน (ใช้ใน dropdown หน้าจัดการ)
export const STOCK_CATEGORIES = [
  "Magnificent 7",
  "Mega Tech",
  "AI Hardware",
  "AI Infrastructure",
  "AI Software",
  "Growth Tech",
  "Healthcare/Bio",
  "Energy/Resources",
  "Alpha Picks",
  "Speculative",
  "Finviz",
  "AI Hidden Gems",
  "Uncategorized",
];

// แปลงลิสต์ในโค้ดเดิม → StockEntry[] (ใช้เป็น fallback และปุ่ม Seed)
const TIER_MAP: { list: string[]; category: string }[] = [
  { list: MAGNIFICENT_SEVEN, category: "Magnificent 7" },
  { list: TIER_1_MEGA_TECH, category: "Mega Tech" },
  { list: TIER_1_AI_HARDWARE, category: "AI Hardware" },
  { list: TIER_1_AI_INFRASTRUCTURE, category: "AI Infrastructure" },
  { list: TIER_1_AI_SOFTWARE, category: "AI Software" },
  { list: TIER_1_GROWTH_TECH, category: "Growth Tech" },
  { list: TIER_1_HEALTH_BIO, category: "Healthcare/Bio" },
  { list: TIER_1_ENERGY_RESOURCES, category: "Energy/Resources" },
  { list: ALPHA_PICKS_WATCHLIST, category: "Alpha Picks" },
  { list: TIER_2_SPECULATIVE, category: "Speculative" },
  { list: FINVIZ_WATCHLIST, category: "Finviz" },
  { list: AI_HIDDEN_GEMS, category: "AI Hidden Gems" },
];

export const CODE_STOCK_LIST: StockEntry[] = (() => {
  const seen = new Set<string>();
  const out: StockEntry[] = [];
  for (const { list, category } of TIER_MAP) {
    for (const symbol of list) {
      if (seen.has(symbol)) continue;
      seen.add(symbol);
      out.push({ symbol, category, detail: STOCK_DETAILS[symbol] || "" });
    }
  }
  return out;
})();

// ดึงรายการหุ้น: พยายามจาก Sheet ก่อน ถ้าไม่ได้ค่อย fallback ไปโค้ด
export async function fetchStockList(): Promise<{
  entries: StockEntry[];
  source: "sheet" | "code";
}> {
  try {
    const res = await fetch("/api/stocks", { cache: "no-store" });
    const json = await res.json();
    if (
      json?.status === "success" &&
      Array.isArray(json.data) &&
      json.data.length > 0
    ) {
      return { entries: json.data as StockEntry[], source: "sheet" };
    }
  } catch {
    /* ตกไป fallback */
  }
  return { entries: CODE_STOCK_LIST, source: "code" };
}

// Hook สำหรับหน้า client: ดึงคลังหุ้น + ค่าที่ derive ไว้ใช้ได้เลย
// เริ่มจากลิสต์ในโค้ดก่อน (ไม่ว่างตอนโหลด) แล้วแทนที่ด้วยข้อมูลจาก Sheet
export function useStockList() {
  const [entries, setEntries] = useState<StockEntry[]>(CODE_STOCK_LIST);
  const [source, setSource] = useState<"sheet" | "code">("code");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchStockList().then((res) => {
      if (!alive) return;
      setEntries(res.entries);
      setSource(res.source);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const symbols = useMemo(() => entries.map((e) => e.symbol), [entries]);
  const detailMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const e of entries) if (e.detail) m[e.symbol] = e.detail;
    return m;
  }, [entries]);
  const categoryGroups = useMemo(() => groupByCategory(entries), [entries]);

  return { entries, symbols, detailMap, categoryGroups, source, loaded };
}

// จัดกลุ่มตาม category → ใช้ทำปุ่ม Quick Select
export function groupByCategory(
  entries: StockEntry[],
): { category: string; symbols: string[] }[] {
  const map = new Map<string, string[]>();
  for (const e of entries) {
    const cat = e.category || "Uncategorized";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(e.symbol);
  }
  return Array.from(map.entries()).map(([category, symbols]) => ({
    category,
    symbols,
  }));
}

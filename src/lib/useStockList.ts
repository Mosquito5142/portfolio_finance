"use client";

// Hook ฝั่ง client สำหรับดึงคลังหุ้น + ค่าที่ derive ไว้ใช้ได้เลย
// เริ่มจากลิสต์ในโค้ดก่อน (ไม่ว่างตอนโหลด) แล้วแทนที่ด้วยข้อมูลจาก Sheet
import { useState, useEffect, useMemo } from "react";
import {
  fetchStockList,
  groupByCategory,
  CODE_STOCK_LIST,
  type StockEntry,
} from "./stockList";

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

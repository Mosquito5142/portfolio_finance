"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Target,
  Save,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Copy,
  CheckCheck,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PortfolioRow {
  rowIndex: number;
  date: string;
  ticker: string;
  action: string;
  quantity: number;
  price: number;
  cutLoss: number;
  target: number;
  soldDate: string;
  soldQty: number;
  soldPrice: number;
  status: string;
  // Merged live data
  livePrice?: number;
  liveChangePercent?: number;
  group?: string;
  targetAlloc?: number;
  /** @deprecated เลิกใช้แล้ว เหลือไว้อ่านของเก่า — แบ่งพอร์ตด้วย group แทน */
  portfolioType?: "main" | "growth";
}

interface PortfolioGroup {
  group: string;
  label: string;
  targetPct: number;
  order: number;
}

const FALLBACK_GROUP = "other";

// สีประจำหมวด วนใช้ซ้ำตามลำดับ order ถ้าหมวดเยอะกว่าสีที่มี
const GROUP_COLORS = [
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#10b981", // emerald-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  "#ef4444", // red-500
  "#64748b", // slate-500
];

export default function PortfolioTracker() {
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "HISTORY" | "DCA">("ACTIVE");
  const [dcaData, setDcaData] = useState<any[]>([]);
  const [dcaLoading, setDcaLoading] = useState(false);
  const [portfolioData, setPortfolioData] = useState<PortfolioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Currency State
  const [currency, setCurrency] = useState<"USD" | "THB">("THB");
  const [usdtRate, setUsdtRate] = useState<number>(34.5); // Default fallback

  // Form State
  const [ticker, setTicker] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [cutLoss, setCutLoss] = useState("");
  const [target, setTarget] = useState("");
  const [targetAlloc, setTargetAlloc] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState<string | null>(null);
  const [sellQty, setSellQty] = useState<{ [key: string]: string }>({});
  const [sellPrice, setSellPrice] = useState<{ [key: string]: string }>({});

  // Rebalancing Simulator State
  const [simPrice, setSimPrice] = useState<{ [key: string]: string }>({});
  const [simAmount, setSimAmount] = useState<{ [key: string]: string }>({});

  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // "all" = ดูรวมทุกหมวด นอกนั้นคือ key ของหมวดในชีต Portfolio_groups
  const [viewFilter, setViewFilter] = useState<string>("all");
  const [tradeGroup, setTradeGroup] = useState<string>(FALLBACK_GROUP);
  const [groups, setGroups] = useState<PortfolioGroup[]>([]);

  // จัดการหมวด (เพิ่ม/ลบ/แก้ % เป้าหมาย)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState<PortfolioGroup[]>([]);
  const [groupSaving, setGroupSaving] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  // ย้ายหมวดของหุ้นที่ถืออยู่ (key = groupKey ของการ์ด)
  const [regrouping, setRegrouping] = useState<string | null>(null);

  // หุ้นที่ไม่มีหมวด หรือมีหมวดที่ไม่ตรงกับชีต config (พิมพ์ผิด / หมวดถูกลบทีหลัง)
  // ให้ตกมาเป็น "อื่นๆ" ทั้งหมด จะได้ไม่มีหมวดลอย ๆ โผล่ในหน้าจอ
  const normalizeGroup = (g?: string) => {
    if (!g) return FALLBACK_GROUP;
    if (groups.length === 0) return g; // config ยังโหลดไม่เสร็จ อย่าเพิ่งตีตกเป็นอื่นๆ
    return groups.some((x) => x.group === g) ? g : FALLBACK_GROUP;
  };
  const [isCopied, setIsCopied] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<{
    [key: string]: boolean;
  }>({});

  const [historyViewMode, setHistoryViewMode] = useState<"TIMELINE" | "GROUPED">("TIMELINE");
  const [expandedHistoryGroups, setExpandedHistoryGroups] = useState<{
    [key: string]: boolean;
  }>({});
  const [chartMode, setChartMode] = useState<"compare" | "individual" | "strategy">("compare");

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleHistoryGroup = (key: string) => {
    setExpandedHistoryGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetchExchangeRate();
    fetchGroups();
    fetchPortfolioData();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/sheets/groups", { cache: "no-store" });
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        const list: PortfolioGroup[] = json.data;
        setGroups(list);
        // ตั้งค่าเริ่มต้นของฟอร์มเป็นหมวดแรก เผื่อชีตไม่มีหมวดชื่อ "other"
        if (list.length && !list.some((g) => g.group === FALLBACK_GROUP)) {
          setTradeGroup(list[0].group);
        }
      }
    } catch (e) {
      console.error("Failed to fetch portfolio groups", e);
    }
  };

  const openGroupModal = () => {
    setGroupDraft(groups.map((g) => ({ ...g })));
    setGroupError(null);
    setIsGroupModalOpen(true);
  };

  const patchDraft = (idx: number, patch: Partial<PortfolioGroup>) => {
    setGroupDraft((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)),
    );
  };

  const addDraftRow = () => {
    setGroupDraft((prev) => [
      ...prev,
      {
        group: "",
        label: "",
        targetPct: 0,
        order: (prev[prev.length - 1]?.order || prev.length) + 1,
      },
    ]);
  };

  const removeDraftRow = (idx: number) => {
    setGroupDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  const draftTotalPct = groupDraft.reduce(
    (s, g) => s + (Number(g.targetPct) || 0),
    0,
  );

  // นับว่าหมวดนี้มีหุ้นถืออยู่กี่ตัว ใช้เตือนตอนจะลบหมวด
  const holdingsInGroup = (key: string) =>
    portfolioData.filter(
      (r) => r.status !== "CLOSED" && normalizeGroup(r.group) === key,
    ).length;

  const handleSaveGroups = async () => {
    setGroupError(null);

    const cleaned = groupDraft.map((g, i) => ({
      group: g.group.trim(),
      label: g.label.trim() || g.group.trim(),
      targetPct: Number(g.targetPct) || 0,
      order: i + 1,
    }));

    if (!cleaned.length) {
      setGroupError("ต้องมีอย่างน้อย 1 หมวด");
      return;
    }
    for (const g of cleaned) {
      if (!g.group) {
        setGroupError("มีหมวดที่ยังไม่ได้ใส่ key");
        return;
      }
      if (!/^[a-z0-9_]+$/.test(g.group)) {
        setGroupError(
          `key "${g.group}" ใช้ไม่ได้ — ใช้ได้เฉพาะ a-z, 0-9 และ _ (ห้ามเว้นวรรค/ภาษาไทย)`,
        );
        return;
      }
    }
    const keys = cleaned.map((g) => g.group);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup) {
      setGroupError(`key "${dup}" ซ้ำกัน`);
      return;
    }
    if (draftTotalPct > 100.01) {
      setGroupError(`สัดส่วนรวมกันได้ ${draftTotalPct}% ซึ่งเกิน 100%`);
      return;
    }

    // หุ้นในหมวดที่ถูกลบจะตกไปเป็น "อื่นๆ" อัตโนมัติ (normalizeGroup) — เตือนก่อนบันทึก
    const removed = groups.filter((g) => !keys.includes(g.group));
    const orphaned = removed
      .map((g) => ({ label: g.label, n: holdingsInGroup(g.group) }))
      .filter((x) => x.n > 0);
    if (orphaned.length) {
      const msg = orphaned
        .map((x) => `${x.label} (${x.n} ตัว)`)
        .join(", ");
      if (
        !confirm(
          `กำลังลบหมวดที่ยังมีหุ้นอยู่: ${msg}\n\nหุ้นเหล่านี้จะถูกตีเป็น "อื่นๆ" ยืนยันหรือไม่?`,
        )
      )
        return;
    }

    setGroupSaving(true);
    try {
      const res = await fetch("/api/sheets/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: cleaned }),
      });
      const json = await res.json();
      if (!res.ok || json.success === false) {
        setGroupError(json.error || "บันทึกไม่สำเร็จ");
        return;
      }
      await fetchGroups();
      setIsGroupModalOpen(false);
    } catch (e: any) {
      setGroupError(e.message || "เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์");
    } finally {
      setGroupSaving(false);
    }
  };

  // ย้ายหุ้นทั้งการ์ด (ทุกไม้ของ ticker นั้นในหมวดนั้น) ไปหมวดใหม่
  const handleChangeGroup = async (
    cardKey: string,
    ticker: string,
    items: any[],
    newGroup: string,
  ) => {
    setRegrouping(cardKey);
    try {
      for (const item of items) {
        const res = await fetch("/api/sheets/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            actionType: "PORTFOLIO_EDIT",
            item: {
              rowIndex: item.rowIndex,
              // ฝั่ง Apps Script บังคับให้ส่งมายืนยันว่าแถวนี้คือหุ้นตัวที่ตั้งใจแก้จริง
              expectTicker: ticker,
              group: newGroup,
            },
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.detail || j.error || `แก้แถว ${item.rowIndex} ไม่สำเร็จ`);
        }
      }
      await fetchPortfolioData();
    } catch (e: any) {
      alert(`ย้ายหมวดไม่สำเร็จ: ${e.message}`);
    } finally {
      setRegrouping(null);
    }
  };

  const fetchExchangeRate = async () => {
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      if (res.ok) {
        const data = await res.json();
        if (data.rates && data.rates.THB) {
          setUsdtRate(data.rates.THB);
        }
      }
    } catch (e) {
      console.warn("Could not fetch exchange rate, using default 34.5");
    }
  };

  const fetchPortfolioData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sheets/portfolio", { cache: "no-store" });
      if (!res.ok) throw new Error("ดึงข้อมูลพอร์ตไม่สำเร็จ");
      const json = await res.json();

      if (json.status === "success" && json.data) {
        const rows: PortfolioRow[] = json.data;

        // แยก Active เพื่อไปดึงราคาปัจจุบัน
        const activeRows = rows.filter((r) => r.status !== "CLOSED");

        const tickers = Array.from(
          new Set(
            activeRows.filter((r) => r.ticker !== "CASH").map((r) => r.ticker),
          ),
        ).join(",");

        let livePrices: Record<string, any> = {};

        // Fetch Live Prices via existing working /api/prices endpoint
        if (tickers) {
          try {
            const liveRes = await fetch(`/api/prices?symbols=${tickers}`);
            if (liveRes.ok) {
              const liveJson = await liveRes.json();
              Object.keys(liveJson).forEach((symbol) => {
                livePrices[symbol] = {
                  price: liveJson[symbol].currentPrice,
                  changePercent: liveJson[symbol].dayChangePercent,
                };
              });
            }
          } catch (e) {
            console.error("Failed to fetch live prices", e);
          }
        }

        // Merge Live Prices back into data
        const mergedData = rows.map((r) => {
          if (r.ticker === "CASH") {
            return {
              ...r,
              livePrice: r.price, // Cash USD value is 1-to-1 with its entry
              liveChangePercent: 0,
            };
          }
          if (r.status !== "CLOSED" && livePrices[r.ticker]) {
            return {
              ...r,
              livePrice: livePrices[r.ticker].price,
              liveChangePercent: livePrices[r.ticker].changePercent,
            };
          }
          return r;
        });

        setPortfolioData(mergedData);
      } else {
        throw new Error(json.message || "ไม่พบข้อมูลพอร์ตโฟลิโอ");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !quantity || !price || !cutLoss || !target) return;

    setSubmitLoading(true);
    try {
      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const res = await fetch("/api/sheets/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "PORTFOLIO_BUY",
          item: {
            date: dateStr,
            ticker: ticker.toUpperCase(),
            quantity: Number(quantity),
            price: Number(price),
            cut: Number(cutLoss),
            target: Number(target),
            targetAlloc: Number(targetAlloc) || 0,
            group: tradeGroup,
          },
        }),
      });

      if (res.ok) {
        setTicker("");
        setQuantity("");
        setPrice("");
        setCutLoss("");
        setTarget("");
        setTargetAlloc("");
        setTradeGroup(groups[0]?.group || FALLBACK_GROUP);
        setIsAddModalOpen(false);
        await fetchPortfolioData();
      } else {
        alert("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการติดต่อกับเซิร์ฟเวอร์");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSellTrade = async (
    rowIndex: number,
    ticker: string,
    buyQty: number,
    group: string,
  ) => {
    const itemKey = `${group}_${rowIndex}`;
    const sQty = Number(sellQty[itemKey]);
    const sPrice = Number(sellPrice[itemKey]);

    if (!sQty || !sPrice) {
      alert("กรุณากรอกจำนวนหุ้นและราคาที่ขายให้ครบถ้วน");
      return;
    }

    if (sQty > buyQty) {
      alert(`จำนวนหุ้นที่ขาย (${sQty}) มากกว่าจำนวนที่มีจริง (${buyQty})`);
      return;
    }

    const confirmSale = confirm(
      `ยืนยันการขาย ${ticker} จำนวน ${sQty} หุ้น ที่ราคา ${formatCurrency(sPrice)} ดอลลาร์ ใช่หรือไม่?`,
    );
    if (!confirmSale) return;

    setSellLoading(itemKey);
    try {
      const dateStr = new Date().toISOString().split("T")[0];
      const res = await fetch("/api/sheets/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "PORTFOLIO_SELL",
          item: {
            rowIndex: rowIndex,
            soldDate: dateStr,
            soldQty: sQty,
            soldPrice: sPrice,
          },
        }),
      });

      if (res.ok) {
        setSellQty((prev) => {
          const newState = { ...prev };
          delete newState[itemKey];
          return newState;
        });
        setSellPrice((prev) => {
          const newState = { ...prev };
          delete newState[itemKey];
          return newState;
        });
        await fetchPortfolioData();
      } else {
        alert("บันทึกการขายไม่สำเร็จ");
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการทำรายการขาย");
    } finally {
      setSellLoading(null);
    }
  };

  // derived data
  let actives = portfolioData.filter(
    (r) => r.status === "ACTIVE" && r.ticker !== "CASH",
  );
  
  // Fetch DCA Data when tab becomes active
  useEffect(() => {
    if (activeTab === "DCA" && dcaData.length === 0) {
      const activeTickers = Array.from(new Set(actives.filter(a => a.ticker !== "CASH").map((a) => a.ticker)));
      if (activeTickers.length > 0) {
        setDcaLoading(true);
        fetch(`/api/portfolio/dca?symbols=${activeTickers.join(",")}`)
          .then((res) => res.json())
          .then((data) => {
            setDcaData(data);
          })
          .catch((err) => console.error("DCA fetch error:", err))
          .finally(() => setDcaLoading(false));
      }
    }
  }, [activeTab, dcaData.length, actives]);    // Fix: If status is explicitly ACTIVE, always show it
      // (soldQty from a previous CLOSED trade on the same ticker can be inherited)
  actives = portfolioData.filter(
    (r) =>
      r.status !== "CLOSED" &&
      // Fix: If status is explicitly ACTIVE, always show it
      // (soldQty from a previous CLOSED trade on the same ticker can be inherited)
      (r.status === "ACTIVE" || r.quantity - (r.soldQty || 0) > 0) &&
      (viewFilter === "all" || normalizeGroup(r.group) === viewFilter),
  );
  const histories = portfolioData.filter(
    (r) =>
      (r.status === "CLOSED" || r.status === "PARTIAL_SOLD") &&
      (viewFilter === "all" || normalizeGroup(r.group) === viewFilter),
  );

  const groupedHistories = Object.values(
    histories.reduce((acc: any, item: any) => {
      const key = item.ticker;
      if (!acc[key]) {
        acc[key] = {
          ticker: item.ticker,
          items: [],
          totalPnl: 0,
          totalTrades: 0,
          winCount: 0,
        };
      }
      
      const pnl = (item.soldPrice - item.price) * (item.soldQty || item.quantity);
      acc[key].items.push({ ...item, pnl, pnlPct: ((item.soldPrice - item.price) / item.price) * 100 });
      acc[key].totalPnl += pnl;
      acc[key].totalTrades += 1;
      if (pnl >= 0) acc[key].winCount += 1;
      
      return acc;
    }, {})
  ).sort((a: any, b: any) => b.totalPnl - a.totalPnl); // Sort by highest profit first

  // Grouping Actives by Ticker & Group
  const groupedObj = actives.reduce(
    (acc, item) => {
      const key = `${normalizeGroup(item.group)}_${item.ticker}`;
      const holdingQty =
        item.status === "ACTIVE"
          ? item.quantity
          : item.quantity - (item.soldQty || 0);
      const price = item.price;
      const currentPrice = item.livePrice || item.price;

      if (!acc[key]) {
        acc[key] = {
          ticker: item.ticker,
          group: normalizeGroup(item.group),
          items: [],
          totalQty: 0,
          totalCostUSD: 0,
          currentPrice: currentPrice,
          liveChangePercent: item.liveChangePercent,
          targetAlloc: item.targetAlloc || 0,
        };
      }
      acc[key].items.push({ ...item, holdingQty });
      acc[key].totalQty += holdingQty;
      acc[key].totalCostUSD += holdingQty * price;
      acc[key].targetAlloc = Math.max(
        acc[key].targetAlloc,
        item.targetAlloc || 0,
      );

      return acc;
    },
    {} as Record<string, any>,
  );

  let groupedActives = Object.values(groupedObj);

  // Apply sorting on groups
  groupedActives.sort((a: any, b: any) => {
    const aValue = a.currentPrice * a.totalQty;
    const bValue = b.currentPrice * b.totalQty;
    const aAvgPrice = a.totalCostUSD / a.totalQty;
    const bAvgPrice = b.totalCostUSD / b.totalQty;
    const aPnlPct = ((a.currentPrice - aAvgPrice) / aAvgPrice) * 100;
    const bPnlPct = ((b.currentPrice - bAvgPrice) / bAvgPrice) * 100;

    switch (sortBy) {
      case "value_desc":
        return bValue - aValue;
      case "value_asc":
        return aValue - bValue;
      case "pnl_desc":
        return bPnlPct - aPnlPct;
      case "pnl_asc":
        return aPnlPct - bPnlPct;
      case "name_asc":
        return a.ticker.localeCompare(b.ticker);
      case "date_desc":
      default:
        const aMaxRow = Math.max(...a.items.map((i: any) => i.rowIndex));
        const bMaxRow = Math.max(...b.items.map((i: any) => i.rowIndex));
        return bMaxRow - aMaxRow;
    }
  });

  let totalInvestedUSD = 0;
  let totalCurrentValueUSD = 0;

  actives.forEach((item) => {
    const holdingQty =
      item.status === "ACTIVE"
        ? item.quantity
        : item.quantity - (item.soldQty || 0); // Fix: ACTIVE = use own qty
    totalInvestedUSD += holdingQty * item.price;
    if (item.livePrice) {
      totalCurrentValueUSD += holdingQty * item.livePrice;
    } else {
      totalCurrentValueUSD += holdingQty * item.price; // fallback if no live price
    }
  });

  const unrealizedPnLUSD = totalCurrentValueUSD - totalInvestedUSD;
  const unrealizedPnLPct =
    totalInvestedUSD > 0 ? (unrealizedPnLUSD / totalInvestedUSD) * 100 : 0;

  let realizedPnLUSD = 0;
  let winCount = 0;
  let lossCount = 0;

  histories.forEach((item) => {
    if (item.soldQty && item.soldPrice) {
      const pnl = (item.soldPrice - item.price) * item.soldQty;
      realizedPnLUSD += pnl;
      if (pnl > 0) winCount++;
      else if (pnl < 0) lossCount++;
    }
  });

  const totalClosedTrades = winCount + lossCount;
  const winRate =
    totalClosedTrades > 0 ? (winCount / totalClosedTrades) * 100 : 0;

  const netPnLUSD = unrealizedPnLUSD + realizedPnLUSD;
  const netPnLPct =
    totalInvestedUSD > 0 ? (netPnLUSD / totalInvestedUSD) * 100 : 0;

  // Currency Converter Formatter (For PnL & Global Summaries)
  const formatCurrency = (valUSD: number) => {
    const converted = currency === "THB" ? valUSD * usdtRate : valUSD;
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };
  const getSymbol = () => (currency === "THB" ? "฿" : "$");

  // Strict USD Formatter (For Stock Prices and Position Values)
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // --- Portfolio Composition Data ---
  const compositionData = groupedActives
    .map((group: any) => {
      const { ticker, totalQty, currentPrice, totalCostUSD } = group;
      const usdValue = currentPrice * totalQty;
      const pnlUSD = usdValue - totalCostUSD;
      const pnlPct = totalCostUSD > 0 ? (pnlUSD / totalCostUSD) * 100 : 0;
      return {
        name: ticker,
        value: usdValue,
        pnl: pnlUSD,
        pnlPct: pnlPct,
      };
    })
    .filter((item) => item.value > 0)
    .sort((a: any, b: any) => b.value - a.value);

  // --- Per-Group Metrics (for Filter Buttons & Strategy Chart) ---
  // นับเฉพาะหมวดที่ "มีหุ้นอยู่จริง" — หมวดที่ตั้งเป้าไว้แต่ยังไม่ได้ซื้อจะไม่ขึ้นบนหน้าจอ
  // (ยังเลือกได้จาก dropdown ตอนบันทึกหุ้นใหม่ ไม่งั้นจะซื้อตัวแรกของหมวดนั้นไม่ได้)
  const groupStats: Record<
    string,
    { value: number; cost: number; pnl: number }
  > = {};
  const bump = (key: string, value: number, cost: number) => {
    if (!groupStats[key]) groupStats[key] = { value: 0, cost: 0, pnl: 0 };
    groupStats[key].value += value;
    groupStats[key].cost += cost;
    groupStats[key].pnl += value - cost;
  };

  // calculate across ALL active items
  portfolioData
    .filter((r) => r.status !== "CLOSED")
    .forEach((item) => {
      const holdingQty =
        item.status === "ACTIVE"
          ? item.quantity
          : item.quantity - (item.soldQty || 0);
      const currentPrice = item.livePrice || item.price;
      bump(
        normalizeGroup(item.group),
        currentPrice * holdingQty,
        item.price * holdingQty,
      );
    });

  const totalVal = Object.values(groupStats).reduce((s, g) => s + g.value, 0);

  // เรียงตาม order ในชีต — normalizeGroup การันตีแล้วว่าทุก key มีใน config
  const groupViews = Object.keys(groupStats)
    .map((key, i) => {
      const cfg = groups.find((g) => g.group === key);
      const st = groupStats[key];
      const order = cfg?.order ?? 900 + i;
      return {
        key,
        label: cfg?.label || key,
        targetPct: cfg?.targetPct ?? 0,
        order,
        value: st.value,
        cost: st.cost,
        pnl: st.pnl,
        weight: totalVal > 0 ? (st.value / totalVal) * 100 : 0,
        pnlPct: st.cost > 0 ? (st.pnl / st.cost) * 100 : 0,
        color: GROUP_COLORS[order % GROUP_COLORS.length],
      };
    })
    .sort((a, b) => a.order - b.order);

  const strategyData = groupViews
    .filter((g) => g.value > 0)
    .map((g) => ({ name: g.label, value: g.value, color: g.color }));

  const activeGroupView =
    viewFilter === "all" ? null : groupViews.find((g) => g.key === viewFilter);

  const COLORS = [
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#06b6d4", // cyan-500
    "#84cc16", // lime-500
    "#f97316", // orange-500
    "#ef4444", // red-500
  ];

  const handleCopySummary = () => {
    let summaryText = `📊 สรุปพอร์ตการลงทุน (${
      viewFilter === "all" ? "ทุกหมวด" : activeGroupView?.label || viewFilter
    })\n\n`;

    if (viewFilter === "all") {
      const parts = groupViews
        .filter((g) => g.value > 0 || g.targetPct > 0)
        .map(
          (g) => `${g.label} ${g.weight.toFixed(0)}%/เป้า ${g.targetPct}%`,
        );
      summaryText += `สัดส่วนพอร์ต: ${parts.join(" | ")}\n\n`;
    }

    const netFormatted = formatCurrency(Math.abs(netPnLUSD));
    const netSignStr = netPnLUSD >= 0 ? "+" : "-";
    summaryText += `Net ROI: ${getSymbol()}${netSignStr}${netFormatted} (${netSignStr}${Math.abs(netPnLPct).toFixed(2)}%) | Win Rate: ${winRate.toFixed(1)}%\n\n`;

    const linesByGroup: Record<string, string[]> = {};

    groupedActives.forEach((g: any) => {
      const { ticker, totalQty, currentPrice, totalCostUSD, group } = g;

      const avgPrice = totalCostUSD / totalQty;
      const pnlUSD = (currentPrice - avgPrice) * totalQty;
      const pnlPct = ((currentPrice - avgPrice) / avgPrice) * 100;

      const pnlIcon = pnlUSD >= 0 ? "🟢" : "🔴";
      const pnlSign = pnlUSD >= 0 ? "+" : "-";
      const pnlStr = `${pnlSign}$${formatUSD(Math.abs(pnlUSD))} (${pnlSign}${Math.abs(pnlPct).toFixed(2)}%)`;

      const itemUSD = currentPrice * totalQty;
      const currentAllocPct =
        totalCurrentValueUSD > 0 ? (itemUSD / totalCurrentValueUSD) * 100 : 0;

      const key = group; // groupedActives normalize มาให้แล้ว
      if (!linesByGroup[key]) linesByGroup[key] = [];

      if (ticker === "CASH") {
        linesByGroup[key].push(
          `CASH | สัดส่วน: ${currentAllocPct.toFixed(1)}% | ยอดคงเหลือ: $${formatUSD(itemUSD)}`,
        );
      } else {
        linesByGroup[key].push(
          `${ticker} | สัดส่วน: ${currentAllocPct.toFixed(1)}% | ${pnlIcon} PnL: ${pnlStr} | ทุน: $${formatUSD(avgPrice)} ➡️ ปัจจุบัน: $${formatUSD(currentPrice)} | จำนวน: ${totalQty} หุ้น`,
        );
      }
    });

    groupViews.forEach((g) => {
      if (viewFilter !== "all" && viewFilter !== g.key) return;
      const lines = linesByGroup[g.key] || [];
      if (!lines.length) return;

      const gap = g.weight - g.targetPct;
      const gapStr =
        g.targetPct > 0
          ? ` — ตอนนี้ ${g.weight.toFixed(1)}% / เป้า ${g.targetPct}% (${gap >= 0 ? "+" : ""}${gap.toFixed(1)}%)`
          : ` — ตอนนี้ ${g.weight.toFixed(1)}%`;

      summaryText += `${g.label}${gapStr}\n\n`;
      summaryText += lines.join("\n\n") + "\n\n";
    });

    navigator.clipboard.writeText(summaryText.trim()).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans pt-24 custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Setup */}
        <div className="flex flex-col gap-6 mb-4">
          {/* Row 1: Title (Top) */}
          <div className="flex justify-center">
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center gap-3">
              <Briefcase size={32} className="text-emerald-500" />
              พอร์ตการลงทุน (Portfolio)
            </h1>
          </div>

          {/* Row 2: Portfolio Filter (Center) */}
          <div className="flex justify-center">
            <div className="flex flex-wrap justify-center items-center bg-slate-900 border border-slate-700/50 rounded-lg p-1 shadow-lg text-sm gap-1">
              <button
                onClick={() => setViewFilter("all")}
                className={`px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm rounded-md font-bold transition-all ${
                  viewFilter === "all"
                    ? "bg-white/10 text-white"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                ทั้งหมด (100%)
              </button>
              {groupViews.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setViewFilter(g.key)}
                  aria-label={`${g.label} — สัดส่วน ${g.weight.toFixed(0)}% เป้าหมาย ${g.targetPct}%`}
                  title={`${g.label} — เป้าหมาย ${g.targetPct}%`}
                  className={`px-3 py-1.5 md:px-5 md:py-2 text-xs md:text-sm rounded-md font-bold transition-all ${
                    viewFilter === g.key
                      ? "bg-white/10 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  style={
                    viewFilter === g.key ? { color: g.color } : undefined
                  }
                >
                  {g.label} ({g.weight.toFixed(0)}%
                  <span className="text-slate-600">/{g.targetPct}%</span>{" "}
                  <span
                    className={
                      g.pnlPct >= 0 ? "text-emerald-500" : "text-red-500"
                    }
                  >
                    {g.pnlPct >= 0 ? "+" : ""}
                    {g.pnlPct.toFixed(1)}%
                  </span>
                  )
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Add Trade (Right) and Currency Toggle (Left) */}
          <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800/50">
            {/* Currency Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-700/50 rounded-lg p-1 w-full xl:w-auto justify-center">
              <button
                onClick={() => setCurrency("THB")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex-1 xl:flex-none text-center ${
                  currency === "THB"
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                THB (บาท)
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex-1 xl:flex-none text-center ${
                  currency === "USD"
                    ? "bg-emerald-600/20 text-emerald-400"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                USD (ดอลลาร์)
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 sm:gap-3 flex-wrap justify-center xl:justify-end w-full xl:w-auto">
              <Link
                href="/portfolio/analyzer"
                className="bg-emerald-600/20 hover:bg-emerald-600/40 text-sm font-bold px-3 py-2 sm:px-4 sm:py-2.5 border border-emerald-500/50 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] whitespace-nowrap text-emerald-400 hover:text-emerald-300 flex-1 sm:flex-none"
              >
                <BrainCircuit size={18} />
                AI <span className="hidden sm:inline">วิเคราะห์พอร์ต</span>
              </Link>
              <button
                onClick={handleCopySummary}
                className="bg-slate-800 hover:bg-slate-700 text-sm font-bold px-3 py-2 sm:px-4 sm:py-2.5 border border-slate-700 rounded-lg flex items-center justify-center gap-2 transition-all whitespace-nowrap text-slate-300 hover:text-white flex-1 sm:flex-none"
              >
                {isCopied ? (
                  <>
                    <CheckCheck size={18} className="text-emerald-500" />
                    <span className="text-emerald-500 hidden sm:inline">
                      คัดลอกแล้ว
                    </span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    <span className="hidden sm:inline">คัดลอกสรุปพอร์ต</span>
                    <span className="sm:hidden">คัดลอกสรุป</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-sm font-bold px-4 py-2 sm:px-5 sm:py-2.5 border border-blue-500 rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(59,130,246,0.5)] whitespace-nowrap flex-1 sm:flex-none"
              >
                <Save size={18} />
                <span className="hidden sm:inline">+ บันทึกหุ้นใหม่</span>
                <span className="sm:hidden">+ เพิ่มหุ้น</span>
              </button>
            </div>
          </div>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative">
            <span className="absolute top-4 right-4 text-slate-700">
              <Briefcase size={20} />
            </span>
            <p className="text-slate-400 text-sm font-medium">เงินลงทุนสุทธิ</p>
            <p className="text-2xl font-bold text-white mt-1">
              {getSymbol()}
              {formatCurrency(totalInvestedUSD)}
            </p>
            <div className="mt-2 text-xs font-bold bg-slate-800/50 inline-block px-2 py-1 rounded-md">
              <span className="text-slate-400 mr-2">Net ROI:</span>
              <span
                className={netPnLUSD >= 0 ? "text-emerald-400" : "text-red-400"}
              >
                {netPnLUSD >= 0 ? "+" : ""}
                {getSymbol()}
                {formatCurrency(netPnLUSD)} ({netPnLUSD >= 0 ? "+" : ""}
                {netPnLPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
            <div
              className={`absolute top-0 right-0 w-16 h-16 blur-2xl rounded-full ${
                unrealizedPnLUSD >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
              }`}
            ></div>
            <p className="text-slate-400 text-sm font-medium">
              กำไร/ขาดทุน ที่ยังไม่รับรู้
            </p>
            <div className="flex items-end gap-2 mt-1">
              <p
                className={`text-2xl font-bold ${
                  unrealizedPnLUSD >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {unrealizedPnLUSD >= 0 ? "+" : ""}
                {getSymbol()}
                {formatCurrency(unrealizedPnLUSD)}
              </p>
              <span
                className={`text-sm mb-1 font-bold ${
                  unrealizedPnLPct >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                ({unrealizedPnLPct >= 0 ? "+" : ""}
                {unrealizedPnLPct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
            <div
              className={`absolute top-0 right-0 w-16 h-16 blur-2xl rounded-full ${
                realizedPnLUSD >= 0 ? "bg-amber-500/20" : "bg-red-500/20"
              }`}
            ></div>
            <p className="text-slate-400 text-sm font-medium">
              กำไร/ขาดทุน ที่รับรู้แล้ว (Realized)
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                realizedPnLUSD >= 0 ? "text-amber-400" : "text-red-400"
              }`}
            >
              {realizedPnLUSD >= 0 ? "+" : ""}
              {getSymbol()}
              {formatCurrency(realizedPnLUSD)}
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
            <p className="text-slate-400 text-sm font-medium">Win Rate</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-white">
                {winRate.toFixed(1)}%
              </p>
              <span className="text-xs text-slate-400">
                ({winCount} ชนะ - {lossCount} แพ้)
              </span>
            </div>
          </div>
        </div>

        {/* Group Allocation vs Target */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>🎯</span> สัดส่วนตามหมวด เทียบเป้าหมาย
            </h2>
            <button
              onClick={openGroupModal}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-colors border border-slate-700"
            >
              ⚙️ จัดการหมวด &amp; สัดส่วน
            </button>
          </div>

          {/* หมวดที่ตั้งเป้าไว้แต่ยังไม่มีหุ้น — ไม่โชว์เป็นการ์ดเต็มใบ แต่ยังบอกให้รู้ว่าเหลือช่องว่างเท่าไหร่ */}
          {(() => {
            const empty = groups.filter(
              (g) => !groupViews.some((v) => v.key === g.group) && g.targetPct > 0,
            );
            if (!empty.length) return null;
            const sum = empty.reduce((s, g) => s + g.targetPct, 0);
            return (
              <p className="text-xs text-slate-500 mb-4">
                ยังไม่มีในพอร์ต:{" "}
                {empty.map((g) => `${g.label} ${g.targetPct}%`).join(" · ")}{" "}
                <span className="text-slate-600">(รวม {sum}% ของเป้า)</span>
              </p>
            );
          })()}

          {groupViews.length === 0 ? (
            <p className="text-sm text-slate-500">
              ยังไม่มีหุ้นในพอร์ต
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {groupViews.map((g) => {
                const gap = g.weight - g.targetPct;
                // ถือว่า "ตรงเป้า" ถ้าห่างไม่เกิน 2% เพื่อไม่ให้ขึ้นเตือนตลอดจากการแกว่งปกติ
                const onTarget = Math.abs(gap) <= 2;
                return (
                  <div
                    key={g.key}
                    className="p-4 rounded-xl border border-slate-800 bg-slate-950/50"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <h3
                        className="font-bold text-sm truncate"
                        style={{ color: g.color }}
                      >
                        {g.label}
                      </h3>
                      <span
                        className={`text-xs font-bold ${
                          g.pnlPct >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {g.pnlPct >= 0 ? "+" : ""}
                        {g.pnlPct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-2xl font-bold text-white">
                        {g.weight.toFixed(1)}%
                      </span>
                      <span className="text-xs text-slate-500">
                        / เป้า {g.targetPct}%
                      </span>
                    </div>

                    {/* แถบสัดส่วนจริง พร้อมขีดตำแหน่งเป้าหมาย */}
                    <div className="relative h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(g.weight, 100)}%`,
                          backgroundColor: g.color,
                        }}
                      />
                    </div>
                    {g.targetPct > 0 && g.targetPct < 100 && (
                      <div className="relative h-0">
                        <div
                          className="absolute -top-2 w-0.5 h-2 bg-white/70"
                          style={{ left: `${g.targetPct}%` }}
                        />
                      </div>
                    )}

                    <p className="text-xs mt-3 font-medium">
                      {onTarget ? (
                        <span className="text-emerald-500">✓ ตรงเป้า</span>
                      ) : gap > 0 ? (
                        <span className="text-amber-400">
                          เกินเป้า +{gap.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-sky-400">
                          ต่ำกว่าเป้า {gap.toFixed(1)}%
                        </span>
                      )}
                      <span className="text-slate-600">
                        {" "}
                        · PnL{" "}
                        <span
                          className={
                            g.pnl >= 0 ? "text-emerald-500" : "text-red-500"
                          }
                        >
                          {g.pnl >= 0 ? "+" : ""}
                          {getSymbol()}
                          {formatCurrency(g.pnl)}
                        </span>
                      </span>
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Portfolio Composition Charts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <h2 className="text-lg font-bold text-white">
              สัดส่วนพอร์ต (Portfolio)
            </h2>
            <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-1 text-sm font-medium w-full md:w-auto">
              <button
                onClick={() => setChartMode("compare")}
                className={`flex-1 md:px-4 py-1.5 rounded-md transition-all ${chartMode === "compare" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                เปรียบเทียบ
              </button>
              <button
                onClick={() => setChartMode("individual")}
                className={`flex-1 md:px-4 py-1.5 rounded-md transition-all ${chartMode === "individual" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                รายตัว
              </button>
              <button
                onClick={() => setChartMode("strategy")}
                className={`flex-1 md:px-4 py-1.5 rounded-md transition-all ${chartMode === "strategy" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"}`}
              >
                กลยุทธ์
              </button>
            </div>
          </div>

          {(compositionData.length > 0 || strategyData.length > 0) ? (
            <div className={`grid gap-8 ${chartMode === "compare" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
              
              {/* Individual Chart */}
              {(chartMode === "compare" || chartMode === "individual") && (
                <div className="flex flex-col items-center bg-slate-950/40 p-5 rounded-xl border border-slate-800/50">
                  <h3 className="text-slate-300 font-bold mb-4">สัดส่วนรายตัว (Individual)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={compositionData}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={90}
                          paddingAngle={2} dataKey="value" stroke="none"
                        >
                          {compositionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === "CASH" ? "#ffffff" : COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => [`${getSymbol()}${formatCurrency(Number(value))}`, "มูลค่า"]}
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                          itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend for individual */}
                  <div className="w-full grid grid-cols-2 gap-y-3 gap-x-2 mt-6 px-2">
                    {compositionData.map((entry, index) => {
                      const total = compositionData.reduce((sum, item) => sum + item.value, 0);
                      const percent = ((entry.value / total) * 100).toFixed(1);
                      return (
                        <div key={`${entry.name}-${index}`} className="flex items-center gap-2 text-xs text-slate-300">
                          <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.name === "CASH" ? "#ffffff" : COLORS[index % COLORS.length] }}></div>
                          <span className="font-bold text-white truncate w-16">{entry.name}</span>
                          <span className="text-slate-400 ml-auto">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strategy Chart */}
              {(chartMode === "compare" || chartMode === "strategy") && (
                <div className="flex flex-col items-center bg-slate-950/40 p-5 rounded-xl border border-slate-800/50">
                  <h3 className="text-slate-300 font-bold mb-4">สัดส่วนตามหมวด (By Group)</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={strategyData}
                          cx="50%" cy="50%"
                          innerRadius={55} outerRadius={90}
                          paddingAngle={2} dataKey="value" stroke="none"
                        >
                          {strategyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => [`${getSymbol()}${formatCurrency(Number(value))}`, "มูลค่า"]}
                          contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#f8fafc" }}
                          itemStyle={{ color: "#f8fafc", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend for strategy */}
                  <div className="w-full flex flex-col gap-y-4 mt-6 px-4">
                    {strategyData.map((entry, index) => {
                      const total = strategyData.reduce((sum, item) => sum + item.value, 0);
                      const percent = ((entry.value / total) * 100).toFixed(1);
                      return (
                        <div key={`${entry.name}-${index}`} className="flex items-center justify-between text-sm text-slate-300">
                          <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }}></div>
                            <span className="font-bold text-white">{entry.name}</span>
                          </div>
                          <span className="text-slate-400 font-bold">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              ไม่มีข้อมูลหุ้นในพอร์ต
            </div>
          )}
        </div>

        {/* Main List */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 border-b border-slate-800 justify-between items-start sm:items-center">
            <div className="flex gap-4 w-full sm:w-auto overflow-x-auto custom-scrollbar border-b sm:border-b-0 border-slate-800">
              <button
                onClick={() => setActiveTab("ACTIVE")}
                className={`pb-3 text-sm font-bold px-4 border-b-2 transition-colors ${
                  activeTab === "ACTIVE"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                กำลังถือครอง ({actives.length})
              </button>
              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`pb-3 text-sm font-bold px-4 border-b-2 transition-colors ${
                  activeTab === "HISTORY"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                ประวัติการซื้อขาย
              </button>
              <button
                onClick={() => setActiveTab("DCA")}
                className={`pb-3 text-sm font-bold px-4 border-b-2 transition-colors ${
                  activeTab === "DCA"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                DCA Radar 🎯
              </button>
            </div>

            {activeTab === "ACTIVE" && (
              <div className="pb-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="date_desc">ล่าสุด</option>
                  <option value="value_desc">มูลค่ารวม (มากไปน้อย)</option>
                  <option value="value_asc">มูลค่ารวม (น้อยไปมาก)</option>
                  <option value="pnl_desc">% กำไร (มากไปน้อย)</option>
                  <option value="pnl_asc">% ขาดทุน (น้อยไปมาก)</option>
                  <option value="name_asc">ชื่อหุ้น (A-Z)</option>
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-20 text-slate-500 animate-pulse">
              กำลังดึงข้อมูลพอร์ตโฟลิโอ...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-400 bg-red-900/10 rounded-xl border border-red-900/50">
              <AlertTriangle size={32} className="mx-auto mb-2 opacity-50" />
              {error}
            </div>
          ) : activeTab === "ACTIVE" ? (
            <div className="space-y-4">
              {groupedActives.length === 0 && (
                <div className="text-center py-16 text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800/50 border-dashed">
                  ไม่พบข้อมูลหุ้นที่ถือครอง ลองบันทึกประวัติการซื้อสิ!
                </div>
              )}
              {groupedActives.map((g: any) => {
                const {
                  ticker,
                  group,
                  items,
                  totalQty,
                  totalCostUSD,
                  currentPrice,
                  targetAlloc: targetAllocPct,
                } = g;
                const groupKey = `${group}_${ticker}`;
                const groupView = groupViews.find((v) => v.key === group);
                const avgPrice = totalCostUSD / totalQty;
                const pnl = (currentPrice - avgPrice) * totalQty;
                const pnlPct = ((currentPrice - avgPrice) / avgPrice) * 100;
                const isProfit = pnl >= 0;

                const itemUSD = currentPrice * totalQty;
                const currentAllocPct =
                  totalCurrentValueUSD > 0
                    ? (itemUSD / totalCurrentValueUSD) * 100
                    : 0;
                const targetValueUSD =
                  (totalCurrentValueUSD * targetAllocPct) / 100;
                const diffUSD = targetValueUSD - itemUSD;

                const isExpanded = expandedGroups[groupKey] || false; // Initially collapsed by default

                return (
                  <div
                    key={groupKey}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
                  >
                    {/* Header: Aggregated view */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black tracking-tight text-white">
                            {ticker}
                          </h3>
                          {groups.length > 0 && (
                            <select
                              value={group}
                              disabled={regrouping === groupKey}
                              onChange={(e) =>
                                handleChangeGroup(
                                  groupKey,
                                  ticker,
                                  items,
                                  e.target.value,
                                )
                              }
                              aria-label={`หมวดของ ${ticker}`}
                              title={`ย้ายหมวดของ ${ticker} (มี ${items.length} ไม้)`}
                              className="text-[10px] bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 font-bold cursor-pointer hover:border-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                              style={{ color: groupView?.color }}
                            >
                              {groups.map((gr) => (
                                <option
                                  key={gr.group}
                                  value={gr.group}
                                  className="text-slate-200 bg-slate-900"
                                >
                                  {gr.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {regrouping === groupKey && (
                            <span className="text-[10px] text-slate-500">
                              กำลังย้าย...
                            </span>
                          )}
                          <span
                            className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md cursor-pointer"
                            onClick={() => toggleGroup(groupKey)}
                          >
                            {totalQty} หุ้น{" "}
                            {items.length > 1 && `(${items.length} ไม้)`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                          ต้นทุนเฉลี่ย:{" "}
                          <span className="text-slate-300 font-bold">
                            ${formatUSD(avgPrice)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          มูลค่ารวมตอนเข้า: {getSymbol()}
                          {formatCurrency(totalCostUSD)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400 mb-0.5">
                          ราคาปัจจุบัน
                        </p>
                        <p className="text-xl font-bold text-white leading-none">
                          ${formatUSD(currentPrice)}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 mb-2">
                          มูลค่ารวมตอนนี้:{" "}
                          <span className="text-slate-200">
                            {getSymbol()}
                            {formatCurrency(itemUSD)}
                          </span>
                        </p>
                        {ticker !== "CASH" && (
                          <p
                            className={`text-sm font-bold flex items-center justify-end gap-1 ${
                              isProfit ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {isProfit ? (
                              <TrendingUp size={14} />
                            ) : (
                              <TrendingDown size={14} />
                            )}
                            {pnlPct.toFixed(2)}% ({isProfit ? "+" : ""}
                            {getSymbol()}
                            {formatCurrency(pnl)})
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Target Allocation & Rebalancing - Show globally for group */}
                    {viewFilter !== "all" && ticker !== "CASH" && (
                      <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            สัดส่วนพอร์ต (Allocation)
                          </span>
                          {targetAllocPct > 0 && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                Math.abs(currentAllocPct - targetAllocPct) <= 2
                                  ? "bg-emerald-900/50 text-emerald-400"
                                  : "bg-amber-900/50 text-amber-400"
                              }`}
                            >
                              เป้าหมาย: {targetAllocPct.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        <div className="flex justify-between items-end">
                          <div>
                            <p
                              className={`text-xl font-bold ${
                                currentAllocPct > targetAllocPct + 2 &&
                                targetAllocPct > 0
                                  ? "text-amber-400"
                                  : "text-white"
                              }`}
                            >
                              {currentAllocPct.toFixed(1)}%
                            </p>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              ปัจจุบัน
                            </p>
                          </div>

                          {targetAllocPct > 0 ? (
                            <div className="text-right">
                              {diffUSD > 0 ? (
                                <p className="text-sm font-bold text-blue-400">
                                  + เติมเงิน {getSymbol()}
                                  {formatCurrency(diffUSD)}
                                </p>
                              ) : (
                                <p className="text-sm font-bold text-amber-400">
                                  - นำออก {getSymbol()}
                                  {formatCurrency(Math.abs(diffUSD))}
                                </p>
                              )}
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                เพื่อให้เป๊ะ {getSymbol()}
                                {formatCurrency(targetValueUSD)}
                              </p>
                            </div>
                          ) : (
                            <div className="text-right text-xs text-slate-500 flex flex-col items-end">
                              <span>ไม่ได้ตั้งเป้าหมาย</span>
                              <span className="text-[9px]">
                                (ใส่ % ใน Sheet กล่อง M)
                              </span>
                            </div>
                          )}
                        </div>
                        {/* Progress Bar for Allocation */}
                        <div className="mt-3 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex relative">
                          <div
                            className={`h-full ${
                              currentAllocPct > targetAllocPct &&
                              targetAllocPct > 0
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.min(currentAllocPct, 100)}%`,
                            }}
                          />
                          {targetAllocPct > 0 && targetAllocPct < 100 && (
                            <div
                              className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 z-10"
                              style={{ left: `${targetAllocPct}%` }}
                            />
                          )}
                        </div>

                        {/* Inline Simulator */}
                        <div className="mt-4 pt-3 border-t border-slate-700/50">
                          <p className="text-xs text-slate-400 font-bold mb-2 cursor-pointer select-none">
                            จำลองเพิ่มจำนวน (What-If)
                          </p>
                          <div className="flex flex-wrap gap-2 items-center">
                            <input
                              type="number"
                              placeholder="ราคาเข้า ($)"
                              className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                              value={simPrice[groupKey] || ""}
                              onChange={(e) =>
                                setSimPrice({
                                  ...simPrice,
                                  [groupKey]: e.target.value,
                                })
                              }
                            />
                            <input
                              type="number"
                              placeholder="จำนวนเงิน ($)"
                              className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-center focus:ring-1 focus:ring-blue-500 outline-none"
                              value={simAmount[groupKey] || ""}
                              onChange={(e) =>
                                setSimAmount({
                                  ...simAmount,
                                  [groupKey]: e.target.value,
                                })
                              }
                            />
                            <div className="flex-1 text-right">
                              {Number(simPrice[groupKey]) > 0 &&
                              Number(simAmount[groupKey]) > 0 ? (
                                (() => {
                                  const addedVal = Number(simAmount[groupKey]);
                                  const simulatedTotalPort =
                                    totalCurrentValueUSD + addedVal;
                                  const simulatedItemVal = itemUSD + addedVal;
                                  const simAlloc =
                                    (simulatedItemVal / simulatedTotalPort) *
                                    100;

                                  return (
                                    <div className="text-[10px] leading-tight flex flex-col items-end">
                                      <span className="text-slate-400">
                                        สัดส่วนใหม่:
                                      </span>
                                      <span className="text-blue-400 font-bold text-sm">
                                        {simAlloc.toFixed(1)}%
                                      </span>
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-[10px] text-slate-500 italic"></span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expand/Collapse Toggle */}
                    {ticker !== "CASH" && (
                      <button
                        onClick={() => toggleGroup(groupKey)}
                        className={`w-full mt-4 flex items-center justify-center gap-1 text-xs font-bold py-2 rounded-lg border transition-colors ${
                          isExpanded
                            ? "bg-slate-800 border-slate-700 text-slate-300"
                            : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {isExpanded ? (
                          <>
                            ซ่อนรายละเอียดไม้ขยับ (Lots) <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            แสดงรายละเอียดทั้ง {items.length} ไม้{" "}
                            <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    )}

                    {/* Lot Details View */}
                    {isExpanded && ticker !== "CASH" && (
                      <div className="mt-4 space-y-4">
                        {items.map((item: any, idx: number) => {
                          const itemLotKey = `${normalizeGroup(item.group)}_${item.rowIndex}`;
                          const lotPnlUSD =
                            (currentPrice - item.price) * item.holdingQty;
                          const lotPnlPct =
                            ((currentPrice - item.price) / item.price) * 100;
                          const lotIsProfit = lotPnlUSD >= 0;

                          const toTarget =
                            ((item.target - currentPrice) / currentPrice) * 100;
                          const toCutloss =
                            ((currentPrice - item.cutLoss) / currentPrice) *
                            100;

                          return (
                            <div
                              key={itemLotKey}
                              className="pt-4 border-t border-slate-700"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-slate-200">
                                  ไม้ที่ {idx + 1}
                                  <span className="text-[10px] text-slate-500 ml-2 font-normal">
                                    ({item.date.split("T")[0]})
                                  </span>
                                </span>
                                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-md">
                                  {item.holdingQty} หุ้น
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-slate-400 mb-3">
                                <span>ทุน: ${formatUSD(item.price)}</span>
                                <span
                                  className={`font-bold ${lotIsProfit ? "text-emerald-400" : "text-red-400"}`}
                                >
                                  {lotIsProfit ? "+" : ""}
                                  {lotPnlPct.toFixed(2)}% ({getSymbol()}
                                  {formatCurrency(lotPnlUSD)})
                                </span>
                              </div>

                              {/* Thermometer / Risk Bar for specific lot */}
                              <div className="mb-3">
                                <div className="flex justify-between text-[10px] font-medium mb-1">
                                  <span className="text-red-400 flex items-center gap-1">
                                    <span>Cut</span> ${formatUSD(item.cutLoss)}{" "}
                                    (-
                                    {(
                                      ((item.price - item.cutLoss) /
                                        item.price) *
                                      100
                                    ).toFixed(1)}
                                    %)
                                  </span>
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <span>Target</span> $
                                    {formatUSD(item.target)} (+
                                    {(
                                      ((item.target - item.price) /
                                        item.price) *
                                      100
                                    ).toFixed(1)}
                                    %)
                                  </span>
                                </div>
                                <div className="relative w-full h-1.5 rounded-full bg-slate-800 overflow-hidden flex">
                                  {(() => {
                                    const range = item.target - item.cutLoss;
                                    let currentPos =
                                      ((currentPrice - item.cutLoss) / range) *
                                      100;
                                    let entryPos =
                                      ((item.price - item.cutLoss) / range) *
                                      100;
                                    currentPos = Math.max(
                                      0,
                                      Math.min(100, currentPos),
                                    );
                                    entryPos = Math.max(
                                      0,
                                      Math.min(100, entryPos),
                                    );
                                    return (
                                      <>
                                        <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-red-600/20 to-transparent"></div>
                                        <div className="absolute top-0 bottom-0 right-0 w-1/3 bg-gradient-to-l from-emerald-600/20 to-transparent"></div>
                                        <div
                                          className="absolute top-0 bottom-0 w-[2px] bg-slate-500 z-10"
                                          style={{ left: `${entryPos}%` }}
                                        ></div>
                                        <div
                                          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full z-20 shadow-[0_0_10px_rgba(0,255,100,0.8)]"
                                          style={{
                                            left: `calc(${currentPos}% - 4px)`,
                                            backgroundColor: lotIsProfit
                                              ? "#34d399"
                                              : "#f87171",
                                          }}
                                        ></div>
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                                  <span>
                                    {toCutloss > 0
                                      ? `เหลือ ${toCutloss.toFixed(1)}% ถึง Cut`
                                      : `🚨 ทะลุ Cut!`}
                                  </span>
                                  <span>
                                    {toTarget > 0
                                      ? `ขาด ${toTarget.toFixed(1)}% ถึงเป้า`
                                      : `🎯 ทะลุเป้า!`}
                                  </span>
                                </div>
                              </div>

                              {/* Sell Actions for this Lot */}
                              <div className="flex bg-slate-900/50 p-2 rounded items-center justify-between gap-2 mt-2">
                                <button
                                  onClick={() => {
                                    setSellQty({
                                      ...sellQty,
                                      [itemLotKey]: item.holdingQty.toString(),
                                    });
                                    setSellPrice({
                                      ...sellPrice,
                                      [itemLotKey]: currentPrice.toString(),
                                    });
                                  }}
                                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors whitespace-nowrap"
                                >
                                  ขายไม้นี้ทั้งหมด
                                </button>
                                <div className="flex gap-1 items-center">
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    className="w-14 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-[10px] text-center focus:ring-1 focus:ring-amber-500 outline-none"
                                    value={sellQty[itemLotKey] || ""}
                                    onChange={(e) =>
                                      setSellQty({
                                        ...sellQty,
                                        [itemLotKey]: e.target.value,
                                      })
                                    }
                                  />
                                  <input
                                    type="number"
                                    placeholder="Price"
                                    className="w-16 bg-slate-800 border border-slate-700 rounded px-1 py-1 text-[10px] text-center focus:ring-1 focus:ring-amber-500 outline-none"
                                    value={sellPrice[itemLotKey] || ""}
                                    onChange={(e) =>
                                      setSellPrice({
                                        ...sellPrice,
                                        [itemLotKey]: e.target.value,
                                      })
                                    }
                                  />
                                  <button
                                    onClick={() =>
                                      handleSellTrade(
                                        item.rowIndex,
                                        item.ticker,
                                        item.holdingQty,
                                        normalizeGroup(item.group),
                                      )
                                    }
                                    disabled={sellLoading === itemLotKey}
                                    className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-500 px-2 py-1 rounded text-[10px] font-bold transition-colors disabled:opacity-50"
                                  >
                                    {sellLoading === itemLotKey
                                      ? "..."
                                      : "บันทึก"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : activeTab === "DCA" ? (
            <div className="space-y-4">
              <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <span>🎯</span> DCA Radar (สแกนหาจุดถัวเฉลี่ย)
                </h2>
                <p className="text-indigo-200/80 text-sm">
                  ระบบจะสแกนเฉพาะ หุ้นที่คุณกำลังถือครองอยู่ เพื่อเปรียบเทียบว่าตัวไหนปรับตัวลงมาลึกที่สุดจากจุดสูงสุด (52-Week High) และลงมาใกล้เส้นแนวรับสำคัญ (200-Day SMA) เพื่อช่วยตัดสินใจในการเข้าซื้อสะสมในไม้ถัดไป
                </p>
              </div>

              {dcaLoading ? (
                <div className="text-center py-20 text-slate-500 animate-pulse">
                  กำลังสแกนสัญญาณและประเมินราคาส่วนลด...⚡
                </div>
              ) : dcaData.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  ไม่มีข้อมูลหุ้นสำหรับสแกน หรือกรุณารีเฟรช
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(dcaData) ? dcaData
                    .sort((a, b) => b.dcaScore - a.dcaScore)
                    .map((item) => {
                      const groupInfo = groupedActives.find((g: any) => g.ticker === item.symbol);
                      const avgPrice = groupInfo ? groupInfo.totalCostUSD / groupInfo.totalQty : 0;
                      const myPnlPct = avgPrice > 0 ? ((item.price - avgPrice) / avgPrice) * 100 : 0;

                      return (
                        <div key={item.symbol} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors shadow-lg flex flex-col">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                               <h3 className="text-2xl font-black text-white">{item.symbol}</h3>
                               <p className="text-xs text-slate-400 mt-1">${item.price.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-black ${item.dcaScore >= 70 ? "text-emerald-400" : item.dcaScore >= 40 ? "text-amber-400" : "text-slate-400"}`}>
                                {item.dcaScore}
                              </div>
                              <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">
                                DCA SCORE
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 mt-auto">
                            <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                              <span className="text-slate-500 text-xs">🔻 Drop from 52W High:</span>
                              <span className="text-red-400 font-bold">{item.drawdownPct.toFixed(2)}%</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                              <span className="text-slate-500 text-xs">📐 Dist to SMA 200:</span>
                              <span className={item.distanceToSma200 <= 5 ? "text-blue-400 font-bold" : "text-slate-300 font-medium"}>
                                {item.distanceToSma200 > 0 ? "+" : ""}{item.distanceToSma200.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-slate-500 text-xs">💰 My PnL:</span>
                              <span className={myPnlPct >= 0 ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                                {myPnlPct > 0 ? "+" : ""}{myPnlPct.toFixed(2)}%
                              </span>
                            </div>
                          </div>

                          <div className="mt-5 pt-4 border-t border-slate-800/50">
                            <button
                               onClick={() => {
                                 setTicker(item.symbol);
                                 setPrice(item.price.toFixed(2));
                                 setIsAddModalOpen(true);
                               }}
                               className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-lg text-xs font-bold transition-colors uppercase tracking-wider"
                            >
                               + Buy (DCA ไม้ถัดไป)
                            </button>
                          </div>
                        </div>
                      )
                  }) : <div className="text-center py-10 w-full text-red-400 col-span-3">ดึงข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง</div>}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 w-full">
              <div className="flex items-center gap-2 mb-4 bg-slate-900/40 p-1 w-max rounded-lg border border-slate-800">
                <button
                  onClick={() => setHistoryViewMode("TIMELINE")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    historyViewMode === "TIMELINE"
                      ? "bg-amber-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="mr-1">⏱️</span> เรียงตามเวลา
                </button>
                <button
                  onClick={() => setHistoryViewMode("GROUPED")}
                  className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    historyViewMode === "GROUPED"
                      ? "bg-amber-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="mr-1">📊</span> สรุปรายตัว
                </button>
              </div>

              {historyViewMode === "TIMELINE" ? (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar w-full">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-4 py-3">หุ้น</th>
                        <th className="px-4 py-3">วันที่ขาย</th>
                        <th className="px-4 py-3 text-right">จำนวนหุ้น</th>
                        <th className="px-4 py-3 text-right">ราคา เข้า / ออก</th>
                        <th className="px-4 py-3 text-right">กำไร (Realized PnL)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {histories.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-slate-500">
                            ยังไม่มีประวัติการขายหุ้น
                          </td>
                        </tr>
                      )}
                      {histories
                        .sort((a, b) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime())
                        .map((item, idx) => {
                          const pnl = (item.soldPrice - item.price) * (item.soldQty || item.quantity);
                          const pnlPct = ((item.soldPrice - item.price) / item.price) * 100;
                          const isProfit = pnl >= 0;
                          return (
                            <tr key={`${item.rowIndex}-sell-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                              <td className="px-4 py-3 font-bold text-white items-center gap-2 flex">
                                {item.ticker}
                                {viewFilter === "all" && item.group && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800"
                                    style={{
                                      color: groupViews.find(
                                        (v) => v.key === normalizeGroup(item.group),
                                      )?.color,
                                    }}
                                  >
                                    {groups.find(
                                      (v) => v.group === normalizeGroup(item.group),
                                    )?.label || normalizeGroup(item.group)}
                                  </span>
                                )}
                                {item.status === "PARTIAL_SOLD" && (
                                  <span className="ml-2 text-[10px] bg-blue-900/50 text-blue-400 px-1 py-0.5 rounded">PARTIAL</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-400">{new Date(item.soldDate).toLocaleDateString()}</td>
                              <td className="px-4 py-3 text-right font-medium">{item.soldQty}</td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-slate-500">${formatUSD(item.price)}</span>
                                <span className="mx-1 text-slate-600">→</span>
                                <span className="text-white">${formatUSD(item.soldPrice)}</span>
                              </td>
                              <td className={`px-4 py-3 text-right font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {isProfit ? "+" : ""}{getSymbol()}{formatCurrency(pnl)}
                                <span className="text-xs ml-1 opacity-70 font-normal">({pnlPct.toFixed(1)}%)</span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-x-auto custom-scrollbar w-full">
                  <table className="w-full text-sm text-left min-w-[600px]">
                    <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium">
                      <tr>
                        <th className="px-4 py-3">หุ้น</th>
                        <th className="px-4 py-3 text-right">จำนวนครั้งที่เทรด</th>
                        <th className="px-4 py-3 text-right">Win Rate</th>
                        <th className="px-4 py-3 text-right">กำไรสุทธิรวม (Total PnL)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {groupedHistories.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-slate-500">
                            ยังไม่มีประวัติการขายหุ้น
                          </td>
                        </tr>
                      )}
                      {groupedHistories.map((group: any) => {
                        const winRate = group.totalTrades > 0 ? (group.winCount / group.totalTrades) * 100 : 0;
                        const isProfit = group.totalPnl >= 0;
                        const isExpanded = expandedHistoryGroups[group.ticker];
                        
                        return (
                          <React.Fragment key={`history-group-${group.ticker}`}>
                            <tr className="hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => toggleHistoryGroup(group.ticker)}>
                              <td className="px-4 py-3 font-bold text-white items-center gap-2 flex">
                                <span className="text-slate-500 w-4 inline-block text-[10px]">{isExpanded ? "▼" : "▶"}</span>
                                {group.ticker}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-slate-300">
                                {group.totalTrades}
                              </td>
                              <td className="px-4 py-3 text-right font-medium text-amber-400">
                                {winRate.toFixed(1)}%
                              </td>
                              <td className={`px-4 py-3 text-right font-bold ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                                {isProfit ? "+" : ""}{getSymbol()}{formatCurrency(group.totalPnl)}
                              </td>
                            </tr>
                            {isExpanded && group.items
                              .sort((a: any, b: any) => new Date(b.soldDate).getTime() - new Date(a.soldDate).getTime())
                              .map((item: any, childIdx: number) => {
                                const pnl = item.pnl;
                                const pnlPct = item.pnlPct;
                                const childIsProfit = pnl >= 0;
                                return (
                                  <tr key={`history-child-${group.ticker}-${childIdx}`} className="bg-slate-950/40 border-l-[3px] border-l-amber-600">
                                    <td className="px-8 py-2.5 text-slate-400 text-xs flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 inline-block"></span>
                                      {new Date(item.soldDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-xs">
                                      <span className="text-slate-400">{item.soldQty} หุ้น</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-xs">
                                      <span className="text-slate-500">${formatUSD(item.price)} → </span>
                                      <span className="text-slate-300">${formatUSD(item.soldPrice)}</span>
                                    </td>
                                    <td className={`px-4 py-2.5 text-right font-medium text-xs ${childIsProfit ? "text-emerald-500" : "text-red-500"}`}>
                                      {childIsProfit ? "+" : ""}{getSymbol()}{formatCurrency(pnl)} <span className="opacity-70">({pnlPct.toFixed(1)}%)</span>
                                    </td>
                                  </tr>
                                );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Group Manager Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-2xl relative my-8">
            <button
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              aria-label="ปิด"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 mb-1">
              <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                <Target size={20} />
              </div>
              <h2 className="text-lg font-bold text-white">
                จัดการหมวด &amp; สัดส่วนเป้าหมาย
              </h2>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              บันทึกลงชีต Portfolio_groups โดยตรง — key ใช้อ้างอิงภายใน
              เปลี่ยนไม่ได้หลังสร้างแล้ว ส่วนชื่อกับ % แก้ได้ตลอด
            </p>

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-[1fr_1.3fr_auto_auto] gap-2 text-[11px] text-slate-500 font-bold px-1">
                <span>key</span>
                <span>ชื่อที่แสดง</span>
                <span className="w-20 text-right">เป้า %</span>
                <span className="w-8" />
              </div>

              {groupDraft.map((g, idx) => {
                const isExisting = groups.some((x) => x.group === g.group);
                const held = isExisting ? holdingsInGroup(g.group) : 0;
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_1.3fr_auto_auto] gap-2 items-center"
                  >
                    <input
                      value={g.group}
                      readOnly={isExisting}
                      placeholder="เช่น robotics"
                      onChange={(e) =>
                        patchDraft(idx, {
                          group: e.target.value.toLowerCase().replace(/\s/g, "_"),
                        })
                      }
                      aria-label={`key หมวดที่ ${idx + 1}`}
                      className={`bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-blue-500 ${
                        isExisting
                          ? "text-slate-500 cursor-not-allowed"
                          : "text-white"
                      }`}
                    />
                    <input
                      value={g.label}
                      placeholder="เช่น หุ่นยนต์"
                      onChange={(e) => patchDraft(idx, { label: e.target.value })}
                      aria-label={`ชื่อหมวดที่ ${idx + 1}`}
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step="0.5"
                      value={g.targetPct}
                      onChange={(e) =>
                        patchDraft(idx, { targetPct: Number(e.target.value) })
                      }
                      aria-label={`เป้าหมาย % ของหมวดที่ ${idx + 1}`}
                      className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-right focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeDraftRow(idx)}
                      title={
                        held > 0
                          ? `มีหุ้นอยู่ ${held} ตัว — ลบแล้วจะตกเป็นอื่นๆ`
                          : "ลบหมวดนี้"
                      }
                      aria-label={`ลบหมวด ${g.label || g.group}`}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        held > 0
                          ? "bg-amber-900/30 text-amber-500 hover:bg-amber-900/60"
                          : "bg-slate-800 text-slate-500 hover:bg-red-900/40 hover:text-red-400"
                      }`}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addDraftRow}
              className="mt-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-colors"
            >
              + เพิ่มหมวด
            </button>

            <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-800">
              <div className="text-sm">
                <span className="text-slate-400">รวม: </span>
                <span
                  className={`font-bold ${
                    draftTotalPct > 100
                      ? "text-red-400"
                      : draftTotalPct === 100
                        ? "text-emerald-400"
                        : "text-amber-400"
                  }`}
                >
                  {Number(draftTotalPct.toFixed(2))}%
                </span>
                {draftTotalPct < 100 && draftTotalPct <= 100 && (
                  <span className="text-slate-600 text-xs">
                    {" "}
                    (เหลืออีก {Number((100 - draftTotalPct).toFixed(2))}%)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-bold text-slate-400 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveGroups}
                  disabled={groupSaving || draftTotalPct > 100.01}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                  {groupSaving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </div>

            {groupError && (
              <p className="mt-3 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
                {groupError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Add Trade Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm shadow-black overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl w-full max-w-lg relative my-8">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                  <Save size={20} />
                </div>
                <h2 className="text-lg font-bold text-white">
                  บันทึกการซื้อหุ้นใหม่
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTicker("CASH");
                  setPrice("1");
                  setCutLoss("0");
                  setTarget("0");
                  setTargetAlloc("0");
                }}
                className="text-[11px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg font-bold transition-colors border border-emerald-500/30"
              >
                + เพิ่มเงินสด (Cash)
              </button>
            </div>

            <form onSubmit={handleAddTrade} className="space-y-4">
              {/* Group Selection */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">
                  เลือกหมวดที่จะบันทึก
                </label>
                <select
                  required
                  value={tradeGroup}
                  onChange={(e) => setTradeGroup(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {groups.length === 0 && (
                    <option value={FALLBACK_GROUP}>
                      (โหลดหมวดไม่สำเร็จ — จะบันทึกเป็น &quot;อื่นๆ&quot;)
                    </option>
                  )}
                  {groups.map((g) => (
                    <option key={g.group} value={g.group}>
                      {g.label} — เป้า {g.targetPct}%
                    </option>
                  ))}
                </select>
                {(() => {
                  const gv = groupViews.find((v) => v.key === tradeGroup);
                  if (!gv) return null;
                  const gap = gv.weight - gv.targetPct;
                  return (
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      ตอนนี้หมวดนี้อยู่ที่ {gv.weight.toFixed(1)}% เป้า{" "}
                      {gv.targetPct}%{" "}
                      <span
                        className={
                          gap > 0 ? "text-amber-400" : "text-sky-400"
                        }
                      >
                        ({gap >= 0 ? "+" : ""}
                        {gap.toFixed(1)}%)
                      </span>
                    </p>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  หุ้น (Ticker Symbol)
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="เช่น AAPL, TSLA"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {ticker === "CASH" ? "ยอดเงิน ($)" : "จำนวนหุ้น"}
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="0.0001"
                    placeholder={ticker === "CASH" ? "10000" : "100"}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    {ticker === "CASH"
                      ? "ราคาประเมินค่า (ใส่ 1)"
                      : "ราคาซื้อ ($)"}
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="0.01"
                    placeholder="150.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
                <div>
                  <label className="block text-xs font-medium text-red-400 mb-1">
                    จุดตัดขาดทุน (Cut Loss $)
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="0"
                    placeholder="140.00"
                    value={cutLoss}
                    onChange={(e) => setCutLoss(e.target.value)}
                    className="w-full bg-slate-950 border border-red-900/30 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-emerald-400 mb-1">
                    จุดทำกำไร (Target TP $)
                  </label>
                  <input
                    type="number"
                    required
                    step="any"
                    min="0"
                    placeholder="180.00"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-emerald-900/30 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Add target allocation setting */}
              <div className="border-t border-slate-800 pt-4 mt-2">
                <label className="block text-xs font-medium text-blue-400 mb-1">
                  สัดส่วนเป้าหมายในพอร์ต (% Target Allocation)
                </label>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    placeholder="เช่น 10"
                    value={targetAlloc}
                    onChange={(e) => setTargetAlloc(e.target.value)}
                    className="w-full sm:w-1/3 bg-slate-950 border border-blue-900/30 rounded-xl px-4 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <div className="text-[11px] text-slate-500 leading-tight">
                    * ใส่เปอร์เซ็นต์ที่ต้องการให้หุ้นตัวนี้มีน้ำหนักในพอร์ต
                    <br />
                    (สามารถจำลองการซื้อสัดส่วนได้ในการ์ดหุ้นบนหน้าหลัก)
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

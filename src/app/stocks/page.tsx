"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  fetchStockList,
  groupByCategory,
  STOCK_CATEGORIES,
  CODE_STOCK_LIST,
  type StockEntry,
} from "@/lib/stockList";

export default function StocksManagerPage() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [source, setSource] = useState<"sheet" | "code" | "loading">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");

  // ฟอร์มเพิ่ม/แก้ไข
  const [fSymbol, setFSymbol] = useState("");
  const [fCategory, setFCategory] = useState(STOCK_CATEGORIES[0]);
  const [fDetail, setFDetail] = useState("");
  const [editing, setEditing] = useState(false);

  const load = async () => {
    setSource("loading");
    const { entries, source } = await fetchStockList();
    setEntries(entries);
    setSource(source);
  };

  useEffect(() => {
    load();
  }, []);

  const flash = (t: string) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 3000);
  };

  const resetForm = () => {
    setFSymbol("");
    setFCategory(STOCK_CATEGORIES[0]);
    setFDetail("");
    setEditing(false);
  };

  const upsert = async (items: StockEntry[]) => {
    setBusy(true);
    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "STOCKS_UPSERT", items }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "save failed");
      await load();
      return true;
    } catch (e: any) {
      flash("❌ บันทึกไม่สำเร็จ: " + e.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const symbol = fSymbol.trim().toUpperCase();
    if (!symbol) return flash("⚠️ ใส่ชื่อหุ้นก่อน");
    const ok = await upsert([{ symbol, category: fCategory, detail: fDetail.trim() }]);
    if (ok) {
      flash(editing ? `✅ แก้ไข ${symbol} แล้ว` : `✅ เพิ่ม ${symbol} แล้ว`);
      resetForm();
    }
  };

  const handleEdit = (e: StockEntry) => {
    setFSymbol(e.symbol);
    setFCategory(e.category || STOCK_CATEGORIES[0]);
    setFDetail(e.detail);
    setEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (symbol: string) => {
    if (!confirm(`ลบ ${symbol} ออกจากคลังหุ้น?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "STOCKS_DELETE", symbol }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "delete failed");
      flash(`🗑️ ลบ ${symbol} แล้ว`);
      await load();
    } catch (e: any) {
      flash("❌ ลบไม่สำเร็จ: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSeed = async () => {
    if (
      !confirm(
        `นำเข้าหุ้น ${CODE_STOCK_LIST.length} ตัวจากลิสต์ในโค้ดเข้า Sheet? (ตัวที่มีอยู่แล้วจะถูกอัปเดต)`,
      )
    )
      return;
    const ok = await upsert(CODE_STOCK_LIST);
    if (ok) flash(`✅ Seed ${CODE_STOCK_LIST.length} ตัวเข้า Sheet แล้ว`);
  };

  const categories = useMemo(
    () => groupByCategory(entries).map((g) => g.category),
    [entries],
  );

  const filtered = useMemo(
    () =>
      entries
        .filter((e) => (catFilter === "ALL" ? true : e.category === catFilter))
        .filter((e) =>
          search
            ? e.symbol.toLowerCase().includes(search.toLowerCase()) ||
              (e.detail || "").toLowerCase().includes(search.toLowerCase())
            : true,
        )
        .sort((a, b) => a.symbol.localeCompare(b.symbol)),
    [entries, catFilter, search],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-cyan-500/30 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗂️</span>
            <div>
              <h1 className="text-xl font-bold text-cyan-400">จัดการคลังหุ้น</h1>
              <p className="text-gray-400 text-xs">
                เพิ่ม/ลบ/แก้หุ้นที่นี่ที่เดียว แล้วทุกหน้าจะดึงไปใช้ (เก็บใน Google Sheet)
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="text-gray-400 hover:text-white text-sm bg-gray-800 px-3 py-1 rounded-full"
          >
            ← หน้าแรก
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* สถานะแหล่งข้อมูล */}
        {source === "code" && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
            <p className="text-amber-100">
              ⚠️ ตอนนี้ยังแสดงจาก<b>ลิสต์ในโค้ด</b> (ยังไม่ได้เก็บใน Sheet) —
              กดปุ่มเพื่อนำเข้าครั้งแรก แล้วจะแก้ไขได้
            </p>
            <button
              onClick={handleSeed}
              disabled={busy}
              className="shrink-0 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-50"
            >
              📥 Seed {CODE_STOCK_LIST.length} ตัวเข้า Sheet
            </button>
          </div>
        )}
        {source === "sheet" && (
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>✅ เชื่อมกับ Google Sheet (Stock_Master) · {entries.length} ตัว</span>
            <button
              onClick={handleSeed}
              disabled={busy}
              className="text-cyan-400 hover:text-cyan-300 disabled:opacity-50"
            >
              🔄 Sync ลิสต์ในโค้ดเข้า Sheet
            </button>
          </div>
        )}

        {/* ฟอร์มเพิ่ม/แก้ไข */}
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-5">
          <h2 className="text-white font-bold mb-3">
            {editing ? `✏️ แก้ไข ${fSymbol}` : "➕ เพิ่มหุ้นใหม่"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-[120px_180px_1fr_auto] gap-3">
            <input
              value={fSymbol}
              onChange={(e) => setFSymbol(e.target.value.toUpperCase())}
              disabled={editing}
              placeholder="SYMBOL"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
            />
            <select
              value={fCategory}
              onChange={(e) => setFCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              {STOCK_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              value={fDetail}
              onChange={(e) => setFDetail(e.target.value)}
              placeholder="คำอธิบาย (ไม่บังคับ)"
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold disabled:opacity-50"
              >
                {editing ? "บันทึก" : "เพิ่ม"}
              </button>
              {editing && (
                <button
                  onClick={resetForm}
                  className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-gray-300 text-sm"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </div>
        </div>

        {msg && (
          <div className="text-sm text-center text-cyan-300 bg-slate-800/50 rounded-lg py-2">
            {msg}
          </div>
        )}

        {/* ตัวกรอง */}
        <div className="flex flex-wrap gap-2 items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 ค้นหา symbol / คำอธิบาย"
            className="flex-1 min-w-[180px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="ALL">ทุกหมวด ({entries.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* ตาราง */}
        {source === "loading" ? (
          <p className="text-center text-gray-500 py-12">กำลังโหลด...</p>
        ) : (
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-gray-400 text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Symbol</th>
                  <th className="text-left px-4 py-2">หมวด</th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">คำอธิบาย</th>
                  <th className="text-right px-4 py-2">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.symbol}
                    className="border-t border-slate-700/40 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-2 font-bold text-white">{e.symbol}</td>
                    <td className="px-4 py-2 text-cyan-300/80 text-xs">
                      {e.category || "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs hidden md:table-cell max-w-[400px] truncate">
                      {e.detail || "—"}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(e)}
                        className="text-amber-400 hover:text-amber-300 text-xs mr-3"
                      >
                        ✏️ แก้
                      </button>
                      <button
                        onClick={() => handleDelete(e.symbol)}
                        disabled={busy || source !== "sheet"}
                        title={source !== "sheet" ? "ต้อง Seed เข้า Sheet ก่อน" : ""}
                        className="text-red-400 hover:text-red-300 text-xs disabled:opacity-30"
                      >
                        🗑️ ลบ
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-500 py-8">
                      ไม่พบหุ้น
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

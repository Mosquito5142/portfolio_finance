"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  XCircle,
  Clock,
  Loader2,
  Target,
} from "lucide-react";

interface LogEntry {
  rowIndex: number;
  date: string;
  symbol: string;
  playbook: string;
  price: number;
  bbWidth: number;
  rsi: number;
  volumeRatio: string;
  signals: string;
  result: "PENDING" | "WIN" | "LOSS";
}

const PLAYBOOK_BADGE: Record<string, { bg: string; text: string; emoji: string }> = {
  squeeze: { bg: "bg-blue-500/10", text: "text-blue-400", emoji: "🧨" },
  spring_trap: { bg: "bg-amber-500/10", text: "text-amber-400", emoji: "🪤" },
  high_vol: { bg: "bg-purple-500/10", text: "text-purple-400", emoji: "🎢" },
  neutral: { bg: "bg-slate-500/10", text: "text-slate-400", emoji: "⏳" },
};

export default function SniperLogPage() {
  const [data, setData] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "WIN" | "LOSS">("ALL");

  const fetchLog = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sniper/log?limit=200");
      if (!res.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      const json = await res.json();
      setData(json.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
  }, []);

  const updateResult = async (rowIndex: number, result: "WIN" | "LOSS") => {
    try {
      await fetch("/api/sniper/log", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowIndex, result }),
      });
      setData((prev) =>
        prev.map((e) => (e.rowIndex === rowIndex ? { ...e, result } : e)),
      );
    } catch (e) {
      console.error("Update failed:", e);
    }
  };

  const filtered = data.filter(
    (e) => filter === "ALL" || e.result === filter,
  );

  const stats = {
    total: data.length,
    wins: data.filter((e) => e.result === "WIN").length,
    losses: data.filter((e) => e.result === "LOSS").length,
    pending: data.filter((e) => e.result === "PENDING").length,
  };
  const winRate =
    stats.wins + stats.losses > 0
      ? ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1)
      : "-";

  // Group by playbook
  const playbookStats: Record<string, { wins: number; losses: number; total: number; pending: number }> = {};
  data.forEach((e) => {
    if (!playbookStats[e.playbook]) playbookStats[e.playbook] = { wins: 0, losses: 0, total: 0, pending: 0 };
    playbookStats[e.playbook].total++;
    if (e.result === "WIN") playbookStats[e.playbook].wins++;
    else if (e.result === "LOSS") playbookStats[e.playbook].losses++;
    else playbookStats[e.playbook].pending++;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 pt-24">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/sniper"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">📋 Sniper Backtest Log</h1>
              <p className="text-slate-400 text-sm">
                Track สัญญาณ → วัดผล → รู้ว่า Playbook ไหนแม่นที่สุด
              </p>
            </div>
          </div>
          <button
            onClick={fetchLog}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="ทั้งหมด" value={stats.total} icon="📊" />
          <StatCard label="ชนะ" value={stats.wins} icon="🏆" color="text-emerald-400" />
          <StatCard label="แพ้" value={stats.losses} icon="❌" color="text-red-400" />
          <StatCard label="Win Rate" value={`${winRate}%`} icon="📈" />
        </div>

        {/* Playbook Stats */}
        {Object.keys(playbookStats).length > 0 && (
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Playbook Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(playbookStats).map(([pb, s]) => {
                const badge = PLAYBOOK_BADGE[pb] || PLAYBOOK_BADGE.neutral;
                const wr = s.wins + s.losses > 0
                  ? ((s.wins / (s.wins + s.losses)) * 100).toFixed(0)
                  : "-";
                return (
                  <div key={pb} className={`${badge.bg} rounded-lg p-3 border border-slate-700/50`}>
                    <div className="text-lg">{badge.emoji} {pb.replace("_", " ")}</div>
                    <div className={`text-xl font-bold ${badge.text}`}>{wr}%</div>
                    <div className="text-xs text-slate-500">{s.wins}W / {s.losses}L ({s.pending} pending)</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {(["ALL", "PENDING", "WIN", "LOSS"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? "bg-slate-700 text-white"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {f === "ALL" ? "ทั้งหมด" : f === "PENDING" ? "⏳ รอผล" : f === "WIN" ? "✅ ชนะ" : "❌ แพ้"}
              <span className="ml-1 text-xs opacity-60">
                ({f === "ALL" ? stats.total : stats[f.toLowerCase() as keyof typeof stats]})
              </span>
            </button>
          ))}
        </div>

        {/* Log Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-slate-500" size={32} />
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            ยังไม่มีข้อมูล — สแกนหุ้นแล้วบันทึกสัญญาณได้เลย
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const badge = PLAYBOOK_BADGE[entry.playbook] || PLAYBOOK_BADGE.neutral;
              return (
                <div
                  key={entry.rowIndex}
                  className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white">{entry.symbol}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                        {badge.emoji} {entry.playbook.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500">{entry.date}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>Price: ${entry.price?.toFixed(2)}</span>
                      <span>BB_W: {entry.bbWidth?.toFixed(1)}%</span>
                      <span>RSI: {entry.rsi?.toFixed(1)}</span>
                      {entry.volumeRatio && <span>Vol: {entry.volumeRatio}x</span>}
                    </div>
                    {entry.signals && (
                      <div className="text-xs text-slate-500 mt-1">{entry.signals}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.result === "PENDING" && (
                      <>
                        <button
                          onClick={() => updateResult(entry.rowIndex, "WIN")}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition"
                        >
                          <Trophy size={14} className="inline mr-1" />
                          WIN
                        </button>
                        <button
                          onClick={() => updateResult(entry.rowIndex, "LOSS")}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition"
                        >
                          <XCircle size={14} className="inline mr-1" />
                          LOSS
                        </button>
                      </>
                    )}
                    {entry.result === "WIN" && (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold">
                        ✅ WIN
                      </span>
                    )}
                    {entry.result === "LOSS" && (
                      <span className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold">
                        ❌ LOSS
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className={`text-2xl font-bold ${color || "text-white"}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

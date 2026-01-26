"use client";

import { PortfolioSummary as PortfolioSummaryType } from "@/types/stock";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export default function PortfolioSummary({ summary }: PortfolioSummaryProps) {
  const isProfitable = summary.totalProfit >= 0;
  const isDayPositive = summary.dayChange >= 0;

  return (
    <div className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-2xl p-6 border border-purple-500/20 backdrop-blur-sm">
      <h2 className="text-gray-400 text-sm font-medium mb-2">
        มูลค่าพอร์ตทั้งหมด
      </h2>

      <div className="flex items-baseline gap-4 mb-4">
        <span className="text-4xl font-bold text-white">
          {formatCurrency(summary.totalValue)}
        </span>
        <span
          className={`flex items-center gap-1 text-lg ${isDayPositive ? "text-green-400" : "text-red-400"}`}
        >
          {isDayPositive ? "▲" : "▼"}
          {formatPercent(summary.dayChangePercent)}
          <span className="text-sm text-gray-400 ml-1">วันนี้</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            ต้นทุนรวม
          </p>
          <p className="text-white font-semibold text-lg">
            {formatCurrency(summary.totalCost)}
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            กำไร/ขาดทุนรวม
          </p>
          <p
            className={`font-semibold text-lg ${isProfitable ? "text-green-400" : "text-red-400"}`}
          >
            {isProfitable ? "+" : ""}
            {formatCurrency(summary.totalProfit)}
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            % กำไร/ขาดทุน
          </p>
          <p
            className={`font-semibold text-lg ${isProfitable ? "text-green-400" : "text-red-400"}`}
          >
            {formatPercent(summary.totalProfitPercent)}
          </p>
        </div>

        <div className="bg-gray-900/50 rounded-xl p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            เปลี่ยนแปลงวันนี้
          </p>
          <p
            className={`font-semibold text-lg ${isDayPositive ? "text-green-400" : "text-red-400"}`}
          >
            {isDayPositive ? "+" : ""}
            {formatCurrency(summary.dayChange)}
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { GroupedStock, StockPrice } from "@/types/stock";
import {
  formatCurrency,
  formatPercent,
  formatNumber,
  formatUSD,
} from "@/lib/utils";

interface StockCardProps {
  stock: GroupedStock;
  price: StockPrice | undefined;
}

export default function StockCard({ stock, price }: StockCardProps) {
  const currentPrice = price?.currentPrice || stock.averageCost;
  const currentValue = stock.totalQuantity * currentPrice;
  const profit = currentValue - stock.totalCost;
  const profitPercent = (profit / stock.totalCost) * 100;

  const dayChange = price?.dayChange || 0;
  const dayChangePercent = price?.dayChangePercent || 0;

  const isProfitable = profit >= 0;
  const isDayPositive = dayChange >= 0;

  return (
    <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{stock.symbol}</h3>
          <p className="text-gray-400 text-sm">
            {stock.name}
            {price?.isEstimated && (
              <span
                className="ml-2 text-xs text-yellow-400"
                title={`ประมาณจาก ${price.source}`}
              >
                ⚡ {price.source}
              </span>
            )}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-white">
            {formatUSD(currentPrice)}
          </p>
          <div
            className={`flex items-center justify-end gap-1 text-sm ${isDayPositive ? "text-green-400" : "text-red-400"}`}
          >
            <span>{isDayPositive ? "▲" : "▼"}</span>
            <span>{formatPercent(dayChangePercent)}</span>
          </div>
        </div>
      </div>

      {/* Quantity & Value */}
      <div className="grid grid-cols-2 gap-4 mb-4 py-4 border-t border-b border-gray-800">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            จำนวนหุ้น
          </p>
          <p className="text-white font-semibold">
            {formatNumber(stock.totalQuantity, 4)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            มูลค่าปัจจุบัน
          </p>
          <p className="text-white font-semibold">
            {formatCurrency(currentValue)}
          </p>
        </div>
      </div>

      {/* Cost & Profit */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            ต้นทุนเฉลี่ย
          </p>
          <p className="text-gray-300">{formatCurrency(stock.averageCost)}</p>
          <p className="text-gray-500 text-xs mt-1">
            รวม {formatCurrency(stock.totalCost)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            กำไร/ขาดทุน
          </p>
          <p
            className={`font-bold ${isProfitable ? "text-green-400" : "text-red-400"}`}
          >
            {isProfitable ? "+" : ""}
            {formatCurrency(profit)}
          </p>
          <p
            className={`text-xs mt-1 ${isProfitable ? "text-green-500" : "text-red-500"}`}
          >
            {formatPercent(profitPercent)}
          </p>
        </div>
      </div>

      {/* SLV Price Comparison - แสดงเฉพาะ SLV */}
      {stock.symbol === "SLV" &&
        price?.actualClosePrice &&
        price?.estimatedPrice && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-xl p-4 border border-yellow-500/20">
              <p className="text-yellow-400 text-xs font-medium mb-3 flex items-center gap-2">
                ⚡ เปรียบเทียบราคา SLV กับ XAG/USD
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-xs mb-1">
                    ราคาปิดตลาด (SLV)
                  </p>
                  <p className="text-white font-bold">
                    {formatUSD(price.actualClosePrice)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-xs mb-1">ประมาณจาก XAG</p>
                  <p className="text-yellow-300 font-bold">
                    {formatUSD(price.estimatedPrice)}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-yellow-500/10">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-xs">
                    คาดการณ์เมื่อตลาดเปิด
                  </span>
                  <span
                    className={`text-sm font-bold ${(price.estimatedChange || 0) >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {(price.estimatedChange || 0) >= 0 ? "▲" : "▼"}{" "}
                    {formatPercent(price.estimatedChange || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Technical Analysis - แนวรับ/ต้าน */}
      {price?.support && price?.resistance && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-gray-400 text-xs font-medium mb-3 flex items-center gap-2">
            📊 แนวรับ/ต้าน
          </p>
          <div className="space-y-3">
            {/* Price position bar */}
            <div className="relative">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>แนวรับ</span>
                <span>แนวต้าน</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                {/* Calculate position */}
                {(() => {
                  const range = price.resistance - price.support;
                  const position =
                    ((currentPrice - price.support) / range) * 100;
                  const clampedPosition = Math.max(0, Math.min(100, position));
                  return (
                    <>
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-red-500 opacity-30"
                        style={{ width: "100%" }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-purple-500"
                        style={{
                          left: `calc(${clampedPosition}% - 6px)`,
                          top: "50%",
                        }}
                      />
                    </>
                  );
                })()}
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-green-400 font-medium">
                  {formatUSD(price.support)}
                </span>
                <span className="text-purple-400 font-medium">
                  {formatUSD(currentPrice)}
                </span>
                <span className="text-red-400 font-medium">
                  {formatUSD(price.resistance)}
                </span>
              </div>
            </div>

            {/* 52 Week Range */}
            {price.high52w && price.low52w && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-2">52 สัปดาห์</p>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-400">ต่ำสุด: </span>
                    <span className="text-red-400">
                      {formatUSD(price.low52w)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">สูงสุด: </span>
                    <span className="text-green-400">
                      {formatUSD(price.high52w)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Holdings Detail */}
      <details className="mt-4 pt-4 border-t border-gray-800">
        <summary className="text-gray-400 text-sm cursor-pointer hover:text-white transition-colors">
          ดูรายการซื้อ ({stock.holdings.length} รายการ)
        </summary>
        <div className="mt-3 space-y-2">
          {stock.holdings.map((holding) => (
            <div
              key={holding.id}
              className="flex justify-between text-sm bg-gray-800/50 rounded-lg px-3 py-2"
            >
              <div>
                <span className="text-gray-300">
                  {formatNumber(holding.quantity, 4)} หุ้น
                </span>
                <span className="text-gray-500 ml-2">
                  @ {formatUSD(holding.buyPrice)}
                </span>
              </div>
              <span className="text-gray-500">{holding.buyDate}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

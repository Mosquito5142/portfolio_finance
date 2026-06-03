"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Trash2, FileSpreadsheet, Send, Loader2, Star } from "lucide-react";
import { UNIQUE_SYMBOLS } from "@/lib/stocks";

interface ParsedSignal {
  id: string;
  ticker: string;
  datetime: string;
  support: string;
  resistance: string;
}

export default function ImportSignalsPage() {
  const [inputText, setInputText] = useState("");
  const [parsedData, setParsedData] = useState<ParsedSignal[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isWatchlistCopied, setIsWatchlistCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isSendingInterested, setIsSendingInterested] = useState(false);
  const [isSentInterested, setIsSentInterested] = useState(false);

  const handleParse = () => {
    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l !== '');
    const results: ParsedSignal[] = [];
    
    let i = 0;
    while (i < lines.length) {
      // Skip common trailing words or ignore words
      if (['ซ่อน', 'เลือก', 'New'].includes(lines[i])) {
        i++;
        continue;
      }
      
      const ticker = lines[i];
      // Check if next line exists
      if (i + 1 >= lines.length) break;
      
      const datetime = lines[i+1];
      let support = '';
      let resistance = '';
      
      i += 2;
      
      // Parse support and resistance
      while (i < lines.length && (lines[i].startsWith('รับ:') || lines[i].startsWith('ต้าน:'))) {
        if (lines[i].startsWith('รับ:')) {
          support = lines[i].replace('รับ:', '').trim();
        }
        if (lines[i].startsWith('ต้าน:')) {
          resistance = lines[i].replace('ต้าน:', '').trim();
        }
        i++;
      }
      
      results.push({
        id: crypto.randomUUID(),
        ticker,
        datetime,
        support,
        resistance
      });
    }
    
    setParsedData(results);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    if (parsedData.length === 0) return;
    
    // Header for sheets
    const header = "Ticker\tDate/Time\tSupport (รับ)\tResistance (ต้าน)";
    const rows = parsedData.map(d => `${d.ticker}\t${d.datetime}\t${d.support}\t${d.resistance}`);
    const tsv = [header, ...rows].join('\n');
    
    navigator.clipboard.writeText(tsv).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const copyForWatchlist = () => {
    if (parsedData.length === 0) return;
    
    const rows: string[] = [];
    parsedData.forEach(d => {
      // split support string, e.g. "$599.7, $583.2" -> ["$599.7", "$583.2"]
      const supports = d.support.split(',').map(s => s.trim());
      supports.forEach(s => {
        if (s) {
          const price = s.replace(/\$/g, '').trim();
          rows.push(`${d.ticker}\t${price}`);
        }
      });
    });
    
    const tsv = rows.join('\n');
    
    navigator.clipboard.writeText(tsv).then(() => {
      setIsWatchlistCopied(true);
      setTimeout(() => setIsWatchlistCopied(false), 2000);
    });
  };

  const sendToWatchlist = async () => {
    if (parsedData.length === 0) return;
    setIsSending(true);
    
    try {
      const items: any[] = [];
      parsedData.forEach(d => {
        const supports = d.support.split(',').map(s => s.trim());
        supports.forEach(s => {
          if (s) {
            const price = s.replace(/\$/g, '').trim();
            items.push({
              ticker: d.ticker,
              entry: price,
              cut: 0,
              target: 0,
              alertType: "SMART_ENTRY",
              triggerPrice: price
            });
          }
        });
      });
      
      const res = await fetch("/api/alerts/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      
      const json = await res.json();
      if (json.success) {
        setIsSent(true);
        setTimeout(() => setIsSent(false), 2000);
      } else {
        alert("Error sending to Watchlist: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to send data");
    } finally {
      setIsSending(false);
    }
  };

  const sendInterestedToWatchlist = async () => {
    if (parsedData.length === 0) return;
    
    // Filter only interested stocks
    const interestedData = parsedData.filter(d => UNIQUE_SYMBOLS.includes(d.ticker));
    if (interestedData.length === 0) {
      alert("ไม่มีหุ้นที่ตรงกับ Watchlist ที่สนใจ (UNIQUE_SYMBOLS)");
      return;
    }
    
    setIsSendingInterested(true);
    
    try {
      const items: any[] = [];
      interestedData.forEach(d => {
        const supports = d.support.split(',').map(s => s.trim());
        supports.forEach(s => {
          if (s) {
            const price = s.replace(/\$/g, '').trim();
            items.push({
              ticker: d.ticker,
              entry: price,
              cut: 0,
              target: 0,
              alertType: "SMART_ENTRY",
              triggerPrice: price
            });
          }
        });
      });
      
      const res = await fetch("/api/alerts/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      
      const json = await res.json();
      if (json.success) {
        setIsSentInterested(true);
        setTimeout(() => setIsSentInterested(false), 2000);
      } else {
        alert("Error sending to Watchlist: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to send data");
    } finally {
      setIsSendingInterested(false);
    }
  };

  const clearData = () => {
    setInputText("");
    setParsedData([]);
    setIsCopied(false);
    setIsWatchlistCopied(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-gray-800 pb-4">
          <Link
            href="/"
            className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Signals Import (นำเข้าโพย)
            </h1>
            <p className="text-gray-400 text-sm">
              คัดลอกข้อความโพยมาวาง เพื่อแปลงเป็นตารางและนำไปใส่ Google Sheet
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col space-y-4">
            <h2 className="text-lg font-semibold text-gray-200">1. วางข้อความที่นี่</h2>
            <textarea
              className="w-full h-[500px] bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-amber-500/50 resize-none font-mono text-sm"
              placeholder={`PRCT\n30 พ.ค. 17:10\nรับ: $26.1, $25.0\nต้าน: $28.2, $30.7\nซ่อน\nเลือก\nNew\n...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleParse}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-900/20"
              >
                แปลงข้อมูล (Parse)
              </button>
              <button
                onClick={clearData}
                className="p-3 bg-gray-800 hover:bg-gray-700 text-red-400 rounded-xl transition-all border border-gray-700 hover:border-red-500/30"
                title="ล้างข้อมูล"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Output Section */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-200">
                2. ข้อมูลตาราง ({parsedData.length} รายการ)
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={sendToWatchlist}
                  disabled={parsedData.length === 0 || isSending}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    parsedData.length === 0
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : isSent
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                      : isSending
                      ? "bg-rose-500/50 text-white cursor-wait"
                      : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20"
                  }`}
                >
                  {isSent ? (
                    <>
                      <Check className="w-4 h-4" /> ส่งสำเร็จ!
                    </>
                  ) : isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> ส่งเข้า Sheet
                    </>
                  )}
                </button>
                <button
                  onClick={sendInterestedToWatchlist}
                  disabled={parsedData.length === 0 || isSendingInterested}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    parsedData.length === 0
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : isSentInterested
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                      : isSendingInterested
                      ? "bg-orange-500/50 text-white cursor-wait"
                      : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20"
                  }`}
                >
                  {isSentInterested ? (
                    <>
                      <Check className="w-4 h-4" /> ส่งสำเร็จ!
                    </>
                  ) : isSendingInterested ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" /> ส่งเฉพาะหุ้นที่สนใจ
                    </>
                  )}
                </button>
                <button
                  onClick={copyForWatchlist}
                  disabled={parsedData.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    parsedData.length === 0
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : isWatchlistCopied
                      ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                      : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20"
                  }`}
                >
                  {isWatchlistCopied ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> คัดลอก (แยกไม้รับ)
                    </>
                  )}
                </button>
                <button
                  onClick={copyToClipboard}
                  disabled={parsedData.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    parsedData.length === 0
                      ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                      : isCopied
                      ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20"
                      : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                  }`}
                >
                  {isCopied ? (
                    <>
                      <Check className="w-4 h-4" /> Copied!
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" /> Copy ตารางรวม
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-gray-800 bg-gray-950 h-[500px]">
              {parsedData.length > 0 ? (
                <table className="w-full text-left text-sm text-gray-300 relative">
                  <thead className="bg-gray-900 text-gray-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 font-medium border-b border-gray-800">Ticker</th>
                      <th className="px-4 py-3 font-medium border-b border-gray-800">Date/Time</th>
                      <th className="px-4 py-3 font-medium border-b border-gray-800">Support (รับ)</th>
                      <th className="px-4 py-3 font-medium border-b border-gray-800">Resistance (ต้าน)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {parsedData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-900/50">
                        <td className="px-4 py-3 font-bold text-amber-400">{item.ticker}</td>
                        <td className="px-4 py-3 whitespace-nowrap">{item.datetime}</td>
                        <td className="px-4 py-3 text-emerald-400">{item.support}</td>
                        <td className="px-4 py-3 text-red-400">{item.resistance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-2 p-8 text-center">
                  <FileSpreadsheet className="w-12 h-12 opacity-20" />
                  <p>ยังไม่มีข้อมูล</p>
                  <p className="text-xs">วางข้อความแล้วกด "แปลงข้อมูล"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

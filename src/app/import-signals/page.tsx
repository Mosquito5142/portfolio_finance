"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Check, Trash2, FileSpreadsheet, Send, Loader2, Target } from "lucide-react";
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
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Tranche selection state
  const [selectedTranche, setSelectedTranche] = useState<number | 'ALL'>('ALL');

  // Calculate maximum tranches available in current data
  const maxTranches = useMemo(() => {
    let max = 0;
    parsedData.forEach(d => {
      const supports = d.support.split(',').map(s => s.trim()).filter(s => s !== '');
      if (supports.length > max) max = supports.length;
    });
    return max;
  }, [parsedData]);

  const handleParse = () => {
    const lines = inputText.split('\n').map(l => l.trim()).filter(l => l !== '');
    const results: ParsedSignal[] = [];
    
    let i = 0;
    while (i < lines.length) {
      if (['ซ่อน', 'เลือก', 'New'].includes(lines[i])) {
        i++;
        continue;
      }
      
      const ticker = lines[i];
      if (i + 1 >= lines.length) break;
      
      const datetime = lines[i+1];
      let support = '';
      let resistance = '';
      
      i += 2;
      
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
    setSelectedIds(new Set(results.map(r => r.id))); // Select all by default
    setSelectedTranche('ALL'); // Reset selection on new parse
    setIsCopied(false);
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === parsedData.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(parsedData.map(d => d.id))); // Select all
    }
  };

  const copyForWatchlist = () => {
    const dataToExport = parsedData.filter(d => selectedIds.has(d.id));
    if (dataToExport.length === 0) return;
    const rows: string[] = [];
    dataToExport.forEach(d => {
      const supports = d.support.split(',').map(s => s.trim()).filter(Boolean);
      supports.forEach((s, idx) => {
        if (selectedTranche !== 'ALL' && idx + 1 !== selectedTranche) return;
        const price = s.replace(/\$/g, '').trim();
        rows.push(`${d.ticker}\t${price}`);
      });
    });
    const tsv = rows.join('\n');
    navigator.clipboard.writeText(tsv).then(() => {
      setIsWatchlistCopied(true);
      setTimeout(() => setIsWatchlistCopied(false), 2000);
    });
  };

  const sendToWatchlist = async () => {
    const dataToExport = parsedData.filter(d => selectedIds.has(d.id));
    if (dataToExport.length === 0) return;
    setIsSending(true);
    
    try {
      const items: any[] = [];
      dataToExport.forEach(d => {
        const supports = d.support.split(',').map(s => s.trim()).filter(Boolean);
        supports.forEach((s, idx) => {
          if (selectedTranche !== 'ALL' && idx + 1 !== selectedTranche) return;
          
          const price = s.replace(/\$/g, '').trim();
          items.push({
            ticker: d.ticker,
            entry: price,
            cut: 0,
            target: 0,
            alertType: "SMART_ENTRY",
            triggerPrice: price,
            note: `ไม้ ${idx + 1}`
          });
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
    const dataToExport = parsedData.filter(d => selectedIds.has(d.id));
    if (dataToExport.length === 0) return;
    
    const interestedData = dataToExport.filter(d => UNIQUE_SYMBOLS.includes(d.ticker));
    if (interestedData.length === 0) {
      alert("ไม่มีหุ้นที่ตรงกับ Watchlist ที่สนใจ (UNIQUE_SYMBOLS)");
      return;
    }
    
    setIsSendingInterested(true);
    
    try {
      const items: any[] = [];
      interestedData.forEach(d => {
        const supports = d.support.split(',').map(s => s.trim()).filter(Boolean);
        supports.forEach((s, idx) => {
          if (selectedTranche !== 'ALL' && idx + 1 !== selectedTranche) return;

          const price = s.replace(/\$/g, '').trim();
          items.push({
            ticker: d.ticker,
            entry: price,
            cut: 0,
            target: 0,
            alertType: "SMART_ENTRY",
            triggerPrice: price,
            note: `ไม้ ${idx + 1}`
          });
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
    setSelectedIds(new Set());
    setSelectedTranche('ALL');
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
              คัดลอกข้อความโพยมาวาง เพื่อแปลงและส่งเข้า Google Sheet เป็นรายไม้
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col space-y-4 h-[650px]">
            <h2 className="text-lg font-semibold text-gray-200">1. วางข้อความที่นี่</h2>
            <textarea
              className="flex-1 w-full bg-gray-950 border border-gray-800 rounded-xl p-4 text-gray-300 focus:outline-none focus:border-amber-500/50 resize-none font-mono text-sm"
              placeholder={`PRCT\n30 พ.ค. 17:10\nรับ: $26.1, $25.0\nต้าน: $28.2, $30.7\nซ่อน\nเลือก\nNew\n...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="flex gap-3">
              <button
                onClick={handleParse}
                className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-amber-900/20"
              >
                แปลงข้อมูล
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
          <div className="lg:col-span-8 bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col h-[650px]">
            {/* Header & Tranche Selector */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                {parsedData.length > 0 && (
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === parsedData.length && parsedData.length > 0}
                    onChange={toggleAll}
                    className="w-5 h-5 rounded border-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900 bg-gray-800 cursor-pointer"
                  />
                )}
                <h2 className="text-lg font-semibold text-gray-200">
                  2. ข้อมูลหุ้น ({selectedIds.size}/{parsedData.length} ตัว)
                </h2>
              </div>
              
              {maxTranches > 0 && (
                <div className="flex items-center gap-2 bg-gray-950 rounded-lg p-1 border border-gray-800">
                  <div className="px-3 py-1.5 text-sm text-gray-400 font-medium border-r border-gray-800 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-500" />
                    ระดับไม้ (Tranche)
                  </div>
                  <select 
                    value={selectedTranche} 
                    onChange={(e) => setSelectedTranche(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                    className="bg-transparent text-amber-400 font-semibold cursor-pointer px-3 py-1 focus:outline-none appearance-none hover:text-amber-300 transition-colors"
                  >
                    <option value="ALL" className="bg-gray-900 text-white">📦 เลือกทุกไม้ (All)</option>
                    {Array.from({ length: maxTranches }).map((_, i) => (
                      <option key={i} value={i + 1} className="bg-gray-900 text-white">🎯 เฉพาะ ไม้ {i + 1}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Cards List */}
            <div className="flex-1 overflow-auto pr-2 space-y-3 custom-scrollbar">
              {parsedData.length > 0 ? (
                parsedData.map((item) => {
                  const supports = item.support.split(',').map(s => s.trim()).filter(Boolean);
                  const resistances = item.resistance.split(',').map(s => s.trim()).filter(Boolean);
                  
                  return (
                    <div key={item.id} className="relative bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 hover:border-gray-700 transition-colors group">
                      {/* Checkbox */}
                      <div className="absolute top-4 right-4 md:static md:flex md:items-center">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          className="w-5 h-5 rounded border-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900 bg-gray-800 cursor-pointer"
                        />
                      </div>
                      
                      {/* Ticker & Date */}
                      <div className="md:w-[120px] flex flex-col justify-center shrink-0 mt-2 md:mt-0">
                        <div className="text-2xl font-black text-amber-400 group-hover:text-amber-300 transition-colors">{item.ticker}</div>
                        <div className="text-xs text-gray-500 font-medium">{item.datetime}</div>
                      </div>
                      
                      {/* Support Levels */}
                      <div className="flex-1 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-5">
                        <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Support (แนวรับ)</span>
                        <div className="flex flex-wrap gap-2">
                          {supports.map((s, i) => {
                            const isSelected = selectedTranche === 'ALL' || selectedTranche === i + 1;
                            return (
                              <div 
                                key={i} 
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                  isSelected 
                                    ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800/50 shadow-sm shadow-emerald-900/10' 
                                    : 'bg-gray-900 text-gray-600 border border-gray-800 opacity-60'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                                ไม้ {i + 1}: <span className="font-bold">{s}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Resistance Levels */}
                      <div className="flex-1 flex flex-col gap-2 border-t md:border-t-0 md:border-l border-gray-800 pt-3 md:pt-0 md:pl-5">
                        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Resistance (แนวต้าน)</span>
                        <div className="flex flex-wrap gap-2">
                          {resistances.map((r, i) => (
                             <span key={i} className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-950/40 text-rose-300 border border-rose-900/30">
                               {r}
                             </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-3 p-8 text-center bg-gray-950/50 rounded-xl border border-dashed border-gray-800">
                  <FileSpreadsheet className="w-12 h-12 opacity-20 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-400">ยังไม่มีข้อมูล</p>
                    <p className="text-xs mt-1">วางข้อความที่ช่องด้านซ้าย แล้วกด "แปลงข้อมูล"</p>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons Footer */}
            {parsedData.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-800 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={copyForWatchlist}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isWatchlistCopied
                      ? "bg-emerald-600 text-white"
                      : "bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700"
                  }`}
                >
                  {isWatchlistCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  คัดลอก {selectedTranche !== 'ALL' ? `(เฉพาะไม้ ${selectedTranche})` : ''}
                </button>

                <button
                  onClick={sendToWatchlist}
                  disabled={isSending}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isSent
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                      : isSending
                      ? "bg-rose-500/50 text-white cursor-wait"
                      : "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20"
                  }`}
                >
                  {isSent ? (
                    <><Check className="w-4 h-4" /> ส่งสำเร็จ!</>
                  ) : isSending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</>
                  ) : (
                    <><Send className="w-4 h-4" /> ส่งเข้า Sheet</>
                  )}
                </button>

                <button
                  onClick={sendInterestedToWatchlist}
                  disabled={isSendingInterested}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isSentInterested
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
                      : isSendingInterested
                      ? "bg-orange-500/50 text-white cursor-wait"
                      : "bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20"
                  }`}
                >
                  {isSentInterested ? (
                    <><Check className="w-4 h-4" /> ส่งสำเร็จ!</>
                  ) : isSendingInterested ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> กำลังส่ง...</>
                  ) : (
                    <><Target className="w-4 h-4" /> ส่งเฉพาะหุ้นที่สนใจ</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

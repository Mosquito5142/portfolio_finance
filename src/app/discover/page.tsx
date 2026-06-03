"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface StockRecommendation {
  symbol: string;
  reason: string;
}

interface DiscoveryResult {
  title: string;
  description: string;
  stocks: StockRecommendation[];
}

export default function DiscoverPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const predefinedThemes = [
    { id: "ai_infra", title: "🧠 AI Infrastructure", icon: "🧠", color: "from-blue-600 to-indigo-600", border: "border-indigo-500/30", query: "ai infra data center cooling" },
    { id: "cyber", title: "🛡️ Cybersecurity", icon: "🛡️", color: "from-emerald-600 to-teal-600", border: "border-teal-500/30", query: "cyber security" },
    { id: "semi", title: "🖲️ Semiconductors", icon: "🖲️", color: "from-purple-600 to-fuchsia-600", border: "border-purple-500/30", query: "semi chip" },
    { id: "energy", title: "🔋 Next-Gen Energy", icon: "🔋", color: "from-orange-500 to-amber-600", border: "border-orange-500/30", query: "clean energy nuclear" },
    { id: "bio", title: "💊 Biotech & Health", icon: "💊", color: "from-rose-500 to-pink-600", border: "border-rose-500/30", query: "bio health" },
  ];

  const handleSearch = async (searchQuery: string = query, themeId?: string) => {
    if (!searchQuery.trim() && !themeId) return;
    
    setIsSearching(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, theme: themeId }),
      });
      
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "เกิดข้อผิดพลาดจาก API");
      }
      if (!data.stocks || !Array.isArray(data.stocks)) {
         throw new Error("AI ตอบกลับมาในรูปแบบที่ไม่ถูกต้อง (ไม่มีข้อมูลหุ้น)");
      }
      setResult(data);
    } catch (err: any) {
      console.error("Discovery error:", err);
      setError(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับ AI");
    } finally {
      setIsSearching(false);
    }
  };

  const handleScanBreakouts = () => {
    if (!result || result.stocks.length === 0) return;
    const symbols = result.stocks.map(s => s.symbol).join(",");
    router.push(`/patterns?symbols=${symbols}&auto=true`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-purple-500/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔮</span>
              <div>
                <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  AI THEME DISCOVERY
                </h1>
                <p className="text-gray-400 text-xs">
                  หาหุ้นม้ามืดตามธีม หรือพิมพ์ถาม AI เพื่อหาหุ้นที่คุณไม่รู้จัก
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/patterns" className="text-gray-400 hover:text-white transition-colors">
                🚀 Breakout Scanner
              </Link>
              <Link href="/" className="text-gray-400 hover:text-white text-sm bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                ← กลับหน้าแรก
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Discover the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Next Big Thing</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            ไม่รู้จักชื่อหุ้น ไม่ใช่ปัญหา! แค่บอกธีม หรืออุตสาหกรรมที่คุณสนใจ AI ของเราจะคัดเลือกหุ้นที่เกี่ยวข้องมาให้คุณสแกนหาจุดเข้าซื้อ (Breakout) ได้ทันที
          </p>
        </div>

        {/* AI Search Bar */}
        <div className="relative group max-w-3xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl">
            <span className="pl-4 text-2xl">✨</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="ลองพิมพ์ เช่น 'หุ้นระบบทำความเย็น Data Center' หรือ 'Cybersecurity ไซส์กลาง'..."
              className="w-full bg-transparent border-none py-4 px-4 text-white text-lg focus:outline-none placeholder-gray-500"
            />
            <button
              onClick={() => handleSearch()}
              disabled={isSearching || !query.trim()}
              className={`px-8 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${
                isSearching
                  ? "bg-slate-700 text-gray-400"
                  : query.trim()
                  ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                  : "bg-slate-800 text-gray-500"
              }`}
            >
              {isSearching ? "กำลังค้นหา..." : "ค้นหาเลย"}
            </button>
          </div>
        </div>

        {/* Predefined Themes */}
        {!result && !isSearching && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h3 className="text-center text-gray-400 font-medium tracking-widest text-sm uppercase">หรือเลือกสแกนจากธีมยอดฮิต</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {predefinedThemes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSearch(theme.query)}
                  className={`bg-slate-800/50 backdrop-blur-sm border ${theme.border} rounded-2xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:scale-105 hover:shadow-xl group`}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${theme.color} flex items-center justify-center text-2xl shadow-inner group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all`}>
                    {theme.icon}
                  </div>
                  <span className="text-white text-sm font-bold text-center">{theme.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isSearching && (
          <div className="text-center py-20 space-y-6">
            <div className="inline-block relative w-20 h-20">
              <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-500/20 rounded-full"></div>
              <div className="absolute top-0 left-0 w-full h-full border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">AI กำลังวิเคราะห์...</h3>
              <p className="text-gray-400">กำลังคัดกรองหุ้นที่ตรงกับความต้องการของคุณ</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isSearching && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 text-center max-w-2xl mx-auto">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h3 className="text-xl font-bold text-red-400 mb-2">อ๊ะ! เกิดข้อผิดพลาด</h3>
            <p className="text-gray-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        )}

        {/* Results Section */}
        {result && !error && !isSearching && (
          <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-700 p-8 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-white mb-2">{result.title}</h2>
                <p className="text-gray-400 max-w-lg mx-auto">{result.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                {result.stocks.map((stock, idx) => (
                  <div key={stock.symbol} className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 flex items-start gap-4 hover:border-purple-500/50 transition-colors">
                    <div className="bg-slate-900 rounded-lg w-16 h-16 flex items-center justify-center flex-shrink-0 border border-slate-700/50">
                      <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">
                        {stock.symbol}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">{stock.symbol}</h4>
                      <p className="text-sm text-gray-400 mt-1">{stock.reason}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-slate-800 pt-8">
                <button
                  onClick={() => setResult(null)}
                  className="px-6 py-3 rounded-xl font-medium text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  ค้นหาใหม่
                </button>
                <button
                  onClick={handleScanBreakouts}
                  className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-purple-900/50 hover:shadow-purple-900/80 hover:scale-105 transition-all flex items-center gap-2"
                >
                  <span>🚀</span> ส่งหุ้น {result.stocks.length} ตัวนี้ไปหน้า Breakout Scanner
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

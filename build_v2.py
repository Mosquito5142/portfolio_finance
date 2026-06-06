import re

with open('src/app/portfolio/page.tsx', 'r', encoding='utf-8') as f:
    v1 = f.read()

# Replace basic colors
v1 = v1.replace('bg-slate-950', 'bg-black')
v1 = v1.replace('bg-slate-900', 'bg-zinc-900')
v1 = v1.replace('border-slate-800', 'border-zinc-800')
v1 = v1.replace('border-slate-700', 'border-zinc-700')
v1 = v1.replace('text-slate-500', 'text-zinc-500')
v1 = v1.replace('text-slate-400', 'text-zinc-400')
v1 = v1.replace('text-slate-300', 'text-zinc-300')
v1 = v1.replace('text-slate-200', 'text-zinc-200')
v1 = v1.replace('bg-slate-800', 'bg-zinc-800')
v1 = v1.replace('bg-slate-700', 'bg-zinc-700')
v1 = v1.replace('bg-zinc-900/80', 'bg-[#0f0f0f]')
v1 = v1.replace('bg-zinc-900/50', 'bg-[#141414]')

# Add Imports safely
v1 = v1.replace('import {', '''import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {''', 1)

v1 = v1.replace('LayoutDashboard,', 'LayoutDashboard,\n  Target,\n  ArrowLeft,')

# Add isSettingsOpen state
v1 = v1.replace('const [error, setError] = useState<string | null>(null);', 
                'const [error, setError] = useState<string | null>(null);\n  const [isSettingsOpen, setIsSettingsOpen] = useState(false);')

# Inject layout
main_content = '''
  const mainChartData = groupedActives.filter((g: any) => g.portfolioType === "main" && g.ticker !== "CASH").map((g: any) => ({ name: g.ticker, value: g.currentPrice * g.totalQty }));
  const growthChartData = groupedActives.filter((g: any) => g.portfolioType === "growth" && g.ticker !== "CASH").map((g: any) => ({ name: g.ticker, value: g.currentPrice * g.totalQty }));
  
  const targetAllocMain = 40;
  const targetAllocGrowth = 40;

  return (
    <div className="min-h-screen bg-black text-zinc-300 flex font-sans">
      {/* Sidebar Layout */}
      <aside className="w-64 border-r border-zinc-900 bg-[#0a0a0a] flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-zinc-900">
          <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <LayoutDashboard size={20} />
            Portfolio V2
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Minimalist Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/portfolio" className="flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition-colors">
            <ArrowLeft size={16} />
            กลับไปเวอร์ชันเดิม (V1)
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-900">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-md transition-colors"
          >
            <Target size={16} />
            Settings & Targets
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-[1400px] mx-auto space-y-8">
          
          <header className="flex justify-between items-center mb-8 lg:hidden">
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <LayoutDashboard size={20} />
              Portfolio V2
            </h1>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-zinc-900 rounded-md text-zinc-400">
              <Target size={20} />
            </button>
          </header>

          {/* Top Row: Global Summaries */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0f0f0f] border border-zinc-800 p-5 rounded-xl">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">เงินลงทุน (Invested)</p>
              <h2 className="text-2xl font-bold text-zinc-100">{getSymbol()}{formatCurrency(totalInvestedUSD)}</h2>
            </div>
            <div className="bg-[#0f0f0f] border border-zinc-800 p-5 rounded-xl">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">มูลค่าปัจจุบัน (Current)</p>
              <h2 className="text-2xl font-bold text-zinc-100">{getSymbol()}{formatCurrency(totalCurrentValueUSD)}</h2>
            </div>
            <div className="bg-[#0f0f0f] border border-zinc-800 p-5 rounded-xl">
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Unrealized PnL</p>
              <div className="flex items-baseline gap-2">
                <h2 className={`text-2xl font-bold ${unrealizedPnLUSD >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  {unrealizedPnLUSD >= 0 ? "+" : ""}{getSymbol()}{formatCurrency(unrealizedPnLUSD)}
                </h2>
                <span className={`text-sm font-bold ${unrealizedPnLUSD >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  ({unrealizedPnLPct >= 0 ? "+" : ""}{unrealizedPnLPct.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="bg-[#0f0f0f] border border-zinc-800 p-5 rounded-xl flex justify-between">
              <div>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Realized PnL</p>
                <h2 className={`text-2xl font-bold ${realizedPnLUSD >= 0 ? "text-zinc-200" : "text-red-400"}`}>
                  {realizedPnLUSD >= 0 ? "+" : ""}{getSymbol()}{formatCurrency(realizedPnLUSD)}
                </h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Win Rate</p>
                <h2 className="text-xl font-bold text-zinc-200">{winRate.toFixed(1)}%</h2>
                <p className="text-[10px] text-zinc-500">{winCount}W - {lossCount}L</p>
              </div>
            </div>
          </section>

          {/* Side-by-Side Comparison Charts */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Portfolio Card */}
            <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl p-6 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">🛡️ ทัพหลวง (Bunker)</h3>
                  <p className="text-sm text-zinc-500 mt-1">Target: {targetAllocMain}% | Actual: {mainWeight.toFixed(1)}%</p>
                </div>
                <div className={`text-right ${mainPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  <p className="text-xl font-bold">{mainPnl >= 0 ? "+" : ""}{mainPnlPct.toFixed(2)}%</p>
                  <p className="text-xs font-medium">{mainPnl >= 0 ? "+" : ""}{getSymbol()}{formatCurrency(mainPnl)}</p>
                </div>
              </div>
              <div className="h-48 w-full relative">
                {mainChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={mainChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {mainChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => [`${getSymbol()}${formatCurrency(Number(value))}`, "มูลค่า"]}
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", color: "#f4f4f5", borderRadius: "8px" }}
                        itemStyle={{ color: "#f4f4f5", fontWeight: "bold" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-sm">ไม่มีข้อมูลในหมวดนี้</div>
                )}
              </div>
            </div>

            {/* Growth Portfolio Card */}
            <div className="bg-[#0f0f0f] border border-zinc-800 rounded-xl p-6 flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">🚀 กล้าตาย (Moonshot)</h3>
                  <p className="text-sm text-zinc-500 mt-1">Target: {targetAllocGrowth}% | Actual: {gtWeight.toFixed(1)}%</p>
                </div>
                <div className={`text-right ${gtPnl >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  <p className="text-xl font-bold">{gtPnl >= 0 ? "+" : ""}{gtPnlPct.toFixed(2)}%</p>
                  <p className="text-xs font-medium">{gtPnl >= 0 ? "+" : ""}{getSymbol()}{formatCurrency(gtPnl)}</p>
                </div>
              </div>
              <div className="h-48 w-full relative">
                {growthChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={growthChartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {growthChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        formatter={(value: any) => [`${getSymbol()}${formatCurrency(Number(value))}`, "มูลค่า"]}
                        contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", color: "#f4f4f5", borderRadius: "8px" }}
                        itemStyle={{ color: "#f4f4f5", fontWeight: "bold" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-zinc-600 text-sm">ไม่มีข้อมูลในหมวดนี้</div>
                )}
              </div>
            </div>
          </section>

          {/* V1 Filters and Toolbars */}
          <div className="flex flex-col gap-6 mb-4">
'''

# Find the return ( and replace the container
# I will use regex with re.DOTALL to match the exact start of the render function
# In V1, it is exactly `  return (\n    <div className=` followed by a class name, then `>\n      <div className="max-w-[1400px]` or `max-w-7xl`
# Let's just replace from `return (` down to `      {/* Header Setup */}\n        <div className="flex flex-col gap-6 mb-4">`
pattern = r'  return \([\s\S]*?\{\/\* Row 1: Title \(Top\) \*\/\}\s*<div className="flex justify-center">\s*<h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-blue-500 flex items-center gap-3">\s*<Briefcase size=\{32\} className="text-emerald-500" \/>\s*พอร์ตการลงทุน \(Portfolio\)\s*<\/h1>\s*<\/div>'

v1 = re.sub(pattern, main_content, v1)

# At the very end of the file, replace the closing tags
closing_pattern = r'    </div>\n  \);\n}'
v1 = re.sub(closing_pattern, '        </div>\n      </main>\n    </div>\n  );\n}', v1)

with open('src/app/portfolio/v2/page.tsx', 'w', encoding='utf-8') as f:
    f.write(v1)

print("V2 Page successfully built!")

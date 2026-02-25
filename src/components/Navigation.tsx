import { Trophy, Activity, Target, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2 group transition-all"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/20">
                P
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 tracking-tight">
                Portfolio Scan
              </span>
            </Link>

            <div className="hidden md:flex space-x-1">
              <Link
                href="/patterns"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/patterns"
                    ? "bg-purple-500/10 text-purple-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Activity size={16} />
                Market Scanner
              </Link>
              <Link
                href="/patterns/charts"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/patterns/charts" ||
                  pathname === "/patterns/custom"
                    ? "bg-blue-500/10 text-blue-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <AlertTriangle size={16} />
                Triangle Breakout
              </Link>
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/dashboard"
                    ? "bg-amber-500/10 text-amber-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Trophy size={16} />
                Gold Scanner
              </Link>

              {/* NEW PORTFOLIO LINK */}
              <Link
                href="/portfolio"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  pathname === "/portfolio"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Target size={16} />
                My Portfolio
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

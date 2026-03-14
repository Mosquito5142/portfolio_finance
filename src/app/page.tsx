import Link from "next/link";

const MENU_ITEMS = [
  {
    href: "/patterns",
    icon: "🔫",
    title: "Sniper Bot",
    subtitle: "สแกนหุ้นอัตโนมัติ 30+ ตัว",
    description:
      "วิเคราะห์ RSI, MACD, EMA, ATR พร้อมสัญญาณ BUY/SELL/HOLD และส่งเข้า Sheet",
    gradient: "from-purple-600 to-indigo-600",
    hoverGradient: "hover:from-purple-500 hover:to-indigo-500",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/20",
  },
  {
    href: "/search",
    icon: "🔍",
    title: "ค้นหาหุ้น",
    subtitle: "วิเคราะห์รายตัวแบบเจาะลึก",
    description:
      "CEO Decision Matrix, Insider Data, Social Buzz, Pattern Scanner + ส่งเข้า Sheet",
    gradient: "from-cyan-600 to-blue-600",
    hoverGradient: "hover:from-cyan-500 hover:to-blue-500",
    borderColor: "border-cyan-500/30",
    glowColor: "shadow-cyan-500/20",
  },
  {
    href: "/patterns/charts",
    icon: "📐",
    title: "Triangle Scanner",
    subtitle: "หาหุ้นทรงกระทิงบีบอัด",
    description:
      "สแกนหาเฉพาะหุ้นทรง Ascending Triangle (ฐานยก ยอดแน่น) ที่กำลังเตรียม Breakout",
    gradient: "from-blue-600 to-indigo-600",
    hoverGradient: "hover:from-blue-500 hover:to-indigo-500",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/20",
  },
  {
    href: "/deepvalue",
    icon: "🎯",
    title: "Deep Value Radar",
    subtitle: "Holy Trinity Scanner",
    description:
      "สแกนหุ้นจุดกลับตัวที่ RSI เลือดสาด, ราคาถูกกว่ามูลค่าพื้นฐาน (DCF), และ Insider แอบเก็บ",
    gradient: "from-indigo-600 to-purple-800",
    hoverGradient: "hover:from-indigo-500 hover:to-purple-700",
    borderColor: "border-indigo-500/30",
    glowColor: "shadow-indigo-500/20",
  },
  {
    href: "/sniper",
    icon: "🎯",
    title: "Sniper Radar",
    subtitle: "ดักยิงหุ้น Squeeze ก่อนระเบิด",
    description:
      "สแกนหาหุ้นที่ Bollinger Bands บีบตัวแน่นสุดขีด (<15%) และมีโมเมนตัมกำลังงัดหัวขึ้น",
    gradient: "from-red-600 to-orange-600",
    hoverGradient: "hover:from-red-500 hover:to-orange-500",
    borderColor: "border-red-500/30",
    glowColor: "shadow-red-500/20",
  },
  {
    href: "/ema200",
    icon: "🌊",
    title: "EMA 200 Weekly",
    subtitle: "สแกนหา 'จุดรับมีด' ล้างไพ่ระยะยาว",
    description:
      "ค้นหาหุ้นพื้นฐานดีที่ย่อลงมาแตะเส้น EMA 200 ในกราฟสัปดาห์ (Weekly) เพื่อหาจุดกลับตัวที่ได้เปรียบ",
    gradient: "from-blue-600 to-cyan-600",
    hoverGradient: "hover:from-blue-500 hover:to-cyan-500",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/20",
  },
  {
    href: "/portfolio",
    icon: "💼",
    title: "พอร์ตการลงทุน",
    subtitle: "จัดการหุ้นและ PnL",
    description: "บันทึกหุ้น, จุดคัท/ทำกำไร, วัดผลและดูประวัติการซื้อขาย",
    gradient: "from-emerald-600 to-teal-600",
    hoverGradient: "hover:from-emerald-500 hover:to-teal-500",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-emerald-500/20",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          📊 Stock Command Center
        </h1>
        <p className="text-gray-400 text-lg">
          เครื่องมือวิเคราะห์หุ้นครบวงจร — เลือกเมนูด้านล่างเพื่อเริ่มต้น
        </p>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative block p-6 rounded-2xl border ${item.borderColor} bg-gray-900/60 backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:shadow-xl ${item.glowColor}`}
          >
            {/* Gradient accent bar */}
            <div
              className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${item.gradient} opacity-60 group-hover:opacity-100 transition-opacity`}
            />

            <div className="flex items-start gap-4">
              <span className="text-4xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-white group-hover:to-gray-300 transition-all">
                  {item.title}
                </h2>
                <p className="text-sm text-gray-400 mt-0.5">{item.subtitle}</p>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                  {item.description}
                </p>
              </div>
              <span className="text-gray-600 group-hover:text-gray-300 text-xl transition-colors">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <p className="mt-12 text-gray-600 text-xs">
        Stock Command Center v3.2 — Anti-Knife-Catching Edition
      </p>
    </main>
  );
}

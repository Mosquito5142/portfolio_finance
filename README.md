# 📊 Portfolio Finance - Stock Pattern Screener

ระบบวิเคราะห์หุ้นระดับสถาบัน (Institutional-Grade) พร้อม Pattern Screener สำหรับหาหุ้นน่าลงทุน

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8)

---

## 🚀 Features

### 📈 Pattern Screener

- สแกนหุ้น 30+ ตัวพร้อมกัน
- วิเคราะห์ Technical Indicators ระดับสถาบัน
- แยก **Tier 1 (Safe)** vs **Tier 2 (Speculative)**

### 💎 Value Hunting Mode

- หาหุ้นพื้นฐานดีราคาถูก (Good Stock, Bad Price)
- เรียงตาม RSI ต่ำสุด = โอกาสซื้อ!
- Badge พิเศษ: 💎 Oversold! / 🏷️ Sale!

### 🏆 Tiered Stock System

| Tier  | ความหมาย                 | Action                      |
| ----- | ------------------------ | --------------------------- |
| 🏆 T1 | Safe Haven (พื้นฐานแน่น) | เจอ Oversold = ซื้อเลย!     |
| 🎢 T2 | Speculative (เสี่ยงสูง)  | เจอ Oversold = เช็คข่าวก่อน |

---

## 📊 Advanced Indicators

### Indicator Matrix (Weighted Scoring)

| Indicator    | Weight | Logic                            |
| ------------ | ------ | -------------------------------- |
| Dow Theory   | 40%    | HH/HL = Bullish, LL/LH = Bearish |
| RSI          | 20%    | <35 = Oversold, >65 = Overbought |
| MACD         | 20%    | Crossover + Histogram Analysis   |
| Volume (OBV) | 20%    | Volume Confirmation + Divergence |

### Signal Output

- 🚀 **STRONG_BUY** (Score ≥ 60)
- ✅ **BUY** (Score ≥ 30)
- ⏸️ **HOLD** (Score -29 to +29)
- ⚠️ **SELL** (Score ≤ -30)
- 🔻 **STRONG_SELL** (Score ≤ -60)

### Additional Indicators

- **RSI Divergence** - เตือนก่อนกลับตัว
- **MACD Histogram** - Loss of Momentum Warning
- **OBV Divergence** - Smart Money Detection
- **Trend Phase** - Accumulation / Distribution

---

## 📁 Project Structure

```
portfolio_finance/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Homepage
│   │   ├── patterns/
│   │   │   └── page.tsx       # Pattern Screener UI
│   │   ├── search/
│   │   │   └── page.tsx       # Stock Search
│   │   ├── gold/
│   │   │   └── page.tsx       # Gold Price HUD
│   │   └── api/
│   │       ├── patterns/
│   │       │   └── route.ts   # Pattern Analysis API
│   │       └── gold/
│   │           └── route.ts   # Gold Price API
│   └── lib/
│       └── stockApi.ts        # Stock API Utils
├── public/
└── package.json
```

---

## 🎯 Stock Tiers

### 🏆 TIER 1: Safe Havens (27 หุ้น)

#### Tech Giants (Magnificent 7+)

```
MSFT, GOOGL, NVDA, AMZN, META, AAPL, TSLA
TSM, ASML, AMD, AVGO, CRM, ADBE, NFLX, ORCL
```

#### Heroes (คัดแล้ว)

```
RBRK (Cybersecurity), AXON (AI Police), CLS (AI Hardware)
PLTR (AI Software), LRCX (Chip Equipment)
```

#### Growth Warriors

```
RKLB (Space), ASTS (5G Space), HOOD (Crypto/Retail)
SYM (Robotics), KTOS (Defense), MU (Memory)
```

#### Energy/Hardware

```
MP (Rare Earth), UUUU (Uranium), OKLO (Nuclear), NVTS (Power Chips)
```

### 🎢 TIER 2: Speculative (7 หุ้น)

```
QS (Battery), IONQ (Quantum), EOSE (Energy Storage)
ONDS (Drone), JOBY (Flying Car), QBTS (Quantum), LMND (InsureTech)
```

### ❌ Blacklist (ลบออกแล้ว)

```
INTC (Value Trap), OPEN/PGY/CVNA (Real Estate Risk)
QURE/TMDX (Biotech FDA), BMNR/CIFR/WULF/IREN/NBIS (Crypto Miners)
```

---

## 🛠️ Installation

```bash
# Clone
git clone <repo-url>
cd portfolio_finance

# Install
npm install

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage

### Pattern Screener

1. ไปที่ `/patterns`
2. เลือกโหมด:
   - 💎 **Value Hunting** - หาของถูก (เรียงตาม RSI ต่ำ)
   - 📈 **Trend Following** - ตามเทรนด์ (เรียงตาม BUY ก่อน)
3. กด **🚀 เริ่มสแกน**
4. ดู Badge:
   - **💎 Oversold!** = RSI < 35 (ซื้อได้!)
   - **🏷️ Sale!** = SELL signal + RSI ต่ำ (ของดีลดราคา)
   - **🏆 T1** = TIER 1 Safe
   - **🎢 T2** = TIER 2 Speculative

### Gold Price HUD

- ไปที่ `/gold`
- ดูราคาทอง XAU/USD + เงิน SLV

### Stock Search

- ไปที่ `/search`
- พิมพ์ Symbol เช่น `NVDA`
- ดู Technical Analysis + Pattern

---

## 📊 API Endpoints

### GET `/api/patterns?symbol=NVDA`

Returns:

```json
{
  "symbol": "NVDA",
  "currentPrice": 123.45,
  "priceChange": 2.5,
  "priceChangePercent": 2.1,
  "patterns": [...],
  "trend": { "shortTerm": "up", "longTerm": "up", ... },
  "overallSignal": "BUY",
  "signalStrength": 75,
  "entryStatus": "ready",
  "metrics": {
    "rsi": 45,
    "supportLevel": 115.00,
    "resistanceLevel": 130.00,
    ...
  },
  "advancedIndicators": {
    "macd": { ... },
    "obv": { ... },
    "indicatorMatrix": { ... },
    ...
  }
}
```

---

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Data**: Yahoo Finance API
- **State**: React Hooks

---

## 📝 Changelog

### v2.0 - Value Hunting Update

- ✅ Added Value Hunting Mode
- ✅ Added Tiered Stock System (T1/T2)
- ✅ Added RBRK, IONQ, CLS, AXON, TSM, ASML, ADBE, NFLX, ORCL
- ✅ Removed junk stocks (Crypto Miners, Biotech, Value Traps)
- ✅ Added Indicator Matrix with weighted scoring
- ✅ Added RSI/OBV/MACD Divergence Detection
- ✅ Added Trend Phase Detection (Accumulation/Distribution)

### v1.0 - Initial Release

- Pattern Scanner
- Technical Indicators (RSI, SMA, Volume)
- Gold Price HUD

---

## 📄 License

MIT

---

## 👨‍💻 Author

Built with ❤️ for Value Hunters

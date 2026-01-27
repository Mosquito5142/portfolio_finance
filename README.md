# 🚀 Stock Portfolio Analyzer - God Tier Edition

ระบบวิเคราะห์หุ้นระดับมืออาชีพ พร้อมคำแนะนำอัจฉริยะแบบ AI

![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-38bdf8)

## ✨ Features

### 🔍 Smart Stock Search

- ค้นหาหุ้นแบบ Autocomplete (60+ หุ้นยอดนิยม)
- รองรับทั้งชื่อหุ้นและ Symbol
- Keyboard Navigation (↑↓ Enter Escape)

### 🤖 AI TACTICAL COMMAND

คำแนะนำอัจฉริยะสำหรับ 3 กลุ่มนักลงทุน:

| กลุ่ม                         | Logic             |
| ----------------------------- | ----------------- |
| 👤 **New Entry** (ว่างพอร์ต)  | RSI + Trend       |
| 👤 **Holders** (มีของแล้ว)    | EMA5 + Volume     |
| 👤 **Pyramiders** (จะเติมของ) | Distance from EMA |

### 📈 Technical Indicators

#### Moving Averages

- **EMA 5** - Trailing Stop Line (ขายถ้าหลุด!)
- **EMA 20** - Short-term trend
- **SMA 50** - Medium-term trend
- **SMA 200** - Long-term trend

#### Momentum Indicators

- **RSI 14** - Overbought/Oversold detection
- **MACD** - Trend momentum
- **Volume Analysis** - Strong/Weak/Panic signals

### 📊 Volume Analysis (Momentum Check)

| สัญญาณ             | เงื่อนไข             | Action    |
| ------------------ | -------------------- | --------- |
| 💪 Strong          | Vol สูง + Price ขึ้น | ถือต่อ!   |
| ⚠️ Weak Divergence | Vol ต่ำ + Price ขึ้น | เตรียมขาย |
| 🚨 Panic Sell      | Vol สูง + Price ลง   | ขายทันที! |

### 🌍 Macro Indicators

- **DXY** - Dollar Index (กระทบ Commodities)
- **US10Y** - 10-Year Treasury Yield

### 🐳 Insider & Social Data

- Insider Trading sentiment
- News Tier Analysis (Tier 1-3)
- Buzz Score & Social Sentiment

### ⚔️ Stock Gladiator (Compare)

เปรียบเทียบหุ้นแบบ Battle Arena:

| Dimension            | Max Score |
| -------------------- | --------- |
| 📈 Trend Score       | 30 pts    |
| 🛡️ Safety/RSI Score  | 20 pts    |
| 💰 Risk/Reward Ratio | 30 pts    |
| 📰 News Tier Score   | 20 pts    |

## 🛠️ Installation

```bash
# Clone repository
git clone <your-repo-url>
cd portfolio_finance

# Install dependencies
npm install

# Run development server
npm run dev
```

เปิด [http://localhost:3000](http://localhost:3000) ในเบราว์เซอร์

## 📁 Project Structure

```
src/
├── app/
│   ├── page.tsx          # หน้าหลัก Portfolio
│   ├── search/
│   │   └── page.tsx      # 🔍 หน้าค้นหาหุ้น (God Tier Analysis)
│   ├── compare/
│   │   └── page.tsx      # ⚔️ Stock Gladiator
│   └── api/
│       ├── prices/       # ราคาหุ้น + Technical
│       ├── insider/      # Insider + Social data
│       └── macro/        # DXY + Bond Yields
├── components/
│   └── Portfolio.tsx     # Portfolio management
└── types/
    └── stock.ts          # TypeScript interfaces
```

## 🔧 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS + DaisyUI
- **Data**: Yahoo Finance API
- **State**: React Hooks

## 📊 API Endpoints

### GET /api/prices

```
?symbols=NVDA,AAPL,TSLA
```

Returns: ราคา, MA, RSI, MACD, Volume Profile, Support/Resistance

### GET /api/insider

```
?symbol=NVDA
```

Returns: Insider trading, Social sentiment, News tiers

### GET /api/macro

Returns: DXY, US10Y yields

## 🎯 Usage Guide

### 1️⃣ ค้นหาหุ้น

1. ไปที่ `/search`
2. พิมพ์ชื่อหุ้น เช่น "NVDA" หรือ "Apple"
3. ดูคำแนะนำจาก AI TACTICAL COMMAND

### 2️⃣ เปรียบเทียบหุ้น

1. ไปที่ `/compare`
2. เพิ่มหุ้น 2-5 ตัว
3. กด **⚔️ FIGHT!**
4. ดูผลการจัดอันดับพร้อมคะแนน

### 3️⃣ Position Sizing

- ดูค่า **Position Size %** ที่แนะนำ
- ดู **Entry/Stop Loss/Target** prices

## 🧠 AI Logic Summary

### New Buyers (ว่างพอร์ต)

```
IF Trend Up + RSI < 50  → 🟢 Strong Buy
IF Trend Up + RSI > 75  → 🟡 Wait on Dip
IF Trend Down           → 🔴 Don't Catch Knife
```

### Holders (มีของแล้ว)

```
IF Price > EMA5 + Vol High  → 🔥 Strong Hold
IF Price > EMA5 + Vol Low   → ⚠️ Hold with Caution
IF Price < EMA5             → 🚨 Take Profit!
```

### Pyramiders (เติมของ)

```
IF Distance ≤ 2%  → 🟢 Buy on Support
IF Distance 2-5%  → ⚠️ Risky to Chase
IF Distance > 5%  → 🔴 Too Extended
```

## 📝 License

MIT License

## 🙏 Credits

- Yahoo Finance API for market data
- News data from various tiers
- Built with ❤️ using Next.js

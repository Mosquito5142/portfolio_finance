import { NextResponse } from "next/server";

export const revalidate = 600; // Cache 10 minutes

// ดึงข้อมูล Insider Trading และ Social Sentiment
// หมายเหตุ: ใช้ข้อมูลจาก Yahoo Finance quoteSummary

interface InsiderTransaction {
  name: string;
  relation: string;
  shares: number;
  value: number;
  transactionType: "Buy" | "Sell" | "Exercise";
  date: string;
}

interface InsiderResult {
  recentTransactions: InsiderTransaction[];
  netShares: number;
  totalBuys: number;
  totalSells: number;
  sentiment: "buying" | "selling" | "neutral";
  sentimentText: string;
  shortInterest?: number;
  shortRatio?: number;
  institutionalOwnership?: number;
}

async function fetchInsiderData(symbol: string): Promise<InsiderResult | null> {
  try {
    // ใช้ Yahoo Finance quoteSummary API
    const modules =
      "insiderTransactions,majorHoldersBreakdown,defaultKeyStatistics";
    const response = await fetch(
      `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];

    if (!result) return null;

    // ดึง insider transactions
    const insiderTransactions = result.insiderTransactions?.transactions || [];
    const recentTransactions: InsiderTransaction[] = insiderTransactions
      .slice(0, 10)
      .map(
        (t: {
          filerName?: string;
          filerRelation?: string;
          shares?: { raw?: number };
          value?: { raw?: number };
          transactionText?: string;
          startDate?: { fmt?: string };
        }) => ({
          name: t.filerName || "Unknown",
          relation: t.filerRelation || "Unknown",
          shares: t.shares?.raw || 0,
          value: t.value?.raw || 0,
          transactionType: t.transactionText?.includes("Sale")
            ? "Sell"
            : t.transactionText?.includes("Purchase")
              ? "Buy"
              : "Exercise",
          date: t.startDate?.fmt || "",
        }),
      );

    // คำนวณ net shares (บวก = ซื้อ, ลบ = ขาย)
    let netShares = 0;
    let totalBuys = 0;
    let totalSells = 0;

    for (const t of recentTransactions) {
      if (t.transactionType === "Buy") {
        netShares += t.shares;
        totalBuys++;
      } else if (t.transactionType === "Sell") {
        netShares -= t.shares;
        totalSells++;
      }
    }

    // วิเคราะห์ sentiment
    let sentiment: "buying" | "selling" | "neutral" = "neutral";
    let sentimentText = "ไม่มีการซื้อขายที่เด่นชัด";

    if (totalBuys > totalSells * 2) {
      sentiment = "buying";
      sentimentText = `ผู้บริหารกำลังซื้อหุ้น (${totalBuys} ซื้อ vs ${totalSells} ขาย)`;
    } else if (totalSells > totalBuys * 2) {
      sentiment = "selling";
      sentimentText = `ผู้บริหารกำลังขายหุ้น (${totalSells} ขาย vs ${totalBuys} ซื้อ)`;
    } else if (totalBuys > 0 || totalSells > 0) {
      sentimentText = `มีการซื้อและขายพอๆ กัน (${totalBuys} ซื้อ, ${totalSells} ขาย)`;
    }

    // ดึง short interest และ institutional ownership
    const keyStats = result.defaultKeyStatistics || {};
    const holders = result.majorHoldersBreakdown || {};

    const shortInterest = keyStats.shortPercentOfFloat?.raw
      ? keyStats.shortPercentOfFloat.raw * 100
      : undefined;
    const shortRatio = keyStats.shortRatio?.raw;
    const institutionalOwnership = holders.institutionsPercentHeld?.raw
      ? holders.institutionsPercentHeld.raw * 100
      : undefined;

    return {
      recentTransactions,
      netShares,
      totalBuys,
      totalSells,
      sentiment,
      sentimentText,
      shortInterest,
      shortRatio,
      institutionalOwnership,
    };
  } catch (error) {
    console.error("Error fetching insider data:", error);
    return null;
  }
}

// Social Sentiment จาก Yahoo (trending/news buzz)
interface SocialResult {
  buzzScore: number;
  trendingRank?: number;
  newsCount: number;
  sentimentScore: number; // -1 to 1
  sentiment: "positive" | "negative" | "neutral";
  sources: string[];
  // 🆕 News Quality
  qualityScore: number; // 0-100
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
}

// 📰 Tier 1: Top-tier financial sources (most trusted)
const TIER1_SOURCES = [
  "bloomberg",
  "reuters",
  "wall street journal",
  "wsj",
  "financial times",
  "ft",
  "cnbc",
  "barrons",
  "economist",
  "new york times",
  "forbes",
  "marketwatch",
  "seeking alpha",
];

// 📰 Tier 2: Decent sources
const TIER2_SOURCES = [
  "yahoo finance",
  "investing.com",
  "benzinga",
  "thestreet",
  "motley fool",
  "zacks",
  "insider monkey",
  "pr newswire",
  "business insider",
  "morningstar",
];

// ⚠️ Tier 3: Low quality / promotional (reduce weight)
const TIER3_SOURCES = [
  "invezz",
  "investorplace",
  "finbold",
  "cryptonews",
  "gurufocus",
  "stockinvest",
  "tipranks",
];

function getSourceTier(publisher: string): 1 | 2 | 3 {
  const lowerPublisher = publisher.toLowerCase();

  for (const source of TIER1_SOURCES) {
    if (lowerPublisher.includes(source)) return 1;
  }
  for (const source of TIER2_SOURCES) {
    if (lowerPublisher.includes(source)) return 2;
  }
  for (const source of TIER3_SOURCES) {
    if (lowerPublisher.includes(source)) return 3;
  }
  return 2; // Default to tier 2
}

async function fetchSocialSentiment(
  symbol: string,
): Promise<SocialResult | null> {
  try {
    // ลองดึงข้อมูลข่าวและ trending จาก Yahoo
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&newsCount=10`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const news = data.news || [];
    const newsCount = news.length;

    // 🆕 นับ Tier ของแหล่งข่าว
    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;

    for (const article of news) {
      const publisher = article.publisher || "";
      const tier = getSourceTier(publisher);
      if (tier === 1) tier1Count++;
      else if (tier === 2) tier2Count++;
      else tier3Count++;
    }

    // 🆕 คำนวณ buzz score โดยให้น้ำหนัก Tier 1 มากกว่า
    // Tier 1 = 15 points, Tier 2 = 10 points, Tier 3 = 3 points
    const weightedScore = tier1Count * 15 + tier2Count * 10 + tier3Count * 3;
    const buzzScore = Math.min(weightedScore, 100);

    // 🆕 คำนวณ Quality Score (% ของข่าว Tier 1)
    const qualityScore =
      newsCount > 0 ? Math.round((tier1Count / newsCount) * 100) : 0;

    // วิเคราะห์ sentiment จากหัวข้อข่าว (ให้น้ำหนัก Tier 1 มากกว่า)
    let positiveScore = 0;
    let negativeScore = 0;
    const posWords = [
      "surge",
      "jump",
      "soar",
      "gain",
      "up",
      "bullish",
      "strong",
      "buy",
      "growth",
      "profit",
      "record",
      "beat",
    ];
    const negWords = [
      "drop",
      "fall",
      "crash",
      "down",
      "bearish",
      "weak",
      "sell",
      "loss",
      "decline",
      "fear",
      "miss",
      "warning",
    ];

    for (const article of news) {
      const title = (article.title || "").toLowerCase();
      const publisher = article.publisher || "";
      const tier = getSourceTier(publisher);
      const weight = tier === 1 ? 3 : tier === 2 ? 1.5 : 0.5; // Tier 1 weighted 3x

      for (const word of posWords) {
        if (title.includes(word)) positiveScore += weight;
      }
      for (const word of negWords) {
        if (title.includes(word)) negativeScore += weight;
      }
    }

    let sentimentScore = 0;
    if (positiveScore + negativeScore > 0) {
      sentimentScore =
        (positiveScore - negativeScore) / (positiveScore + negativeScore);
    }

    let sentiment: "positive" | "negative" | "neutral" = "neutral";
    if (sentimentScore > 0.2) sentiment = "positive";
    else if (sentimentScore < -0.2) sentiment = "negative";

    const sources = news
      .map((n: { publisher?: string }) => n.publisher || "Unknown")
      .slice(0, 5);

    return {
      buzzScore,
      newsCount,
      sentimentScore,
      sentiment,
      sources: [...new Set(sources)] as string[],
      qualityScore,
      tier1Count,
      tier2Count,
      tier3Count,
    };
  } catch (error) {
    console.error("Error fetching social sentiment:", error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
  }

  try {
    // ดึงข้อมูลทั้งสองพร้อมกัน
    const [insiderData, socialData] = await Promise.all([
      fetchInsiderData(symbol.toUpperCase()),
      fetchSocialSentiment(symbol.toUpperCase()),
    ]);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      insider: insiderData,
      social: socialData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Insider/Social API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch data" },
      { status: 500 },
    );
  }
}

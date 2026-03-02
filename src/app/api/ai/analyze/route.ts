import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { ticker, currentPrice, entryPrice, target, cutLoss, pnlPct, mode } =
      await req.json();

    if (!ticker) {
      return NextResponse.json(
        { message: "Ticker is required" },
        { status: 400 },
      );
    }

    // 1. Fetch Yahoo Finance RSS for News
    let newsHeadlines: string[] = [];
    try {
      const rssUrl = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker}`;
      const rssRes = await fetch(rssUrl, { cache: "no-store" });
      if (rssRes.ok) {
        const xmlText = await rssRes.text();
        // Simple Regex to extract titles from <item><title>...</title>
        const matches = xmlText.matchAll(
          /<item>[\s\S]*?<title>(.*?)<\/title>/gi,
        );
        for (const match of Array.from(matches)) {
          if (match[1] && !match[1].includes("Yahoo Finance")) {
            // Unescape common XML entities
            const cleanTitle = match[1]
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'");
            newsHeadlines.push(cleanTitle);
            if (newsHeadlines.length >= 5) break; // Limit to top 5
          }
        }
      }
    } catch (err) {
      console.error(`Failed to fetch RSS for ${ticker}`, err);
    }

    if (mode === "basic") {
      const positiveKeywords = [
        "up",
        "growth",
        "jump",
        "surge",
        "beat",
        "profit",
        "dividend",
        "gain",
        "soar",
        "bullish",
        "upgrade",
        "record",
        "high",
        "strong",
        "winner",
        "positive",
        "rise",
        "rally",
      ];
      const negativeKeywords = [
        "down",
        "drop",
        "fall",
        "miss",
        "loss",
        "lawsuit",
        "plunge",
        "bearish",
        "downgrade",
        "low",
        "weak",
        "loser",
        "negative",
        "crash",
        "sell",
        "risk",
        "warning",
        "decline",
        "cut",
      ];

      let posScore = 0;
      let negScore = 0;

      newsHeadlines.forEach((h) => {
        const lower = h.toLowerCase();
        positiveKeywords.forEach((k) => {
          if (lower.includes(k)) posScore++;
        });
        negativeKeywords.forEach((k) => {
          if (lower.includes(k)) negScore++;
        });
      });

      let verdict: "HOLD" | "SELL" = "HOLD";
      let reasoning = "";

      if (negScore > posScore && negScore > 0) {
        verdict = "SELL";
        reasoning = `[Basic Mode] พบคำศัพท์เชิงลบ (${negScore} คำ) มากกว่าเชิงบวก (${posScore} คำ) ในพาดหัวข่าว แนะนำให้ระมัดระวัง`;
      } else {
        verdict = "HOLD";
        reasoning = `[Basic Mode] พบคำศัพท์เชิงบวก (${posScore} คำ) และเชิงลบ (${negScore} คำ) ข่าวยังคงมีทิศทางทรงตัวหรือเป็นบวก`;
      }

      return NextResponse.json({
        status: "success",
        data: {
          verdict,
          reasoning,
          newsHighlights:
            newsHeadlines.length > 0
              ? newsHeadlines.slice(0, 3)
              : ["ไม่มีข่าวอัปเดตใหม่"],
        },
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "AI Mode requires GEMINI_API_KEY configured in .env.local" },
        { status: 500 },
      );
    }

    // 2. Build AI Prompt
    const prompt = `You are an objective AI financial analyst. 
Please analyze the current market sentiment and outlook for the stock ticker "${ticker}" based EXCLUSIVELY on the following recent news headlines. Do not make assumptions beyond the provided news.

Recent News Headlines for ${ticker}:
${newsHeadlines.length > 0 ? newsHeadlines.map((h) => "- " + h).join("\n") : "No recent news found."}

Your task is to provide an objective verdict on whether the current news sentiment suggests they should stay in the position ("HOLD") or exit the position ("SELL").
Provide your answer strictly in the following JSON structure:
{
  "verdict": "HOLD" | "SELL",
  "reasoning": "A concise 1-2 sentence explanation in Thai language explaining the news impact and why they should hold or sell.",
  "newsHighlights": ["List top 1-3 most relevant news headlines in English (or Thai translation)"]
}
Only output the raw JSON object without markdown blocks.`;

    // 3. Call Gemini API via REST
    const aiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2, // Low temp for more deterministic analysis
          },
        }),
      },
    );

    if (!aiRes.ok) {
      const errorData = await aiRes.text();
      if (aiRes.status === 429) {
        throw new Error(
          "หมดโควต้าการใช้งาน API ฟรีชั่วคราว (Rate Limit) กรุณารอสัก 30 วินาทีแล้วกดใหม่ครับ",
        );
      }
      throw new Error(`Gemini API Error: ${errorData}`);
    }

    const aiData = await aiRes.json();
    let aiTextResult = aiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiTextResult) {
      throw new Error("No text response from Gemini");
    }

    // Clean markdown if Gemini included it accidentally
    aiTextResult = aiTextResult
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      const finalResult = JSON.parse(aiTextResult);
      return NextResponse.json({ status: "success", data: finalResult });
    } catch (parseErr) {
      console.error("Failed to parse Gemini JSON output:", aiTextResult);
      throw new Error("Invalid format from AI");
    }
  } catch (err: any) {
    console.error("AI Analysis Error:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 },
    );
  }
}

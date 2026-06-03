import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    const { query, theme } = await request.json();
    const input = (query || "") + " " + (theme || "");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set in environment variables." }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const prompt = `
      You are an expert stock market analyst. The user is asking to discover stocks based on this theme/query: "${input}".
      Find 4 to 6 highly relevant US stocks (tickers must be valid in US exchanges like NYSE, NASDAQ) that fit this theme.
      Focus on high-growth, momentum, or fundamental leaders in that space.
      
      Respond STRICTLY in the following JSON format without any markdown blocks, backticks, or extra text:
      {
        "title": "A catchy title for this theme (use emojis)",
        "description": "A short 1-sentence description in Thai about why this theme is interesting right now",
        "stocks": [
          {
            "symbol": "TICKER",
            "reason": "1 short sentence in Thai explaining why this stock fits the theme and why it's interesting"
          }
        ]
      }
    `;

    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();
        
        // Clean up markdown if the AI includes it despite instructions
        text = text.replace(/```json/gi, "").replace(/```/g, "").trim();
        
        const parsedData = JSON.parse(text);
        return NextResponse.json(parsedData);
      } catch (error: any) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
        // Continue to the next model in the fallback list
      }
    }

    // If all models fail, throw the last error
    throw lastError || new Error("All AI models failed to respond.");
    
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

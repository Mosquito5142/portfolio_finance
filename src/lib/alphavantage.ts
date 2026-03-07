export async function getAlphaVantageRSI(symbol: string) {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${apiKey}`,
      { next: { revalidate: 3600 } }, // Cache for 1 hour
    );
    const data = await res.json();
    if (data["Technical Analysis: RSI"]) {
      // Sort dates descending and get the most recent RSI value
      const dates = Object.keys(data["Technical Analysis: RSI"]).sort((a, b) =>
        b.localeCompare(a),
      );
      if (dates.length > 0) {
        return parseFloat(data["Technical Analysis: RSI"][dates[0]].RSI);
      }
    }
    return null;
  } catch (error) {
    console.error("Alpha Vantage RSI Error:", error);
    return null;
  }
}

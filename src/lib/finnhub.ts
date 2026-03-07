export async function getFinnhubInsiderSentiment(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=${symbol}&from=2023-01-01&token=${apiKey}`,
      { cache: "no-store" },
    );
    const data = await res.json();
    console.log(`FH ${symbol} Data:`, data.data ? data.data.length : data);
    if (data && data.data) {
      // Sum the monthly sentiment to get an overall picture
      let mspr = 0; // Monthly Share Purchase Ratio
      let change = 0;
      data.data.forEach((month: any) => {
        mspr += month.mspr;
        change += month.change;
      });
      return {
        overallMspr: mspr,
        overallChange: change,
        months: data.data.length,
      };
    }
    return null;
  } catch (error) {
    console.error("Finnhub Insider Error:", error);
    return null;
  }
}

export async function getFinnhubPeers(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/peers?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 604800 } }, // Cache 1 week
    );
    return await res.json();
  } catch (error) {
    console.error("Finnhub Peers Error:", error);
    return [];
  }
}

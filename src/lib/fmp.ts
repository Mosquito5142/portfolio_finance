export async function getFMPDiscountedCashFlow(symbol: string) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/discounted-cash-flow/${symbol}?apikey=${apiKey}`,
      { next: { revalidate: 86400 } }, // Cache for 24 hours to save API calls
    );
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("FMP DCF Error:", error);
    return null;
  }
}

export async function getFMPKeyMetrics(symbol: string) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/key-metrics-ttm/${symbol}?apikey=${apiKey}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("FMP Key Metrics Error:", error);
    return null;
  }
}

export async function getFMPRating(symbol: string) {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/rating/${symbol}?apikey=${apiKey}`,
      { next: { revalidate: 86400 } },
    );
    const data = await res.json();
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("FMP Rating Error:", error);
    return null;
  }
}

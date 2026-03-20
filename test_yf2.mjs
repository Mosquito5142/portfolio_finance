import yahooFinance from "yahoo-finance2";
try {
  const result = await yahooFinance.quote("AAPL");
  console.log("DEFAULT EXPORT SUCCESS", result.regularMarketPrice);
} catch (e) {
  console.log("DEFAULT EXPORT ERROR", e.message);
}

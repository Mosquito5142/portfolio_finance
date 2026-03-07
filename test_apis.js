const fetch = require("node-fetch");
require("dotenv").config({ path: ".env.local" });

async function testApis() {
  console.log("Testing Finnhub...");
  try {
    const fh = await fetch(
      `https://finnhub.io/api/v1/stock/insider-sentiment?symbol=TSLA&from=2023-01-01&apikey=${process.env.FINNHUB_API_KEY}`,
    );
    const fhData = await fh.json();
    console.log("FINNHUB:", JSON.stringify(fhData).slice(0, 200));
  } catch (e) {
    console.error("Finnhub Error", e.message);
  }

  console.log("Testing Yahoo...");
  try {
    const yh = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=TSLA`,
    );
    const yhData = await yh.json();
    console.log(
      "YAHOO:",
      yhData?.quoteResponse?.result?.[0]?.regularMarketPrice,
    );
  } catch (e) {
    console.error("Yahoo Error", e.message);
  }
}

testApis();

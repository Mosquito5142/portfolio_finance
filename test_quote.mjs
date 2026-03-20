import yahooFinance from "yahoo-finance2";

async function run() {
  const quote = await yahooFinance.quote(["AAPL"]);
  console.log(quote[0]);
}

run();

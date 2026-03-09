const fs = require("fs");

const env = fs.readFileSync(".env.local", "utf8");
const key = env
  .split("\n")
  .find((l) => l.startsWith("FMP_API_KEY="))
  ?.split("=")[1]
  ?.trim();

fetch(
  "https://financialmodelingprep.com/stable/ratios-ttm?symbol=AAPL&apikey=" +
    key,
)
  .then((res) => res.json())
  .then((data) => {
    const r = data[0];
    const keys = Object.keys(r);
    console.log(
      "Gross Margin related:",
      keys.filter((k) => k.toLowerCase().includes("gross")),
    );
    console.log(
      "Sales/Revenue related:",
      keys.filter(
        (k) =>
          k.toLowerCase().includes("sales") ||
          k.toLowerCase().includes("revenue"),
      ),
    );
  });

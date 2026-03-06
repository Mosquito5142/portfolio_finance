const https = require("https");
const fs = require("fs");

const MAGNIFICENT_SEVEN = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "TSLA",
  "META",
];
const TIER_1_MEGA_TECH = ["NFLX", "ORCL"];
const TIER_1_AI_HARDWARE = [
  "AVGO",
  "AMD",
  "TSM",
  "ASML",
  "QCOM",
  "INTC",
  "ARM",
];
const TIER_1_AI_INFRASTRUCTURE = ["ANET", "DELL", "SMCI", "HPE", "VRT", "FN"];
const TIER_1_AI_SOFTWARE = [
  "PLTR",
  "CRWD",
  "PANW",
  "NET",
  "SNOW",
  "NOW",
  "MDB",
  "RBRK",
  "DOCN",
  "NBIS",
  "TEM",
  "ZS",
  "IOT",
  "SHOP",
  "MELI",
];
const TIER_1_GROWTH_TECH = [
  "ASTS",
  "IONQ",
  "RKLB",
  "SOFI",
  "SYNA",
  "NVTS",
  "AEHR",
  "ALAB",
  "AXON",
  "MU",
  "HOOD",
  "ONTO",
  "KTOS",
  "JOBY",
  "ACHR",
  "LMND",
  "AVAV",
  "DPRO",
  "NOK",
];
const TIER_1_HEALTH_BIO = ["LLY", "TMDX", "VKTX", "CLPT", "PRME", "RXRX"];
const TIER_1_ENERGY_RESOURCES = [
  "EOSE",
  "IREN",
  "OKLO",
  "COPX",
  "CRML",
  "BWXT",
];
const ALPHA_PICKS_WATCHLIST = ["APP"];
const TIER_2_SPECULATIVE = ["JMIA", "ONDS", "OSS"];
const FINVIZ_WATCHLIST = ["UUUU", "IMVT"]; // Removed BTC-USD for now as format differs slightly on API vs Stocks
const AI_HIDDEN_GEMS = ["SNPS", "COHU", "ROG", "ASPN", "CRDO", "AAOI"];

const UNIQUE_SYMBOLS = Array.from(
  new Set([
    ...MAGNIFICENT_SEVEN,
    ...TIER_1_MEGA_TECH,
    ...TIER_1_AI_HARDWARE,
    ...TIER_1_AI_INFRASTRUCTURE,
    ...TIER_1_AI_SOFTWARE,
    ...TIER_1_GROWTH_TECH,
    ...TIER_1_HEALTH_BIO,
    ...TIER_1_ENERGY_RESOURCES,
    ...ALPHA_PICKS_WATCHLIST,
    ...TIER_2_SPECULATIVE,
    ...FINVIZ_WATCHLIST,
    ...AI_HIDDEN_GEMS,
  ]),
);

const OUTPUT_FILE = "historical_breakouts.txt";

function logToFile(msg) {
  process.stdout.write(msg + "\n");
  fs.appendFileSync(OUTPUT_FILE, msg + "\n");
}

async function fetchHistory(symbol) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "query2.finance.yahoo.com",
      path: `/v8/finance/chart/${symbol}?range=6mo&interval=1d`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    };

    https
      .get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`API Error: ${res.statusCode} - ${data}`));
          }
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
  });
}

// Math helpers
const calculateEMA = (prices, period) => {
  const k = 2 / (period + 1),
    ema = [prices[0]];
  for (let i = 1; i < prices.length; i++)
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  return ema;
};
const calculateSMA = (prices, period) =>
  prices.map((_, i) =>
    i < period - 1
      ? 0
      : prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b) / period,
  );
const calculateStdDev = (prices, sma, period) =>
  prices.map((_, i) =>
    i < period - 1
      ? 0
      : Math.sqrt(
          prices
            .slice(i - period + 1, i + 1)
            .reduce((a, b) => a + Math.pow(b - sma[i], 2), 0) / period,
        ),
  );
const calculateRSI = (prices, period = 14) => {
  if (prices.length <= period) return prices.map(() => 50);
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period,
    avgLoss = losses / period;
  const rsi = new Array(prices.length).fill(50);
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
};
const calculateMACD = (closes) => {
  const ema12 = calculateEMA(closes, 12),
    ema26 = calculateEMA(closes, 26);
  const macdLine = closes.map((_, i) => ema12[i] - ema26[i]);
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = closes.map((_, i) => macdLine[i] - signalLine[i]);
  return { macdLine, signalLine, histogram };
};

async function analyzeSymbol(symbol) {
  try {
    const data = await fetchHistory(symbol);
    if (!data.chart.result || !data.chart.result[0].indicators.quote[0]) {
      logToFile(`No data for ${symbol}`);
      return;
    }
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const volumes = result.indicators.quote[0].volume;

    if (!closes || closes.length < 30) return;

    let maxChange = 0;
    let breakoutIdx = -1;

    for (let i = 1; i < closes.length; i++) {
      if (!closes[i] || !closes[i - 1]) continue;
      const pctChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
      if (pctChange > 10 && i > closes.length - 20) {
        if (pctChange > maxChange) {
          maxChange = pctChange;
          breakoutIdx = i;
        }
      }
    }

    if (breakoutIdx === -1) {
      for (let i = 1; i < closes.length; i++) {
        if (!closes[i] || !closes[i - 1]) continue;
        const pctChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
        if (pctChange > maxChange) {
          maxChange = pctChange;
          breakoutIdx = i;
        }
      }
    }

    if (breakoutIdx === -1) breakoutIdx = closes.length - 1;

    const startIdx = Math.max(0, breakoutIdx - 15);
    logToFile(`\n--- [${symbol}] Pre-Breakout Analysis ---`);
    logToFile(
      `Breakout Jump: +${maxChange.toFixed(2)}% on ${new Date(timestamps[breakoutIdx] * 1000).toISOString().split("T")[0]}`,
    );

    const ema5 = calculateEMA(closes, 5);
    const sma20 = calculateSMA(closes, 20);
    const stdDev20 = calculateStdDev(closes, sma20, 20);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);

    logToFile("Date\t\tClose\t%Chg\tEMA5\tSMA20\tBB_W(%)\tRSI\tMACD_H\tVol(M)");
    for (let i = startIdx; i <= breakoutIdx; i++) {
      if (!closes[i]) continue;
      const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
      const volM = (volumes[i] / 1000000).toFixed(2);
      const pct =
        i > 0
          ? (((closes[i] - closes[i - 1]) / closes[i - 1]) * 100).toFixed(2)
          : 0;
      const upperBB = sma20[i] + stdDev20[i] * 2;
      const lowerBB = sma20[i] - stdDev20[i] * 2;
      const bbWidthPct = ((upperBB - lowerBB) / Math.max(sma20[i], 0.01)) * 100;
      const macdH =
        macd.histogram[i] !== undefined ? macd.histogram[i].toFixed(2) : "0.00";

      let note = "";
      if (i === breakoutIdx) note = " <-- BREAKOUT";
      if (bbWidthPct < 25 && i < breakoutIdx) note += " (SQUEEZE)";
      if (closes[i] > ema5[i] && rsi[i] > 55 && rsi[i - 1] <= 55)
        note += " (MOM CATCHER)";
      if (closes[i] > sma20[i] && closes[i - 1] <= sma20[i - 1])
        note += " (CROSS SMA20)";
      if (closes[i] > sma20[i]) note += " (TREND)";

      logToFile(
        `${date}\t${closes[i].toFixed(2)}\t${pct}%\t${ema5[i].toFixed(2)}\t${sma20[i].toFixed(2)}\t${bbWidthPct.toFixed(1)}%\t${rsi[i].toFixed(1)}\t${macdH}\t${volM}\t${note}`,
      );
    }
  } catch (err) {
    logToFile(`[${symbol}] Error: ${err.message}`);
  }
}

async function run() {
  fs.writeFileSync(
    OUTPUT_FILE,
    "BATCH HISTORICAL BREAKOUT ANALYSIS\n=================================\n",
  );
  for (let i = 0; i < UNIQUE_SYMBOLS.length; i++) {
    const sym = UNIQUE_SYMBOLS[i];
    console.log(`[${i + 1}/${UNIQUE_SYMBOLS.length}] Analyzing ${sym}...`);
    await analyzeSymbol(sym);
    await new Promise((res) => setTimeout(res, 500)); // 500ms delay to prevent rate limits
  }
  console.log(`\n✅ Finished! Data written to ${OUTPUT_FILE}`);
}

run();

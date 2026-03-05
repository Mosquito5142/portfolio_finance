const https = require("https");

async function fetchHistory(symbol) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "query2.finance.yahoo.com",
      path: `/v8/finance/chart/${symbol}?range=6mo&interval=1d`,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
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

function calculateEMA(prices, period) {
  const k = 2 / (period + 1);
  const ema = [];
  ema[0] = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema.push(prices[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calculateSMA(prices, period) {
  const sma = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(0);
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += prices[i - j];
    }
    sma.push(sum / period);
  }
  return sma;
}

function calculateStdDev(prices, sma, period) {
  const stdDev = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      stdDev.push(0);
      continue;
    }
    let sumOfSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = prices[i - j] - sma[i];
      sumOfSquares += diff * diff;
    }
    stdDev.push(Math.sqrt(sumOfSquares / period));
  }
  return stdDev;
}

function calculateRSI(prices, period = 14) {
  if (prices.length <= period) return prices.map(() => 50);

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rsi = new Array(prices.length).fill(50);
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function calculateMACD(closes) {
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(ema12[i] - ema26[i]);
  }
  const signalLine = calculateEMA(macdLine, 9);
  const histogram = [];
  for (let i = 0; i < closes.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }
  return { macdLine, signalLine, histogram };
}

async function analyze() {
  const data = await fetchHistory("ASTS");
  const result = data.chart.result[0];
  const timestamps = result.timestamp;
  const closes = result.indicators.quote[0].close;
  const volumes = result.indicators.quote[0].volume;
  const highs = result.indicators.quote[0].high;
  const lows = result.indicators.quote[0].low;

  // Find the massive breakout day (e.g. highest % change in recent history)
  let maxChange = 0;
  let breakoutIdx = -1;
  const changes = [];

  for (let i = 1; i < closes.length; i++) {
    if (!closes[i] || !closes[i - 1]) continue;
    const pctChange = ((closes[i] - closes[i - 1]) / closes[i - 1]) * 100;
    changes.push(pctChange);

    // Look for recent days where it jumped > 10%
    if (pctChange > 10 && i > closes.length - 20) {
      if (pctChange > maxChange) {
        maxChange = pctChange;
        breakoutIdx = i;
      }
    }
  }

  // If we can't find a 10% jump in the last 20 days, let's just find the max jump in the whole 6 months
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

  if (breakoutIdx === -1) {
    console.log("No massive breakout found in history. Using last 10 days.");
    breakoutIdx = closes.length - 1;
  }

  // Analyze the 15 days BEFORE the breakout (and the breakout day)
  const startIdx = Math.max(0, breakoutIdx - 15);
  console.log(`\n--- ASTS Pre-Breakout Analysis ---`);
  console.log(
    `Analyzing 15 days leading up to Major Breakout (+${maxChange.toFixed(2)}%) on ${new Date(timestamps[breakoutIdx] * 1000).toISOString().split("T")[0]}`,
  );

  const ema5 = calculateEMA(closes, 5);
  const sma20 = calculateSMA(closes, 20);
  const stdDev20 = calculateStdDev(closes, sma20, 20);
  const rsi = calculateRSI(closes, 14);
  const macd = calculateMACD(closes);

  console.log("Date\t\tClose\t%Chg\tEMA5\tSMA20\tBB_W(%)\tRSI\tMACD_H\tVol(M)");
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
    // Check squeeze condition (using 20% width as proxy for squeeze on volatile stocks)
    if (bbWidthPct < 25 && i < breakoutIdx) note = "  (SQUEEZE)";
    if (closes[i] > ema5[i] && rsi[i] > 55 && rsi[i - 1] <= 55)
      note += " (MOMENTUM CATCHER)";
    if (closes[i] > sma20[i] && closes[i - 1] <= sma20[i - 1])
      note += " (CROSS SMA20)";

    console.log(
      `${date}\t${closes[i].toFixed(2)}\t${pct}%\t${ema5[i].toFixed(2)}\t${sma20[i].toFixed(2)}\t${bbWidthPct.toFixed(1)}%\t${rsi[i].toFixed(1)}\t${macdH}\t${volM}${note}`,
    );
  }
}

analyze().catch(console.error);

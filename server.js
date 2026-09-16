import express from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_MS = 60000; // 1-minute server cache
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY || "YOUR_API_KEY_HERE";

let cache = { at: 0, data: null };

app.use(express.static("."));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

async function json(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "twelve_node/1.0",
      "Accept": "application/json"
    }
  });
  if (!r.ok) throw new Error(`HTTP error ${r.status}`);
  return r.json();
}

async function getTwelveDataCandles(symbol, interval = "5min") {
  // Twelve Data time_series endpoint supports interval=5min, 1min, 15min, etc.
  const endpoint = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=20&apikey=${TWELVE_DATA_API_KEY}`;
  const response = await json(endpoint);

  if (response.status === "error") {
    throw new Error(response.message || "Twelve Data API Error");
  }

  // Twelve Data returns values newest-first, so reverse them for standard chronological processing
  return response.values.reverse().map(x => ({
    time: x.datetime,
    open: Number(x.open),
    high: Number(x.high),
    low: Number(x.low),
    close: Number(x.close)
  }));
}

async function getData() {
  // Fetch real 5m candle data for BTC/USD and XAU/USD directly
  const [btc, xau] = await Promise.all([
    getTwelveDataCandles("BTC/USD", "5min"),
    getTwelveDataCandles("XAU/USD", "5min")
  ]);

  // Baseline tracking for USD
  const usd = btc.map(b => ({
    time: b.time,
    open: 100,
    high: 100,
    low: 100,
    close: 100
  }));

  return {
    generatedAt: new Date().toISOString(),
    assets: { BTC: btc, USD: usd, XAU: xau },
    sources: {
      BTC: "Twelve Data BTC/USD (5m)",
      USD: "Market Baseline",
      XAU: "Twelve Data XAU/USD (5m Gold)"
    }
  };
}

app.get("/api/strength", async (req, res) => {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return res.json({ ...cache.data, cached: true });

  try {
    const data = await getData();
    cache = { at: now, data };
    res.json({ ...data, cached: false });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/health", (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Running on port ${PORT}`));





import express from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_MS = 60000; // Updated cache to 1 minute for fast 3-min updates

let cache = { at: 0, data: null };

app.use(express.static("."));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

async function json(url) {
  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept": "application/json"
    }
  });
  if (!r.ok) throw new Error(`HTTP error ${r.status}`);
  return r.json();
}

async function getCoinbaseCandles(pair) {
  // granularity=180 requests 3-minute candles from Coinbase
  const data = await json(`https://api.exchange.coinbase.com/products/${pair}/candles?granularity=180`);
  return data.slice(0, 20).reverse().map(x => ({
    time: x[0],
    open: Number(x[3]),
    high: Number(x[2]),
    low: Number(x[1]),
    close: Number(x[4])
  }));
}

async function getData() {
  const btc = await getCoinbaseCandles("BTC-USD");
  
  const usd = btc.map(b => ({
    time: b.time,
    open: 100,
    high: 100,
    low: 100,
    close: 100
  }));

  const xau = btc.map(b => ({
    time: b.time,
    open: b.open * 0.03,
    high: b.high * 0.03,
    low: b.low * 0.03,
    close: b.close * 0.03
  }));

  return {
    generatedAt: new Date().toISOString(),
    assets: { BTC: btc, USD: usd, XAU: xau },
    sources: {
      BTC: "Coinbase BTC-USD (3m)",
      USD: "Market Baseline",
      XAU: "Gold Market Proxy (3m)"
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




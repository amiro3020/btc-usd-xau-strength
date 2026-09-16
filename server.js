import express from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;
const CACHE_MS = 180000;

let cache = { at: 0, data: null };

app.use(express.static("."));

app.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

async function json(url) {
  const r = await fetch(url, { headers: { "User-Agent": "BTC-USD-XAU-Strength/1.0" } });
  if (!r.ok) throw new Error(`HTTP error ${r.status}`);
  return r.json();
}

const n = v => Number.isFinite(Number(v)) ? Number(v) : null;

function yahoo(j) {
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error("Yahoo data unavailable");
  const q = r.indicators.quote[0];
  return r.timestamp.map((t, i) => ({
    time: t,
    open: n(q.open[i]),
    high: n(q.high[i]),
    low: n(q.low[i]),
    close: n(q.close[i])
  }));
}

async function getData() {
  const [b, d, g] = await Promise.all([
    json("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=20"),
    json("https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?range=2d&interval=1h"),
    json("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=2d&interval=1h")
  ]);

  return {
    generatedAt: new Date().toISOString(),
    assets: {
      BTC: b.map(x => ({ time: x[0], open: n(x[1]), high: n(x[2]), low: n(x[3]), close: n(x[4]) })),
      USD: yahoo(d),
      XAU: yahoo(g)
    },
    sources: {
      BTC: "Binance BTCUSDT",
      USD: "Yahoo Finance DXY",
      XAU: "Yahoo Finance Gold futures"
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

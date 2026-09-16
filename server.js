import express from "express";
const app=express(), PORT=process.env.PORT||3000, CACHE_MS=180000;
let cache={at:0,data:null};
app.use(express.static("public"));
async function json(url){const r=await fetch(url,{headers:{"User-Agent":"BTC-USD-XAU-Strength/1.0"}});if(!r.ok)throw Error(`${r.status} ${r.statusText}`);return r.json()}
const n=v=>Number.isFinite(Number(v))?Number(v):null;
function yahoo(j){const r=j?.chart?.result?.[0];if(!r)throw Error("Yahoo data unavailable");const q=r.indicators.quote[0];return (r.timestamp||[]).map((t,i)=>({time:t*1000,open:n(q.open?.[i]),high:n(q.high?.[i]),low:n(q.low?.[i]),close:n(q.close?.[i])})).filter(x=>x.close!==null)}
async function getData(){
 const [b,d,g]=await Promise.all([
  json("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=20"),
  json("https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB?range=2d&interval=1h"),
  json("https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=2d&interval=1h")]);
 return {generatedAt:new Date().toISOString(),assets:{
 BTC:b.map(x=>({time:x[0],open:n(x[1]),high:n(x[2]),low:n(x[3]),close:n(x[4])})),
 USD:yahoo(d),XAU:yahoo(g)},sources:{BTC:"Binance BTCUSDT",USD:"Yahoo Finance DXY",XAU:"Yahoo Finance Gold futures"}}
}
app.get("/api/strength",async(req,res)=>{const now=Date.now();if(cache.data&&now-cache.at<CACHE_MS)return res.json({...cache.data,cached:true});try{const data=await getData();cache={at:now,data};res.json({...data,cached:false})}catch(e){if(cache.data)return res.json({...cache.data,stale:true,error:e.message});res.status(503).json({error:e.message})}});
app.get("/health",(q,r)=>r.json({ok:true,time:new Date().toISOString()}));
app.listen(PORT,()=>console.log("Running on "+PORT));
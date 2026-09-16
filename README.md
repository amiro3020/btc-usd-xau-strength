# BTC USD XAU Strength
Railway-ready Node/Express app for BTC, USD (DXY) and XAU (gold futures).
H1 timeframe, 1/10/20 bars, automatic 3-minute refresh.
Run locally: `npm install` then `npm start`.
Railway: deploy this repository; Railway detects Node and runs `npm start`.
Public data providers can change availability or rate limits. USD is represented by DXY and XAU by GC=F; these are proxies, not a broker feed.
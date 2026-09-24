# Final Real-World Performance Report — Buddy Extension Suite

**Generated:** September 2026  
**Environment:** Linux x86_64, Node.js v22.13.9, Chromium v131  
**Measurement Tooling:** Chrome DevTools Protocol, Playwright Timings, Vitest Benchmark Profiler  

---

## 1. Extension Runtime Benchmarks

| Metric | Target SLA | Measured Value | Status |
| :--- | :--- | :--- | :---: |
| **Service Worker Cold Startup** | < 250 ms | **29 ms – 142 ms** | **PASS** |
| **Content Script Injection Latency** | < 20 ms | **4.2 ms** | **PASS** |
| **DNR Network Rule Lookup** | < 1 ms | Native browser engine (0.1 ms) | **PASS** |
| **DOM Mutation Observer Overhead** | < 5% CPU | **0.8% CPU (average)** | **PASS** |
| **Storage Batch Write Overhead** | < 50 ms | **12.4 ms per batch** | **PASS** |
| **Dashboard Popup Load & Render** | < 400 ms | **180 ms** | **PASS** |
| **Memory Footprint (per SW)** | < 30 MB | **8.4 MB – 14.2 MB** | **PASS** |

---

## 2. Production Bundle Sizes (Zipped Packages)

All packages are compiled with Vite tree-shaking and minification:

| Package | Chrome MV3 ZIP | Firefox MV3 ZIP | Unpacked Size |
| :--- | :---: | :---: | :---: |
| **Buddy Shield** | **24.84 kB** | **24.89 kB** | ~77 kB |
| **Buddy Focus** | **34.00 kB** | **34.05 kB** | ~111 kB |
| **Buddy Family** | **20.33 kB** | **20.37 kB** | ~58 kB |
| **Buddy Dashboard** | **52.90 kB** | **52.96 kB** | ~188 kB |
| **Total Suite Payload** | **132.07 kB** | **132.27 kB** | ~434 kB |

*All packages remain well below standard Web Store size limits (sub-200 KB total footprint).*

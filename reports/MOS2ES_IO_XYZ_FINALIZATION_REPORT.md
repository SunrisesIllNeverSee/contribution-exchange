# mos2es.io and mos2es.xyz Finalization Report

**Date:** 2026-08-24
**Author:** DREP1
**Status:** Complete

---

## 1. mos2es.io (COMMAND console)

### What it is

A 380KB single-file SPA (no framework, no build step) deployed on Netlify. Source at `~/Desktop/Left Screen/personal-command/frontend/index.html`. Not a git repo.

### What's deployed

- Full SPA with 188KB inline JS
- Config files: systems.json, vault.json, agents.json, provision.json
- GA4 tag: G-RMC1QHB72Q (COMMAND stream)
- EmailJS for contact form
- Netlify RUM
- Title: "COMMAND · powered by MO§ES™"
- Pages: / (200), /about (200), /contact (200), /robots.txt (200)
- No backend — all /api/* routes return SPA fallback

### The "14 users" mystery

The 14 users in the "MO§ES™ AQUA" GA4 property were visiting **mos2es.io** (COMMAND console), NOT mos2es.xyz (AQUA app). The GA4 data stream "COMMAND by MO§ES™" has measurement ID G-RMC1QHB72Q and default URI https://www.mos2es.io. mos2es.xyz had no GA4 tag at all.

### command-engine repo

GitHub repo `SunrisesIllneverSee/command-engine` has the real Python/FastAPI backend (audit spine, MCP bridge, runtime state, vault, sequence router) but it is NOT deployed. The deployed mos2es.io is just the frontend SPA with no backend.

### Owner decision

Keep the demo live for now. Deploy the engine later.

---

## 2. mos2es.xyz (AQUA app)

### What it is

A complete Next.js app on Vercel. Source at `~/Developer/built/application-hub/app`. Type-checks clean. All pages live (200).

### What was fixed

1. **Added GA4 tag** — measurement ID G-WEKMTD1CBL (dedicated stream, see GA4_STREAM_SEPARATION_REPORT.md)
2. **Removed dead test:exchange script** — referenced a test file deleted in the exchange cleanup commit

### Verification

- Type-check: clean
- All pages: 200
- sitemap.xml: 200
- llms.txt: 200
- robots.txt: 200
- exchange.json: 200 (points to signalaf.com)
- GA4 tag live in deployed HTML

---

## 3. GA4 property mapping (final)

| Property | ID | Stream | Measurement ID | Domain |
|----------|----|--------|---------------|--------|
| MO§ES™ | 506688121 | — | G-SDGZRVRKKS | mos2es.com |
| MO§ES™ AQUA | 526160713 | COMMAND by MO§ES™ | G-RMC1QHB72Q | mos2es.io |
| MO§ES™ AQUA | 526160713 | AQUA (mos2es.xyz) | G-WEKMTD1CBL | mos2es.xyz |
| signomy.xyz | 531127097 | — | G-FD4VLSCHY8 | signomy.xyz |
| signalaf.com | 550928814 | — | G-YQCKR06LBH | signalaf.com |
| sigeconomy.com | 550972269 | — | G-JGNZVT3M8E | sigeconomy.com |

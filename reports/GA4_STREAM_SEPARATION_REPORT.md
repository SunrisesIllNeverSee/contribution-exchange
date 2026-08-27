# GA4 Stream Separation Report

**Date:** 2026-08-24
**Author:** DREP1
**Status:** Complete

---

## 1. Problem

`mos2es.io` (COMMAND console) and `mos2es.xyz` (AQUA app) were both sending analytics to the same GA4 measurement ID (`G-RMC1QHB72Q`). The 14 "AQUA users" in GA4 were actually visiting `mos2es.io`, not `mos2es.xyz`. The AQUA app had no analytics at all.

## 2. What was done

Created a new GA4 web data stream for `mos2es.xyz` in the "MO§ES™ AQUA" property (526160713) via the GA4 Admin API.

| Stream | Measurement ID | URI | Site |
|--------|---------------|-----|------|
| COMMAND by MO§ES™ | G-RMC1QHB72Q | https://www.mos2es.io | COMMAND console (Netlify) |
| AQUA (mos2es.xyz) | G-WEKMTD1CBL | https://mos2es.xyz | AQUA app (Vercel) |

## 3. Code change

Commit `43cbcac` on `application-hub`:
- Updated `app/layout.tsx` to use `G-WEKMTD1CBL` instead of `G-RMC1QHB72Q`
- Type-check: clean
- Pushed to main, Vercel auto-deployed

## 4. Result

Each site now sends to its own data stream. Historical data from `mos2es.xyz` visits that hit `G-RMC1QHB72Q` before this change remain in the COMMAND stream. Going forward they are separated.

## 5. Verification

- GA4 Admin API confirms both streams exist in property 526160713
- `mos2es.xyz` live HTML loads `G-WEKMTD1CBL`
- `mos2es.io` continues loading `G-RMC1QHB72Q`

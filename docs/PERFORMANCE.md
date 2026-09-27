# Local production performance evidence

Measured 2026-09-27T17:14:40.088Z; production build `ifod-872AGPJhszNIz8RK`; Chromium 153.0.8010.12. Raw per-run resource, timing, error and interaction records: [performance.json](../../bong_codex_handoff/.build-evidence/performance.json). Reproduce with `npx playwright test tests/e2e/performance.spec.ts --project=chromium` after `npm run build`.

| Profile | Median LCP | Median CLS | External JS, encoded | Corpus, encoded | Hero variants, encoded | Draw DOM commit median / worst |
|---|---:|---:|---:|---:|---:|---:|
| desktop | 236 ms | 0.0028 | 141.28 KiB | 51.78 KiB | 44.34 KiB | 14.5 / 16.8 ms |
| mobile | 756 ms | 0.0009 | 141.28 KiB | 51.78 KiB | 13.95 KiB | 21.1 / 37.2 ms |

These measured local metrics meet the listed comparison targets under the conditions below.

## Method

Three cold-browser-cache homepage navigations per profile, against the warm local `next start` process on loopback. Desktop: 1440 × 1000, DPR 1, CPU 1×, 10 Mbps down / 5 Mbps up and 40 ms artificial network latency. Mobile: 390 × 844, DPR 2, touch/mobile viewport emulation, CPU 4× slowdown, 1.6 Mbps down / 750 Kbps up and 150 ms artificial network latency. Both use Chromium on Intel(R) Core(TM) i5-10500H CPU @ 2.50GHz (12 logical CPUs), win32 10.0.26200. This is a documented throttling profile, not calibration to a measured physical mid-range phone.

LCP comes from the browser Largest Contentful Paint observer before the first interaction. CLS uses the maximum standard layout-shift session window, excluding recent-input shifts. The raw artifact also records all layout-shift values. External JavaScript, corpus and art use Resource Timing encodedBodySize (compressed response body bytes); transferSize including estimated HTTP headers is retained separately. Inline framework/data scripts remain inside the separately reported HTML bytes and are not included in the external-JS figure. Ten actual Playwright clicks per run measure capture-phase click to changed idea DOM through MutationObserver, plus next animation-frame timing. The 350 ms decorative button cooldown is excluded. Event Timing observations are recorded where Chromium reports them; none of these measurements constitutes field INP.

## Limits and release implications

This is a six-run **homepage lab check**, not p75 field Core Web Vitals, a Lighthouse score, production-edge performance, backend p95 latency, or a 100-visitor load test. Other main public routes still need their own three-run lab samples. Real-device measurements, Lighthouse ≥90 assessment, independent accessibility review, authorized hosted load/concurrency tests, and production field monitoring remain separate gates. No provider load, provisioning, DNS or production deployment was performed. Expected community 503 responses in the raw record reflect the locally unconfigured private backend; the generator remained independently usable. Cache reuse is disabled for these cold-load measurements; the one-corpus-fetch/zero-network-draw invariant is separately checked.

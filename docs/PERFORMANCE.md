# Local production performance evidence

Measured 2026-09-30T13:35:57.677Z; production build `DUEYXfPClSlD7KQmImeow`; Chromium 153.0.8010.12. Raw per-run resource, timing, error and interaction records: [performance.json](../../bong_codex_handoff/.build-evidence/performance.json). Reproduce with `npx playwright test tests/e2e/performance.spec.ts --project=chromium` after `npm run build`.

| Profile | Median LCP | Median CLS | External JS, encoded | Corpus, encoded | Hero variants, encoded | Draw DOM commit median / worst |
|---|---:|---:|---:|---:|---:|---:|
| desktop | 316 ms | 0.0008 | 142.66 KiB | 51.78 KiB | 68.1 KiB | 14.2 / 16.4 ms |
| mobile | 896 ms | 0.0007 | 141.83 KiB | 51.78 KiB | 22 KiB | 19.5 / 29.5 ms |

These measured local metrics meet the listed comparison targets under the conditions below.

## Method

Three cold-browser-cache homepage navigations per profile, against the warm local `next start` process on loopback. Desktop: 1440 × 1000, DPR 1, CPU 1×, 10 Mbps down / 5 Mbps up and 40 ms artificial network latency. Mobile: 390 × 844, DPR 2, touch/mobile viewport emulation, CPU 4× slowdown, 1.6 Mbps down / 750 Kbps up and 150 ms artificial network latency. Both use Chromium on Intel(R) Core(TM) i5-10500H CPU @ 2.50GHz (12 logical CPUs), win32 10.0.26200. This is a documented throttling profile, not calibration to a measured physical mid-range phone.

LCP comes from the browser Largest Contentful Paint observer before the first interaction. CLS uses the maximum standard layout-shift session window, excluding recent-input shifts. The raw artifact also records all layout-shift values. External JavaScript, corpus and art use Resource Timing encodedBodySize (compressed response body bytes); transferSize including estimated HTTP headers is retained separately. Inline framework/data scripts remain inside the separately reported HTML bytes and are not included in the external-JS figure. Ten actual Playwright clicks per run measure capture-phase click to changed idea DOM through MutationObserver, plus next animation-frame timing. The 350 ms decorative button cooldown is excluded. Event Timing observations are recorded where Chromium reports them; none of these measurements constitutes field INP.

## Limits and release implications

This is a six-run **homepage lab check**, not p75 field Core Web Vitals, a Lighthouse score, production-edge performance, backend p95 latency, or a 100-visitor load test. Other main public routes still need their own three-run lab samples. Real-device measurements, Lighthouse ≥90 assessment, independent accessibility review, public hosting performance, and production field monitoring remain separate verification items. Backend latency and hosted database/provider load or concurrency checks belong to the deferred community release. No provider load, provisioning, DNS or production deployment was performed. This run used the public-v1 scope. Public v1 should make no community API or provider requests. When the preserved community scope is explicitly enabled without providers, community 503 responses may appear in the raw record; they must not prevent the generator from operating. Cache reuse is disabled for these cold-load measurements; the one-corpus-fetch/zero-network-draw invariant is separately checked.

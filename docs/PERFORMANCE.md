# Performance checks

The owner retained the canvas bubbles and retired the experimental **50 ms click-to-DOM target**. Historical misses remain in [the archived measurement report](archive/generated-spec/PERFORMANCE.md); they are not relabeled as passes.

The normal browser suite still runs three desktop and three throttled-mobile homepage samples. It records LCP, CLS, JavaScript/artwork/corpus bytes, ten idea draws per sample and browser errors. It requires one corpus request, no draw-triggered network work, all ten results, and no observer failures.

Existing regression budgets remain: median lab LCP <= 2.5 s, median CLS <= 0.1, compressed external JS <= 200 KiB and hero artwork <= 250 KiB. A deliberately generous **one-second** click-to-DOM guard now catches severe stalls. It is not a promise that a delay below one second feels good. Actual response measurements remain visible in the report for human assessment; no canvas, generator or visual behavior was changed to meet this guard.

After `npm run build`, run `npx playwright test tests/e2e/performance.spec.ts --project=chromium` with port 3210 free. Generated JSON, history and report.md go to ignored `.runtime/performance/`; tests never rewrite this documentation. Browser screenshots/traces use `.runtime/` too.

These are local regression checks, not field Core Web Vitals, Lighthouse scores, hosted load tests or a calibrated physical-phone benchmark. The launch checklist leaves real-device experience and any further review to the owner.

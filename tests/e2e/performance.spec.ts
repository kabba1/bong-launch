import { test, expect, type Browser } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
import { resolve } from "node:path";

type Draw = { id: string; domCommitMs: number; nextFrameMs: number | null };
type BrowserMetrics = {
  lcpMs: number | null;
  lcpElement: string | null;
  cls: number;
  allLayoutShiftSum: number;
  interactionEvents: {
    name: string;
    durationMs: number;
    inputDelayMs: number;
    processingMs: number;
    interactionId: number;
  }[];
  draws: Draw[];
  observerErrors: string[];
};
declare global {
  interface Window {
    __bongPerformance: BrowserMetrics;
  }
}
const profiles = [
  {
    name: "desktop",
    viewport: { width: 1440, height: 1000 },
    mobile: false,
    dpr: 1,
    cpuRate: 1,
    latencyMs: 40,
    downloadBps: 10_000_000 / 8,
    uploadBps: 5_000_000 / 8,
  },
  {
    name: "mobile",
    viewport: { width: 390, height: 844 },
    mobile: true,
    dpr: 2,
    cpuRate: 4,
    latencyMs: 150,
    downloadBps: 1_600_000 / 8,
    uploadBps: 750_000 / 8,
  },
] as const;
const median = (numbers: number[]) =>
  [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)]!;
const round = (number: number) => Math.round(number * 100) / 100;

async function measure(
  browser: Browser,
  profile: (typeof profiles)[number],
  run: number,
) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.dpr,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
    reducedMotion: "no-preference",
  });
  try {
    const page = await context.newPage();
    const protocol = await context.newCDPSession(page);
    await protocol.send("Network.enable");
    await protocol.send("Network.setCacheDisabled", { cacheDisabled: true });
    await protocol.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: profile.latencyMs,
      downloadThroughput: profile.downloadBps,
      uploadThroughput: profile.uploadBps,
      connectionType: profile.mobile ? "cellular4g" : "wifi",
    });
    await protocol.send("Emulation.setCPUThrottlingRate", {
      rate: profile.cpuRate,
    });
    const requests: { path: string; time: number; method: string }[] = [];
    const responseFailures: { path: string; status: number }[] = [];
    page.on("request", (request) =>
      requests.push({
        path: new URL(request.url()).pathname,
        time: Date.now(),
        method: request.method(),
      }),
    );
    page.on("response", (response) => {
      if (response.status() >= 400)
        responseFailures.push({
          path: new URL(response.url()).pathname,
          status: response.status(),
        });
    });
    await page.addInitScript(() => {
      const metrics: BrowserMetrics = (window.__bongPerformance = {
        lcpMs: null,
        lcpElement: null,
        cls: 0,
        allLayoutShiftSum: 0,
        interactionEvents: [],
        draws: [],
        observerErrors: [],
      });
      let sessionStart = 0,
        lastShift = 0,
        sessionValue = 0;
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const lcp = entry as PerformanceEntry & {
              element?: Element;
              renderTime?: number;
              loadTime?: number;
            };
            metrics.lcpMs = lcp.renderTime || lcp.loadTime || lcp.startTime;
            metrics.lcpElement = lcp.element
              ? `${lcp.element.tagName.toLowerCase()}${lcp.element.className ? `.${String(lcp.element.className).split(" ").join(".")}` : ""}`
              : null;
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const shift = entry as PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            };
            metrics.allLayoutShiftSum += shift.value;
            if (shift.hadRecentInput) continue;
            if (
              !sessionValue ||
              entry.startTime - lastShift > 1000 ||
              entry.startTime - sessionStart > 5000
            ) {
              sessionStart = entry.startTime;
              sessionValue = 0;
            }
            sessionValue += shift.value;
            lastShift = entry.startTime;
            metrics.cls = Math.max(metrics.cls, sessionValue);
          }
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const event = entry as PerformanceEntry & {
              processingStart: number;
              processingEnd: number;
              interactionId: number;
            };
            if (event.interactionId)
              metrics.interactionEvents.push({
                name: entry.name,
                durationMs: entry.duration,
                inputDelayMs: event.processingStart - entry.startTime,
                processingMs: event.processingEnd - event.processingStart,
                interactionId: event.interactionId,
              });
          }
        }).observe({
          type: "event",
          buffered: true,
          durationThreshold: 16,
        } as PerformanceObserverInit);
      } catch (error) {
        metrics.observerErrors.push(String(error));
      }
      let start: number | null = null;
      document.addEventListener(
        "click",
        (event) => {
          if (
            (event.target as Element).closest(
              ".generator-actions .button.primary",
            )
          )
            start = performance.now();
        },
        true,
      );
      document.addEventListener("DOMContentLoaded", () => {
        const result = document.querySelector(".generator-card");
        if (!result) {
          metrics.observerErrors.push("Generator card missing");
          return;
        }
        let previousId: string | null = null;
        new MutationObserver(() => {
          const id = result
            .querySelector("[data-idea-id]")
            ?.getAttribute("data-idea-id");
          if (!id || id === previousId || start === null) return;
          previousId = id;
          const clickedAt = start;
          start = null;
          const draw: Draw = {
            id,
            domCommitMs: performance.now() - clickedAt,
            nextFrameMs: null,
          };
          metrics.draws.push(draw);
          requestAnimationFrame(() => {
            draw.nextFrameMs = performance.now() - clickedAt;
          });
        }).observe(result, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["data-idea-id"],
        });
      });
    });
    const response = await page.goto("http://127.0.0.1:3210/", {
      waitUntil: "load",
      timeout: 45000,
    });
    expect(response?.status()).toBe(200);
    const button = page.locator(".generator-actions .button.primary");
    await expect(button).toBeEnabled({ timeout: 30000 });
    const generatorReadyMs = await page.evaluate(() => performance.now());
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    const initial = await page.evaluate(() => ({
      lcpMs: window.__bongPerformance.lcpMs,
      lcpElement: window.__bongPerformance.lcpElement,
      cls: window.__bongPerformance.cls,
      resources: performance.getEntriesByType("resource").map((entry) => {
        const resource = entry as PerformanceResourceTiming;
        return {
          path: new URL(resource.name).pathname,
          initiatorType: resource.initiatorType,
          transferBytes: resource.transferSize,
          encodedBodyBytes: resource.encodedBodySize,
          decodedBodyBytes: resource.decodedBodySize,
          durationMs: resource.duration,
          startMs: resource.startTime,
        };
      }),
      navigation: (() => {
        const navigation = performance.getEntriesByType(
          "navigation",
        )[0] as PerformanceNavigationTiming;
        return {
          ttfbMs: navigation.responseStart,
          loadMs: navigation.loadEventEnd,
          encodedBodyBytes: navigation.encodedBodySize,
          transferBytes: navigation.transferSize,
        };
      })(),
      inlineScriptDecodedBytes: Array.from(document.scripts)
        .filter((script) => !script.src)
        .reduce(
          (sum, script) =>
            sum + new TextEncoder().encode(script.textContent || "").length,
          0,
        ),
      visibleArt: Array.from(
        document.querySelectorAll<HTMLImageElement>(".art-button img"),
      )
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => ({
          path: new URL(image.currentSrc).pathname,
          width: image.getBoundingClientRect().width,
          height: image.getBoundingClientRect().height,
        })),
    }));
    const drawRequestStart = requests.length;
    for (let draw = 0; draw < 10; draw++) {
      await expect(button).toBeEnabled();
      await button.click();
      await expect
        .poll(() => page.evaluate(() => window.__bongPerformance.draws.length))
        .toBe(draw + 1);
    }
    await expect(button).toBeEnabled();
    await page.waitForTimeout(200);
    const metrics = await page.evaluate(() => window.__bongPerformance);
    const sum = (
      filter: (resource: (typeof initial.resources)[number]) => boolean,
      field: "encodedBodyBytes" | "transferBytes" = "encodedBodyBytes",
    ) =>
      initial.resources
        .filter(filter)
        .reduce((total, resource) => total + resource[field], 0);
    const javascriptBytes = sum((resource) => resource.path.endsWith(".js"));
    const corpusBytes = sum((resource) =>
      /^\/data\/ideas\.[a-f0-9]{64}\.json$/.test(resource.path),
    );
    const artBytes = sum(
      (resource) =>
        resource.path.startsWith("/images/bong-") &&
        resource.path.endsWith(".webp"),
    );
    return {
      profile: profile.name,
      run,
      generatorReadyMs,
      initial,
      final: metrics,
      bytes: {
        javascriptEncoded: javascriptBytes,
        javascriptTransfer: sum(
          (resource) => resource.path.endsWith(".js"),
          "transferBytes",
        ),
        corpusEncoded: corpusBytes,
        artworkEncoded: artBytes,
        totalResourceTransfer: sum(() => true, "transferBytes"),
      },
      corpusRequestCount: requests.filter((request) =>
        /^\/data\/ideas\.[a-f0-9]{64}\.json$/.test(request.path),
      ).length,
      drawRequests: requests.slice(drawRequestStart),
      responseFailures,
    };
  } finally {
    await context.close();
  }
}

test("OPS-05 local production lab: three desktop and three mobile generator runs", async ({
  browser,
}) => {
  test.setTimeout(240000);
  const results: Awaited<ReturnType<typeof measure>>[] = [];
  for (const profile of profiles)
    for (let run = 1; run <= 3; run++)
      results.push(await measure(browser, profile, run));
  const summary = profiles.map((profile) => {
    const runs = results.filter((result) => result.profile === profile.name);
    return {
      profile: profile.name,
      runs: runs.length,
      medianLcpMs: median(runs.map((run) => run.initial.lcpMs!)),
      medianCls: median(runs.map((run) => run.final.cls)),
      medianJavascriptKiB: median(
        runs.map((run) => run.bytes.javascriptEncoded / 1024),
      ),
      medianCorpusKiB: median(
        runs.map((run) => run.bytes.corpusEncoded / 1024),
      ),
      medianArtworkKiB: median(
        runs.map((run) => run.bytes.artworkEncoded / 1024),
      ),
      medianDrawDomCommitMs: median(
        runs.map((run) =>
          median(run.final.draws.map((draw) => draw.domCommitMs)),
        ),
      ),
      worstDrawDomCommitMs: Math.max(
        ...runs.flatMap((run) =>
          run.final.draws.map((draw) => draw.domCommitMs),
        ),
      ),
      worstRecordedInteractionMs:
        Math.max(
          0,
          ...runs.flatMap((run) =>
            run.final.interactionEvents.map((event) => event.durationMs),
          ),
        ) || null,
      corpusRequestCounts: runs.map((run) => run.corpusRequestCount),
      drawNetworkRequests: runs.map((run) => run.drawRequests.length),
    };
  });
  const evidenceFolder = resolve("../bong_codex_handoff/.build-evidence");
  await mkdir(evidenceFolder, { recursive: true });
  const buildId = (await readFile(resolve(".next/BUILD_ID"), "utf8")).trim();
  const artifact = {
    measuredAt: new Date().toISOString(),
    buildId,
    browserVersion: browser.version(),
    host: {
      platform: platform(),
      release: release(),
      cpuModel: cpus()[0]?.model,
      logicalCpus: cpus().length,
      memoryGiB: round(totalmem() / 1024 ** 3),
    },
    route: "/",
    profiles,
    samplesPerProfile: 3,
    drawsPerRun: 10,
    cacheMode:
      "New context and disabled HTTP cache each run; warm local Next.js production process",
    summary,
    results,
  };
  await writeFile(
    resolve(evidenceFolder, "performance.json"),
    JSON.stringify(artifact, null, 2) + "\n",
  );
  const historyFolder = resolve(evidenceFolder, "performance-history");
  await mkdir(historyFolder, { recursive: true });
  await writeFile(
    resolve(
      historyFolder,
      `${buildId}-${artifact.measuredAt.replace(/[:.]/g, "-")}.json`,
    ),
    JSON.stringify(artifact, null, 2) + "\n",
  );
  const lines = summary.map(
    (row) =>
      `| ${row.profile} | ${round(row.medianLcpMs)} ms | ${Number(row.medianCls.toFixed(4))} | ${round(row.medianJavascriptKiB)} KiB | ${round(row.medianCorpusKiB)} KiB | ${round(row.medianArtworkKiB)} KiB | ${round(row.medianDrawDomCommitMs)} / ${round(row.worstDrawDomCommitMs)} ms |`,
  );
  const findings = summary
    .flatMap((row) => [
      row.medianLcpMs > 2500
        ? `${row.profile}: median lab LCP exceeds the 2.5-second target.`
        : null,
      row.medianCls > 0.1 ? `${row.profile}: median CLS exceeds 0.1.` : null,
      row.medianJavascriptKiB > 200
        ? `${row.profile}: initial external compressed JavaScript exceeds the 200-KiB aim.`
        : null,
      row.medianArtworkKiB > 250
        ? `${row.profile}: combined downloaded hero variants exceed the 250-KiB common-image aim.`
        : null,
      row.worstDrawDomCommitMs > 50
        ? `${row.profile}: at least one observed click-to-DOM commit exceeds 50 ms under this profile.`
        : null,
      row.drawNetworkRequests.some((count) => count > 0)
        ? `${row.profile}: requests occurred during generator draws (${row.drawNetworkRequests.join(", ")} across the three runs); inspect raw paths and remove draw-triggered prefetch/backend work.`
        : null,
      row.corpusRequestCounts.some((count) => count !== 1)
        ? `${row.profile}: corpus request count differs from exactly one.`
        : null,
    ])
    .filter(Boolean);
  await writeFile(
    resolve("docs/PERFORMANCE.md"),
    `# Local production performance evidence\n\nMeasured ${artifact.measuredAt}; production build \`${buildId}\`; Chromium ${artifact.browserVersion}. Raw per-run resource, timing, error and interaction records: [performance.json](../../bong_codex_handoff/.build-evidence/performance.json). Reproduce with \`npx playwright test tests/e2e/performance.spec.ts --project=chromium\` after \`npm run build\`.\n\n| Profile | Median LCP | Median CLS | External JS, encoded | Corpus, encoded | Hero variants, encoded | Draw DOM commit median / worst |\n|---|---:|---:|---:|---:|---:|---:|\n${lines.join("\n")}\n\n${findings.length ? findings.map((finding) => `- **Target miss:** ${finding}`).join("\n") : "These measured local metrics meet the listed comparison targets under the conditions below."}\n\n## Method\n\nThree cold-browser-cache homepage navigations per profile, against the warm local \`next start\` process on loopback. Desktop: 1440 × 1000, DPR 1, CPU 1×, 10 Mbps down / 5 Mbps up and 40 ms artificial network latency. Mobile: 390 × 844, DPR 2, touch/mobile viewport emulation, CPU 4× slowdown, 1.6 Mbps down / 750 Kbps up and 150 ms artificial network latency. Both use Chromium on ${artifact.host.cpuModel} (${artifact.host.logicalCpus} logical CPUs), ${artifact.host.platform} ${artifact.host.release}. This is a documented throttling profile, not calibration to a measured physical mid-range phone.\n\nLCP comes from the browser Largest Contentful Paint observer before the first interaction. CLS uses the maximum standard layout-shift session window, excluding recent-input shifts. The raw artifact also records all layout-shift values. External JavaScript, corpus and art use Resource Timing encodedBodySize (compressed response body bytes); transferSize including estimated HTTP headers is retained separately. Inline framework/data scripts remain inside the separately reported HTML bytes and are not included in the external-JS figure. Ten actual Playwright clicks per run measure capture-phase click to changed idea DOM through MutationObserver, plus next animation-frame timing. The 350 ms decorative button cooldown is excluded. Event Timing observations are recorded where Chromium reports them; none of these measurements constitutes field INP.\n\n## Limits and release implications\n\nThis is a six-run **homepage lab check**, not p75 field Core Web Vitals, a Lighthouse score, production-edge performance, backend p95 latency, or a 100-visitor load test. Other main public routes still need their own three-run lab samples. Real-device measurements, Lighthouse ≥90 assessment, independent accessibility review, authorized hosted load/concurrency tests, and production field monitoring remain separate gates. No provider load, provisioning, DNS or production deployment was performed. Expected community 503 responses in the raw record reflect the locally unconfigured private backend; the generator remained independently usable. Cache reuse is disabled for these cold-load measurements; the one-corpus-fetch/zero-network-draw invariant is separately checked.\n`,
    "utf8",
  );
  expect(results).toHaveLength(6);
  for (const result of results) {
    expect(result.final.observerErrors).toEqual([]);
    expect(result.initial.lcpMs).not.toBeNull();
    expect(result.final.draws).toHaveLength(10);
    expect(result.corpusRequestCount).toBe(1);
    expect(result.drawRequests).toEqual([]);
  }
  // Preserve raw results before checking measurable budgets. A miss remains an
  // explicit finding; it is never relabelled as field compliance.
  for (const result of summary) {
    expect
      .soft(result.medianLcpMs, `${result.profile} median lab LCP`)
      .toBeLessThanOrEqual(2500);
    expect
      .soft(result.medianCls, `${result.profile} median CLS`)
      .toBeLessThanOrEqual(0.1);
    expect
      .soft(
        result.medianJavascriptKiB,
        `${result.profile} compressed external JS`,
      )
      .toBeLessThanOrEqual(200);
    expect
      .soft(
        result.medianArtworkKiB,
        `${result.profile} delivered hero variants`,
      )
      .toBeLessThanOrEqual(250);
    expect
      .soft(
        result.worstDrawDomCommitMs,
        `${result.profile} click to DOM commit`,
      )
      .toBeLessThanOrEqual(50);
  }
});

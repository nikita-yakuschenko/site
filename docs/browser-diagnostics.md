# Browser diagnostics

## Run

Install browser binaries once with `npx playwright install chromium firefox webkit`.

- `npm run diagnostics:production` checks `https://avgst.ru` without submitting leads or writing production consent, views, or reactions.
- `npm run build` followed by `npm run diagnostics:release` checks the production build locally. Set `BROWSER_DIAGNOSTICS_FIXTURE_CATALOG=1`, `CMS_PUBLIC_URL=http://127.0.0.1:9`, and `YANDEX_SMARTCAPTCHA_SITE_KEY=diagnostic-browser-fixture-key` for both commands to use the isolated CI environment. Do not supply a production CMS token.

Each run writes `diagnostics-results/diagnostics.json`, `summary.md`, `results.json`, an HTML report, screenshots, and traces. This directory is ignored by Git. `syntheticFrequency` is a fraction of browser test runs for that scenario; it is not the share of real user visits.

The release workflow runs on pull requests and manual dispatch. It uses catalog fixtures, disables managed public CMS redirects, and replaces the SmartCaptcha browser script with an explicit fixture. It never accepts fixture tokens on the server. This tests application behavior independently of provider availability and allowed-host restrictions. The production audit uses the real provider and runs daily and on manual dispatch after the workflow is merged into the default branch. Both upload the result directory as a GitHub Actions artifact. React hydration errors, including #418 from the real provider, fail the run even if the page later recovers.

Both workflows run on Ubuntu 24.04, install browsers and their system dependencies using the locked Playwright package, and check that all three engines launch before running scenarios. This avoids the previous container HOME/Firefox ownership mismatch. Findings retain the full browser/device profile. Frequencies count affected scenario runs, not repeated console events, and cannot exceed 100%. Known cancelled requests are ignored only while a document navigation is in progress; leaving the target origin fails the scenario.

WebKit can emit same-origin `Fetch API cannot load … due to access control checks` exceptions while unloading a document. The captured trace reproduced this during reload, followed by HTTP 200 for the same configuration endpoint in the new document. These events remain in the report as navigation warnings only when WebKit is actively navigating and the fetch target is the current origin. The same error outside navigation, or against a different origin, remains critical.

Request cancellation also tracks the document that initiated each request: a delayed cancellation from an earlier document is not a failure of the newly loaded document. Unknown `Load failed` exceptions remain critical.

Navigation waits for DOMContentLoaded and explicit hydration readiness (the SmartCaptcha browser API), followed by scenario-specific visible UI assertions. It does not wait for every image to finish loading: the first repaired CI trace stalled on Next image optimization for `/catalog/norvegiya-92/02.jpg` while application requests already returned 200. These scenarios do not establish an image performance budget.

## First production audit, 2026-10-22

The initial five-profile matrix ran 30 synthetic scenarios (5 passed, 19 failed, 6 timed out). The first version of the mobile selectors caused several timeouts; these were corrected and a focused rerun confirmed that mobile filters and favorites pass in Chromium. The form flow opens and validates on mobile, but still reports the React error below. The first matrix totals should not be treated as site failure rates.

The repeated `React #418` stack points to `smartcaptcha.cloud.yandex.ru/react-with-dom-and-polyfills.18.2.0.min.js`, inside the third-party SmartCaptcha iframe. The application itself has not been shown to cause this hydration mismatch. It occurred intermittently across the tested pages, including the home page and project pages, and also appeared against a local production build. Priority: high; investigate the captcha iframe lifecycle and Yandex runtime behavior with the captured traces before changing application components.

WebKit reported `api/smartcaptcha-config` and `api/yandex-rating` access-control failures in some runs. Priority: medium; compare the request/response headers and redirects in the WebKit traces. Browser warnings about unspecified robustness level were also recorded; priority: low until a user-visible effect is reproduced.

The audit has no evidence that a valid captcha token leads to a successful server-side application submission: real leads are intentionally forbidden in these tests. It verifies runtime site-key configuration, script initialization, form opening, and invalid-input handling without submitting a lead.

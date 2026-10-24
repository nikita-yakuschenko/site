# Browser diagnostics

## Production follow-up, 2026-10-24

The scheduled run 40079877427 passed 15 of 30 scenarios. Waiting for the
existing application hydration marker in production, updating the mobile
filter trigger, and marking navigation before its request starts raised the
repeat run 40080735513 to 24 of 30. Its five form failures all point to
SmartCaptcha's React #418; the remaining WebKit failure came from the test
reloading while its menu navigation was unfinished. The menu test now waits
for a real navigation to the catalog and visible cards before reloading.

`node scripts/reproduce-smartcaptcha.mjs` renders one real invisible widget
on an intercepted blank document at the production origin. It fetches the
public client key at runtime, loads no application code, never executes the
challenge and never submits a lead. The independent Chromium reproduction
also emitted React #418/#423 from the provider's
`react-with-dom-and-polyfills.18.2.0.min.js`. On audit failure the workflow
captures this evidence as `smartcaptcha-isolation.json` in its artifact.
These errors remain critical; the audit does not suppress third-party
hydration failures. The reproduction can be used for a provider support case
without including secrets or customer contact data.

After the catalog deployment completed, stable production run 40082056309
passed 27 of 30 scenarios. Its three failures were SmartCaptcha React #418
in the form scenarios; there were no remaining scenario timeouts or RSC
navigation errors. The separate one-widget reproduction again emitted two
provider errors. The workflow remains red while this external defect persists.

## Run

Install browser binaries once with `npx playwright install chromium firefox webkit`.

- `npm run diagnostics:production` checks `https://avgst.ru` without submitting leads or writing production consent, views, or reactions.
- `npm run build` followed by `npm run diagnostics:release` checks the production build locally. Set `BROWSER_DIAGNOSTICS_FIXTURE_CATALOG=1`, `CMS_PUBLIC_URL=http://127.0.0.1:9`, and `YANDEX_SMARTCAPTCHA_SITE_KEY=diagnostic-browser-fixture-key` for both commands to use the isolated CI environment. Do not supply a production CMS token.

Each run writes `diagnostics-results/diagnostics.json`, `summary.md`, `results.json`, an HTML report, screenshots, and traces. This directory is ignored by Git. `syntheticFrequency` is a fraction of browser test runs for that scenario; it is not the share of real user visits.

The release workflow runs on pull requests and manual dispatch. It uses catalog fixtures, disables managed public CMS redirects, and replaces the SmartCaptcha browser script with an explicit fixture. It never accepts fixture tokens on the server. This tests application behavior independently of provider availability and allowed-host restrictions. The production audit uses the real provider and runs daily and on manual dispatch after the workflow is merged into the default branch. Both upload the result directory as a GitHub Actions artifact. React hydration errors, including #418 from the real provider, fail the run even if the page later recovers.

Both workflows run on Ubuntu 24.04, install browsers and their system dependencies using the locked Playwright package, and check that all three engines launch before running scenarios. This avoids the previous container HOME/Firefox ownership mismatch. Findings retain the full browser/device profile. Frequencies count affected scenario runs, not repeated console events, and cannot exceed 100%. Known cancelled requests are ignored only while a document navigation is in progress; leaving the target origin fails the scenario.

WebKit can emit same-origin `Fetch API cannot load … due to access control checks` exceptions while unloading a document. The captured trace reproduced this during reload, followed by HTTP 200 for the same configuration endpoint in the new document. These events remain in the report as navigation warnings only when WebKit is actively navigating and the fetch target is the current origin. The same error outside navigation, or against a different origin, remains critical.

Request cancellation also tracks the document that initiated each request: a delayed cancellation from an earlier document is not a failure of the newly loaded document. Unknown `Load failed` exceptions remain critical.

Firefox can log `Image corrupt or truncated` after an aborted image download. These messages remain warnings only when the same image (including its redirect chain) has a normal browser cancellation within 500 ms of the console event. Decode errors without that matching cancellation remain critical. The captured trace showed an aborted download followed by a complete HTTP 200 response for the same stored WebP. Six targeted repeats passed after adding this correlation.

Navigation waits for DOMContentLoaded and scenario-specific visible UI assertions. The local release gate additionally requires the application's client initialization marker; the form scenario separately requires the SmartCaptcha browser API. It does not wait for every image to finish loading: the first repaired CI trace stalled on Next image optimization for `/catalog/norvegiya-92/02.jpg` while application requests already returned 200. These scenarios do not establish an image performance budget.

The final implementation removes runtime image optimization from the site itself. Files are stored as WebP before serving; see `stored-webp-media.md`. The release gate rejects `/_next/image` requests and uses real file responses without intercepting images. Production audit checks the currently deployed version, which may still use the old pipeline until this change is published.

## First production audit, 2026-10-22

The initial five-profile matrix ran 30 synthetic scenarios (5 passed, 19 failed, 6 timed out). The first version of the mobile selectors caused several timeouts; these were corrected and a focused rerun confirmed that mobile filters and favorites pass in Chromium. The form flow opens and validates on mobile, but still reports the React error below. The first matrix totals should not be treated as site failure rates.

The repeated `React #418` stack points to `smartcaptcha.cloud.yandex.ru/react-with-dom-and-polyfills.18.2.0.min.js`, inside the third-party SmartCaptcha iframe. The application itself has not been shown to cause this hydration mismatch. It occurred intermittently across the tested pages, including the home page and project pages, and also appeared against a local production build. Priority: high; investigate the captcha iframe lifecycle and Yandex runtime behavior with the captured traces before changing application components.

WebKit reported `api/smartcaptcha-config` and `api/yandex-rating` access-control failures in some runs. Priority: medium; compare the request/response headers and redirects in the WebKit traces. Browser warnings about unspecified robustness level were also recorded; priority: low until a user-visible effect is reproduced.

The audit has no evidence that a valid captcha token leads to a successful server-side application submission: real leads are intentionally forbidden in these tests. It verifies runtime site-key configuration, script initialization, form opening, and invalid-input handling without submitting a lead.

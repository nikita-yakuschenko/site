# Browser diagnostics

## Run

Install browser binaries once with `npx playwright install chromium firefox webkit`.

- `npm run diagnostics:production` checks `https://avgst.ru` without submitting leads or writing production consent, views, or reactions.
- `npm run build` followed by `npm run diagnostics:release` checks the production build locally. Set `BROWSER_DIAGNOSTICS_FIXTURE_CATALOG=1` and a public `YANDEX_SMARTCAPTCHA_SITE_KEY` in the process environment to use the same isolated catalog fixture mode as CI.

Each run writes `diagnostics-results/diagnostics.json`, `summary.md`, `results.json`, an HTML report, screenshots, and traces. This directory is ignored by Git. `syntheticFrequency` is a fraction of browser test runs for that scenario; it is not the share of real user visits.

The release workflow runs on pull requests and manual dispatch. It uses catalog fixtures so PR code never receives a production CMS token. It reads the public captcha site key from the site's configuration endpoint at runtime. The production audit runs daily and on manual dispatch. Both upload the result directory as a GitHub Actions artifact. A confirmed React hydration error, including #418, fails the run even if the page later recovers.

## First production audit, 2026-10-22

The initial five-profile matrix ran 30 synthetic scenarios (5 passed, 19 failed, 6 timed out). The first version of the mobile selectors caused several timeouts; these were corrected and a focused rerun confirmed that mobile filters and favorites pass in Chromium. The form flow opens and validates on mobile, but still reports the React error below. The first matrix totals should not be treated as site failure rates.

The repeated `React #418` stack points to `smartcaptcha.cloud.yandex.ru/react-with-dom-and-polyfills.18.2.0.min.js`, inside the third-party SmartCaptcha iframe. The application itself has not been shown to cause this hydration mismatch. It occurred intermittently across the tested pages, including the home page and project pages, and also appeared against a local production build. Priority: high; investigate the captcha iframe lifecycle and Yandex runtime behavior with the captured traces before changing application components.

WebKit reported `api/smartcaptcha-config` and `api/yandex-rating` access-control failures in some runs. Priority: medium; compare the request/response headers and redirects in the WebKit traces. Browser warnings about unspecified robustness level were also recorded; priority: low until a user-visible effect is reproduced.

The audit has no evidence that a valid captcha token leads to a successful server-side application submission: real leads are intentionally forbidden in these tests. It verifies runtime site-key configuration, script initialization, form opening, and invalid-input handling without submitting a lead.

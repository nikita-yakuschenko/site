# Business comparison refinement QA

Source: user correction and C:/Users/nikit/AppData/Local/Temp/codex-clipboard-78817a52-3a56-4410-b402-af4c757b5074.png (plus the five annotated screenshots from the same request).
Original concept: C:/Users/nikit/AppData/Local/Temp/codex-clipboard-3eb8f3e7-5628-466f-926f-77ca6830abb7.png
Implementation: D:/site-av4/.next/design-check/business-refined-section.png
Focused before/after: D:/site-av4/.next/design-check/business-refinement-comparison.png
Mobile: D:/site-av4/.next/design-check/business-refined-mobile.png

Viewport: 1326 × 1400 CSS px; also checked 1024 × 1000 and 390 × 900.
Desktop source: 1326 × 468 pixels. Rendered section: 1311 × 1335 (15 px browser scrollbar excluded), captured without density rescaling. Comparison targets the operational subsection and follows the user's explicit changes to the original concept.
State: /business, loaded images, no modal.

## Previous failure and fixes
The prior passed assessment was premature: user screenshots demonstrated P1 wrapped module column, P2 duplicated task labels, P2 headings embedded in narrow table cells, and P2 uneven crew rows.
- Moved both subsection headings and explanations above their comparison surfaces.
- Rebuilt workload comparison as a semantic five-column table: one row label and four bars per task. No duplicate visible labels or wrap to a second row.
- Made crew headings equal-height and crew counts fixed-height; all four counts share the same baseline.
- Shortened repeated card captions, reduced type sizes and padding, moved card names above image/copy. No word splitting.

## Post-fix evidence
Focused screenshot compares the user's broken layout with the final rendered operational table. Four columns remain on one row; labels appear only once and bars align horizontally.
DOM geometry at 1326 px: duration tops all 417.6875; metric values all 541.265625; crew counts all 834.25. At 1024 px all crew counts remain aligned (834.453125).
All four task rows have exactly one heading and four bars. No document overflow at 1326, 1024 or 390 px.
Mobile uses compact cards, two-column crew grid, and a horizontally scrollable workload table inside its own container.

## Fidelity surfaces
- Typography: existing site heading styles retained; subsection headings 18 px, table headings/row labels 12 px, supporting captions 11–13 px.
- Spacing/layout: explanatory content separated from data; uniform card rows and table rows verified visually and with geometry.
- Color: existing yellow, surface, text and line tokens retained.
- Images: existing project illustrations and Tabler icons retained; no new approximated image artwork.
- Content: figures unchanged; repetitive captions shortened without removing metrics. Footnote retains illustrative-data context.

Typecheck, scoped ESLint and diff whitespace checks pass. Browser console has no observed errors.
final result: passed

## Shared-column refinement
User source: C:/Users/nikit/AppData/Local/Temp/codex-clipboard-c8a33e2a-59b8-4e9b-b2d2-19bc1417ca9b.png
Implementation: D:/site-av4/.next/design-check/business-consistent-section.png
Viewport: 1456 × 1450 CSS px; screenshot content width 1441 px. Mobile checked at 390 px.
Replaced the term with «Ручная стройка» in all infographic locations and recorded it in AGENTS.md. Replaced prefab art with /img/cards/panel.png (single wall panel).
Both comparisons now use the same table and header styling, label column, technology columns and vertical separators. Exact x positions are 305.5, 549, 792.5, 1036 in both tables; each column is 243.5 px wide. Both mobile tables use a 650 px internal scroll area, without page overflow.
Typography, spacing, colors and copy follow the previous refinement; four columns stay aligned.
final result: passed

## Card composition revision
Source: user rejection of the split image/text layout, C:/Users/nikit/AppData/Local/Temp/codex-clipboard-a38ee3d6-51f6-4cd6-a75f-1ba87cc11260.png.
Implementation screenshot: D:/site-av4/.next/design-check/business-stacked-cards.png (1152 × 511 crop from a 1345 px viewport).
New sequence is full-width illustration, title, full-width description, metrics. Existing fonts/colors/assets preserved. Desktop title, description and metric rows align exactly across all four cards; no horizontal overflow at 1345 or 320 px. Typecheck and scoped ESLint pass.
final result: passed


## Business benefits bento — 2026-10-12
Source visual: C:/Users/nikit/AppData/Local/Temp/codex-clipboard-d2713cf5-f04a-47df-a24c-0e97cc2fd6c3.png
User overrides: no raster images; static benefit listing without links/buttons; remove additional works and flexible configuration. Existing site heading typography takes precedence over the mockup.
Implementation: D:/site-av4/.next/design-check/benefits-desktop.png
Full-view side-by-side evidence: D:/site-av4/.next/design-check/benefits-comparison.png
Mobile: D:/site-av4/.next/design-check/benefits-mobile.png
Viewport: 1448 x 1100 CSS px, desktop screenshot content 1433 x 898 pixels (scrollbar excluded); source 1448 x 1086 pixels. Density 1, comparison previews scaled proportionally. Mobile 390 x 900 and 320 x 900.
State: /business#partnership-title, no modal.
Comparison history: removed generated images following user steering; removed two cards; removed CTA circles and dialog calls following explicit user correction. Final recapture shows 9 static cards and 0 image, link or button elements in the section.
Typography: existing section heading 24–30px; card titles 20px desktop/18px mobile; copy 14px. No title clipping or word overflow.
Layout: 12-column grid, 4/4/4 first row, 3/6/3 second row, 4/4/4 final row. Uniform 12px gaps and 24px padding. Tablet 2 columns; mobile single column with 20px padding. Wide manufacturing card preserved.
Colors: existing white surface, dark ink and yellow Tabler icon tokens; light/dark alternation follows concept.
Image quality: raster images intentionally omitted by user. Tabler vector icons preserved; no fake image artwork or placeholders.
Copy: all nine remaining benefit texts retained from BUSINESS. Lead corrected to grammatical nominative “поддержка”. Excluded cards absent.
Interactions: static listing, 0 buttons/links as requested. Console error log empty. No horizontal overflow at 1448, 390 or 320px; no card overflow at 320px.
Focused evidence: desktop and mobile captures show fully readable headings/copy and row boundaries; no additional close-up required for this text-only layout.
Findings: no actionable P0/P1/P2 issues within user-approved text-only scope. Removed images, smaller site typography and 9-card layout are explicit requested deviations.
Checks: typecheck, scoped ESLint and diff whitespace check pass.
final result: passed

# Plotloom report-renderer fork

Owned by `Wenjun-Mao/shuohao-skills`, based on upstream commit
`4322897e6d2bdaf66365534fd40194360c75a85f` (Apache-2.0). This branch intentionally
does not adopt upstream's later breaking release.

The bounded corrections are explicit Art `{ cast, lang }` context for validation,
gates and rendering; readable Outline durations and KPI wrapping; and Storyboard
copy derived from frozen limits that describes plans, not executed media jobs.
Art callers must use the current context object, not positional names/language.
Original candidate JSON and validation rules are not rewritten.

The October9 audit also found that non-blocking skipped checks were counted as
executed passes. Gate results now carry explicit `evaluated` metadata. HTML,
Markdown gate rows and CLI summaries distinguish executed/pass/failure/skip
without changing admission, gate IDs or archived report bytes. Storyboard's
total describes all entries combined, not a complete playback route.
The small presentation helper is local to each independently copyable skill;
the focused contract test requires exact helper parity. No cross-skill imports
or old-result compatibility fallback are introduced.

Run each `skills/novel-{outline,characters,art,script,storyboard}/scripts/selftest.mjs`
with Node, then `node scripts/plotloom-report-selftest.mjs`. The latter adds focused
renderer-contract checks. Plotloom separately qualifies its callers, immutable
execution pins and desktop report appearance.
Also run `node scripts/plotloom-gate-presentation-selftest.mjs` for applicability,
counts, localized skipped rows, unchanged admission and CLI checks.

The upstream LICENSE and NOTICE remain included. Changed files carry modification
notices. Historical Plotloom reports remain original evidence; the new pin applies
to new requests and reports, never an automatic rebind of earlier approvals/media.

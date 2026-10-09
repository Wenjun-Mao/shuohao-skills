# Plotloom report-renderer fork

Owned by `Wenjun-Mao/shuohao-skills`, based on upstream commit
`4322897e6d2bdaf66365534fd40194360c75a85f` (Apache-2.0). This branch intentionally
does not adopt upstream's later breaking release.

The bounded corrections are explicit Art `{ cast, lang }` context for validation,
gates and rendering; readable Outline durations and KPI wrapping; and Storyboard
copy derived from frozen limits that describes plans, not executed media jobs.
Art callers must use the current context object, not positional names/language.
Original candidate JSON and validation rules are not rewritten.

Run each `skills/novel-{outline,characters,art,script,storyboard}/scripts/selftest.mjs`
with Node, then `node scripts/plotloom-report-selftest.mjs`. The latter adds focused
renderer-contract checks. Plotloom separately qualifies its callers, immutable
execution pins and desktop report appearance.

The upstream LICENSE and NOTICE remain included. Changed files carry modification
notices. Historical Plotloom reports remain original evidence; the new pin applies
to new requests and reports, never an automatic rebind of earlier approvals/media.

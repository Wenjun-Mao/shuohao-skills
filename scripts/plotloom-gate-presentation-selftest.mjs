#!/usr/bin/env node
// Plotloom-owned evaluated/skip regressions, 2026-10-09; no model/media calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { gateReport as artGates, renderHtml as artHtml, validateArt } from '../skills/novel-art/scripts/novel-art.mjs';
import { gateReport as scriptGates, renderHtml as scriptHtml, validateScript } from '../skills/novel-script/scripts/novel-script.mjs';
import { gateReport as outlineGates, renderHtml as outlineHtml, renderMarkdown as outlineMarkdown, validateOutline } from '../skills/novel-outline/scripts/novel-outline.mjs';
import { gateReport as boardGates, renderHtml as boardHtml, validateStoryboard, loadRecipes } from '../skills/novel-storyboard/scripts/novel-storyboard.mjs';
import { summarizeGates, gateSummaryText } from '../skills/novel-storyboard/scripts/gate-summary.mjs';

const root = new URL('../', import.meta.url);
const fixture = (stage, name) => JSON.parse(readFileSync(new URL(`skills/novel-${stage}/examples/渡口-${name}.json`, root), 'utf8'));
const art = fixture('art', 'art'), cast = fixture('characters', 'cast');
const outline = fixture('outline', 'outline'), script = fixture('script', 'script');
const board = fixture('storyboard', 'storyboard'), ctx = { art, cast, outline, script };
let checked = 0;
const check = (result, reason) => { assert.ok(result, reason); checked++; };
const equals = (actual, expected) => { assert.deepEqual(actual, expected); checked++; };
const gate = (gates, id) => gates.find(g => g.id === id);
const untouched = JSON.stringify({ art, cast, outline, script, board });
const helper = readFileSync(new URL('skills/novel-storyboard/scripts/gate-summary.mjs', root), 'utf8');
for (const stage of ['art', 'script', 'outline']) {
  equals(readFileSync(new URL(`skills/novel-${stage}/scripts/gate-summary.mjs`, root), 'utf8'), helper);
}
assert.throws(() => summarizeGates([{ ok: true }]), TypeError); checked++;
assert.throws(() => summarizeGates([{ ok: false, evaluated: false }]), TypeError); checked++;

equals(summarizeGates(artGates(art)), { executed: 10, passed: 10, failed: 0, skipped: 1 });
check(!gate(artGates(art), 'no-names').evaluated, 'missing Cast is skipped');
check(gate(artGates(art, { cast: { characters: [] } }), 'no-names').evaluated, 'empty provided Cast is evaluated');
equals(validateArt(art), []);
equals(validateArt(art, { cast }), []);
equals(summarizeGates(scriptGates(script)), { executed: 7, passed: 7, failed: 0, skipped: 3 });
equals(summarizeGates(scriptGates(script, ctx)), { executed: 10, passed: 10, failed: 0, skipped: 0 });
equals(validateScript(script), []);
equals(validateScript(script, ctx), []);
const withoutProps = structuredClone(outline); delete withoutProps.props;
check(!gate(outlineGates(withoutProps), 'prop-cap').evaluated, 'absent optional props are skipped');
check(gate(outlineGates(withoutProps), 'refs').evaluated, 'other references are still evaluated');
equals(validateOutline(withoutProps), []);
equals(summarizeGates(boardGates(board, ctx)), { executed: 16, passed: 16, failed: 0, skipped: 1 });
equals(summarizeGates(boardGates(board)), { executed: 10, passed: 10, failed: 0, skipped: 7 });
equals(validateStoryboard(board, ctx), []);
check(gate(boardGates(board, { script, cast: { characters: [] } }), 'prompt-no-names').evaluated, 'empty names context is evaluated');
const bare = structuredClone(board);
for (const ep of bare.episodes) for (const segment of ep.segments) for (const cut of segment.cuts) delete cut.recipe;
const recipes = loadRecipes(fileURLToPath(new URL('skills/novel-storyboard/references/test-fixtures/shot-recipes', root)));
check(gate(boardGates(board, { ...ctx, recipes }), 'shot-recipe').evaluated, 'mounted valid references are evaluated');
equals(validateStoryboard(board, { ...ctx, recipes }), []);
equals(summarizeGates(boardGates(bare, { ...ctx, recipes })), { executed: 17, passed: 17, failed: 0, skipped: 0 });
check(gate(boardGates(bare, { ...ctx, recipes }), 'shot-recipe').evaluated, 'mounted library with no references is evaluated');
const referenced = structuredClone(bare);
referenced.episodes[0].segments[0].cuts[0].recipe = 'no-such-card';
check(!gate(boardGates(referenced, { ...ctx, recipes }), 'shot-recipe').ok, 'invalid recipe still fails');
check(validateStoryboard(referenced, { ...ctx, recipes }).length > 0, 'recipe admission is unchanged');
const failed = structuredClone(bare); failed.episodes[0].segments[0].cuts[0].seconds = 0;
const mixed = summarizeGates(boardGates(failed, ctx));
check(mixed.failed > 0 && mixed.skipped === 1, 'failure and skip stay distinct');
check(validateStoryboard(failed, ctx).length > 0, 'mandatory failure still blocks admission');

for (const lang of ['zh', 'en']) {
  const reports = [
    [artHtml(art, { lang }), artGates(art)],
    [scriptHtml(script, { lang }), scriptGates(script)],
    [outlineHtml(withoutProps, lang), outlineGates(withoutProps)],
    [boardHtml(board, { ...ctx, lang }), boardGates(board, ctx)],
  ];
  for (const [html, gates] of reports) {
    check(html.includes(gateSummaryText(gates, lang)), 'localized badge and summary use actual execution counts');
    check(html.includes('<li class="skip"><span class="m">—</span>'), 'skip row has a neutral marker');
    check(!html.includes(lang === 'en' ? 'treated as passing' : '视为通过'), 'skip is never described as passing');
  }
  const html = boardHtml(board, { ...ctx, lang });
  check(html.includes(lang === 'en' ? 'All entries combined' : '全部条目合计时长'), 'duration is explicitly aggregate');
  check(html.includes(lang === 'en' ? 'not one route' : '非单条路线时长'), 'aggregate is not a playthrough');
  const failHtml = boardHtml(failed, { ...ctx, lang });
  check(failHtml.includes(gateSummaryText(boardGates(failed, ctx), lang)) && failHtml.includes('gatepill fail'), 'failure plus skip is reported');
}
check(outlineMarkdown(withoutProps, 'en').includes('props list not provided'), 'Markdown also explains its skipped check');
const badCli = spawnSync(process.execPath, [
  fileURLToPath(new URL('skills/novel-storyboard/scripts/novel-storyboard.mjs', root)), 'checkup', '/dev/stdin',
  '--script', fileURLToPath(new URL('skills/novel-script/examples/渡口-script.json', root)), '--no-log',
], { encoding: 'utf8', input: JSON.stringify(failed) });
check(badCli.status === 1, 'mandatory CLI failure still blocks admission');
check(badCli.stdout.includes('✗') && badCli.stdout.includes('跳过') && !badCli.stdout.includes('全部通过'), 'CLI failure and skip remain distinct');
for (const [stage, name, extra] of [
  ['art', 'art', []], ['script', 'script', []], ['outline', 'outline', []],
  ['storyboard', 'storyboard', ['--script', fileURLToPath(new URL('skills/novel-script/examples/渡口-script.json', root)), '--no-log']],
]) {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL(`skills/novel-${stage}/scripts/novel-${stage}.mjs`, root)), 'checkup',
    fileURLToPath(new URL(`skills/novel-${stage}/examples/渡口-${name}.json`, root)), ...extra], { encoding: 'utf8' });
  check(result.status === 0, 'valid CLI admission unchanged');
  check(result.stdout.includes('已执行检查') && !result.stdout.includes('全部通过'), 'CLI reports executed checks, not every inventory item');
}
equals(JSON.stringify({ art, cast, outline, script, board }), untouched);
console.log(`✓ ${checked} evaluated-gate presentation checks passed`);

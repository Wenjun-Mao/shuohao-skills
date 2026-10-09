#!/usr/bin/env node
// Plotloom-owned renderer-contract regressions, 2026-10-09. No model or media calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  gateReport as artGates, validateArt, renderHtml as artHtml,
  renderMarkdown as artMarkdown,
} from '../skills/novel-art/scripts/novel-art.mjs';
import {
  gateReport as outlineGates, renderHtml as outlineHtml, renderMarkdown as outlineMarkdown,
} from '../skills/novel-outline/scripts/novel-outline.mjs';
import { formatReportDuration } from '../skills/novel-outline/scripts/report-duration.mjs';
import {
  gateReport as boardGates, renderHtml as boardHtml, renderMarkdown as boardMarkdown,
} from '../skills/novel-storyboard/scripts/novel-storyboard.mjs';

const root = new URL('../', import.meta.url);
const fixture = (stage, name) => JSON.parse(readFileSync(new URL(`skills/novel-${stage}/examples/渡口-${name}.json`, root), 'utf8'));
const art = fixture('art', 'art');
const cast = fixture('characters', 'cast');
const outline = fixture('outline', 'outline');
const board = fixture('storyboard', 'storyboard');
const script = fixture('script', 'script');
const embedded = (html, id) => JSON.parse(html.match(new RegExp(`id="${id}">([\\s\\S]*?)<\\/script>`))[1]);
let checked = 0;
const check = (value, reason) => { assert.ok(value, reason); checked++; };

const artBefore = JSON.stringify(art);
const goodContext = { cast, lang: 'zh' };
check(validateArt(art, goodContext).length === 0, 'valid Art uses Cast context');
check(artGates(art, goodContext).every(g => g.ok), 'valid contextual gates pass');
const goodHtml = artHtml(art, goodContext);
check(!goodHtml.includes('未提供 cast.json'), 'HTML does not falsely skip supplied Cast');
assert.deepEqual(embedded(goodHtml, 'art-data'), art); checked++;
check(JSON.stringify(art) === artBefore, 'Art rendering preserves candidate bytes');
check(artHtml(art).includes('未提供 cast.json'), 'missing Cast is explicitly skipped');
check(!artHtml(art, { cast: { characters: [] } }).includes('未提供 cast.json'), 'empty supplied Cast is not missing context');
check(artHtml(art, { cast: { characters: [] }, lang: 'en' }).includes('no character names to check'), 'empty Cast detail is localized');
check(artMarkdown({ ...art, lang: 'en' }, { lang: 'zh' }).includes('场景清单'), 'explicit language wins');
assert.throws(() => artHtml(art, 'en'), TypeError); checked++;
assert.throws(() => validateArt(art, ['OldPositionalNames']), TypeError); checked++;

const contaminatedCast = { characters: [{ name: 'BannedPerson', aliases: ['BannedAlias'] }] };
const mutations = [
  d => { d.scenes[0].image.prompt += ' BannedPerson'; },
  d => { d.scenes[0].image.sheet += ' BannedAlias'; },
  d => { d.scenes[0].lighting[0].prompt += ' BannedPerson'; },
  d => { d.props[0].states[0].prompt += ' BannedAlias'; },
];
for (const mutate of mutations) {
  const d = structuredClone(art);
  mutate(d);
  const ctx = { cast: contaminatedCast };
  check(!artGates(d, ctx).find(g => g.id === 'no-names').ok, 'contamination gate fails');
  check(validateArt(d, ctx).some(p => p.includes('角色名')), 'validator uses same contextual gate');
  check(artHtml(d, ctx).includes('gatepill fail'), 'renderer does not conceal validation failure');
  assert.deepEqual(embedded(artHtml(d, ctx), 'art-data'), d); checked++;
}
const cli = spawnSync(process.execPath, [
  fileURLToPath(new URL('skills/novel-art/scripts/novel-art.mjs', root)), 'render',
  fileURLToPath(new URL('skills/novel-art/examples/渡口-art.json', root)), '--html', '--cast',
  fileURLToPath(new URL('skills/novel-characters/examples/渡口-cast.json', root)),
], { encoding: 'utf8' });
check(cli.status === 0 && !cli.stdout.includes('未提供 cast.json'), 'CLI passes explicit Cast to rendering');

for (const [input, zh, en] of [
  [1 / 3, '20 秒', '20 s'], [2, '2 分钟', '2 min'],
  [65 / 60, '1 分钟 5 秒', '1 min 5 s'],
  [59.9999 / 60, '1 分钟', '1 min'], [0.00001, '0.001 秒', '0.001 s'],
]) {
  check(formatReportDuration(input, 'zh') === zh, 'readable Chinese duration');
  check(formatReportDuration(input, 'en') === en, 'readable English duration');
}
const fractional = structuredClone(outline);
fractional.params.minutesPerEpisode = 1 / 3;
const originalOutline = JSON.stringify(fractional);
const originalOutlineGates = outlineGates(fractional);
for (const lang of ['zh', 'en']) {
  const html = outlineHtml(fractional, lang);
  check(html.includes(lang === 'zh' ? '20 秒' : '20 s'), 'fractional target is formatted');
  check(html.includes(lang === 'zh' ? '2 分钟' : '2 min'), 'aggregate multiplies raw values before formatting');
  check(outlineMarkdown(fractional, lang).includes(lang === 'zh' ? '20 秒' : '20 s'), 'Markdown uses same duration formatter');
  assert.deepEqual(embedded(html, 'outline-data'), fractional); checked++;
}
check(JSON.stringify(fractional) === originalOutline, 'duration formatting preserves raw JSON');
assert.deepEqual(outlineGates(fractional), originalOutlineGates); checked++;

const alternate = structuredClone(board);
alternate.params = { ...alternate.params, maxSegmentSeconds: 12, minCutSeconds: 1, maxCutSeconds: 8 };
const ctx = { outline, cast, art, script };
const originalBoard = JSON.stringify(alternate);
const originalBoardGates = boardGates(alternate, ctx);
for (const lang of ['zh', 'en']) {
  const html = boardHtml(alternate, { ...ctx, lang });
  const md = boardMarkdown(alternate, { ...ctx, lang });
  for (const report of [html, md]) {
    check(report.includes(lang === 'zh' ? '单段上限 12 秒' : 'segments capped at 12s'), 'frozen cap appears');
    check(report.includes(lang === 'zh' ? '分镜 1–8 秒' : 'cuts 1–8s'), 'frozen cut range appears');
    check(report.includes(lang === 'zh' ? '不证明执行完成' : 'does not prove execution'), 'plan is not execution evidence');
    check(!report.includes('尚未派发') && !report.includes('not dispatched'), 'renderer does not infer undispatched state either');
    check(!report.includes('≤15') && !report.includes('a 2–5s edit'), 'hardcoded colophon is absent');
  }
  assert.deepEqual(embedded(html, 'storyboard-data'), alternate); checked++;
}
check(JSON.stringify(alternate) === originalBoard, 'planning copy preserves board JSON');
assert.deepEqual(boardGates(alternate, ctx), originalBoardGates); checked++;
console.log(`✓ ${checked} Plotloom renderer-contract checks passed`);

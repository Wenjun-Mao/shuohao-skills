#!/usr/bin/env node
// Plotloom-owned deterministic desktop QA artifacts, 2026-10-09.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHtml as artHtml } from '../skills/novel-art/scripts/novel-art.mjs';
import { renderHtml as outlineHtml } from '../skills/novel-outline/scripts/novel-outline.mjs';
import { renderHtml as boardHtml } from '../skills/novel-storyboard/scripts/novel-storyboard.mjs';

const output = resolve(process.argv[2] ?? 'output/playwright/plotloom-reports');
mkdirSync(output, { recursive: true });
const root = new URL('../', import.meta.url);
const fixture = (stage, name) => JSON.parse(readFileSync(new URL(`skills/novel-${stage}/examples/渡口-${name}.json`, root), 'utf8'));
const art = fixture('art', 'art'), cast = fixture('characters', 'cast');
const outline = fixture('outline', 'outline'), board = fixture('storyboard', 'storyboard');
const script = fixture('script', 'script');
outline.params.minutesPerEpisode = 1 / 3;
board.params = { ...board.params, maxSegmentSeconds: 12, minCutSeconds: 1, maxCutSeconds: 8 };
for (const lang of ['zh', 'en']) {
  for (const [name, html] of [
    ['outline', outlineHtml(outline, lang)],
    ['art', artHtml(art, { cast, lang })],
    ['storyboard', boardHtml(board, { outline, cast, art, script, lang })],
  ]) writeFileSync(resolve(output, `${name}-${lang}.html`), html);
}
console.log(`Generated deterministic renderer QA reports in ${output}`);

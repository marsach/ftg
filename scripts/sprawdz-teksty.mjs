#!/usr/bin/env node
/**
 * npm run teksty — sprawdza dialogi każdego poziomu w src/levels/<poziom>/:
 *
 *   ✗ brakujące klucze   kod woła say('x') / objective('x'), a w .txt nie ma [x]
 *   ⚠ nieużywane bloki    [x] jest w .txt, ale nikt go nie woła
 *   ⚠ nieznane postacie   „kto:” spoza postacie.json
 *   ⚠ powtórzone klucze, długie kwestie, bloki z opcjami bez obsługi wyboru
 *
 * Kod wyjścia 1, gdy są błędy (np. do CI).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseScript } from '../src/story/scriptFormat.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const levelsDir = join(root, 'src', 'levels');
const MAX_LINE = 200;

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

let errors = 0;
let warnings = 0;

for (const level of readdirSync(levelsDir)) {
  const dir = join(levelsDir, level);
  if (!statSync(dir).isDirectory()) continue;
  const files = readdirSync(dir);
  const txt = files.filter((f) => f.endsWith('.txt'));
  if (!txt.length) continue;

  console.log(`\n▸ ${level}`);
  const speakers = Object.keys(JSON.parse(readFileSync(join(dir, 'postacie.json'), 'utf8')));
  const blocks = new Map();
  for (const f of txt) {
    const { blocks: b, warnings: w } = parseScript(readFileSync(join(dir, f), 'utf8'), speakers);
    for (const x of w) {
      warnings++;
      console.log(yellow(`  ⚠ ${f}:${x.line}  ${x.message}`));
    }
    for (const [k, v] of b) blocks.set(k, { ...v, file: f });
  }

  // klucze używane w kodzie poziomu: say('…'), objective('…'), także w wyrażeniach warunkowych
  const used = new Map();
  for (const f of files.filter((f) => f.endsWith('.ts'))) {
    const code = readFileSync(join(dir, f), 'utf8');
    for (const call of code.matchAll(/\.(say|objective)\(([^)]*)\)/g)) {
      const line = code.slice(0, call.index).split('\n').length;
      for (const lit of call[2].matchAll(/'([^']+)'|"([^"]+)"|`([^`$]+)`/g)) {
        const key = lit[1] ?? lit[2] ?? lit[3];
        if (!used.has(key)) used.set(key, []);
        used.get(key).push({ file: f, line, fn: call[1] });
      }
    }
  }

  for (const [key, refs] of used) {
    if (!blocks.has(key)) {
      errors++;
      for (const r of refs) console.log(red(`  ✗ ${r.file}:${r.line}  brak bloku [${key}]`));
    }
  }
  for (const [key, b] of blocks) {
    if (!used.has(key)) {
      warnings++;
      console.log(yellow(`  ⚠ ${b.file}:${b.line}  nieużywany blok [${key}]`));
    }
    for (const l of b.lines)
      if (l.text.length > MAX_LINE) {
        warnings++;
        console.log(yellow(`  ⚠ ${b.file}:${b.line}  [${key}] kwestia ${l.who} ma ${l.text.length} znaków (max ${MAX_LINE}), podziel ją`));
      }
    if (used.get(key)?.some((r) => r.fn === 'objective') && (b.lines.length || !b.text))
      console.log(yellow(`  ⚠ ${b.file}:${b.line}  [${key}] jest użyty jako cel, ale nie jest blokiem jednowierszowym`)), warnings++;
  }

  const lines = [...blocks.values()].reduce((n, b) => n + b.lines.length, 0);
  const choices = [...blocks.values()].reduce((n, b) => n + b.choices.length, 0);
  console.log(dim(`  ${blocks.size} bloków · ${lines} kwestii · ${choices} opcji · ${used.size} kluczy w kodzie · ${relative(root, dir)}`));
}

console.log(errors ? red(`\n${errors} błędów, ${warnings} ostrzeżeń`) : green(`\nOK · ${warnings} ostrzeżeń`));
process.exit(errors ? 1 : 0);

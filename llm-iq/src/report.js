import { wilson, sparkline } from './stats.js';

const C = process.stdout.isTTY
  ? { g: '\x1b[32m', y: '\x1b[33m', r: '\x1b[31m', b: '\x1b[1m', d: '\x1b[2m', x: '\x1b[0m' }
  : { g: '', y: '', r: '', b: '', d: '', x: '' };

// One line per category: rung icons ordered by level, plus the frontier
// (highest level with every sample correct, provided all lower tested
// levels also held).
function ladderLines(rungs) {
  const byCat = new Map();
  for (const r of rungs) {
    if (!byCat.has(r.cat)) byCat.set(r.cat, []);
    byCat.get(r.cat).push(r);
  }
  const catW = Math.max(...[...byCat.keys()].map((c) => c.length));
  const lines = [];
  for (const [cat, list] of byCat) {
    list.sort((a, b) => a.level - b.level);
    let frontier = -1;
    let unbroken = true;
    const cells = list.map((r) => {
      const full = r.correct === r.n;
      const none = r.correct === 0;
      if (full && unbroken) frontier = r.level;
      if (!full) unbroken = false;
      const icon = full ? `${C.g}✓${C.x}` : none ? `${C.r}✗${C.x}` : `${C.y}±${C.x}`;
      return `L${r.level}${icon}`;
    });
    const frontierNote =
      list.length > 1
        ? frontier === list[list.length - 1].level
          ? `  ${C.d}frontier: beyond L${frontier}${C.x}`
          : `  ${C.d}frontier: ${frontier < 0 ? 'below ' + 'L' + list[0].level : 'L' + frontier}${C.x}`
        : '';
    lines.push(`  ${cat.padEnd(catW)}  ${cells.join(' ')}${frontierNote}`);
  }
  return lines;
}

export function renderReport(entry, assessment, priorScores, baselineModels) {
  const lines = [];
  lines.push('');
  lines.push(
    `${C.b}llm-iq${C.x} ${C.d}·${C.x} bench v${entry.bench} ${C.d}·${C.x} seed ${entry.seed} ${C.d}·${C.x} ` +
      `${entry.profile} (${entry.n} answers)`
  );
  lines.push(
    `adapter ${entry.adapter}` +
      (entry.model ? ` ${C.d}·${C.x} model ${entry.model}` : '') +
      ` ${C.d}·${C.x} ${(entry.durationMs / 1000).toFixed(0)}s` +
      (entry.costUsd ? ` ${C.d}·${C.x} $${entry.costUsd.toFixed(2)}` : '')
  );
  lines.push('');
  lines.push(...ladderLines(entry.rungs || []));

  const [lo, hi] = wilson(entry.correct, entry.n);
  lines.push('');
  lines.push(
    `  ${C.b}SCORE ${entry.score.toFixed(1)}${C.x}  ` +
      `${C.d}(level-weighted · ${entry.correct}/${entry.n} correct · raw 95% CI ` +
      `${(lo * 100).toFixed(0)}-${(hi * 100).toFixed(0)})${C.x}`
  );
  if (entry.effortSelfReport) {
    lines.push(`  ${C.d}self-reported effort: ${entry.effortSelfReport} (unverified)${C.x}`);
  }
  if (entry.formatFails) lines.push(`  ${C.y}format failures: ${entry.formatFails}${C.x} ${C.d}(answer tags missing)${C.x}`);
  if (entry.errors) lines.push(`  ${C.r}errors: ${entry.errors}${C.x} ${C.d}(counted as wrong)${C.x}`);
  lines.push('');

  if (assessment.status === 'insufficient') {
    lines.push(
      `  baseline: ${assessment.n}/${assessment.needed} runs recorded — ` +
        `run this a few more times (different days/hours) to enable degradation detection.`
    );
  } else {
    lines.push(
      `  baseline: ${assessment.mean.toFixed(1)} ± ${assessment.sd.toFixed(1)} ` +
        `${C.d}(last ${assessment.n} runs, same adapter/profile/bench)${C.x}`
    );
    if (baselineModels.length && entry.model && !baselineModels.includes(entry.model)) {
      lines.push(`  ${C.y}note: model changed — baseline was ${baselineModels.join(', ')}${C.x}`);
    }
    const z = assessment.z.toFixed(2);
    if (assessment.status === 'degraded') {
      lines.push(`  ${C.r}${C.b}🔻 SIGNIFICANT DEGRADATION${C.x} ${C.d}(z = ${z})${C.x}`);
    } else if (assessment.status === 'warn') {
      lines.push(`  ${C.y}⚠ below baseline, not yet significant${C.x} ${C.d}(z = ${z})${C.x}`);
    } else {
      lines.push(`  ${C.g}✓ no significant degradation${C.x} ${C.d}(z = ${z})${C.x}`);
    }
  }

  if (priorScores.length >= 2) {
    const recent = priorScores.slice(-12);
    lines.push(`  history: ${sparkline([...recent, entry.score])} ${C.d}(oldest → this run)${C.x}`);
  }
  lines.push('');
  return lines.join('\n');
}

export function renderHistory(entries) {
  if (!entries.length) return 'no runs recorded yet';
  const lines = [`${C.b}date                adapter       profile   model                          score${C.x}`];
  for (const e of entries.slice(-20)) {
    lines.push(
      `${e.ts.slice(0, 16).replace('T', ' ').padEnd(19)} ${e.adapter.padEnd(13)} ` +
        `${e.profile.padEnd(9)} ${(e.model || '-').padEnd(30)} ${e.score.toFixed(1)}`
    );
  }
  return lines.join('\n');
}

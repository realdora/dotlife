// Difficulty calibration harness: runs K questions per category against a
// real adapter and prints per-category accuracy plus every miss (expected
// vs got). Target band per category for the reference top model: 40-70%.
//
// usage: node scripts/calibrate.js [--model id] [--per-cat 6] [--seed-base cal]
//        [--concurrency 4] [--categories a,b,c]

import { GENERATORS } from '../src/generators/index.js';
import { makeRng } from '../src/rng.js';
import { ANSWER_INSTRUCTIONS } from '../src/suite.js';
import { extractAnswer } from '../src/answer.js';
import { claudeCodeAdapter } from '../src/adapters/claude-code.js';
import { BENCH_VERSION } from '../src/version.js';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};

const model = opt('--model');
const perCat = Number(opt('--per-cat', 6));
const seedBase = opt('--seed-base', 'cal');
const concurrency = Number(opt('--concurrency', 4));
const cats = opt('--categories', Object.keys(GENERATORS).join(',')).split(',');
// Simulate an effort cut ("artificial nerf") via Claude Code's thinking
// budget: --thinking 0 disables extended thinking entirely.
const thinking = opt('--thinking');
// Or via the CLI's own effort control: --effort low|medium|high.
const effort = opt('--effort');

const questions = [];
for (const cat of cats) {
  for (let i = 0; i < perCat; i++) {
    const rng = makeRng(`v${BENCH_VERSION}:${seedBase}:${cat}:${i}`);
    questions.push(GENERATORS[cat](rng, `${cat}-${i + 1}`));
  }
}

const adapter = claudeCodeAdapter({
  ...(model ? { model } : {}),
  ...(effort ? { effort } : {}),
  ...(thinking !== undefined ? { env: { MAX_THINKING_TOKENS: String(thinking) } } : {}),
});
console.error(
  `calibrating bench v${BENCH_VERSION} · ${questions.length} questions · adapter ${adapter.name}` +
    `${model ? ` · model ${model}` : ''}${effort ? ` · effort ${effort}` : ''}` +
    `${thinking !== undefined ? ` · MAX_THINKING_TOKENS=${thinking}` : ''}`
);

async function pool(items, limit, fn) {
  const res = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        res[i] = await fn(items[i]);
      }
    })
  );
  return res;
}

let done = 0;
const results = await pool(questions, concurrency, async (q) => {
  let r;
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await new Promise((res) => setTimeout(res, 2000 * 2 ** (attempt - 1)));
    try {
      r = await adapter.run(q.prompt + '\n\n' + ANSWER_INSTRUCTIONS, q, { timeoutMs: 300000 });
      lastErr = undefined;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  done++;
  if (lastErr) {
    console.error(`  [${done}/${questions.length}] ${q.id} ERROR ${String(lastErr.message || lastErr).slice(0, 100)}`);
    return { q, error: true };
  }
  const got = extractAnswer(r.text).value;
  const correct = q.check(got);
  console.error(`  [${done}/${questions.length}] ${q.id.padEnd(13)} ${correct ? '✓' : '✗'} ${(r.durationMs / 1000).toFixed(1)}s ${r.model || ''}`);
  return { q, correct, got, costUsd: r.costUsd || 0 };
});

console.log(`\ncategory      acc     misses`);
for (const cat of cats) {
  const rs = results.filter((r) => r.q.category === cat);
  const ok = rs.filter((r) => r.correct).length;
  console.log(`${cat.padEnd(13)} ${ok}/${rs.length}`);
}
const misses = results.filter((r) => !r.correct && !r.error);
if (misses.length) {
  console.log(`\nmisses:`);
  for (const m of misses) {
    console.log(`  ${m.q.id}: expected ${JSON.stringify(m.q.answer).slice(0, 60)} got ${JSON.stringify(m.got).slice(0, 60)}`);
  }
}
const errs = results.filter((r) => r.error).length;
if (errs) console.log(`\nerrors (excluded): ${errs}`);
const cost = results.reduce((a, r) => a + (r.costUsd || 0), 0);
console.log(`\ntotal cost: $${cost.toFixed(2)}`);

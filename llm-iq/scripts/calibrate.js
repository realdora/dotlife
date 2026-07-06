// Ladder calibration harness: runs a full profile against a real adapter
// and prints per-rung accuracy plus every miss (expected vs got). Used to
// verify the ladder discriminates between model tiers / effort levels.
//
// usage: node scripts/calibrate.js [--adapter claude|codex|...] [--model id]
//        [--effort low|medium|high] [--profile standard] [--seed cal]
//        [--concurrency 4] [--thinking N]

import { buildSuite, ANSWER_INSTRUCTIONS } from '../src/suite.js';
import { extractAnswer } from '../src/answer.js';
import { makeAdapter } from '../src/adapters/index.js';
import { claudeCodeAdapter } from '../src/adapters/claude-code.js';
import { BENCH_VERSION } from '../src/version.js';

const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : dflt;
};

const adapterName = opt('--adapter', 'claude');
const model = opt('--model');
const effort = opt('--effort');
const thinking = opt('--thinking');
const profile = opt('--profile', 'standard');
const seed = opt('--seed', 'cal');
const concurrency = Number(opt('--concurrency', 4));

const questions = buildSuite(seed, profile);

// --thinking is a claude-only env override; everything else goes
// through the shared adapter registry.
const adapter =
  thinking !== undefined
    ? claudeCodeAdapter({
        ...(model ? { model } : {}),
        ...(effort ? { effort } : {}),
        env: { MAX_THINKING_TOKENS: String(thinking) },
      })
    : makeAdapter({ adapter: adapterName, model, effort });
console.error(
  `calibrating bench v${BENCH_VERSION} · ${profile} (${questions.length} questions) · adapter ${adapter.name}` +
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
  console.error(`  [${done}/${questions.length}] ${q.id.padEnd(16)} ${correct ? '✓' : '✗'} ${(r.durationMs / 1000).toFixed(1)}s ${r.model || ''}`);
  return { q, correct, got, costUsd: r.costUsd || 0 };
});

console.log(`\nrung              acc`);
for (const q of questions) {
  const r = results.find((x) => x.q.id === q.id);
  const mark = r.error ? 'ERR' : r.correct ? '✓' : '✗';
  console.log(`${q.id.padEnd(17)} ${mark}`);
}
const ok = results.filter((r) => r.correct).length;
console.log(`\ntotal: ${ok}/${results.length}`);
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

import { buildSuite, PROFILES, ANSWER_INSTRUCTIONS } from './suite.js';
import { extractAnswer } from './answer.js';
import { claudeCodeAdapter } from './adapters/claude-code.js';
import { anthropicApiAdapter } from './adapters/anthropic-api.js';
import { mockAdapter } from './adapters/mock.js';
import { loadHistory, appendHistory } from './history.js';
import { assessAgainstBaseline } from './stats.js';
import { renderReport, renderHistory } from './report.js';
import { BENCH_VERSION, TOOL_VERSION } from './version.js';

const HELP = `llm-iq v${TOOL_VERSION} — one-command IQ check for your LLM coding agent

usage: llm-iq [options]

options:
  --adapter <name>       claude | api | mock   (default: claude)
  --model <id>           force a model (claude: passed to CLI; api: model id)
  --quick                small suite (~12 questions, no retrieval)
  --profile <name>       ${Object.keys(PROFILES).join(' | ')}   (default: standard)
  --seed <str>           question seed (default: today's UTC date — everyone
                         running the same day gets comparable questions)
  --samples <n>          repetitions per question (default: 1)
  --concurrency <n>      parallel requests (default: 4)
  --timeout <sec>        per-question timeout (default: 240)
  --mock-accuracy <p>    mock adapter accuracy 0..1 (default: 0.8)
  --dry-run              print generated questions + expected answers, don't run
  --history              print recorded run history and exit
  --json                 machine-readable result on stdout
  --no-save              don't record this run in history
  -h, --help             this help

Scores are only meaningful against your own baseline: run it daily for a
week, then the verdict line starts telling you whether today is an outlier.`;

function parseArgs(argv) {
  const o = {
    adapter: 'claude',
    profile: 'standard',
    samples: 1,
    concurrency: 4,
    timeout: 240,
    mockAccuracy: 0.8,
    save: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--adapter': o.adapter = argv[++i]; break;
      case '--model': o.model = argv[++i]; break;
      case '--quick': o.profile = 'quick'; break;
      case '--profile': o.profile = argv[++i]; break;
      case '--seed': o.seed = argv[++i]; break;
      case '--samples': o.samples = Math.max(1, Number(argv[++i]) || 1); break;
      case '--concurrency': o.concurrency = Math.max(1, Number(argv[++i]) || 4); break;
      case '--timeout': o.timeout = Math.max(10, Number(argv[++i]) || 240); break;
      case '--mock-accuracy': o.mockAccuracy = Number(argv[++i]); break;
      case '--dry-run': o.dryRun = true; break;
      case '--history': o.showHistory = true; break;
      case '--json': o.json = true; break;
      case '--no-save': o.save = false; break;
      case '-h': case '--help': o.help = true; break;
      default: throw new Error(`unknown flag: ${a} (see --help)`);
    }
  }
  return o;
}

function makeAdapter(o) {
  switch (o.adapter) {
    case 'claude': return claudeCodeAdapter({ model: o.model });
    case 'api': return anthropicApiAdapter(o.model ? { model: o.model } : {});
    case 'mock': return mockAdapter({ accuracy: o.mockAccuracy });
    default: throw new Error(`unknown adapter: ${o.adapter} (use claude | api | mock)`);
  }
}

async function pool(items, limit, fn) {
  const res = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        res[i] = await fn(items[i], i);
      }
    })
  );
  return res;
}

function mode(values) {
  const freq = new Map();
  for (const v of values) if (v) freq.set(v, (freq.get(v) || 0) + 1);
  let best;
  let bestN = 0;
  for (const [v, n] of freq) if (n > bestN) { best = v; bestN = n; }
  return best;
}

export async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) { console.log(HELP); return; }
  if (opts.showHistory) { console.log(renderHistory(loadHistory())); return; }

  const seed = opts.seed || new Date().toISOString().slice(0, 10);
  const suite = buildSuite(seed, opts.profile);

  if (opts.dryRun) {
    for (const q of suite) {
      console.log(`─── ${q.id} ${'─'.repeat(Math.max(1, 60 - q.id.length))}`);
      console.log(q.prompt);
      console.log(`\n→ expected: ${JSON.stringify(q.answer)}\n`);
    }
    console.log(`${suite.length} questions · seed ${seed} · bench v${BENCH_VERSION}`);
    return;
  }

  const adapter = makeAdapter(opts);
  const log = (...a) => console.error(...a);

  const estTokens = Math.round(suite.reduce((a, q) => a + q.prompt.length, 0) / 4) * opts.samples;
  log(`llm-iq v${TOOL_VERSION} · bench v${BENCH_VERSION} · seed ${seed} · ${opts.profile} ` +
    `(${suite.length} questions × ${opts.samples})`);
  log(`adapter ${adapter.name}${opts.model ? ` · model ${opts.model}` : ''} · ` +
    `~${estTokens.toLocaleString()} input tokens + model output\n`);

  const tasks = [];
  for (const q of suite) for (let s = 0; s < opts.samples; s++) tasks.push(q);

  const t0 = Date.now();
  let done = 0;
  const RETRIES = 2; // transient adapter errors must not pollute the score
  const results = await pool(tasks, opts.concurrency, async (q) => {
    let r;
    let lastErr;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      if (attempt) await new Promise((res) => setTimeout(res, 2000 * 2 ** (attempt - 1)));
      try {
        r = await adapter.run(q.prompt + '\n\n' + ANSWER_INSTRUCTIONS, q, { timeoutMs: opts.timeout * 1000 });
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt < RETRIES) log(`  ${q.id.padEnd(13)} retrying (${String(e.message || e).slice(0, 80)})`);
      }
    }
    if (lastErr) {
      done++;
      log(`  [${done}/${tasks.length}] ${q.id.padEnd(13)} ✗ error: ${String(lastErr.message || lastErr).slice(0, 120)}`);
      return { q, error: String(lastErr.message || lastErr) };
    }
    const ex = extractAnswer(r.text);
    const correct = ex.value ? q.check(ex.value) : false;
    done++;
    log(`  [${done}/${tasks.length}] ${q.id.padEnd(13)} ${correct ? '✓' : '✗'} ${(r.durationMs / 1000).toFixed(1)}s`);
    return { q, correct, formatOk: ex.ok, model: r.model, costUsd: r.costUsd };
  });

  const categories = {};
  for (const r of results) {
    const c = (categories[r.q.category] ||= { n: 0, correct: 0 });
    c.n++;
    if (r.correct) c.correct++;
  }
  const correct = results.filter((r) => r.correct).length;
  const costUsd = results.reduce((a, r) => a + (r.costUsd || 0), 0) || undefined;

  const entry = {
    ts: new Date().toISOString(),
    bench: BENCH_VERSION,
    tool: TOOL_VERSION,
    adapter: adapter.name,
    model: mode(results.map((r) => r.model)),
    profile: opts.profile,
    seed,
    samples: opts.samples,
    n: results.length,
    correct,
    score: Number(((100 * correct) / results.length).toFixed(1)),
    errors: results.filter((r) => r.error).length,
    formatFails: results.filter((r) => !r.error && !r.formatOk).length,
    categories,
    durationMs: Date.now() - t0,
    costUsd,
  };

  // Baseline = prior runs with the same bench version, adapter and profile.
  const prior = loadHistory().filter(
    (h) => h.bench === BENCH_VERSION && h.adapter === entry.adapter && h.profile === entry.profile
  );
  const assessment = assessAgainstBaseline(entry.score, prior.map((h) => h.score));
  const baselineModels = [...new Set(prior.slice(-10).map((h) => h.model).filter(Boolean))];

  if (opts.save) appendHistory(entry);

  if (opts.json) {
    console.log(JSON.stringify({ entry, assessment }, null, 2));
  } else {
    console.log(renderReport(entry, assessment, prior.map((h) => h.score), baselineModels));
  }
}

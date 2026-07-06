# llm-iq

One-command IQ check for your LLM coding agent. Detects silent degradation
("did they nerf it?") by running a seeded, dynamically generated benchmark
through the **actual product pipeline** you use — not the raw API — and
comparing today's score against your own rolling baseline.

```
$ llm-iq

  arithmetic    6/6   ████████████
  ordering      5/5   ████████████
  code          5/6   ██████████░░
  transform     4/5   ██████████░░
  format        5/5   ████████████
  retrieval     2/2   ████████████

  SCORE 93.1  (27/29 correct · 95% CI 78-98)

  baseline: 91.2 ± 3.4 (last 14 runs, same adapter/profile/bench)
  ✓ no significant degradation (z = 0.55)
  history: ▅▆▅█▆▅▇ (oldest → this run)
```

## Why this exists

Public leaderboards test the raw API, on their schedule, with their account.
But perceived "nerfing" usually lives in the product layer — model routing,
effort settings, system-prompt changes, load-based degradation — and it can
be per-account, per-region, per-hour. The only way to know whether *your*
agent got dumber is to benchmark *your* entry point, repeatedly, and do the
statistics honestly.

## How it works

- **Dynamic questions, fixed difficulty.** Questions are generated from
  parameterized templates with a seed derived from today's UTC date, so the
  content changes daily (no contamination, nothing to memorize) while the
  difficulty distribution stays constant. Everyone running on the same day
  gets comparable questions.
- **Deterministic grading.** Every answer is checked programmatically
  (exact values, executed code, mechanical constraints). No LLM judge.
- **Product-pipeline measurement.** The default adapter runs each question
  through `claude -p` headless mode, consuming your own subscription quota
  and capturing the *actually used* model ID — silent model switches show
  up in the report.
- **Baseline, not vibes.** A single run is a binomial sample with a wide
  confidence interval. The verdict line only claims degradation when
  today's score falls significantly (z < −2) below your own rolling
  baseline of previous runs with the same setup.

Question categories: multi-step arithmetic, transitive-ordering logic,
predict-the-code-output (ground truth via local execution), sequential
string transformations, multi-constraint instruction following, and
needle-in-a-haystack retrieval.

## Install & run

Requires Node ≥ 18 and (for the default adapter) an authenticated
[Claude Code](https://claude.com/claude-code) CLI.

```sh
npm install -g .        # from this directory; npm registry publish TBD
llm-iq                  # full suite (29 questions) through claude -p
llm-iq --quick          # 12 questions, faster/cheaper
llm-iq --adapter api    # raw Anthropic API instead (needs ANTHROPIC_API_KEY)
llm-iq --history        # your recorded runs
llm-iq --dry-run        # inspect today's generated questions + answers
llm-iq --help           # everything else
```

A run consumes your subscription quota (or API credits): roughly one short
request per question. Estimated input tokens are printed before starting;
actual cost is printed after, when the adapter reports it.

To build a useful baseline, run it once a day (or morning/evening) for a
week. Before ~5 runs the tool refuses to issue a verdict — a single low
score is noise, not evidence.

## Privacy

Everything is local. Questions are generated on your machine, graded on
your machine, and results are stored in `~/.llm-iq/history.jsonl` (scores
and run metadata only — never prompts, never model output, never anything
from your codebase). Zero npm dependencies, so the code you audit is the
code that runs.

## Honest caveats

- A ceiling effect is real: if your model scores ~100 on the current
  difficulty, mild degradation is invisible. Difficulty calibration
  (targeting a 40–70% baseline band per category) is the top roadmap item.
- Scores are only comparable within the same bench version, adapter, and
  profile. The tool enforces this when computing baselines.
- Degradation is often intermittent and load-dependent; a daily sample can
  miss it. Run more often (`--samples 2`, or a cron) when you suspect
  something.

## Roadmap

- Difficulty calibration against effort levels (an artificial, controllable
  "nerf" — the perfect validation target)
- Codex CLI adapter (`codex exec`), OpenAI-compatible API adapter
- Opt-in anonymous score aggregation ("is it just me, or is everyone's
  score down today?") — strictly opt-in, payload shown before upload,
  server-side IP discarded
- Long-context profile, npm publish

## Development

```sh
npm test                              # generator determinism + checker self-tests
node bin/llm-iq.js --adapter mock     # end-to-end without spending anything
LLM_IQ_HOME=/tmp/iq node bin/llm-iq.js --adapter mock --quick   # isolated history
```

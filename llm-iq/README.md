# llm-iq

One-command IQ check for your LLM coding agent. Detects silent degradation
("did they nerf it?") by running a seeded, dynamically generated benchmark
through the **actual product pipeline** you use — not the raw API — and
comparing today's result against your own rolling baseline.

```
$ llm-iq

  sanity      L0✓
  arithmetic  L0✓ L1✓ L2✓ L3✓ L4✗ L5✗  frontier: L3
  counting    L0✓ L1✓ L2✓ L3✓ L4✗ L5✗  frontier: L3
  code        L0✓ L1✓ L2✓ L3✓ L4✓ L5✗  frontier: L4
  transform   L0✓ L1✓ L2✓ L3✓ L4✗ L5✗  frontier: L3
  ordering    L0✓ L2✓ L4✓              frontier: beyond L4
  format      L1✓ L3✓ L5✓              frontier: beyond L5
  retrieval   L1✓ L3✓                  frontier: beyond L3

  SCORE 78.4  (level-weighted · 27/34 correct)
  self-reported effort: high (unverified)

  baseline: 80.1 ± 3.2 (last 14 runs, same adapter/profile/bench)
  ✓ no significant degradation (z = -0.53)
  history: ▅▆▅█▆▅▇ (oldest → this run)
```

## Why this exists

Public leaderboards test the raw API, on their schedule, with their account.
But perceived "nerfing" usually lives in the product layer — model routing,
effort settings, system-prompt changes, load-based degradation — and it can
be per-account, per-region, per-hour. The only way to know whether *your*
agent got dumber is to benchmark *your* entry point, repeatedly, and do the
statistics honestly. The target user runs a top-tier model daily and wants
one glance each morning: is it still itself today?

## How it works

**Difficulty ladders, not a fixed difficulty.** Every category spans six
levels: L0 is the viral tier everyone tests by hand ("how many r's in
strawberry", walk-or-drive-50-meters trick questions), L5 is beyond the
current frontier (we verified: Claude's top model at full effort misses
rungs at L4-L5). The report shows **where each category breaks**. This is
what makes the bank future-proof: when models improve, their frontier just
climbs an existing ladder — no re-tuning, scores stay comparable within a
bench version. We learned this the hard way: three single-band versions
were each saturated by the top model within a day of tuning.

- **Dynamic questions, fixed difficulty.** Questions are generated from
  parameterized templates seeded with today's UTC date: content changes
  daily (no contamination), difficulty distribution doesn't, and everyone
  running the same day gets comparable questions. (The L0 sanity tier is
  deliberately static — its job is to be the questions everyone knows.)
- **Deterministic grading.** Exact values, locally executed code, brute-
  force-verified unique puzzle solutions, mechanical constraint checks.
  No LLM judge.
- **Product-pipeline measurement.** The default adapter runs questions
  through `claude -p` headless mode, consuming your own subscription
  quota and capturing the *actually used* model ID — during calibration
  we watched requests get silently routed to a different model, and the
  report surfaces exactly that. An effort self-report probe is included
  as an (unverified) diagnostic.
- **Baseline, not vibes.** A single run is a noisy sample. The verdict
  line only claims degradation when today's weighted score falls
  significantly (z < −2) below your own rolling baseline.

Categories: trick-question sanity checks, multi-step arithmetic,
logic-grid ordering puzzles, predict-the-code-output, sequential string
transforms, multi-constraint instruction following, exact counting, and
multi-hop needle-in-haystack retrieval.

## Install & run

Requires Node ≥ 18 and (for the default adapter) an authenticated
[Claude Code](https://claude.com/claude-code) CLI.

```sh
npm install -g .        # from this directory; npm registry publish TBD
llm-iq                  # full ladder (34 questions) through claude -p
llm-iq --quick          # 13 questions, faster/cheaper
llm-iq --adapter api    # raw Anthropic API instead (needs ANTHROPIC_API_KEY)
llm-iq --history        # your recorded runs
llm-iq --dry-run        # inspect today's generated questions + answers
llm-iq --help           # everything else
```

A run consumes your subscription quota (or API credits): roughly one short
request per question, a few minutes wall-clock. If you're near your usage
limit, use `--quick` or wait for the reset — errors are retried but a
rate-limited run is a wasted run.

To build a useful baseline, run it once a day for a week. Before ~5 runs
the tool refuses to issue a verdict — a single low score is noise, not
evidence.

## Morning-ritual setups

The CLI is the engine; wrap it however you'll actually see it:

- **Menu bar (macOS)** — `tools/swiftbar/llm-iq.15m.sh` is a
  [SwiftBar](https://github.com/swiftbar/SwiftBar)/xbar plugin that shows
  the latest verdict (🧠 82 / ⚠️ / 🔻) in your menu bar. It only reads
  local history (zero quota), with a "Run benchmark now" click action.
- **Scheduled runs** — cron/launchd `llm-iq --quick` each morning keeps
  the menu bar current without you remembering anything.
- **MCP server** — planned: expose `run_benchmark` / `latest_verdict`
  tools so any MCP client can ask "is my model degraded today?".

## Privacy

Everything is local. Questions are generated on your machine, graded on
your machine, and results are stored in `~/.llm-iq/history.jsonl` (scores
and run metadata only — never prompts, never model output, never anything
from your codebase). Zero npm dependencies, so the code you audit is the
code that runs.

## Honest caveats

- The self-reported effort probe is a hint, not ground truth — models can
  be wrong about their own configuration.
- Scores are only comparable within the same bench version, adapter, and
  profile. The tool enforces this when computing baselines.
- Degradation is often intermittent and load-dependent; a daily sample can
  miss it. Run more often (`--samples 2`, or a cron) when you suspect
  something.

## Calibration status (bench v5)

Measured via `scripts/calibrate.js` on Claude Code:

- Fable 5 (top tier): saturated the single-band v2-v4 predecessors up to
  97-100%; v5 adds L4-L5 rungs sized beyond that (first confirmed v4-scale
  miss: charcode string task).
- Sonnet 5 / Haiku 4.5 tier gradient re-run pending (previous attempt hit
  a subscription usage window).

## Roadmap

- Tier-gradient validation of v5 rungs (fable/sonnet/haiku + effort levels)
- Codex CLI adapter (`codex exec`), OpenAI-compatible API adapter
- MCP server wrapper
- Opt-in anonymous score aggregation ("is it just me, or is everyone's
  score down today?") — strictly opt-in, payload shown before upload,
  server-side IP discarded
- npm publish

## Development

```sh
npm test                              # generator determinism + checker self-tests
node bin/llm-iq.js --adapter mock     # end-to-end without spending anything
LLM_IQ_HOME=/tmp/iq node bin/llm-iq.js --adapter mock --quick   # isolated history
node scripts/calibrate.js --model <id> --effort <level>         # ladder calibration
```

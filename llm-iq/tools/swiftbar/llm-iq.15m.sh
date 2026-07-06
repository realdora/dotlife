#!/bin/bash
# llm-iq menu bar plugin for SwiftBar (https://github.com/swiftbar/SwiftBar)
# (also works with xbar). Install: copy into your SwiftBar plugin folder
# and make executable. Shows the latest recorded benchmark verdict per
# agent in the macOS menu bar; refreshes the DISPLAY every 15 minutes at
# zero cost — it only reads local history. Actual benchmark runs happen
# when you click "Run …" (or via cron/launchd).
#
# <swiftbar.hideAbout>true</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>

HISTORY="${LLM_IQ_HOME:-$HOME/.llm-iq}/history.jsonl"
LLM_IQ_BIN="$(command -v llm-iq || echo llm-iq)"

if [ ! -s "$HISTORY" ]; then
  echo "🧠 –"
  echo "---"
  echo "No llm-iq runs recorded yet"
  echo "Run Claude benchmark now | bash='$LLM_IQ_BIN' param1=--quick terminal=true refresh=true"
  exit 0
fi

node - "$HISTORY" <<'EOF'
const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n');
const runs = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const LABELS = { 'claude-code': 'C', 'codex-cli': 'X', 'anthropic-api': 'A', 'openai-api': 'O', mock: 'M' };
function stats(sub) {
  const last = sub[sub.length - 1];
  const prior = sub.slice(0, -1).map(r => r.score);
  const mean = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
  const sd = prior.length > 1
    ? Math.max(Math.sqrt(prior.reduce((s, x) => s + (x - mean) ** 2, 0) / (prior.length - 1)), 2.5)
    : null;
  const z = sd !== null && prior.length >= 5 ? (last.score - mean) / sd : null;
  return { last, prior, mean, sd, z };
}

// Latest entry per adapter (same bench + profile as that adapter's last run).
const adapters = [...new Set(runs.map(r => r.adapter))];
const perAdapter = adapters.map(a => {
  const all = runs.filter(r => r.adapter === a);
  const last = all[all.length - 1];
  const sub = all.filter(r => r.bench === last.bench && r.profile === last.profile);
  return { adapter: a, ...stats(sub) };
});

const worstZ = Math.min(...perAdapter.map(p => (p.z === null ? 0 : p.z)));
const icon = worstZ < -2 ? '🔻' : worstZ < -1 ? '⚠️' : '🧠';
const title = perAdapter
  .map(p => `${LABELS[p.adapter] || p.adapter[0].toUpperCase()}:${Math.round(p.last.score)}`)
  .join(' ');
console.log(`${icon} ${title}`);
console.log('---');
for (const p of perAdapter) {
  const ageH = Math.round((Date.now() - Date.parse(p.last.ts)) / 3600000);
  console.log(`${p.adapter} — ${p.last.score} (${p.last.correct}/${p.last.n}) · ${p.last.model || ''} · ${ageH}h ago`);
  if (p.z !== null) {
    console.log(`-- baseline ${p.mean.toFixed(1)} ± ${p.sd.toFixed(1)} (${p.prior.length} runs) · z=${p.z.toFixed(2)}`);
  } else {
    console.log(`-- baseline: ${p.prior.length}/5 runs recorded`);
  }
  if (p.last.effortSelfReport) console.log(`-- self-reported effort: ${p.last.effortSelfReport}`);
}
EOF

echo "---"
echo "Run Claude benchmark now | bash='$LLM_IQ_BIN' param1=--quick terminal=true refresh=true"
echo "Run Codex benchmark now | bash='$LLM_IQ_BIN' param1=--quick param2=--adapter param3=codex terminal=true refresh=true"

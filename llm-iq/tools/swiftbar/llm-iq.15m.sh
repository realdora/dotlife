#!/bin/bash
# llm-iq menu bar plugin for SwiftBar (https://github.com/swiftbar/SwiftBar)
# (also works with xbar). Install: copy into your SwiftBar plugin folder
# and make executable. Shows the latest recorded benchmark verdict in the
# macOS menu bar; refreshes the DISPLAY every 15 minutes at zero cost —
# it only reads local history. Actual benchmark runs happen when you
# click "Run benchmark now" (or via cron/launchd).
#
# <swiftbar.hideAbout>true</swiftbar.hideAbout>
# <swiftbar.hideRunInTerminal>true</swiftbar.hideRunInTerminal>

HISTORY="${LLM_IQ_HOME:-$HOME/.llm-iq}/history.jsonl"
LLM_IQ_BIN="$(command -v llm-iq || echo llm-iq)"

if [ ! -s "$HISTORY" ]; then
  echo "🧠 –"
  echo "---"
  echo "No llm-iq runs recorded yet"
  echo "Run benchmark now | bash='$LLM_IQ_BIN' param1=--quick terminal=true refresh=true"
  exit 0
fi

node - "$HISTORY" <<'EOF'
const fs = require('fs');
const lines = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n');
const runs = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const last = runs[runs.length - 1];
const same = runs.filter(r => r.bench === last.bench && r.adapter === last.adapter && r.profile === last.profile);
const prior = same.slice(0, -1).map(r => r.score);
const mean = prior.length ? prior.reduce((a, b) => a + b, 0) / prior.length : null;
const sd = prior.length > 1
  ? Math.max(Math.sqrt(prior.reduce((s, x) => s + (x - mean) ** 2, 0) / (prior.length - 1)), 2.5)
  : null;
const z = sd !== null ? (last.score - mean) / sd : null;
const icon = z === null || prior.length < 5 ? '🧠' : z < -2 ? '🔻' : z < -1 ? '⚠️' : '🧠';
const ageH = Math.round((Date.now() - Date.parse(last.ts)) / 3600000);
console.log(`${icon} ${Math.round(last.score)}`);
console.log('---');
console.log(`Last run: ${last.ts.slice(0, 16).replace('T', ' ')} (${ageH}h ago)`);
console.log(`Score ${last.score} · ${last.correct}/${last.n} correct · ${last.model || last.adapter}`);
if (mean !== null && prior.length >= 5) {
  console.log(`Baseline ${mean.toFixed(1)} ± ${sd.toFixed(1)} (${prior.length} runs) · z=${z.toFixed(2)}`);
} else {
  console.log(`Baseline: ${prior.length}/5 runs recorded`);
}
if (last.effortSelfReport) console.log(`Self-reported effort: ${last.effortSelfReport}`);
EOF

echo "Run benchmark now | bash='$LLM_IQ_BIN' param1=--quick terminal=true refresh=true"
echo "Full run | bash='$LLM_IQ_BIN' terminal=true refresh=true"

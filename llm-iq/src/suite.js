import { makeRng } from './rng.js';
import { GENERATORS } from './generators/index.js';
import { BENCH_VERSION } from './version.js';

// Profiles are difficulty LADDERS: (category, level) rungs from L0 (the
// viral "how many r's in strawberry" tier) to L5 (beyond the current
// frontier). The report shows where each category breaks; the weighted
// score rewards higher rungs. The bank survives future model
// generations without re-tuning — the frontier just moves up.

export const PROFILES = {
  quick: [
    ['sanity', 0],
    ['arithmetic', 0], ['arithmetic', 3], ['arithmetic', 5],
    ['counting', 0], ['counting', 3], ['counting', 5],
    ['transform', 3], ['transform', 5],
    ['code', 3], ['code', 5],
    ['ordering', 3],
    ['format', 3],
  ],
  standard: [
    ['sanity', 0], ['sanity', 0],
    ...[0, 1, 2, 3, 4, 5].map((l) => ['arithmetic', l]),
    ...[0, 1, 2, 3, 4, 5].map((l) => ['counting', l]),
    ...[0, 1, 2, 3, 4, 5].map((l) => ['transform', l]),
    ...[0, 1, 2, 3, 4, 5].map((l) => ['code', l]),
    ['ordering', 0], ['ordering', 2], ['ordering', 4],
    ['format', 1], ['format', 3], ['format', 5],
    ['retrieval', 1], ['retrieval', 3],
  ],
};

export const ANSWER_INSTRUCTIONS =
  'Do not use any tools or external resources; solve this yourself. ' +
  'End your reply with the final answer wrapped in <answer></answer> tags. ' +
  'The tags must contain only the answer itself, nothing else. Example: <answer>42</answer>';

export function buildSuite(seed, profile) {
  const spec = PROFILES[profile];
  if (!spec) throw new Error(`unknown profile: ${profile} (use: ${Object.keys(PROFILES).join(', ')})`);
  const occurrences = {};
  return spec.map(([cat, level]) => {
    const key = `${cat}:L${level}`;
    const i = (occurrences[key] = (occurrences[key] || 0) + 1);
    const id = `${cat}-L${level}` + (i > 1 ? `-${i}` : '');
    // sanity questions share one rng (seeded without the occurrence
    // index) and use the index to pick distinct pool entries.
    const rng =
      cat === 'sanity'
        ? makeRng(`v${BENCH_VERSION}:${seed}:sanity:pick`)
        : makeRng(`v${BENCH_VERSION}:${seed}:${cat}:L${level}:${i}`);
    const q = GENERATORS[cat](rng, id, level, i - 1);
    q.level = level;
    q.weight = level + 1;
    return q;
  });
}

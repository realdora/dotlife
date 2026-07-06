import { makeRng } from './rng.js';
import { GENERATORS } from './generators/index.js';
import { BENCH_VERSION } from './version.js';

export const PROFILES = {
  quick: { arithmetic: 3, ordering: 2, code: 3, transform: 2, format: 2, retrieval: 0 },
  standard: { arithmetic: 6, ordering: 5, code: 6, transform: 5, format: 5, retrieval: 2 },
};

export const ANSWER_INSTRUCTIONS =
  'Do not use any tools or external resources; solve this yourself. ' +
  'End your reply with the final answer wrapped in <answer></answer> tags. ' +
  'The tags must contain only the answer itself, nothing else. Example: <answer>42</answer>';

// Each question gets its own RNG derived from (bench version, seed,
// category, index), so a question is stable even if profile counts change.
export function buildSuite(seed, profile) {
  const counts = PROFILES[profile];
  if (!counts) throw new Error(`unknown profile: ${profile} (use: ${Object.keys(PROFILES).join(', ')})`);
  const suite = [];
  for (const [cat, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) {
      const rng = makeRng(`v${BENCH_VERSION}:${seed}:${cat}:${i}`);
      suite.push(GENERATORS[cat](rng, `${cat}-${i + 1}`));
    }
  }
  return suite;
}

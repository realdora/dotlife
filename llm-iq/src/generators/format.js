import { int, pick, sample, shuffle } from '../rng.js';

// Constraint-following task across the ladder: the canonical answer is
// always constructed first (so every rule set is jointly satisfiable),
// and the LEVEL decides how many of its properties become stated rules —
// from 3 easy rules at L0 to the full nine-rule set on a longer line at
// L4-L5. Everything is checkable without a dictionary.

const POOL = [
  'sun', 'moon', 'wind', 'fish', 'bird', 'song', 'cold', 'gold', 'iron',
  'wood', 'snow', 'hill', 'ship', 'king', 'city', 'dust', 'light', 'night',
  'cloud', 'storm', 'stone', 'frost', 'coral', 'ivory', 'birch', 'willow',
  'fog', 'sky', 'sand', 'wolf', 'fox', 'owl', 'hawk', 'crow', 'moss',
  'fern', 'vine', 'leaf', 'root', 'bark', 'twig', 'pond', 'brook', 'glass',
  'silver', 'copper', 'plum', 'mint', 'clay', 'silk', 'wool', 'corn',
  'barley', 'oats', 'rice', 'bean', 'kelp', 'reef', 'dune', 'cliff',
  'ridge', 'peak', 'glen', 'marsh', 'bog', 'heath', 'pine', 'oak', 'elm',
  'ash', 'yew', 'fir', 'palm', 'reed', 'rush', 'sedge',
];

const BANNED = ['e', 'a', 't', 'r'];
const MIN_LEN = 3;
const MAX_LEN = 6;
const N_BY_LEVEL = [5, 7, 9, 11, 13, 16];

export function format(rng, id, level = 3) {
  const L = pick(rng, BANNED);
  const candidates = POOL.filter(
    (w) => !w.includes(L) && w.length >= MIN_LEN && w.length <= MAX_LEN
  );
  const N = N_BY_LEVEL[level] + int(rng, 0, 1);

  // Pick a counted letter X with enough words on both sides of the split.
  const letterOptions = [];
  for (const X of 'osnldgcik') {
    if (X === L) continue;
    const withX = candidates.filter((w) => w.includes(X)).length;
    if (withX >= 5 && candidates.length - withX >= N) letterOptions.push(X);
  }
  const X = pick(rng, letterOptions);
  const withX = candidates.filter((w) => w.includes(X));
  const withoutX = candidates.filter((w) => !w.includes(X));

  const K = int(rng, 2, Math.min(4, withX.length));
  const words = shuffle(rng, [
    ...sample(rng, withX, K),
    ...sample(rng, withoutX, N - K),
  ]);

  const lastWord = words[N - 1];
  const F = lastWord[lastWord.length - 1];
  const k1 = int(rng, 2, Math.floor(N / 2));
  const k2 = int(rng, Math.floor(N / 2) + 1, N - 1);
  const W1 = words[k1 - 1];
  const W2 = words[k2 - 1];

  // Rules, gated by level. Each rule = [minLevel, ruleText, test].
  const RULES = [
    [0, `exactly ${N} words, separated by single spaces`, (ws) => ws.length === N],
    [0, `only lowercase letters a-z and spaces (no digits, punctuation, or uppercase)`, () => true],
    [0, `word number ${k1} (counting from 1) must be exactly "${W1}"`, (ws) => ws[k1 - 1] === W1],
    [1, `no word may appear more than once`, (ws) => new Set(ws).size === ws.length],
    [2, `every word must be between ${MIN_LEN} and ${MAX_LEN} letters long`,
      (ws) => ws.every((w) => w.length >= MIN_LEN && w.length <= MAX_LEN)],
    [2, `the letter "${L}" must not appear anywhere in the line`,
      (ws) => !ws.join(' ').includes(L)],
    [3, `word number ${k2} must be exactly "${W2}"`, (ws) => ws[k2 - 1] === W2],
    [3, `the final word must end with the letter "${F}"`,
      (ws) => ws[ws.length - 1].endsWith(F)],
    [4, `exactly ${K} of the ${N} words must contain the letter "${X}" (the others must not contain it)`,
      (ws) => ws.filter((w) => w.includes(X)).length === K],
  ];
  const active = RULES.filter(([minLevel]) => level >= minLevel);

  const prompt =
    `Write exactly one line of text satisfying ALL of these rules:\n` +
    active.map(([, text]) => `- ${text}`).join('\n') +
    `\nThe line does not need to be a meaningful sentence.`;

  return {
    id,
    category: 'format',
    prompt,
    answer: words.join(' '),
    check: (v) => {
      const line = String(v).trim();
      if (!/^[a-z]+( [a-z]+)*$/.test(line)) return false;
      const ws = line.split(' ');
      return active.every(([, , test]) => test(ws));
    },
  };
}

import { int, pick, sample, shuffle } from '../rng.js';

// Constraint-following task at top-model density: eight simultaneous
// mechanical constraints (count, two fixed positions, banned letter,
// word-length band, final-letter requirement, exactly-K-words-contain-X,
// no repeats). Everything is checkable without a dictionary, and the
// canonical answer is constructed first — the constraints are derived
// from it, proving they are jointly satisfiable.

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

export function format(rng, id) {
  const L = pick(rng, BANNED);
  const candidates = POOL.filter(
    (w) => !w.includes(L) && w.length >= MIN_LEN && w.length <= MAX_LEN
  );
  const N = int(rng, 11, 14);

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

  // Remaining constraints are read off the constructed answer.
  const lastWord = words[N - 1];
  const F = lastWord[lastWord.length - 1];
  const k1 = int(rng, 2, Math.floor(N / 2));
  const k2 = int(rng, Math.floor(N / 2) + 1, N - 1);
  const W1 = words[k1 - 1];
  const W2 = words[k2 - 1];

  const prompt =
    `Write exactly one line of text satisfying ALL of these rules:\n` +
    `- exactly ${N} words, separated by single spaces\n` +
    `- only lowercase letters a-z and spaces (no digits, punctuation, or uppercase)\n` +
    `- every word must be between ${MIN_LEN} and ${MAX_LEN} letters long\n` +
    `- word number ${k1} (counting from 1) must be exactly "${W1}"\n` +
    `- word number ${k2} must be exactly "${W2}"\n` +
    `- the final word must end with the letter "${F}"\n` +
    `- exactly ${K} of the ${N} words must contain the letter "${X}" (the others must not contain it)\n` +
    `- the letter "${L}" must not appear anywhere in the line\n` +
    `- no word may appear more than once\n` +
    `The line does not need to be a meaningful sentence.`;

  return {
    id,
    category: 'format',
    prompt,
    answer: words.join(' '),
    check: (v) => {
      const line = String(v).trim();
      if (!/^[a-z]+( [a-z]+)*$/.test(line)) return false;
      if (line.includes(L)) return false;
      const ws = line.split(' ');
      if (ws.length !== N) return false;
      if (ws.some((w) => w.length < MIN_LEN || w.length > MAX_LEN)) return false;
      if (ws[k1 - 1] !== W1 || ws[k2 - 1] !== W2) return false;
      if (ws[N - 1][ws[N - 1].length - 1] !== F) return false;
      if (ws.filter((w) => w.includes(X)).length !== K) return false;
      return new Set(ws).size === N;
    },
  };
}

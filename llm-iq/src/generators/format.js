import { int, pick, sample } from '../rng.js';

// Constraint-following task: produce a line of words satisfying several
// mechanical constraints at once (count, fixed word at position k, banned
// letter, no repeats). Every constraint is checkable without a dictionary.

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

export function format(rng, id) {
  const L = pick(rng, BANNED);
  const candidates = POOL.filter((w) => !w.includes(L));
  const N = int(rng, 9, 12);
  const k = int(rng, 2, N - 1);
  const words = sample(rng, candidates, N);
  const W = words[k - 1];

  const prompt =
    `Write exactly one line of text satisfying ALL of these rules:\n` +
    `- exactly ${N} words, separated by single spaces\n` +
    `- only lowercase letters a-z and spaces (no digits, punctuation, or uppercase)\n` +
    `- word number ${k} (counting from 1) must be exactly "${W}"\n` +
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
      if (ws[k - 1] !== W) return false;
      return new Set(ws).size === N;
    },
  };
}

import { int, pick, sample } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Exact counting — a structural weak spot of LLMs, which have to count
// token-by-token with no working buffer. L0 is literally the viral
// "how many r's in strawberry" tier; higher levels scale text volume
// past attention capacity. Two flavors above L0: letter occurrences in
// word-soup text, and two-letter substring occurrences in a dense
// random string (distinct letters, so matches never overlap).

const WORDS = [
  'sun', 'moon', 'wind', 'fish', 'bird', 'song', 'cold', 'gold', 'iron',
  'wood', 'snow', 'hill', 'ship', 'king', 'city', 'dust', 'light', 'night',
  'cloud', 'storm', 'stone', 'frost', 'coral', 'ivory', 'birch', 'willow',
  'river', 'garden', 'signal', 'marble', 'copper', 'harbor', 'velvet',
  'window', 'pilot', 'crimson', 'meadow', 'granite', 'thunder', 'walnut',
];

// [words in text, letter-count sweet spot, substring-string length]
const LEVELS = [
  [1, 0, 0],
  [12, 12, 60],
  [40, 30, 150],
  [120, 60, 300],
  [280, 90, 500],
  [500, 130, 700],
];

const VIRAL = [
  'strawberry', 'mississippi', 'bookkeeper', 'banana', 'committee',
  'raspberry', 'possession', 'blueberry', 'coconut', 'pineapple',
];

function viralCount(rng, id) {
  const word = pick(rng, VIRAL);
  // Pick among the letters that actually repeat — that's where the
  // classic mistakes happen.
  const freq = {};
  for (const ch of word) freq[ch] = (freq[ch] || 0) + 1;
  const repeated = Object.entries(freq).filter(([, n]) => n >= 2);
  const [letter, n] = pick(rng, repeated);

  return {
    id,
    category: 'counting',
    prompt: `How many times does the letter "${letter}" appear in the word "${word}"? Answer with just the number.`,
    answer: String(n),
    check: (v) => parseIntLoose(v) === n,
  };
}

function letterCount(rng, id, level) {
  const [nWords, center] = LEVELS[level];
  const words = [];
  while (words.length < nWords) words.push(pick(rng, WORDS));
  const text = words.join(' ');

  const freq = {};
  for (const ch of text) if (ch !== ' ') freq[ch] = (freq[ch] || 0) + 1;
  const ranked = Object.entries(freq).sort(
    (a, b) => Math.abs(a[1] - center) - Math.abs(b[1] - center)
  );
  const [letter, n] = pick(rng, ranked.slice(0, 3));

  return {
    id,
    category: 'counting',
    prompt:
      `Count exactly how many times the letter "${letter}" appears in the following text.\n\n` +
      `${text}\n\n` +
      `Count every occurrence. Answer with just the number.`,
    answer: String(n),
    check: (v) => parseIntLoose(v) === n,
  };
}

function substringCount(rng, id, level) {
  const alphabet = 'abcd';
  const len = LEVELS[level][2] + int(rng, 0, 40);
  const s = Array.from({ length: len }, () => alphabet[int(rng, 0, alphabet.length - 1)]).join('');
  const [c1, c2] = sample(rng, [...alphabet], 2);
  const needle = c1 + c2;
  let n = 0;
  for (let i = 0; i + 1 < s.length; i++) if (s[i] === c1 && s[i + 1] === c2) n++;

  return {
    id,
    category: 'counting',
    prompt:
      `Count exactly how many times the substring "${needle}" appears in the following string:\n\n` +
      `${s}\n\n` +
      `Answer with just the number.`,
    answer: String(n),
    check: (v) => parseIntLoose(v) === n,
  };
}

export function counting(rng, id, level = 3) {
  if (level === 0) return viralCount(rng, id);
  return rng() < 0.5 ? letterCount(rng, id, level) : substringCount(rng, id, level);
}

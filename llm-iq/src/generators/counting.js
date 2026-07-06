import { int, pick, sample } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Exact counting — a structural weak spot of LLMs, which have to count
// token-by-token with no working buffer. Two flavors: letter occurrences
// in a word-soup text, and (non-overlapping-by-construction) two-letter
// substring occurrences in a dense random string.

const WORDS = [
  'sun', 'moon', 'wind', 'fish', 'bird', 'song', 'cold', 'gold', 'iron',
  'wood', 'snow', 'hill', 'ship', 'king', 'city', 'dust', 'light', 'night',
  'cloud', 'storm', 'stone', 'frost', 'coral', 'ivory', 'birch', 'willow',
  'river', 'garden', 'signal', 'marble', 'copper', 'harbor', 'velvet',
  'window', 'pilot', 'crimson', 'meadow', 'granite', 'thunder', 'walnut',
];

function letterCount(rng, id) {
  const words = [];
  const target = int(rng, 260, 320);
  while (words.length < target) words.push(pick(rng, WORDS));
  const text = words.join(' ');

  // Pick a letter with a mid-range count — high enough to be tedious,
  // low enough that the count is a meaningful number.
  const freq = {};
  for (const ch of text) if (ch !== ' ') freq[ch] = (freq[ch] || 0) + 1;
  const ranked = Object.entries(freq).sort((a, b) => Math.abs(a[1] - 90) - Math.abs(b[1] - 90));
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

function substringCount(rng, id) {
  const alphabet = 'abcd';
  const len = int(rng, 500, 650);
  const s = Array.from({ length: len }, () => alphabet[int(rng, 0, alphabet.length - 1)]).join('');
  // Distinct letters, so occurrences can never overlap each other.
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

export function counting(rng, id) {
  return rng() < 0.5 ? letterCount(rng, id) : substringCount(rng, id);
}

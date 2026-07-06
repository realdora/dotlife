import { int, pick, sample, shuffle } from '../rng.js';
import { cleanWord } from '../answer.js';

const NAMES = [
  'Ava', 'Ben', 'Cleo', 'Dan', 'Elif', 'Finn', 'Gita', 'Hugo',
  'Iris', 'Jack', 'Kira', 'Liam', 'Mona', 'Nils', 'Omar', 'Pia',
  'Quinn', 'Rosa', 'Sami', 'Tara', 'Umar', 'Vera', 'Wren', 'Yuki',
];

const ATTRS = [
  { more: 'taller', less: 'shorter', sup: 'tallest' },
  { more: 'older', less: 'younger', sup: 'oldest' },
  { more: 'faster', less: 'slower', sup: 'fastest' },
];

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

// Transitive-ordering puzzle: a chain of pairwise comparisons (plus two
// redundant non-adjacent ones), shuffled and randomly phrased in both
// directions. Exactly one total order is consistent.
export function ordering(rng, id) {
  const n = int(rng, 6, 7);
  const people = sample(rng, NAMES, n); // people[0] is the most-X
  const attr = pick(rng, ATTRS);

  const pairs = [];
  for (let i = 0; i < n - 1; i++) pairs.push([i, i + 1]);
  for (let t = 0; t < 2; t++) {
    const i = int(rng, 0, n - 3);
    const j = int(rng, i + 2, n - 1);
    pairs.push([i, j]);
  }

  const stmts = shuffle(rng, pairs).map(([i, j]) =>
    rng() < 0.5
      ? `${people[i]} is ${attr.more} than ${people[j]}.`
      : `${people[j]} is ${attr.less} than ${people[i]}.`
  );

  const k = int(rng, 2, n - 1);
  const answer = people[k - 1];

  return {
    id,
    category: 'ordering',
    prompt: `${stmts.join(' ')}\n\nWho is the ${ORDINALS[k - 1]} ${attr.sup}? Answer with just the name.`,
    answer,
    check: (v) => cleanWord(v).toLowerCase() === answer.toLowerCase(),
  };
}

import { int, pick, sample, shuffle } from '../rng.js';
import { cleanWord, parseIntLoose } from '../answer.js';

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

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

// Transitive-ordering puzzle at top-model size: 8-9 people, the defining
// chain buried under 5 redundant constraints, all shuffled and randomly
// phrased in both directions, with four query variants.
export function ordering(rng, id) {
  const n = int(rng, 8, 9);
  const people = sample(rng, NAMES, n); // people[0] is the most-X
  const attr = pick(rng, ATTRS);

  const pairs = [];
  for (let i = 0; i < n - 1; i++) pairs.push([i, i + 1]);
  for (let t = 0; t < 5; t++) {
    const i = int(rng, 0, n - 3);
    const j = int(rng, i + 2, n - 1);
    pairs.push([i, j]);
  }

  const stmts = shuffle(rng, pairs).map(([i, j]) =>
    rng() < 0.5
      ? `${people[i]} is ${attr.more} than ${people[j]}.`
      : `${people[j]} is ${attr.less} than ${people[i]}.`
  );

  const variant = int(rng, 0, 3);
  let question;
  let answer;
  let numeric = false;
  if (variant === 0) {
    const k = int(rng, 3, n - 2);
    question = `Who is the ${ORDINALS[k - 1]} ${attr.sup}? Answer with just the name.`;
    answer = people[k - 1];
  } else if (variant === 1) {
    const k = int(rng, 3, n - 2);
    question = `If everyone is ranked from ${attr.sup} to least, who is ${ORDINALS[k - 1]} from the bottom of that ranking? Answer with just the name.`;
    answer = people[n - k];
  } else if (variant === 2) {
    const idx = int(rng, 2, n - 1);
    question = `How many people are ${attr.more} than ${people[idx]}? Answer with just the number.`;
    answer = String(idx);
    numeric = true;
  } else {
    const idx = int(rng, 1, n - 2);
    question = `If everyone is ranked from ${attr.sup} to least, who comes immediately after ${people[idx]}? Answer with just the name.`;
    answer = people[idx + 1];
  }

  return {
    id,
    category: 'ordering',
    prompt: `${stmts.join(' ')}\n\n${question}`,
    answer,
    check: numeric
      ? (v) => parseIntLoose(v) === Number(answer)
      : (v) => cleanWord(v).toLowerCase() === answer.toLowerCase(),
  };
}

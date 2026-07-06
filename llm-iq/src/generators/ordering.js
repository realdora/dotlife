import { int, sample, shuffle } from '../rng.js';
import { cleanWord, parseIntLoose } from '../answer.js';

const NAMES = [
  'Ava', 'Ben', 'Cleo', 'Dan', 'Elif', 'Finn', 'Gita', 'Hugo',
  'Iris', 'Jack', 'Kira', 'Liam', 'Mona', 'Nils', 'Omar', 'Pia',
  'Quinn', 'Rosa', 'Sami', 'Tara', 'Umar', 'Vera', 'Wren', 'Yuki',
];

// Race-ranking puzzle across the ladder. L0-L1 are direct chains (3-4
// runners, "immediately ahead" clues — sortable at a glance). L2+ are
// logic-grid puzzles built from weak constraints ("ahead of", "not in
// the top 3", "not adjacent") that only pin the order down jointly; at
// L5 even exact-distance clues are removed from the pool. Uniqueness of
// the solution is verified by brute force during generation.

// [runners, allow exact-distance clues]
const LEVELS = [
  [3, true],
  [4, true],
  [6, true],
  [7, true],
  [8, true],
  [8, false],
];

// Count permutations consistent with the clues, capped for early exit.
function countSolutions(n, clues, cap) {
  const pos = new Array(n).fill(-1);
  const used = new Array(n).fill(false);
  let count = 0;
  function rec(person) {
    if (count >= cap) return;
    if (person === n) {
      for (const c of clues) if (!c.test(pos)) return;
      count++;
      return;
    }
    for (let p = 0; p < n; p++) {
      if (used[p]) continue;
      used[p] = true;
      pos[person] = p;
      rec(person + 1);
      used[p] = false;
    }
  }
  rec(0);
  return count;
}

export function ordering(rng, id, level = 3) {
  const [n, allowExact] = LEVELS[level];
  const people = sample(rng, NAMES, n); // people[i] finished in position i (0 = winner)

  let clues;
  if (level <= 1) {
    // Direct chain: adjacent "immediately ahead" facts, shuffled.
    clues = Array.from({ length: n - 1 }, (_, i) => ({
      text: `${people[i]} finished immediately ahead of ${people[i + 1]}.`,
    }));
  } else {
    const candidates = [];
    const seen = new Set();
    const addClue = (key, test, text) => {
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ test, text });
    };

    const pairs = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) pairs.push([i, j]);
    const shuffledPairs = shuffle(rng, pairs);

    for (const [i, j] of shuffledPairs.slice(0, 10)) {
      addClue(`A${i}-${j}`, (pos) => pos[i] < pos[j], `${people[i]} finished ahead of ${people[j]}.`);
    }
    if (allowExact) {
      let added = 0;
      for (const [i, j] of shuffledPairs) {
        if (added >= 3) break;
        if (j - i >= 2) {
          addClue(
            `B${i}-${j}`,
            (pos) => pos[j] - pos[i] === j - i,
            `${people[i]} finished exactly ${j - i} places ahead of ${people[j]}.`
          );
          added++;
        }
      }
    }
    for (const i of shuffle(rng, Array.from({ length: n }, (_, x) => x))) {
      if (i < 2) continue;
      const k = int(rng, 2, Math.min(4, i));
      addClue(`D${i}`, (pos) => pos[i] >= k, `${people[i]} did not finish in the top ${k}.`);
    }
    let added = 0;
    for (const [i, j] of shuffle(rng, pairs)) {
      if (added >= 6) break;
      if (j - i >= 2) {
        addClue(
          `E${i}-${j}`,
          (pos) => Math.abs(pos[i] - pos[j]) >= 2,
          `${people[i]} and ${people[j]} did not finish in adjacent positions.`
        );
        added++;
      }
    }

    // Greedily add clues that shrink the solution set until it is unique.
    // Counts are exact (n! ≤ 40320 for n ≤ 8), otherwise weak clues whose
    // benefit lies beyond a cap would never be accepted.
    const EXACT = 50000;
    clues = [];
    let count = countSolutions(n, clues, EXACT);
    for (const c of shuffle(rng, candidates)) {
      if (count === 1) break;
      const withC = countSolutions(n, [...clues, c], count);
      if (withC < count) {
        clues.push(c);
        count = withC;
      }
    }
    // Guaranteed-unique fallback: pin adjacent pairs until forced.
    for (let i = 0; i < n - 1 && count !== 1; i++) {
      const c = {
        test: (pos) => pos[i + 1] - pos[i] === 1,
        text: `${people[i]} finished immediately ahead of ${people[i + 1]}.`,
      };
      clues.push(c);
      count = countSolutions(n, clues, 2);
    }
  }

  const clueLines = shuffle(rng, clues).map((c, i) => `${i + 1}. ${c.text}`);

  const variant = int(rng, 0, 1);
  let question;
  let answer;
  let numeric = false;
  if (variant === 0) {
    const k = int(rng, 2, n - 1);
    question = `Who finished in position ${k}? Answer with just the name.`;
    answer = people[k - 1];
  } else {
    const p = int(rng, 1, n - 2);
    question = `In which position did ${people[p]} finish? Answer with just the number (1 = winner).`;
    answer = String(p + 1);
    numeric = true;
  }

  return {
    id,
    category: 'ordering',
    prompt:
      `${n} runners — ${people.join(', ')} — finished a race, one per position, with no ties.\n\n` +
      `Clues:\n${clueLines.join('\n')}\n\n${question}`,
    answer,
    check: numeric
      ? (v) => parseIntLoose(v) === Number(answer)
      : (v) => cleanWord(v).toLowerCase() === answer.toLowerCase(),
  };
}

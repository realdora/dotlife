import { int } from '../rng.js';

// Sequential string-transformation puzzle across the ladder: from 2 ops
// on a 4-character string (L0) to 22 ops on a 30-character string (L5).
// Errors compound down the chain. Operations are generated while being
// applied, so ground truth is exact by construction. Case-sensitive.

// [string length min, ops]
const LEVELS = [
  [4, 2],
  [8, 5],
  [12, 8],
  [18, 12],
  [24, 16],
  [30, 22],
];

export function transform(rng, id, level = 3) {
  const [len0, nOps] = LEVELS[level];
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let s = Array.from({ length: len0 + int(rng, 0, 2) }, () => letters[int(rng, 0, 25)]).join('');
  const s0 = s;
  const growCap = len0 + 8;

  const steps = [];
  let prev = -1;
  let shrinks = 0; // cap shrinking ops so the string stays interesting
  for (let t = 0; t < nOps; t++) {
    let op = int(rng, 0, 8);
    if (op === prev) op = (op + 1) % 9;
    if ((op === 2 || op === 7) && shrinks >= 2) op = (op + 2) % 9;
    if (op === 8 && s.length > growCap) op = 0;
    if (op === prev) op = (op + 1) % 9;
    prev = op;
    switch (op) {
      case 0:
        steps.push('Reverse the string.');
        s = [...s].reverse().join('');
        break;
      case 1: {
        const k = int(rng, 1, 3);
        steps.push(`Move the first ${k} character${k > 1 ? 's' : ''} to the end of the string.`);
        s = s.slice(k) + s.slice(0, k);
        break;
      }
      case 2:
        shrinks++;
        steps.push('Delete every character in an even position, keeping the 1st, 3rd, 5th, ... characters.');
        s = [...s].filter((_, i) => i % 2 === 0).join('');
        break;
      case 3:
        steps.push('Swap the first and last characters.');
        if (s.length > 1) s = s[s.length - 1] + s.slice(1, -1) + s[0];
        break;
      case 4:
        steps.push('Convert every vowel (a, e, i, o, u) to uppercase.');
        s = s.replace(/[aeiou]/g, (c) => c.toUpperCase());
        break;
      case 5: {
        const k = int(rng, 1, 3);
        steps.push(`Move the last ${k} character${k > 1 ? 's' : ''} to the front of the string.`);
        s = s.slice(-k) + s.slice(0, -k);
        break;
      }
      case 6: {
        steps.push(
          'Split the string in the middle and swap the two halves ' +
            '(if the length is odd, the middle character belongs to the first half).'
        );
        const h = Math.ceil(s.length / 2);
        s = s.slice(h) + s.slice(0, h);
        break;
      }
      case 7:
        shrinks++;
        steps.push('Delete duplicate characters, keeping only the first occurrence of each (case-sensitive).');
        s = [...new Set(s)].join('');
        break;
      case 8: {
        const present = [...new Set(s.toLowerCase().replace(/[^a-z]/g, ''))];
        const c = present[int(rng, 0, present.length - 1)];
        const d = letters[int(rng, 0, 25)];
        steps.push(`Replace every occurrence of "${c}" (lowercase only) with "${d}${d}".`);
        s = s.split(c).join(d + d);
        break;
      }
    }
  }

  const numbered = steps.map((st, i) => `${i + 1}. ${st}`).join('\n');

  return {
    id,
    category: 'transform',
    prompt:
      `Start with the string "${s0}".\n\nApply these operations in order:\n${numbered}\n\n` +
      `What is the final string? Case matters. Answer with just the string, no quotes.`,
    answer: s,
    check: (v) => String(v).trim().replace(/^["'`]|["'`]$/g, '') === s,
  };
}

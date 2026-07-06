import { int } from '../rng.js';

// Sequential string-transformation puzzle. Operations are generated while
// being applied, so ground truth is exact by construction. Case-sensitive.
export function transform(rng, id) {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  let s = Array.from({ length: int(rng, 8, 9) }, () => letters[int(rng, 0, 25)]).join('');
  const s0 = s;

  const steps = [];
  const nOps = int(rng, 4, 5);
  let prev = -1;
  for (let t = 0; t < nOps; t++) {
    let op = int(rng, 0, 4);
    if (op === prev) op = (op + 1) % 5; // avoid trivially repeating the same op
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

import { int, pick } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Multi-step integer arithmetic across the difficulty ladder: L0 is a
// single small product ("17 * 23 - 8" territory), L5 is a 34-38 operand
// chain with eight multiplications and three parenthesized groups.
// Operands adjacent to '*' stay small so magnitudes remain bounded while
// the mental chain grows.

const LEVELS = [
  { count: [2, 3], stars: 1, groups: 0 },
  { count: [5, 6], stars: 1, groups: 1 },
  { count: [10, 12], stars: 2, groups: 2 },
  { count: [18, 22], stars: 5, groups: 3 },
  { count: [26, 30], stars: 6, groups: 3 },
  { count: [34, 38], stars: 8, groups: 3 },
];

export function arithmetic(rng, id, level = 3) {
  const L = LEVELS[level];
  const count = int(rng, L.count[0], L.count[1]);
  const small = level <= 1;

  const ops = [];
  let stars = 0;
  for (let i = 0; i < count - 1; i++) {
    let op = pick(rng, ['+', '+', '-', '-', '*', '*']);
    if (op === '*' && stars >= L.stars) op = pick(rng, ['+', '-']);
    if (op === '*') stars++;
    ops.push(op);
  }
  const nums = [];
  for (let i = 0; i < count; i++) {
    const nearStar = (i > 0 && ops[i - 1] === '*') || (i < ops.length && ops[i] === '*');
    if (small) nums.push(nearStar ? int(rng, 11, 29) : int(rng, 13, 97));
    else nums.push(nearStar ? int(rng, 12, 49) : int(rng, 23, 198));
  }

  const tokens = [];
  for (let i = 0; i < count; i++) {
    tokens.push(String(nums[i]));
    if (i < ops.length) tokens.push(ops[i]);
  }
  // One parenthesized group per segment of the operand sequence
  // (operand k sits at token 2k).
  if (L.groups > 0) {
    const seg = Math.floor(count / L.groups);
    for (let g = 0; g < L.groups; g++) {
      if (seg < 4) break;
      const lo = g * seg;
      const a = int(rng, lo, lo + seg - 3);
      const b = a + int(rng, 1, 2);
      tokens[2 * a] = '(' + tokens[2 * a];
      tokens[2 * b] = tokens[2 * b] + ')';
    }
  }
  const expr = tokens.join(' ');

  const value = Function(`"use strict"; return (${expr});`)();

  return {
    id,
    category: 'arithmetic',
    prompt:
      `Compute the exact value of this arithmetic expression:\n\n${expr}\n\n` +
      `Standard operator precedence applies; * is multiplication. Give the result as a single integer.`,
    answer: String(value),
    check: (v) => parseIntLoose(v) === value,
  };
}

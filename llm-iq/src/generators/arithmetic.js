import { int, pick } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Multi-step integer arithmetic, sized for top-tier models: 10-13 operands,
// up to three multiplications, two separate parenthesized groups. Operands
// adjacent to '*' stay 2-digit so magnitudes remain bounded while the
// mental chain stays long.
export function arithmetic(rng, id) {
  const count = int(rng, 18, 22);
  const ops = [];
  let stars = 0;
  for (let i = 0; i < count - 1; i++) {
    let op = pick(rng, ['+', '+', '-', '-', '*', '*']);
    if (op === '*' && stars >= 5) op = pick(rng, ['+', '-']);
    if (op === '*') stars++;
    ops.push(op);
  }
  const nums = [];
  for (let i = 0; i < count; i++) {
    const nearStar = (i > 0 && ops[i - 1] === '*') || (i < ops.length && ops[i] === '*');
    nums.push(nearStar ? int(rng, 12, 49) : int(rng, 23, 198));
  }

  const tokens = [];
  for (let i = 0; i < count; i++) {
    tokens.push(String(nums[i]));
    if (i < ops.length) tokens.push(ops[i]);
  }
  // Three non-overlapping parenthesized groups (operand k sits at token 2k),
  // one per third of the operand sequence.
  const third = Math.floor(count / 3);
  const groups = [];
  for (let g = 0; g < 3; g++) {
    const lo = g * third;
    const i = int(rng, lo, lo + third - 3);
    groups.push([i, i + int(rng, 1, 2)]);
  }
  for (const [a, b] of groups) {
    tokens[2 * a] = '(' + tokens[2 * a];
    tokens[2 * b] = tokens[2 * b] + ')';
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

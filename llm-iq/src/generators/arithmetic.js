import { int, pick } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Multi-step integer arithmetic with mixed precedence and one parenthesized
// group. Operands adjacent to '*' are kept small so magnitudes stay bounded.
export function arithmetic(rng, id) {
  const count = int(rng, 6, 8);
  const ops = [];
  let stars = 0;
  for (let i = 0; i < count - 1; i++) {
    let op = pick(rng, ['+', '+', '-', '-', '*']);
    if (op === '*' && stars >= 2) op = pick(rng, ['+', '-']);
    if (op === '*') stars++;
    ops.push(op);
  }
  const nums = [];
  for (let i = 0; i < count; i++) {
    const nearStar = (i > 0 && ops[i - 1] === '*') || (i < ops.length && ops[i] === '*');
    nums.push(nearStar ? int(rng, 3, 24) : int(rng, 12, 97));
  }

  const tokens = [];
  for (let i = 0; i < count; i++) {
    tokens.push(String(nums[i]));
    if (i < ops.length) tokens.push(ops[i]);
  }
  // Wrap a 2-3 operand span in parentheses (operand k sits at token 2k).
  const i0 = int(rng, 0, count - 3);
  const j0 = int(rng, i0 + 1, Math.min(count - 1, i0 + 2));
  tokens[2 * i0] = '(' + tokens[2 * i0];
  tokens[2 * j0] = tokens[2 * j0] + ')';
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

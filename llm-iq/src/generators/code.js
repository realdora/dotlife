import vm from 'node:vm';
import { int, pick, sample } from '../rng.js';
import { parseIntLoose } from '../answer.js';

// Predict-the-output questions sized for top models: nested loops with
// interacting conditions, comparator sorts, char-code arithmetic,
// frequency maps, and branching recursion. Snippets are generated from
// templates and executed locally in a sandboxed vm, so the checker is
// exact by construction.

function runJs(code) {
  const out = [];
  vm.runInNewContext(
    code,
    { console: { log: (...a) => out.push(a.map(String).join(' ')) } },
    { timeout: 1000 }
  );
  return out.join('\n');
}

function randWord(rng, len, alphabet = 'abcdefghijklmnopqrstuvwxyz') {
  return Array.from({ length: len }, () => alphabet[int(rng, 0, alphabet.length - 1)]).join('');
}

function nestedLoopTemplate(rng) {
  const A = int(rng, 6, 8);
  const B = int(rng, 15, 20);
  const S = int(rng, 2, 3);
  const M = int(rng, 3, 4);
  const R = int(rng, 0, M - 1);
  const T = int(rng, 150, 400);
  const D = int(rng, 7, 19);
  const INIT = int(rng, 0, 25);
  return [
    `let total = ${INIT};`,
    `for (let i = 1; i <= ${A}; i++) {`,
    `  for (let j = i; j <= ${B}; j += ${S}) {`,
    `    if ((i + j) % ${M} === ${R}) {`,
    `      total += i * j;`,
    `    }`,
    `    if (total > ${T}) {`,
    `      total -= ${D};`,
    `    }`,
    `  }`,
    `}`,
    `console.log(total);`,
  ].join('\n');
}

function sortTemplate(rng) {
  const xs = [];
  while (xs.length < 12) {
    const v = int(rng, 1, 99);
    if (!xs.includes(v)) xs.push(v);
  }
  const M = int(rng, 3, 5);
  return [
    `const xs = [${xs.join(', ')}];`,
    `const ys = xs.slice().sort((a, b) => (a % ${M}) - (b % ${M}) || a - b);`,
    `const r = ys[1] * 100 + ys[4] + ys[ys.length - 2] * xs.indexOf(ys[0]) + xs.indexOf(ys[ys.length - 1]);`,
    `console.log(r);`,
  ].join('\n');
}

function charCodeTemplate(rng) {
  const s = randWord(rng, int(rng, 12, 14));
  const K = int(rng, 2, 5);
  const A = int(rng, 1, 2);
  return [
    `const s = '${s}';`,
    `let out = '';`,
    `for (let i = 0; i < s.length; i++) {`,
    `  const c = s.charCodeAt(i) - 97;`,
    `  out += String.fromCharCode(97 + (c + i * ${K}) % 26);`,
    `}`,
    `const rev = out.split('').reverse().join('');`,
    `console.log(rev.toUpperCase().slice(${A}, rev.length - 1));`,
  ].join('\n');
}

function frequencyTemplate(rng) {
  // Narrow alphabet forces repeats so the filter has something to keep.
  const s = randWord(rng, int(rng, 20, 24), 'abcdef');
  return [
    `const s = '${s}';`,
    `const counts = {};`,
    `for (const ch of s) {`,
    `  counts[ch] = (counts[ch] || 0) + 1;`,
    `}`,
    `const pairs = Object.entries(counts)`,
    `  .filter(([c, n]) => n >= 3)`,
    `  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));`,
    `console.log(pairs.map(([c, n]) => c + n).join('-'));`,
  ].join('\n');
}

function recursionTemplate(rng) {
  const N = int(rng, 13, 16);
  const K = int(rng, 1, 3);
  return [
    `function f(n) {`,
    `  if (n <= 1) return n;`,
    `  if (n % 2 === 0) return f(n - 1) + f(n - 2);`,
    `  return f(n - 1) - ${K};`,
    `}`,
    `console.log(f(${N}));`,
  ].join('\n');
}

export function code(rng, id) {
  const template = pick(rng, [
    nestedLoopTemplate,
    sortTemplate,
    charCodeTemplate,
    frequencyTemplate,
    recursionTemplate,
  ]);
  const snippet = template(rng);
  const expected = runJs(snippet);
  const numeric = /^-?\d+$/.test(expected);

  return {
    id,
    category: 'code',
    prompt:
      `What is the exact output of this JavaScript program?\n\n` +
      '```js\n' + snippet + '\n```\n\n' +
      `Give only the printed output.`,
    answer: expected,
    check: (v) =>
      numeric ? parseIntLoose(v) === Number(expected) : String(v).trim() === expected,
  };
}

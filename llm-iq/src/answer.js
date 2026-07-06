// Extract the model's final answer from its raw reply.
// Primary protocol: last <answer>...</answer> block. Fallbacks are tracked
// as format failures (ok: false) — a rising format-failure rate is itself
// an instruction-following signal.

export function extractAnswer(text) {
  if (!text) return { ok: false, value: '' };
  const tags = [...text.matchAll(/<answer>([\s\S]*?)<\/answer>/gi)];
  if (tags.length) return { ok: true, value: tags[tags.length - 1][1].trim() };
  const lines = text
    .trim()
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const last = lines[lines.length - 1] || '';
  const labeled = last.match(/answer\s*[:=]\s*(.+)$/i);
  if (labeled) return { ok: false, value: labeled[1].trim() };
  return { ok: false, value: last };
}

// Lenient integer parse: allows commas, surrounding whitespace, trailing
// period, leading +/-. Returns NaN when the string is not a plain integer.
export function parseIntLoose(s) {
  const t = String(s).trim().replace(/[,\s]/g, '').replace(/\.$/, '');
  if (!/^[+-]?\d+$/.test(t)) return NaN;
  return Number(t);
}

// Strip quotes/backticks/trailing punctuation around a single-word answer.
export function cleanWord(s) {
  return String(s)
    .trim()
    .replace(/^["'`*_\s]+|["'`*_.\s]+$/g, '');
}

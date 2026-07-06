// Statistics for a noisy benchmark: a single run is a binomial sample, so
// every score gets a Wilson interval, and "degraded" is only claimed
// relative to the user's own rolling baseline, never from one number.

export function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n;
  const z2 = z * z;
  const d = 1 + z2 / n;
  const c = (p + z2 / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / d;
  return [Math.max(0, c - h), Math.min(1, c + h)];
}

export function mean(a) {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

export function stdev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

const MIN_BASELINE_RUNS = 5;
// Floor on σ (in score points): with few runs the sample σ can be
// misleadingly tiny and everything would look "significant".
const SD_FLOOR = 2.5;

export function assessAgainstBaseline(score, baseScores) {
  const n = baseScores.length;
  if (n < MIN_BASELINE_RUNS) {
    return { status: 'insufficient', n, needed: MIN_BASELINE_RUNS };
  }
  const m = mean(baseScores);
  const sd = Math.max(stdev(baseScores), SD_FLOOR);
  const z = (score - m) / sd;
  let status = 'ok';
  if (z < -2 && m - score > 3) status = 'degraded';
  else if (z < -1) status = 'warn';
  return { status, z, mean: m, sd, n };
}

export function sparkline(vals) {
  const BARS = '▁▂▃▄▅▆▇█';
  if (!vals.length) return '';
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  return vals
    .map((v) => BARS[mx === mn ? 3 : Math.round(((v - mn) / (mx - mn)) * 7)])
    .join('');
}

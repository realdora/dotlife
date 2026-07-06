// Version of the question-generation logic. Bump whenever generators or
// profiles change in a way that shifts difficulty — scores are only
// comparable (and baselines only computed) within the same bench version.
//
// v1: initial MVP difficulty (saturated by top models — Sonnet 5 hit 100%)
// v2: longer chains / denser constraints (still saturated — Fable 5: 36/36)
// v3: structurally harder tasks aimed at top-model weak spots: letter
//     counting, solver-verified logic-grid puzzles, multi-hop retrieval,
//     longer stateful simulation. (Gradient still too flat: 100/97/94
//     for Fable/Sonnet/Haiku.)
// v4: scale state-tracking volume past attention capacity — the lever
//     that actually produced tier misses in v3 calibration.
export const BENCH_VERSION = 4;

export const TOOL_VERSION = '0.4.0';

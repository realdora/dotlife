// Version of the question-generation logic. Bump whenever generators or
// profiles change in a way that shifts difficulty — scores are only
// comparable (and baselines only computed) within the same bench version.
//
// v1: initial MVP difficulty (saturated by top models — Sonnet 5 hit 100%)
// v2: longer chains / denser constraints (still saturated — Fable 5: 36/36)
// v3: structurally harder tasks aimed at top-model weak spots: letter
//     counting, solver-verified logic-grid puzzles, multi-hop retrieval,
//     longer stateful simulation. (Gradient too flat: 100/97/94.)
// v4: scale state-tracking volume past attention capacity (Fable: 34/35).
// v5: difficulty LADDERS. Every category spans L0 (the viral "how many
//     r's in strawberry" tier) through L5 (beyond current frontier).
//     Scores become "where does the model break", so the bank survives
//     future model generations without re-tuning: the frontier just
//     moves up an existing ladder.
export const BENCH_VERSION = 5;

export const TOOL_VERSION = '0.5.0';

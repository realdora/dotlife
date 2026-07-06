import { claudeCodeAdapter } from './claude-code.js';
import { codexCliAdapter } from './codex-cli.js';
import { anthropicApiAdapter } from './anthropic-api.js';
import { openaiApiAdapter } from './openai-api.js';
import { mockAdapter } from './mock.js';

// Adapter registry — the core engine (generators, grading, ladders,
// baselines) is provider-agnostic; supporting a new LLM product or API
// means adding one entry here. CLI names are user-facing; the adapter's
// own `name` is what gets recorded in history (baselines are computed
// per recorded name).

export const ADAPTERS = {
  claude: {
    desc: 'Claude Code CLI product pipeline (default)',
    make: (o) => claudeCodeAdapter({ model: o.model, effort: o.effort }),
  },
  codex: {
    desc: 'OpenAI Codex CLI product pipeline (codex exec)',
    make: (o) => codexCliAdapter({ model: o.model, effort: o.effort }),
  },
  api: {
    desc: 'raw Anthropic API (needs ANTHROPIC_API_KEY)',
    make: (o) => anthropicApiAdapter(o.model ? { model: o.model } : {}),
  },
  openai: {
    desc: 'any OpenAI-compatible endpoint (--model required; --base-url / OPENAI_BASE_URL / OPENAI_API_KEY)',
    make: (o) => openaiApiAdapter({ model: o.model, baseUrl: o.baseUrl, effort: o.effort }),
  },
  mock: {
    desc: 'simulated model for development (free)',
    make: (o) => mockAdapter({ accuracy: o.mockAccuracy }),
  },
};

export function makeAdapter(opts) {
  const entry = ADAPTERS[opts.adapter];
  if (!entry) {
    throw new Error(`unknown adapter: ${opts.adapter} (use ${Object.keys(ADAPTERS).join(' | ')})`);
  }
  return entry.make(opts);
}

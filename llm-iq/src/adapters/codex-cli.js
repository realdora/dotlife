import { exec } from './exec.js';

// Runs questions through the OpenAI Codex CLI product pipeline via
// `codex exec` — same philosophy as the claude-code adapter: measure
// what the subscribed user actually gets, consuming their own ChatGPT
// quota, and capture the actually-used model when the CLI reports it.
//
// `model_reasoning_effort` (minimal|low|medium|high) is Codex's effort
// knob and doubles as the artificial-nerf lever for calibration.

export function codexCliAdapter({ model, effort } = {}) {
  return {
    name: 'codex-cli',
    probeSupported: true,
    async run(prompt, _q, { timeoutMs = 240000 } = {}) {
      const args = ['exec', '--json', '--skip-git-repo-check', '--sandbox', 'read-only'];
      if (model) args.push('-m', model);
      if (effort) args.push('-c', `model_reasoning_effort=${effort}`);
      args.push('-'); // read the prompt from stdin
      const t0 = Date.now();
      const { stdout, stderr, code, timedOut } = await exec('codex', args, prompt, timeoutMs);
      if (timedOut) throw new Error(`codex timed out after ${Math.round(timeoutMs / 1000)}s`);
      if (code !== 0) throw new Error(`codex exited ${code}: ${(stderr || stdout).slice(0, 300)}`);

      // JSONL event stream; the schema differs across codex versions, so
      // parse tolerantly: keep the last agent message seen, plus any
      // model identifier a config/session event exposes.
      let text = '';
      let usedModel;
      for (const line of stdout.split('\n')) {
        if (!line.trim()) continue;
        let obj;
        try {
          obj = JSON.parse(line);
        } catch {
          continue;
        }
        const item = obj.item;
        if (item && (item.type === 'agent_message' || item.item_type === 'agent_message') &&
            typeof item.text === 'string') {
          text = item.text;
        }
        const msg = obj.msg;
        if (msg && msg.type === 'agent_message' && typeof msg.message === 'string') {
          text = msg.message;
        }
        if (typeof obj.model === 'string') usedModel = obj.model;
        else if (msg && typeof msg.model === 'string') usedModel = msg.model;
      }
      if (!text) {
        throw new Error(`no agent message in codex output: ${(stderr || stdout).slice(0, 200)}`);
      }
      return { text, model: usedModel, durationMs: Date.now() - t0 };
    },
  };
}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Local run history: one JSON object per line in ~/.llm-iq/history.jsonl.
// Only scores and run metadata are stored — never prompts or model output.

export function historyDir() {
  return process.env.LLM_IQ_HOME || path.join(os.homedir(), '.llm-iq');
}

function historyFile() {
  return path.join(historyDir(), 'history.jsonl');
}

export function loadHistory() {
  let raw;
  try {
    raw = fs.readFileSync(historyFile(), 'utf8');
  } catch {
    return [];
  }
  return raw
    .split('\n')
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function appendHistory(entry) {
  fs.mkdirSync(historyDir(), { recursive: true });
  fs.appendFileSync(historyFile(), JSON.stringify(entry) + '\n');
}

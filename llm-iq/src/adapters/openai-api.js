// Generic OpenAI-compatible chat-completions adapter. One adapter,
// many providers: api.openai.com, OpenRouter, DeepSeek, Ollama, LM
// Studio, Gemini's compat endpoint — anything speaking the de-facto
// standard. Point --base-url (or OPENAI_BASE_URL) at the provider;
// OPENAI_API_KEY is sent as a Bearer token when present.

export function openaiApiAdapter({ model, baseUrl, effort } = {}) {
  const root = (baseUrl || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const key = process.env.OPENAI_API_KEY;
  if (!model) throw new Error('--model is required for --adapter openai');
  if (!key && root === 'https://api.openai.com/v1') {
    throw new Error('OPENAI_API_KEY is not set (required for api.openai.com; local endpoints may not need it)');
  }
  return {
    name: 'openai-api',
    async run(prompt, _q, { timeoutMs = 240000 } = {}) {
      const t0 = Date.now();
      const res = await fetch(`${root}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'content-type': 'application/json',
          ...(key ? { authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          ...(effort ? { reasoning_effort: effort } : {}),
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const obj = await res.json();
      const text = obj.choices?.[0]?.message?.content ?? '';
      return { text, model: obj.model || model, durationMs: Date.now() - t0 };
    },
  };
}

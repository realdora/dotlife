// Raw Anthropic API adapter — measures the bare model rather than the
// Claude Code product pipeline. Useful for isolating where a regression
// lives: API score stable + product score down → the product changed.

export function anthropicApiAdapter({ model = 'claude-sonnet-5', maxTokens = 4096 } = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set (required for --adapter api)');
  return {
    name: 'anthropic-api',
    async run(prompt, _q, { timeoutMs = 240000 } = {}) {
      const t0 = Date.now();
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const obj = await res.json();
      const text = (obj.content || [])
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      return { text, model: obj.model, durationMs: Date.now() - t0 };
    },
  };
}

import { getDb } from '@/lib/db';

// Cost per 1M tokens (approximate, update as needed)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 0.80, output: 4.0 },
  'gpt-5.1-codex': { input: 2.50, output: 10.0 },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || { input: 3.0, output: 15.0 };
  return (inputTokens / 1_000_000) * costs.input + (outputTokens / 1_000_000) * costs.output;
}

export function logUsage(
  agent: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  taskRef?: string
): void {
  try {
    const db = getDb();
    const cost = calculateCost(model, inputTokens, outputTokens);
    db.prepare(
      'INSERT INTO usage_log (agent, model, input_tokens, output_tokens, cost_usd, task_ref) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(agent, model, inputTokens, outputTokens, cost, taskRef ?? '');
  } catch (e) {
    console.error('Failed to log usage:', e);
  }
}

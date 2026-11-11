import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

let client;
const getClient = () => (client ??= new Anthropic()); // reads ANTHROPIC_API_KEY (or an `ant auth login` profile)

export class LlmError extends Error {}

/**
 * One structured request. `system` and `cached` form a stable prefix (prompt-cached across jobs);
 * `content` is the per-job part. Returns the parsed object, or throws LlmError with a readable reason.
 */
export async function ask({ cfg, system, cached = [], content, schema, maxTokens = 16000 }) {
  const userContent = [
    ...cached.map((c, i) => (i === cached.length - 1 ? { ...c, cache_control: { type: 'ephemeral' } } : c)),
    ...(typeof content === 'string' ? [{ type: 'text', text: content }] : content),
  ];
  let res;
  try {
    res = await getClient().beta.messages.parse({
      model: cfg.llm.model,
      max_tokens: maxTokens,
      // If the model declines a request, let the API retry it on its default fallback model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: cfg.llm.effort, format: betaZodOutputFormat(schema) },
      system,
      messages: [{ role: 'user', content: userContent }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new LlmError('Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY.');
    if (err instanceof Anthropic.PermissionDeniedError) throw new LlmError(`Anthropic API refused the request: ${err.message}`);
    if (err instanceof Anthropic.NotFoundError) throw new LlmError(`Model "${cfg.llm.model}" was not found. Check llm.model in config.yaml.`);
    if (err instanceof Anthropic.RateLimitError) throw new LlmError('Anthropic API rate limit reached (after retries). Wait a little and run again.');
    if (err instanceof Anthropic.BadRequestError) throw new LlmError(`Anthropic API rejected the request: ${err.message}`);
    if (err instanceof Anthropic.APIConnectionError) throw new LlmError('Could not reach the Anthropic API. Check your internet connection.');
    if (err instanceof Anthropic.APIError) throw new LlmError(`Anthropic API error ${err.status}: ${err.message}`);
    throw err;
  }
  if (res.stop_reason === 'refusal') throw new LlmError('The model declined this request.');
  if (res.stop_reason === 'max_tokens') throw new LlmError('The model ran out of output space before finishing.');
  if (!res.parsed_output) throw new LlmError('The model returned something that does not fit the expected structure.');
  return res.parsed_output;
}

export function hasApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

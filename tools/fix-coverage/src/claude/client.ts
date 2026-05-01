/**
 * Thin wrapper around the official Anthropic SDK with retry + budget
 * tracking. The wrapper is the single point of contact between the
 * orchestrator and the model — every call passes through here, which
 * makes mocking/testing trivial and centralises rate-limit handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import { retry, isRetriableHttpError } from './retry';
import { getLogger } from '../utils/logger';

const log = getLogger('claude');

export interface ClaudeClientOptions {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  requestTimeoutMs: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
}

export interface GenerateInput {
  system: string;
  user: string;
}

export interface GenerateOutput {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  stopReason: string | null;
}

export interface IClaudeClient {
  generate(input: GenerateInput): Promise<GenerateOutput>;
}

export class ClaudeClient implements IClaudeClient {
  private readonly sdk: Anthropic;
  private readonly opts: ClaudeClientOptions;
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(opts: ClaudeClientOptions) {
    this.opts = opts;
    this.sdk = new Anthropic({ apiKey: opts.apiKey, timeout: opts.requestTimeoutMs });
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const result = await retry(
      () =>
        this.sdk.messages.create({
          model: this.opts.model,
          max_tokens: this.opts.maxTokens,
          temperature: this.opts.temperature,
          system: input.system,
          messages: [{ role: 'user', content: input.user }],
        }),
      {
        maxRetries: this.opts.maxRetries,
        baseMs: this.opts.backoffBaseMs,
        maxMs: this.opts.backoffMaxMs,
        isRetriable: isRetriableHttpError,
        onRetry: ({ attempt, delayMs, err }) => {
          log.warn({ attempt, delayMs, err: (err as Error)?.message }, 'retrying claude call');
        },
      },
    );

    this.totalInputTokens += result.usage.input_tokens;
    this.totalOutputTokens += result.usage.output_tokens;

    const text = result.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('');

    return {
      text,
      usage: { inputTokens: result.usage.input_tokens, outputTokens: result.usage.output_tokens },
      stopReason: result.stop_reason,
    };
  }

  totals(): { inputTokens: number; outputTokens: number } {
    return { inputTokens: this.totalInputTokens, outputTokens: this.totalOutputTokens };
  }
}

/**
 * Drop-in test double. Used in unit/integration tests and dry-run mode.
 */
export class FakeClaudeClient implements IClaudeClient {
  private readonly responder: (input: GenerateInput) => string;
  private callCount = 0;

  constructor(responder: (input: GenerateInput) => string) {
    this.responder = responder;
  }

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    this.callCount += 1;
    const text = this.responder(input);
    return {
      text,
      usage: { inputTokens: input.user.length / 4, outputTokens: text.length / 4 },
      stopReason: 'end_turn',
    };
  }

  calls(): number {
    return this.callCount;
  }
}

import type { LlmProvider } from "@workspace/contracts";
import { AnthropicClient } from "./adapters/anthropic.js";
import { GeminiClient } from "./adapters/gemini.js";
import { OpenAIResponsesClient } from "./adapters/openai.js";
import { OpenRouterClient } from "./adapters/openrouter.js";
import type { LlmClient } from "./types.js";

/** Build a client for a provider with an explicit key. */
export function getLlmClient(provider: LlmProvider, apiKey: string): LlmClient {
  switch (provider) {
    case "anthropic":
      return new AnthropicClient(apiKey);
    case "openai":
      return new OpenAIResponsesClient(apiKey);
    case "gemini":
      return new GeminiClient(apiKey);
    case "openrouter":
      return new OpenRouterClient(apiKey);
  }
}

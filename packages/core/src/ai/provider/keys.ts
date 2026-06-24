import type { LlmProvider, ProviderCatalog } from "@workspace/contracts";
import { getUserApiKey } from "../../core/keys.js";
import { getEnv } from "../../core/config.js";
import {
  DEFAULT_MODEL,
  LLM_MODELS,
  PROVIDERS,
  PROVIDER_LABELS,
  providerForModel,
} from "./catalog.js";
import { getLlmClient } from "./factory.js";

// Key resolution, model selection, env availability, and the client-facing model
// catalog. The split is: catalog.ts owns *what* models exist; this owns *whether*
// a user can run them (keys present) and *which* model a run resolves to.

/**
 * Pick the key for a provider: the user's own key wins, the server env key is
 * the fallback. `source` lets the UI show where the active key came from.
 */
export async function resolveLlmKey(
  userId: string,
  provider: LlmProvider
): Promise<{ key: string | null; source: "user" | "env" | null }> {
  const userKey = await getUserApiKey(userId, provider);
  if (userKey) return { key: userKey, source: "user" };
  const envKey = getEnv(PROVIDERS[provider].envKey);
  if (envKey) return { key: envKey, source: "env" };
  return { key: null, source: null };
}

/**
 * Resolve which model + key a server-side run (e.g. tabular run_cell) should use,
 * with errors that say how to fix it. A requested model must be a known catalog id
 * or an OpenRouter "vendor/model", and its provider must have a configured key.
 * With no request, prefer DEFAULT_MODEL, else the first catalog model whose
 * provider has a key — so a firm that configured any one provider's key just works.
 */
export async function resolveRunModel(
  userId: string,
  requested?: string
): Promise<{ model: string; key: string }> {
  if (requested) {
    const known = LLM_MODELS.some((m) => m.id === requested) || requested.includes("/");
    if (!known) {
      const sample = LLM_MODELS.slice(0, 4)
        .map((m) => m.id)
        .join(", ");
      throw new Error(
        `Unknown model "${requested}". Use a model id (e.g. ${sample}) or an OpenRouter "vendor/model".`
      );
    }
    const provider = providerForModel(requested);
    const { key } = await resolveLlmKey(userId, provider);
    if (!key)
      throw new Error(
        `No ${provider} API key configured — add one in Settings, or use a model for a provider you've configured.`
      );
    return { model: requested, key };
  }
  // No model requested: try DEFAULT_MODEL first, then any catalog model whose
  // provider has a key. Cache per provider so we don't re-look-up shared providers.
  const keyCache = new Map<LlmProvider, string | null>();
  const keyFor = async (p: LlmProvider): Promise<string | null> => {
    if (!keyCache.has(p)) keyCache.set(p, (await resolveLlmKey(userId, p)).key);
    return keyCache.get(p)!;
  };
  const ordered = [
    DEFAULT_MODEL,
    ...LLM_MODELS.map((m) => m.id).filter((id) => id !== DEFAULT_MODEL),
  ];
  for (const model of ordered) {
    const key = await keyFor(providerForModel(model));
    if (key) return { model, key };
  }
  throw new Error(
    "No LLM key configured — add one in Settings (Anthropic / OpenAI / Gemini / OpenRouter)."
  );
}

// ---- Boot-time env probe ----

// Which providers the server can serve from its own env keys. Computed once at
// boot by probeEnvProviders() and read by the /api/models endpoint to mark
// models whose provider has no key as unavailable.
let envProbe: Record<LlmProvider, boolean> | null = null;

/**
 * Try to build a client from each provider's env key. A missing key (or a key
 * the SDK rejects on construction) leaves that provider unavailable. Runs once
 * at boot; result cached. This is a presence check — it does not call the API.
 */
export function probeEnvProviders(): Record<LlmProvider, boolean> {
  const out = {} as Record<LlmProvider, boolean>;
  for (const provider of Object.keys(PROVIDERS) as LlmProvider[]) {
    const key = getEnv(PROVIDERS[provider].envKey);
    if (!key) {
      out[provider] = false;
      continue;
    }
    try {
      getLlmClient(provider, key);
      out[provider] = true;
    } catch {
      out[provider] = false;
    }
  }
  envProbe = out;
  return out;
}

/** Cached env probe; probes lazily on first read if boot never ran it. */
export function envProviderStatus(): Record<LlmProvider, boolean> {
  return envProbe ?? probeEnvProviders();
}

/**
 * The full model catalog for a user: every provider grouped with its models,
 * availability, and key source. OpenRouter carries no models (it's searched live
 * via searchOpenRouterModels) but is still included so the picker knows whether an
 * OpenRouter key exists and can grey out OpenRouter results when it doesn't.
 */
export async function buildModelCatalog(userId: string): Promise<ProviderCatalog[]> {
  const providers = Object.keys(PROVIDERS) as LlmProvider[];
  return Promise.all(
    providers.map(async (provider) => {
      const { source } = await resolveLlmKey(userId, provider);
      return {
        provider,
        label: PROVIDER_LABELS[provider],
        available: source !== null,
        source,
        models: LLM_MODELS.filter((m) => m.provider === provider),
      };
    })
  );
}

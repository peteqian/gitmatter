import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

// Shared query hooks. Query keys are centralized here so loaders (via
// queryClient.ensureQueryData) and components hit the same cache entry.

export const queryKeys = {
  models: ["models"] as const,
  matters: ["matters"] as const,
  documents: ["documents"] as const,
  contracts: ["contracts"] as const,
  clients: ["clients"] as const,
  reviews: ["reviews"] as const,
  chats: ["chats"] as const,
  client: (id: string) => ["client", id] as const,
};

// Conversation list for the sidebar. Client-side (react-query) like the other
// lists — a route loader would fetch with a relative URL that fails under SSR.
export function useChats() {
  return useQuery({
    queryKey: queryKeys.chats,
    queryFn: () => api.listChats(),
  });
}

// The provider catalog is fetched by both pickers in the composer; react-query
// dedupes the two mounts into one request and caches it.
export function useModelCatalog() {
  return useQuery({
    queryKey: queryKeys.models,
    queryFn: () => api.listModels(),
  });
}

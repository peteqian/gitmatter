import { useQuery } from "@tanstack/react-query";
import { api } from "./api";

// Shared query hooks. Query keys are centralized here so loaders (via
// queryClient.ensureQueryData) and components hit the same cache entry.

export const queryKeys = {
  models: ["models"] as const,
  matters: ["matters"] as const,
  documents: ["documents"] as const,
  documentsPage: (params: unknown) => ["documents", "page", params] as const,
  clients: ["clients"] as const,
  clientsPage: (params: unknown) => ["clients", "page", params] as const,
  reviews: ["reviews"] as const,
  reviewsPage: (params: unknown) => ["reviews", "page", params] as const,
  workflows: ["workflows"] as const,
  workflowsPage: (params: unknown) => ["workflows", "page", params] as const,
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

// Document + client lists, shared by their routes and the sidebar's recent
// panels. Same cache entry as the route loaders/components.
export function useDocuments() {
  return useQuery({
    queryKey: queryKeys.documents,
    queryFn: () => api.listDocuments(),
  });
}

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: () => api.listClients(),
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

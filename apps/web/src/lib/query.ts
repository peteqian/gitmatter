import { QueryClient } from "@tanstack/react-query";

// One client for the whole app. Route loaders call `queryClient.ensureQueryData`
// outside the React tree, so the instance has to be a module singleton — the
// same one the QueryClientProvider hands to components.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reads are firm-wide and change rarely; don't refetch on every mount.
      staleTime: 30_000,
      retry: 1,
    },
  },
});

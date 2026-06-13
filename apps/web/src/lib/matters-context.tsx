import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type MatterListItem } from "./api";
import { queryKeys } from "./queries";

type MattersContext = {
  matters: MatterListItem[];
  current: MatterListItem | null;
  setCurrent: (matterId: string) => void;
  refresh: () => void;
};

const Ctx = createContext<MattersContext | null>(null);
const STORAGE_KEY = "workingMatter";

/**
 * Tracks the firm's matters and which one is "current" — the working matter new
 * artifacts (reviews, contracts, documents) are filed under. The choice is
 * remembered in localStorage. Read lists stay firm-wide for now.
 */
export function MattersProvider({ children }: { children: React.ReactNode }) {
  const { data: matters = [], refetch } = useQuery({
    queryKey: queryKeys.matters,
    queryFn: () => api.listMatters(),
  });
  const [currentId, setCurrentId] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
  );

  const refresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const setCurrent = useCallback((matterId: string) => {
    setCurrentId(matterId);
    localStorage.setItem(STORAGE_KEY, matterId);
  }, []);

  const current = useMemo(() => {
    if (!matters.length) return null;
    return matters.find((m) => m.matter.id === currentId) ?? matters[0]!;
  }, [matters, currentId]);

  // If the stored matter is gone (access lost / closed), persist the fallback so
  // localStorage doesn't keep a dead id around.
  useEffect(() => {
    if (currentId && matters.length && !matters.some((m) => m.matter.id === currentId)) {
      setCurrent(matters[0]!.matter.id);
    }
  }, [currentId, matters, setCurrent]);

  const value = useMemo(
    () => ({ matters, current, setCurrent, refresh }),
    [matters, current, setCurrent, refresh]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMatters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMatters must be used within MattersProvider");
  return ctx;
}

/** The current working matter's id, for filing new artifacts. */
export function useWorkingMatterId() {
  return useMatters().current?.matter.id;
}

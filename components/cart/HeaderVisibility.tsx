"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface HeaderVisibilityValue {
  /** True when the header is translated out by the hide-on-scroll logic. */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const HeaderVisibilityContext = createContext<HeaderVisibilityValue | null>(null);

/**
 * Shares the header's hidden-by-scroll state with the floating cart pill. The
 * header owns the scroll logic and writes here; it does not keep a copy.
 */
export function HeaderVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);
  return (
    <HeaderVisibilityContext.Provider value={value}>
      {children}
    </HeaderVisibilityContext.Provider>
  );
}

export function useHeaderVisibility(): HeaderVisibilityValue {
  const ctx = useContext(HeaderVisibilityContext);
  if (!ctx) throw new Error("useHeaderVisibility must be used inside <HeaderVisibilityProvider>");
  return ctx;
}

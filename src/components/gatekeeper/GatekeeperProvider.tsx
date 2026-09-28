"use client";

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useGatekeeperStore } from "./useGatekeeperStore";
import { useHasHydrated } from "./useHasHydrated";
import { RecruiterModal } from "./RecruiterModal";
import { SplitScreenPanel } from "./SplitScreenPanel";
import { FloatingCatPill } from "./FloatingCatPill";

export function GatekeeperProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useHasHydrated();
  const hasAnswered = useGatekeeperStore((state) => state.hasAnswered);
  const isExpanded = useGatekeeperStore((state) => state.isExpanded);

  const showModal = hasHydrated && !hasAnswered;
  const gated = hasHydrated && hasAnswered && !isExpanded;

  useEffect(() => {
    document.body.style.overflow = showModal || gated ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal, gated]);

  return (
    <div className="relative">
      <div
        className={cn(
          "min-h-screen",
          (showModal || gated) && "h-screen overflow-hidden blur-sm",
          gated && "md:pr-[380px]"
        )}
      >
        {children}
      </div>

      {gated && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent md:right-[380px]" />
      )}

      {gated && <SplitScreenPanel />}
      {hasHydrated && isExpanded && <FloatingCatPill />}

      <AnimatePresence>{showModal && <RecruiterModal />}</AnimatePresence>
    </div>
  );
}

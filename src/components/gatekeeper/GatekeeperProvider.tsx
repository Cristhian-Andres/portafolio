"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useGatekeeperStore } from "./useGatekeeperStore";
import { useHasHydrated } from "./useHasHydrated";
import { useIsDesktop } from "./useIsDesktop";
import { RecruiterModal } from "./RecruiterModal";
import { SplitScreenPanel } from "./SplitScreenPanel";
import { FloatingCatPill } from "./FloatingCatPill";

export function GatekeeperProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useHasHydrated();
  const hasAnswered = useGatekeeperStore((state) => state.hasAnswered);
  const isExpanded = useGatekeeperStore((state) => state.isExpanded);

  const showModal = hasHydrated && !hasAnswered;
  const isDesktop = useIsDesktop();
  // En escritorio hay panel lateral; en móvil solo la píldora, para no tapar el Hero.
  const docked = hasHydrated && hasAnswered && !isExpanded && isDesktop;
  const showPill = hasHydrated && hasAnswered && (isExpanded || !isDesktop);

  // Al cerrarse el modal el foco debe volver al contenido, no perderse.
  const wasModalOpen = useRef(false);
  useEffect(() => {
    if (wasModalOpen.current && !showModal) document.getElementById("main")?.focus({ preventScroll: true });
    wasModalOpen.current = showModal;
  }, [showModal]);

  // Solo se bloquea el scroll mientras el modal está abierto.
  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  return (
    <div className="relative">
      {/* El contenido siempre está en el HTML; `inert` lo saca del foco mientras el modal está abierto. */}
      <div
        inert={showModal}
        className={cn(
          "transition-[padding] duration-500",
          docked && "md:pr-[380px]"
        )}
      >
        {children}
      </div>

      {docked && <SplitScreenPanel />}
      {showPill && <FloatingCatPill />}

      <AnimatePresence>{showModal && <RecruiterModal />}</AnimatePresence>
    </div>
  );
}

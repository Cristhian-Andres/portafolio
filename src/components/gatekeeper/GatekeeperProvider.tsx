"use client";

import { useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";
import { useGatekeeperStore } from "./useGatekeeperStore";
import { useHasHydrated } from "./useHasHydrated";
import { IntroGate } from "./IntroGate";
import { FloatingMailButton } from "./FloatingMailButton";

export function GatekeeperProvider({ children }: { children: ReactNode }) {
  const hasHydrated = useHasHydrated();
  const hasAnswered = useGatekeeperStore((state) => state.hasAnswered);
  const unlocking = useGatekeeperStore((state) => state.unlocking);

  // La introducción sigue visible mientras se envía el evento a GTM, justo antes de recargar.
  const showGate = hasHydrated && (!hasAnswered || unlocking);
  const showMailButton = hasHydrated && hasAnswered && !unlocking;

  useEffect(() => {
    document.body.style.overflow = showGate ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showGate]);

  return (
    <div className="relative">
      {/* Cubre la página hasta saber si ya pasó por la introducción: evita el destello del
          contenido completo antes de que aparezca. El contenido sigue en el HTML. */}
      {!hasHydrated && (
        <div aria-hidden="true" className="gate-veil fixed -inset-px z-[45] bg-white" />
      )}
      <noscript>
        <style>{".gate-veil{display:none}"}</style>
      </noscript>

      {/* `inert` saca el contenido del foco y de los lectores mientras la introducción está abierta. */}
      <div inert={showGate}>{children}</div>

      {showMailButton && <FloatingMailButton />}

      <AnimatePresence>{showGate && <IntroGate />}</AnimatePresence>
    </div>
  );
}

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { GATEKEEPER_STORAGE_KEY, UNLOCK_GRACE_MS } from "@/lib/constants";

/** `unknown`: cerró la introducción con Escape sin elegir ningún botón. */
export type Audience = "recruiter" | "curious" | "unknown";

interface GatekeeperState {
  /** Eligió un botón hace instantes y esta carga es la recarga que desbloquea todo. */
  hasAnswered: boolean;
  audience: Audience | null;
  /** Momento (ms) en que eligió; sirve para saber si la recarga es la de desbloqueo. */
  answeredAt: number | null;
  /** Eligió un botón y se está enviando el evento a GTM antes de recargar (no se guarda). */
  unlocking: boolean;
  startUnlock: () => void;
  complete: (audience: Audience, now?: number) => void;
}

type Persisted = Partial<Pick<GatekeeperState, "hasAnswered" | "audience" | "answeredAt">>;

/**
 * Decide qué estado guardado se recupera al cargar. Solo vale la respuesta recién dada
 * (la recarga que desbloquea todo); una más antigua, de otra versión del sitio o con la hora
 * corrompida se descarta, y entonces se vuelve a mostrar la introducción.
 */
export function mergeGateState<T extends GatekeeperState>(
  persisted: unknown,
  current: T,
  now: number = Date.now()
): T {
  const saved = (persisted ?? {}) as Persisted;
  const age = typeof saved.answeredAt === "number" ? now - saved.answeredAt : NaN;
  const isRecent = saved.hasAnswered === true && age >= 0 && age < UNLOCK_GRACE_MS;
  if (!isRecent) return current;
  return { ...current, hasAnswered: true, audience: saved.audience ?? null, answeredAt: saved.answeredAt ?? null };
}

export const useGatekeeperStore = create<GatekeeperState>()(
  persist(
    (set) => ({
      hasAnswered: false,
      audience: null,
      answeredAt: null,
      unlocking: false,
      startUnlock: () => set({ unlocking: true }),
      complete: (audience, now = Date.now()) => set({ hasAnswered: true, audience, answeredAt: now }),
    }),
    {
      name: GATEKEEPER_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        hasAnswered: state.hasAnswered,
        audience: state.audience,
        answeredAt: state.answeredAt,
      }),
      merge: (persisted, current) => mergeGateState(persisted, current),
    }
  )
);

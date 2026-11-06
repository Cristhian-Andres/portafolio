"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { InstagramIcon, LinkedinIcon } from "@/components/icons/BrandIcons";
import { GmailLink } from "@/components/ui/GmailLink";
import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";
import type { Audience } from "./useGatekeeperStore";

/** Tiempo que pasa, tras elegir, antes de mostrar la tarjeta (igual para las dos audiencias). */
export const NUDGE_DELAY_MS = 3_000;
/** Cuánto dura la reacción triste del reclutador al cerrar, antes de que la tarjeta desaparezca. */
export const NUDGE_SAD_MS = 1_100;
/** Cierre normal (curioso): solo se desvanece. */
export const NUDGE_FADE_MS = 250;

const SEEN_KEY = "portfolio-nudge-seen";

const linkedinUrl = profile.socialLinks.find((link) => link.icon === "linkedin")?.url;
const instagramUrl = profile.socialLinks.find((link) => link.icon === "instagram")?.url;

/**
 * Tarjeta flotante, no intrusiva, que aparece una sola vez por cada elección (a los 3 s de elegir):
 * - Reclutador: invita a escribir. Si la cierra, se pone triste (emoji, texto y la tarjeta se «desinfla»).
 * - Curioso: invita a seguir en redes. Si la cierra, simplemente se va, sin drama.
 * Nunca bloquea la página.
 */
export function PersuasionNudge({
  audience,
  answeredAt,
}: {
  audience: Audience;
  /** Momento de la elección: cada elección nueva vuelve a mostrar la tarjeta una vez. */
  answeredAt: number | null;
}) {
  const reduced = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const dismissRef = useRef<() => void>(() => undefined);
  const leaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sad = audience === "recruiter";
  const choiceId = String(answeredAt ?? "");

  useEffect(() => {
    if (audience === "unknown") return;
    const id = setTimeout(() => {
      try {
        if (sessionStorage.getItem(SEEN_KEY) === choiceId) return; // ya se mostró para esta elección
        sessionStorage.setItem(SEEN_KEY, choiceId);
      } catch {
        /* sin almacenamiento: se muestra igualmente */
      }
      setVisible(true);
    }, NUDGE_DELAY_MS);
    return () => clearTimeout(id);
  }, [audience, choiceId]);

  useEffect(() => {
    dismissRef.current = dismiss;
  });

  // Modal de verdad: mientras está abierto no se desplaza la página, Escape lo cierra y el foco entra en él.
  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [visible]);

  useEffect(
    () => () => {
      if (leaveTimeout.current) clearTimeout(leaveTimeout.current);
    },
    []
  );

  function dismiss() {
    if (leaving) return;
    if (reduced) {
      setVisible(false);
      return;
    }
    setLeaving(true);
    leaveTimeout.current = setTimeout(() => setVisible(false), sad ? NUDGE_SAD_MS : NUDGE_FADE_MS);
  }

  if (audience === "unknown") return null;
  const mourning = leaving && sad;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-persuasion-backdrop=""
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: leaving ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={
            leaving
              ? {
                  duration: (mourning ? NUDGE_SAD_MS * 0.4 : NUDGE_FADE_MS) / 1000,
                  delay: mourning ? (NUDGE_SAD_MS * 0.6) / 1000 : 0,
                  ease: "easeOut",
                }
              : { duration: 0.3, ease: "easeOut" }
          }
          onClick={dismiss}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm"
        >
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-label={audience === "recruiter" ? "Hablemos" : "Sígueme"}
            tabIndex={-1}
            data-persuasion-nudge=""
            data-audience={audience}
            data-leaving={leaving ? (sad ? "sad" : "fade") : undefined}
            onClick={(event) => event.stopPropagation()}
            initial={reduced ? false : { opacity: 0, y: 24, scale: 0.92 }}
            animate={
              mourning
                ? { opacity: 1, y: 26, scale: 0.9, rotate: -3 }
                : leaving
                  ? { opacity: 1, y: 8, scale: 0.96, rotate: 0 }
                  : { opacity: 1, y: 0, scale: 1, rotate: 0 }
            }
            transition={{ duration: mourning ? NUDGE_SAD_MS / 1000 : 0.3, ease: "easeOut" }}
            className={cn(
              "relative w-[min(22rem,100%)] rounded-3xl border border-accent/50 bg-surface p-6 shadow-2xl shadow-accent-solid/25 outline-none",
              mourning && "grayscale"
            )}
          >
          <button
            type="button"
            onClick={dismiss}
            disabled={leaving}
            aria-label="Cerrar"
            className={cn(
              "absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-base text-muted transition-colors hover:text-foreground",
              mourning && "text-lg"
            )}
          >
            {mourning ? "😭" : "✕"}
          </button>

          {audience === "recruiter" ? (
            <>
              <p className="pr-8 text-xl font-extrabold leading-snug text-foreground">
                {mourning ? "Entonces me voy triste… 😢" : "¿Me vas a contratar? 👀"}
              </p>
              <p className="mt-1 text-sm text-muted">
                {mourning ? "Si cambias de opinión, aquí estaré." : "Hablemos, tengo justo lo que buscas."}
              </p>
              <GmailLink className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-solid px-4 py-2 text-sm font-semibold text-on-accent transition-transform hover:-translate-y-0.5">
                Contrátame 💼
              </GmailLink>
            </>
          ) : (
            <>
              <p className="pr-8 text-xl font-extrabold leading-snug text-foreground">Sígueme 👀</p>
              <p className="mt-1 text-sm text-muted">Más de mí, fuera del portafolio.</p>
              <div className="mt-3 flex items-center gap-3">
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn"
                    className="rounded-full bg-background p-2 text-muted transition-colors hover:text-accent"
                  >
                    <LinkedinIcon className="h-5 w-5" />
                  </a>
                )}
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="rounded-full bg-background p-2 text-muted transition-colors hover:text-accent"
                  >
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
            </>
          )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

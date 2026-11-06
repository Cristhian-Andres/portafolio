"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { InstagramIcon, LinkedinIcon } from "@/components/icons/BrandIcons";
import { GmailLink } from "@/components/ui/GmailLink";
import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";
import type { Audience } from "./useGatekeeperStore";

/** Tiempo en pantalla antes de mostrar la tarjeta, para no interrumpir la primera impresión. */
export const NUDGE_DELAY_MS = 20_000;
/** Cuánto dura el emoji llorando al cerrar, antes de que la tarjeta desaparezca. */
export const NUDGE_CRY_MS = 550;

const SEEN_KEY = "portfolio-nudge-seen";

const linkedinUrl = profile.socialLinks.find((link) => link.icon === "linkedin")?.url;
const instagramUrl = profile.socialLinks.find((link) => link.icon === "instagram")?.url;

/**
 * Tarjeta flotante, no intrusiva, que aparece una sola vez por sesión: refuerza con un
 * segundo toque la diferencia entre audiencias (el destino es el mismo, el gesto no).
 * Reclutador: invita a escribir. Curioso: invita a seguir en redes. Nunca bloquea la página.
 */
export function PersuasionNudge({ audience }: { audience: Audience }) {
  const reduced = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(false);
  const [crying, setCrying] = useState(false);
  const [overFooter, setOverFooter] = useState(false);
  const cryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (audience === "unknown") return;
    if (sessionStorage.getItem(SEEN_KEY) === "1") return;
    const id = setTimeout(() => setVisible(true), NUDGE_DELAY_MS);
    return () => clearTimeout(id);
  }, [audience]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOverFooter(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (cryTimeout.current) clearTimeout(cryTimeout.current);
  }, []);

  function dismiss() {
    sessionStorage.setItem(SEEN_KEY, "1");
    if (reduced) {
      setVisible(false);
      return;
    }
    setCrying(true);
    cryTimeout.current = setTimeout(() => setVisible(false), NUDGE_CRY_MS);
  }

  if (audience === "unknown") return null;

  return (
    <AnimatePresence>
      {visible && !overFooter && (
        <motion.div
          data-persuasion-nudge=""
          data-audience={audience}
          initial={reduced ? false : { opacity: 0, y: 16, scale: 0.92 }}
          animate={{
            opacity: crying ? 0 : 1,
            y: crying ? 20 : 0,
            scale: crying ? 0.85 : 1,
          }}
          exit={{ opacity: 0, y: 16, scale: 0.92 }}
          transition={{ duration: crying ? NUDGE_CRY_MS / 1000 : 0.3, ease: "easeOut" }}
          className="fixed bottom-4 left-4 z-40 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-accent/50 bg-surface/95 p-4 shadow-xl shadow-accent-solid/20 backdrop-blur"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar"
            className={cn(
              "absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-base text-muted transition-colors hover:text-foreground",
              crying && "text-lg"
            )}
          >
            {crying ? "😭" : "✕"}
          </button>

          {audience === "recruiter" ? (
            <>
              <p className="pr-7 text-lg font-extrabold leading-snug text-foreground">
                ¿Me vas a contratar? 👀
              </p>
              <p className="mt-1 text-sm text-muted">Hablemos, tengo justo lo que buscas.</p>
              <GmailLink className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-solid px-4 py-2 text-sm font-semibold text-on-accent transition-transform hover:-translate-y-0.5">
                Contrátame 💼
              </GmailLink>
            </>
          ) : (
            <>
              <p className="pr-7 text-lg font-extrabold leading-snug text-foreground">Sígueme 👀</p>
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
      )}
    </AnimatePresence>
  );
}

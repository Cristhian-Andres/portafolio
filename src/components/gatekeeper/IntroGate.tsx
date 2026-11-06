"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { profile } from "@/data/profile";
import { GATE_EVENTS, pushEvent, trackThen } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { INTRO_ROLE, buildIntroLines, totalChars, visibleLines } from "./introContent";
import { useGatekeeperStore } from "./useGatekeeperStore";
import type { Audience } from "./useGatekeeperStore";

export const TYPE_INTERVAL_MS = 10;
export const CHARS_PER_TICK = 4;
export const HOLD_AFTER_TYPING_MS = 300;
export const CUT_DURATION_MS = 550;
/** Tiempo mínimo que se ve el mensaje de «revelación» tras elegir, antes de recargar. */
export const REVEAL_MIN_MS = 1400;
/** Palabra central de cada frase primero, el resto se abre hacia afuera. */
export const REVEAL_WORD_STAGGER_MS = 90;

export type Stage = "typing" | "cut" | "question";

// Borde irregular de papel cortado (px en vertical para que no dependa de la altura).
const TEETH = 24;
const JAGGED = `polygon(${Array.from({ length: TEETH + 1 }, (_, i) => `${(i / TEETH) * 100}% ${i % 2 === 0 ? "0px" : "9px"}`).join(",")},100% 100%,0 100%)`;

/**
 * La introducción es SIEMPRE blanca, sin importar el tema del sitio (oscuro por defecto).
 * Se fijan aquí los colores de las variables que usan el anillo de foco y los controles.
 */
const LIGHT_THEME_LOCK = {
  "--background": "#ffffff",
  "--foreground": "#0f172a",
  "--accent": "#3f6212",
  "--accent-2": "#0f766e",
  colorScheme: "light",
} as CSSProperties;

const EVENT_BY_AUDIENCE: Record<Audience, string> = {
  recruiter: GATE_EVENTS.recruiter,
  curious: GATE_EVENTS.curious,
  unknown: GATE_EVENTS.dismiss,
};

/** Mensaje de transición tras elegir: la diferencia real entre las dos opciones (el destino es el mismo). */
const REVEAL_MESSAGE: Record<"recruiter" | "curious", string> = {
  recruiter: "Ahora te muestro todo mi potencial",
  curious: "Bienvenido a mi mundo",
};

/** Revela `text` palabra por palabra, de adentro hacia afuera (la central primero). */
function RevealMessage({ text, reduced }: { text: string; reduced: boolean }) {
  const words = text.split(" ");
  const center = (words.length - 1) / 2;
  return (
    <h2 className="text-2xl font-extrabold leading-snug text-slate-900 sm:text-3xl">
      {words.map((word, index) => (
        <Fragment key={index}>
          <motion.span
            data-reveal-word=""
            className="inline-block"
            initial={reduced ? false : { opacity: 0, scale: 0.55, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{
              duration: reduced ? 0 : 0.45,
              delay: reduced ? 0 : Math.abs(index - center) * (REVEAL_WORD_STAGGER_MS / 1000),
              ease: "easeOut",
            }}
          >
            {word}
          </motion.span>
          {/* El espacio va FUERA del bloque: al final de un inline-block se colapsa y las palabras quedaban pegadas. */}
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </h2>
  );
}

function useIntroSequence(total: number, reduced: boolean) {
  const [stage, setStage] = useState<Stage>("typing");
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (stage !== "typing") return;
    const id = setInterval(
      () => setTyped((value) => Math.min(total, value + CHARS_PER_TICK)),
      TYPE_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [stage, total]);

  useEffect(() => {
    if (stage !== "typing" || typed < total) return;
    const id = setTimeout(() => setStage("cut"), HOLD_AFTER_TYPING_MS);
    return () => clearTimeout(id);
  }, [stage, typed, total]);

  useEffect(() => {
    if (stage !== "cut") return;
    const id = setTimeout(() => setStage("question"), CUT_DURATION_MS);
    return () => clearTimeout(id);
  }, [stage]);

  // Con «reducir movimiento» se muestra directamente la pregunta (estado derivado, sin efecto).
  if (reduced) return { stage: "question" as Stage, typed: total };

  return { stage, typed };
}

export function IntroGate() {
  const reduced = useReducedMotion() ?? false;
  const startUnlock = useGatekeeperStore((state) => state.startUnlock);
  const complete = useGatekeeperStore((state) => state.complete);
  const unlocking = useGatekeeperStore((state) => state.unlocking);

  const lines = useMemo(() => buildIntroLines(), []);
  const total = useMemo(() => totalChars(lines), [lines]);
  const { stage, typed } = useIntroSequence(total, reduced);

  const [chosen, setChosen] = useState<Audience | null>(null);
  const chosenRef = useRef<Audience | null>(null);
  const viewSentRef = useRef(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [revealAudience, setRevealAudience] = useState<"recruiter" | "curious" | null>(null);

  // Cuenta la visita: una vez por carga de página.
  useEffect(() => {
    if (viewSentRef.current) return;
    viewSentRef.current = true;
    pushEvent(GATE_EVENTS.view, { gate_step: "intro" });
  }, []);

  function choose(audience: Audience) {
    if (chosenRef.current) return;
    chosenRef.current = audience;
    setChosen(audience);
    startUnlock();
    // Con un botón real se ve el mensaje de revelación; con Escape (sin elegir) no aplica.
    if (audience !== "unknown") setRevealAudience(audience);
    const revealStart = Date.now();
    // El evento se envía a GTM y, cuando confirma (o vence el tiempo), se guarda y recarga —
    // sin cortar el mensaje de revelación antes de su tiempo mínimo de lectura.
    trackThen(EVENT_BY_AUDIENCE[audience], { audience, gate_step: stage }, () => {
      const minWait = audience === "unknown" || reduced ? 0 : REVEAL_MIN_MS;
      const wait = Math.max(0, minWait - (Date.now() - revealStart));
      window.setTimeout(() => {
        complete(audience);
        window.location.reload();
      }, wait);
    });
  }

  // El foco entra al diálogo y queda atrapado en él; Escape lo cierra sin elegir (accesibilidad).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.focus();
    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled])"));

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        choose("unknown");
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // `choose` solo usa refs y el store: no necesita volver a registrarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al llegar la pregunta, el foco pasa al primer botón de respuesta.
  useEffect(() => {
    if (stage !== "question") return;
    dialogRef.current?.querySelector<HTMLElement>("[data-gate-answer]")?.focus();
  }, [stage]);

  const shown = visibleLines(lines, typed);
  const cutOn = stage === "cut" || stage === "question";
  const busy = unlocking || chosen !== null;
  const percent = total === 0 ? 100 : Math.round((typed / total) * 100);

  return (
    <motion.div
      data-intro-gate=""
      style={LIGHT_THEME_LOCK}
      className="fixed -inset-px z-50 flex items-center justify-center bg-white px-4"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="¿Qué haces aquí? Elige cómo quieres ver mi portafolio"
        tabIndex={-1}
        style={{ outline: "none" }}
        className="relative w-full max-w-md"
      >
        <p className="sr-only">
          {profile.name}, {INTRO_ROLE}. Elige una opción para ver todo mi portafolio.
        </p>

        {revealAudience ? (
          <div
            data-stage="reveal"
            className="flex h-[min(34rem,86dvh)] flex-col items-center justify-center gap-3 px-2 text-center"
          >
            <RevealMessage text={REVEAL_MESSAGE[revealAudience]} reduced={reduced} />
          </div>
        ) : (
        /* La hoja de vida: se «escribe» sola y luego se corta. Siempre blanca. */
        <article className="relative h-[min(34rem,86dvh)] overflow-hidden rounded-xl bg-white text-slate-800 shadow-[0_18px_44px_-30px_rgba(15,23,42,0.28)] ring-1 ring-slate-200">
          <header aria-hidden="true" className="relative h-36">
            <div
              className="absolute inset-y-0 left-0 w-[46%] bg-gradient-to-br from-[#a3e635] to-[#14b8a6]"
              style={{ clipPath: "polygon(0 0, 100% 0, 70% 100%, 0 100%)" }}
            />
            <div className="absolute right-0 top-0 h-2 w-[55%] bg-gradient-to-r from-[#a3e635] to-[#14b8a6]" />
            <Image
              src={profile.photoSrc}
              alt=""
              width={96}
              height={96}
              className="absolute left-5 top-6 h-24 w-24 rounded-full object-cover ring-4 ring-white"
            />
            <div className="absolute right-5 top-8 w-[46%]">
              <p className="text-xl font-extrabold uppercase leading-tight tracking-tight text-slate-900">
                Cristhian
                <br />
                Luna
              </p>
              <p
                data-intro-role=""
                className="mt-1.5 text-[10px] font-semibold uppercase leading-snug tracking-wider text-slate-500"
              >
                {INTRO_ROLE}
              </p>
            </div>
          </header>

          <div aria-hidden="true" className="mx-5 border-t border-slate-200 pt-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-teal-700">
              • Experiencia
            </p>
            <div className="mt-2 space-y-1.5">
              {shown.map((line, index) => (
                <p
                  key={index}
                  className={cn(
                    "min-h-[1em] leading-snug",
                    line.kind === "role" && "text-xs font-bold text-slate-900",
                    line.kind === "meta" && "text-[10px] font-medium text-slate-500",
                    line.kind === "bullet" && "pl-3 text-[11px] text-slate-600"
                  )}
                >
                  {line.kind === "bullet" && line.text && (
                    <span className="-ml-3 mr-1.5 text-teal-600">▸</span>
                  )}
                  {line.text}
                  {line.typing && (
                    <span className="ml-0.5 inline-block w-px animate-pulse bg-slate-700">&nbsp;</span>
                  )}
                </p>
              ))}
            </div>
          </div>

          {/* Indicador de carga mientras el perfil se escribe. */}
          {stage === "typing" && (
            <div
              data-intro-loader=""
              role="status"
              aria-live="polite"
              className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-2.5 px-8"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#65a30d] motion-reduce:animate-none"
                />
                Cargando perfil…
              </div>
              <div
                role="progressbar"
                aria-label="Progreso de carga del perfil"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percent}
                className="h-1 w-44 overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#a3e635] to-[#14b8a6]"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}

          {/* El corte: una hoja en blanco con borde irregular sube y «se come» el CV. */}
          <motion.div
            data-stage={stage}
            className={cn("absolute inset-x-0 bottom-0", stage === "typing" && "invisible")}
            initial={false}
            animate={{ height: cutOn ? "62%" : "0%" }}
            transition={{
              duration: reduced ? 0 : CUT_DURATION_MS / 1000,
              ease: [0.7, 0, 0.3, 1],
            }}
          >
            <div className="absolute inset-0 -top-1 bg-slate-200" style={{ clipPath: JAGGED }} />
            <div className="absolute inset-0 bg-white" style={{ clipPath: JAGGED }} />

            {stage === "cut" && !reduced && (
              <motion.span
                aria-hidden="true"
                className="absolute -top-3 z-10 text-xl"
                initial={{ left: "-4%" }}
                animate={{ left: "100%" }}
                transition={{ duration: CUT_DURATION_MS / 1000, ease: "linear" }}
              >
                ✂️
              </motion.span>
            )}

            <motion.div
              className="relative flex h-full flex-col items-center justify-center gap-5 px-6 pb-6 pt-5 text-center"
              initial={false}
              animate={{ opacity: stage === "question" ? 1 : 0, y: stage === "question" ? 0 : 12 }}
              transition={{ duration: reduced ? 0 : 0.4 }}
              style={{ pointerEvents: stage === "question" ? "auto" : "none" }}
            >
              <h2 className="text-2xl font-extrabold text-slate-900">¿Qué haces aquí?</h2>

              <div className="grid w-full gap-3">
                <button
                  type="button"
                  data-gate-answer="recruiter"
                  disabled={busy || stage !== "question"}
                  onClick={() => choose("recruiter")}
                  className="rounded-full bg-[#84cc16] px-5 py-3 text-sm font-semibold text-[#0f1a03] shadow-lg shadow-lime-500/30 transition-all hover:-translate-y-0.5 hover:bg-[#65a30d] disabled:translate-y-0 disabled:opacity-70"
                >
                  Soy reclutador 🕵️
                </button>
                <button
                  type="button"
                  data-gate-answer="curious"
                  disabled={busy || stage !== "question"}
                  onClick={() => choose("curious")}
                  className="rounded-full border-2 border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition-all hover:-translate-y-0.5 hover:border-[#65a30d] hover:text-[#3f6212] disabled:translate-y-0 disabled:opacity-70"
                >
                  Ando de curioso 👀
                </button>
              </div>
            </motion.div>
          </motion.div>
        </article>
        )}
      </div>
    </motion.div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { gmailWebUrl, handleGmailClick } from "@/lib/gmail";
import { cn } from "@/lib/utils";

/** Botón flotante compacto: emoji arriba y «Escríbeme» pequeño debajo. Se oculta sobre el footer. */
export function FloatingMailButton() {
  const [overFooter, setOverFooter] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setOverFooter(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-40 transition-[opacity,translate] duration-300",
        overFooter && "pointer-events-none translate-y-4 opacity-0"
      )}
      data-over-footer={overFooter}
    >
      <a
        href={gmailWebUrl()}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleGmailClick}
        aria-label="Escríbeme por correo"
        aria-hidden={overFooter}
        tabIndex={overFooter ? -1 : 0}
        className="flex flex-col items-center gap-0.5 rounded-2xl border border-accent/50 bg-surface/95 px-3 py-2 shadow-xl shadow-accent-solid/20 backdrop-blur transition-colors hover:border-accent"
      >
        <span aria-hidden="true" className="text-2xl leading-none">
          💌
        </span>
        <span className="text-[10px] font-medium leading-none text-muted">Escríbeme</span>
      </a>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, Copy, Mail, MapPin } from "lucide-react";
import { profile } from "@/data/profile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GmailLink } from "@/components/ui/GmailLink";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";

export function Contact() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.contactEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section id="contact" className="relative overflow-hidden border-t border-border py-24">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-80 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-solid/10 blur-[110px]"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <SectionHeading eyebrow="Escríbeme" title="Contáctame" />

        <FadeInWhenVisible>
          <p className="mx-auto max-w-xl text-lg leading-relaxed text-muted">
            ¿Tienes un proyecto, una vacante o una idea con datos e IA? Cuéntame y lo hablamos.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <GmailLink className="inline-flex items-center gap-2 rounded-full bg-accent-solid px-7 py-3.5 text-base font-semibold text-on-accent shadow-lg shadow-accent-solid/25 transition-all hover:-translate-y-0.5 hover:bg-accent-solid-hover">
              <Mail className="h-5 w-5" /> Escríbeme
            </GmailLink>

            <button
              type="button"
              onClick={copyEmail}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3.5 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span aria-live="polite">{copied ? "Correo copiado" : "Copiar mi correo"}</span>
            </button>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted">
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-accent" /> {profile.contactEmail}
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent" /> {profile.location}
            </li>
          </ul>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}

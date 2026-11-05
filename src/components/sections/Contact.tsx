"use client";

import { useState } from "react";
import { Check, Copy, Mail, MapPin, Phone } from "lucide-react";
import type { FormEvent } from "react";
import { profile } from "@/data/profile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";

const CONTACT_INFO = [
  { icon: Phone, label: "Teléfono", value: profile.phone },
  { icon: Mail, label: "Correo", value: profile.contactEmail },
  { icon: MapPin, label: "Ubicación", value: profile.location },
];

const FIELD =
  "mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent";

export function buildMailto(name: string, senderEmail: string, message: string) {
  const subject = encodeURIComponent(`Nuevo contacto desde el portafolio — ${name}`);
  const body = encodeURIComponent(`${message}\n\n— ${name} (${senderEmail})`);
  return `mailto:${profile.contactEmail}?subject=${subject}&body=${body}`;
}

export function Contact() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");
  const [copied, setCopied] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const href = buildMailto(
      String(data.get("name") ?? ""),
      String(data.get("email") ?? ""),
      String(data.get("message") ?? "")
    );
    window.location.href = href;
    setStatus("sent");
  }

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
    <section id="contact" className="border-t border-border py-24">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Escríbeme" title="Contáctame" align="left" />

          <div className="space-y-4">
            {CONTACT_INFO.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={copyEmail}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            <span aria-live="polite">{copied ? "Correo copiado" : "Copiar mi correo"}</span>
          </button>
        </div>

        <FadeInWhenVisible>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nombre
              </label>
              <input id="name" name="name" type="text" required autoComplete="name" className={FIELD} />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Tu correo
              </label>
              <input id="email" name="email" type="email" required autoComplete="email" className={FIELD} />
            </div>

            <div>
              <label htmlFor="message" className="text-sm font-medium text-foreground">
                Mensaje
              </label>
              <textarea id="message" name="message" rows={4} required className={FIELD} />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-accent-solid px-5 py-2.5 text-sm font-medium text-on-accent shadow-lg shadow-accent-solid/25 transition-all hover:-translate-y-0.5 hover:bg-accent-solid-hover"
            >
              Enviar <Mail className="h-4 w-4" />
            </button>

            <p role="status" className="min-h-5 text-xs text-muted">
              {status === "sent" &&
                "Se abrió tu aplicación de correo. Si no ocurrió nada, usa «Copiar mi correo»."}
            </p>
          </form>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}

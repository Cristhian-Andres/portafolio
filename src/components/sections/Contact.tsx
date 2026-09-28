"use client";

import { Mail, MapPin, Phone } from "lucide-react";
import type { FormEvent } from "react";
import { profile } from "@/data/profile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";

const CONTACT_INFO = [
  { icon: Phone, label: "Teléfono", value: profile.phone },
  { icon: Mail, label: "Correo", value: profile.contactEmail },
  { icon: MapPin, label: "Ubicación", value: profile.location },
];

export function Contact() {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = formData.get("name")?.toString() ?? "";
    const senderEmail = formData.get("email")?.toString() ?? "";
    const message = formData.get("message")?.toString() ?? "";

    const subject = encodeURIComponent(`Nuevo contacto desde el portafolio — ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${senderEmail})`);

    window.location.href = `mailto:${profile.contactEmail}?subject=${subject}&body=${body}`;
  }

  return (
    <section id="contact" className="border-t border-border py-24">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 md:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Escríbeme" title="Contáctame" />

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
        </div>

        <FadeInWhenVisible>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-foreground">
                Nombre
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Tu correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            <div>
              <label htmlFor="message" className="text-sm font-medium text-foreground">
                Mensaje
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-accent-strong"
            >
              Enviar <Mail className="h-4 w-4" />
            </button>
          </form>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}

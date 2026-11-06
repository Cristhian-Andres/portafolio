"use client";

import type { AnchorHTMLAttributes } from "react";
import { gmailWebUrl, handleGmailClick } from "@/lib/gmail";

/** Enlace que redacta un correo hacia mí directamente en Gmail (web o app, según el dispositivo). */
export function GmailLink({
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel" | "onClick">) {
  return (
    <a
      href={gmailWebUrl()}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleGmailClick}
      {...props}
    >
      {children}
    </a>
  );
}

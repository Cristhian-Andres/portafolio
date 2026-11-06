import type { MouseEvent } from "react";
import { profile } from "@/data/profile";

const SUBJECT = "Hola Cristhian, te escribo desde tu portafolio";
const BODY = "Hola Cristhian,\n\n";

export type Platform = "android" | "ios" | "desktop";

/** Redacción de Gmail en el navegador, con destinatario, asunto y cuerpo ya rellenos. */
export function gmailWebUrl(to: string = profile.contactEmail): string {
  const params = new URLSearchParams({ view: "cm", fs: "1", to, su: SUBJECT, body: BODY });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

/** Esquema de la app de Gmail en iOS. */
export function gmailIosUrl(to: string = profile.contactEmail): string {
  const params = new URLSearchParams({ to, subject: SUBJECT, body: BODY });
  return `googlegmail:///co?${params.toString()}`;
}

/**
 * Intent de Android dirigido al paquete de Gmail. Si la app no está instalada,
 * Chrome abre `browser_fallback_url` (Gmail web).
 */
export function gmailAndroidIntentUrl(to: string = profile.contactEmail): string {
  const query = `subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(BODY)}`;
  const fallback = encodeURIComponent(gmailWebUrl(to));
  return (
    `intent:mailto:${to}?${query}` +
    // Sin `scheme=`: Android lo antepondría de nuevo y quedaría «mailto:mailto:…».
    `#Intent;action=android.intent.action.SENDTO;` +
    `package=com.google.android.gm;S.browser_fallback_url=${fallback};end`
  );
}

export function detectPlatform(userAgent: string, maxTouchPoints = 0): Platform {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  // iPadOS moderno se identifica como Mac, pero tiene pantalla táctil.
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  return "desktop";
}

/** Abre la app de Gmail en el teléfono; si no responde, cae a Gmail web. */
export function openGmailOnMobile(platform: Exclude<Platform, "desktop">): void {
  if (platform === "android") {
    window.location.href = gmailAndroidIntentUrl();
    return;
  }

  // iOS: si la app se abre la página pasa a segundo plano y cancelamos el respaldo.
  const fallback = window.setTimeout(() => {
    if (document.visibilityState === "visible") window.location.href = gmailWebUrl();
  }, 1500);
  document.addEventListener("visibilitychange", () => window.clearTimeout(fallback), {
    once: true,
  });
  window.location.href = gmailIosUrl();
}

const POPUP_WIDTH = 760;
const POPUP_HEIGHT = 720;

/** Características de una ventana emergente centrada respecto a la ventana actual. */
export function gmailWindowFeatures(): string {
  const width = Math.min(POPUP_WIDTH, window.screen.availWidth);
  const height = Math.min(POPUP_HEIGHT, window.screen.availHeight);
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
  return `popup=yes,width=${width},height=${height},left=${left},top=${top}`;
}

/**
 * Abre Gmail en una ventana aparte. Si el navegador bloquea la ventana emergente,
 * lo intenta en una pestaña nueva y, como último recurso, en la misma pestaña.
 */
export function openGmailWindow(url: string = gmailWebUrl()): void {
  const popup = window.open(url, "gmail-compose", gmailWindowFeatures());
  if (popup) {
    popup.opener = null; // la ventana de Gmail no debe poder controlar el portafolio
    popup.focus();
    return;
  }
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (!tab) window.location.href = url;
}

/**
 * onClick para enlaces con `href={gmailWebUrl()}`.
 * - Escritorio: ventana emergente aparte con Gmail web.
 * - Teléfono: app de Gmail (con respaldo a Gmail web).
 * - Ctrl/Cmd/Shift + clic: se respeta el comportamiento nativo del navegador.
 */
export function handleGmailClick(event: MouseEvent<HTMLElement>): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const platform = detectPlatform(navigator.userAgent, navigator.maxTouchPoints);
  if (platform === "desktop") {
    openGmailWindow();
    return;
  }
  openGmailOnMobile(platform);
}

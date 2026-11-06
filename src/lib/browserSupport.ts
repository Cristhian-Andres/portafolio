/**
 * ¿El navegador puede aplicar un filtro SVG sobre lo que hay detrás de un elemento
 * (`backdrop-filter: url(#filtro)`)? Solo los navegadores con motor Chromium lo hacen de verdad:
 * Chrome, Edge, Opera y Chrome de Android. Safari (y todos los navegadores de iPhone, que usan
 * WebKit) y Firefox aceptan la sintaxis pero NO deforman nada (comprobado con WebKit real), así que
 * ahí se usa un respaldo.
 *
 * Se decide por el MOTOR y no solo por el nombre: el modo dispositivo de las herramientas de
 * desarrollo de Chrome disfraza la identificación como «iPhone/Safari» aunque el motor siga siendo
 * Chromium y sí deforme.
 */
export interface EngineHints {
  /** `"webkitRequestFileSystem" in window`: API exclusiva de Chromium, no depende de la identificación. */
  webkitRequestFileSystem?: boolean;
  /** `"userAgentData" in navigator`: Client Hints, solo Chromium. */
  userAgentData?: boolean;
}

export function supportsSvgBackdropFilter(userAgent: string, hints: EngineHints = {}): boolean {
  // Firefox (también en iOS) no soporta el filtro, diga lo que diga.
  if (/Firefox|FxiOS/i.test(userAgent)) return false;

  // Señales del motor: fiables aunque la identificación esté disfrazada.
  if (hints.webkitRequestFileSystem || hints.userAgentData) return true;

  // Sin señales del motor, se decide por el nombre.
  if (/CriOS|EdgiOS|OPiOS/i.test(userAgent)) return false; // navegadores de iOS: WebKit
  if (/iPhone|iPad|iPod/i.test(userAgent)) return false;
  return /\b(Chrome|Chromium|HeadlessChrome|Edg|EdgA|SamsungBrowser)\/\d+/.test(userAgent);
}

/** Lee las señales del motor del navegador actual (solo en el cliente). */
export function readEngineHints(): EngineHints {
  return {
    webkitRequestFileSystem: "webkitRequestFileSystem" in window,
    userAgentData: "userAgentData" in navigator,
  };
}

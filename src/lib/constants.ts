export const GATEKEEPER_STORAGE_KEY = "portfolio-gatekeeper";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/**
 * Tras pulsar un botón la página se recarga y debe mostrar todo. Esa recarga ocurre en menos
 * de un segundo; pasado este margen, cualquier otra carga vuelve a mostrar la introducción
 * (así cada visita cuenta y se puede volver a ver al recargar).
 */
export const UNLOCK_GRACE_MS = 10_000;

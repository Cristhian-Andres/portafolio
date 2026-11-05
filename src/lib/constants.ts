export const CAT_GIF_URL = "/cat.gif";

export const GATEKEEPER_STORAGE_KEY = "portfolio-gatekeeper";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

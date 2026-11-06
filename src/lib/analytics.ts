/**
 * Eventos hacia Google Tag Manager (dataLayer).
 *
 * En GTM crea un activador «Evento personalizado» por cada nombre de `GATE_EVENTS`
 * (o uno solo con regex `^gate_`) y úsalo en una etiqueta de GA4.
 */
export const GATE_EVENTS = {
  /** Se mostró la introducción (cuenta cuánta gente ingresa). */
  view: "gate_view",
  /** Pulsó «Soy reclutador». */
  recruiter: "gate_recruiter_click",
  /** Pulsó «Ando de curioso». */
  curious: "gate_curious_click",
  /** Cerró la introducción con Escape sin elegir. */
  dismiss: "gate_dismiss",
} as const;

export type GateEventName = (typeof GATE_EVENTS)[keyof typeof GATE_EVENTS];

type DataLayerEntry = Record<string, unknown>;
type TrackingWindow = Window & {
  dataLayer?: DataLayerEntry[];
  google_tag_manager?: Record<string, unknown>;
};

/** Espera máxima a que GTM confirme el envío antes de continuar (recargar). */
export const GTM_CALLBACK_TIMEOUT_MS = 1200;
/** Pausa breve cuando no hay GTM configurado: no hay nada que esperar. */
export const NO_GTM_DELAY_MS = 250;

function getDataLayer(): DataLayerEntry[] {
  const w = window as TrackingWindow;
  w.dataLayer = w.dataLayer ?? [];
  return w.dataLayer;
}

/** Envía un evento a `dataLayer` (la cola existe aunque GTM aún no haya cargado). */
export function pushEvent(event: string, params: DataLayerEntry = {}): void {
  getDataLayer().push({ event, page_path: window.location.pathname, ...params });
}

/** ¿Hay un contenedor de GTM en la página (cargado o cargándose)? */
export function isGtmPresent(): boolean {
  const w = window as TrackingWindow;
  return (
    Boolean(w.google_tag_manager) ||
    document.querySelector('script[src*="googletagmanager.com/gtm.js"]') !== null
  );
}

/**
 * Envía el evento y ejecuta `then` cuando GTM terminó de despachar sus etiquetas
 * (`eventCallback`), con un tiempo máximo de espera. Garantiza una sola ejecución,
 * de modo que recargar la página no pierda el clic.
 */
export function trackThen(event: string, params: DataLayerEntry, then: () => void): void {
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    then();
  };

  const timer = setTimeout(finish, isGtmPresent() ? GTM_CALLBACK_TIMEOUT_MS : NO_GTM_DELAY_MS);
  pushEvent(event, { ...params, eventCallback: finish, eventTimeout: GTM_CALLBACK_TIMEOUT_MS });
}

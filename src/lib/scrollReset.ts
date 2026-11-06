/**
 * La página SIEMPRE empieza arriba: al cargar, recargar o volver a la pestaña, sin importar dónde
 * se había quedado el usuario ni si la URL trae un #ancla.
 *
 * El navegador restaura el scroll por su cuenta al recargar; se desactiva esa restauración
 * (`scrollRestoration = "manual"`) lo antes posible y se lleva la página al inicio.
 */

/** Script que corre en <head>, ANTES de que el navegador pueda restaurar el scroll o saltar a un #ancla. */
export const SCROLL_RESET_INLINE_SCRIPT =
  "try{if('scrollRestoration' in history)history.scrollRestoration='manual';" +
  "if(location.hash)history.replaceState(history.state,'',location.pathname+location.search)}catch(e){}";

/** Quita el #ancla de la URL sin tocar el estado del enrutador de Next. */
export function stripHash(): boolean {
  if (!window.location.hash) return false;
  window.history.replaceState(
    window.history.state,
    "",
    window.location.pathname + window.location.search
  );
  return true;
}

/** Lleva la página al inicio de inmediato (sin la animación del scroll suave del CSS). */
export function scrollToTop(): void {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}

/**
 * Deja la página al inicio y vigila los casos en que el navegador podría devolverla a otro sitio.
 * Devuelve la función que quita sus escuchas.
 */
export function installScrollReset(): () => void {
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
  stripHash();
  scrollToTop();

  // Volver a la pestaña desde la caché «atrás/adelante» (bfcache) la restaura con su scroll anterior.
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted) return;
    stripHash();
    scrollToTop();
  };
  // Al salir, se deja arriba: si algún navegador restaurara igualmente, restauraría el inicio.
  const onPageHide = () => scrollToTop();

  window.addEventListener("pageshow", onPageShow);
  window.addEventListener("pagehide", onPageHide);
  return () => {
    window.removeEventListener("pageshow", onPageShow);
    window.removeEventListener("pagehide", onPageHide);
  };
}

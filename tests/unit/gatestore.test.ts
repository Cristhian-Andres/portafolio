import { describe, expect, it } from "vitest";
import { mergeGateState, useGatekeeperStore } from "@/components/gatekeeper/useGatekeeperStore";
import { GATEKEEPER_STORAGE_KEY, UNLOCK_GRACE_MS } from "@/lib/constants";

const blank = {
  hasAnswered: false,
  audience: null,
  answeredAt: null,
  unlocking: false,
  startUnlock: () => {},
  complete: () => {},
};
const NOW = 1_000_000;

describe("mergeGateState: ¿se muestra la introducción al cargar?", () => {
  it("sin nada guardado: sí se muestra", () => {
    expect(mergeGateState(undefined, blank, NOW).hasAnswered).toBe(false);
    expect(mergeGateState(null, blank, NOW).hasAnswered).toBe(false);
    expect(mergeGateState({}, blank, NOW).hasAnswered).toBe(false);
  });

  it("la recarga que ocurre justo después de elegir un botón NO la vuelve a mostrar", () => {
    const merged = mergeGateState(
      { hasAnswered: true, audience: "recruiter", answeredAt: NOW - 400 },
      blank,
      NOW
    );
    expect(merged).toMatchObject({ hasAnswered: true, audience: "recruiter", answeredAt: NOW - 400 });
  });

  it("una carga posterior (pasado el margen) SÍ la vuelve a mostrar", () => {
    for (const age of [UNLOCK_GRACE_MS, UNLOCK_GRACE_MS + 1, 60_000, 3_600_000]) {
      const merged = mergeGateState(
        { hasAnswered: true, audience: "curious", answeredAt: NOW - age },
        blank,
        NOW
      );
      expect(merged.hasAnswered, `hace ${age} ms`).toBe(false);
    }
  });

  it("justo dentro del margen todavía vale", () => {
    const merged = mergeGateState(
      { hasAnswered: true, audience: "curious", answeredAt: NOW - (UNLOCK_GRACE_MS - 1) },
      blank,
      NOW
    );
    expect(merged.hasAnswered).toBe(true);
  });

  it("REGRESIÓN: el estado que dejó la versión anterior (sin hora) ya no oculta la introducción", () => {
    const legacy = { hasAnswered: true, audience: "normal", isExpanded: false };
    expect(mergeGateState(legacy, blank, NOW).hasAnswered).toBe(false);
  });

  it("una hora corrupta o en el futuro tampoco la oculta", () => {
    for (const answeredAt of [NOW + 5_000, "ayer", null, NaN, undefined]) {
      expect(
        mergeGateState({ hasAnswered: true, audience: "recruiter", answeredAt }, blank, NOW).hasAnswered
      ).toBe(false);
    }
  });

  it("no confía en estados incompletos o con tipos inesperados", () => {
    expect(mergeGateState({ hasAnswered: "true", answeredAt: NOW - 100 }, blank, NOW).hasAnswered).toBe(false);
    expect(mergeGateState("basura", blank, NOW).hasAnswered).toBe(false);
    expect(mergeGateState(42, blank, NOW).hasAnswered).toBe(false);
  });

  it("conserva el resto del estado actual (acciones, unlocking)", () => {
    const current = { ...blank, unlocking: true };
    const merged = mergeGateState({ hasAnswered: true, audience: "recruiter", answeredAt: NOW - 1 }, current, NOW);
    expect(merged.unlocking).toBe(true);
    expect(merged.startUnlock).toBe(current.startUnlock);
  });
});

describe("el store guarda lo necesario y nada más", () => {
  it("complete() registra la respuesta con su hora y se escribe en sessionStorage", () => {
    useGatekeeperStore.setState({ hasAnswered: false, audience: null, answeredAt: null, unlocking: false });
    useGatekeeperStore.getState().complete("recruiter", 12345);

    expect(useGatekeeperStore.getState()).toMatchObject({
      hasAnswered: true,
      audience: "recruiter",
      answeredAt: 12345,
    });
    const saved = JSON.parse(sessionStorage.getItem(GATEKEEPER_STORAGE_KEY)!);
    expect(saved.state).toEqual({ hasAnswered: true, audience: "recruiter", answeredAt: 12345 });
  });

  it("`unlocking` es solo de la sesión de pantalla: nunca se guarda", () => {
    useGatekeeperStore.getState().startUnlock();
    const saved = JSON.parse(sessionStorage.getItem(GATEKEEPER_STORAGE_KEY)!);
    expect(saved.state).not.toHaveProperty("unlocking");
  });
});

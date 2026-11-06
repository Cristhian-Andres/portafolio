import { useSyncExternalStore } from "react";
import { useGatekeeperStore } from "./useGatekeeperStore";

function subscribe(callback: () => void) {
  return useGatekeeperStore.persist.onFinishHydration(callback);
}

function getSnapshot() {
  return useGatekeeperStore.persist.hasHydrated();
}

function getServerSnapshot() {
  return false;
}

export function useHasHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

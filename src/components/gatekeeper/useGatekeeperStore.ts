import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { GATEKEEPER_STORAGE_KEY } from "@/lib/constants";

export type Audience = "recruiter" | "normal";

interface GatekeeperState {
  hasAnswered: boolean;
  audience: Audience | null;
  isExpanded: boolean;
  answer: (audience: Audience) => void;
  expand: () => void;
}

export const useGatekeeperStore = create<GatekeeperState>()(
  persist(
    (set) => ({
      hasAnswered: false,
      audience: null,
      isExpanded: false,
      answer: (audience) => set({ hasAnswered: true, audience }),
      expand: () => set({ isExpanded: true }),
    }),
    {
      name: GATEKEEPER_STORAGE_KEY,
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);

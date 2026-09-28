"use client";

import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { HeroBlob } from "@/components/three/HeroBlob";

const ACCENT_BY_THEME = {
  light: "#16a34a",
  dark: "#4ade80",
};

export function HeroScene() {
  const shouldReduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();

  if (shouldReduceMotion) {
    return null;
  }

  const color = resolvedTheme === "dark" ? ACCENT_BY_THEME.dark : ACCENT_BY_THEME.light;

  return (
    <div className="absolute inset-0">
      <HeroBlob color={color} />
    </div>
  );
}

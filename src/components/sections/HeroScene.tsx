"use client";

import { useReducedMotion } from "framer-motion";
import { useTheme } from "next-themes";
import { HeroBlob } from "@/components/three/HeroBlob";

const COLORS = {
  light: { main: "#84cc16", accent2: "#14b8a6" },
  dark: { main: "#a3e635", accent2: "#2dd4bf" },
};

export function HeroScene() {
  const shouldReduceMotion = useReducedMotion();
  const { resolvedTheme } = useTheme();

  if (shouldReduceMotion) return null;

  const palette = resolvedTheme === "light" ? COLORS.light : COLORS.dark;
  return <HeroBlob color={palette.main} accent2={palette.accent2} />;
}

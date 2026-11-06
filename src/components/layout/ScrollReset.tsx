"use client";

import { useEffect } from "react";
import { installScrollReset } from "@/lib/scrollReset";

/** Garantiza que el portafolio siempre se muestre desde el principio. No renderiza nada. */
export function ScrollReset() {
  useEffect(() => installScrollReset(), []);
  return null;
}

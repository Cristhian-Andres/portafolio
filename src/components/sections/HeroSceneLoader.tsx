"use client";

import dynamic from "next/dynamic";

const HeroScene = dynamic(
  () => import("@/components/sections/HeroScene").then((mod) => mod.HeroScene),
  { ssr: false, loading: () => null }
);

export function HeroSceneLoader() {
  return <HeroScene />;
}

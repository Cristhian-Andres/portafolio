"use client";

import { motion } from "framer-motion";
import { Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { CAT_GIF_URL } from "@/lib/constants";

export function FloatingCatPill() {
  return (
    <motion.a
      layoutId="cat-panel"
      transition={{ duration: 0.45, ease: "easeInOut" }}
      href={`mailto:${profile.contactEmail}`}
      aria-label="Escríbeme por correo"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full border border-accent/50 bg-surface py-2 pl-2 pr-4 shadow-xl shadow-accent-solid/20 transition-colors hover:border-accent"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CAT_GIF_URL}
        alt=""
        width={40}
        height={40}
        decoding="async"
        className="h-10 w-10 rounded-full object-cover"
      />
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Mail className="h-4 w-4" /> Escríbeme
      </span>
    </motion.a>
  );
}

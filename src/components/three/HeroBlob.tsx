"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";

export function HeroBlob({ color, accent2 }: { color: string; accent2: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  // Pausa el render cuando el blob sale del viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0" aria-hidden="true">
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.1} />
        <pointLight position={[5, 5, 5]} intensity={1.4} />
        <pointLight position={[-5, -3, -2]} intensity={0.9} color={accent2} />

        <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
          <Sphere args={[1.3, 64, 64]}>
            <MeshDistortMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.45}
              distort={0.4}
              speed={1.8}
              roughness={0.2}
              metalness={0.1}
            />
          </Sphere>
        </Float>
      </Canvas>
    </div>
  );
}

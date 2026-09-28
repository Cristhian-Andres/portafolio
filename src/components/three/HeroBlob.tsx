"use client";

import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere } from "@react-three/drei";

export function HeroBlob({ color }: { color: string }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 4], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={1.4} />
      <pointLight position={[-5, -3, -2]} intensity={0.4} color={color} />

      <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
        <Sphere args={[1.3, 64, 64]}>
          <MeshDistortMaterial
            color={color}
            distort={0.4}
            speed={1.8}
            roughness={0.2}
            metalness={0.1}
          />
        </Sphere>
      </Float>
    </Canvas>
  );
}

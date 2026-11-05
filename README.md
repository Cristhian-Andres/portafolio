# Portafolio — Cristhian Andrés Luna Navarro

Portafolio personal construido con **Next.js (App Router) + TypeScript + Tailwind CSS v4**, con animaciones de scroll (Framer Motion), un elemento 3D en el Hero (React Three Fiber + drei) y un gag de entrada: un modal con un gato que pregunta si eres reclutador o solo curioso antes de mostrarte el perfil completo.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Tailwind CSS v4** (tokens de color en `src/app/globals.css`, dark mode por clase)
- **next-themes** para el toggle de tema claro/oscuro
- **Framer Motion** para el scroll-reveal de texto, el timeline animado de experiencia y las transiciones del modal
- **@react-three/fiber + @react-three/drei** para el blob 3D del Hero
- **zustand** (con persistencia en `sessionStorage`) para el estado del modal "gatekeeper"
- **lucide-react** + iconos de marca hechos a mano (GitHub/LinkedIn/Instagram)

## Editar el contenido

Todo el contenido (perfil, experiencia, skills, educación y proyectos académicos) vive en `src/data/*.ts`, tipado desde `src/types/cv.ts`. Para actualizar el CV, edita esos archivos — no hace falta tocar los componentes.

- `src/data/profile.ts` — nombre, rol, contacto, redes sociales, CV en PDF
- `src/data/experience.ts` — experiencia laboral (timeline animado)
- `src/data/skills.ts` — categorías de skills técnicas
- `src/data/education.ts` — formación académica
- `src/data/projects.ts` — proyectos de formación ("Primeros pasos")

El gif del gato por defecto está en `src/lib/constants.ts` (`CAT_GIF_URL`) — reemplázalo por cualquier URL directa de `.gif` que prefieras.

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Build de producción

```bash
npm run build
npm run start
```

## Tests

```bash
npm test            # unitarios y de componentes (Vitest + Testing Library)
npm run test:e2e    # navegador real, escritorio y móvil (Playwright; construye y levanta el sitio)
npm run typecheck && npm run lint
```

La primera vez: `npx playwright install chromium`. El workflow `.github/workflows/ci.yml` corre todo en cada push.

## Despliegue

Importa el repo en Vercel (detecta Next.js solo). Define `NEXT_PUBLIC_SITE_URL` con tu dominio final para que
el sitemap, `robots.txt`, la imagen Open Graph y el JSON-LD apunten a la URL correcta.

## Paleta

Los colores viven como variables en `src/app/globals.css` (`:root` para claro, `.dark` para oscuro). Cambiar
`--accent`, `--accent-2` y `--accent-solid` re-tiñe todo el sitio, incluido el blob 3D (`HeroScene.tsx`).

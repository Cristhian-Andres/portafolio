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


## Introducción interactiva («¿Qué haces aquí?»)

Al entrar, mi hoja de vida se «escribe» sola (con datos reales de `src/data/experience.ts`), se corta con tijeras
mientras muestra «Cargando perfil…» con una barra de progreso (no hay botón para saltarla), y pregunta **¿Qué haces aquí?** con dos botones: **Soy reclutador** y **Ando de curioso**. Cualquiera de los dos
desbloquea todo: se envía el evento a Google Tag Manager, la página **se recarga** y se muestra el portafolio completo.
Solo la recarga que ocurre justo después de pulsar un botón muestra todo directamente (margen de 10 s,
`UNLOCK_GRACE_MS` en `src/lib/constants.ts`): **cualquier otra carga o recarga vuelve a mostrar la introducción**,
así cada visita cuenta y puedes volver a verla siempre. Con «reducir movimiento» se salta la animación. La introducción es **siempre blanca**, aunque el sitio esté en modo oscuro.
El código está en `src/components/gatekeeper/`.

## Siempre desde el inicio

El portafolio siempre empieza arriba: al cargar, recargar o volver a la pestaña no se restaura el scroll anterior y
se quita cualquier `#ancla` de la URL. Un script en `<head>` desactiva la restauración del navegador antes de que
actúe (`src/lib/scrollReset.ts`).

## Medición con Google Tag Manager

1. Crea un contenedor web en tagmanager.google.com y copia su ID (`GTM-XXXXXXX`).
2. Defínelo como variable de entorno `NEXT_PUBLIC_GTM_ID` (ver `.env.example`; en Vercel: Settings → Environment Variables) y vuelve a desplegar.
3. En GTM crea un **activador → Evento personalizado** por cada evento de la tabla (o uno con regex `^gate_`) y úsalo en una etiqueta de **Google Analytics: evento de GA4**.

| Evento (`event`) | Cuándo se envía | Parámetros |
| --- | --- | --- |
| `gate_view` | Se muestra la introducción (una vez por carga) | `gate_step`, `page_path` |
| `gate_recruiter_click` | Pulsa **Soy reclutador** | `audience: "recruiter"`, `gate_step` |
| `gate_curious_click` | Pulsa **Ando de curioso** | `audience: "curious"`, `gate_step` |
| `gate_dismiss` | Cierra con Escape sin elegir | `audience: "unknown"` |

Al pulsar un botón, la recarga espera a que GTM confirme el envío (`eventCallback`, con un máximo de ~1,2 s) para no perder el clic.
Depurar: abre la consola del navegador y escribe `dataLayer`, o usa el modo **Vista previa** de GTM.
Nota: la recarga cuenta una segunda visita de página (`page_view`) en GA4; para el embudo usa `gate_view` y los dos `*_click`.

## Efecto de agua (huella local)

Donde pasa el mouse (o el dedo en móvil) la superficie se hunde un instante y **deforma suavemente lo que hay
debajo** (letras, tarjetas, imágenes), como si dejara una marca en el agua; la marca se relaja y desaparece en
~1 s. **Es local:** solo afecta al sitio por donde se pasa; no viajan ondas por la pantalla. Un clic o toque deja
una marca algo mayor. Si el puntero se queda quieto, no pasa nada.

- **Chrome, Edge, Opera y Chrome de Android** (motor Chromium): refracción real con un filtro SVG
  (`feDisplacementMap`) aplicado a lo que hay detrás mediante `backdrop-filter`. La deformación está acotada a
  **3 px** (tope suave); en la práctica un toque llega a ~1,2 px y la estela rápida del mouse a ~1,8 px.
- **Safari (todo iPhone) y Firefox**: no pueden aplicar ese filtro (comprobado con un WebKit real), así que solo se
  ve un brillo muy sutil en el mismo sitio, sin deformar. La detección es por el **motor**, no por el nombre: el
  modo dispositivo «iPhone» de las herramientas de Chrome sí deforma porque su motor sigue siendo Chromium.
- Cero costo en reposo: el filtro solo existe mientras la marca es visible y se retira al desvanecerse. La marca
  avanza a 60 pasos por segundo reales, así que dura lo mismo a cualquier tasa de cuadros.
- **Estela de barco** (en todos los navegadores, también Safari): por donde pasa el puntero queda una **línea fina**
  que marca la dirección del movimiento, **blanca con la pantalla oscura y negra con la clara** (y negra sobre la
  introducción, que siempre es blanca). Es gruesa (~2 px) junto al puntero y se afina hasta casi desaparecer en la
  cola, con opacidad máxima 0,45; se suaviza como una curva, mide como mucho ~260 px y se desvanece en ~0,8 s. Un clic
  o toque quieto no la dibuja; al soltar el dedo o cambiar de pestaña se corta.
- No se monta con «reducir movimiento», no bloquea clics ni el scroll con el dedo.

Código: la huella en `src/lib/trailField.ts`, su conversión a mapa de deformación en `src/lib/rippleMap.ts`,
la estela de barco en `src/lib/wakeTrail.ts`, la detección del motor en `src/lib/browserSupport.ts` y el componente
en `src/components/effects/WaterRipple.tsx`. **Ajustar la estela:** constantes `WAKE_*` en `wakeTrail.ts` (vida,
largo, grosor, opacidad).

**Ajustar:** `DEFAULT_DISPLACEMENT` en `rippleMap.ts` (`gain` = cuánto deforma, `maxPx` = tope absoluto) y
`DEFAULT_DECAY` en `trailField.ts` (cuánto dura la marca). Los tests miden que, con la ganancia actual, entre celdas
vecinas el salto no pasa de ~0,6 px; si subes `gain` mucho, fallarán a propósito (las letras empezarían a cizallarse).

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
npm run test:e2e    # navegador real: escritorio y Android (Chromium) + iPhone (WebKit/Safari real); construye y levanta el sitio
npm run typecheck && npm run lint
```

La primera vez: `npx playwright install chromium`. El workflow `.github/workflows/ci.yml` corre todo en cada push.

## Despliegue

Importa el repo en Vercel (detecta Next.js solo). Define `NEXT_PUBLIC_SITE_URL` con tu dominio final para que
el sitemap, `robots.txt`, la imagen Open Graph y el JSON-LD apunten a la URL correcta.

## Paleta

Los colores viven como variables en `src/app/globals.css` (`:root` para claro, `.dark` para oscuro). Cambiar
`--accent`, `--accent-2` y `--accent-solid` re-tiñe todo el sitio, incluido el blob 3D (`HeroScene.tsx`).

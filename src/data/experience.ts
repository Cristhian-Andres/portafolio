import type { Experience } from "@/types/cv";

export const experience: Experience[] = [
  {
    id: "alegra",
    role: "Analytics Engineer / IT Analyst — Team Data",
    company: "Alegra SAS",
    period: "Abril 2023 — Presente",
    startDate: "2023-04",
    endDate: "present",
    bullets: [
      "Diseño y modelado del Data Warehouse central en BigQuery (Google Cloud) y AWS Redshift, construyendo modelos de datos dimensionales y semánticos que centralizan información clave de la plataforma fintech.",
      "Diseño, construcción y optimización de pipelines de transformación escalables con Python y SQL avanzado para grandes volúmenes de datos transaccionales.",
      "Gestión de la gobernanza integral de datos analíticos: salud, actualización y definición de métricas estratégicas, estableciendo una única fuente de verdad.",
      "Integración de modelos analíticos con herramientas de BI enterprise (Power BI, Amazon QuickSight), optimizando dashboards y la adopción de arquitecturas self-service BI.",
      "Desarrollo de pipelines de integración y bots con modelos de IA (Gemini, OpenAI) sobre arquitecturas sin servidor (Cloud Run, AWS Lambda), automatizando clasificación y workflows de soporte.",
      "Coordinación de SLAs de disponibilidad de datos críticos, asegurando alta disponibilidad, respaldo y resolución oportuna de incidentes en producción.",
    ],
    tags: ["BigQuery", "AWS Redshift", "Python", "SQL", "Power BI", "QuickSight", "IA / LLMs"],
  },
  {
    id: "freelance",
    role: "Full Stack & Data Developer",
    company: "Freelance / Proyectos independientes",
    period: "2021 — 2023",
    startDate: "2021-01",
    endDate: "2023-01",
    bullets: [
      "Diseño e implementación de la arquitectura de bases de datos relacionales (MySQL/PostgreSQL) para un sistema integral de gestión médica, definiendo esquemas y consultas SQL de alto rendimiento.",
      "Desarrollo de APIs de integración backend en Python y PHP.",
      "Modelado y despliegue de tableros de control analíticos y paneles operativos adaptados a las necesidades del cliente, asegurando calidad e integridad de la información.",
    ],
    tags: ["MySQL", "PostgreSQL", "Python", "PHP", "APIs REST"],
  },
];

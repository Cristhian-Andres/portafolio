import type { SkillGroup } from "@/types/cv";

export const skillGroups: SkillGroup[] = [
  {
    id: "warehousing",
    category: "Data Warehousing & Arquitectura",
    items: [
      "Google BigQuery",
      "AWS Redshift",
      "Modelado Dimensional (Star/Snowflake)",
      "Data Lakehouse",
      "Data Mesh",
      "Domain-Driven Design",
    ],
  },
  {
    id: "languages",
    category: "Lenguajes Core",
    items: ["SQL Avanzado", "Python (Pandas, ETL)", "JavaScript (Node.js)"],
  },
  {
    id: "bi",
    category: "BI & Gobernanza",
    items: [
      "Power BI",
      "Amazon QuickSight",
      "Definición de Métricas",
      "Calidad de Datos",
      "Self-Service BI",
    ],
  },
  {
    id: "cloud",
    category: "Cloud & Orquestación",
    items: [
      "Google Cloud Platform (Cloud Run, BigQuery)",
      "AWS (Lambda, Redshift)",
      "Docker",
      "n8n",
      "Make",
      "Zapier",
    ],
  },
  {
    id: "data-apis",
    category: "Bases de Datos & APIs",
    items: [
      "PostgreSQL (Supabase)",
      "MySQL",
      "REST APIs",
      "GraphQL",
      "Integración con LLMs (OpenAI, Gemini)",
    ],
  },
  {
    id: "tools",
    category: "Herramientas & Control",
    items: ["Git/GitHub", "Jira", "Asana", "Slack", "Linux Mint"],
  },
];

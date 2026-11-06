import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  ChartColumn,
  Cloud,
  Code,
  Database,
  Gauge,
  Hash,
  Layers,
  MousePointerClick,
  Network,
  Shapes,
  ShieldCheck,
  Waves,
  Webhook,
  Wrench,
} from "lucide-react";
import {
  siAsana,
  siDocker,
  siGit,
  siGooglebigquery,
  siGooglecloud,
  siGooglegemini,
  siGraphql,
  siJavascript,
  siJira,
  siLinuxmint,
  siMake,
  siMysql,
  siN8n,
  siPostgresql,
  siPython,
  siZapier,
} from "simple-icons";
import type { SimpleIcon } from "simple-icons";
import type { SkillGroup, SkillIcon } from "@/types/cv";

const brand = (icon: SimpleIcon): SkillIcon => ({
  kind: "brand",
  icon: { path: icon.path, hex: `#${icon.hex}`, title: icon.title },
});

// Marcas que simple-icons ya no distribuye (AWS, Power BI, Slack…): ficha con su color de marca.
const mono = (text: string, color: string, ink?: string): SkillIcon => ({
  kind: "mono",
  text,
  color,
  ink,
});

// Conceptos sin logo de marca: ícono de línea con color propio.
const concept = (icon: LucideIcon, color: string): SkillIcon => ({ kind: "lucide", icon, color });

const groups: SkillGroup[] = [
  {
    id: "warehousing",
    category: "Data Warehousing & Arquitectura",
    icon: Database,
    items: [
      { name: "Google BigQuery", icon: brand(siGooglebigquery) },
      { name: "AWS Redshift", icon: mono("RS", "#8c4fff", "#ffffff") },
      { name: "Modelado Dimensional", detail: "Star / Snowflake", icon: concept(Boxes, "#a3e635") },
      { name: "Data Lakehouse", icon: concept(Waves, "#38bdf8") },
      { name: "Data Mesh", icon: concept(Network, "#f472b6") },
      { name: "Domain-Driven Design", icon: concept(Shapes, "#fbbf24") },
    ],
  },
  {
    id: "languages",
    category: "Lenguajes Core",
    icon: Code,
    items: [
      { name: "SQL Avanzado", icon: mono("SQL", "#f29111", "#1a1203") },
      { name: "Python", detail: "Pandas, ETL", icon: brand(siPython) },
      { name: "JavaScript", detail: "Node.js", icon: brand(siJavascript) },
    ],
  },
  {
    id: "bi",
    category: "BI & Gobernanza",
    icon: ChartColumn,
    items: [
      { name: "Power BI", icon: mono("BI", "#f2c811", "#1a1500") },
      { name: "Amazon QuickSight", icon: mono("QS", "#2e73f0", "#ffffff") },
      { name: "Definición de Métricas", icon: concept(Gauge, "#a3e635") },
      { name: "Calidad de Datos", icon: concept(ShieldCheck, "#2dd4bf") },
      { name: "Self-Service BI", icon: concept(MousePointerClick, "#f472b6") },
    ],
  },
  {
    id: "cloud",
    category: "Cloud & Orquestación",
    icon: Cloud,
    items: [
      { name: "Google Cloud", detail: "Cloud Run, BigQuery", icon: brand(siGooglecloud) },
      { name: "AWS", detail: "Lambda, Redshift", icon: mono("AWS", "#ff9900", "#1a0f00") },
      { name: "Docker", icon: brand(siDocker) },
      { name: "n8n", icon: brand(siN8n) },
      { name: "Make", icon: brand(siMake) },
      { name: "Zapier", icon: brand(siZapier) },
    ],
  },
  {
    id: "data-apis",
    category: "Bases de Datos & APIs",
    icon: Layers,
    items: [
      { name: "PostgreSQL", detail: "Supabase", icon: brand(siPostgresql) },
      { name: "MySQL", icon: brand(siMysql) },
      { name: "REST APIs", icon: concept(Webhook, "#a3e635") },
      { name: "GraphQL", icon: brand(siGraphql) },
      { name: "Integración con LLMs", detail: "OpenAI, Gemini", icon: brand(siGooglegemini) },
    ],
  },
  {
    id: "tools",
    category: "Herramientas & Control",
    icon: Wrench,
    items: [
      { name: "Git / GitHub", icon: brand(siGit) },
      { name: "Jira", icon: brand(siJira) },
      { name: "Asana", icon: brand(siAsana) },
      { name: "Slack", icon: concept(Hash, "#e01e5a") },
      { name: "Linux Mint", icon: brand(siLinuxmint) },
    ],
  },
];

// Orden de lectura pensado para emparejar tarjetas de alto similar en la cuadrícula de 2 columnas.
const ORDER = ["warehousing", "cloud", "languages", "tools", "bi", "data-apis"];

export const skillGroups: SkillGroup[] = [...groups].sort(
  (a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id)
);

import type { Project } from "@/types/cv";

export const projects: Project[] = [
  {
    id: "consultorio-medico",
    title: "Consultorio Médico",
    description:
      "Sistema de gestión médica desarrollado durante la formación de Tecnólogo en Análisis y Desarrollo de Sistemas de Información del SENA.",
    period: "SENA · 2021 — 2023",
    repoUrl: "https://github.com/Cristhian-Andres/consultorio-medico-MVC",
    imageSrc: "/projects/consultorio-medico.png",
    tags: ["MySQL", "PHP", "MVC"],
  },
  {
    id: "encriptador-texto",
    title: "Encriptador de Texto",
    description:
      "Aplicación que encripta textos para intercambiar mensajes secretos entre personas que conocen el mismo método de encriptación. Desarrollada como Challenge de Oracle Next Education / Alura.",
    period: "Alura · 2022",
    repoUrl: "https://github.com/Cristhian-Andres/Challenge-ONE-Encriptador-de-Texto",
    demoUrl: "https://cristhian-andres.github.io/Challenge-ONE-Encriptador-de-Texto/",
    imageSrc: "/projects/encriptador-texto.png",
    tags: ["JavaScript"],
  },
  {
    id: "series-fourier",
    title: "Aplicación Series de Fourier",
    description:
      "Aplicación que, a partir de una función matemática compleja, modela con Series de Fourier su comportamiento al variar sus armónicos.",
    period: "Universidad del Cauca · Ingeniería Automática Industrial",
    repoUrl: "https://github.com/Cristhian-Andres/Series-Fourier-PIAI",
    imageSrc: "/projects/series-fourier.png",
    tags: ["Python", "Matemáticas aplicadas"],
  },
  {
    id: "intercambiador-calor",
    title: "Intercambiador de Calor a Contracorriente",
    description:
      "Simulador con interfaz de usuario para un intercambiador de calor a contracorriente, donde un fluido caliente transfiere energía térmica a un fluido frío en dirección opuesta.",
    period: "Universidad del Cauca · Ingeniería Automática Industrial",
    repoUrl: "https://github.com/Cristhian-Andres/Intercambiador-Calor-Contracorriente-PIAI",
    imageSrc: "/projects/intercambiador-calor.png",
    tags: ["Python", "Simulación"],
  },
];

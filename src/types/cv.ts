import type { LucideIcon } from "lucide-react";

export interface Experience {
  id: string;
  role: string;
  company: string;
  companyUrl?: string;
  period: string;
  startDate: string;
  endDate: string | "present";
  bullets: string[];
  tags: string[];
}

export interface EducationItem {
  id: string;
  title: string;
  institution: string;
  period: string;
  status: "completed" | "in-progress";
}


export interface Project {
  id: string;
  title: string;
  description: string;
  period: string;
  repoUrl: string;
  demoUrl?: string;
  imageSrc: string;
  tags: string[];
}

export type SocialIcon = "linkedin" | "github" | "instagram" | "mail";

export interface SocialLink {
  label: string;
  url: string;
  icon: SocialIcon;
}

export interface Profile {
  name: string;
  role: string;
  location: string;
  contactEmail: string;
  tagline: string;
  roles: string[];
  summary: string;
  photoSrc: string;
  cvUrl: string;
  socialLinks: SocialLink[];
  softSkills: string[];
}

export type SkillIcon =
  | { kind: "brand"; icon: { path: string; hex: string; title: string } }
  | { kind: "lucide"; icon: LucideIcon; color: string }
  | { kind: "mono"; text: string; color: string; ink?: string };

export interface SkillItem {
  name: string;
  detail?: string;
  icon: SkillIcon;
}

export interface SkillGroup {
  id: string;
  category: string;
  icon: LucideIcon;
  items: SkillItem[];
}

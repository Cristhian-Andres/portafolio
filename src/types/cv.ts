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

export interface SkillGroup {
  id: string;
  category: string;
  items: string[];
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
  phone: string;
  contactEmail: string;
  tagline: string;
  roles: string[];
  summary: string;
  photoSrc: string;
  cvUrl: string;
  socialLinks: SocialLink[];
  softSkills: string[];
}

import { Mail } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { profile } from "@/data/profile";
import type { SocialIcon } from "@/types/cv";
import { GithubIcon, InstagramIcon, LinkedinIcon } from "@/components/icons/BrandIcons";

const ICONS: Record<SocialIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  mail: Mail,
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="text-sm font-semibold text-foreground">{profile.name}</p>
        <p className="text-sm text-muted">{profile.role}</p>

        <div className="flex items-center gap-4">
          {profile.socialLinks.map((link) => {
            const Icon = ICONS[link.icon];
            return (
              <a
                key={link.label}
                href={link.url}
                target={link.url.startsWith("http") ? "_blank" : undefined}
                rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={link.label}
                className="text-muted transition-colors hover:text-accent"
              >
                <Icon className="h-5 w-5" />
              </a>
            );
          })}
        </div>

        <p className="text-xs text-muted">
          &ldquo;Si puedes imaginarlo, puedes programarlo&rdquo;
        </p>
      </div>
    </footer>
  );
}

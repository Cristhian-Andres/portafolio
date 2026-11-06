import { Mail } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { profile } from "@/data/profile";
import type { SocialIcon } from "@/types/cv";
import { GithubIcon, InstagramIcon, LinkedinIcon } from "@/components/icons/BrandIcons";
import { LetterQuote } from "@/components/motion/LetterQuote";
import { GmailLink } from "@/components/ui/GmailLink";

const ICONS: Record<SocialIcon, ComponentType<SVGProps<SVGSVGElement>>> = {
  github: GithubIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  mail: Mail,
};

// Íconos grandes y con área de toque cómoda (≈ 44 px) en móvil y escritorio.
const SOCIAL_LINK =
  "rounded-xl p-2 text-muted transition-all duration-200 hover:-translate-y-0.5 hover:text-accent motion-reduce:transition-none";
const SOCIAL_ICON = "h-7 w-7 sm:h-8 sm:w-8";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 py-10 text-center md:gap-8 md:py-14">
        <p className="text-lg font-semibold text-foreground sm:text-xl md:text-2xl">
          {profile.name}
        </p>

        <div className="flex items-center gap-5 md:gap-7">
          {profile.socialLinks.map((link) => {
            const Icon = ICONS[link.icon];
            if (link.icon === "mail") {
              return (
                <GmailLink
                  key={link.label}
                  aria-label="Escríbeme por Gmail"
                  className={SOCIAL_LINK}
                >
                  <Icon className={SOCIAL_ICON} />
                </GmailLink>
              );
            }
            return (
              <a
                key={link.label}
                href={link.url}
                target={link.url.startsWith("http") ? "_blank" : undefined}
                rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={link.label}
                className={SOCIAL_LINK}
              >
                <Icon className={SOCIAL_ICON} />
              </a>
            );
          })}
        </div>

        <LetterQuote
          text="“Si puedes imaginarlo, puedes programarlo”"
          className="max-w-3xl text-xl sm:text-2xl md:text-3xl"
        />
      </div>
    </footer>
  );
}

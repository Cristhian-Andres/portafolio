import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: "primary" | "outline" | "ghost";
  icon?: ReactNode;
}

export function Button({
  href,
  variant = "primary",
  icon,
  className,
  children,
  ...props
}: ButtonProps) {
  const isHttp = href.startsWith("http");

  const styles = cn(
    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all",
    variant === "primary" &&
      "bg-accent-solid text-on-accent shadow-lg shadow-accent-solid/25 hover:-translate-y-0.5 hover:bg-accent-solid-hover",
    variant === "outline" &&
      "border border-border text-foreground hover:-translate-y-0.5 hover:border-accent hover:text-accent",
    variant === "ghost" && "text-foreground hover:text-accent",
    className
  );

  return (
    <a
      href={href}
      target={isHttp ? "_blank" : undefined}
      rel={isHttp ? "noopener noreferrer" : undefined}
      className={styles}
      {...props}
    >
      {children}
      {icon}
    </a>
  );
}

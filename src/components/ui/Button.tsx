import Link from "next/link";
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
  const isExternal = href.startsWith("http") || href.startsWith("mailto:");

  const styles = cn(
    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all",
    variant === "primary" &&
      "bg-accent text-white shadow-sm hover:bg-accent-strong",
    variant === "outline" &&
      "border border-border text-foreground hover:border-accent hover:text-accent",
    variant === "ghost" && "text-foreground hover:text-accent",
    className
  );

  if (isExternal) {
    return (
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
        className={styles}
        {...props}
      >
        {children}
        {icon}
      </a>
    );
  }

  return (
    <Link href={href} className={styles}>
      {children}
      {icon}
    </Link>
  );
}

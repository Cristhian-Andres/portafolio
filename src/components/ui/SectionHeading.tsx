export function SectionHeading({
  eyebrow,
  title,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mb-12 text-center" : "mb-8"}>
      <span className="font-mono text-sm font-medium uppercase tracking-widest text-accent">
        {"// "}
        {eyebrow}
      </span>
      <h2 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">{title}</h2>
    </div>
  );
}

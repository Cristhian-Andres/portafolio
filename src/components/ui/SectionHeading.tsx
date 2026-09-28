export function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-12 text-center">
      <span className="text-sm font-semibold uppercase tracking-widest text-accent">
        {eyebrow}
      </span>
      <h2 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

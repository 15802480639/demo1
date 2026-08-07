export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-10 ${center ? 'text-center' : 'text-left'}`}>
      {eyebrow && (
        <p className="tracking-luxe text-xs text-accent mb-3">{eyebrow}</p>
      )}
      <h2 className="font-display text-3xl sm:text-5xl text-ink">{title}</h2>
      {subtitle && (
        <p className="mt-4 text-muted text-sm sm:text-base max-w-xl mx-auto">
          {subtitle}
        </p>
      )}
      <div
        className={`mt-6 h-px bg-line w-16 ${
          center ? 'mx-auto' : ''
        }`}
      />
    </div>
  );
}

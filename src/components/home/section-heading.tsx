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
    <div className={`mb-12 ${center ? 'text-center' : 'text-left'}`}>
      {eyebrow && (
        <p className="tracking-luxe text-[11px] text-accent mb-4">{eyebrow}</p>
      )}
      <h2 className="font-display text-[2rem] leading-tight sm:text-5xl lg:text-[3.25rem] text-ink">
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-muted text-sm sm:text-base max-w-xl leading-relaxed ${
            center ? 'mx-auto' : ''
          }`}
        >
          {subtitle}
        </p>
      )}
      <div className={`mt-7 w-28 ${center ? 'mx-auto' : ''}`}>
        <div className="luxe-rule" />
      </div>
    </div>
  );
}

export function SeoBlock({ heading, body }: { heading: string; body: string }) {
  return (
    <section className="mx-auto max-w-[900px] px-4 sm:px-8 py-16">
      <h2 className="font-display text-2xl sm:text-3xl text-ink mb-5 text-center">
        {heading}
      </h2>
      <p className="text-muted text-sm sm:text-base leading-relaxed text-center">
        {body}
      </p>
    </section>
  );
}

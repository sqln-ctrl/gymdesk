type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <section className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-full bg-[var(--brand-soft)] text-lg text-[var(--brand)]">
        +
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted-foreground)]">
        {description}
      </p>
    </section>
  );
}

import Link from "next/link";

type StatCardProps = {
  label: string;
  value: string | number;
  description: string;
  href?: string;
};

export function StatCard({ label, value, description, href }: StatCardProps) {
  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 text-sm leading-5 text-[var(--muted-foreground)]">{description}</p>
    </>
  );

  return href ? (
    <Link className="rounded-xl border bg-[var(--surface)] p-5 transition-colors hover:bg-[var(--surface-muted)]" href={href}>
      {content}
    </Link>
  ) : <article className="rounded-xl border bg-[var(--surface)] p-5">{content}</article>;
}

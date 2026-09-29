import Link from "next/link";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen bg-[var(--background)] lg:grid-cols-2">
      <section className="hidden bg-[var(--foreground)] p-10 text-white lg:flex lg:flex-col">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand)] text-lg font-bold">G</span>
          <span>
            <span className="block text-lg font-semibold">GymFlow</span>
            <span className="block text-sm text-slate-300">Gym operations, in flow</span>
          </span>
        </Link>
        <div className="my-auto max-w-md">
          <p className="text-sm font-semibold text-emerald-300">Secure staff workspace</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Run the gym. Keep the momentum.</h1>
          <p className="mt-5 leading-7 text-slate-300">
            GymFlow keeps member operations, access, and the front desk in one focused workspace.
          </p>
        </div>
        <p className="text-sm text-slate-400">Branch-aware access with server-side permissions.</p>
      </section>
      <section className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">{children}</div>
      </section>
    </main>
  );
}

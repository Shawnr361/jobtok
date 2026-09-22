export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-white">
        Job<span className="text-primary">Tok</span>
      </h1>
      <p className="text-sm font-semibold tracking-[0.2em] text-muted">SHOW ME WHAT YOU CAN DO.</p>
      <p className="max-w-md text-muted">Real People. Real Skills. Real Opportunities.</p>
      <span className="mt-6 rounded-full border border-border bg-surface-raised px-4 py-2 text-xs font-medium text-accent">
        Employer &amp; Admin portal · Phase 1
      </span>
    </main>
  );
}

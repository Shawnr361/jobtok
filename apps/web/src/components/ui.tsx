import Link from 'next/link';

export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-5 rounded-2xl border border-border bg-surface p-6">
        <Link href="/" className="block text-center text-2xl font-bold text-white">
          Job<span className="text-primary">Tok</span>
        </Link>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-muted">{label}</span>
      <input
        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-white outline-none focus:border-primary"
        {...props}
      />
    </label>
  );
}

export function Button({
  variant = 'primary',
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary';
  loading?: boolean;
}) {
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white hover:opacity-90'
      : 'border border-border bg-surface-raised text-white hover:border-primary';
  return (
    <button
      className={`w-full rounded-full px-4 py-2.5 font-semibold transition disabled:opacity-50 ${styles}`}
      disabled={loading || props.disabled}
      aria-busy={loading}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  );
}

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-orange-500/60 bg-background p-3 text-sm text-orange-400">
      {children}
    </p>
  );
}

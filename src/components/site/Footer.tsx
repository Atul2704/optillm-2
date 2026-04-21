export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-white/80">OptiLLM</span> — Cost-Control Smart Model Router
        </div>
        <div className="flex items-center gap-3">
          <span>Next.js • Prisma • Postgres • Recharts</span>
        </div>
      </div>
    </footer>
  );
}


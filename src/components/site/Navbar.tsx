import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthButtons } from "@/components/site/AuthButtons";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400/30 to-violet-500/30 ring-1 ring-white/10">
            <span className="text-sm font-semibold">O</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">OptiLLM</div>
            <div className="text-[11px] text-white/60">Smart Model Router</div>
          </div>
          <Badge className="ml-2 hidden sm:inline-flex">Prototype</Badge>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white" href="/#how">
            How it works
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white" href="/#features">
            Features
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white" href="/analytics">
            Analytics
          </Link>
          <Link className="rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white" href="/admin/overview">
            Admin
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">
              Open dashboard
            </Button>
          </Link>
          <AuthButtons />
        </div>
      </div>
    </header>
  );
}


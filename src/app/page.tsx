import Link from "next/link";
import { Hero } from "@/components/site/Hero";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <div className="space-y-14">
      <Hero />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Problem</CardTitle>
            <CardDescription>AI costs grow fast at scale.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-white/70">
            Many apps default everything to the most capable model. That’s safe—but expensive.
            OptiLLM shows how you can route simple prompts to cheaper models and still keep quality.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Solution</CardTitle>
            <CardDescription>Complexity-aware routing.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-white/70">
            A lightweight classifier scores each prompt. The router selects the cheapest model that fits:
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge>Simple → Phi‑3 Mini</Badge>
              <Badge>Medium → LLaMA 3</Badge>
              <Badge>Complex → GPT‑4o</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outcome</CardTitle>
            <CardDescription>Visible savings.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-6 text-white/70">
            Every request logs token usage, estimated cost, and savings compared to always using GPT‑4o.
            The analytics view shows distribution and savings over time.
          </CardContent>
        </Card>
      </section>

      <section id="how" className="space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">How it works</h2>
            <p className="mt-1 text-sm text-white/70">
              A simple end-to-end flow you can build in a few hours.
            </p>
          </div>
          <Link className="text-sm text-white/70 hover:text-white" href="/dashboard">
            Try it →
          </Link>
        </div>
        <Card>
          <CardContent className="p-6">
            <ol className="grid gap-3 text-sm text-white/70 sm:grid-cols-2">
              <li>
                <span className="text-white/90">1.</span> User submits prompt
              </li>
              <li>
                <span className="text-white/90">2.</span> Classifier determines complexity
              </li>
              <li>
                <span className="text-white/90">3.</span> Router selects model
              </li>
              <li>
                <span className="text-white/90">4.</span> Model generates response
              </li>
              <li>
                <span className="text-white/90">5.</span> Usage + cost logged to Postgres
              </li>
              <li>
                <span className="text-white/90">6.</span> Dashboard + analytics update
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      <section id="features" className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Features</h2>
          <p className="mt-1 text-sm text-white/70">
            Built like a real AI infra SaaS: routing, tracking, analytics.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Prompt router API</CardTitle>
              <CardDescription>`/api/router` classifies, routes, calls model, logs.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
              <CardDescription>Model distribution, tokens, costs, savings series.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Modern UI</CardTitle>
              <CardDescription>Dark mode, gradients, glass cards, motion.</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Provider-flexible</CardTitle>
              <CardDescription>OpenAI for GPT‑4o + optional OpenAI-compatible endpoints for others.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Architecture preview</h2>
        <Card>
          <CardContent className="p-6 text-sm text-white/70">
            <div className="grid gap-4 sm:grid-cols-5">
              <div className="sm:col-span-2">
                <div className="font-medium text-white/90">Frontend</div>
                <div>Landing • Dashboard • Analytics</div>
              </div>
              <div className="sm:col-span-1">
                <div className="font-medium text-white/90">API</div>
                <div>Classify • Route • Log</div>
              </div>
              <div className="sm:col-span-1">
                <div className="font-medium text-white/90">AI</div>
                <div>Phi‑3 • LLaMA 3 • GPT‑4o</div>
              </div>
              <div className="sm:col-span-1">
                <div className="font-medium text-white/90">DB</div>
                <div>Postgres via Prisma</div>
              </div>
            </div>
            <Separator className="my-6" />
            <div className="text-white/60">
              Tip: run a few prompts in the dashboard, then open the analytics page to see charts populate.
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Team</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "Router Engineer", role: "Routing + model integration" },
            { name: "Platform Engineer", role: "API + persistence + analytics" },
            { name: "Product Designer", role: "SaaS UI + UX polish" },
          ].map((p) => (
            <Card key={p.name}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.role}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

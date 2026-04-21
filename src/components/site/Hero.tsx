"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] sm:p-12">
      <div className="absolute inset-0 opacity-60 [mask-image:radial-gradient(50%_50%_at_50%_30%,black,transparent_70%)]">
        <div className="h-full w-full bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Cost-control</Badge>
          <Badge>Smart routing</Badge>
          <Badge>Postgres + Prisma</Badge>
        </div>

        <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
          OptiLLM routes prompts to the most cost‑efficient model—automatically.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-white/70 sm:text-base">
          Send a prompt. We classify complexity using a lightweight heuristic, route to the best model
          (Phi‑3 Mini, LLaMA 3, or GPT‑4o), log usage, estimate cost, and show savings compared to always using GPT‑4o.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/dashboard">
            <Button variant="secondary" size="lg">
              Try the dashboard
            </Button>
          </Link>
          <Link href="/#how">
            <Button variant="outline" size="lg">
              See how it works
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}


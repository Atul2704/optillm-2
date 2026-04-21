import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

const PatchSchema = z.object({
  monthlyBudgetUsd: z.number().min(0).max(10_000).nullable().optional(),
  monthlyTokenLimit: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.reason === "unauthorized" ? "Unauthorized" : "Forbidden" },
      { status: admin.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = PatchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      monthlyBudgetUsd:
        parsed.data.monthlyBudgetUsd === undefined ? undefined : parsed.data.monthlyBudgetUsd,
      monthlyTokenLimit:
        parsed.data.monthlyTokenLimit === undefined ? undefined : parsed.data.monthlyTokenLimit,
    },
    select: {
      id: true,
      email: true,
      monthlyBudgetUsd: true,
      monthlyTokenLimit: true,
    },
  });

  return NextResponse.json({
    user: {
      id: updated.id,
      email: updated.email,
      monthlyBudgetUsd: updated.monthlyBudgetUsd != null ? Number(updated.monthlyBudgetUsd) : null,
      monthlyTokenLimit: updated.monthlyTokenLimit ?? null,
    },
  });
}


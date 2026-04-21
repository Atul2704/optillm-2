import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const BodySchema = z.object({
  promptText: z.string().min(1),
  complexity: z.enum(["SIMPLE", "MEDIUM", "COMPLEX"]),
  modelUsed: z.enum(["PHI_3_MINI", "LLAMA_3", "GPT_4O"]),
  tokens: z.number().int().nonnegative(),
  estimatedCostUsd: z.number().nonnegative(),
  userEmail: z.string().email().optional(),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { userEmail, estimatedCostUsd, ...rest } = parsed.data;
  const user =
    userEmail
      ? await prisma.user.upsert({
          where: { email: userEmail },
          create: { email: userEmail },
          update: {},
          select: { id: true },
        })
      : null;

  const log = await prisma.prompt.create({
    data: {
      ...rest,
      estimatedCost: estimatedCostUsd.toFixed(6),
      userId: user?.id ?? null,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, id: log.id, createdAt: log.createdAt });
}


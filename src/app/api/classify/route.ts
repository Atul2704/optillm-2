import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyPrompt } from "@/lib/classifier";

const BodySchema = z.object({
  promptText: z.string().min(1).max(20_000),
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

  const result = classifyPrompt(parsed.data.promptText);
  return NextResponse.json(result);
}


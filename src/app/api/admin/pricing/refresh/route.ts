import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

/** USD per 1M tokens — update when provider list prices change. */
const OFFICIAL_SNAPSHOT = {
  GPT_4O: { input: 2.5, output: 10.0 },
  LLAMA_3: { input: 0.59, output: 0.79 },
  PHI_3_MINI: { input: 0.05, output: 0.08 },
  claude: { input: 3.0, output: 15.0 },
  claudeHaiku: { input: 0.25, output: 1.25 },
  geminiPro: { input: 1.25, output: 5.0 },
  geminiFlash: { input: 0.075, output: 0.3 },
  mistralLarge: { input: 2.0, output: 6.0 },
  mistralMedium: { input: 0.4, output: 0.4 },
  mistralSmall: { input: 0.2, output: 0.2 },
};

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.reason === "unauthorized" ? "Unauthorized" : "Forbidden" },
      { status: admin.reason === "unauthorized" ? 401 : 403 },
    );
  }

  const updated = await prisma.appConfig.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      gpt4oInputPer1m: OFFICIAL_SNAPSHOT.GPT_4O.input,
      gpt4oOutputPer1m: OFFICIAL_SNAPSHOT.GPT_4O.output,
      llama3InputPer1m: OFFICIAL_SNAPSHOT.LLAMA_3.input,
      llama3OutputPer1m: OFFICIAL_SNAPSHOT.LLAMA_3.output,
      phi3InputPer1m: OFFICIAL_SNAPSHOT.PHI_3_MINI.input,
      phi3OutputPer1m: OFFICIAL_SNAPSHOT.PHI_3_MINI.output,
      claudeInputPer1m: OFFICIAL_SNAPSHOT.claude.input,
      claudeOutputPer1m: OFFICIAL_SNAPSHOT.claude.output,
      claudeHaikuInputPer1m: OFFICIAL_SNAPSHOT.claudeHaiku.input,
      claudeHaikuOutputPer1m: OFFICIAL_SNAPSHOT.claudeHaiku.output,
      geminiProInputPer1m: OFFICIAL_SNAPSHOT.geminiPro.input,
      geminiProOutputPer1m: OFFICIAL_SNAPSHOT.geminiPro.output,
      geminiFlashInputPer1m: OFFICIAL_SNAPSHOT.geminiFlash.input,
      geminiFlashOutputPer1m: OFFICIAL_SNAPSHOT.geminiFlash.output,
      mistralLargeInputPer1m: OFFICIAL_SNAPSHOT.mistralLarge.input,
      mistralLargeOutputPer1m: OFFICIAL_SNAPSHOT.mistralLarge.output,
      mistralMediumInputPer1m: OFFICIAL_SNAPSHOT.mistralMedium.input,
      mistralMediumOutputPer1m: OFFICIAL_SNAPSHOT.mistralMedium.output,
      mistralSmallInputPer1m: OFFICIAL_SNAPSHOT.mistralSmall.input,
      mistralSmallOutputPer1m: OFFICIAL_SNAPSHOT.mistralSmall.output,
    },
    update: {
      gpt4oInputPer1m: OFFICIAL_SNAPSHOT.GPT_4O.input,
      gpt4oOutputPer1m: OFFICIAL_SNAPSHOT.GPT_4O.output,
      llama3InputPer1m: OFFICIAL_SNAPSHOT.LLAMA_3.input,
      llama3OutputPer1m: OFFICIAL_SNAPSHOT.LLAMA_3.output,
      phi3InputPer1m: OFFICIAL_SNAPSHOT.PHI_3_MINI.input,
      phi3OutputPer1m: OFFICIAL_SNAPSHOT.PHI_3_MINI.output,
      claudeInputPer1m: OFFICIAL_SNAPSHOT.claude.input,
      claudeOutputPer1m: OFFICIAL_SNAPSHOT.claude.output,
      claudeHaikuInputPer1m: OFFICIAL_SNAPSHOT.claudeHaiku.input,
      claudeHaikuOutputPer1m: OFFICIAL_SNAPSHOT.claudeHaiku.output,
      geminiProInputPer1m: OFFICIAL_SNAPSHOT.geminiPro.input,
      geminiProOutputPer1m: OFFICIAL_SNAPSHOT.geminiPro.output,
      geminiFlashInputPer1m: OFFICIAL_SNAPSHOT.geminiFlash.input,
      geminiFlashOutputPer1m: OFFICIAL_SNAPSHOT.geminiFlash.output,
      mistralLargeInputPer1m: OFFICIAL_SNAPSHOT.mistralLarge.input,
      mistralLargeOutputPer1m: OFFICIAL_SNAPSHOT.mistralLarge.output,
      mistralMediumInputPer1m: OFFICIAL_SNAPSHOT.mistralMedium.input,
      mistralMediumOutputPer1m: OFFICIAL_SNAPSHOT.mistralMedium.output,
      mistralSmallInputPer1m: OFFICIAL_SNAPSHOT.mistralSmall.input,
      mistralSmallOutputPer1m: OFFICIAL_SNAPSHOT.mistralSmall.output,
    },
  });

  return NextResponse.json({
    ok: true,
    updatedAt: updated.updatedAt,
    snapshot: OFFICIAL_SNAPSHOT,
  });
}
